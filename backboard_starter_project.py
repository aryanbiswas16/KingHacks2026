# ============================================================================
# BACKBOARD.IO CONSULTING ASSISTANT - STARTER PROJECT
# ============================================================================
# This is your foundation. Integrate everything else later.
# Focus: Get Backboard working with persistent memory and basic chat.
# ============================================================================

import json
import asyncio
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from backboard import BackboardClient
from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Optional

load_dotenv()

# ============================================================================
# DATA MODELS
# ============================================================================

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


# ============================================================================
# MAIN ASSISTANT CLASS
# ============================================================================

class ConsultingAssistant:
    """
    Agentic sales & consulting assistant powered by Backboard.io
    
    Core features:
    - Persistent memory across conversations
    - Contextual awareness of sales cycle and stakeholders
    - Tool calling framework (for future expansion)
    - Document RAG synthesis capabilities
    """
    
    def __init__(self, api_key: str):
        """Initialize Backboard client"""
        # Increase timeout to 120s to handle large context processing
        self.client = BackboardClient(api_key=api_key, timeout=120)
        self.assistant = None
        self.user_thread = None
        self.context = None
        print("✓ Backboard client initialized")

    @staticmethod
    def _read_document_content(file_path: str) -> str:
        """Helper to read text content from a file"""
        path = Path(file_path)
        if not path.exists():
            return f"[ERROR: File not found: {file_path}]"
        
        try:
            # Basic text reading. In a real app, use unstructured/pypdf for PDFs
            return f"--- START DOCUMENT: {path.name} ---\n{path.read_text(encoding='utf-8')}\n--- END DOCUMENT ---\n"
        except Exception as e:
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
        print(f"\n📂 Reading {len(file_paths)} documents for context extraction...")
        
        # 1. Read all files
        all_content = "\n".join([self._read_document_content(fp) for fp in file_paths])
        
        # 2. Create a temporary extractor assistant (or just a thread)
        # We'll use a temporary thread with a specific prompt
        print("🔍 Analyzing documents to extract project context...")
        
        # Creating a temporary assistant for extraction to keep things clean
        extractor = await self.client.create_assistant(
            name="Context Extractor",
            description="Extracts structured JSON from documents"
        )
        
        thread = await self.client.create_thread(extractor.assistant_id)
        
        # 3. Prompt for JSON extraction
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
            memory="None", # No need for long-term memory for this one-shot task
            stream=False
        )
        
        # 4. Parse JSON
        try:
            # Check for valid response
            if not response or not hasattr(response, 'content') or response.content is None:
                print(f"❌ Error: LLM returned empty response. Response object: {response}")
                raise ValueError("LLM returned empty content during context extraction")

            # Cleanup potential markdown code blocks
            json_str = response.content.replace("```json", "").replace("```", "").strip()
            data = json.loads(json_str)
            
            print("✓ Context successfully extracted from documents")
            
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
                last_meeting_date=datetime.now() # Default to now
            )
            
        except json.JSONDecodeError:
            print("❌ Failed to parse JSON from LLM response. Using fallback.")
            print(f"DEBUG Response: {response.content}")
            raise ValueError("Could not extract valid JSON context from documents")

    async def initialize(
        self,
        user_id: str,
        context: ConsultingContext
    ):
        """
        Set up assistant with project context
        
        This creates:
        1. Assistant (with system prompt containing business context)
        2. Thread (persistent conversation state)
        3. Memory layer (automatically saves/retrieves facts)
        """
        
        print(f"\n🚀 Initializing sales/consulting assistant for {context.username}...")
        
        # Create assistant
        self.assistant = await self.client.create_assistant(
            name=f"Sales & Consulting Assistant - {context.project_name}",
            description="Strategic partner for sales pursuits and consulting engagements"
        )
        
        print(f"✓ Assistant created: {self.assistant.assistant_id}")
        
        # Create persistent thread (maintains conversation state)
        self.user_thread = await self.client.create_thread(
            self.assistant.assistant_id
        )
        
        print(f"✓ Thread created: {self.user_thread.thread_id}")

        # Send system prompt as first message to prime the context
        # Note: Backboard SDK 1.4.6 doesn't support system_prompt in create_assistant,
        # so we send it as the first message.
        await self.client.add_message(
            thread_id=self.user_thread.thread_id,
            content=self._generate_system_prompt(context),
            llm_provider="featherless",
            model_name="12thD/ko-Llama-3-8B-sft-v0.3",
            memory="Auto",
            stream=False
        )
        
        # Store context for reference
        self.context = context
        
        print(f"✓ Assistant initialized successfully\n")
        
        return self.assistant

    async def load_existing_session(self, assistant_id: str, thread_id: str, context: Optional[ConsultingContext] = None):
        """
        Load an existing assistant and thread session.
        """
        self.assistant = await self.client.get_assistant(assistant_id)
        self.user_thread = await self.client.get_thread(thread_id)
        self.context = context
        print(f"✓ Loaded existing session: Assistant {assistant_id}, Thread {thread_id}")

    def _generate_system_prompt(self, context: ConsultingContext) -> str:
        """
        Create personalized system prompt with project context
        
        This tells the LLM everything about the business context so it provides
        relevant strategic advice.
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
        """
        Upload documents to the Backboard assistant for RAG (Retrieval)
        
        This allows the assistant to search through these documents during chat.
        Returns a list of uploaded document details.
        """
        if not self.assistant:
            raise RuntimeError("Assistant not initialized. Call initialize() first.")
            
        print(f"\n📤 Uploading {len(file_paths)} documents to Backboard RAG...")
        uploaded_docs = []
        
        for file_path in file_paths:
            path_obj = Path(file_path)
            if not path_obj.exists():
                print(f"⚠️ File not found, skipping: {file_path}")
                continue
                
            print(f"   • Uploading: {path_obj.name}...")
            
            try:
                # 1. Upload
                document = await self.client.upload_document_to_assistant(
                    self.assistant.assistant_id,
                    file_path
                )
                
                # 2. Wait for indexing
                print(f"     ⌛ Indexing {path_obj.name}...", end="", flush=True)
                while True:
                    status = await self.client.get_document_status(document.document_id)
                    if status.status == "indexed":
                        print(" ✓ Ready")
                        uploaded_docs.append({
                            "name": path_obj.name,
                            "id": str(document.document_id),
                            "status": "indexed"
                        })
                        break
                    elif status.status == "failed":
                        print(f" ❌ Failed: {status.status_message}")
                        uploaded_docs.append({
                            "name": path_obj.name,
                            "id": str(document.document_id),
                            "status": "failed",
                            "error": status.status_message
                        })
                        break
                    
                    # Wait before polling again
                    await asyncio.sleep(1) # Non-blocking sleep
                    
            except Exception as e:
                print(f" ❌ Error uploading {path_obj.name}: {str(e)}")
                
        return uploaded_docs

    async def chat(self, user_message: str) -> str:
        """
        Send message with persistent memory enabled (Non-streaming for stability)
        """
        
        if not self.assistant or not self.user_thread:
            raise RuntimeError("Assistant not initialized. Call initialize() first.")
        
        print(f"\n💬 User: {user_message}")
        print(f"DEBUG: sending to thread_id={self.user_thread.thread_id}")
        print("🤖 Assistant: (Thinking...)", end="", flush=True)
        
        try:
            # Send message with memory enabled
            print(f"\nDEBUG: Calling client.add_message with no streaming...")
            response = await self.client.add_message(
                thread_id=self.user_thread.thread_id,
                content=user_message,
                llm_provider="featherless",
                model_name="12thD/ko-Llama-3-8B-sft-v0.3",
                
                # CORE FEATURE: Persistent Memory
                memory="Auto",
                stream=False
            )
            print(f"\nDEBUG: Raw response type: {type(response)}")
            print(f"DEBUG: Raw response content: {response}")
            
            full_response = response.content
            print(f" {full_response}")
            return full_response

        except Exception as e:
            print(f"\n❌ Error in chat streaming: {e}")
            return "I apologize, but I encountered an error connecting to the AI provider. Please try again."
    
    async def get_memory_summary(self) -> Dict:
        """
        Get summary of what Backboard remembers about the project
        """
        
        if not self.assistant:
            return {"error": "Assistant not initialized"}
        
        return {
            "status": "Backboard memory system active",
            "project": self.context.project_name,
            "assistant_id": self.assistant.assistant_id,
            "thread_id": self.user_thread.thread_id
        }


# ============================================================================
# USAGE EXAMPLE
# ============================================================================

async def create_dummy_documents():
    """Create sample files to simulate uploaded documents"""
    os.makedirs("data", exist_ok=True)
    
    # Document 1: Meeting Transcript
    with open("data/transcript_jan15.txt", "w", encoding="utf-8") as f:
        f.write("""
        MEETING TRANSCRIPT - JAN 15, 2024
        Attendees: Jordan (Sales), Sarah Chen (CTO - Global Bank), Elena (CISO)
        
        Jordan: Thanks for meeting. We wanted to discuss the timeline for the payment gateway replacement.
        Sarah: Yes, we are under pressure. The current legacy system is costing us $50,000 every hour it goes down. We need cost reduction.
        Jordan: Understood. Our solution can cut that by 20% in the first year.
        Elena: My concern is security. We cannot have data leaving the EU. GDPR compliance is non-negotiable.
        Sarah: Elena, I know, but we also need speed. If we don't go live in 3 regions by Q2, we lose market share to the neobanks.
        Elena: I'm just saying, your competitor Stripe has a better documented data residency policy.
        Jordan: We can match that. But our main advantage is the developer API. Your team hates the current XML SOAP legacy stuff.
        Sarah: true, Marcus (VP Eng) keeps complaining about it. He's our biggest champion for this switch.
        """)
        
    # Document 2: Internal Strategy Note
    with open("data/strategy_memo.txt", "w", encoding="utf-8") as f:
        f.write("""
        INTERNAL MEMO: GLOBAL BANK OPPORTUNITY
        Deal Size estimate: $1.5M ARR
        Stage: Negotiation
        
        Competitors: Stripe, Adyen
        
        Key Objections heard so far:
        1. Price is 15% higher than Adyen.
        2. Legal hasn't signed off on liability caps.
        3. Migration timeline of 3 months seems "too fast" to them.
        """)
        
    print("✓ Created dummy documents in 'data/' folder")
    return ["data/transcript_jan15.txt", "data/strategy_memo.txt"]

async def main():
    """
    Example conversation flow with Document Ingestion
    """
    
    # Load API key from .env
    api_key = os.getenv("BACKBOARD_API_KEY")
    if not api_key:
        raise ValueError("BACKBOARD_API_KEY not found in .env file")
    
    # 1. Create simulated documents
    file_paths = await create_dummy_documents()
    
    # 2. Initialize assistant
    assistant = ConsultingAssistant(api_key=api_key)
    
    # 3. Extract Context from Documents (The "Upload" step)
    print("=" * 70)
    print("STEP 1: INGESTING DOCUMENTS")
    print("=" * 70)
    
    context = await assistant.build_context_from_documents(
        user_id="SALES_LEAD_001",
        username="Jordan",
        role="Enterprise Account Executive",
        industry="FinTech / Banking",
        file_paths=file_paths
    )
    
    print("\n✅ EXTRACTED CONTEXT:")
    print(f"Project: {context.project_name}")
    print(f"Stage: {context.sales_stage}")
    print(f"Stakeholders Found: {len(context.key_stakeholders)}")
    for s in context.key_stakeholders:
        print(f" - {s['name']} ({s['role']}): {s.get('buying_role', 'Unknown')}")
    
    # 4. Initialize Assistant with this context
    await assistant.initialize("SALES_LEAD_001", context)
    
    # 5. Upload Documents for RAG (Searchable Memory)
    # This enables the assistant to answer specific questions like "What does the transcript say about pricing?"
    # The 'build_context_from_documents' step extracted metadata, but this step enables deep search.
    uploaded_results = await assistant.upload_project_documents(file_paths)
    
    # 6. Conversation
    print("=" * 70)
    print("STEP 2: SALES & CONSULTING ASSISTANT CHAT")
    print("=" * 70)
    
    # Message 1
    await assistant.chat(
        "Based on the transcript, how should I approach Elena about the security concerns? "
        "She seems to be a blocker."
    )
    
    # Message 2
    await assistant.chat(
        "Good point. And for Sarah, can you draft a quick bullet point email emphasizing "
        "the developer experience angle? That seems to be her hot button."
    )

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    asyncio.run(main())
