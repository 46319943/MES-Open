"""
Inference module using vLLM for efficient LLM inference with LoRA adapters.

This module provides functionality to perform inference on models fine-tuned
with unsloth using the vLLM library. It specifically handles LoRA adapters
(adapter_model.safetensors) without merging them with the base model.
"""

import os
from typing import List, Dict, Any, Union
from vllm import LLM, SamplingParams
from vllm.lora.request import LoRARequest
from transformers import AutoTokenizer



def infer(
    data: List[Dict[str, str]], inference_settings: Dict[str, Any]
) -> List[Dict[str, str]]:
    """
    Performs offline inference using a LoRA adapter with vLLM.

    This function implements the official vLLM approach for offline LoRA inference
    as demonstrated in multilora_inference.py. It loads the base model with LoRA
    support and applies the adapter using LoRARequest during generation.

    Args:
        data: List of dictionaries with 'input' keys containing prompts
        inference_settings: Dictionary containing:
            - adapter_path: Path to the LoRA adapter directory (from fine-tuning)
            - model_name: Base model name (same as used in fine-tuning)
            - temperature: Sampling temperature (0.0 to 1.0)
            - max_output_tokens: Maximum number of tokens to generate
            - top_p: Top-p sampling parameter (optional, default: 0.95)
            - top_k: Top-k sampling parameter (optional, default: -1)
            - repetition_penalty: Repetition penalty (optional, default: 1.0)

    Returns:
        List of dictionaries with 'input' and 'output' keys

    References:
        Based on vLLM's official multilora_inference.py example:
        https://github.com/vllm-project/vllm/blob/main/examples/offline_inference/multilora_inference.py
    """

    # Extract settings
    adapter_path = inference_settings["adapter_path"]
    model_name = inference_settings["model_name"]
    temperature = inference_settings["temperature"]
    max_output_tokens = inference_settings["max_output_tokens"]
    top_p = inference_settings.get("top_p", 0.95)
    top_k = inference_settings.get("top_k", -1)
    repetition_penalty = inference_settings.get("repetition_penalty", 1.0)

    print(f"Loading base model: {model_name}")
    print(f"Using LoRA adapter: {adapter_path}")

    # Check if adapter exists and verify required files
    if not os.path.exists(adapter_path):
        raise FileNotFoundError(f"Adapter path does not exist: {adapter_path}")

    # Initialize vLLM with LoRA support using the official multilora_inference.py approach
    print("🚀 Loading model with LoRA adapter support (offline inference)")

    try:
        # Load base model with LoRA support enabled
        llm = LLM(
            model=model_name,
            enable_lora=True,  # Enable LoRA support
            max_loras=1,  # Maximum number of LoRA adapters
            max_lora_rank=64,  # Maximum LoRA rank
            tensor_parallel_size=1,
            gpu_memory_utilization=0.6,
            trust_remote_code=True,
            max_model_len=2048,
            dtype="half",
        )
        print("✅ Base model loaded successfully with LoRA support")

        # Create LoRA request using the official vLLM API
        print(f"📁 Creating LoRA request for adapter: {adapter_path}")
        lora_request = LoRARequest(
            lora_name="fine_tuned_adapter",  # Unique identifier for the adapter
            lora_int_id=1,  # Integer ID for the adapter
            lora_path=adapter_path,  # Path to the adapter directory
        )
        print("✅ LoRA request created successfully")

    except Exception as e:
        print(f"❌ Failed to load model with LoRA support: {e}")
        raise RuntimeError(f"Cannot load model with LoRA support. Error: {e}")
    
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Set up sampling parameters
    sampling_params = SamplingParams(
        temperature=temperature,
        max_tokens=max_output_tokens,
        top_p=top_p,
        top_k=top_k,
        repetition_penalty=repetition_penalty,
        stop=["</s>", "<|im_end|>", "<|endoftext|>"],  # Common stop tokens
    )

    # Extract prompts from input data
    prompts = [item["input"] for item in data]
    messages_list = [[{"role": "user", "content": prompt}] for prompt in prompts]
    texts = tokenizer.apply_chat_template(
        messages_list,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False  # Disables thinking mode
    )

    print(f"Performing inference on {len(prompts)} prompts...")
    print("🎯 Using LoRA adapter for fine-tuned responses")

    # Generate responses using the LoRA adapter
    try:
        outputs = llm.generate(
            texts,
            sampling_params,
            lora_request=lora_request,  # Apply the LoRA adapter
        )
        print("✅ Generation completed with LoRA adapter")
    except Exception as e:
        print(f"❌ Error during LoRA generation: {e}")

    # Format results
    results = []
    for i, (prompt, output) in enumerate(zip(prompts, outputs)):
        if output is not None and len(output.outputs) > 0:
            generated_text = output.outputs[0].text.strip()
            # Check if we used LoRA or base model
            model_type = (
                "[FINE-TUNED]" if "lora_request" in locals() else "[BASE MODEL]"
            )
        else:
            generated_text = f"Error: Failed to generate response for prompt {i+1}"
            model_type = "[ERROR]"

        results.append({"input": prompt, "output": f"{model_type}: {generated_text}"})

    print(f"Inference completed. Generated {len(results)} responses with LoRA adapter.")
    return results