from typing import List

from pydantic import BaseModel, Field


class CVAnalysisResultSchema(BaseModel):
    role_relevance: int = Field(..., ge=1, le=10)
    experience_years: int = Field(..., ge=1, le=10)
    education_quality: int = Field(..., ge=1, le=10)
    skills_clarity: int = Field(..., ge=1, le=10)
    quantified_achievements: int = Field(..., ge=1, le=10)
    overall_professionalism: int = Field(..., ge=1, le=10)
    text_suggestions: List[str] = Field(..., min_length=3, max_length=5)