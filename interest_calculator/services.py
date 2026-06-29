from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from math import ceil

PROJECTION_YEARS = 50


@dataclass(frozen=True)
class MonthlyDataPoint:
    month: int
    year: int
    balance: float


@dataclass(frozen=True)
class SavingsProjection:
    monthly_data: list[MonthlyDataPoint]
    final_balance: float


def _round_currency(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calculate_savings_projection(
    initial_amount: float,
    monthly_deposit: float,
    annual_interest_rate: float,
) -> SavingsProjection:
    monthly_rate = annual_interest_rate / 12 / 100
    total_months = PROJECTION_YEARS * 12

    balance = initial_amount
    data_points: list[MonthlyDataPoint] = []

    for month in range(1, total_months + 1):
        balance = (balance + monthly_deposit) * (1 + monthly_rate)
        data_points.append(
            MonthlyDataPoint(
                month=month,
                year=ceil(month / 12),
                balance=_round_currency(balance),
            )
        )

    return SavingsProjection(
        monthly_data=data_points,
        final_balance=data_points[-1].balance if data_points else 0.0,
    )
