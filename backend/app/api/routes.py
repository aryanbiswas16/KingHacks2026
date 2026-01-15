import shutil
import os
import json
import logging
from pathlib import Path
from typing import List, Dict
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Query, Depends
from ..services.assistant import ConsultingAssistant
from ..models.domain import ConsultingContext
from ..core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

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

# --- Dependency Injection ---

# In-memory store for active assistant instances
project_assistants: Dict[str, ConsultingAssistant] = {}

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
        # Improvements: Store the 'context' JSON in mappings as well!
        default_context = ConsultingContext(
            user_id="web_user", username="Web User", role="Visitor", industry="Tech",
            project_name=f"Project {project_id}", sales_stage="Unknown", deal_size="Unknown",
            success_criteria=[], timeline="Unknown", competitors=[], client_pain_points=[],
            key_stakeholders=[], team_members=[], available_documents=[], key_objections=[]
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
        for file in files:
            temp_path = upload_dir / file.filename
            with temp_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_paths.append(str(temp_path))

        results = await assistant.upload_project_documents(uploaded_paths)
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

@router.post("/chat")
async def chat_endpoint(
    message: str = Query(...), 
    project_id: str = Query(...)
):
    logger.info(f"Chat request for {project_id}")
    try:
        assistant = await get_assistant(project_id)
        response = await assistant.chat(message)
        return {"response": response, "project_id": project_id}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
