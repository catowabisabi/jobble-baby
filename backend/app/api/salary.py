"""薪酬查詢端點

Rate Limiting:
- All endpoints limited to 30 requests/minute per IP
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional

from app.models.database import User, get_db
from app.api.users import get_current_user

router = APIRouter()


def get_limiter(request: Request):
    """Get the rate limiter from app state"""
    return request.app.state.limiter


class SalaryQuery(BaseModel):
    job_title: str
    experience_years: int
    industry: Optional[str] = None
    location: Optional[str] = None


class SalaryResult(BaseModel):
    job_title: str
    low: int
    median: int
    high: int
    currency: str = "HKD"
    sample_size: int


@router.post("/query", response_model=SalaryResult)
async def query_salary(request: Request, query: SalaryQuery, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # TODO: 實現真實的匿名薪酬數據查詢
    # 模擬數據
    base_salary = 25000 + (query.experience_years * 5000)
    return SalaryResult(
        job_title=query.job_title,
        low=int(base_salary * 0.7),
        median=int(base_salary),
        high=int(base_salary * 1.5),
        currency="HKD",
        sample_size=156
    )


@router.get("/market-range/{job_title}")
async def get_market_range(request: Request, job_title: str, experience_years: int = 5, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # TODO: 實現真實的市場薪酬範圍查詢
    base = 30000 + (experience_years * 4000)
    return {
        "job_title": job_title,
        "percentile_25": int(base * 0.8),
        "percentile_50": int(base),
        "percentile_75": int(base * 1.3),
        "percentile_90": int(base * 1.6),
        "currency": "HKD"
    }
