import json
from dataclasses import dataclass
from typing import Any

MAX_INITIAL_AMOUNT = 10_000_000
MAX_MONTHLY_DEPOSIT = 100_000
MAX_INTEREST_RATE = 100.0

_FIELDS: tuple[tuple[str, float], ...] = (
    ("initial_amount", MAX_INITIAL_AMOUNT),
    ("monthly_deposit", MAX_MONTHLY_DEPOSIT),
    ("annual_interest_rate", MAX_INTEREST_RATE),
)


@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    errors: dict[str, str]
    data: dict[str, float] | None = None


def validate_projection_inputs(body: bytes) -> ValidationResult:
    try:
        payload = json.loads(body)
    except (json.JSONDecodeError, ValueError):
        return ValidationResult(is_valid=False, errors={"body": "Request body must be valid JSON."})

    if not isinstance(payload, dict):
        return ValidationResult(is_valid=False, errors={"body": "Request body must be a JSON object."})

    errors: dict[str, str] = {}
    validated: dict[str, float] = {}

    for field, max_value in _FIELDS:
        result = _validate_field(payload, field, max_value)
        if isinstance(result, str):
            errors[field] = result
        else:
            validated[field] = result

    if errors:
        return ValidationResult(is_valid=False, errors=errors)

    return ValidationResult(is_valid=True, errors={}, data=validated)


def _validate_field(payload: dict[str, Any], field: str, max_value: float) -> float | str:
    if field not in payload:
        return f"'{field}' is required."

    value = payload[field]
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return f"'{field}' must be a number."

    value = float(value)

    if value < 0:
        return f"'{field}' must be greater than or equal to 0."

    if value > max_value:
        return f"'{field}' must not exceed {max_value:,}."

    return value
