"""
Pydantic 模型 - 用於 API 請求和響應
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    """用戶創建請求"""
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    """用戶登入請求"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """用戶響應"""
    id: int
    email: str
    name: Optional[str]
    subscription_tier: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT Token 響應"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SubscriptionStatus(BaseModel):
    """訂閱狀態"""
    status: str  # free, trial, premium
    trial_ends_at: Optional[str] = None
    subscription_ends_at: Optional[str] = None


class SubscriptionUpgrade(BaseModel):
    """訂閱升級請求"""
    tier: str  # Only "premium" allowed for MVP


class SubscriptionPlan(BaseModel):
    """訂閱計劃響應"""
    tier: str
    status: str
    trial_ends_at: Optional[str] = None
    subscription_ends_at: Optional[str] = None

    class Config:
        from_attributes = True


class AlertPreferencesUpdate(BaseModel):
    """職位提醒偏好更新請求"""
    job_types: Optional[list[str]] = None
    salary_min: Optional[int] = None
    locations: Optional[list[str]] = None
    keywords: Optional[list[str]] = None
    notifications_enabled: Optional[bool] = None


class AlertPreferencesResponse(BaseModel):
    """職位提醒偏好響應"""
    job_types: list[str] = []
    salary_min: Optional[int] = None
    locations: list[str] = []
    keywords: list[str] = []
    notifications_enabled: bool = True

    class Config:
        from_attributes = True


class ScoreHistoryEntry(BaseModel):
    id: int
    score: int
    category_scores: Optional[dict] = None
    recorded_at: datetime

    class Config:
        from_attributes = True


class ScoreHistoryResponse(BaseModel):
    history: List[ScoreHistoryEntry]
    total_count: int
    best_score: Optional[int] = None
    improvement_trend: Optional[str] = None


class RecordScoreRequest(BaseModel):
    cv_id: int
    score: int
    category_scores: dict


class AchievementResponse(BaseModel):
    id: int
    achievement_type: str
    tier: str
    description: str
    earned_at: datetime
    metadata: Optional[dict] = None

    class Config:
        from_attributes = True


class AchievementsListResponse(BaseModel):
    achievements: List[AchievementResponse]
    total_count: int
    recent_achievements: List[AchievementResponse]


class MilestoneResponse(BaseModel):
    achievement_type: str
    title: str
    description: str
    tier: str
    progress_current: int
    progress_target: int
    hint: str
    is_earned: bool


class MilestonesListResponse(BaseModel):
    next_milestone: Optional[MilestoneResponse] = None
    all_milestones: List[MilestoneResponse]
    earned_count: int
    total_count: int