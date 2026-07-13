from __future__ import annotations

from dataclasses import dataclass

from .repository import AutonomyRepository


class BudgetError(RuntimeError):
    pass


@dataclass(frozen=True)
class BudgetStatus:
    daily_spend: float
    monthly_spend: float
    daily_limit: float
    monthly_limit: float
    remaining_daily: float
    remaining_monthly: float


class BudgetGuard:
    def __init__(self, repository: AutonomyRepository, limits: dict):
        self.repository = repository
        self.limits = limits

    def status(self) -> BudgetStatus:
        daily = self.repository.daily_spend()
        monthly = self.repository.monthly_spend()
        daily_limit = float(self.limits["daily_budget_usd"])
        monthly_limit = float(self.limits["monthly_budget_usd"])
        return BudgetStatus(
            daily_spend=daily,
            monthly_spend=monthly,
            daily_limit=daily_limit,
            monthly_limit=monthly_limit,
            remaining_daily=max(0.0, daily_limit - daily),
            remaining_monthly=max(0.0, monthly_limit - monthly),
        )

    def assert_cycle_allowed(self, reserve_usd: float = 0.0) -> None:
        status = self.status()
        if status.daily_limit <= 0 or status.monthly_limit <= 0:
            raise BudgetError("Autonomy budget is disabled")
        if reserve_usd > status.remaining_daily:
            raise BudgetError(
                f"Daily model budget would be exceeded: ${status.daily_spend:.2f} spent of ${status.daily_limit:.2f}"
            )
        if reserve_usd > status.remaining_monthly:
            raise BudgetError(
                f"Monthly model budget would be exceeded: ${status.monthly_spend:.2f} spent of ${status.monthly_limit:.2f}"
            )
