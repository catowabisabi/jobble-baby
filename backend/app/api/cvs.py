"""CV API endpoints"""
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.models.database import get_db, CV
from app.utils.storage import generate_file_path, ALLOWED_CONTENT_TYPES

router = APIRouter()


class CVResponse(BaseModel):
    id: int
    user_id: int
    file_name: str
    file_path: str
    file_size: int
    content_type: str
    analyzed_at: Optional[datetime] = None
    score: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CVUploadResponse(BaseModel):
    file_id: int
    user_id: int
    file_name: str
    file_path: str
    file_size: int
    content_type: str
    message: str


class CVAnalysisRequest(BaseModel):
    job_description: Optional[str] = None


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    file_path, filename = generate_file_path(file.content_type)

    contents = await file.read()
    file_size = len(contents)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    cv = CV(
        user_id=user_id,
        file_name=file.filename or filename,
        file_path=file_path,
        file_size=file_size,
        content_type=file.content_type,
        created_at=datetime.utcnow()
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    return CVUploadResponse(
        file_id=cv.id,
        user_id=cv.user_id,
        file_name=cv.file_name,
        file_path=cv.file_path,
        file_size=cv.file_size,
        content_type=cv.content_type,
        message="CV uploaded successfully"
    )


@router.get("/{cv_id}", response_model=CVResponse)
async def get_cv(cv_id: int, db: Session = Depends(get_db)):
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


@router.post("/analyze/{cv_id}")
async def analyze_cv(cv_id: int, request: CVAnalysisRequest = None):
    return {
        "id": cv_id,
        "score": 7.5,
        "strengths": [
            "工作經驗描述清晰",
            "技能列表完整"
        ],
        "weaknesses": [
            "缺乏量化成果",
            "工作描述不夠具體"
        ],
        "suggestions": [
            "加入具體的數字成果（如提升效率30%）",
            "針對應徵職位客製化CV"
        ]
    }


@router.get("/")
async def list_cvs(user_id: int = 1, db: Session = Depends(get_db)):
    cvs = db.query(CV).filter(CV.user_id == user_id).all()
    return {
        "cvs": [
            {
                "id": cv.id,
                "file_name": cv.file_name,
                "file_path": cv.file_path,
                "analyzed_at": cv.analyzed_at.isoformat() if cv.analyzed_at else None,
                "score": cv.score,
                "created_at": cv.created_at.isoformat()
            }
            for cv in cvs
        ]
    }