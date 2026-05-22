"""
CV 相關端點

Rate Limiting:
- All endpoints limited to 30 requests/minute per IP
"""
import json

import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from app.models.database import get_db, CV, User
from app.api.users import get_current_user
from app.utils.storage import generate_file_path, ALLOWED_CONTENT_TYPES
from app.services.cv_extractor import PDFTextExtractor, ExtractionError
from app.services.cv_analyzer import CVAnalyzer, AnalysisError

router = APIRouter()


def get_limiter(request: Request):
    """Get the rate limiter from app state"""
    return request.app.state.limiter


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
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    contents = await file.read()
    file_size = len(contents)

    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    file_path, filename = generate_file_path(file.content_type)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    cv = CV(
        user_id=current_user.id,
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
async def get_cv(request: Request, cv_id: int, db: Session = Depends(get_db)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


class CVScoreResponse(BaseModel):
    cv_id: int
    score: int
    breakdown: dict
    role_relevance: int
    experience_years: int
    education_quality: int
    skills_clarity: int
    quantified_achievements: int
    overall_professionalism: int
    text_suggestions: List[str]


@router.post("/score", response_model=CVScoreResponse)
async def score_cv(request: Request, cv_id: int, db: Session = Depends(get_db)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    try:
        cv_text = PDFTextExtractor.extract_text(cv, db)
    except FileNotFoundError:
        raise HTTPException(status_code=422, detail="PDF file not found on disk")
    except ValueError:
        raise HTTPException(status_code=422, detail="Unsupported file format - must be PDF")
    except ExtractionError as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract text from PDF: {e}")

    try:
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv(cv_text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API key not configured: {e}")
    except AnalysisError as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {e}")
    except TimeoutError:
        raise HTTPException(status_code=504, detail="AI analysis timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during analysis: {e}")

    cv.score = result.overall_professionalism
    cv.analyzed_at = datetime.utcnow()
    cv.score_breakdown = result.to_dict()
    cv.text_suggestions = result.text_suggestions
    db.commit()

    return CVScoreResponse(
        cv_id=cv_id,
        score=result.overall_professionalism,
        breakdown=result.to_dict(),
        role_relevance=result.role_relevance,
        experience_years=result.experience_years,
        education_quality=result.education_quality,
        skills_clarity=result.skills_clarity,
        quantified_achievements=result.quantified_achievements,
        overall_professionalism=result.overall_professionalism,
        text_suggestions=result.text_suggestions
    )


@router.post("/analyze/{cv_id}")
async def analyze_cv(request: Request, cv_id: int, req: CVAnalysisRequest = None):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
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
async def list_cvs(request: Request, user_id: int = 1, db: Session = Depends(get_db)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
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
