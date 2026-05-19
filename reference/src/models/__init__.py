"""Job scraping models package.

This package contains Pydantic models for JobSpy integration and data transfer.
For database models (CompanySQL, JobSQL), see src.models instead.
"""

from .job_models import (
    JobPosting,
    JobScrapeRequest,
    JobScrapeResult,
    JobSite,
    JobType,
    LocationType,
)

# Re-export database models from src.models for convenience
from src.models import CompanySQL, JobSQL, LibrarySalaryParser, SalaryContext

__all__ = [
    "JobPosting",
    "JobScrapeRequest",
    "JobScrapeResult",
    "JobSite",
    "JobType",
    "LocationType",
    "CompanySQL",
    "JobSQL",
    "LibrarySalaryParser",
    "SalaryContext",
]