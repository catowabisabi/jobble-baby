"""
Jobble Baby - FastAPI Backend
M1 基礎架構 - 用戶系統和登入
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, users, cvs, salary, interviews, jobs, market

app = FastAPI(
    title="Jobble Baby API",
    description="求職 AI 助手後端 API",
    version="1.0.0"
)

# CORS 配置
allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:8081").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
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
