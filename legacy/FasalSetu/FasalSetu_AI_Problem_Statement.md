# FasalSetu AI 

_Problem Statement Document  |  Build with Bharat 2.0 — National Level Hackathon  |  Theme: Artificial Intelligence & Machine Learning_ 

## 1. The Problem 

India is home to over 100 million farming households, the majority of them small and marginal landholders who operate with limited access to real-time information, modern diagnostic tools, and fair market pricing. Farming decisions today are still largely driven by guesswork, delayed visual inspection, and word-of-mouth advice rather than data. 

This shows up in concrete, everyday pain points: 

- Invisible soil conditions: moisture stress goes undetected until crop yield is already affected, because continuous monitoring is rarely available to small farmers. 

- Reactive, not predictive, irrigation: farmers water based on habit or visible wilting rather than a forecast of when the soil will actually need water. 

- Guesswork fertilizer use: without lab-tested or readily interpretable soil nutrient data, fertilizer application is often based on tradition rather than crop- and condition-specific need. 

- Late disease detection: crop diseases are usually identified only after visible damage has spread, by which point yield loss is often irreversible. 

- Low scheme awareness: dozens of government subsidies, insurance schemes, and loan programs exist, but low awareness and complex eligibility criteria mean many farmers never claim what they are entitled to. 

- Language exclusion: most existing digital agri-tools are English-first, shutting out a large share of the farmer population that is more comfortable in Hindi or regional languages. 

Point solutions exist for individual pieces of this puzzle — a disease-detection app here, a scheme portal there — but no single platform unifies real sensor data, predictive modeling, diagnosis, and government support into one continuous, farmer-facing, conversational loop. 

## 2. Problem Statement 

“Design and build an AI-powered farming companion that fuses real-time soil sensor data with multiple trained machine learning models to deliver end-to-end crop advisory — covering predictive irrigation, fertilizer guidance, disease diagnosis, government scheme access, and multilingual conversational support — in one unified, accessible platform.” 

## 3. Proposed Solution — FasalSetu AI 

FasalSetu AI tackles this as a single connected loop rather than a set of disconnected features, built around one guiding flow: 

#### **Sense → Predict → Diagnose → Advise** 

A real soil moisture sensor feeds a trained model that predicts irrigation timing — not just current wet/dry status. Farmer-entered or Soil Health Card NPK values feed a second trained model that recommends fertilizer type. A fine-tuned vision model diagnoses crop disease from a leaf photo. A retrieval pipeline matches farmers to real government schemes through semantic search. A multilingual chatbot ties every module's output into one natural, conversational answer, so the farmer interacts with a single assistant rather than four disconnected dashboards. 

Each module is powered by a genuinely trained model or retrieval pipeline rather than a single prompt wrapper — the irrigation predictor, fertilizer recommender, and disease classifier are the technical core, with the multilingual chatbot acting as the natural-language layer that ties every module together for the farmer. 

|**Module**|**What it does**|**AI/MLcore**|
|---|---|---|
|Soil Moisture Sensing|Real hardware sensor streams live moisture readings<br>fromthefield.|Sensor data pipeline<br>(MQTT/serial)|
|Irrigation Prediction|Predicts when irrigation will be needed — not just<br>current status — using moisture trend, temperature,<br>humidity and crop stage.|Trained Random Forest /<br>XGBoost on public smart-<br>irrigation dataset|
|Fertilizer<br>Recommendation|Farmer-entered or Soil Health Card NPK values,<br>combined with moisture/weather/crop type, produce<br>afertilizer recommendation.|Trained Random Forest /<br>XGBoost (Kaggle Fertilizer<br>Predictiondataset)|
|Disease Detection|Farmer uploads a leaf photo and receives instant<br>disease diagnosis withtreatment steps.|Fine-tuned MobileNet /<br>EfficientNet (PlantVillage)|
|Govt. Schemes Finder|Semantic search across curated central and state<br>schemes—subsidies,insurance,loans.|Sentence embeddings +<br>vectorsearch(ChromaDB)|
|Multilingual AI Chatbot|Conversational front door (Hindi / English /<br>Hinglish) that synthesizes outputs from every<br>module into one coherent answer.|LLM orchestration layer<br>(Gemini API)|
|Weather & Alerts|Live weather feed with spray/irrigation condition<br>advisories.|Weather API + rule engine|



## 4. Solution Architecture 

High-level data flow across the platform: 

Soil Moisture Sensor → Irrigation Prediction Model 

Farmer NPK Input / Soil Health Card → Fertilizer Recommendation Model 

Leaf Photo Upload → Disease Classification Model 

Weather API + Mandi Price Data → Rule Engine 

All outputs converge into: Backend API → Multilingual Chatbot (LLM orchestration) → Unified Dashboard 

The chatbot does not replace the trained models — it orchestrates and explains their combined outputs conversationally, in the farmer's language of choice. 

## 5. Technology Stack 

|**Layer**|**Technology**|
|---|---|
|IoT / Hardware|Real soil moisture sensor (ESP32/NodeMCU), streamed via serial/MQTT; fallback<br>cached reading for demo reliability|
|ML / Tabular Models|XGBoost / Random Forest for irrigation-timing prediction and fertilizer<br>recommendation|
|ML/DeepLearning|MobileNet /EfficientNetfine-tuned on PlantVillagefordisease detection|
|NLP / RAG|Sentence-transformers embeddings + ChromaDB for scheme semantic search;<br>Gemini API for multilingualchatbot orchestration|
|Backend|FastAPI; PostgreSQL for sensor logs, diagnoses, chat history|
|Frontend|React-based dashboard withchatbot as primaryinterface|
|External APIs / Data|OpenWeatherMap (weather); Agmarknet / data.gov.in (mandi prices, Soil Health<br>Card, schemes)|



## 6. Key Features & Innovation (USP) 

- Real hardware sensor integration, not simulated — live moisture data driving a trained predictive model, not a static threshold rule. 

- Three independently trained models with real accuracy/loss metrics shown live — not a single prompt wrapper marketed as AI. 

- Predictive, not reactive: irrigation timing is forecast ahead of need, rather than flagged only once soil is already dry. 

- Multilingual chatbot as the primary interface, making the entire platform accessible to Hindi/Hinglish-first farmers, not just an English dashboard with a chat feature bolted on. 

- Honest, scoped, and demoable — every model and feature shown live is real and defensible under questioning. 

## 7. Feasibility, Challenges & Competitor Analysis 

### Feasibility 

- Moisture sensor hardware is already built and tested, making live demonstration realistic. 

- Irrigation-timing and fertilizer-recommendation models use small, public tabular datasets — lightweight enough to train and validate within the hackathon window. 

- Disease classification uses transfer learning on PlantVillage, a well-established public dataset, making strong accuracy achievable in hours rather than days. 

- All external dependencies (weather API, mandi data, PlantVillage, public irrigation/fertilizer datasets) are publicly accessible with no licensing or access blockers. 

### Challenges 

- Irrigation and fertilizer model accuracy depends on how well the public datasets generalize to our specific sensor and target crops. 

- Live hardware demo carries inherent risk — mitigated with a cached fallback reading so the demo never fully depends on a live connection. 

- Scheme dataset is curated (20–30 schemes) for hackathon scope, not exhaustive nationwide coverage. 

- Multilingual accuracy across regional dialects and code-mixed (Hinglish) input has natural limits within a short build window. 

### Competitor Analysis 

|**Competitor**|**Focus**|**Gap FasalSetu AI addresses**|
|---|---|---|
|Plantix|Crop disease detection only|No soil sensing, no irrigation prediction, no<br>fertilizer guidance, no schemes|
|Kisan Suvidha|Government scheme &<br>advisory info|No sensing, no ML diagnosis, no personalized<br>irrigation/fertilizer guidance|
|Govt. mandi / advisory<br>portals|Static information listings|No personalization, no real-time sensor fusion, no<br>multilingual conversational layer|



None of the existing players combine real sensor-driven prediction, multi-model diagnosis, government scheme access, and a multilingual conversational layer into a single farmer-facing loop — that combination is where FasalSetu AI differentiates. 

## 8. How It Is Useful — Impact 

- Earlier intervention: predictive irrigation and instant disease diagnosis catch problems before yield loss occurs, instead of after. 

- Reduced input waste: data-driven irrigation and fertilizer recommendations cut over-watering and overfertilization, saving cost and reducing environmental impact. 

- Higher scheme uptake: semantic search makes it far easier for farmers to discover subsidies and insurance they are already eligible for. 

- Wider accessibility: a multilingual chatbot extends the platform's reach to farmers who are excluded by English-only digital tools. 

- Scalability: low-cost sensors and lightweight tabular models make the solution viable well beyond a hackathon demo, across India's small-holding farmer base. 

Build with Bharat 2.0 — National Level Hackathon 

