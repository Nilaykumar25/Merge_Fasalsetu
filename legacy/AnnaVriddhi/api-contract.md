# API Contract — Farm Revenue Copilot

Single source of truth for every endpoint the frontend consumes. Any change to a request/response shape must be reflected here in the same PR that makes the change.

Base URL (env-driven): `API_BASE_URL` — e.g. `http://localhost:4000/api` in dev.

All responses are JSON. All money fields are integers in paise (₹1 = 100) unless noted, to avoid float rounding issues — frontend formats for display.

---

## Shared enums (mirror in `shared/types`)

```
recommendation_type: "irrigate" | "fertilize" | "disease_alert" | "cover" | "harvest" | "grade_report" | "all_clear"
severity: "info" | "attention" | "urgent"
grade: "A" | "B" | "C"
delivery_channel: "sms" | "whatsapp" | "voice" | "app"
farmer_action: "done" | "not_now" | "ignored" | "partial"
```

---

## 1. Plot / Farm Setup

### `POST /plots`
Create a plot during onboarding.

Request:
```json
{
  "farmer_id": "string",
  "crop_type": "string",
  "land_size_acres": 2.5,
  "location": { "lat": 26.91, "lng": 75.78, "village": "string", "block": "string" },
  "language": "hi"
}
```

Response:
```json
{ "plot_id": "plot_123", "created_at": "2026-09-11T10:00:00Z" }
```

### `GET /plots/:plotId`
Returns plot basics (for Settings screen, edit flows).

---

## 2. Crop Condition Tracker

### `GET /plots/:plotId/crop-state`
Powers the Home Dashboard hero + gauges.

Response:
```json
{
  "plot_id": "plot_123",
  "status": "all_clear",            // "all_clear" | "attention" | "urgent"
  "status_message": "Your crop looks healthy",
  "moisture": { "value_pct": 42, "band": "ok" },        // band: "low" | "ok" | "good"
  "weather": { "icon": "sun", "summary": "Clear, 32°C" },
  "crop_stage": { "value_pct": 60, "label": "Flowering" },
  "last_updated": "2026-09-11T06:00:00Z",
  "last_photo_at": "2026-09-10T18:00:00Z"
}
```

### `GET /plots/:plotId/crop-state/history?range=30d`
For the Crop Condition Detail screen (trend view).

---

## 3. Recommendations & Alerts

### `GET /plots/:plotId/recommendations?active=true`
Returns the current recommendation(s). Home screen shows only the top one; Inbox screen shows all.

Response:
```json
{
  "recommendations": [
    {
      "id": "rec_456",
      "type": "irrigate",
      "severity": "attention",
      "title": "Water today",
      "detail": "Soil moisture is below optimal and no rain is forecast for 48 hours.",
      "revenue_impact_paise": 45000,
      "revenue_rationale": "Prevents yield loss from moisture stress at flowering stage",
      "created_at": "2026-09-11T06:00:00Z",
      "expires_at": "2026-09-12T06:00:00Z"
    }
  ]
}
```

### `POST /recommendations/:id/action`
Farmer marks a recommendation done / not now — also feeds the recommendation-event log for season review.

Request:
```json
{ "farmer_action": "done" }
```

Response: `{ "id": "rec_456", "farmer_action": "done", "recorded_at": "..." }`

### `GET /plots/:plotId/alerts?severity=urgent`
Disease/weather alerts specifically, for the Alert screen.

---

## 4. Irrigation

### `GET /plots/:plotId/irrigation`
Response:
```json
{
  "moisture_pct": 42,
  "band": "low",
  "recommendation": "irrigate",
  "reason": "No rain forecast in next 48h and moisture below crop threshold",
  "revenue_impact_paise": 45000
}
```

---

## 5. Grading (Produce Photo)

### `POST /grading/capture`
Multipart upload: image file + plot_id.

Response:
```json
{
  "grading_id": "grd_789",
  "grade": "B",
  "confidence": 0.82,
  "signals": { "size": "good", "color": "fair", "surface": "minor blemish" },
  "price_impact_note": "Grade B typically sells 10-15% below Grade A at mandi",
  "created_at": "2026-09-11T09:00:00Z"
}
```

### `GET /plots/:plotId/grading/history`
List for the Grading History screen — array of `{ grading_id, grade, thumbnail_url, created_at }`.

---

## 6. Harvest Window

### `GET /plots/:plotId/harvest-window`
Response:
```json
{
  "recommended_start": "2026-09-18",
  "recommended_end": "2026-09-21",
  "reason": "Balances crop maturity, clear weather window, and favorable mandi prices",
  "daily_forecast": [
    { "date": "2026-09-17", "icon": "rain", "risk": "high" },
    { "date": "2026-09-18", "icon": "sun", "risk": "low" }
  ],
  "revenue_impact_paise": 120000
}
```

---

## 7. Revenue Summary

### `GET /plots/:plotId/revenue-summary`
Response:
```json
{
  "season_total_paise": 850000,
  "basis": "Estimated value of guidance followed this season",
  "breakdown": [
    { "recommendation_id": "rec_456", "type": "irrigate", "impact_paise": 45000 },
    { "recommendation_id": "rec_789", "type": "harvest", "impact_paise": 120000 }
  ]
}
```

---

## 8. Government Scheme Matcher

### `GET /plots/:plotId/schemes`
Response:
```json
{
  "schemes": [
    {
      "scheme_id": "pmfby",
      "name": "Crop Insurance (PMFBY)",
      "value_note": "Covers up to ₹X per acre against crop loss",
      "deadline": "2026-09-30",
      "days_left": 19,
      "eligibility_summary": "Applies to your crop and land size in this state"
    }
  ]
}
```

### `GET /schemes/:schemeId`
Full detail: eligibility criteria list, required documents, application steps/contact.

---

## 9. Soil Health Card (SHC)

### `POST /plots/:plotId/shc/upload`
Multipart image upload for OCR extraction.

Response:
```json
{
  "extracted": {
    "n": 280, "p": 12, "k": 140, "ph": 6.8, "ec": 0.3, "oc": 0.5,
    "s": 10, "zn": 0.6, "b": 0.4, "fe": 4.5, "mn": 3.2, "cu": 0.8
  },
  "confidence": 0.9,
  "requires_confirmation": true
}
```

### `POST /plots/:plotId/shc/confirm`
Farmer-confirmed (or manually entered) final values, saved to plot record.

### `GET /plots/:plotId/shc/lookup`
Fallback when farmer has no card — location-based lookup.

Response: same shape as `extracted` above, plus `{ "source": "district_average" | "block_record" }`.

---

## 10. Season Review

### `GET /plots/:plotId/season-review?season=2026-kharif`
Response:
```json
{
  "season": "2026-kharif",
  "total_value_paise": 850000,
  "recommendations_followed": 14,
  "recommendations_total": 18,
  "comparisons": [
    {
      "recommendation": "Water on Sep 11",
      "action_taken": "done",
      "outcome": "Moisture stayed healthy through flowering"
    }
  ],
  "share_card_url": "https://.../season-review/plot_123.png"
}
```

---

## 11. Messaging / Delivery

### `GET /plots/:plotId/messages`
Inbox screen — chronological list of everything sent.

Response: array of `{ id, channel, body, sent_at, related_recommendation_id }`.

### `GET /plots/:plotId/sync-status`
Offline/Sync Status screen.

Response:
```json
{ "last_synced_at": "2026-09-11T06:00:00Z", "queued_messages": 1, "connectivity": "online" }
```

---

## 12. Chatbot

### `POST /chat`
Request: `{ "plot_id": "plot_123", "message": "when should I water?" }`
Response: `{ "reply": "string", "suggested_replies": ["string", "string"] }`

---

## Conventions for both sides

- Every list endpoint returns `{ items: [...], next_cursor: null }` shape if pagination is later needed — start without pagination, keep the wrapper key stable so adding it later isn't a breaking change (use plain arrays for now unless a list is genuinely large; document exceptions here).
- All timestamps ISO 8601 UTC; frontend converts to local display.
- Error shape (uniform across all endpoints):
```json
{ "error": { "code": "string", "message": "human-readable string" } }
```
- Any new endpoint or field: add it above in the same PR, tag the other person for review.
