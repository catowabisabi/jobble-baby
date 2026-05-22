"""TDD unit tests for CV PDF text extraction service.

These tests define the expected behavior of PDFTextExtractor.extract_text().
They should FAIL initially as no implementation exists yet.
"""

import os
from pathlib import Path
from unittest.mock import MagicMock

import pytest


class ExtractionError(Exception):
    """Custom exception raised when PDF text extraction fails."""
    pass


@pytest.fixture
def sample_cv_path():
    """Path to a valid sample PDF fixture file."""
    return Path(__file__).parent.parent / "fixtures" / "sample_cv.pdf"


@pytest.fixture
def mock_cv_record():
    """Mock CV record object with file_path attribute."""
    record = MagicMock()
    record.file_path = "cvs/test-uuid.pdf"
    return record


@pytest.fixture
def mock_db():
    """Mock database session."""
    return MagicMock()


class TestPDFTextExtractor:
    """Test suite for PDFTextExtractor.extract_text() service."""

    def test_extract_text_from_valid_pdf(self, sample_cv_path, mock_cv_record, mock_db):
        """Verify text extraction from a valid PDF returns non-empty string."""
        mock_cv_record.file_path = str(sample_cv_path)

        from backend.app.services.cv_extractor import PDFTextExtractor

        result = PDFTextExtractor.extract_text(mock_cv_record, mock_db)

        assert isinstance(result, str)
        assert len(result) > 0

    def test_extract_text_from_empty_pdf(self, mock_cv_record, mock_db, tmp_path):
        """Verify extraction from empty PDF returns empty string."""
        empty_pdf = tmp_path / "empty.pdf"
        empty_pdf.write_bytes(b"")

        mock_cv_record.file_path = str(empty_pdf)

        from backend.app.services.cv_extractor import PDFTextExtractor

        result = PDFTextExtractor.extract_text(mock_cv_record, mock_db)

        assert result == ""

    def test_extract_text_corrupted_pdf(self, mock_cv_record, mock_db, tmp_path):
        """Verify extraction from corrupted PDF raises ExtractionError."""
        corrupted_pdf = tmp_path / "corrupted.pdf"
        corrupted_pdf.write_bytes(b"NOT A REAL PDF FILE")

        mock_cv_record.file_path = str(corrupted_pdf)

        from backend.app.services.cv_extractor import PDFTextExtractor

        with pytest.raises(ExtractionError):
            PDFTextExtractor.extract_text(mock_cv_record, mock_db)

    def test_extract_text_file_not_found(self, mock_cv_record, mock_db):
        """Verify extraction from missing file raises FileNotFoundError."""
        mock_cv_record.file_path = "nonexistent/cvs/missing-file.pdf"

        from backend.app.services.cv_extractor import PDFTextExtractor

        with pytest.raises(FileNotFoundError):
            PDFTextExtractor.extract_text(mock_cv_record, mock_db)

    def test_extract_text_unsupported_format(self, mock_cv_record, mock_db, tmp_path):
        """Verify extraction from non-PDF file raises ValueError."""
        txt_file = tmp_path / "document.txt"
        txt_file.write_text("This is plain text, not a PDF")

        mock_cv_record.file_path = str(txt_file)

        from backend.app.services.cv_extractor import PDFTextExtractor

        with pytest.raises(ValueError):
            PDFTextExtractor.extract_text(mock_cv_record, mock_db)