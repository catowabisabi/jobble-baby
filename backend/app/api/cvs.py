"""CV 相關端點"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class CVResponse(BaseModel):
    id: int
    user_id: int
    file_path: str
    analyzed_at: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None


class CVAnalysisRequest(BaseModel):
    job_description: Optional[str] = None


@router.post("/upload")
async def upload_cv(user_id: int = 1, file: UploadFile = File(...)):
    # TODO: 實現真實的檔案上傳和存儲
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    return {
        "id": 1,
        "user_id": user_id,
        "file_path": f"/uploads/cvs/{file.filename}",
        "message": "CV uploaded successfully"
    }


@router.get("/{cv_id}", response_model=CVResponse)
async def get_cv(cv_id: int):
    # TODO: 實現真實的 CV 查詢
    return CVResponse(
        id=cv_id,
        user_id=1,
        file_path="/uploads/cvs/sample.pdf",
        score=7.5,
        feedback="CV 結構清晰，但缺乏量化數據"
    )


@router.post("/analyze/{cv_id}")
async def analyze_cv(cv_id: int, request: CVAnalysisRequest = None):
    # TODO: 實現真實的 AI CV 分析
    return {
        "id": cv_id,
        "score": 7.5,
        "strengths": [
            "工作經驗描述清晰",
            "技能列表完整"
        ],
        "weaknesses": [
            "缺乏量化成果",
            "工作描述不夠具體"
        ],
        "suggestions": [
            "加入具體的數字成果（如提升效率30%）",
            "針對應徵職位客製化CV"
        ]
    }


@router.get("/")
async def list_cvs(user_id: int = 1):
    # TODO: 實現真實的 CV 列表查詢
    return {
        "cvs": [
            {
                "id": 1,
                "file_path": "/uploads/cvs/sample.pdf",
                "analyzed_at": "2026-05-18",
                "score": 7.5
            }
        ]
    }
