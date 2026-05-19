"""行情分析端點"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class SkillDemand(BaseModel):
    skill: str
    demand_level: str  # high, medium, low
    trend: str  # rising, stable, declining
    avg_salary: int


class MarketAnalysis(BaseModel):
    overall_demand: str  # hot, moderate, cold
    top_growing_skills: List[SkillDemand]
    saturated_skills: List[str]
    recommended_skills: List[str]


@router.post("/analyze")
async def analyze_skills(skills: List[str], industry: Optional[str] = None):
    # TODO: 實現真實的技能市場分析
    return {
        "overall_demand": "moderate",
        "skill_analysis": [
            {
                "skill": s,
                "demand_level": "high",
                "trend": "rising",
                "avg_salary": 45000
            }
            for s in skills
        ],
        "recommendations": [
            "建議學習 Kubernetes 以提升競爭力",
            "雲端架構技能需求持續增長"
        ]
    }


@router.get("/trends")
async def get_market_trends(industry: Optional[str] = None):
    # TODO: 實現真實的市場趨勢數據
    return {
        "trends": [
            {
                "skill": "AI/ML",
                "demand": "very_high",
                "trend": "rising",
                "change_percent": 25
            },
            {
                "skill": "Cloud Architecture",
                "demand": "high",
                "trend": "rising",
                "change_percent": 18
            },
            {
                "skill": "Traditional QA",
                "demand": "medium",
                "trend": "declining",
                "change_percent": -5
            }
        ]
    }


@router.get("/salary-insights")
async def get_salary_insights(skill: str):
    # TODO: 實現真實的技能薪資洞察
    return {
        "skill": skill,
        "entry_level": 30000,
        "mid_level": 50000,
        "senior_level": 80000,
        "market_value_trend": "increasing"
    }
