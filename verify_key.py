import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()
KEY = os.getenv("BACKBOARD_API_KEY")

if not KEY:
    print("Error: BACKBOARD_API_KEY not found in environment.")
    exit(1)

print(f"Key loaded: {KEY[:5]}...{KEY[-5:]}")

async def verify():
    headers = {"X-API-Key": KEY}
    url = "https://app.backboard.io/api/assistants" # Trying list or create?
    # Let's try to create a dummy assistant to verify auth, or just check 'GET' on a known endpoint.
    # The code calls POST /assistants
    
    # Actually, let's try to POST a thread, it's cheaper/simpler maybe?
    # Url: BASE_URL/threads
    
    url = "https://app.backboard.io/api/threads"
    async with httpx.AsyncClient() as client:
        try:
            # We need to send an assistant_id to create a thread?
            # assistant.py: create_thread(self, assistant_id: str)
            # POST /assistants/{id}/threads
            
            # Okay, let's try to create an assistant.
            print("Attempting to create a test assistant...")
            body = {
                "name": "Test Assistant",
                "description": "Validation of API Key",
                "instructions": "You are a test assistant." # system_prompt
            }
            resp = await client.post("https://app.backboard.io/api/assistants", json=body, headers=headers)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
            
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
