import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api import health, users, cvs, salary, interviews, jobs, market, subscriptions

limiter = Limiter(key_func=get_remote_address)

DEFAULT_RATE = "30/minute"
AUTH_RATE = "10/minute"

app = FastAPI(
    title="Jobble Baby API",
    description="求職 AI 助手後端 API",
    version="1.0.0"
)

allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:8081").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": exc.detail
        }
    )

app.state.limiter = limiter

app.include_router(health.router, prefix="/api/v1", tags=["健康檢查"])
app.include_router(users.router, prefix="/api/v1/users", tags=["用戶"])
app.include_router(cvs.router, prefix="/api/v1/cvs", tags=["CV"])
app.include_router(salary.router, prefix="/api/v1/salary", tags=["薪酬"])
app.include_router(interviews.router, prefix="/api/v1/interviews", tags=["面試"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["工作"])
app.include_router(market.router, prefix="/api/v1/market", tags=["行情"])
app.include_router(subscriptions.router, prefix="/api/v1/subscription", tags=["訂閱方案"])

@app.get("/")
async def root():
    return {"message": "Jobble Baby API", "status": "running"}