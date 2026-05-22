"""通知端點

Phase 1: Store notifications in DB (Expo Push in Phase 2)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

from app.models.database import get_db, Notification

router = APIRouter()


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    body: str


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    body: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/send", response_model=NotificationResponse)
async def send_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db)
):
    """創建通知記錄"""
    db_notification = Notification(
        user_id=notification.user_id,
        title=notification.title,
        body=notification.body
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    user_id: Optional[int] = Query(None, description="Filter by user_id"),
    db: Session = Depends(get_db)
):
    """列出通知（可選按 user_id 過濾）"""
    query = db.query(Notification)
    if user_id is not None:
        query = query.filter(Notification.user_id == user_id)
    return query.order_by(Notification.created_at.desc()).all()