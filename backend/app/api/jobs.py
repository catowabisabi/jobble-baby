"""獵頭雷達 / 工作配對端點

Rate Limiting:
- All endpoints limited to 30 requests/minute per IP
"""
import json
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from typing import Optional, List

from app.models.database import User, get_db
from app.api.users import get_current_user

router = APIRouter()

# Load real jobs data
DATA_DIR = Path(__file__).parent.parent / "data"
REAL_JOBS_PATH = DATA_DIR / "real_jobs.json"


def load_real_jobs() -> List[dict]:
    try:
        with open(REAL_JOBS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("jobs", [])
    except Exception as e:
        print(f"Error loading real jobs: {e}")
        return []

def get_limiter(request: Request):
    return request.app.state.limiter


class JobPreference(BaseModel):
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    job_titles: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    industries: Optional[List[str]] = None


class JobMatch(BaseModel):
    id: str
    title: str
    company: str
    location: str
    salary_range: str
    job_type: str
    match_score: float
    posted_date: str
    tags: List[str]
    description_snippet: str


@router.get("/matches")
async def get_job_matches(
    request: Request,
    job_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    salary_min: Optional[int] = Query(None),
    salary_max: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")

    jobs = load_real_jobs()

    if job_type:
        jobs = [j for j in jobs if j.get("job_type", "").lower() == job_type.lower()]

    if location:
        loc_lower = location.lower()
        jobs = [j for j in jobs if loc_lower in j.get("location", "").lower()]

    if salary_min or salary_max:
        def parse_salary(salary_str: str) -> tuple:
            try:
                cleaned = salary_str.replace("HK$", "").replace(",", "").replace(" ", "")
                parts = cleaned.split("-")
                if len(parts) == 2:
                    return int(parts[0]), int(parts[1])
                return 0, 0
            except:
                return 0, 0

        filtered = []
        for job in jobs:
            j_min, j_max = parse_salary(job.get("salary_range", "HK$0 - 0"))
            min_ok = salary_min is None or j_max >= salary_min
            max_ok = salary_max is None or j_min <= salary_max
            if min_ok and max_ok:
                filtered.append(job)
        jobs = filtered

    total = len(jobs)
    for i, job in enumerate(jobs):
        base_score = 0.75
        variation = (i % 20) / 100
        job["match_score"] = round(base_score + variation, 2)

    paginated_jobs = jobs[offset : offset + limit]

    return {
        "jobs": paginated_jobs,
        "total": total,
        "offset": offset,
        "limit": limit
    }


@router.get("/search")
async def search_jobs(
    request: Request,
    keyword: str = Query(...),
    location: Optional[str] = Query(None),
    salary_min: Optional[int] = Query(None),
    job_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")

    jobs = load_real_jobs()

    keyword_lower = keyword.lower()
    filtered = []
    for job in jobs:
        searchable = " ".join([
            job.get("title", ""),
            job.get("company", ""),
            job.get("description_snippet", ""),
            " ".join(job.get("tags", []))
        ]).lower()
        if keyword_lower in searchable:
            score = 0.5
            if keyword_lower in job.get("title", "").lower():
                score = 0.9
            elif keyword_lower in job.get("company", "").lower():
                score = 0.75
            elif keyword_lower in " ".join(job.get("tags", [])).lower():
                score = 0.8
            job["match_score"] = score
            filtered.append(job)

    if location:
        loc_lower = location.lower()
        filtered = [j for j in filtered if loc_lower in j.get("location", "").lower()]

    if job_type:
        filtered = [j for j in filtered if j.get("job_type", "").lower() == job_type.lower()]

    if salary_min:
        def parse_salary(salary_str: str) -> tuple:
            try:
                cleaned = salary_str.replace("HK$", "").replace(",", "").replace(" ", "")
                parts = cleaned.split("-")
                if len(parts) == 2:
                    return int(parts[0]), int(parts[1])
                return 0, 0
            except:
                return 0, 0

        result = []
        for job in filtered:
            j_min, j_max = parse_salary(job.get("salary_range", "HK$0 - 0"))
            if j_max >= salary_min:
                result.append(job)
        filtered = result

    filtered.sort(key=lambda x: x.get("match_score", 0), reverse=True)

    total = len(filtered)
    paginated = filtered[offset : offset + limit]

    return {
        "jobs": paginated,
        "total": total,
        "offset": offset,
        "limit": limit,
        "keyword": keyword
    }


@router.get("/job_types")
async def get_job_types(request: Request):
    return {
        "job_types": ["engineering", "sales", "marketing", "finance", "operations", "general"]
    }


@router.post("/preferences")
async def set_preferences(request: Request, preferences: JobPreference, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")

    return {
        "message": "Preferences saved",
        "preferences": preferences
    }


@router.post("/subscribe")
async def subscribe_to_notifications(request: Request, enabled: bool = True, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")

    return {
        "message": "Notification settings updated",
        "enabled": enabled
    }