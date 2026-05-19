"""用戶相關端點"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    subscription_status: str


class SubscriptionStatus(BaseModel):
    status: str  # free, trial, premium
    trial_ends_at: Optional[str] = None
    subscription_ends_at: Optional[str] = None


# 模擬用戶數據
users_db = {}


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    # TODO: 實現真實的用戶註冊邏輯
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = UserResponse(
        id=len(users_db) + 1,
        email=user.email,
        name=user.name,
        subscription_status="trial"
    )
    users_db[user.email] = new_user
    return new_user


@router.post("/login")
async def login(email: str, password: str):
    # TODO: 實現真實的登入邏輯
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return {"access_token": "mock_token", "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: int = 1):
    # TODO: 實現真實的獲取當前用戶邏輯
    return UserResponse(
        id=user_id,
        email="user@example.com",
        name="Test User",
        subscription_status="trial"
    )


@router.get("/subscription", response_model=SubscriptionStatus)
async def get_subscription(user_id: int = 1):
    # TODO: 實現真實的訂閱狀態查詢
    return SubscriptionStatus(
        status="trial",
        trial_ends_at="2026-06-01"
    )
