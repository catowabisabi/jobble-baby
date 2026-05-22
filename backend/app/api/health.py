"""健康檢查端點

Rate Limiting:
- Health check endpoints are EXEMPT from rate limiting
- These endpoints must always be available for monitoring and load balancers
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "jobble-baby-api",
        "version": "1.0.0"
    }


@router.get("/ping")
async def ping():
    return {"message": "pong"}
