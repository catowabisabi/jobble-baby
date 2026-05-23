"""Streak API endpoints

Endpoints for managing interview practice streaks, achievements, and leaderboard.
"""
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import User, PracticeSession, StreakAchievement, get_db
from app.api.users import get_current_user

router = APIRouter()


# === Pydantic Schemas ===

class StreakStatusResponse(BaseModel):
    current: int
    longest: int
    freeze_tokens: int
    last_practice: Optional[str] = None


class PracticeCompleteRequest(BaseModel):
    score: int
    duration_seconds: int
    practice_type: str = "interview"


class PracticeCompleteResponse(BaseModel):
    current_streak: int
    longest_streak: int
    streak_increased: bool
    new_badge: Optional[str] = None
    badge_tier: Optional[str] = None


class FreezeResponse(BaseModel):
    success: bool
    freeze_tokens_remaining: int
    message: str


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    streak: int


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]


# === Badge Constants ===

BADGE_THRESHOLDS = {
    "bronze_3day": {"days": 3, "tier": "bronze"},
    "silver_7day": {"days": 7, "tier": "silver"},
    "gold_30day": {"days": 30, "tier": "gold"},
}


def check_and_award_badges(db: Session, user: User) -> Optional[dict]:
    """Check if user earned a new badge and award if so."""
    current_streak = user.streak_current
    
    for badge_type, config in BADGE_THRESHOLDS.items():
        if current_streak >= config["days"]:
            # Check if user already has this badge
            existing = db.query(StreakAchievement).filter(
                StreakAchievement.user_id == user.id,
                StreakAchievement.badge_type == badge_type
            ).first()
            
            if not existing:
                new_badge = StreakAchievement(
                    user_id=user.id,
                    badge_type=badge_type
                )
                db.add(new_badge)
                db.commit()
                return {"badge_type": badge_type, "tier": config["tier"]}
    
    return None


def update_streak(db: Session, user: User) -> tuple[int, bool]:
    """
    Update user's streak after practice completion.
    Returns (new_streak, streak_increased).
    """
    today = date.today()
    now = datetime.utcnow()
    
    # First practice ever
    if user.last_practice_date is None:
        user.streak_current = 1
        user.streak_longest = max(1, user.streak_longest)
        user.last_practice_date = now
        user.streak_updated_at = now
        db.commit()
        return 1, True
    
    last_date = user.last_practice_date.date() if isinstance(user.last_practice_date, datetime) else user.last_practice_date
    days_diff = (today - last_date).days
    
    if days_diff == 0:
        # Already practiced today, streak unchanged
        return user.streak_current, False
    elif days_diff == 1:
        # Consecutive day - increase streak
        user.streak_current += 1
        user.streak_longest = max(user.streak_current, user.streak_longest)
        user.last_practice_date = now
        user.streak_updated_at = now
        db.commit()
        return user.streak_current, True
    else:
        # Gap in streak - check freeze tokens
        if user.streak_freeze_tokens > 0:
            # Use freeze token
            user.streak_freeze_tokens -= 1
            user.streak_current += 1
            user.streak_longest = max(user.streak_current, user.streak_longest)
            user.last_practice_date = now
            user.streak_updated_at = now
            db.commit()
            return user.streak_current, True
        else:
            # Reset streak
            user.streak_current = 1
            user.last_practice_date = now
            user.streak_updated_at = now
            db.commit()
            return 1, True


# === Endpoints ===

@router.get("/status", response_model=StreakStatusResponse)
async def get_streak_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's streak status."""
    last_practice = None
    if current_user.last_practice_date:
        last_practice = current_user.last_practice_date.isoformat()
    
    return StreakStatusResponse(
        current=current_user.streak_current,
        longest=current_user.streak_longest,
        freeze_tokens=current_user.streak_freeze_tokens,
        last_practice=last_practice
    )


@router.post("/practice-complete", response_model=PracticeCompleteResponse)
async def practice_complete(
    request: PracticeCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record practice completion and update streak."""
    # Create practice session record
    session = PracticeSession(
        user_id=current_user.id,
        score=request.score,
        duration_seconds=request.duration_seconds,
        practice_type=request.practice_type
    )
    db.add(session)
    
    # Update streak
    new_streak, streak_increased = update_streak(db, current_user)
    
    # Check for new badges
    new_badge = check_and_award_badges(db, current_user)
    
    return PracticeCompleteResponse(
        current_streak=new_streak,
        longest_streak=current_user.streak_longest,
        streak_increased=streak_increased,
        new_badge=new_badge["badge_type"] if new_badge else None,
        badge_tier=new_badge["tier"] if new_badge else None
    )


@router.post("/freeze", response_model=FreezeResponse)
async def use_freeze_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Use a freeze token to protect the streak."""
    if current_user.streak_freeze_tokens <= 0:
        return FreezeResponse(
            success=False,
            freeze_tokens_remaining=0,
            message="No freeze tokens remaining"
        )
    
    current_user.streak_freeze_tokens -= 1
    db.commit()
    
    return FreezeResponse(
        success=True,
        freeze_tokens_remaining=current_user.streak_freeze_tokens,
        message=f"Freeze token used. {current_user.streak_freeze_tokens} remaining."
    )


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get top 10 streaks with anonymous names."""
    top_users = db.query(User).filter(
        User.streak_current > 0
    ).order_by(
        User.streak_current.desc()
    ).limit(10).all()
    
    entries = []
    for idx, user in enumerate(top_users, 1):
        entries.append(LeaderboardEntry(
            rank=idx,
            display_name=f"Job Seeker #{idx}",
            streak=user.streak_current
        ))
    
    return LeaderboardResponse(entries=entries)