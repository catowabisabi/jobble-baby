"""
數據庫連接和模型
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import os

# 確保 data 目錄存在
data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(data_dir, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(data_dir, 'users.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

ACHIEVEMENT_TYPES = {
    # Score milestones
    "SCORE_MILESTONE_5": {"tier": "silver", "description": "Reach overall score 5"},
    "SCORE_MILESTONE_7": {"tier": "silver", "description": "Reach overall score 7"},
    "SCORE_MILESTONE_8": {"tier": "gold", "description": "Reach overall score 8"},
    "SCORE_MILESTONE_9": {"tier": "gold", "description": "Reach overall score 9"},
    "SCORE_MILESTONE_10": {"tier": "gold", "description": "Reach overall score 10"},
    # Category masters
    "CATEGORY_MASTER_role_relevance": {"tier": "silver", "description": "Score 9+ in role relevance"},
    "CATEGORY_MASTER_experience_years": {"tier": "silver", "description": "Score 9+ in experience years"},
    "CATEGORY_MASTER_education_quality": {"tier": "silver", "description": "Score 9+ in education quality"},
    "CATEGORY_MASTER_skills_clarity": {"tier": "silver", "description": "Score 9+ in skills clarity"},
    "CATEGORY_MASTER_quantified_achievements": {"tier": "silver", "description": "Score 9+ in quantified achievements"},
    "CATEGORY_MASTER_overall_professionalism": {"tier": "silver", "description": "Score 9+ in overall professionalism"},
    # Upload milestones
    "FIRST_CV_UPLOAD": {"tier": "bronze", "description": "Upload your first CV"},
    "FIVE_CVS_UPLOAD": {"tier": "silver", "description": "Upload 5 CVs"},
}


class User(Base):
    """用戶模型"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    subscription_tier = Column(String, default="free")  # free, trial, premium
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cvs = relationship("CV", back_populates="user")
    job_alerts = relationship("JobAlert", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    cv_score_history = relationship("CVScoreHistory", back_populates="user")
    milestone_achievements = relationship("MilestoneAchievement", back_populates="user")


class CV(Base):
    __tablename__ = "cvs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    analyzed_at = Column(DateTime, nullable=True)
    score = Column(Integer, nullable=True)
    feedback = Column(String, nullable=True)
    score_breakdown = Column(JSON, nullable=True)
    text_suggestions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="cvs")


class CVScoreHistory(Base):
    __tablename__ = "cv_score_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False)
    category_scores = Column(JSON, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="cv_score_history")


class MilestoneAchievement(Base):
    __tablename__ = "milestone_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_type = Column(String, nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON, nullable=True)

    user = relationship("User", back_populates="milestone_achievements")


def get_db():
    """獲取數據庫會話"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """初始化數據庫"""
    Base.metadata.create_all(bind=engine)