"""CV PDF text extraction service using PyMuPDF (fitz)."""

import os
from pathlib import Path
from typing import TYPE_CHECKING

import fitz

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class ExtractionError(Exception):
    pass


class PDFTextExtractor:
    SUPPORTED_TYPES = {"application/pdf"}

    @classmethod
    def extract_text(cls, cv_record, db: "Session") -> str:
        file_path = cv_record.file_path

        backend_dir = Path(__file__).parent.parent.parent
        full_path = backend_dir / "uploads" / file_path

        if not full_path.exists():
            raise FileNotFoundError(f"CV file not found: {full_path}")

        if full_path.suffix.lower() != ".pdf":
            raise ValueError(f"Unsupported file format: {full_path.suffix}. Expected .pdf")

        try:
            doc = fitz.open(str(full_path))
            text_parts = []

            for page in doc:
                page_text = page.get_text()
                if page_text:
                    text_parts.append(page_text)

            doc.close()

            return "\n".join(text_parts)

        except fitz.FitzError as e:
            raise ExtractionError(f"Failed to parse PDF: {e}")
        except Exception as e:
            raise ExtractionError(f"PDF extraction error: {e}")