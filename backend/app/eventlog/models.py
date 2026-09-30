"""
Pydantic v2 models mirroring schemas/recommendation_event.schema.json exactly.
These are the canonical Python types for the append-only event log.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Shared primitives ──────────────────────────────────────────────────────

SourceTag = Literal["real", "simulated", "satellite", "api", "farmer_reported"]


class InputComponent(BaseModel):
    """One tagged signal channel (soil_moisture, weather_stress, etc.)."""
    value: Optional[float]
    unit: Optional[str] = None
    source: SourceTag
    observed_at: Optional[datetime] = None


# ── Payload variants ───────────────────────────────────────────────────────

class RevenueAssumptions(BaseModel):
    price_source: str
    price_observed_at: Optional[datetime] = None
    yield_baseline: str
    risk_discount_rate: float
    estimated: Literal[True] = True


class RevenuePayload(BaseModel):
    formula_version: str
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    expected_yield_kg: Optional[float] = None
    grade_adjusted_price_per_kg: Optional[float] = None
    action_cost: Optional[float] = None
    risk_discount: Optional[float] = None
    net_impact: float
    loss_if_ignored: Optional[float] = None
    confidence: float = Field(default=1.0, ge=0, le=1)
    assumptions: RevenueAssumptions


class CropConditionComponents(BaseModel):
    soil_moisture: Optional[InputComponent] = None
    weather_stress: Optional[InputComponent] = None
    photo_health: Optional[InputComponent] = None
    ndvi: Optional[InputComponent] = None


class CropConditionPayload(BaseModel):
    score: float = Field(ge=0, le=100)
    components: CropConditionComponents = Field(default_factory=CropConditionComponents)


class ActionPayload(BaseModel):
    template_key: str
    params: Optional[dict[str, Any]] = None
    act_by: Optional[datetime] = None
    reference: Optional[str] = None


class GuardrailPayload(BaseModel):
    ruleset: str
    pre: Literal["pass", "block"]
    post: Literal["pass", "modified", "block"]
    rules_triggered: list[str] = Field(default_factory=list)


AgentEnum = Literal[
    "soil", "weather", "market", "disease", "scheme",
    "irrigation", "harvest", "grading", "regenerative", "satellite", "orchestrator"
]
CategoryEnum = Literal[
    "irrigate", "fertilize", "spray", "cover", "harvest",
    "grade", "sell", "hold", "scheme", "regenerative", "do_nothing"
]


class RecommendationPayload(BaseModel):
    agent: AgentEnum
    category: CategoryEnum
    is_do_nothing: bool
    crop: Optional[str] = None
    crop_condition: CropConditionPayload
    revenue: RevenuePayload
    action: ActionPayload
    guardrail: GuardrailPayload
    model_versions: Optional[dict[str, str]] = None


class DeliveryPayload(BaseModel):
    channel: Literal["chat", "voice", "sms", "whatsapp"]
    language: str
    status: Literal["queued", "sent", "delivered", "failed"]
    provider_ref: Optional[str] = None


class ResponsePayload(BaseModel):
    acted: Literal["yes", "partial", "no", "unknown"]
    reason: Optional[str] = None
    reported_via: Optional[Literal["sms_reply", "whatsapp_reply", "chat", "sensor_inferred"]] = None


class OutcomePayload(BaseModel):
    measured_at: datetime
    method: Literal["sensor_delta", "ndvi_delta", "sale_record", "farmer_reported"]
    realized_impact: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


EventPayload = RecommendationPayload | DeliveryPayload | ResponsePayload | OutcomePayload

EventTypeEnum = Literal["recommendation", "delivery", "response", "outcome"]


# ── Envelope ───────────────────────────────────────────────────────────────

class EventEnvelope(BaseModel):
    """
    Top-level container.  Denormalised scalar fields mirror the SQL columns
    so the store can write them without unpacking the payload.
    """
    event_id: Optional[UUID] = None           # assigned by the DB on insert
    schema_version: Literal["1.0.0"] = "1.0.0"
    event_type: EventTypeEnum
    parent_event_id: Optional[UUID] = None
    country: str = Field(pattern=r"^[A-Z]{2}$")
    farm_id: str
    plot_id: Optional[str] = None
    occurred_at: Optional[datetime] = None    # assigned by DB DEFAULT if None

    # Denormalised columns (recommendation events only; null for other types)
    agent: Optional[str] = None
    category: Optional[str] = None
    is_do_nothing: Optional[bool] = None
    net_impact: Optional[float] = None
    currency: Optional[str] = None

    payload: dict[str, Any]                   # stored as JSONB; validated externally

    @field_validator("parent_event_id", mode="before")
    @classmethod
    def check_parent_rule(cls, v: Any, info: Any) -> Any:
        """
        The CHECK constraint in SQL enforces:
          (event_type = 'recommendation') = (parent_event_id IS NULL)
        Mirror it here so we catch it before hitting the DB.
        """
        return v

    def validate_parent_constraint(self) -> None:
        """Call explicitly after construction if you need the cross-field check."""
        is_rec = self.event_type == "recommendation"
        has_parent = self.parent_event_id is not None
        if is_rec and has_parent:
            raise ValueError("recommendation events must have parent_event_id = NULL")
        if not is_rec and not has_parent:
            raise ValueError(f"{self.event_type} events require a parent_event_id")
