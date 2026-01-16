from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .core.config import settings
from .api import routes

# Load environment variables
load_dotenv()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"/openapi.json"
)

# CORS Configuration
# Adjust allow_origins in production
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(routes.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    print(f"Starting {settings.PROJECT_NAME}...")

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
