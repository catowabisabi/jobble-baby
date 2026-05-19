"""獵頭雷達 / 工作配對端點"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


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
async def set_preferences(user_id: int, preferences: JobPreference):
    # TODO: 實現真實的偏好設置存儲
    return {
        "message": "Preferences saved",
        "preferences": preferences
    }


@router.get("/matches")
async def get_job_matches(user_id: int = 1, limit: int = 10):
    # TODO: 實現真實的工作配對演算法
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
async def subscribe_to_notifications(user_id: int, enabled: bool = True):
    # TODO: 實現真實的訂閱設置
    return {
        "message": "Notification settings updated",
        "enabled": enabled
    }
