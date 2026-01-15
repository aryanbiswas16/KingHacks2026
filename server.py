import shutil
import os
import json
from pathlib import Path
from typing import List, Dict
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from backboard_starter_project import ConsultingAssistant, ConsultingContext

app = FastAPI()

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistence
MAPPING_FILE = Path("data/project_mappings.json")

def load_mappings():
    if MAPPING_FILE.exists():
        try:
            return json.loads(MAPPING_FILE.read_text())
        except:
            return {}
    return {}

def save_mapping(project_id: str, assistant_id: str, thread_id: str):
    mappings = load_mappings()
    if project_id not in mappings:
        mappings[project_id] = {}
    
    mappings[project_id]["assistant_id"] = str(assistant_id)
    mappings[project_id]["thread_id"] = str(thread_id)
    
    # Ensure documents list exists
    if "documents" not in mappings[project_id]:
        mappings[project_id]["documents"] = []
        
    MAPPING_FILE.parent.mkdir(exist_ok=True)
    MAPPING_FILE.write_text(json.dumps(mappings, indent=2))

def add_documents_to_mapping(project_id: str, new_docs: List[Dict]):
    print(f"Adding documents to mapping for {project_id}: {new_docs}")
    try:
        mappings = load_mappings()
        if project_id not in mappings:
            print(f"Warning: Project {project_id} not found in mappings during doc add. creating entry.")
            mappings[project_id] = {}
        
        if "documents" not in mappings[project_id]:
            mappings[project_id]["documents"] = []
        
        # Avoid duplicates
        existing_names = {d["name"] for d in mappings[project_id]["documents"]}
        for doc in new_docs:
            if doc["name"] not in existing_names:
                mappings[project_id]["documents"].append(doc)
        
        MAPPING_FILE.write_text(json.dumps(mappings, indent=2))
        print("Mappings updated successfully")
    except Exception as e:
        print(f"Error saving document mapping: {e}") 


def get_project_documents(project_id: str) -> List[Dict]:
    mappings = load_mappings()
    if project_id in mappings:
        return mappings[project_id].get("documents", [])
    return []

# Store assistants per project_id in memory
# Dict[project_id, ConsultingAssistant]
project_assistants: Dict[str, ConsultingAssistant] = {}

async def get_or_create_assistant(project_id: str) -> ConsultingAssistant:
    """Retrieves an existing assistant or creates a new one for the project."""
    if project_id in project_assistants:
        return project_assistants[project_id]

    api_key = os.getenv("BACKBOARD_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="BACKBOARD_API_KEY not found")

    new_assistant = ConsultingAssistant(api_key=api_key)
    
    # Check persistence
    mappings = load_mappings()
    if project_id in mappings:
        data = mappings[project_id]
        print(f"Loading existing session for Project ID: {project_id}")
        await new_assistant.load_existing_session(
            assistant_id=data["assistant_id"],
            thread_id=data["thread_id"],
            # You might want to persist context too, but for now we reconstruct a minimal one
            context=ConsultingContext(
                user_id="web_user", username="Web User", role="Visitor", industry="Tech",
                project_name=f"Project {project_id}", sales_stage="Unknown", deal_size="Unknown",
                success_criteria=[], timeline="Unknown", competitors=[], client_pain_points=[],
                key_stakeholders=[], team_members=[], available_documents=[], key_objections=[]
            )
        )
        project_assistants[project_id] = new_assistant
        return new_assistant

    print(f"Initializing new assistant for Project ID: {project_id}")
    
    # Initialize with default/placeholder context
    context = ConsultingContext(
        user_id="web_user",
        username="Web User",
        role="Visitor",
        industry="Tech",
        project_name=f"Project {project_id}",
        sales_stage="Discovery",
        deal_size="Unknown",
        success_criteria=[],
        timeline="Unknown",
        competitors=[],
        client_pain_points=[],
        key_stakeholders=[],
        team_members=[],
        available_documents=[],
        key_objections=[]
    )
    
    await new_assistant.initialize("web_user", context)
    
    # Save persistence
    if new_assistant.assistant and new_assistant.user_thread:
        save_mapping(project_id, new_assistant.assistant.assistant_id, new_assistant.user_thread.thread_id)
    
    project_assistants[project_id] = new_assistant
    return new_assistant

@app.on_event("startup")
async def startup_event():
    # Only verify API key availability on startup
    api_key = os.getenv("BACKBOARD_API_KEY")
    if not api_key:
        print("⚠️ Warning: BACKBOARD_API_KEY not found")

@app.post("/upload")
async def upload_files(
    project_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Endpoint for React to upload documents for a specific project
    """
    try:
        assistant = await get_or_create_assistant(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    uploaded_paths = []
    # Create project specific upload directory
    upload_dir = Path(f"data/uploads/{project_id}")
    upload_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Save files locally temporarily
        for file in files:
            temp_path = upload_dir / file.filename
            with temp_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_paths.append(str(temp_path))

        # 2. Upload to the specific assistant
        results = await assistant.upload_project_documents(uploaded_paths)
        
        # 3. Save to persistence
        add_documents_to_mapping(project_id, results)
        
        return {"status": "success", "results": results, "project_id": project_id}

    except Exception as e:
        print(f"Error during upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp files
        for path in uploaded_paths:
            try:
                os.remove(path)
            except:
                pass

@app.get("/documents")
async def get_documents(project_id: str = Query(...)):
    docs = get_project_documents(project_id)
    return {"documents": docs}

@app.post("/chat")
async def chat_endpoint(
    message: str = Query(...), 
    project_id: str = Query(...)
):
    print(f"Received chat request for project {project_id}: {message}")
    try:
        assistant = await get_or_create_assistant(project_id)
        if hasattr(assistant, 'user_thread') and assistant.user_thread:
             print(f"Assistant retrieved. Thread ID: {assistant.user_thread.thread_id}")
        else:
             print("Assistant retrieved but NO Thread ID found!")
             
        print("Assistant retrieved/created. Sending message to Backboard...")
        response = await assistant.chat(message)
        print(f"Received response from Backboard (FULL): {response}")
        return {"response": response, "project_id": project_id}
    except Exception as e:
        print(f"Error during chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))
