import json
import asyncio
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

from backboard import BackboardClient
from ..models.domain import ConsultingContext

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConsultingAssistant:
    """
    Agentic sales & consulting assistant powered by Backboard.io
    """
    
    def __init__(self, api_key: str):
        """Initialize Backboard client"""
        if not api_key:
            raise ValueError("API Key is required")
        self.client = BackboardClient(api_key=api_key, timeout=120)
        self.assistant = None
        self.user_thread = None
        self.context = None
        logger.info("✓ Backboard client initialized")

    @staticmethod
    def _read_document_content(file_path: str) -> str:
        """Helper to read text content from a file"""
        path = Path(file_path)
        if not path.exists():
            return f"[ERROR: File not found: {file_path}]"
        
        try:
            return f"--- START DOCUMENT: {path.name} ---\n{path.read_text(encoding='utf-8')}\n--- END DOCUMENT ---\n"
        except Exception as e:
            logger.error(f"Error reading {file_path}: {e}")
            return f"[ERROR reading {file_path}: {str(e)}]"

    async def build_context_from_documents(
        self, 
        user_id: str, 
        username: str, 
        role: str,
        industry: str,
        file_paths: List[str]
    ) -> ConsultingContext:
        """
        Ingest documents and use LLM to extract structured ConsultingContext
        """
        logger.info(f"📂 Reading {len(file_paths)} documents for context extraction...")
        
        # 1. Read all files
        all_content = "\n".join([self._read_document_content(fp) for fp in file_paths])
        
        logger.info("🔍 Analyzing documents to extract project context...")
        
        # Creating a temporary assistant for extraction
        extractor = await self.client.create_assistant(
            name="Context Extractor",
            description="Extracts structured JSON from documents"
        )
        
        thread = await self.client.create_thread(extractor.assistant_id)
        
        extraction_prompt = f"""
        You are a Data Extraction Assistant. 
        Analyze the following documents and extract the project context into a JSON object.
        
        DOCUMENTS:
        {all_content}
        
        USER DETAILS:
        User ID: {user_id}
        Username: {username}
        Role: {role}
        Industry: {industry}
        
        OUTPUT FORMAT:
        Return ONLY a raw JSON object (no markdown formatting) with these exact keys:
        {{
            "project_name": "string",
            "sales_stage": "string", 
            "deal_size": "string",
            "success_criteria": ["list", "of", "strings"],
            "timeline": "string",
            "competitors": ["list", "of", "strings"],
            "client_pain_points": ["list", "of", "strings"],
            "key_stakeholders": [
                {{"name": "...", "role": "...", "buying_role": "Economic Buyer/Champion/Blocker", "interest": "..."}}
            ],
            "team_members": ["list", "of", "strings"],
            "key_objections": ["list", "of", "strings"]
        }}
        
        If information is missing, infer it from context or use "Unknown".
        """
        
        response = await self.client.add_message(
            thread_id=thread.thread_id,
            content=extraction_prompt,
            llm_provider="featherless",
            model_name="12thD/ko-Llama-3-8B-sft-v0.3",
            memory="None", 
            stream=False
        )
        
        # 4. Parse JSON
        try:
            if not response or not hasattr(response, 'content') or response.content is None:
                logger.error(f"❌ Error: LLM returned empty response. Response object: {response}")
                raise ValueError("LLM returned empty content during context extraction")

            # Cleanup potential markdown code blocks
            json_str = response.content.replace("```json", "").replace("```", "").strip()
            data = json.loads(json_str)
            
            logger.info("✓ Context successfully extracted from documents")
            
            # 5. Construct object
            return ConsultingContext(
                user_id=user_id,
                username=username,
                role=role,
                industry=industry,
                project_name=data.get("project_name", "Untitled Project"),
                sales_stage=data.get("sales_stage", "Unknown"),
                deal_size=data.get("deal_size", "Unknown"),
                success_criteria=data.get("success_criteria", []),
                timeline=data.get("timeline", "Unknown"),
                competitors=data.get("competitors", []),
                client_pain_points=data.get("client_pain_points", []),
                key_stakeholders=data.get("key_stakeholders", []),
                team_members=data.get("team_members", []),
                available_documents=[Path(f).name for f in file_paths],
                key_objections=data.get("key_objections", []),
                last_meeting_date=datetime.now()
            )
            
        except json.JSONDecodeError as e:
            logger.error("❌ Failed to parse JSON from LLM response.")
            logger.debug(f"Response: {response.content}")
            raise ValueError("Could not extract valid JSON context from documents") from e

    async def initialize(self, user_id: str, context: ConsultingContext):
        """
        Set up assistant with project context
        """
        logger.info(f"🚀 Initializing sales/consulting assistant for {context.username}...")
        
        self.assistant = await self.client.create_assistant(
            name=f"Sales & Consulting Assistant - {context.project_name}",
            description="Strategic partner for sales pursuits and consulting engagements"
        )
        
        logger.info(f"✓ Assistant created: {str(self.assistant.assistant_id)}")
        
        self.user_thread = await self.client.create_thread(
            self.assistant.assistant_id
        )
        
        logger.info(f"✓ Thread created: {str(self.user_thread.thread_id)}")

        await self.client.add_message(
            thread_id=self.user_thread.thread_id,
            content=self._generate_system_prompt(context),
            llm_provider="featherless",
            model_name="12thD/ko-Llama-3-8B-sft-v0.3",
            memory="Auto",
            stream=False
        )
        
        self.context = context
        logger.info("✓ Assistant initialized successfully")
        return self.assistant

    async def load_existing_session(self, assistant_id: str, thread_id: str, context: Optional[ConsultingContext] = None):
        """
        Load an existing assistant and thread session.
        """
        self.assistant = await self.client.get_assistant(assistant_id)
        self.user_thread = await self.client.get_thread(thread_id)
        self.context = context
        logger.info(f"✓ Loaded existing session: Assistant {assistant_id}, Thread {thread_id}")

    def _generate_system_prompt(self, context: ConsultingContext) -> str:
        """
        Create personalized system prompt with project context
        """
        stakeholders_str = "\n  ".join([f"{s['name']}: {s['role']} [{s.get('buying_role', 'Influencer')}] - Care about: {s.get('interest', 'N/A')}" for s in context.key_stakeholders])
        goals_str = "\n  ".join(context.success_criteria)
        docs_str = "\n  ".join(context.available_documents)
        pain_points_str = "\n  ".join(context.client_pain_points)
        objections_str = "\n  ".join(context.key_objections)
        competitors_str = ", ".join(context.competitors)
        
        return f"""You are a top-tier Sales & Consulting Strategic Assistant working with {context.username}.

═══════════════════════════════════════════════════════════
CRITICAL ENGAGEMENT CONTEXT (Always reference this)
═══════════════════════════════════════════════════════════

👤 USER INFO:
  Name: {context.username}
  Role: {context.role}
  Industry: {context.industry}

💼 OPPORTUNITY SNAPSHOT:
  Project/Deal: {context.project_name}
  Stage: {context.sales_stage}
  Deal Size: {context.deal_size}
  Timeline: {context.timeline}

🔥 CLIENT PAIN POINTS:
  {pain_points_str}

👥 KEY STAKEHOLDERS (BUYING CENTER):
  {stakeholders_str}

🎯 SUCCESS CRITERIA:
  {goals_str}

⚔️ COMPETITIVE LANDSCAPE:
  Competitors: {competitors_str}
  Known Objections: {objections_str}

📂 AVAILABLE CONTEXT DOCUMENTS:
  {docs_str}

═══════════════════════════════════════════════════════════
YOUR RESPONSIBILITIES
═══════════════════════════════════════════════════════════

1. STRATEGIC SELLING ADVICE
   - Map stakeholders (Champion, Economic Buyer, Blocker)
   - Suggest moves to advance the sales stage (MEDDIC/SPIN frameworks)
   - Identify cross-sell and upsell opportunities
   - Help position against competitors ({competitors_str})

2. CONSULTATIVE INSIGHT
   - Connect client pain points to our solution value
   - Identify risks to project success or deal closing
   - Synthesize "Executive Summaries" from transcripts

3. REMEMBER CONTEXT
   - Never forget who holds the budget vs. who is a technical recommender
   - Recall specific objections raised in past meetings
   - Maintain continuity across the deal lifecycle

4. ACTION-ORIENTED OUTPUTS
   - Draft emails to stakeholders addressing their specific interests
   - Create negotiation scripts or objection handling talking points
   - Propose agendas for next steps

═══════════════════════════════════════════════════════════
IMPORTANT: You have access to this project's full context via memory.
Use it to help close the deal and deliver consulting value.
═══════════════════════════════════════════════════════════
"""
    
    async def upload_project_documents(self, file_paths: List[str]) -> List[Dict]:
        if not self.assistant:
            raise RuntimeError("Assistant not initialized. Call initialize() first.")
            
        logger.info(f"📤 Uploading {len(file_paths)} documents to Backboard RAG...")
        uploaded_docs = []
        
        for file_path in file_paths:
            path_obj = Path(file_path)
            if not path_obj.exists():
                logger.warning(f"⚠️ File not found, skipping: {file_path}")
                continue
                
            logger.info(f"   • Uploading: {path_obj.name}...")
            
            try:
                # 1. Upload
                document = await self.client.upload_document_to_assistant(
                    self.assistant.assistant_id,
                    file_path
                )
                
                # 2. Wait for indexing
                logger.info(f"     ⌛ Indexing {path_obj.name}...")
                while True:
                    status = await self.client.get_document_status(document.document_id)
                    if status.status == "indexed":
                        logger.info(" ✓ Ready")
                        uploaded_docs.append({
                            "name": path_obj.name,
                            "id": str(document.document_id),
                            "status": "indexed"
                        })
                        break
                    elif status.status == "failed":
                        logger.warning(f" ❌ Failed: {status.status_message}")
                        uploaded_docs.append({
                            "name": path_obj.name,
                            "id": str(document.document_id),
                            "status": "failed",
                            "error": status.status_message
                        })
                        break
                    
                    await asyncio.sleep(1) # Non-blocking sleep
                    
            except Exception as e:
                logger.error(f" ❌ Error uploading {path_obj.name}: {e}")
                
        return uploaded_docs

    async def chat(self, user_message: str) -> str:
        if not self.assistant or not self.user_thread:
            raise RuntimeError("Assistant not initialized. Call initialize() first.")
        
        logger.info(f"💬 User: {user_message}")
        
        try:
            # Send message with memory enabled
            response = await self.client.add_message(
                thread_id=self.user_thread.thread_id,
                content=user_message,
                llm_provider="featherless",
                model_name="12thD/ko-Llama-3-8B-sft-v0.3",
                memory="Auto",
                stream=False
            )
            
            full_response = response.content
            logger.info(f"🤖 Assistant: {full_response}")
            return full_response

        except Exception as e:
            logger.error(f"❌ Error in chat chat: {e}")
            return "I apologize, but I encountered an error connecting to the AI provider. Please try again."
