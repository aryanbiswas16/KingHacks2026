import uvicorn
import os

if __name__ == "__main__":
    # Ensure we run from the root of the workspace
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    uvicorn.run(
        "backend.app.main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True
    )
