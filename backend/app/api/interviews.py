"""模擬面試端點

Rate Limiting:
- All endpoints limited to 30 requests/minute per IP
"""
import json
import os
import random
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import openai

from app.models.database import User, InterviewSession, get_db
from app.api.users import get_current_user

router = APIRouter()

interview_sessions: Dict[str, dict] = {}

QUESTIONS_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "interview_questions.json")

def load_interview_questions():
    with open(QUESTIONS_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

QUESTIONS_DATA = load_interview_questions()

def get_limiter(request: Request):
    return request.app.state.limiter


def get_questions_for_session(job_type: str, interview_type: str, level: str, num_questions: int = 5) -> List[dict]:
    all_questions = QUESTIONS_DATA.get("questions", [])
    
    # Filter by category (hr, technical, situational, final)
    category_map = {
        "hr": ["hr"],
        "technical": ["technical"],
        "final": ["final", "situational"],
        "mixed": ["hr", "technical", "situational", "final"]
    }
    target_categories = category_map.get(interview_type, ["hr", "technical", "situational", "final"])
    
    filtered = [
        q for q in all_questions
        if q.get("category") in target_categories
        and ("general" in q.get("job_type_tags", []) or job_type in q.get("job_type_tags", []))
    ]
    
    general_questions = [q for q in all_questions if "general" in q.get("job_type_tags", [])]
    
    filtered.extend([q for q in general_questions if q not in filtered])
    
    random.shuffle(filtered)
    return filtered[:num_questions]


def generate_feedback_prompt(question: dict, job_type: str, user_answer: str) -> str:
    return f"""你是一位專業的面試教練。請根據以下問題和求職者的回答，提供詳細的反饋。

崗位類型: {job_type}
問題: {question['question']}
求職者回答: {user_answer}

請以JSON格式返回反饋，包含以下欄位:
- score: 1-10的評分（1最差，10最好）
- strengths: 回答的強項（用中文，50字以內）
- improvements: 需要改進的地方（用中文，80字以內）
- tip: 實用的建議（用中文，60字以內）

只返回JSON，不要有其他文字。"""


def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return openai.OpenAI(api_key=api_key)


class InterviewConfig(BaseModel):
    job_type: str
    company_size: str
    interview_type: str
    level: Optional[str] = "mid"
    num_questions: Optional[int] = 5


class InterviewAnswer(BaseModel):
    question_id: int
    answer: str


class InterviewFeedback(BaseModel):
    question_id: int
    score: float
    feedback: str
    improvement: str


class StartInterviewResponse(BaseModel):
    session_id: str
    job_type: str
    interview_type: str
    level: str
    questions: List[dict]


class SubmitAnswerRequest(BaseModel):
    answers: List[InterviewAnswer]


class SubmitAnswerResponse(BaseModel):
    session_id: str
    overall_score: float
    per_question_feedback: List[dict]
    summary: str
    recommended_next_steps: List[str]


class SessionSummary(BaseModel):
    session_id: str
    date: str
    job_type: str
    interview_type: str
    level: str
    score: float


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(request: Request, config: InterviewConfig, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    session_id = str(uuid.uuid4())
    
    questions = get_questions_for_session(
        job_type=config.job_type,
        interview_type=config.interview_type,
        level=config.level or "mid",
        num_questions=config.num_questions or 5
    )
    
    # Store session in memory
    interview_sessions[session_id] = {
        "session_id": session_id,
        "user_id": current_user.id,
        "job_type": config.job_type,
        "interview_type": config.interview_type,
        "level": config.level or "mid",
        "questions": questions,
"created_at": datetime.now().isoformat(),
        "answers": []
    }
    
    return_questions = [
        {
            "id": q["id"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "question": q["question"],
            "expected_duration": "2-3分鐘"
        }
        for q in questions
    ]
    
    return StartInterviewResponse(
        session_id=session_id,
        job_type=config.job_type,
        interview_type=config.interview_type,
        level=config.level or "mid",
        questions=return_questions
    )


@router.post("/submit/{session_id}", response_model=SubmitAnswerResponse)
async def submit_answer(request: Request, session_id: str, submit_req: SubmitAnswerRequest, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    if session_id not in interview_sessions:
        # Try to find by checking all sessions for this user
        raise ValueError("面試環節不存在或已過期")
    
    session = interview_sessions[session_id]
    
    if session.get("user_id") != current_user.id:
        raise ValueError("無權訪問此面試環節")
    
    question_map = {q["id"]: q for q in session["questions"]}
    
    per_question_feedback = []
    scores = []
    
    client = get_openai_client()
    
    for answer in submit_req.answers:
        question = question_map.get(answer.question_id)
        if not question:
            continue
        
        if client:
            try:
                prompt = generate_feedback_prompt(question, session["job_type"], answer.answer)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "你是一位專業的面試教練，擅長提供建設性的求職建議。"},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=500
                )
                feedback_text = response.choices[0].message.content.strip()
                
                import re
                json_match = re.search(r'\{.*\}', feedback_text, re.DOTALL)
                if json_match:
                    feedback_data = json.loads(json_match.group())
                    score = feedback_data.get("score", 7.0)
                    strengths = feedback_data.get("strengths", "")
                    improvements = feedback_data.get("improvements", "")
                    tip = feedback_data.get("tip", "")
                else:
                    score = 7.0
                    strengths = "回答完整"
                    improvements = "可以更具體"
                    tip = "多練習"
            except Exception:
                score = 7.0
                strengths = "回答完整"
                improvements = "可以更具體"
                tip = "多練習"
        else:
            score = 7.0
            strengths = "回答完整"
            improvements = "可以更具體"
            tip = "多練習"
        
        per_question_feedback.append({
            "question_id": answer.question_id,
            "score": score,
            "feedback": strengths,
            "improvement": improvements,
            "tip": tip
        })
        scores.append(score)
    
    overall_score = sum(scores) / len(scores) if scores else 0
    
    if overall_score >= 8:
        summary = "整體表現出色！回答展現了深厚的專業知識和良好的溝通能力。建議繼續保持並加強弱項。"
    elif overall_score >= 6:
        summary = "表現良好，已展示基本的崗位能力。建議針對具體弱項進行強化練習。"
    elif overall_score >= 4:
        summary = "中等水平，需要在多個方面改進。建議系統性準備常見面試問題。"
    else:
        summary = "需要大幅提升。建議先了解崗位核心要求，並進行針對性練習。"
    
    recommended_next_steps = [
        "針對回答中的弱項進行專項練習",
        "熟悉公司業務和崗位要求",
        "準備更具體的實例來支持你的回答"
    ]
    
    session["answers"] = submit_req.answers
    session["feedback"] = per_question_feedback
    session["overall_score"] = overall_score
    session["completed_at"] = datetime.now().isoformat()
    
    return SubmitAnswerResponse(
        session_id=session_id,
        overall_score=round(overall_score, 1),
        per_question_feedback=per_question_feedback,
        summary=summary,
        recommended_next_steps=recommended_next_steps
    )


@router.get("/history")
async def get_interview_history(request: Request, current_user: User = Depends(get_current_user)):
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    user_sessions = []
    for session_id, session in interview_sessions.items():
        if session.get("user_id") == current_user.id:
            user_sessions.append({
                "session_id": session_id,
                "date": session.get("created_at", "")[:10] if session.get("created_at") else "",
                "job_type": session.get("job_type", ""),
                "interview_type": session.get("interview_type", ""),
                "level": session.get("level", ""),
                "score": session.get("overall_score", None)
            })
    
    user_sessions.sort(key=lambda x: x["date"], reverse=True)
    
    return {
        "sessions": user_sessions
    }


class SessionRecord(BaseModel):
    session_id: str
    job_type: str
    interview_type: str
    level: str
    overall_score: float
    feedback_categories: Optional[Dict[str, float]] = None


class RecordSessionRequest(BaseModel):
    session_id: str
    job_type: str
    interview_type: str
    level: str
    overall_score: float
    per_question_feedback: List[dict]


@router.post("/sessions")
async def record_interview_session(
    request: Request,
    session_data: RecordSessionRequest,
    current_user: User = Depends(get_current_user)
):
    """Record a completed interview session to database"""
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    # Extract category scores from feedback
    feedback_categories = {}
    for fb in session_data.per_question_feedback:
        category = fb.get("category", "general")
        if category not in feedback_categories:
            feedback_categories[category] = []
        feedback_categories[category].append(fb.get("score", 7.0))
    
    # Average scores per category
    avg_categories = {
        cat: sum(scores) / len(scores) 
        for cat, scores in feedback_categories.items()
    }
    
    # Save to database
    db = next(get_db())
    try:
        interview_session = InterviewSession(
            user_id=current_user.id,
            session_id=session_data.session_id,
            job_type=session_data.job_type,
            interview_type=session_data.interview_type,
            level=session_data.level,
            overall_score=int(session_data.overall_score * 10),
            feedback_categories=avg_categories,
            completed_at=datetime.utcnow()
        )
        db.add(interview_session)
        db.commit()
        
        return {"status": "recorded", "session_id": session_data.session_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/sessions")
async def get_interview_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    limit: int = 20
):
    """Get interview session history for dashboard"""
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    db = next(get_db())
    try:
        sessions = db.query(InterviewSession).filter(
            InterviewSession.user_id == current_user.id
        ).order_by(InterviewSession.completed_at.desc()).limit(limit).all()
        
        return {
            "sessions": [
                {
                    "session_id": s.session_id,
                    "date": s.completed_at.isoformat()[:10] if s.completed_at else "",
                    "job_type": s.job_type or "",
                    "interview_type": s.interview_type or "",
                    "level": s.level or "",
                    "score": s.overall_score / 10.0 if s.overall_score else None,
                    "feedback_categories": s.feedback_categories or {}
                }
                for s in sessions
            ]
        }
    finally:
        db.close()


@router.get("/readiness")
async def get_interview_readiness(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Get interview readiness dashboard data"""
    limiter = get_limiter(request)
    if hasattr(limiter, 'check'):
        limiter.check(request, "30/minute")
    
    db = next(get_db())
    try:
        # Get last 10 sessions for analysis
        sessions = db.query(InterviewSession).filter(
            InterviewSession.user_id == current_user.id
        ).order_by(InterviewSession.completed_at.desc()).limit(10).all()
        
        if not sessions:
            return {
                "total_sessions": 0,
                "average_score": None,
                "readiness_level": "no_data",
                "recent_trend": [],
                "focus_areas": [],
                "sessions": []
            }
        
        # Calculate average score
        scores = [s.overall_score / 10.0 for s in sessions if s.overall_score]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Determine readiness level
        if avg_score >= 8:
            readiness_level = "expert"
        elif avg_score >= 6:
            readiness_level = "ready"
        else:
            readiness_level = "building"
        
        # Calculate trend (last 5 vs previous 5)
        recent_scores = scores[:5] if len(scores) >= 5 else scores
        older_scores = scores[5:10] if len(scores) > 5 else []
        
        trend = []
        if len(recent_scores) >= 3:
            trend = recent_scores
        
        # Find focus areas (weakest categories)
        all_categories: Dict[str, List[float]] = {}
        for session in sessions:
            if session.feedback_categories:
                for cat, score in session.feedback_categories.items():
                    if cat not in all_categories:
                        all_categories[cat] = []
                    all_categories[cat].append(score)
        
        focus_areas = []
        if all_categories:
            cat_averages = {
                cat: sum(scores) / len(scores) 
                for cat, scores in all_categories.items()
            }
            # Sort by lowest score first
            sorted_cats = sorted(cat_averages.items(), key=lambda x: x[1])
            for cat, avg in sorted_cats[:3]:
                if avg < 7:
                    focus_areas.append({
                        "category": cat,
                        "average_score": round(avg, 1),
                        "suggestion": f"需要加強{cat}方面的練習"
                    })
        
        return {
            "total_sessions": len(sessions),
            "average_score": round(avg_score, 1),
            "readiness_level": readiness_level,
            "readiness_badge": {
                "building": "🏗️ 建設中",
                "ready": "✅ 準備就緒",
                "expert": "🎯 面試高手"
            }.get(readiness_level, "❓ 開始練習"),
            "recent_trend": trend,
            "focus_areas": focus_areas,
            "sessions": [
                {
                    "session_id": s.session_id,
                    "date": s.completed_at.isoformat()[:10] if s.completed_at else "",
                    "job_type": s.job_type or "",
                    "interview_type": s.interview_type or "",
                    "level": s.level or "",
                    "score": s.overall_score / 10.0 if s.overall_score else None
                }
                for s in sessions
            ]
        }
    finally:
        db.close()
