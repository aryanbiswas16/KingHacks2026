import shutil
import os
import json
import logging
import mimetypes
import asyncio
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Query, Depends
from fastapi.responses import FileResponse, StreamingResponse
from ..services.assistant import ConsultingAssistant
from ..models.domain import ConsultingContext
from ..core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory queues for live transcript streaming
transcript_queues: Dict[str, asyncio.Queue] = {}
active_transcript_target: Dict[str, Optional[str]] = {
    "project_id": None,
    "meeting_url": None,
    "started_at": None
}

# --- Helper Functions ---

def get_file_type(filename: str) -> str:
    """Detect file type from filename"""
    ext = Path(filename).suffix.lower()
    if ext == '.pdf':
        return 'PDF'
    elif ext in ['.txt', '.text']:
        return 'Text'
    elif ext in ['.doc', '.docx']:
        return 'Document'
    elif ext in ['.xls', '.xlsx', '.csv']:
        return 'Spreadsheet'
    elif ext in ['.ppt', '.pptx']:
        return 'Presentation'
    else:
        return 'File'

def is_transcript(filename: str) -> bool:
    """Check if filename indicates a meeting transcript"""
    name_lower = filename.lower()
    return any(keyword in name_lower for keyword in ['transcript', 'call', 'meeting', 'recording'])

def format_file_size(bytes_size: int) -> str:
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} TB"

def get_transcript_queue(project_id: str) -> asyncio.Queue:
    if project_id not in transcript_queues:
        transcript_queues[project_id] = asyncio.Queue()
    return transcript_queues[project_id]

class TranscriptChunk(BaseModel):
    project_id: str
    speaker: Optional[str] = None
    text: str
    meeting_url: Optional[str] = None
    timestamp: Optional[str] = None

class TranscriptStart(BaseModel):
    project_id: str
    meeting_url: Optional[str] = None

# --- Persistence Layer (Simple JSON storage) ---
# In a real app, this would be a separate Repository class using a DB.

def get_mappings_path() -> Path:
    return Path(settings.MAPPING_FILE)

def load_mappings() -> Dict:
    path = get_mappings_path()
    if path.exists():
        try:
            return json.loads(path.read_text())
        except:
            return {}
    return {}

def save_mapping(project_id: str, assistant_id: str, thread_id: str):
    mappings = load_mappings()
    if project_id not in mappings:
        mappings[project_id] = {}
    
    mappings[project_id]["assistant_id"] = str(assistant_id)
    mappings[project_id]["thread_id"] = str(thread_id)
    
    if "documents" not in mappings[project_id]:
        mappings[project_id]["documents"] = []
        
    path = get_mappings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(mappings, indent=2))

def add_documents_to_mapping(project_id: str, new_docs: List[Dict]):
    try:
        mappings = load_mappings()
        if project_id not in mappings:
            mappings[project_id] = {}
            if "documents" not in mappings[project_id]:
                 mappings[project_id]["documents"] = []
        
        if "documents" not in mappings[project_id]:
            mappings[project_id]["documents"] = []
        
        existing_names = {d["name"] for d in mappings[project_id]["documents"]}
        for doc in new_docs:
            if doc["name"] not in existing_names:
                mappings[project_id]["documents"].append(doc)
        
        path = get_mappings_path()
        path.write_text(json.dumps(mappings, indent=2))
        logger.info(f"Updated document mappings for {project_id}")
    except Exception as e:
        logger.error(f"Error saving document mapping: {e}")

def remove_document_from_mapping(project_id: str, document_id: str):
    """Remove a document from the project mappings"""
    try:
        mappings = load_mappings()
        if project_id not in mappings:
            return False
        
        if "documents" not in mappings[project_id]:
            return False
        
        # Filter out the document with the given ID
        original_count = len(mappings[project_id]["documents"])
        mappings[project_id]["documents"] = [
            d for d in mappings[project_id]["documents"] 
            if d.get("id") != document_id
        ]
        
        if len(mappings[project_id]["documents"]) < original_count:
            path = get_mappings_path()
            path.write_text(json.dumps(mappings, indent=2))
            logger.info(f"Removed document {document_id} from {project_id}")
            return True
        
        return False
    except Exception as e:
        logger.error(f"Error removing document from mapping: {e}")
        return False

def delete_project_mapping(project_id: str):
    """Delete the entire mapping for a project"""
    try:
        mappings = load_mappings()
        if project_id in mappings:
            del mappings[project_id]
            path = get_mappings_path()
            path.write_text(json.dumps(mappings, indent=2))
            logger.info(f"Deleted mapping for {project_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting project mapping: {e}")
        return False
 

# --- Dependency Injection ---

# In-memory store for active assistant instances
project_assistants: Dict[str, ConsultingAssistant] = {}

async def clear_assistant_cache(project_id: str = None):
    """Clear the in-memory assistant cache for a project or all projects."""
    if project_id:
        if project_id in project_assistants:
            del project_assistants[project_id]
            logger.info(f"Cleared assistant cache for {project_id}")
    else:
        project_assistants.clear()
        logger.info("Cleared all assistant caches")

async def get_assistant(project_id: str) -> ConsultingAssistant:
    """Dependency to get or create an assistant for a project."""
    if project_id in project_assistants:
        return project_assistants[project_id]

    api_key = settings.BACKBOARD_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="BACKBOARD_API_KEY configuration missing")

    new_assistant = ConsultingAssistant(api_key=api_key)
    
    # Check persistence
    mappings = load_mappings()
    if project_id in mappings:
        data = mappings[project_id]
        logger.info(f"Loading existing session for Project ID: {project_id}")
        
        # Hydrate a default context if we don't have one stored
        # Populate available_documents from the mappings so citations can be extracted
        available_docs = [doc.get("name") for doc in data.get("documents", []) if doc.get("name")]
        default_context = ConsultingContext(
            user_id="web_user", username="Web User", role="Visitor", industry="Tech",
            project_name=f"Project {project_id}", sales_stage="Unknown", deal_size="Unknown",
            success_criteria=[], timeline="Unknown", competitors=[], client_pain_points=[],
            key_stakeholders=[], team_members=[], available_documents=available_docs, key_objections=[]
        )
        
        try:
            await new_assistant.load_existing_session(
                assistant_id=data["assistant_id"],
                thread_id=data["thread_id"],
                context=default_context 
            )
            project_assistants[project_id] = new_assistant
            return new_assistant
        except Exception as e:
            logger.warning(f"Failed to load existing session (ID might be invalid or expired): {e}. Initializing new session.")
            # Remove invalid mapping logic so we fall through to create a new one
            pass

    # If no mapping exists (or failed to load), we initialize a fresh one (Usually this should be explicit via a 'create' endpoint)
    # For now, we keep the auto-create behavior but log it.
    logger.info(f"Initializing NEW assistant for Project ID: {project_id}")
    
    context = ConsultingContext(
        user_id="web_user", username="Web User", role="Visitor", industry="Tech",
        project_name=f"Project {project_id}", sales_stage="Discovery", deal_size="Unknown",
        success_criteria=[], timeline="Unknown", competitors=[], client_pain_points=[],
        key_stakeholders=[], team_members=[], available_documents=[], key_objections=[]
    )
    
    await new_assistant.initialize("web_user", context)
    
    if new_assistant.assistant and new_assistant.user_thread:
        save_mapping(project_id, new_assistant.assistant.assistant_id, new_assistant.user_thread.thread_id)
    
    project_assistants[project_id] = new_assistant
    return new_assistant


# --- Endpoints ---

@router.post("/upload")
async def upload_files(
    project_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload documents to the project.
    """
    try:
        assistant = await get_assistant(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    uploaded_paths = []
    upload_dir = Path(settings.UPLOAD_DIR) / project_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    try:
        file_metadata = {}  # Store file size, type, and transcript flag
        
        for file in files:
            temp_path = upload_dir / file.filename
            with temp_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Capture metadata
            file_size = temp_path.stat().st_size
            file_type = get_file_type(file.filename)
            is_trans = is_transcript(file.filename)
            
            uploaded_paths.append(str(temp_path))
            file_metadata[file.filename] = {
                "size": file_size,
                "type": file_type,
                "is_transcript": is_trans
            }

        results = await assistant.upload_project_documents(uploaded_paths)
        
        # Enrich results with metadata
        for result in results:
            if result["name"] in file_metadata:
                meta = file_metadata[result["name"]]
                result["file_type"] = meta["type"]
                result["file_size"] = meta["size"]
                result["size_formatted"] = format_file_size(meta["size"])
                result["is_transcript"] = meta["is_transcript"]
                result["uploaded_at"] = datetime.now().isoformat()
        
        add_documents_to_mapping(project_id, results)
        
        return {"status": "success", "results": results, "project_id": project_id}

    except Exception as e:
        logger.error(f"Error during upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    # Note: We are keeping the files in data/uploads for persistence now, unlike the temporary cleanup before.

@router.get("/documents")
async def get_documents(project_id: str = Query(...)):
    mappings = load_mappings()
    docs = mappings.get(project_id, {}).get("documents", [])
    return {"documents": docs}

@router.delete("/documents")
async def delete_document(
    project_id: str = Query(...),
    document_id: str = Query(...)
):
    """Delete a document from the project"""
    try:
        assistant = await get_assistant(project_id)
        
        # Find the document in mappings to get its name
        mappings = load_mappings()
        doc_name = None
        if project_id in mappings and "documents" in mappings[project_id]:
            for doc in mappings[project_id]["documents"]:
                if doc.get("id") == document_id:
                    doc_name = doc.get("name", "Unknown")
                    break
        
        if not doc_name:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found in project")
        
        # Remove from Backboard
        result = await assistant.remove_project_document(document_id, doc_name)
        
        # Remove from mappings
        remove_document_from_mapping(project_id, document_id)

        # Clear the assistant cache so it reloads with updated documents
        await clear_assistant_cache(project_id)
        logger.info(f"Cleared assistant cache for {project_id} after document deletion")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat_endpoint(
    message: str = Query(...), 
    project_id: str = Query(...)
):
    logger.info(f"Chat request for {project_id}")
    try:
        assistant = await get_assistant(project_id)

        # Refresh context's available_documents from current mappings
        # This ensures the assistant knows about newly uploaded or removed documents
        mappings = load_mappings()
        current_documents = [doc.get("name") for doc in mappings.get(project_id, {}).get("documents", []) if doc.get("name")]
        if assistant.context:
            assistant.context.available_documents = current_documents
            logger.info(f"Updated context documents: {current_documents}")

        # Refresh thread to pick up newly uploaded documents in Backboard
        await assistant.refresh_thread()

        # response is a dict with 'response' and 'citations'
        result = await assistant.chat(message)

        # Use citations directly from Backboard's response - no fallback guessing
        citations = result.get("citations", [])
        
        return {
            "response": result["response"], 
            "citations": citations,
            "available_documents": current_documents,
            "project_id": project_id
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class FeedbackRequest(BaseModel):
    message_content: str
    rating: str # 'up' or 'down'
    project_id: str

@router.post("/feedback")
async def feedback_endpoint(feedback: FeedbackRequest):
    logger.info(f"👍 Feedback received for Project {feedback.project_id}: {feedback.rating}")
    logger.info(f"   Context: {feedback.message_content[:50]}...")
    
    # In a real app, save to database. For now, we log it.
    return {"status": "success", "message": "Feedback recorded"}

@router.delete("/reset")
async def reset_project_endpoint(project_id: str = Query(...)):
    """
    Hard reset a project: Deletes the Backboard Assistant (clearing memories/docs)
    and removes the local mapping. Next interaction will create a fresh assistant.
    """
    logger.warning(f"💣 RESET REQUESTED FOR PROJECT: {project_id}")
    try:
        # 1. Try to get the assistant wrapper.
        #    If it fails (e.g., config missing, bad ID), we still try to clean up mappings.
        try:
            assistant = await get_assistant(project_id)
            if assistant:
                await assistant.hard_reset_assistant()
        except Exception as e:
            logger.error(f"Error connecting to assistant during reset: {e}. Proceeding to clear local mapping.")

        # 2. Clear in-memory cache
        if project_id in project_assistants:
            del project_assistants[project_id]

        # 3. Clear JSON persistence
        delete_project_mapping(project_id)
        
        return {"status": "success", "message": f"Project {project_id} has been reset."}

    except Exception as e:
        logger.error(f"Reset failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{project_id}/{filename}")
async def get_file_content(project_id: str, filename: str):
    """
    Serve the content of a project file for preview.
    """
    file_path = Path(settings.UPLOAD_DIR) / project_id / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=mime_type,
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""}
    )


@router.post("/transcript/start")
async def start_transcript(target: TranscriptStart):
    """
    Set the active project for live transcript ingestion.
    """
    active_transcript_target["project_id"] = target.project_id
    active_transcript_target["meeting_url"] = target.meeting_url
    active_transcript_target["started_at"] = datetime.utcnow().isoformat()
    return {"status": "ok", "active": active_transcript_target}


@router.post("/transcript/stop")
async def stop_transcript():
    """
    Clear the active project for live transcript ingestion.
    """
    active_transcript_target["project_id"] = None
    active_transcript_target["meeting_url"] = None
    active_transcript_target["started_at"] = None
    return {"status": "ok", "active": active_transcript_target}


@router.get("/transcript/active")
async def get_active_transcript():
    """
    Get the current active project for live transcript ingestion.
    """
    return {"status": "ok", "active": active_transcript_target}


@router.post("/transcript")
async def ingest_transcript(chunk: TranscriptChunk):
    """
    Ingest live transcript chunks and stream them to subscribers.
    """
    try:
        queue = get_transcript_queue(chunk.project_id)
        payload = {
            "speaker": chunk.speaker or "Unknown",
            "text": chunk.text,
            "meeting_url": chunk.meeting_url,
            "timestamp": chunk.timestamp or datetime.utcnow().isoformat()
        }

        # Append to local transcript file for persistence
        upload_dir = Path(settings.UPLOAD_DIR) / chunk.project_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        transcript_path = upload_dir / "live_transcript.txt"
        with transcript_path.open("a", encoding="utf-8") as f:
            f.write(f"[{payload['timestamp']}] {payload['speaker']}: {payload['text']}\n")

        await queue.put(payload)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error ingesting transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transcript/stream")
async def stream_transcript(project_id: str = Query(...)):
    """
    Stream live transcript chunks via Server-Sent Events (SSE).
    """
    queue = get_transcript_queue(project_id)

    async def event_generator():
        while True:
            payload = await queue.get()
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
