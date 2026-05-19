import os
import uuid
from pathlib import Path

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "cvs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


def get_file_extension(content_type: str) -> str:
    return ALLOWED_CONTENT_TYPES.get(content_type, "")


def generate_file_path(content_type: str) -> tuple[str, str]:
    ext = get_file_extension(content_type)
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / filename
    return str(file_path), filename