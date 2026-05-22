"""獵頭雷達 / 工作配對端點

Rate Limiting:
- All endpoints limited to 30 requests/minute per IP
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, List

from app.models.database import User, get_db
from app.api.users import get_current_user

router = APIRouter()


def get_limiter(request: Request):
    """Get the rate limiter from app state"""
    return request.app.state.limiter


class JobPreference(BaseModel):
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    job_titles: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    industries: Optional[List[str]] = None


class JobMatch(BaseModel):
    id: int
    title: str
    company: str
    location: str
    salary_range: str
    match_score: float
    posted_date: str


@router.post("/preferences")
async def set_preferences(request: Request, preferences: JobPreference, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # TODO: 實現真實的偏好設置存儲
    return {
        "message": "Preferences saved",
        "preferences": preferences
    }


@router.get("/matches")
async def get_job_matches(request: Request, limit: int = 10, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # TODO: 實現真實的工作配對演算法
    # Use current_user.id instead of user_id from URL to prevent IDOR
    return {
        "jobs": [
            {
                "id": 1,
                "title": "Senior Software Engineer",
                "company": "Tech Corp",
                "location": "Hong Kong",
                "salary_range": "HK$45,000 - 65,000",
                "match_score": 0.92,
                "posted_date": "2026-05-15"
            },
            {
                "id": 2,
                "title": "Full Stack Developer",
                "company": "Startup Ltd",
                "location": "Remote",
                "salary_range": "HK$35,000 - 50,000",
                "match_score": 0.85,
                "posted_date": "2026-05-17"
            }
        ]
    }


@router.post("/subscribe")
async def subscribe_to_notifications(request: Request, enabled: bool = True, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # TODO: 實現真實的訂閱設置
    return {
        "message": "Notification settings updated",
        "enabled": enabled
    }
