from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class PlanFeature(BaseModel):
    name: str
    description: str
    included: bool


class PlanResponse(BaseModel):
    id: str
    name: str
    price: float
    price_currency: str
    billing_period: str
    annual_billing_note: str | None = None
    features: List[PlanFeature]
    is_popular: bool = False


@router.get("/plans", response_model=PlanResponse)
async def get_subscription_plans():
    plans = [
        {
            "id": "free",
            "name": "Free",
            "price": 0,
            "price_currency": "HKD",
            "billing_period": "monthly",
            "annual_billing_note": None,
            "features": [
                {"name": "基本 CV 上傳", "description": "上傳和管理個人履歷", "included": True},
                {"name": "薪酬查詢", "description": "查詢市場薪酬行情", "included": True},
                {"name": "AI 面試模擬", "description": "AI 模擬面試練習", "included": False},
                {"name": "CV 優化建議", "description": "AI 驅動的履歷優化", "included": False},
                {"name": "職位提醒", "description": "個人化職位空缺通知", "included": False},
            ],
            "is_popular": False
        },
        {
            "id": "premium_monthly",
            "name": "Premium Monthly",
            "price": 199,
            "price_currency": "HKD",
            "billing_period": "monthly",
            "annual_billing_note": None,
            "features": [
                {"name": "基本 CV 上傳", "description": "上傳和管理個人履歷", "included": True},
                {"name": "薪酬查詢", "description": "查詢市場薪酬行情", "included": True},
                {"name": "AI 面試模擬", "description": "AI 模擬面試練習", "included": True},
                {"name": "CV 優化建議", "description": "AI 驅動的履歷優化", "included": True},
                {"name": "職位提醒", "description": "個人化職位空缺通知", "included": True},
            ],
            "is_popular": True
        },
        {
            "id": "premium_annual",
            "name": "Premium Annual",
            "price": 99,
            "price_currency": "HKD",
            "billing_period": "annual",
            "annual_billing_note": "HK$1,188 一次性支付（為期 12 個月）",
            "features": [
                {"name": "基本 CV 上傳", "description": "上傳和管理個人履歷", "included": True},
                {"name": "薪酬查詢", "description": "查詢市場薪酬行情", "included": True},
                {"name": "AI 面試模擬", "description": "AI 模擬面試練習", "included": True},
                {"name": "CV 優化建議", "description": "AI 驅動的履歷優化", "included": True},
                {"name": "職位提醒", "description": "個人化職位空缺通知", "included": True},
            ],
            "is_popular": False
        },
        {
            "id": "premium_unlimited",
            "name": "Premium Unlimited",
            "price": 299,
            "price_currency": "HKD",
            "billing_period": "monthly",
            "annual_billing_note": None,
            "features": [
                {"name": "基本 CV 上傳", "description": "上傳和管理個人履歷", "included": True},
                {"name": "薪酬查詢", "description": "查詢市場薪酬行情", "included": True},
                {"name": "AI 面試模擬", "description": "AI 模擬面試練習", "included": True},
                {"name": "CV 優化建議", "description": "AI 驅動的履歷優化", "included": True},
                {"name": "職位提醒", "description": "個人化職位空缺通知", "included": True},
                {"name": "無限使用", "description": "無限制使用所有功能", "included": True},
            ],
            "is_popular": False
        }
    ]
    
    return {"plans": plans}