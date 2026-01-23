# Beacon CRM Assistant

Beacon is an AI-powered consulting assistant with a FastAPI backend, a Next.js frontend, and a required Chrome extension for live transcript capture.


[![Watch the video](https://img.youtube.com/vi/HUyS6nTOO0E/maxresdefault.jpg)](https://youtu.be/HUyS6nTOO0E)

### [Watch this video on YouTube](https://youtu.be/HUyS6nTOO0E)

## Project Structure

```
Beacon/
├── backend/
│   └── app/
│       ├── api/         # API endpoints (FastAPI routers)
│       ├── core/        # Configuration and logging
│       ├── models/      # Data models (Pydantic)
│       ├── services/    # Business logic (Backboard integration)
│       └── main.py      # FastAPI app entry
├── chrome-extension/    # Optional Meet transcript capture extension
├── data/                # Persisted data and uploads
├── frontend/            # Next.js UI
├── run.py               # Script to start the backend server
└── requirements.txt
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- Backboard API key

## Quick Start (Backend + Frontend)

### 1) Backend Setup (FastAPI)

From the repository root:

1. **Create and activate a virtual environment**
    - Windows (PowerShell):
      ```bash
      python -m venv .venv
      .\.venv\Scripts\Activate.ps1
      ```
    - macOS/Linux:
      ```bash
      python3 -m venv .venv
      source .venv/bin/activate
      ```

2. **Install Python dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3. **Create a .env file** in the project root:
    ```
    BACKBOARD_API_KEY=your_key_here
    # Optional quick-mode overrides
    QUICK_LLM_PROVIDER=your_provider
    QUICK_MODEL_NAME=your_model
    ```

4. **Run the backend**
    ```bash
    python run.py
    ```

Backend will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### 2) Frontend Setup (Next.js)

Open a new terminal, then:

1. **Install Node dependencies**
    ```bash
    cd frontend
    npm install
    ```

2. **Start the dev server**
    ```bash
    npm run dev
    ```

Frontend will be available at http://localhost:3000

> Note: The frontend is currently configured to call the backend at http://localhost:8000, so keep the backend running while using the UI.

## Chrome Extension (Required)

1. Open Chrome and go to chrome://extensions
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the folder: `Beacon/chrome-extension`
5. Start a Google Meet and follow the in-page consent prompt

## Common Tasks

- Upload documents: use the Dashboard UI in the frontend
- Live transcript: open a project at `/live/[projectId]`
- Reset a project: use the “Reset” button in the Document Manager

## Features

- **Modular Architecture:** Separation of concerns between API, logic, and data models.
- **Robust Error Handling:** Structured logging and error responses.
- **Persistence:** JSON-based session storage and file uploads in data/
- **Context-Aware AI:** Pulls business context from documents to drive responses.
