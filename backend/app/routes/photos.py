
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException

BASE_DIR = Path("/app")
PHOTO_DIR = BASE_DIR / "data" / "photos"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(tags=["photos"])

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Разрешены только JPG, PNG и WebP."
        )

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Файл слишком большой. Максимум 10 MB."
        )

    filename = (
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_"
        f"{uuid4().hex[:8]}"
        f"{ALLOWED_TYPES[file.content_type]}"
    )

    path = PHOTO_DIR / filename
    path.write_bytes(content)

    return {
        "success": True,
        "filename": filename,
        "url": f"/photos/{filename}",
    }


@router.get("/photos")
def list_photos():
    photos = []

    for path in sorted(PHOTO_DIR.iterdir(), reverse=True):
        if path.is_file() and path.suffix.lower() in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        }:
            photos.append({
                "filename": path.name,
                "url": f"/photos/{path.name}",
            })

    return {"photos": photos}


@router.delete("/photos/{filename}")
def delete_photo(filename: str):
    # Защита от попыток удалить файл вне папки фотографий
    if Path(filename).name != filename:
        raise HTTPException(
            status_code=400,
            detail="Некорректное имя файла."
        )

    path = PHOTO_DIR / filename

    if not path.exists() or not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Фотография не найдена."
        )

    if path.suffix.lower() not in {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    }:
        raise HTTPException(
            status_code=400,
            detail="Недопустимый тип файла."
        )

    path.unlink()

    return {
        "success": True,
        "message": "Фотография удалена.",
        "filename": filename,
    }