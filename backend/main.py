"""
Jobble Baby - FastAPI Backend
M1 基礎架構 - 用戶系統和登入

Rate Limiting Configuration:
- Default rate limit: 30 requests/minute per IP (applied to most endpoints)
- Auth endpoints (/api/v1/users/login, /register): 10 requests/minute per IP
- Health endpoints (/api/v1/health, /api/v1/ping): EXEMPT from rate limiting
- Rate limit key function: Client IP address (X-Forwarded-For aware)
- 429 response includes retry information in JSON body
- Storage: In-memory (use Redis for multi-instance production deployments)
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api import health, users, cvs, salary, interviews, jobs, market

"""
Shared rate limiter for Jobble Baby API
Created once, imported by all route modules for decorator-based rate limiting
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Single limiter instance shared across all API modules
# Uses client IP for keying; use Redis storage backend for multi-instance deployments
limiter = Limiter(key_func=get_remote_address)

DEFAULT_RATE = "30/minute"
AUTH_RATE = "10/minute"
EXEMPT = None  # Health endpoints exempt

app = FastAPI(
    title="Jobble Baby API",
    description="求職 AI 助手後端 API",
    version="1.0.0"
)

# CORS configuration
allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:8081").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limit exceeded handler - returns JSON instead of default HTML
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": exc.detail
        }
    )

# Store limiter in app state for access by routers
app.state.limiter = limiter

# Register routers
app.include_router(health.router, prefix="/api/v1", tags=["健康檢查"])
app.include_router(users.router, prefix="/api/v1/users", tags=["用戶"])
app.include_router(cvs.router, prefix="/api/v1/cvs", tags=["CV"])
app.include_router(salary.router, prefix="/api/v1/salary", tags=["薪酬"])
app.include_router(interviews.router, prefix="/api/v1/interviews", tags=["面試"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["工作"])
app.include_router(market.router, prefix="/api/v1/market", tags=["行情"])


@app.get("/")
async def root():
    return {"message": "Jobble Baby API", "status": "running"}
