from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import User, JobAlert, get_db
from app.api.users import get_current_user

router = APIRouter()


class JobPreferences(BaseModel):
    job_types: List[str]
    location: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None


class OnboardingCompleteRequest(BaseModel):
    job_preferences: JobPreferences
    notifications_enabled: bool = True
    cv_id: Optional[int] = None


class OnboardingCompleteResponse(BaseModel):
    success: bool
    onboarding_completed_at: str


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    request: Request,
    req: OnboardingCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.onboarding_complete = True
    current_user.onboarding_completed_at = datetime.utcnow()
    
    job_alert = db.query(JobAlert).filter(JobAlert.user_id == current_user.id).first()
    
    if job_alert:
        job_alert.job_types = req.job_preferences.job_types
        job_alert.locations = [req.job_preferences.location] if req.job_preferences.location else []
        job_alert.salary_min = req.job_preferences.salary_min
        job_alert.notifications_enabled = req.notifications_enabled
    else:
        job_alert = JobAlert(
            user_id=current_user.id,
            job_types=req.job_preferences.job_types,
            locations=[req.job_preferences.location] if req.job_preferences.location else [],
            salary_min=req.job_preferences.salary_min,
            notifications_enabled=req.notifications_enabled
        )
        db.add(job_alert)
    
    db.commit()
    
    return OnboardingCompleteResponse(
        success=True,
        onboarding_completed_at=current_user.onboarding_completed_at.isoformat()
    )