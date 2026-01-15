import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

def list_models():
    api_key = os.getenv("BACKBOARD_API_KEY")
    if not api_key:
        print("Error: BACKBOARD_API_KEY not found in environment")
        return

    base_url = "https://app.backboard.io/api"
    headers = {"X-API-Key": api_key}

    print("Fetching available models...")
    try:
        response = requests.get(f"{base_url}/models", headers=headers)
        if response.status_code == 200:
            data = response.json()
            models = data.get("models", [])
            print(f"\nFound {len(models)} available models:\n")
            
            # Group by provider
            by_provider = {}
            for m in models:
                p = m.get("provider", "unknown")
                if p not in by_provider:
                    by_provider[p] = []
                by_provider[p].append(m["name"])
            
            for provider, model_names in by_provider.items():
                print(f"Provider: {provider}")
                for name in model_names:
                    print(f"  - {name}")
                print("")
        else:
            print(f"Failed to list models. Status: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    list_models()