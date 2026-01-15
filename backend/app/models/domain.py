from typing import List, Dict, Optional
from pydantic import BaseModel
from datetime import datetime

class ConsultingContext(BaseModel):
    """User's complete consulting and sales engagement context"""
    user_id: str
    username: str
    role: str
    industry: str
    
    # Engagement / Deal Info
    project_name: str
    sales_stage: str # e.g., "Qualification", "Proposal", "Negotiation"
    deal_size: str
    success_criteria: List[str]
    timeline: str
    
    # Market & Competition
    competitors: List[str]
    client_pain_points: List[str]
    
    # Stakeholders & Team
    key_stakeholders: List[Dict] # [{"name": "Name", "role": "CEO", "buying_role": "Economic Buyer", "interest": "ROI"}]
    team_members: List[str]
    
    # Documents & Context
    available_documents: List[str] # ["Q1_Strategy.pdf", "Meeting_Transcript_Jan12.txt"]
    key_objections: List[str]
    
    # Session info
    last_meeting_date: Optional[datetime] = None
