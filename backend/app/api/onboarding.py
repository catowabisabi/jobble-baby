"""
Onboarding completion endpoint - tracks 4-step wizard completion
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
import json
import os
from datetime import datetime

from app.models.database import User, JobAlert, get_db
from app.api.users import get_current_user

router = APIRouter()

ONBOARDING_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "onboarding")
os.makedirs(ONBOARDING_DIR, exist_ok=True)


class OnboardingCompleteRequest(BaseModel):
    step: int  # 1, 2, 3, or 4
    preferences: Optional[dict] = None


class OnboardingCompleteResponse(BaseModel):
    completed: bool
    step: int
    preferences_saved: bool = False

    class Config:
        from_attributes = True


def get_onboarding_file_path(user_id: int) -> str:
    return os.path.join(ONBOARDING_DIR, f"user_{user_id}_onboarding.json")


def get_onboarding_data(user_id: int) -> dict:
    filepath = get_onboarding_file_path(user_id)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return {"completed_steps": [], "started_at": datetime.utcnow().isoformat()}


def save_onboarding_data(user_id: int, data: dict) -> None:
    filepath = get_onboarding_file_path(user_id)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def get_limiter(request: Request):
    """Get the rate limiter from app state"""
    return request.app.state.limiter


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding_step(
    request: Request,
    req: OnboardingCompleteRequest,
    current_user: User = Depends(get_current_user)
):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")

    # Load existing data
    data = get_onboarding_data(current_user.id)

    # Add step if not already recorded
    if req.step not in data["completed_steps"]:
        data["completed_steps"].append(req.step)

    # If step 2 with preferences, save to JobAlert
    preferences_saved = False
    if req.step == 2 and req.preferences:
        db = next(get_db())
        try:
            alert = db.query(JobAlert).filter(JobAlert.user_id == current_user.id).first()
            if alert:
                if "job_types" in req.preferences:
                    alert.job_types = req.preferences["job_types"]
                if "locations" in req.preferences:
                    alert.locations = req.preferences["locations"]
                if "salary_min" in req.preferences:
                    alert.salary_min = req.preferences["salary_min"]
            else:
                alert = JobAlert(
                    user_id=current_user.id,
                    job_types=req.preferences.get("job_types"),
                    locations=req.preferences.get("locations"),
                    salary_min=req.preferences.get("salary_min"),
                    notifications_enabled=True
                )
                db.add(alert)
            db.commit()
            preferences_saved = True
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()

    # If step 4 with notifications preference
    if req.step == 4 and req.preferences and "notifications_enabled" in req.preferences:
        db = next(get_db())
        try:
            alert = db.query(JobAlert).filter(JobAlert.user_id == current_user.id).first()
            if alert:
                alert.notifications_enabled = req.preferences["notifications_enabled"]
                db.commit()
                preferences_saved = True
        except Exception:
            db.rollback()
        finally:
            db.close()

    # Mark all 4 steps complete if step 4
    if req.step == 4:
        data["completed_at"] = datetime.utcnow().isoformat()

    # Save updated data
    save_onboarding_data(current_user.id, data)

    return OnboardingCompleteResponse(
        completed=req.step == 4,
        step=req.step,
        preferences_saved=preferences_saved
    )