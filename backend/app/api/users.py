"""
用戶相關端點 - 完整的註冊/登入/JWT 認證系統

Rate Limiting:
- /register and /login endpoints: 10 requests/minute per IP (strict to prevent brute force)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

from app.models.database import User, JobAlert, get_db, init_db
from app.models.schemas import (
    UserCreate, UserLogin, UserResponse,
    TokenResponse, SubscriptionStatus, SubscriptionUpgrade,
    SubscriptionPlan, AlertPreferencesUpdate, AlertPreferencesResponse
)
from app.api.limiter import limiter, AUTH_RATE, DEFAULT_RATE

router = APIRouter()

# 密碼加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置
import os

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jobble-baby-secret-key-fallback-only-for-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# HTTP Bearer 安全方案
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證密碼"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """生成密碼哈希"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """創建 JWT Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """解碼 JWT Token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """獲取當前認證用戶"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無效的認證令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無效的認證令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用戶不存在",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


# 初始化數據庫
init_db()


def validate_password(password: str) -> bool:
    if len(password) < 8:
        return False
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    return has_upper and has_lower and has_digit


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_RATE)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    
    if not validate_password(user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密碼至少需要 8 個字符，包括大小寫字母和數字"
        )

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="此 Email 已被註冊"
        )
    
    # 創建新用戶
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        name=user.name,
        subscription_tier="trial"  # 默認試用版
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 創建 JWT Token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=new_user.id,
            email=new_user.email,
            name=new_user.name,
            subscription_tier=new_user.subscription_tier,
            created_at=new_user.created_at
        )
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(AUTH_RATE)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    
    user = db.query(User).filter(User.email == user_login.email).first()
    
    if not user or not verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email 或密碼錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 創建 JWT Token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            subscription_tier=user.subscription_tier,
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """獲取當前用戶信息"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        subscription_tier=current_user.subscription_tier,
        created_at=current_user.created_at
    )


@router.get("/subscription", response_model=SubscriptionStatus)
async def get_subscription(current_user: User = Depends(get_current_user)):
    """獲取訂閱狀態"""
    if current_user.subscription_tier == "premium":
        return SubscriptionStatus(
            status="premium",
            subscription_ends_at=None
        )
    elif current_user.subscription_tier == "trial":
        trial_end = current_user.created_at + timedelta(days=30)
        return SubscriptionStatus(
            status="trial",
            trial_ends_at=trial_end.isoformat()
        )
    else:
        return SubscriptionStatus(status="free")


@router.patch("/subscription", response_model=SubscriptionPlan)
@limiter.limit(DEFAULT_RATE)
async def upgrade_subscription(
    upgrade: SubscriptionUpgrade,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """升級訂閱"""
    if upgrade.tier != "premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="目前只支援升級到 premium 訂閱"
        )
    
    current_user.subscription_tier = "premium"
    db.commit()
    db.refresh(current_user)
    
    return SubscriptionPlan(
        tier=current_user.subscription_tier,
        status="premium",
        subscription_ends_at=None
    )


@router.get("/alert-preferences", response_model=AlertPreferencesResponse)
async def get_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(JobAlert).filter(JobAlert.user_id == current_user.id).first()
    if not alert:
        return AlertPreferencesResponse()
    return AlertPreferencesResponse(
        job_types=alert.job_types or [],
        salary_min=alert.salary_min,
        locations=alert.locations or [],
        keywords=alert.keywords or [],
        notifications_enabled=alert.notifications_enabled
    )


@router.patch("/alert-preferences", response_model=AlertPreferencesResponse)
@limiter.limit(DEFAULT_RATE)
async def update_alert_preferences(
    preferences: AlertPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(JobAlert).filter(JobAlert.user_id == current_user.id).first()
    
    update_data = preferences.model_dump(exclude_unset=True)
    
    if alert:
        for key, value in update_data.items():
            setattr(alert, key, value)
    else:
        alert = JobAlert(user_id=current_user.id, **update_data)
        db.add(alert)
    
    db.commit()
    db.refresh(alert)
    
    return AlertPreferencesResponse(
        job_types=alert.job_types or [],
        salary_min=alert.salary_min,
        locations=alert.locations or [],
        keywords=alert.keywords or [],
        notifications_enabled=alert.notifications_enabled
    )
