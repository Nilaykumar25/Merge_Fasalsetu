# Farm Revenue Copilot — UI Spec

> **Status:** Draft  
> **Last updated:** 2026-09-11

---

## Screens

### 1. Home (Dashboard)
- **Route:** `/`
- **Purpose:** At-a-glance revenue health across all active crops.
- **Key elements:**
  - Revenue Gauge — current season actual vs target (%)
  - Crop card list — one card per active crop, showing crop name, growth stage, health score badge
  - Alert banner — highest-priority pending recommendation
  - Bottom nav: Home / Capture / Schemes / Season Review

### 2. Crop Detail
- **Route:** `/crop/:cropId`
- **Purpose:** Deep-dive into a single crop.
- **Key elements:**
  - StatusHero — crop name, stage, health status colour
  - Grade gauge — latest A1–D grade with score
  - Recommendation list — sorted by priority
  - Irrigation timeline — last/next irrigation dates
  - Quick-action buttons: Log irrigation, Capture photo

### 3. Capture
- **Route:** `/capture`
- **Purpose:** Photo / manual observation entry.
- **Key elements:**
  - Camera / file upload area
  - Crop selector dropdown
  - Observation notes text area
  - Submit button → triggers grading API

### 4. Scheme Matcher
- **Route:** `/schemes`
- **Purpose:** Show eligible government / bank schemes.
- **Key elements:**
  - Filter chips: by type (insurance, loan, subsidy, income support)
  - Scheme card list — name, benefit summary, deadline badge, Apply CTA
  - Detail sheet (bottom drawer) — full eligibility criteria + apply link

### 5. Season Review
- **Route:** `/season-review`
- **Purpose:** End-of-season summary and next-season planning.
- **Key elements:**
  - Revenue chart — target vs actual by month
  - Insight cards — what went well, areas for improvement
  - Next-season suggestions — recommended crop mix, sowing window

---

## Design Tokens
See `frontend/src/styles/tokens.css` for colors, typography, spacing, and radii.

---

## Component Library
| Component   | Location                          | Used on                        |
|-------------|-----------------------------------|--------------------------------|
| Gauge        | `components/Gauge.jsx`           | Home, CropDetail               |
| StatusHero   | `components/StatusHero.jsx`      | CropDetail                     |
| Card         | `components/Card.jsx`            | Home, SchemeMatcher            |
| Button       | `components/Button.jsx`          | All screens                    |
