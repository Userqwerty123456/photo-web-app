from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .routes.photos import router as photos_router
from .routes.robot import router as robot_router

BASE_DIR = Path("/app")
PHOTO_DIR = BASE_DIR / "data" / "photos"
FRONTEND_DIR = BASE_DIR / "frontend"

PHOTO_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Photo Web App", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(photos_router, prefix="/api")
app.include_router(robot_router, prefix="/api/robot")

app.mount("/photos", StaticFiles(directory=str(PHOTO_DIR)), name="photos")
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")
