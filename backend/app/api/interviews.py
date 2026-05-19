"""模擬面試端點"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class InterviewConfig(BaseModel):
    job_type: str  # engineering, sales, marketing, etc.
    company_size: str  # startup, smb, enterprise
    interview_type: str  # hr, technical, final
    level: Optional[str] = "mid"  # junior, mid, senior


class InterviewQuestion(BaseModel):
    question: str
    question_type: str  # behavioral, technical, situational
    expected_duration: str


class InterviewAnswer(BaseModel):
    question_id: int
    answer: str


class InterviewFeedback(BaseModel):
    question_id: int
    score: float
    feedback: str
    improvement: str


@router.post("/start")
async def start_interview(config: InterviewConfig):
    # TODO: 實現真實的面試問題生成
    return {
        "session_id": "mock_session_123",
        "questions": [
            {
                "id": 1,
                "question": "請自我介紹一下",
                "type": "behavioral",
                "expected_duration": "2-3分鐘"
            },
            {
                "id": 2,
                "question": "你最大的弱點是什麼？如何改善？",
                "type": "behavioral",
                "expected_duration": "1-2分鐘"
            },
            {
                "id": 3,
                "question": "為什麼你想加入我們公司？",
                "type": "situational",
                "expected_duration": "1-2分鐘"
            }
        ]
    }


@router.post("/submit/{session_id}")
async def submit_answer(session_id: str, answers: List[InterviewAnswer]):
    # TODO: 實現真實的答案評估和反饋生成
    return {
        "session_id": session_id,
        "overall_score": 7.5,
        "feedback": [
            {
                "question_id": a.question_id,
                "score": 8.0,
                "feedback": "回答結構清晰",
                "improvement": "可以更具體地說明成果"
            }
            for a in answers
        ],
        "summary": "整體表現良好，建議多舉例具體成果"
    }


@router.get("/history")
async def get_interview_history(user_id: int = 1):
    # TODO: 實現真實的面試歷史查詢
    return {
        "sessions": [
            {
                "id": "mock_session_123",
                "date": "2026-05-18",
                "job_type": "engineering",
                "score": 7.5
            }
        ]
    }
