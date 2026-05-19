"""Salary parsing utilities using price-parser and standard library.

This module provides a library-first approach to salary parsing, leveraging:
- price-parser: For currency extraction and basic price parsing
- Standard library: For decimal parsing
- Custom logic: Only for salary-specific patterns (k-suffix, ranges, context)

The module extracts salary parsing logic from the original models.py to enable
cleaner separation of concerns.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import List, Tuple, Union

from price_parser import Price

# Type aliases for better readability
SalaryTuple = Tuple[Union[int, None], Union[int, None]]

# Time-based conversion constants - configurable for different work patterns
DEFAULT_WEEKLY_HOURS = 40
DEFAULT_WORKING_WEEKS_PER_YEAR = 52
DEFAULT_MONTHS_PER_YEAR = 12
DEFAULT_LOCALE = "en_US"


@dataclass(frozen=True)
class SalaryContext:
    """Context flags for salary parsing."""

    is_up_to: bool = False
    is_from: bool = False
    is_hourly: bool = False
    is_monthly: bool = False


@dataclass(frozen=True)
class SimplePrice:
    """Simple Price-like object for consistent price representation."""

    amount: Decimal


# Compiled regex patterns for salary parsing
_UP_TO_PATTERN: re.Pattern = re.compile(
    r"\b(?:up\s+to|maximum\s+of|max\s+of|not\s+more\s+than)\b",
    re.IGNORECASE,
)
_FROM_PATTERN: re.Pattern = re.compile(
    r"\b(?:from|starting\s+at|minimum\s+of|min\s+of|at\s+least)\b",
    re.IGNORECASE,
)
_CURRENCY_PATTERN: re.Pattern = re.compile(r"[£$€¥¢₹]")
# Pattern for shared k suffix at end: "100-120k"
_RANGE_K_PATTERN: re.Pattern = re.compile(
    r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*([kK])",
)
# Pattern for both numbers with k: "100k-150k"
_BOTH_K_PATTERN: re.Pattern = re.compile(
    r"(\d+(?:\.\d+)?)([kK])\s*-\s*(\d+(?:\.\d+)?)([kK])",
)
# Pattern for one-sided k: "100k-120" (k on first number only)
_ONE_SIDED_K_PATTERN: re.Pattern = re.compile(
    r"(\d+(?:\.\d+)?)([kK])\s*-\s*(\d+(?:\.\d+)?)(?!\s*[kK])",
)
_NUMBER_PATTERN: re.Pattern = re.compile(r"(\d+(?:\.\d+)?)\s*([kK])?")
_HOURLY_PATTERN: re.Pattern = re.compile(
    r"\b(?:per\s+hour|hourly|/hour|/hr)\b",
    re.IGNORECASE,
)
_MONTHLY_PATTERN: re.Pattern = re.compile(
    r"\b(?:per\s+month|monthly|/month|/mo)\b",
    re.IGNORECASE,
)

_PHRASES_TO_REMOVE: List[str] = [
    r"\b(?:per\s+year|per\s+annum|annually|yearly|p\.?a\.?|/year|/yr)\b",
    r"\b(?:gross|net|before\s+tax|after\s+tax)\b",
    r"\b(?:plus\s+benefits?|\+\s*benefits?)\b",
    r"\b(?:negotiable|neg\.?|ono|o\.?n\.?o\.?)\b",
    r"\b(?:depending\s+on\s+experience|doe)\b",
]

# Logger for salary parsing operations
salary_logger = logging.getLogger(__name__)


class LibrarySalaryParser:
    """Library-first salary parser using price-parser and standard library.

    This class implements a modern approach to salary parsing by leveraging:
    - price-parser: For currency extraction and basic price parsing
    - Standard library: For decimal parsing
    - Custom logic: Only for salary-specific patterns (k-suffix, ranges, context)

    This replaces ~200 lines of regex-based parsing with library-first implementation.
    """

    @staticmethod
    def _parse_decimal_standard(text: str) -> Decimal:
        """Parse decimal using standard library, replacing babel functionality."""
        # Clean text for decimal parsing - remove separators but keep decimals
        cleaned = re.sub(r"[^\d.,\-+]", "", text)
        # Handle common formats like 1,000.50 or 1000.50
        if "," in cleaned and "." in cleaned:
            # Assume comma is thousands separator if it comes before dot
            if cleaned.rfind(",") < cleaned.rfind("."):
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            # Could be decimal separator (European) or thousands separator
            # If there are more than 3 digits after comma, likely thousands separator
            comma_parts = cleaned.split(",")
            if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
                # Likely decimal separator
                cleaned = cleaned.replace(",", ".")
            else:
                # Likely thousands separator
                cleaned = cleaned.replace(",", "")
        return Decimal(cleaned)

    @staticmethod
    def _parse_number_standard(text: str) -> int:
        """Parse integer using standard library, replacing babel functionality."""
        # Remove all non-digits except minus sign
        cleaned = re.sub(r"[^\d\-]", "", text)
        return int(cleaned) if cleaned and cleaned != "-" else 0

    @staticmethod
    def parse_salary_text(text: str) -> SalaryTuple:
        """Parse salary text using library-first approach.

        Args:
            text: Raw salary text to parse

        Returns:
            Tuple[int | None, int | None]: Parsed (min, max) salary values
        """
        if not text or not text.strip():
            return (None, None)

        original_text = text.strip()
        salary_logger.debug("Parsing salary text: %s", original_text)

        # Detect contextual patterns first
        context = LibrarySalaryParser._detect_context(original_text)

        # Try range parsing first (most specific)
        result = LibrarySalaryParser._parse_salary_range(original_text, context)
        if result != (None, None):
            return result

        # Try single value parsing
        result = LibrarySalaryParser._parse_single_salary(original_text, context)
        if result != (None, None):
            return result

        salary_logger.debug("Could not parse salary: %s", original_text)
        return (None, None)

    @staticmethod
    def _detect_context(text: str) -> SalaryContext:
        """Detect contextual patterns for salary parsing."""
        return SalaryContext(
            is_up_to=bool(_UP_TO_PATTERN.search(text)),
            is_from=bool(_FROM_PATTERN.search(text)),
            is_hourly=bool(_HOURLY_PATTERN.search(text)),
            is_monthly=bool(_MONTHLY_PATTERN.search(text)),
        )

    @staticmethod
    def _parse_salary_range(text: str, context: SalaryContext) -> SalaryTuple:
        """Parse salary ranges using k-suffix patterns and price-parser."""
        # Handle k-suffix ranges first (most salary-specific)
        k_range = LibrarySalaryParser._parse_k_suffix_ranges(text)
        if k_range:
            min_val, max_val = k_range
            converted_values = LibrarySalaryParser._convert_time_based_salary(
                [min_val, max_val],
                context.is_hourly,
                context.is_monthly,
            )
            return (converted_values[0], converted_values[1])

        # Try extracting multiple price objects for ranges
        prices = LibrarySalaryParser._extract_multiple_prices(text)
        if len(prices) >= 2:
            # Convert to annual if needed and return range
            values = [int(price.amount) for price in prices if price.amount]
            if values:
                converted_values = LibrarySalaryParser._convert_time_based_salary(
                    values,
                    context.is_hourly,
                    context.is_monthly,
                )
                return (min(converted_values), max(converted_values))

        return (None, None)

    @staticmethod
    def _parse_single_salary(text: str, context: SalaryContext) -> SalaryTuple:
        """Parse single salary values using price-parser."""
        # First check for k-suffix patterns and handle them specially
        k_match = re.search(r"(\d+(?:\.\d+)?)\s*[kK]\b", text)
        if k_match:
            try:
                # Use float conversion to preserve decimal precision for k-suffix
                base_value = float(k_match.group(1))
                value = int(base_value * 1000)

                # Convert time-based to annual and apply context
                converted_values = LibrarySalaryParser._convert_time_based_salary(
                    [value],
                    context.is_hourly,
                    context.is_monthly,
                )
                final_value = converted_values[0]
                return LibrarySalaryParser._apply_context_logic(final_value, context)
            except (ValueError, TypeError):  # noqa: S110
                # Expected: Continue to next parsing method if number conversion fails
                pass

        # Try price-parser for non-k-suffix cases
        try:
            price = Price.fromstring(text)
            if price.amount:
                value = int(price.amount)

                # Convert time-based to annual and apply context
                converted_values = LibrarySalaryParser._convert_time_based_salary(
                    [value],
                    context.is_hourly,
                    context.is_monthly,
                )
                final_value = converted_values[0]
                return LibrarySalaryParser._apply_context_logic(final_value, context)
        except (ValueError, TypeError, AttributeError) as e:
            salary_logger.debug("Price parser failed for '%s': %s", text, e)

        # Fallback to babel-based number extraction
        return LibrarySalaryParser._parse_with_babel_fallback(text, context)

    @staticmethod
    def _extract_multiple_prices(text: str) -> List[Price]:
        """Extract multiple price objects from text for range detection.

        Uses context-aware filtering to avoid interpreting unrelated numbers
        as salary values (e.g., bonuses, years, other figures).
        """
        prices: List[Price] = []

        # First check if text contains salary-specific range indicators
        has_range_indicators = bool(
            re.search(r"range|to|between|from|up to", text, re.IGNORECASE)
            or re.search(r"[-\u2013\u2014]", text)  # Various dash types
            or re.search(
                r"\d+[.,]?\d*\s*[kK]?\s*[-\u2013\u2014]\s*\d+[.,]?\d*\s*[kK]?",
                text,
            ),  # Numeric range patterns
        )

        if not has_range_indicators:
            # Without clear range indicators, be conservative
            return prices

        # Split text on common range separators and try parsing each part
        parts = re.split(
            r"\s*[-\u2013\u2014]\s*|\s+to\s+|\s+between\s+",
            text,
            flags=re.IGNORECASE,
        )

        # Filter parts that likely contain salary values
        valid_parts: List[str] = []
        for raw_part in parts:
            part = raw_part.strip()
            # Skip parts that are too short or don't contain numbers
            if len(part) < 2 or not re.search(r"\d", part):
                continue
            # Skip parts that contain non-salary keywords that would confuse parsing
            # Only exclude very specific non-salary terms that appear with numbers
            if re.search(
                r"\b(bonus|equity|stock|rsu)\b.*\d|\d.*\b(bonus|equity|stock|rsu)\b",
                part,
                re.IGNORECASE,
            ):
                continue
            valid_parts.append(part)

        # Only proceed if we have 2-3 reasonable parts (range boundaries)
        if not 2 <= len(valid_parts) <= 3:
            return prices

        for raw_part in valid_parts:
            part = raw_part.strip()

            # Handle k-suffix parts specially with decimal precision preservation
            k_match = re.search(r"(\d+(?:\.\d+)?)\s*[kK]\b", part)
            if k_match:
                try:
                    # Use float conversion to preserve decimal precision for k-suffix
                    base_value = float(k_match.group(1))
                    amount = base_value * 1000
                    # Create a consistent Price-like object
                    price = SimplePrice(amount=Decimal(str(amount)))
                    prices.append(price)
                    continue
                except (ValueError, TypeError) as e:
                    salary_logger.debug(
                        "K-suffix parsing failed for part '%s': %s",
                        part,
                        e,
                    )

            # Try normal price parsing
            try:
                price = Price.fromstring(part)
                # For ranges, be more flexible with thresholds
                # Values like 85.75 could be 85750 (implied thousands)
                if price.amount and (
                    price.amount >= 1000 or (price.amount >= 10 and price.amount < 1000)
                ):
                    prices.append(price)
            except (ValueError, TypeError, AttributeError) as e:
                salary_logger.debug("Failed to parse price from part '%s': %s", part, e)
                continue

        return prices

    @staticmethod
    def _parse_k_suffix_ranges(text: str) -> Tuple[int, int] | None:
        """Parse k-suffix ranges like '100-120k', '100k-150k', '110k to 150k'."""
        # Try "to" patterns with k-suffix first
        to_pattern = re.search(
            r"(\d+(?:\.\d+)?)\s*[kK]\s+to\s+(\d+(?:\.\d+)?)\s*[kK]",
            text,
            re.IGNORECASE,
        )
        if to_pattern:
            try:
                # Use float conversion to preserve decimal precision
                float_val1 = float(to_pattern.group(1))
                float_val2 = float(to_pattern.group(2))
                val1 = int(float_val1 * 1000)
                val2 = int(float_val2 * 1000)
                return (min(val1, val2), max(val1, val2))
            except (ValueError, TypeError) as e:
                salary_logger.debug("To-pattern k-suffix parsing failed: %s", e)

        # Try different k-suffix patterns
        patterns = [
            _RANGE_K_PATTERN,  # 100-120k
            _BOTH_K_PATTERN,  # 100k-150k
            _ONE_SIDED_K_PATTERN,  # 100k-120
        ]

        for pattern in patterns:
            if match := pattern.search(text):
                groups = match.groups()

                if pattern == _RANGE_K_PATTERN:  # 100-120k
                    num1, num2, _k_suffix = groups
                    # Use float conversion to preserve decimal precision for k-suffix
                    float_val1 = LibrarySalaryParser._safe_decimal_to_float(num1)
                    float_val2 = LibrarySalaryParser._safe_decimal_to_float(num2)
                    if float_val1 is not None and float_val2 is not None:
                        val1 = int(float_val1 * 1000)
                        val2 = int(float_val2 * 1000)
                    else:
                        continue
                elif pattern == _BOTH_K_PATTERN:  # 100k-150k
                    num1, _k1, num2, _k2 = groups
                    # Use float conversion to preserve decimal precision for k-suffix
                    float_val1 = LibrarySalaryParser._safe_decimal_to_float(num1)
                    float_val2 = LibrarySalaryParser._safe_decimal_to_float(num2)
                    if float_val1 is not None and float_val2 is not None:
                        val1 = int(float_val1 * 1000)
                        val2 = int(float_val2 * 1000)
                    else:
                        continue
                elif pattern == _ONE_SIDED_K_PATTERN:  # 100k-120
                    num1, _k_suffix, num2 = groups
                    # Use float conversion to preserve decimal precision for k-suffix
                    float_val1 = LibrarySalaryParser._safe_decimal_to_float(num1)
                    float_val2 = LibrarySalaryParser._safe_decimal_to_float(num2)
                    if float_val1 is not None and float_val2 is not None:
                        val1 = int(float_val1 * 1000)
                        val2 = int(float_val2 * 1000)  # Apply k to both
                    else:
                        continue

                if val1 and val2:
                    return (min(val1, val2), max(val1, val2))

        return None

    @staticmethod
    def _apply_k_suffix_multiplication(text: str, value: int) -> int:
        """Apply k-suffix multiplication if present."""
        # Check for k/K suffix in the text
        if re.search(r"\d+(?:\.\d+)?\s*[kK]\b", text):
            return value * 1000
        return value

    @staticmethod
    def _apply_context_logic(final_value: int, context: SalaryContext) -> SalaryTuple:
        """Apply context-based logic to determine salary tuple."""
        if context.is_up_to:
            return (None, final_value)
        if context.is_from:
            return (final_value, None)
        return (final_value, final_value)

    @staticmethod
    def _parse_with_babel_fallback(
        text: str,
        context: SalaryContext,
        locale: str = DEFAULT_LOCALE,  # noqa: ARG004
    ) -> SalaryTuple:
        """Fallback parsing using babel's number parsing.

        Args:
            text: Text to parse
            context: Salary context for conversion
            locale: Locale for number parsing (default: en_US)
        """
        try:
            # Clean text for standard parsing
            cleaned = LibrarySalaryParser._clean_text_for_babel(text)

            # Try parsing as decimal first
            try:
                amount = LibrarySalaryParser._parse_decimal_standard(cleaned)
                value = int(amount)

                # Apply k-suffix if present
                value = LibrarySalaryParser._apply_k_suffix_multiplication(text, value)

                # Convert time-based and apply context
                converted_values = LibrarySalaryParser._convert_time_based_salary(
                    [value],
                    context.is_hourly,
                    context.is_monthly,
                )
                final_value = converted_values[0]
                return LibrarySalaryParser._apply_context_logic(final_value, context)

            except (InvalidOperation, ValueError):
                # Try as integer
                value = LibrarySalaryParser._parse_number_standard(cleaned)

                value = LibrarySalaryParser._apply_k_suffix_multiplication(text, value)

                converted_values = LibrarySalaryParser._convert_time_based_salary(
                    [value],
                    context.is_hourly,
                    context.is_monthly,
                )
                final_value = converted_values[0]
                return LibrarySalaryParser._apply_context_logic(final_value, context)

        except (InvalidOperation, ValueError) as e:
            salary_logger.debug("Standard library parsing failed for '%s': %s", text, e)

        return (None, None)

    @staticmethod
    def _clean_text_for_babel(text: str) -> str:
        """Clean text for babel number parsing.

        Updated to extract all relevant numeric sequences for range handling
        instead of only the first match.
        """
        # Remove currency symbols (babel doesn't need them)
        cleaned = _CURRENCY_PATTERN.sub("", text)

        # Remove common phrases but keep numeric content
        for pattern in _PHRASES_TO_REMOVE:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

        # Remove context patterns
        cleaned = _UP_TO_PATTERN.sub("", cleaned)
        cleaned = _FROM_PATTERN.sub("", cleaned)
        cleaned = _HOURLY_PATTERN.sub("", cleaned)
        cleaned = _MONTHLY_PATTERN.sub("", cleaned)

        # Clean up spacing
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Check if this looks like a range by finding multiple numbers
        number_matches = re.findall(r"[\d,./]+", cleaned)
        if len(number_matches) > 1:
            # For ranges, return the cleaned text with range separators
            # This allows babel to work on individual parts later
            return cleaned
        if number_matches:
            # For single values, return just the first number
            return number_matches[0].strip()

        return cleaned

    @staticmethod
    def _safe_decimal_to_int(
        value_str: str,
        locale: str = DEFAULT_LOCALE,  # noqa: ARG004
    ) -> int | None:
        """Safely convert decimal string to int using standard library.

        Args:
            value_str: String representation of decimal number
            locale: Locale for parsing (ignored, kept for compatibility)
        """
        try:
            decimal_val = LibrarySalaryParser._parse_decimal_standard(value_str)
            return int(decimal_val)
        except (InvalidOperation, ValueError, TypeError):
            return None

    @staticmethod
    def _safe_decimal_to_float(
        value_str: str,
        locale: str = DEFAULT_LOCALE,  # noqa: ARG004
    ) -> float | None:
        """Convert decimal string to float using standard library.

        This preserves decimal precision for k-suffix multiplication where
        '125.5k' should become 125500, not 125000.

        Args:
            value_str: String representation of decimal number
            locale: Locale for parsing (ignored, kept for compatibility)
        """
        try:
            decimal_val = LibrarySalaryParser._parse_decimal_standard(value_str)
            return float(decimal_val)
        except (InvalidOperation, ValueError, TypeError):
            return None

    @staticmethod
    def _convert_time_based_salary(
        values: Sequence[int],
        is_hourly: bool,
        is_monthly: bool,
        weekly_hours: int = DEFAULT_WEEKLY_HOURS,
        working_weeks_per_year: int = DEFAULT_WORKING_WEEKS_PER_YEAR,
    ) -> List[int]:
        """Convert time-based salary rates to annual values.

        Args:
            values: Sequence of salary values.
            is_hourly: If True, values are hourly rates.
            is_monthly: If True, values are monthly rates.
            weekly_hours: Number of working hours per week (default: 40).
            working_weeks_per_year: Number of working weeks per year (default: 52).

        Note:
            The default conversion assumes 40 hours/week and 52 working weeks/year
            for hourly rates. These can be customized via the weekly_hours and
            working_weeks_per_year parameters.
        """
        if is_hourly:
            # Convert hourly to annual: hourly * weekly_hours * working_weeks_per_year
            return [int(val * weekly_hours * working_weeks_per_year) for val in values]
        if is_monthly:
            # Convert monthly to annual: monthly * 12 months/year
            return [int(val * DEFAULT_MONTHS_PER_YEAR) for val in values]
        return list(values)