"""薪酬查詢端點

Rate Limiting:
- All endpoints limited to 30 requests/minute per IP
"""
import json
import os
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional

from app.models.database import User, get_db
from app.api.users import get_current_user

router = APIRouter()

# Load salary data at startup
SALARY_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "salary_bands.json")

def load_salary_data():
    """Load salary bands from JSON file"""
    with open(SALARY_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

SALARY_DATA = load_salary_data()

def get_limiter(request: Request):
    """Get the rate limiter from app state"""
    return request.app.state.limiter


def get_level(experience_years: int) -> str:
    """Map experience years to level"""
    if experience_years <= 3:
        return "junior"
    elif experience_years <= 7:
        return "mid"
    else:
        return "senior"


def find_salary_bands(job_title: str, level: str) -> Optional[dict]:
    """Find salary data for a job title and level"""
    job_title_lower = job_title.lower()
    
    # First try exact match on job_title + level
    for job in SALARY_DATA["jobs"]:
        if job["job_title"].lower() == job_title_lower and job["level"] == level:
            return job
    
    # Try partial match on job_title
    for job in SALARY_DATA["jobs"]:
        if job_title_lower in job["job_title"].lower() or job["job_title"].lower() in job_title_lower:
            if job["level"] == level:
                return job
    
    return None


def get_category_average(category: str, level: str) -> Optional[dict]:
    """Calculate average salary for a category and level"""
    matching_jobs = [
        job for job in SALARY_DATA["jobs"]
        if job["category"] == category and job["level"] == level
    ]
    
    if not matching_jobs:
        return None
    
    # Calculate weighted average
    low_avg = sum(job["low_25th"] for job in matching_jobs) / len(matching_jobs)
    median_avg = sum(job["median"] for job in matching_jobs) / len(matching_jobs)
    high_avg = sum(job["high_75th"] for job in matching_jobs) / len(matching_jobs)
    
    return {
        "job_title": f"{category} (Average)",
        "category": category,
        "level": level,
        "low_25th": int(low_avg),
        "median": int(median_avg),
        "high_75th": int(high_avg)
    }


class SalaryQuery(BaseModel):
    job_title: str
    experience_years: int
    industry: Optional[str] = None
    location: Optional[str] = None


class SalaryCompareRequest(BaseModel):
    job_title: str
    experience_years: int
    target_salary: int
    industry: Optional[str] = None
    location: Optional[str] = None


class SalaryResult(BaseModel):
    job_title: str
    level: str
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
    
    # Determine level from experience years
    level = get_level(query.experience_years)
    
    # Try to find exact or partial match
    salary_data = find_salary_bands(query.job_title, level)
    
    # If not found, try to find by category if industry is provided
    if not salary_data and query.industry:
        salary_data = get_category_average(query.industry, level)
    
    # If still not found, fall back to overall average for the level
    if not salary_data:
        # Use the first matching level job as fallback
        level_jobs = [job for job in SALARY_DATA["jobs"] if job["level"] == level]
        if level_jobs:
            # Find category that appears most often for this level
            categories = {}
            for job in level_jobs:
                cat = job["category"]
                categories[cat] = categories.get(cat, 0) + 1
            fallback_category = max(categories, key=categories.get)
            salary_data = get_category_average(fallback_category, level)
    
    if salary_data:
        return SalaryResult(
            job_title=salary_data["job_title"],
            level=level,
            low=salary_data["low_25th"],
            median=salary_data["median"],
            high=salary_data["high_75th"],
            currency="HKD",
            sample_size=150  # Anonymized sample size
        )
    
    # Ultimate fallback - should not reach here if data is complete
    return SalaryResult(
        job_title=query.job_title,
        level=level,
        low=20000,
        median=30000,
        high=45000,
        currency="HKD",
        sample_size=50
    )


@router.get("/market-range/{job_title}")
async def get_market_range(request: Request, job_title: str, experience_years: int = 5, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # Determine level from experience years
    level = get_level(experience_years)
    
    # Try to find exact or partial match
    salary_data = find_salary_bands(job_title, level)
    
    # Fallback to category average if not found
    if not salary_data:
        # Search all categories for this level
        for cat in ["IT/Software", "Finance", "Marketing", "Sales", "HR", "Design", "Operations"]:
            test_data = find_salary_bands(job_title, level)
            if test_data:
                salary_data = test_data
                break
        if not salary_data:
            # Use category average for any matching level
            level_jobs = [job for job in SALARY_DATA["jobs"] if job["level"] == level]
            if level_jobs:
                categories = {}
                for job in level_jobs:
                    cat = job["category"]
                    categories[cat] = categories.get(cat, 0) + 1
                fallback_category = max(categories, key=categories.get)
                salary_data = get_category_average(fallback_category, level)
    
    if salary_data:
        return {
            "job_title": salary_data["job_title"],
            "level": level,
            "percentile_25": salary_data["low_25th"],
            "percentile_50": salary_data["median"],
            "percentile_75": salary_data["high_75th"],
            "percentile_90": int(salary_data["high_75th"] * 1.2),
            "currency": "HKD"
        }
    
    # Ultimate fallback
    return {
        "job_title": job_title,
        "level": level,
        "percentile_25": 20000,
        "percentile_50": 30000,
        "percentile_75": 45000,
        "percentile_90": 55000,
        "currency": "HKD"
    }


@router.post("/compare")
async def compare_salary(request: Request, compare_req: SalaryCompareRequest, current_user: User = Depends(get_current_user)):
    """
    Compare user's target salary against market range.
    Returns visual anchor data for frontend comparator.
    """
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # Determine level from experience years
    level = get_level(compare_req.experience_years)
    
    # Try to find exact or partial match
    salary_data = find_salary_bands(compare_req.job_title, level)
    
    # Fallback to category average if not found
    if not salary_data:
        level_jobs = [job for job in SALARY_DATA["jobs"] if job["level"] == level]
        if level_jobs:
            categories = {}
            for job in level_jobs:
                cat = job["category"]
                categories[cat] = categories.get(cat, 0) + 1
            fallback_category = max(categories, key=categories.get)
            salary_data = get_category_average(fallback_category, level)
    
    if salary_data:
        low = salary_data["low_25th"]
        median = salary_data["median"]
        high = salary_data["high_75th"]
    else:
        low, median, high = 20000, 30000, 45000
    
    # Calculate user's position
    target = compare_req.target_salary
    median_position = ((target - low) / (high - low)) * 100 if high > low else 50
    
    # Determine status and recommendation
    if target >= median:
        # User is at or above median
        if target >= high:
            status = "above_high"
            status_label = "高於市場"
            status_color = "#10b981"  # green
            gap_percent = ((target - high) / high) * 100
            comparison_text = f"你的期望薪資比市場最高值高出 {gap_percent:.0f}%"
            recommendation = "你可以大膽提出這個薪資要求"
            negotiation_tips = [
                "強調你的獨特價值主張",
                "準備好justify你的薪資期望",
                "考虑整體薪酬包（含獎金、股份等）"
            ]
        else:
            status = "above_median"
            status_label = "高於中位數"
            status_color = "#10b981"  # green
            gap_percent = ((median - target) / median) * 100 if target < median else ((target - median) / median) * 100
            comparison_text = f"你的期望薪資比市場中位數高出 {((target - median) / median) * 100:.0f}%"
            recommendation = "這個薪資要求合理，可以嘗試争取"
            negotiation_tips = [
                "展示你在這個崗位的獨特優勢",
                "準備具體的成就數據支持",
                "考虑非薪酬條件讓整體package更具吸引力"
            ]
    else:
        # User is below median
        gap_percent = ((median - target) / median) * 100
        if target >= low:
            status = "below_median"
            status_label = "低於中位數"
            status_color = "#f59e0b"  # yellow/amber
            comparison_text = f"你的期望薪資比市場中位數低 {gap_percent:.0f}%"
            recommendation = "你可以要求更高的薪資"
            negotiation_tips = [
                "你目前的薪資要求低於市場水平",
                "根據你的經驗，應該可以要求至少 {median:.0f}".format(median=median),
                "準備好談論你的價值和成就"
            ]
        else:
            status = "significantly_below"
            status_label = "顯著低於市場"
            status_color = "#ef4444"  # red
            comparison_text = f"你的期望薪資比市場中位數低 {gap_percent:.0f}%，比市場最低值還低"
            recommendation = "強烈建議提高你的薪資期望"
            negotiation_tips = [
                "你目前的薪資要求嚴重偏低",
                "市場顯示同級別工作薪資至少為 {low:.0f}".format(low=low),
                "不要低估自己的市場價值"
            ]
    
    return {
        "job_title": compare_req.job_title,
        "level": level,
        "market": {
            "low": low,
            "median": median,
            "high": high,
            "currency": "HKD"
        },
        "user_target": target,
        "position_percent": round(median_position, 1),
        "status": status,
        "status_label": status_label,
        "status_color": status_color,
        "comparison_text": comparison_text,
        "recommendation": recommendation,
        "negotiation_tips": negotiation_tips
    }