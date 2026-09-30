# Farm Revenue Copilot — API Contract

> **Base URL (dev):** `http://localhost:4000/api`  
> **Auth:** Bearer JWT in `Authorization` header (all routes except `/health`)  
> **Content-Type:** `application/json` unless noted

---

## Health

### `GET /health`
```
200 { "status": "ok" }
```

---

## Recommendations

### `GET /api/recommendations/:cropId`
Returns all pending and recent recommendations for a crop.

**Response 200**
```json
[
  {
    "id": "rec-001",
    "cropId": "crop-wheat-001",
    "type": "irrigation",
    "priority": "high",
    "title": "Irrigate within 48 hours",
    "body": "Soil moisture at 28% — below 35% threshold.",
    "status": "pending",
    "createdAt": "2026-09-10T06:00:00Z",
    "acknowledgedAt": null
  }
]
```

### `POST /api/recommendations/:recommendationId/acknowledge`
**Request body**
```json
{ "action": "irrigated field", "notes": "Applied 25mm via drip" }
```
**Response 200** — updated recommendation object

---

## Grading

### `POST /api/grading`
Submit a new grading observation. Multipart form-data.

**Fields:** `cropId` (string), `image` (file, optional), `notes` (string, optional)

**Response 201**
```json
{
  "id": "grade-001",
  "cropId": "crop-wheat-001",
  "grade": "A2",
  "score": 82,
  "breakdown": { "color": 88, "size": 80, "moisture": 79, "pestDamage": 85 },
  "estimatedMarketPrice": 2350,
  "currency": "INR",
  "unit": "quintal",
  "notes": null,
  "gradedAt": "2026-09-10T07:30:00Z"
}
```

### `GET /api/grading/:cropId/latest`
**Response 200** — single GradingResult object (same shape as above)

### `GET /api/grading/:cropId/history`
**Response 200** — array of GradingResult objects

---

## Schemes

### `GET /api/schemes/match`
**Query params:** `state`, `cropType`, `landArea`

**Response 200**
```json
[
  {
    "id": "scheme-pm-kisan",
    "name": "PM-KISAN",
    "provider": "Government of India",
    "type": "income_support",
    "benefit": "₹6,000 per year direct transfer",
    "eligibility": ["land owner", "small/marginal farmer"],
    "applyUrl": "https://pmkisan.gov.in",
    "deadline": null
  }
]
```

### `GET /api/schemes/:schemeId`
**Response 200** — single Scheme object  
**Response 404** `{ "error": "Scheme not found" }`

---

## Irrigation

### `GET /api/irrigation/:cropId/schedule`
**Response 200**
```json
{
  "cropId": "crop-wheat-001",
  "nextIrrigationDate": "2026-09-13",
  "recommendedAmountMm": 25,
  "note": "Based on soil moisture forecast drop"
}
```

### `POST /api/irrigation/:cropId/log`
**Request body**
```json
{ "date": "2026-09-11", "amountMm": 25, "method": "drip" }
```
**Response 201** — logged irrigation event

---

## Error shapes

All errors follow:
```json
{ "error": "<human-readable message>" }
```

| Status | Meaning              |
|--------|----------------------|
| 400    | Validation error     |
| 401    | Missing/invalid JWT  |
| 404    | Resource not found   |
| 500    | Internal server error|
