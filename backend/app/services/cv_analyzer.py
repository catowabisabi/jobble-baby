import json
import os
import time
from dataclasses import dataclass
from typing import List, Optional

from openai import OpenAI


class AnalysisError(Exception):
    pass


@dataclass
class CVAnalysisResult:
    role_relevance: int
    experience_years: int
    education_quality: int
    skills_clarity: int
    quantified_achievements: int
    overall_professionalism: int
    text_suggestions: List[str]

    def to_dict(self) -> dict:
        return {
            "role_relevance": self.role_relevance,
            "experience_years": self.experience_years,
            "education_quality": self.education_quality,
            "skills_clarity": self.skills_clarity,
            "quantified_achievements": self.quantified_achievements,
            "overall_professionalism": self.overall_professionalism,
            "text_suggestions": self.text_suggestions
        }


class CVAnalyzer:
    MODEL = "gpt-4o-mini"
    MAX_RETRIES = 3
    TIMEOUT_SECONDS = 30
    RETRY_DELAYS = [2, 4, 8]

    SYSTEM_PROMPT = """You are an expert HR recruiter with 15 years of experience analyzing CVs for tech and software engineering positions.

Analyze the following CV text and return a JSON object with scores (1-10) for these 6 dimensions:
- role_relevance: How relevant is this CV for tech/software roles? Consider technology stack, job titles, and domain experience.
- experience_years: Estimated years of relevant professional experience demonstrated.
- education_quality: Quality and relevance of education (degrees, certifications, online courses).
- skills_clarity: How clearly and specifically are technical and soft skills stated?
- quantified_achievements: Are achievements backed by specific metrics, numbers, and outcomes?
- overall_professionalism: Overall CV presentation, formatting, grammar, and professional tone.

Also provide 3-5 actionable text suggestions for improvement, specific to this CV's weaknesses.

Return ONLY this JSON structure (no markdown, no explanation):
{
  "role_relevance": int,
  "experience_years": int,
  "education_quality": int,
  "skills_clarity": int,
  "quantified_achievements": int,
  "overall_professionalism": int,
  "text_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]
}"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.client = OpenAI(api_key=self.api_key)

    def analyze_cv(self, cv_text: str) -> CVAnalysisResult:
        last_error = None

        for attempt in range(self.MAX_RETRIES):
            try:
                return self._call_openai(cv_text)
            except Exception as e:
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_DELAYS[attempt]
                    time.sleep(delay)
                continue

        raise AnalysisError(f"CV analysis failed after {self.MAX_RETRIES} attempts: {last_error}")

    def _call_openai(self, cv_text: str) -> CVAnalysisResult:
        user_prompt = f"CV TEXT:\n{cv_text}"

        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            timeout=self.TIMEOUT_SECONDS
        )

        content = response.choices[0].message.content

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            raise AnalysisError(f"Failed to parse JSON response: {content[:200]}")

        required_fields = [
            "role_relevance", "experience_years", "education_quality",
            "skills_clarity", "quantified_achievements", "overall_professionalism",
            "text_suggestions"
        ]

        for field in required_fields:
            if field not in data:
                raise AnalysisError(f"Missing required field in response: {field}")

        score_fields = [
            "role_relevance", "experience_years", "education_quality",
            "skills_clarity", "quantified_achievements", "overall_professionalism"
        ]

        for field in score_fields:
            value = data[field]
            if not isinstance(value, int) or not (1 <= value <= 10):
                raise AnalysisError(
                    f"Invalid score for {field}: {value}. Must be integer 1-10"
                )

        suggestions = data["text_suggestions"]
        if not isinstance(suggestions, list) or not (3 <= len(suggestions) <= 5):
            raise AnalysisError(
                f"Invalid text_suggestions: {suggestions}. Must be list of 3-5 strings"
            )

        return CVAnalysisResult(
            role_relevance=data["role_relevance"],
            experience_years=data["experience_years"],
            education_quality=data["education_quality"],
            skills_clarity=data["skills_clarity"],
            quantified_achievements=data["quantified_achievements"],
            overall_professionalism=data["overall_professionalism"],
            text_suggestions=data["text_suggestions"]
        )