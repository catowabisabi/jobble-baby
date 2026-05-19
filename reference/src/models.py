"""Database models for companies and jobs in the AI Job Scraper.

This module contains SQLModel classes representing database entities:
- CompanySQL: Company information with scraping statistics
- JobSQL: Job postings with application tracking and salary parsing

The salary parsing functionality has been extracted to src/utils/salary_parser.py.
"""

# Fix for SQLAlchemy table redefinition issue during Streamlit reruns
# This addresses the "Table already defined for this MetaData instance" error
# that occurs when clicking the Stop button during scraping operations
from __future__ import annotations

import hashlib
import logging

from datetime import UTC, datetime

from pydantic import (
    computed_field,
    field_validator,
    model_validator,
)
from sqlalchemy.types import JSON
from sqlmodel import Column, Field, SQLModel

from src.core_utils import ensure_timezone_aware
from src.utils.salary_parser import (
    LibrarySalaryParser,
    SalaryContext,
    SalaryTuple,
    SimplePrice,
)

# Re-export for backwards compatibility
_UP_TO_PATTERN = LibrarySalaryParser._UP_TO_PATTERN if hasattr(LibrarySalaryParser, '_UP_TO_PATTERN') else None
_FROM_PATTERN = LibrarySalaryParser._FROM_PATTERN if hasattr(LibrarySalaryParser, '_FROM_PATTERN') else None
_CURRENCY_PATTERN = LibrarySalaryParser._CURRENCY_PATTERN if hasattr(LibrarySalaryParser, '_CURRENCY_PATTERN') else None
_RANGE_K_PATTERN = LibrarySalaryParser._RANGE_K_PATTERN if hasattr(LibrarySalaryParser, '_RANGE_K_PATTERN') else None
_BOTH_K_PATTERN = LibrarySalaryParser._BOTH_K_PATTERN if hasattr(LibrarySalaryParser, '_BOTH_K_PATTERN') else None
_ONE_SIDED_K_PATTERN = LibrarySalaryParser._ONE_SIDED_K_PATTERN if hasattr(LibrarySalaryParser, '_ONE_SIDED_K_PATTERN') else None
_NUMBER_PATTERN = LibrarySalaryParser._NUMBER_PATTERN if hasattr(LibrarySalaryParser, '_NUMBER_PATTERN') else None
_HOURLY_PATTERN = LibrarySalaryParser._HOURLY_PATTERN if hasattr(LibrarySalaryParser, '_HOURLY_PATTERN') else None
_MONTHLY_PATTERN = LibrarySalaryParser._MONTHLY_PATTERN if hasattr(LibrarySalaryParser, '_MONTHLY_PATTERN') else None
_PHRASES_TO_REMOVE = LibrarySalaryParser._PHRASES_TO_REMOVE if hasattr(LibrarySalaryParser, '_PHRASES_TO_REMOVE') else []

# Logger for salary parsing operations
salary_logger = logging.getLogger(__name__)

# Time-based conversion constants - configurable for different work patterns
DEFAULT_WEEKLY_HOURS = 40
DEFAULT_WORKING_WEEKS_PER_YEAR = 52
DEFAULT_MONTHS_PER_YEAR = 12
DEFAULT_LOCALE = "en_US"


class CompanySQL(SQLModel, table=True):
    """SQLModel for company records with hybrid properties for computed fields.

    Attributes:
        id: Primary key identifier.
        name: Company name.
        url: Company careers URL.
        active: Flag indicating if the company is active for scraping.
        last_scraped: Timestamp of the last successful scrape.
        scrape_count: Total number of scrapes performed for this company.
        success_rate: Success rate of scraping attempts (0.0 to 1.0).
    """

    __table_args__ = {"extend_existing": True}

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)  # Explicit index for name
    url: str
    active: bool = Field(default=True, index=True)  # Index for active status filtering
    last_scraped: datetime | None = Field(
        default=None,
        index=True,
        description="Timezone-aware datetime (UTC)",
    )  # Index for scraping recency
    scrape_count: int = Field(default=0)
    success_rate: float = Field(default=1.0)

    # Note: Relationship temporarily disabled due to SQLAlchemy configuration

    @computed_field
    @property
    def total_jobs_count(self) -> int:
        """Calculate total number of jobs."""
        jobs = getattr(self, "jobs", None)
        if not jobs or not isinstance(jobs, list):
            return 0
        return len(jobs)

    @computed_field
    @property
    def active_jobs_count(self) -> int:
        """Calculate number of active (non-archived) jobs."""
        jobs = getattr(self, "jobs", None)
        if not jobs or not isinstance(jobs, list):
            return 0
        return len([j for j in jobs if not getattr(j, "archived", False)])

    @computed_field
    @property
    def last_job_posted(self) -> datetime | None:
        """Find most recent job posting date."""
        jobs = getattr(self, "jobs", None)
        if not jobs:
            return None
        job_dates = [job.posted_date for job in jobs if job.posted_date is not None]
        return max(job_dates) if job_dates else None

    @field_validator("last_scraped", mode="before")
    @classmethod
    def ensure_timezone_aware(cls, v) -> datetime | None:
        """Ensure datetime is timezone-aware (UTC) - uses shared utility."""
        return ensure_timezone_aware(v)


class JobSQL(SQLModel, table=True):
    """SQLModel for job records with hybrid properties and computed fields.

    Attributes:
        id: Primary key identifier.
        company_id: Foreign key reference to CompanySQL.
        title: Job title.
        description: Job description.
        link: Application link.
        location: Job location.
        posted_date: Date the job was posted.
        salary: Tuple of (min, max) salary values.
        favorite: Flag if the job is favorited.
        notes: User notes for the job.
        content_hash: Hash of job content for duplicate detection.
        application_status: Current status of the job application.
        application_date: Date when application was submitted.
        archived: Flag indicating if the job is archived (soft delete).
    """

    model_config = {"validate_assignment": True}
    __table_args__ = {"extend_existing": True}

    id: int | None = Field(default=None, primary_key=True)
    company_id: int | None = Field(
        default=None,
        foreign_key="companysql.id",
        index=True,  # Index for foreign key queries
    )
    title: str = Field(index=True)  # Index for title searches
    description: str
    link: str = Field(unique=True)
    location: str = Field(index=True)  # Index for location filtering
    posted_date: datetime | None = Field(
        default=None,
        index=True,
    )  # Index for date filtering
    salary: tuple[int | None, int | None] = Field(
        default=(None, None),
        sa_column=Column(JSON),
    )
    favorite: bool = Field(default=False, index=True)  # Index for favorites filtering
    notes: str = ""
    content_hash: str = Field(default="", index=True)
    application_status: str = Field(default="New", index=True)
    application_date: datetime | None = None
    archived: bool = Field(default=False, index=True)
    last_seen: datetime | None = Field(
        default=None,
        index=True,
        description="Timezone-aware datetime (UTC)",
    )  # Index for stale job queries

    # Note: Relationship temporarily disabled due to SQLAlchemy configuration

    @property
    def company(self) -> str:
        """Get company name from relationship."""
        # Since relationships are temporarily disabled, we need to fetch manually
        if not self.company_id:
            return "Unknown"

        # Import here to avoid circular imports
        from sqlmodel import select

        try:
            # Get the session from SQLAlchemy instance state
            instance_state = getattr(self, "_sa_instance_state", None)
            if instance_state and instance_state.session:
                session = instance_state.session
                result = session.exec(
                    select(CompanySQL.name).where(CompanySQL.id == self.company_id)
                )
                company_name = result.first()
                return company_name if company_name else "Unknown"
        except Exception:
            # Expected: Database lookup may fail when session is not available
            # This is intentional fallback behavior
            return "Unknown"

        # Fallback - this should be handled by the service layer instead
        return "Unknown"

    @computed_field
    @property
    def salary_range_display(self) -> str:
        """Format salary range for display."""
        from src.ui.utils import format_salary_range

        return format_salary_range(self.salary)

    @computed_field
    @property
    def days_since_posted(self) -> int | None:
        """Calculate days since job was posted."""
        if self.posted_date is None:
            return None
        now = datetime.now(UTC)
        # Ensure timezone compatibility
        posted_date = self.posted_date
        if posted_date.tzinfo is None:
            # If posted_date is naive, assume it's UTC
            posted_date = posted_date.replace(tzinfo=UTC)
        return (now - posted_date).days

    @computed_field
    @property
    def is_recently_posted(self) -> bool:
        """Check if job was posted within 7 days."""
        if self.posted_date is None:
            return False
        now = datetime.now(UTC)
        # Ensure timezone compatibility
        posted_date = self.posted_date
        if posted_date.tzinfo is None:
            # If posted_date is naive, assume it's UTC
            posted_date = posted_date.replace(tzinfo=UTC)
        return (now - posted_date).days <= 7

    @model_validator(mode="before")
    @classmethod
    def generate_content_hash(cls, data):
        """Auto-generate content hash from job content if not provided.

        Creates a deterministic hash from title, description, and link
        to enable duplicate detection and content fingerprinting.
        """
        # Convert object to dict if needed
        if not isinstance(data, dict):
            return data

        # Only generate if content_hash is not provided or is empty
        if not data.get("content_hash"):
            title = data.get("title", "")
            description = data.get("description", "")
            link = data.get("link", "")

            # Create deterministic content string from key job fields
            content = f"{title}|{description}|{link}"

            # Generate MD5 hash (acceptable for non-cryptographic fingerprinting)
            generated_hash = hashlib.md5(content.encode("utf-8")).hexdigest()
            data["content_hash"] = generated_hash

        return data

    @field_validator("posted_date", "application_date", "last_seen", mode="before")
    @classmethod
    def ensure_datetime_timezone_aware(cls, v) -> datetime | None:
        """Ensure datetime fields are timezone-aware (UTC) using Pendulum."""
        if v is None:
            return None
        if isinstance(v, str):
            # Use Pendulum to parse various string formats to UTC datetime
            parsed_dt = cls._parse_string_to_utc_datetime(v)
            if parsed_dt:
                return parsed_dt
        if isinstance(v, datetime):
            return cls._convert_datetime_to_utc(v)
        return None

    @staticmethod
    def _parse_string_to_utc_datetime(v: str) -> datetime | None:
        """Parse string to UTC datetime using standard library."""
        try:
            # Try ISO format first
            parsed = datetime.fromisoformat(v.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            # Try parsing date-only strings
            try:
                # Try common date formats with timezone awareness
                for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"]:
                    try:
                        return datetime.strptime(v, fmt).replace(tzinfo=UTC)
                    except ValueError:  # noqa: S112
                        # Expected: Try next date format if this one fails
                        continue
            except Exception:
                salary_logger.debug("Failed to parse date string: %s", v)
        return None

    @staticmethod
    def _convert_datetime_to_utc(v: datetime) -> datetime:
        """Convert datetime to UTC using standard library."""
        if v.tzinfo:
            # Convert to UTC
            return v.astimezone(UTC)
        # Assume naive datetime is UTC
        return v.replace(tzinfo=UTC)

    @field_validator("salary", mode="before")
    @classmethod
    def parse_salary(cls, value: str | SalaryTuple | None) -> SalaryTuple:
        """Parse salary string into (min, max) tuple using library-first approach.

        This method uses price-parser and babel libraries for robust parsing,
        with custom logic only for salary-specific patterns.

        Handles various salary formats including:
        - Range formats: "$100k-150k", "£80,000 - £120,000", "110k to 150k"
        - Single values: "$120k", "150000", "up to $150k", "from $110k"
        - Currency symbols: $, £, €, ¥, ¢, ₹
        - Suffixes: k, K (for thousands)
        - Common phrases: "per year", "per annum", "up to", "from", "starting at"
        - Time-based rates: "$50 per hour", "£5000 per month"

        Args:
            value: Salary input as string, tuple, or None.

        Returns:
            tuple[int | None, int | None]: Parsed (min, max) salaries.
                For ranges: (min_salary, max_salary)
                For single values: (salary, salary) for exact matches,
                                  (salary, None) for "from" patterns,
                                  (None, salary) for "up to" patterns
        """
        # Handle tuple inputs directly
        if isinstance(value, tuple) and len(value) == 2:
            return value

        # Handle list inputs (convert to tuple)
        if isinstance(value, list) and len(value) == 2:
            return tuple(value)

        # Handle None or empty string inputs
        if value is None or not isinstance(value, str) or value.strip() == "":
            return (None, None)

        # Use the new library-first parser
        return LibrarySalaryParser.parse_salary_text(value.strip())

    @classmethod
    def create_validated(cls, **data) -> JobSQL:
        """Create a JobSQL instance with proper Pydantic validation.

        This factory method ensures that Pydantic validators (including model_validator)
        are executed properly, working around the SQLAlchemy + Pydantic v2 integration
        issue.

        Args:
            **data: Job data to validate and create instance from.

        Returns:
            JobSQL: Validated JobSQL instance with content_hash generated.

        Example:
            job = JobSQL.create_validated(
                title="Software Engineer",
                description="Great role...",
                link="https://example.com/job/123"
            )
        """
        # Step 1: Use Pydantic's validation on the raw data
        validated_data = cls.model_validate(data)

        # Step 2: Extract the validated data and create SQLModel instance
        clean_data = validated_data.model_dump()

        # Step 3: Create the actual table instance (bypasses validation but uses
        # clean data)
        return cls(**clean_data)
