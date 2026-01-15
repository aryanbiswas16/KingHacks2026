# Install: pip install backboard-sdk
import asyncio
import os
from dotenv import load_dotenv
from backboard import BackboardClient

load_dotenv()

async def main():
    # Initialize the Backboard client
    api_key = os.getenv("BACKBOARD_API_KEY")
    if not api_key:
        print("Error: BACKBOARD_API_KEY not found in environment")
        return

    client = BackboardClient(api_key=api_key)

    try:
        # Create an assistant
        print("Initializing Chat Assistant...")
        assistant = await client.create_assistant(
            name="Terminal Chat",
            description="A simple interactive chat assistant"
        )
        
        # Create a thread
        thread = await client.create_thread(assistant.assistant_id)
        
        print(f"\n✅ Chat session started! (Type 'quit' to exit)")
        print("-" * 50)

        while True:
            # Get user input
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit']:
                print("Goodbye!")
                break
                
            if not user_input:
                continue

            # Send message
            print("Assistant is typing...", end="\r")
            
            response = await client.add_message(
                thread_id=thread.thread_id,
                content=user_input,
                llm_provider="featherless", # Correct provider from the list
                model_name="12thD/ko-Llama-3-8B-sft-v0.3", # Valid model for this provider
                stream=False
            )

            # Clear status line and print response
            print(" " * 30, end="\r")
            print(f"Assistant: {response.content}")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
