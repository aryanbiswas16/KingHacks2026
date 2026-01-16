import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Beacon Consulting Assistant"
    API_V1_STR: str = "/api/v1"
    BACKBOARD_API_KEY: Optional[str] = os.getenv("BACKBOARD_API_KEY")
    
    # Persistence
    DATA_DIR: str = "data"
    MAPPING_FILE: str = os.path.join(DATA_DIR, "project_mappings.json")
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    TRANSCRIPT_DIR: str = os.path.join(DATA_DIR, "transcripts")
    
settings = Settings()
