"""
FastAPI application for LLM fine-tuning and VLLM server management.

This API provides endpoints for:
- Fine-tuning language models with custom data
- Managing fine-tuned models in MongoDB
- Starting and stopping VLLM servers for inference
- Monitoring VLLM server status and health
"""

import os
import subprocess
import signal
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import requests
import json

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient


# API Configuration
PORT = 8000

# MongoDB Configuration Constants
DATABASE_NAME = "MultisensoryExperiences"
COLLECTION_NAME = "llm"

# Initialize FastAPI app
app = FastAPI(
    title="LLM Fine-tuning and Inference API",
    description="API for fine-tuning language models and performing inference",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:9000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB client (will be initialized on startup)
mongodb_client: Optional[AsyncIOMotorClient] = None
database = None
collection = None

# Thread pool for CPU-intensive operations
thread_pool = ThreadPoolExecutor(max_workers=2)

# VLLM Server Management
vllm_process: Optional[subprocess.Popen] = None
vllm_server_port = 8001  # Fixed port
vllm_server_host = "0.0.0.0"  # Fixed host
vllm_server_status = "not_running"  # Possible values: "not_running", "starting", "running", "error"


# Pydantic Models
class TrainingData(BaseModel):
    """Training data item with input and output."""
    input: str = Field(..., description="Input text for training")
    output: str = Field(..., description="Expected output text for training")


class TrainingConfig(BaseModel):
    """Configuration for fine-tuning."""
    model_name: str = Field(..., description="Base model name to fine-tune")
    num_epochs: int = Field(default=3, ge=1, le=100, description="Number of training epochs")
    batch_size: int = Field(default=2, ge=1, le=32, description="Training batch size")
    accumulated_batch_size: int = Field(default=4, ge=1, le=128, description="Gradient accumulation batch size")
    max_seq_length: int = Field(default=2048, ge=128, le=8192, description="Maximum sequence length")
    learning_rate: float = Field(default=2e-4, gt=0, le=1e-2, description="Learning rate")
    resume_from_finetune: Optional[str] = Field(None, description="Name of the fine-tune to resume from")

class FineTuneRecord(BaseModel):
    """Fine-tune record stored in database."""
    fine_tune_name: str = Field(..., description="Name of the fine-tune")
    output_path: str = Field(..., description="Path to the fine-tuned model")
    data_size: int = Field(..., description="Number of training examples used")
    training_config: TrainingConfig = Field(..., description="Training configuration used")
    status: str = Field(..., description="Status of the fine-tune")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    meta: Optional[Dict[str, Any]] = Field(None, description="Optional metadata dictionary")
    resumed_from: Optional[str] = Field(None, description="Name of the fine-tune this was resumed from")

class FineTuneRequest(BaseModel):
    """Request for fine-tuning a model."""
    data: List[TrainingData] = Field(..., min_items=1, description="Training data array")
    training_config: TrainingConfig = Field(..., description="Training configuration")
    meta: Optional[Dict[str, Any]] = Field(None, description="Optional metadata dictionary for informational purposes")


class FineTuneResponse(BaseModel):
    """Response from fine-tuning."""
    fine_tune_name: str = Field(..., description="Name of the created fine-tune")
    status: str = Field(..., description="Status of the fine-tuning process")
    message: str = Field(..., description="Additional information")
    data_size: int = Field(..., description="Number of training examples")
    created_at: datetime = Field(..., description="Creation timestamp")
    meta: Optional[Dict[str, Any]] = Field(None, description="Optional metadata dictionary")


class VLLMServerStartRequest(BaseModel):
    """Request to start VLLM server."""
    fine_tune_name: str = Field(..., description="Name of the fine-tune to serve")


class VLLMServerResponse(BaseModel):
    """Response from VLLM server operations."""
    status: str = Field(..., description="Status of the operation")
    message: str = Field(..., description="Additional information")
    server_url: Optional[str] = Field(None, description="URL of the running server")
    pid: Optional[int] = Field(None, description="Process ID of the server")


# Startup and Shutdown Events
@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB connection on startup."""
    global mongodb_client, database, collection
    
    # MongoDB connection string (customize as needed)
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
    
    try:
        mongodb_client = AsyncIOMotorClient(mongodb_url)
        # Test connection
        await mongodb_client.admin.command('ping')
        
        database = mongodb_client[DATABASE_NAME]
        collection = database[COLLECTION_NAME]
        
        # Create indexes for better performance
        await collection.create_index("fine_tune_name", unique=True)
        await collection.create_index("created_at")
        
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}.{COLLECTION_NAME}")
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        print("⚠️  API will run without database functionality")


@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection and cleanup VLLM server on shutdown."""
    global mongodb_client, vllm_process, vllm_server_status
    
    # Stop VLLM server if running
    if vllm_process and vllm_process.poll() is None:
        try:
            vllm_process.terminate()
            vllm_process.wait(timeout=10)
            print("✅ VLLM server stopped")
        except subprocess.TimeoutExpired:
            vllm_process.kill()
            print("⚠️ VLLM server force killed")
        except Exception as e:
            print(f"❌ Error stopping VLLM server: {e}")
        finally:
            vllm_server_status = "not_running"
    
    if mongodb_client:
        mongodb_client.close()
        print("✅ MongoDB connection closed")
    
    # Shutdown thread pool
    thread_pool.shutdown(wait=True)
    print("✅ Thread pool shutdown")


# Helper Functions
def generate_fine_tune_name(model_name: str) -> str:
    """Generate a unique fine-tune name with datetime suffix."""
    # Extract model name without path/organization
    base_name = model_name.split("/")[-1].replace("-", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{base_name}_finetune_{timestamp}"


def generate_output_path(fine_tune_name: str) -> str:
    """Generate output path for the fine-tuned model."""
    return f"./fine_tuned_models/{fine_tune_name}"


def generate_vllm_command(model_name: str, lora_adapter_path: Optional[str] = None, 
                         port: int = 8001, host: str = "localhost", 
                         additional_args: Optional[List[str]] = None) -> List[str]:
    """Generate VLLM server command based on parameters."""
    cmd = [
        "vllm", "serve", model_name,
        "--host", host,
        "--port", str(port),
        "--gpu-memory-utilization", "0.6",
        "--max-model-len", "4096",
        "--dtype", "half"
    ]
    
    if lora_adapter_path:
        cmd.extend(["--enable-lora", "--lora-modules", f"fine_tuned_adapter={lora_adapter_path}"])
    
    if additional_args:
        cmd.extend(additional_args)
    
    return cmd


def check_vllm_server_health() -> bool:
    """Check if VLLM server is responsive via health endpoint."""
    global vllm_server_port, vllm_server_host
    
    try:
        response = requests.get(f"http://{vllm_server_host}:{vllm_server_port}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False


def update_vllm_server_status():
    """Update the VLLM server status based on process and health check."""
    global vllm_process, vllm_server_status
    
    # Check if process is still running
    if not vllm_process or vllm_process.poll() is not None:
        vllm_server_status = "not_running"
        return
    
    # If process is running, check if server is responsive
    if check_vllm_server_health():
        vllm_server_status = "running"
    elif vllm_server_status != "starting":
        # If health check fails and we're not in starting state, mark as error
        vllm_server_status = "error"


def is_vllm_server_running() -> bool:
    """Check if VLLM server is running and responsive."""
    update_vllm_server_status()
    return vllm_server_status == "running"


async def run_fine_tuning(training_data: List[Dict[str, str]], training_settings: Dict[str, Any]) -> str:
    """Run fine-tuning in thread pool to avoid blocking the event loop."""
    from fine_tune import fine_tune
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        thread_pool, 
        fine_tune, 
        training_data, 
        training_settings
    )


# Note: Direct inference function removed - now using VLLM server via HTTP requests


# API Endpoints
@app.get("/", response_model=Dict[str, Any])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "LLM Fine-tuning and VLLM Server Management API",
        "version": "1.0.0",
        "endpoints": {
            "fine_tune": "/fine-tune",
            "list_models": "/fine-tunes",
            "delete_model": "/fine-tunes/{fine_tune_name}",
            "start_vllm_server": "/start-vllm-server",
            "stop_vllm_server": "/stop-vllm-server",
            "vllm_server_status": "/vllm-server-status"
        }
    }


@app.post("/fine-tune", response_model=FineTuneResponse)
async def create_fine_tune(request: FineTuneRequest, background_tasks: BackgroundTasks):
    """
    Fine-tune a language model with provided data and configuration.
    
    This endpoint:
    1. Generates a unique output path with datetime suffix
    2. Optionally resumes from a previous fine-tune if resume_from_finetune is provided
    3. Starts fine-tuning process
    4. Creates a record in MongoDB with the results
    """
    if collection is None:
        raise HTTPException(
            status_code=503, 
            detail="Database not available. Cannot store fine-tune records."
        )
    
    try:
        # Handle resume from existing fine-tune
        resume_from_dir = None
        resumed_from = None
        
        if request.training_config.resume_from_finetune:
            # Retrieve the fine-tune record to resume from
            resume_record = await collection.find_one({"fine_tune_name": request.training_config.resume_from_finetune})
            if not resume_record:
                raise HTTPException(
                    status_code=404,
                    detail=f"Fine-tune '{request.training_config.resume_from_finetune}' not found in database"
                )
            
            # Check if the fine-tune to resume from is completed
            if resume_record.get("status") != "completed":
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot resume from fine-tune '{request.training_config.resume_from_finetune}' with status: {resume_record.get('status', 'unknown')}. Only completed fine-tunes can be resumed from."
                )
            
            resume_from_dir = resume_record.get("output_path")
            resumed_from = request.training_config.resume_from_finetune
            
            if not resume_from_dir:
                raise HTTPException(
                    status_code=500,
                    detail=f"Fine-tune record '{request.training_config.resume_from_finetune}' is missing output path"
                )
            
            print(f"🔄 Resuming from fine-tune: {request.training_config.resume_from_finetune}")
            print(f"📂 Resume from directory: {resume_from_dir}")
        
        # Generate unique fine-tune name and output path
        fine_tune_name = generate_fine_tune_name(request.training_config.model_name)
        output_path = generate_output_path(fine_tune_name)
        
        # Prepare training data and settings
        training_data = [{"input": item.input, "output": item.output} for item in request.data]
        training_settings = request.training_config.dict()
        training_settings["output_dir"] = output_path
        
        # Add resume_from_dir to training settings if resuming
        if resume_from_dir:
            training_settings["resume_from_dir"] = resume_from_dir
        
        print(f"🚀 Starting fine-tuning: {fine_tune_name}")
        print(f"📁 Output path: {output_path}")
        print(f"📊 Training data size: {len(training_data)}")
        
        # Create initial record in database
        fine_tune_record = {
            "fine_tune_name": fine_tune_name,
            "output_path": output_path,
            "data_size": len(training_data),
            "training_config": training_settings,
            "status": "training",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "meta": request.meta,
            "resumed_from": resumed_from
        }
        
        await collection.insert_one(fine_tune_record)
        
        # Define background task to run fine-tuning
        async def fine_tune_task():
            try:
                # Run fine-tuning
                await run_fine_tuning(training_data, training_settings)
                
                # Update record with success status
                await collection.update_one(
                    {"fine_tune_name": fine_tune_name},
                    {
                        "$set": {
                            "status": "completed",
                            "updated_at": datetime.now()
                        }
                    }
                )
                print(f"✅ Fine-tuning completed: {fine_tune_name}")
                
            except Exception as e:
                # Update record with error status
                await collection.update_one(
                    {"fine_tune_name": fine_tune_name},
                    {
                        "$set": {
                            "status": "failed",
                            "error": str(e),
                            "updated_at": datetime.now()
                        }
                    }
                )
                print(f"❌ Fine-tuning failed: {fine_tune_name}, Error: {e}")
                
        
        # Add fine-tuning task to background
        background_tasks.add_task(fine_tune_task)
        
        return FineTuneResponse(
            fine_tune_name=fine_tune_name,
            status="training",
            message=f"Fine-tuning started. Model will be saved as '{fine_tune_name}'",
            data_size=len(training_data),
            created_at=datetime.now(),
            meta=request.meta
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start fine-tuning: {str(e)}")


@app.get("/fine-tunes", response_model=List[FineTuneRecord])
async def list_fine_tunes():
    """List all fine-tune records from the database."""
    if collection is None:
        raise HTTPException(
            status_code=503, 
            detail="Database not available."
        )
    
    try:
        cursor = collection.find({}).sort("created_at", -1)  # Sort by newest first
        fine_tunes = []
        
        async for document in cursor:
            # Convert MongoDB ObjectId to string and remove it
            document.pop("_id", None)
            fine_tunes.append(FineTuneRecord(**document))
        
        return fine_tunes
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list fine-tunes: {str(e)}")


@app.delete("/fine-tunes/{fine_tune_name}")
async def delete_fine_tune(fine_tune_name: str):
    """Delete a fine-tune record from the database."""
    if collection is None:
        raise HTTPException(
            status_code=503, 
            detail="Database not available."
        )
    
    try:
        # Check if fine-tune exists
        existing = await collection.find_one({"fine_tune_name": fine_tune_name})
        if not existing:
            raise HTTPException(
                status_code=404, 
                detail=f"Fine-tune '{fine_tune_name}' not found"
            )
        
        # Delete the record
        result = await collection.delete_one({"fine_tune_name": fine_tune_name})
        
        if result.deleted_count == 1:
            return {
                "message": f"Fine-tune '{fine_tune_name}' deleted successfully",
                "deleted_count": result.deleted_count
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to delete fine-tune '{fine_tune_name}'"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete fine-tune: {str(e)}")


@app.get("/fine-tunes/{fine_tune_name}", response_model=FineTuneRecord)
async def get_fine_tune(fine_tune_name: str):
    """Get details of a specific fine-tune record."""
    if collection is None:
        raise HTTPException(
            status_code=503, 
            detail="Database not available."
        )
    
    try:
        document = await collection.find_one({"fine_tune_name": fine_tune_name})
        if not document:
            raise HTTPException(
                status_code=404, 
                detail=f"Fine-tune '{fine_tune_name}' not found"
            )
        
        # Convert MongoDB ObjectId to string and remove it
        document.pop("_id", None)
        return FineTuneRecord(**document)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get fine-tune: {str(e)}")


@app.post("/start-vllm-server", response_model=VLLMServerResponse)
async def start_vllm_server(request: VLLMServerStartRequest):
    """
    Start a VLLM server using a fine-tuned model from the database.
    
    This endpoint:
    1. Retrieves the fine-tune record from the database using the fine_tune_name
    2. Uses the fine-tune data to automatically configure VLLM server parameters
    3. Starts the server with fixed host and port values
    4. Users cannot directly specify VLLM parameters - everything is derived from the fine-tune record
    """
    global vllm_process, vllm_server_port, vllm_server_host, vllm_server_status
    
    if collection is None:
        raise HTTPException(
            status_code=503, 
            detail="Database not available. Cannot retrieve fine-tune records."
        )
    
    # Check if server is already running or starting
    update_vllm_server_status()
    if vllm_server_status in ["running", "starting"]:
        return VLLMServerResponse(
            status=vllm_server_status,
            message=f"VLLM server is already {vllm_server_status} on {vllm_server_host}:{vllm_server_port}",
            server_url=f"http://{vllm_server_host}:{vllm_server_port}",
            pid=vllm_process.pid if vllm_process else None
        )
    
    try:
        # Retrieve fine-tune record from database
        fine_tune_record = await collection.find_one({"fine_tune_name": request.fine_tune_name})
        if not fine_tune_record:
            raise HTTPException(
                status_code=404, 
                detail=f"Fine-tune '{request.fine_tune_name}' not found in database"
            )
        
        # Check if fine-tune is completed
        if fine_tune_record.get("status") != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Fine-tune '{request.fine_tune_name}' is not completed. Status: {fine_tune_record.get('status', 'unknown')}"
            )
        
        # Extract model configuration from fine-tune record
        training_config = fine_tune_record.get("training_config", {})
        base_model_name = training_config.get("model_name")
        lora_adapter_path = fine_tune_record.get("output_path")
        
        if not base_model_name:
            raise HTTPException(
                status_code=500,
                detail=f"Fine-tune record is missing base model name"
            )
        
        if not lora_adapter_path:
            raise HTTPException(
                status_code=500,
                detail=f"Fine-tune record is missing output path"
            )
        
        print(f"🔍 Retrieved fine-tune record: {request.fine_tune_name}")
        print(f"📦 Base model: {base_model_name}")
        print(f"🎯 LoRA adapter path: {lora_adapter_path}")
        print(f"🌐 Server will run on: {vllm_server_host}:{vllm_server_port}")
        
        # Generate VLLM command using fixed host/port and fine-tune data
        cmd = generate_vllm_command(
            model_name=base_model_name,
            lora_adapter_path=lora_adapter_path,
            port=vllm_server_port,  # Use fixed port
            host=vllm_server_host,  # Use fixed host
            additional_args=None  # No additional args allowed
        )
        
        print(f"🚀 Starting VLLM server with command: {' '.join(cmd)}")
        print("📺 VLLM server output will be displayed in real time below:")
        print("-" * 60)
        
        # Start VLLM server process with real-time output
        vllm_process = subprocess.Popen(
            cmd,
            stdout=None,  # Allow stdout to be displayed in real time
            stderr=None,  # Allow stderr to be displayed in real time
            text=True
        )
        
        # Set status to starting immediately after command execution
        vllm_server_status = "starting"
        
        # Wait a moment for the process to initialize
        await asyncio.sleep(2)
        
        # Check if process started successfully (didn't die immediately)
        if vllm_process.poll() is not None:
            # Process died immediately
            vllm_server_status = "error"
            exit_code = vllm_process.returncode
            vllm_process = None
            raise RuntimeError(f"VLLM server failed to start. Process exited with code: {exit_code}. Check console output for details.")
        
        server_url = f"http://{vllm_server_host}:{vllm_server_port}"
        
        # Start background task to wait for server to be ready
        async def wait_for_server_ready():
            max_attempts = 30  # Wait up to 150 seconds (30 * 5 seconds)
            attempt = 0
            
            while attempt < max_attempts:
                await asyncio.sleep(5)  # Wait 5 seconds between checks
                attempt += 1
                
                # Check if process is still running
                if vllm_process and vllm_process.poll() is not None:
                    print(f"❌ VLLM server process died during startup")
                    vllm_server_status = "error"
                    return
                
                # Check if server is responsive
                if check_vllm_server_health():
                    vllm_server_status = "running"
                    print(f"✅ VLLM server is now running and responsive on {server_url}")
                    return
                
                print(f"⏳ Waiting for VLLM server to be ready... (attempt {attempt}/{max_attempts})")
            
            # Timeout reached
            print(f"❌ VLLM server failed to become ready within timeout")
            vllm_server_status = "error"
        
        # Start the background task
        asyncio.create_task(wait_for_server_ready())
        
        print(f"🔄 VLLM server process started (PID: {vllm_process.pid}), waiting for it to be ready...")
        
        return VLLMServerResponse(
            status="starting",
            message=f"VLLM server is starting with fine-tune '{request.fine_tune_name}' on {server_url}. Use /vllm-server-status to check when it's ready.",
            server_url=server_url,
            pid=vllm_process.pid
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up process if it exists
        if vllm_process:
            try:
                vllm_process.terminate()
                vllm_process = None
            except:
                pass
        
        vllm_server_status = "not_running"
        raise HTTPException(status_code=500, detail=f"Failed to start VLLM server: {str(e)}")


@app.post("/stop-vllm-server", response_model=VLLMServerResponse)
async def stop_vllm_server():
    """
    Stop the running VLLM server.
    """
    global vllm_process, vllm_server_status
    
    if not vllm_process or vllm_process.poll() is not None:
        vllm_server_status = "not_running"
        return VLLMServerResponse(
            status="not_running",
            message="VLLM server is not running"
        )
    
    try:
        print(f"🛑 Stopping VLLM server (PID: {vllm_process.pid})")
        
        # Try graceful termination first
        vllm_process.terminate()
        
        try:
            vllm_process.wait(timeout=10)
            print("✅ VLLM server stopped gracefully")
        except subprocess.TimeoutExpired:
            # Force kill if it doesn't terminate gracefully
            vllm_process.kill()
            vllm_process.wait()
            print("⚠️ VLLM server force killed")
        
        vllm_process = None
        vllm_server_status = "not_running"
        
        return VLLMServerResponse(
            status="stopped",
            message="VLLM server stopped successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop VLLM server: {str(e)}")


@app.get("/vllm-server-status", response_model=VLLMServerResponse)
async def get_vllm_server_status():
    """
    Get the current status of the VLLM server.
    """
    global vllm_process, vllm_server_port, vllm_server_host, vllm_server_status
    
    # Update status based on current process and health check
    update_vllm_server_status()
    
    server_url = f"http://{vllm_server_host}:{vllm_server_port}" if vllm_server_status != "not_running" else None
    
    status_messages = {
        "not_running": "VLLM server is not running",
        "starting": f"VLLM server is starting on {vllm_server_host}:{vllm_server_port}",
        "running": f"VLLM server is running on {vllm_server_host}:{vllm_server_port}",
        "error": f"VLLM server encountered an error on {vllm_server_host}:{vllm_server_port}"
    }
    
    return VLLMServerResponse(
        status=vllm_server_status,
        message=status_messages.get(vllm_server_status, "Unknown status"),
        server_url=server_url,
        pid=vllm_process.pid if vllm_process and vllm_process.poll() is None else None
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    global vllm_server_status
    mongodb_status = "connected" if collection is not None else "disconnected"
    update_vllm_server_status()
    
    return {
        "status": "healthy",
        "mongodb": mongodb_status,
        "vllm_server": vllm_server_status,
        "database": DATABASE_NAME,
        "collection": COLLECTION_NAME,
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
        log_level="info"
    )
