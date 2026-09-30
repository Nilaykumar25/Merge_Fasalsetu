# FasalSetu 🌾

**AI-powered agricultural advisory platform for Indian farmers**  
Built with React + FastAPI + Google ADK (Gemini 2.5 Flash) + scikit-learn

---

## What it does

FasalSetu is a full-stack farming companion that combines IoT sensor data, machine learning, live market prices, government scheme search, and AI advisory into a single dashboard — accessible in 8 Indian languages.

---

## Features

### Authentication
- **Google Sign-In** via Firebase (popup flow)
- **Phone OTP** via Supabase (SMS, +91 numbers)
- After Google login → skips welcome screen → goes directly to Farm Details onboarding (step 2) with name pre-filled from Google account

### Onboarding Wizard
- 3-step flow: Your Profile → Farm Details → Your Kit
- Crop type selection (12 crops + custom), farm size, soil type, current crop phase, planting date
- Language preference (English, Hindi, Marathi, Telugu, Tamil, Kannada, Malayalam, Punjabi)

### Dashboard
- Live stat cards: soil moisture, nitrogen level, temperature, active crop
- Quick-nav to all panels
- User name pulled from login (Google display name or onboarding form)

### Soil & NPK Panel
- Input sliders for Soil Moisture (%), Temperature (°C), pH Level, EC Level (dS/m)
- **In-browser NPK prediction** — GradientBoosting model (50 trees, MAE ±0.06 mg/kg) exported from `train_npk_model.py` and run entirely in TypeScript via `npkPredictor.ts` — no server needed
- Results: N, P, K values with Adequate / Deficient / Excess status badges
- **Improvement steps** — numbered action list generated from NPK status + sensor readings (fertilizer recommendations, pH correction, salinity flushing)
- **Disease risk assessment** — predicts Root Rot, Powdery Mildew, Bacterial Blight, Fusarium Wilt, Chlorosis risk from soil conditions
- **Soil AI Chatbot** — inline chat with full soil context pre-loaded, calls `/query` endpoint

### AI Advisor (Chatbot)
- Powered by Gemini 2.5 Flash via Google ADK
- Multilingual: Hindi, Marathi, Telugu, Tamil, English, Hinglish (mixed)
- Tools available: NPK prediction, soil health report, disease detection, market prices, weather forecast, spray conditions, farming advice
- Voice input (Web Speech API) and text-to-speech output
- Image upload for crop disease analysis
- Conversation memory across messages in the same session
- Quick action chips: Check Disease, What to Sow, Watering Guide, Weather Alert
- Language selector + crop selector with localStorage persistence
- Chat history persisted in localStorage

### Disease Detection
- Upload or drag-and-drop crop photo
- Calls EfficientNet model via ngrok tunnel (`VITE_MODEL_API_URL`)
- Returns: plant name, disease name, severity (severe/moderate/mild/healthy), confidence %, treatment steps, prevention tips
- Results saved to Supabase `disease_logs` table

### Weather Panel
- Powered by `weather_agent.py` (OpenWeatherMap API or seasonal fallback)
- Auto-detects location via browser GPS
- Current weather: temperature, feels-like, humidity, wind speed/direction, visibility, condition
- **Spray conditions check** — wind/rain/temp/humidity gate with specific reasons
- **5-day forecast** — daily max/min temp, rainfall, condition, farming notes per day
- Location search bar — type any city/state
- Source: `openweathermap-live` or `seasonal-estimate` if API key not set

### Government Scheme Finder
- Semantic search over 64 central + state government schemes
- Powered by ChromaDB + `paraphrase-multilingual-MiniLM-L12-v2` sentence-transformers
- 3-step filter: State → Category → Free-text query
- Categories: Income Support, Crop Insurance, Irrigation, Soil Health, Market Access, Infrastructure, Technology, Specialised Crops
- Results show: scheme name, level (Central/State), benefit amount, eligibility, apply URL, match score bar
- 10 quick-search chips
- Seeded via `seed_chromadb.py --json schemes_chromadb.json`

### KisanBazaar — Marketplace
- Powered by `market_agent.py` + `market_api_fetcher.py`
- Crop selector (18 crops), state selector (14 states), mandi/city input, harvest quantity
- **MSP 2024-25 reference table** (15 crops) in sidebar
- 4 metric cards: Modal Price, Highest Mandi, vs MSP (green/red %), Est. Revenue
- **SVG trend chart** with Y-axis price labels and X-axis date labels (7-day)
- **Multi-mandi price table** — state-specific mandis (e.g. Punjab → Ludhiana, Amritsar, Jalandhar…), Min/Max/Modal, vs MSP badge, Est. Revenue
- Advice strip — red warning if below MSP, green if above
- **AI chat** with quick prompts (Should I sell now? Best mandi? Compare MSP?)
- Data sources: data.gov.in Agmarknet API, eNAM, CEDA Ashoka

### Compliance Checker
- **Pesticide safety check** — type any name, get BANNED / RESTRICTED / LICENSE REQUIRED / SAFE verdict
- Powered by `guardrail.py` v1.1 + `banned_pesticides.json`
- **Fix 1**: Whole-word regex on extracted text only (no JSON serialisation false positives)
- **Fix 2**: Pre-execution input screening — blocks "how do I use DDT?" before LLM is called
- **Fix 3**: Richer audit entries — schema_ver, session_id, phase, crop, state, severity
- **Fix 4**: State-aware rules — Kerala bans Glyphosate, Maharashtra requires district approval, Himachal Pradesh bans Chlorpyrifos
- **Fix 5**: Confidence gate — responses below 75% confidence flagged for expert review
- **Banned list tab** — all 13 banned substances with source citation
- **Restricted use tab** — 4 substances with specific conditions + license-required list
- **Audit log tab** — reads `logs/compliance_audit.jsonl`, color-coded BLOCKED/WARNING/PASSED

### Crop Log
- Track active crops with sowing date, current phase, disease history
- Add new crops via onboarding flow (phase selection → crop details → saves to Supabase)

### Alerts Panel
- Static smart alerts: irrigation, heatwave, nitrogen deficiency, rain forecast, pest risk

### Community Panel
- Upcoming events: workshops, quizzes, kit drives, school drives
- Stats: farmers reached, school drives, free kits distributed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts |
| Backend | FastAPI, Python 3.13, Uvicorn |
| AI / LLM | Google ADK v1.x, Gemini 2.5 Flash |
| ML Models | scikit-learn GradientBoosting (NPK prediction, in-browser via JSON export) |
| Auth | Firebase (Google OAuth), Supabase (Phone OTP) |
| Database | Supabase (PostgreSQL) |
| Vector DB | ChromaDB + sentence-transformers (government schemes) |
| Weather | OpenWeatherMap API (free tier) via `weather_agent.py` |
| Disease Detection | EfficientNet-B0 (PyTorch) via ngrok tunnel |
| Market Data | data.gov.in Agmarknet API, MSP reference data |

---

## Project Structure

```
FasalSetu-main/
├── agents/
│   ├── orchestrator.py       # Google ADK agent with 9 tools
│   ├── soil_agent.py         # NPK prediction + soil health report
│   ├── weather_agent.py      # OpenWeatherMap + seasonal fallback
│   ├── market_agent.py       # Mandi prices + MSP comparison
│   ├── disease_agent.py      # EfficientNet disease detection
│   ├── scheme_agent.py       # ChromaDB scheme search
│   ├── voice_agent.py        # Whisper + gTTS + translation
│   └── offline_agent.py      # Fully offline advisory
├── compliance/
│   ├── guardrail.py          # v1.1 — 5 compliance improvements
│   └── banned_pesticides.json
├── models/                   # Trained .pkl files (6 files)
├── scripts/
│   ├── train_npk_model.py    # Trains GradientBoosting NPK models
│   └── ingest_schemes.py     # PDF → ChromaDB ingestion
├── src/
│   ├── components/
│   │   ├── LoginSignup.tsx   # Google + Phone OTP login
│   │   ├── HomePage.tsx      # Dashboard with 11 panels
│   │   ├── SoilNPKPanel.tsx  # In-browser NPK prediction
│   │   ├── Chatbot.tsx       # AI Advisor (Gemini)
│   │   ├── CalendarAlerts.tsx# Weather panel
│   │   ├── GovSchemes.tsx    # Scheme search
│   │   ├── Marketplace.tsx   # KisanBazaar
│   │   ├── Compliance.tsx    # Pesticide checker
│   │   └── ...
│   ├── services/
│   │   ├── npkPredictor.ts   # In-browser GBM inference
│   │   ├── weatherLocation.ts# GPS + weather singleton
│   │   └── ...
│   └── lib/
│       ├── firebase.ts       # Google Auth
│       └── supabase.ts       # DB + Phone Auth
├── main.py                   # FastAPI app (15+ endpoints)
├── seed_chromadb.py          # Seeds 64 schemes into ChromaDB
├── search_portal.py          # CLI scheme search portal
├── market_api_fetcher.py     # data.gov.in Agmarknet fetcher
└── soil_data_final.csv       # 26,960 IoT sensor readings
```

---

## Setup

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
pip install -r requirements.txt
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_API_KEY=your_anon_key

# Firebase (Google Auth)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:123:web:abc

# Gemini AI
GEMINI_API_KEY=AIzaSy...

# Weather (optional — seasonal fallback if not set)
OPENWEATHER_API_KEY=your_key

# Backend URL
VITE_SOIL_NPK_API_URL=http://localhost:8000

# Disease detection (ngrok tunnel to Colab)
VITE_MODEL_API_URL=https://your-ngrok-url.ngrok-free.app
```

### 3. Train NPK models

```bash
cd FasalSetu-main
python scripts/train_npk_model.py --data soil_data_final.csv
```

### 4. Seed government schemes

```bash
python seed_chromadb.py --json schemes_chromadb.json
```

### 5. Start backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Start frontend

```bash
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/predict-npk` | NPK prediction from soil_agent.py |
| POST | `/soil-report` | Full soil health report |
| POST | `/weather/current` | Current weather via weather_agent.py |
| POST | `/weather/forecast` | 5-day forecast |
| POST | `/weather/advice` | Crop-specific farming advice |
| POST | `/weather/spray` | Spray safety check |
| POST | `/market/prices` | Mandi prices via market_agent.py |
| GET | `/market/crops` | Supported crops with MSP |
| POST | `/schemes/search` | Semantic scheme search (ChromaDB) |
| GET | `/schemes/categories` | Available scheme categories |
| POST | `/compliance/check` | Pesticide safety check |
| GET | `/compliance/lists` | Full banned/restricted lists |
| POST | `/query` | Main AI orchestrator (Gemini) |
| POST | `/analyze-image` | Crop disease image analysis |
| GET | `/audit-log` | Compliance audit trail |
| GET | `/health` | Service health check |

---

## Languages Supported

English · हिंदी · मराठी · తెలుగు · தமிழ் · ಕನ್ನಡ · മലയാളം · ਪੰਜਾਬੀ · Hinglish (Mixed)

---

## Model Performance

| Model | MAE | MAE % of range |
|---|---|---|
| Nitrogen regressor | 0.058 mg/kg | 15.6% |
| Phosphorus regressor | 0.064 mg/kg | 16.0% |
| Potassium regressor | 0.064 mg/kg | 16.3% |
| SQI binary classifier | — | Macro F1: 0.47 |

Training data: 26,960 IoT sensor readings (`soil_data_final.csv`)  
Algorithm: GradientBoostingRegressor (50 trees, depth 3, lr 0.1)

---

## Credits

Built by the FasalSetu team · Powered by Google Gemini, Firebase, Supabase, OpenWeatherMap, data.gov.in
#   F a s a l S e t u _ N I T D  
 