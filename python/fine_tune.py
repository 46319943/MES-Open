import gc
import os
import shutil
import json
import glob
import torch
from typing import List, Dict, Any
from unsloth import FastLanguageModel
from unsloth.chat_templates import get_chat_template
from datasets import Dataset
from trl import SFTTrainer
from transformers import TrainingArguments


def resume_from_existing_model(
    resume_from_dir: str, output_dir: str, train_batch_size: int
):
    """
    Resume from an existing fine-tuned model by copying the model directory
    and resetting the trainer state for fresh training.

    Args:
        resume_from_dir: Directory containing the existing fine-tuned model
        output_dir: Directory where the resumed training will be saved
        train_batch_size: Batch size to set in the trainer state
    """
    # Copy contents from resume_from_dir to output_dir
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    shutil.copytree(resume_from_dir, output_dir)
    print(f"Copied model from {resume_from_dir} to {output_dir}")

    # Find the newest checkpoint folder
    checkpoint_pattern = os.path.join(output_dir, "checkpoint-*")
    checkpoint_dirs = glob.glob(checkpoint_pattern)

    if not checkpoint_dirs:
        print("Warning: No checkpoint directories found")
        return

    # Sort by checkpoint number to get the newest one
    checkpoint_dirs.sort(key=lambda x: int(x.split("-")[-1]))
    newest_checkpoint = checkpoint_dirs[-1]
    print(f"Found newest checkpoint: {os.path.basename(newest_checkpoint)}")

    # Remove scheduler.pt file if it exists
    scheduler_path = os.path.join(newest_checkpoint, "scheduler.pt")
    if os.path.exists(scheduler_path):
        os.remove(scheduler_path)
        print(f"Removed scheduler.pt from {os.path.basename(newest_checkpoint)}")

    # Edit trainer_state.json in the newest checkpoint
    trainer_state_path = os.path.join(newest_checkpoint, "trainer_state.json")

    if not os.path.exists(trainer_state_path):
        print(f"Warning: trainer_state.json not found in {newest_checkpoint}")
        return

    # Read the existing trainer state
    with open(trainer_state_path, "r") as f:
        trainer_state = json.load(f)

    # Reset epoch and global_step to 0, set train_batch_size
    trainer_state["epoch"] = 0
    trainer_state["global_step"] = 0
    trainer_state["train_batch_size"] = train_batch_size

    # Write back the modified trainer state
    with open(trainer_state_path, "w") as f:
        json.dump(trainer_state, f, indent=2)

    print(
        f"Reset trainer state: epoch=0, global_step=0, train_batch_size={train_batch_size}"
    )


def fine_tune(training_data: List[Dict[str, str]], training_settings: Dict[str, Any]):
    # Extract settings
    model_name = training_settings["model_name"]
    num_epochs = training_settings["num_epochs"]
    batch_size = training_settings["batch_size"]
    accumulated_batch_size = training_settings["accumulated_batch_size"]
    output_dir = training_settings["output_dir"]

    max_seq_length = training_settings.get("max_seq_length", 2048)
    learning_rate = training_settings.get("learning_rate", 2e-4)

    resume_from_dir = training_settings.get("resume_from_dir", None)
    resume_from_checkpoint = resume_from_dir is not None

    # If resuming from checkpoint, prepare the environment
    if resume_from_checkpoint:
        resume_from_existing_model(resume_from_dir, output_dir, batch_size)

    # Load model and tokenizer with 4-bit quantization
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        dtype=None,  # Auto-detect dtype
        load_in_4bit=True,
    )

    # Apply LoRA to the non-lora model
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,  # LoRA rank
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_alpha=16,
        lora_dropout=0,  # Supports any, but = 0 is optimized
        bias="none",  # Supports any, but = "none" is optimized
        use_gradient_checkpointing="unsloth",  # True or "unsloth" for very long context
        random_state=3407,
        use_rslora=False,  # We support rank stabilized LoRA
        loftq_config=None,  # And LoftQ
    )

    if tokenizer.chat_template is None:
        tokenizer = get_chat_template(
            tokenizer,
            chat_template="chatml", # Do not use qwen2.5 template, since it would add the unnecessary system message. The chatml is the same foramt as qwen2.5 but without the system message.
        )

    # Format training data for chat template
    def formatting_prompts_func(examples):
        convos = []
        for input_text, output_text in zip(examples["input"], examples["output"]):
            convo = [
                {"role": "user", "content": input_text},
                {"role": "assistant", "content": output_text},
            ]
            convos.append(convo)

        texts = [
            tokenizer.apply_chat_template(
                convo, tokenize=False, add_generation_prompt=False
            )
            for convo in convos
        ]
        return {"text": texts}

    # Create dataset
    dataset_dict = {
        "input": [item["input"] for item in training_data],
        "output": [item["output"] for item in training_data],
    }
    dataset = Dataset.from_dict(dataset_dict)
    dataset = dataset.map(formatting_prompts_func, batched=True)

    # Training arguments
    training_args = TrainingArguments(
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=accumulated_batch_size // batch_size,
        warmup_steps=5,
        num_train_epochs=num_epochs,
        learning_rate=learning_rate,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=1,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        seed=3407,
        output_dir=output_dir,
        save_strategy="epoch",
        save_steps=500,
        save_total_limit=2,
        dataloader_num_workers=2,
        remove_unused_columns=False,
    )

    # Create trainer
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=max_seq_length,
        dataset_num_proc=2,
        packing=False,  # Can make training 5x faster for short sequences
        args=training_args,
    )

    trainer.train(resume_from_checkpoint=resume_from_checkpoint)

    # Save the trained model and LoRA adapter
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    model.save_pretrained(output_dir)

    # Clean up VRAM before returning
    print("Releasing VRAM...")
    del model
    del tokenizer
    del trainer
    del dataset
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
    print("✅ VRAM cleanup completed")
