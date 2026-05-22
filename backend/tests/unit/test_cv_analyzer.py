"""Unit tests for CV Analyzer Service (GPT-4o mini integration).

Tests should FAIL initially - no implementation yet.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from dataclasses import dataclass
from typing import List


# Custom exception - must be defined in test file first
class AnalysisError(Exception):
    """Raised when CV analysis fails after all retries."""
    pass


# Test fixtures
@pytest.fixture
def mock_openai_response_valid():
    """Mock successful OpenAI response with valid JSON."""
    return {
        "role_relevance": 8,
        "experience_years": 7,
        "education_quality": 9,
        "skills_clarity": 7,
        "quantified_achievements": 6,
        "overall_professionalism": 8,
        "text_suggestions": [
            "Add more quantifiable metrics to achievements",
            "Clarify years of experience in each role",
            "Include relevant certifications"
        ]
    }


@pytest.fixture
def mock_openai_response_lower_scores():
    """Mock OpenAI response with lower scores for empty text."""
    return {
        "role_relevance": 3,
        "experience_years": 2,
        "education_quality": 4,
        "skills_clarity": 2,
        "quantified_achievements": 1,
        "overall_professionalism": 3,
        "text_suggestions": [
            "Add work experience details",
            "Include education background",
            "List relevant skills"
        ]
    }


@pytest.fixture
def mock_openai_response_min_suggestions():
    """Mock OpenAI response with minimum 3 suggestions."""
    return {
        "role_relevance": 7,
        "experience_years": 6,
        "education_quality": 8,
        "skills_clarity": 7,
        "quantified_achievements": 6,
        "overall_professionalism": 7,
        "text_suggestions": [
            "Consider adding more details",
            "Review formatting consistency",
            "Add specific accomplishments"
        ]
    }


@pytest.fixture
def mock_openai_response_max_suggestions():
    """Mock OpenAI response with maximum 5 suggestions."""
    return {
        "role_relevance": 8,
        "experience_years": 7,
        "education_quality": 9,
        "skills_clarity": 8,
        "quantified_achievements": 7,
        "overall_professionalism": 8,
        "text_suggestions": [
            "Add quantifiable metrics",
            "Clarify leadership experience",
            "Include relevant certifications",
            "Improve skill descriptions",
            "Add cross-functional collaborations"
        ]
    }


# Dataclass for CV Analysis Result (as expected from service)
@dataclass
class CVAnalysisResult:
    """Expected result structure from CVAnalyzer.analyze_cv()."""
    role_relevance: int
    experience_years: int
    education_quality: int
    skills_clarity: int
    quantified_achievements: int
    overall_professionalism: int
    text_suggestions: List[str]


# ----- Test Cases -----

def test_analyze_cv_returns_valid_structure(mock_openai_response_valid):
    """Mock successful OpenAI response with valid JSON, verify returns CVAnalysisResult with all 6 score fields (1-10) and text_suggestions list."""
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = str(mock_openai_response_valid)
        mock_client.chat.completions.create.return_value = mock_response
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv("Sample CV text")
        
        assert isinstance(result, CVAnalysisResult)
        assert hasattr(result, 'role_relevance')
        assert hasattr(result, 'experience_years')
        assert hasattr(result, 'education_quality')
        assert hasattr(result, 'skills_clarity')
        assert hasattr(result, 'quantified_achievements')
        assert hasattr(result, 'overall_professionalism')
        assert hasattr(result, 'text_suggestions')
        assert isinstance(result.text_suggestions, list)


def test_analyze_cv_all_scores_in_range(mock_openai_response_valid):
    """Verify all 6 scores are integers between 1 and 10."""
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = str(mock_openai_response_valid)
        mock_client.chat.completions.create.return_value = mock_response
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv("Sample CV text")
        
        score_fields = [
            result.role_relevance,
            result.experience_years,
            result.education_quality,
            result.skills_clarity,
            result.quantified_achievements,
            result.overall_professionalism
        ]
        
        for score in score_fields:
            assert isinstance(score, int), f"Score {score} must be an integer"
            assert 1 <= score <= 10, f"Score {score} must be between 1 and 10"


def test_analyze_cv_suggestions_count(mock_openai_response_min_suggestions, mock_openai_response_max_suggestions):
    """Verify text_suggestions has 3-5 items."""
    # Test minimum (3 suggestions)
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = str(mock_openai_response_min_suggestions)
        mock_client.chat.completions.create.return_value = mock_response
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv("Sample CV text")
        
        assert 3 <= len(result.text_suggestions) <= 5, \
            f"Expected 3-5 suggestions, got {len(result.text_suggestions)}"
    
    # Test maximum (5 suggestions)
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = str(mock_openai_response_max_suggestions)
        mock_client.chat.completions.create.return_value = mock_response
        
        mock_client.chat.completions.create.return_value = mock_response
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv("Sample CV text")
        
        assert 3 <= len(result.text_suggestions) <= 5, \
            f"Expected 3-5 suggestions, got {len(result.text_suggestions)}"


def test_analyze_cv_retry_on_api_failure(mock_openai_response_valid):
    """Mock OpenAI failure 2 times then success, verify still returns result after retries."""
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        # First 2 calls fail, 3rd succeeds
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = str(mock_openai_response_valid)
        
        mock_client.chat.completions.create.side_effect = [
            Exception("API Error 1"),
            Exception("API Error 2"),
            mock_response
        ]
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv("Sample CV text")
        
        assert mock_client.chat.completions.create.call_count == 3
        assert isinstance(result, CVAnalysisResult)


def test_analyze_cv_invalid_json_recovery(mock_openai_response_valid):
    """Mock OpenAI returns malformed JSON then valid, verify recovers and returns result."""
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        valid_response = Mock()
        valid_response.choices = [Mock()]
        valid_response.choices[0].message.content = str(mock_openai_response_valid)
        
        # First returns malformed JSON, second returns valid JSON
        malformed_json = '{"role_relevance": 8, "experience_years": 7, broken'
        malformed_response = Mock()
        malformed_response.choices = [Mock()]
        malformed_response.choices[0].message.content = malformed_json
        
        mock_client.chat.completions.create.side_effect = [
            malformed_response,
            valid_response
        ]
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv("Sample CV text")
        
        assert mock_client.chat.completions.create.call_count == 2
        assert isinstance(result, CVAnalysisResult)


def test_analyze_cv_timeout_handling():
    """Mock timeout, verify raises AnalysisError after retries exhausted."""
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        # All 3 attempts timeout
        mock_client.chat.completions.create.side_effect = [
            TimeoutError("Request timeout"),
            TimeoutError("Request timeout"),
            TimeoutError("Request timeout")
        ]
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        
        with pytest.raises(AnalysisError) as exc_info:
            analyzer.analyze_cv("Sample CV text")
        
        assert mock_client.chat.completions.create.call_count == 3
        assert "timeout" in str(exc_info.value).lower() or "exhausted" in str(exc_info.value).lower()


def test_analyze_cv_empty_text_handling(mock_openai_response_lower_scores):
    """Mock empty CV text, verify still returns result (with lower scores)."""
    with patch("backend.services.cv_analyzer.OpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = str(mock_openai_response_lower_scores)
        mock_client.chat.completions.create.return_value = mock_response
        
        from backend.services.cv_analyzer import CVAnalyzer
        analyzer = CVAnalyzer()
        result = analyzer.analyze_cv("")
        
        assert isinstance(result, CVAnalysisResult)
        assert 1 <= result.role_relevance <= 10
        assert 1 <= result.experience_years <= 10
        assert result.role_relevance < 5, "Empty text should result in lower role relevance score"