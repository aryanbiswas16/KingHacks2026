# Beacon Consulting Assistant

This project is a sophisticated AI-powered consulting assistant built with Python (FastAPI) and Backboard.io.

## Project Structure

The project has been refactored into a professional, modular architecture:

```
Beacon/
├── backend/
│   └── app/
│       ├── api/         # API endpoints (FastAPI routers)
│       ├── core/        # Configuration and logging
│       ├── models/      # Data models (Pydantic)
│       ├── services/    # Business logic (Backboard integration)
│       └── main.py      # Entry point
├── KingHacks/
│   └── frontend/    # Next.js Frontend
├── data/            # Persisted data and uploads
├── run.py           # Script to start the backend server
└── requirements.txt
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js (for frontend)
- Backboard API Key (in `.env`)

### Setup Backend

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Environment Variables:**
    Ensure you have a `.env` file in the root with:
    ```
    BACKBOARD_API_KEY=your_key_here
    ```

3.  **Run the Server:**
    ```bash
    python run.py
    ```
    The API will be available at `http://localhost:8000`.
    API Documentation: `http://localhost:8000/docs`.

### Setup Frontend

1.  Navigate to frontend:
    ```bash
    cd KingHacks/frontend
    ```
2.  Install & Run:
    ```bash
    npm install
    npm run dev
    ```

## Features

-   **Modular Architecture:** Separation of concerns between API, logic, and data models.
-   **Robust Error Handling:** Detailed logging and error responses.
-   **Persistence:** JSON-based persistence for project sessions (extensible to DB).
-   **Context-Aware AI:** Extracts business context from documents to drive strategic advice.
