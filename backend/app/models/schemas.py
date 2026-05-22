"""
Pydantic 模型 - 用於 API 請求和響應
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
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