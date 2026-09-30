# AnnaVriddhi Decision Engine 🚀

## Overview

The **AnnaVriddhi Decision Engine** is a comprehensive agricultural decision support system that converts crop state, sensor data, and weather forecasts into **actionable, financially-aware decisions** throughout the crop lifecycle.

### Key Innovation

> **AnnaVriddhi continuously converts crop state, sensor data and weather into actionable, financially-aware decisions throughout the crop lifecycle.**

Instead of building 6 independent ML systems, we built **one decision engine** that combines:
- Your existing crop-health CV model
- Deterministic agronomic rules
- Weather API integration
- Gemini API for explanation and localization

---

## Architecture

```
┌──────────────┐
│ Crop Image   │
└──────┬───────┘
       ↓
  CV Quality Model
       ↓
┌────────────┴────────────┐
│                         │
Crop Health         Grade/Quality
│                         │
└────────────┬────────────┘
             ↓
┌────────────────────────┐
│   DECISION ENGINE      │
│                        │
│  🌱 Nutrition          │
│  💧 Irrigation         │
│  🌩️ Weather Protection│
│  🌾 Harvest Window     │
└───────────┬────────────┘
            ↓
    Revenue Calculator
            ↓
      Recommendation
            ↓
         Gemini
            ↓
┌───────────┴──────────┐
↓                      ↓
Dashboard         SMS/WhatsApp
```

---

## Features Implemented

| Feature             | Status | Priority | Description |
|---------------------|--------|----------|-------------|
| 🌱 Nutrition Alert  | ✅     | 1        | NPK/pH thresholds + crop stage rules |
| 💧 Irrigation       | ✅     | 2        | Soil moisture + weather integration |
| 🌧️ Weather Protection | ✅  | 3        | Risk analysis for hail, rain, wind, frost |
| 🌾 Harvest Window   | ✅     | 5        | Ripeness + weather + grade optimization |
| 💰 Revenue Impact   | ✅     | 6        | Financial calculations for every decision |
| 🗣️ Local Language  | ✅     | 7        | Gemini translation → SMS/WhatsApp ready |
| 🍅 Grade Prediction | 🔄     | 4        | Integrate your existing CV model |

---

## Module Details

### 1. 🌱 Nutrition Alert Service

**File:** `src/services/nutritionService.js`

**What it does:**
- Rule-based NPK + pH analysis
- Crop-specific thresholds by growth stage
- Severity classification (NORMAL, LOW, MEDIUM, HIGH)
- Yield risk estimation

**Example:**
```javascript
const result = nutritionService.analyzeNutrition({
  crop: 'tomato',
  growthStage: 'fruiting',
  nitrogen: 25,      // Low
  phosphorus: 35,    // Normal
  potassium: 45,     // Low
  pH: 5.8            // Slightly acidic
});

// Output:
{
  type: 'NUTRITION',
  severity: 'MEDIUM',
  alert: 'Nutrient deficiency detected',
  recommendation: 'Apply corrective fertilization within 1 week',
  yieldRisk: 'Medium',
  actions: [
    'Increase nitrogen application',
    'Increase potassium application',
    'Consider lime application'
  ],
  metadata: {
    nitrogen: { value: 25, status: 'DEFICIENT', min: 30, max: 50 },
    // ...
  }
}
```

**Supported Crops:**
- Tomato
- Wheat
- Rice
- Potato
- Default fallback for others

---

### 2. 💧 Irrigation Service

**File:** `src/services/irrigationService.js` (already exists)

**What it does:**
- Soil moisture monitoring
- Weather forecast integration
- Rain probability consideration
- Optimal timing recommendations

**Decision Logic:**
```
if soil_moisture < wilting_threshold:
  if rain_probability < 40:
    → IRRIGATE NOW
  else:
    → WAIT FOR RAIN
elif soil_moisture < field_capacity:
  → MONITOR
else:
  → NO IRRIGATION
```

---

### 3. 🌩️ Weather Protection Service

**File:** `src/services/weatherProtectionService.js`

**What it does:**
- Fetches weather forecast from OpenWeatherMap
- Calculates risk score (0-100) based on:
  - Hail probability (highest priority)
  - Wind speed
  - Heavy rain
  - Temperature extremes (heat/frost)
- Provides specific protective actions
- Calculates protection economics

**Risk Scoring:**
- 0-30: LOW
- 31-60: MEDIUM
- 61-100: HIGH

**Example Output:**
```javascript
{
  type: 'WEATHER_PROTECTION',
  severity: 'HIGH',
  alert: 'Hail risk in next 24 hours',
  recommendation: 'Take immediate protective action',
  actions: [
    'Deploy protective netting immediately',
    'Move harvested produce to covered storage',
    'Inspect vulnerable plants after event'
  ],
  metadata: {
    economics: {
      cropValue: 50000,
      expectedDamagePercent: 30,
      expectedLoss: 15000,
      protectionCost: 3000,
      netValueProtected: 12000
    }
  }
}
```

---

### 4. 🌾 Harvest Window Service

**File:** `src/services/harvestWindowService.js`

**What it does:**
- Determines optimal harvest timing
- Considers:
  - Current ripeness vs. optimal
  - Weather forecast (severe weather = harvest now)
  - Defect risk progression
  - Quality grade
- Provides specific harvest windows

**Decision Matrix:**
| Condition | Window | Severity |
|-----------|--------|----------|
| Severe weather + ready | 0-24 hours | HIGH |
| High weather risk + near optimal | 24-48 hours | HIGH |
| High defect risk | 1-2 days | HIGH |
| Optimal ripeness reached | 2-4 days | MEDIUM |
| Near optimal | 3-5 days | LOW |

**Example:**
```javascript
{
  type: 'HARVEST_WINDOW',
  severity: 'HIGH',
  alert: 'Harvest window detected',
  recommendation: 'HARVEST IMMEDIATELY - within 24 hours',
  reason: 'Hail forecast tomorrow. Current maturity: 89%',
  actions: [
    'Mobilize harvest crew immediately',
    'Prepare storage facilities',
    'Arrange transport'
  ],
  metadata: {
    harvestWindow: '0-24 hours',
    ripeness: 89,
    grade: 'A'
  }
}
```

---

### 5. 💰 Revenue Service (Enhanced)

**File:** `src/services/revenueService.js`

**What it does:**
- Calculates financial impact for every decision
- Shows expected loss vs. action cost
- Computes net value protected
- Calculates ROI percentage

**Impact Calculation:**
```javascript
{
  baseRevenue: 25000,        // Total crop value
  expectedLoss: 5000,        // Loss without action (20%)
  actionCost: 500,           // Cost of irrigation
  expectedSavings: 4500,     // Loss - Cost
  netValue: 4500,            // Value protected
  roiPercent: 900            // 900% ROI
}
```

**Decision-Specific Loss Estimates:**
- **Irrigation**: 5-20% yield loss depending on severity
- **Nutrition**: 8-25% yield loss from deficiencies
- **Weather**: 5-30% damage from events
- **Harvest Timing**: 3-25% loss from poor timing

---

### 6. 🗣️ Gemini Localization Service

**File:** `src/services/geminiService.js`

**What it does:**
- Translates decisions to 9 Indian languages
- Generates farmer-friendly SMS/WhatsApp messages
- Preserves numerical values and urgency
- Uses simple agricultural terminology

**Supported Languages:**
```javascript
{
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  te: 'Telugu',
  ta: 'Tamil',
  kn: 'Kannada',
  gu: 'Gujarati',
  pa: 'Punjabi',
  bn: 'Bengali'
}
```

**Example SMS (Hindi):**
```
राम प्रसाद जी,

🍅 टमाटर के खेत में मिट्टी की नमी कम है।
अगले 6 घंटे में बारिश की संभावना केवल 12% है।

💧 अगले 6 घंटे में सिंचाई करने की सलाह दी जाती है।

💰 संभावित आय बचत: ₹4,500

- AnnaVriddhi
```

**IMPORTANT:** Gemini preserves:
- ✓ All numerical values (dates, percentages, rupees)
- ✓ Technical accuracy of recommendations
- ✓ Urgency level
- ✓ Action items

---

### 7. 🎯 Decision Engine Core

**File:** `src/services/decisionEngine.js`

**What it does:**
- Orchestrates all decision modules
- Runs analyses in parallel for speed
- Sorts decisions by severity + revenue impact
- Generates human-readable summary
- Applies localization if requested

**API:**
```javascript
const decisions = await decisionEngine.generateDecisions({
  farmId: 'farm-001',
  cropId: 'crop-001',
  crop: 'tomato',
  growthStage: 'fruiting',
  sensorData: {
    nitrogen: 25,
    phosphorus: 35,
    potassium: 45,
    pH: 5.8,
    soilMoisture: 18
  },
  cropHealthData: {
    ripeness: 89,
    grade: 'A',
    defectScore: 35,
    estimatedValue: 50000
  },
  location: { lat: 28.6139, lon: 77.2090 },
  language: 'hi'
});
```

**Output Structure:**
```javascript
{
  farmId: 'farm-001',
  cropId: 'crop-001',
  timestamp: '2026-09-12T...',
  language: 'hi',
  
  summary: "⚠️ High irrigation requirement. Irrigate within 6 hours to potentially protect ₹4,500 of crop value.",
  
  topPriorityAction: {
    type: 'IRRIGATION',
    severity: 'HIGH',
    alert: 'High irrigation requirement',
    recommendation: 'Irrigate within 6 hours',
    revenueImpact: { netValue: 4500, roiPercent: 900 }
  },
  
  decisions: [
    { /* Irrigation decision */ },
    { /* Nutrition decision */ },
    { /* Weather decision */ },
    { /* Harvest decision */ }
  ],
  
  totalRevenueImpact: 12500
}
```

---

## API Endpoints

### POST `/api/decisions/generate`

Generate comprehensive farm decisions.

**Request:**
```json
{
  "farmId": "farm-001",
  "cropId": "crop-001",
  "crop": "tomato",
  "growthStage": "fruiting",
  "sensorData": {
    "nitrogen": 25,
    "phosphorus": 35,
    "potassium": 45,
    "pH": 5.8,
    "soilMoisture": 18
  },
  "cropHealthData": {
    "ripeness": 89,
    "grade": "A",
    "defectScore": 35,
    "estimatedValue": 50000
  },
  "location": { "lat": 28.6139, "lon": 77.2090 },
  "language": "hi"
}
```

**Response:** See Decision Engine Output above.

---

### POST `/api/decisions/message`

Generate SMS/WhatsApp message from a decision.

**Request:**
```json
{
  "decision": {
    "type": "IRRIGATION",
    "severity": "HIGH",
    "alert": "High irrigation requirement",
    "recommendation": "Irrigate within 6 hours",
    "revenueImpact": { "netValue": 4500 }
  },
  "language": "hi",
  "farmerName": "राम प्रसाद"
}
```

**Response:**
```json
{
  "message": "राम प्रसाद जी,\n\n💧 मिट्टी की नमी कम है।\nअगले 6 घंटे में सिंचाई करें।\n\n💰 संभावित बचत: ₹4,500\n\n- AnnaVriddhi"
}
```

---

### GET `/api/decisions/languages`

Get supported languages.

**Response:**
```json
{
  "languages": {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    ...
  }
}
```

---

### GET `/api/decisions/test/gemini`

Test Gemini API connection.

**Response:**
```json
{
  "success": true,
  "response": "नमस्ते!"
}
```

---

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# Weather API (Required)
WEATHER_API_KEY=your_openweathermap_api_key_here

# Gemini API (Required for localization)
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get API Keys:**
- OpenWeatherMap: https://openweathermap.org/api
- Gemini: https://makersuite.google.com/app/apikey

### 2. Install Dependencies

Already included in `package.json`:
- `axios` - HTTP client
- `express` - Web framework
- `express-validator` - Input validation

### 3. Test the System

Run the comprehensive test:

```bash
node test-decision-engine.js
```

This will test:
1. ✅ Nutrition Service
2. ✅ Weather Protection Service
3. ✅ Harvest Window Service
4. ✅ Gemini Localization Service
5. ✅ Full Decision Engine

---

## Integration with Existing CV Model

Your existing crop health CV model should output:

```javascript
{
  overall: 'good',           // Overall health status
  ripeness: 89,              // Ripeness percentage (0-100)
  grade: 'A',                // Quality grade (A/B/C)
  defectScore: 35,           // Defect risk score (0-100)
  defects: [...],            // List of detected defects
  estimatedValue: 50000      // Estimated crop value (₹)
}
```

Pass this to `generateDecisions()` as `cropHealthData`.

---

## Dashboard View

The system is designed to power a farmer dashboard with **4 giant cards**:

```
┌────────────────┐ ┌────────────────┐
│ 🌱 CROP HEALTH │ │ 💧 IRRIGATION  │
│     82/100     │ │   HIGH ALERT   │
└────────────────┘ └────────────────┘

┌────────────────┐ ┌────────────────┐
│ 🌩️ WEATHER     │ │ 🌾 HARVEST     │
│   HIGH RISK    │ │  2-3 DAYS      │
└────────────────┘ └────────────────┘

💰 POTENTIAL REVENUE PROTECTED
₹12,500
```

**Today's most important action:**
> ⚠️ Hail risk is high tomorrow. Harvest Grade-A tomatoes within 24 hours to potentially protect ₹12,500 of crop value.

---

## Hackathon Pitch

**"AnnaVriddhi continuously converts crop state, sensor data and weather into actionable, financially-aware decisions throughout the crop lifecycle."**

### Demo Flow

1. **Show sensor data** → Live readings from field
2. **Show CV analysis** → Crop health, ripeness, grade
3. **Click "Get Recommendations"** → Decision engine runs
4. **Display 4 cards** → Visual dashboard
5. **Highlight top action** → Clear, urgent, financial
6. **Switch language** → Show Hindi translation
7. **Generate SMS** → Preview message to farmer

### Key Talking Points

✓ **Not 6 models, 1 decision engine** - Practical approach  
✓ **Every recommendation shows revenue impact** - Business value  
✓ **Works in 9 languages** - Real farmer accessibility  
✓ **Integrates existing CV work** - Builds on what you have  
✓ **Real-time weather + sensors** - Timely decisions  
✓ **SMS/WhatsApp ready** - Actual delivery channel  

---

## Future Enhancements

### Phase 2 (Post-Hackathon)
- [ ] Grade prediction integration with your CV model
- [ ] Historical trend analysis
- [ ] Multi-crop farm coordination
- [ ] Actual WhatsApp Business API integration
- [ ] Voice messages in local languages
- [ ] Farmer feedback loop

### Phase 3
- [ ] Market price predictions
- [ ] Buyer matching
- [ ] Loan/insurance recommendations
- [ ] Community benchmarking

---

## File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── decisionEngine.js           # Core orchestrator
│   │   ├── nutritionService.js         # NPK + pH analysis
│   │   ├── weatherProtectionService.js # Weather risk
│   │   ├── harvestWindowService.js     # Harvest timing
│   │   ├── geminiService.js            # Localization
│   │   ├── revenueService.js           # Financial impact
│   │   └── irrigationService.js        # Already exists
│   │
│   └── routes/
│       └── decisions.js                # API endpoints
│
├── test-decision-engine.js             # Comprehensive test
└── .env                                # API keys (GEMINI_API_KEY)
```

---

## Troubleshooting

### Gemini API Errors

**Error:** `API key not configured`
```bash
# Add to .env:
GEMINI_API_KEY=your_key_here
```

**Error:** `Rate limit exceeded`
- Gemini has free tier limits
- Add retry logic or upgrade plan
- Fallback to English works automatically

### Weather API Errors

**Error:** `WEATHER_API_KEY not configured`
```bash
# Add to .env:
WEATHER_API_KEY=your_openweathermap_key
```

**Error:** `City not found`
- Use latitude/longitude instead of city names
- Verify coordinates are valid

### Revenue Calculations

If revenue numbers seem off:
- Check `MARKET_PRICES` in `revenueService.js`
- Adjust loss percentages for your region
- Update `estimateBaseYield()` with local averages

---

## Support

For questions or issues:
1. Check this README
2. Run `node test-decision-engine.js`
3. Check console logs for detailed error messages
4. Review `.env.example` for configuration

---

## License

Part of the AnnaVriddhi Farm Revenue Copilot project.

---

**Built with ❤️ for farmers** 🌾
