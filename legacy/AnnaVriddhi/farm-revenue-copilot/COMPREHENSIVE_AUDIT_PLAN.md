# AnnaVriddhi Comprehensive Feature Audit Plan

## Current State Analysis (Initial Assessment)

### Architecture Overview
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + Supabase
- **ML Services**: Python (Disease Detection, Grading)
- **Auth**: Firebase Auth + Supabase
- **Database**: PostgreSQL (Supabase)

### Critical Issues Identified

1. **Hardcoded Demo Data**
   - ALL screens currently show hardcoded data for "Ramesh's Farm"
   - No dynamic data loading from Supabase
   - Demo account (demo@123) should keep hardcoded data
   - Real users should see their own data

2. **Missing API Integration**
   - Dashboard: Not connected to backend
   - Crop Condition: All hardcoded metrics
   - Recommendation: Static UI, not calling recommendation service
   - Irrigation: Static UI, irrigation service exists but not connected
   - Harvest Window: All hardcoded dates and calculations
   - Chatbot: Hardcoded responses, no AI integration
   - Weather: No actual weather API integration
   - Revenue Summary: All static calculations

3. **Authentication Issues**
   - AuthContext exists but farmer data may not persist correctly
   - No distinction between demo and real users in most screens
   - farmer_id not being passed consistently to API calls

4. **Backend Services Available (Good!)**
   ✅ Disease Detection - ML service working
   ✅ Grading Service - Hybrid RGB grading working
   ✅ Schemes Service - Government schemes logic implemented
   ✅ Irrigation Service - Water balance calculation exists
   ✅ Recommendation Service - Crop recommendation logic exists
   ⚠️ Weather API - Integration exists but may need testing
   ❌ AI Advisor - No backend implementation found
   ❌ Revenue Service - Exists but not connected to frontend

## Audit Plan by Feature

### 1. DASHBOARD ✅ EXISTS | ❌ NOT CONNECTED
**Status**: 100% hardcoded
**Files**: `frontend/src/screens/Dashboard.tsx`
**Required Actions**:
- [ ] Connect to supabase farmer profile
- [ ] Load actual crop data from database
- [ ] Connect soil moisture, temperature to actual sensors/data
- [ ] Connect weather to weather API
- [ ] Connect disease status to actual detection results
- [ ] Make recommendations dynamic
- [ ] Implement demo vs real user logic

### 2. CROP CONDITION ✅ EXISTS | ❌ NOT CONNECTED
**Status**: 100% hardcoded
**Files**: `frontend/src/screens/CropCondition.tsx`
**Required Actions**:
- [ ] Connect all gauges to crop_state_snapshots table
- [ ] Load N/P/K values from database
- [ ] Make trend charts use actual historical data
- [ ] Connect recommendations to recommendation service

### 3. RECOMMENDATION ✅ EXISTS | ❌ NOT CONNECTED
**Status**: Static UI
**Files**: `frontend/src/screens/Recommendation.tsx`
**Backend**: `backend/src/services/recommendationService.js` EXISTS
**Required Actions**:
- [ ] Call `/api/recommendations/:cropId` endpoint
- [ ] Display actual recommendations from backend
- [ ] Implement acknowledge action
- [ ] Calculate actual revenue impact

### 4. IRRIGATION ✅ EXISTS | ❌ NOT CONNECTED
**Status**: Static UI
**Files**: `frontend/src/screens/Irrigation.tsx`
**Backend**: `backend/src/services/irrigationService.js` EXISTS
**Required Actions**:
- [ ] Call irrigation API endpoint
- [ ] Display actual water balance calculation
- [ ] Show real weather forecast
- [ ] Update irrigation schedule based on backend

### 5. HARVEST WINDOW ✅ EXISTS | ❌ NOT CONNECTED
**Status**: 100% hardcoded
**Files**: `frontend/src/screens/HarvestWindow.tsx`
**Backend**: `backend/src/services/harvestWindowService.js` EXISTS
**Required Actions**:
- [ ] Connect to harvest window calculation service
- [ ] Display actual maturity data
- [ ] Use real weather forecast
- [ ] Calculate actual mandi price trends

### 6. DISEASE DETECTION ✅ EXISTS | ✅ CONNECTED
**Status**: **WORKING** (already integrated)
**Files**: `frontend/src/screens/DiseaseDetection.tsx`
**Backend**: ML service + API route working
**Required Actions**:
- [x] Already connected to backend ✅
- [ ] Save results to user's history
- [ ] Link to farmer profile

### 7. SOIL / NPK ❌ NOT FOUND AS SEPARATE SCREEN
**Status**: May be part of Crop Condition
**Required Actions**:
- [ ] Verify if this is a separate feature or merged
- [ ] If separate, create screen and connect to fertilizer service

### 8. WEATHER ❌ NO DEDICATED SCREEN FOUND
**Status**: Weather data shown in dashboard but no dedicated screen
**Backend**: `backend/src/integrations/weatherApi.js` EXISTS
**Required Actions**:
- [ ] Check if weather screen is needed
- [ ] Ensure weather data is consistently used across all screens

### 9. AI ADVISOR (Chatbot) ✅ EXISTS | ❌ NOT CONNECTED
**Status**: Hardcoded responses
**Files**: `frontend/src/screens/Chatbot.tsx`
**Backend**: `backend/src/routes/advisor.js` MAY EXIST
**Required Actions**:
- [ ] Check if advisor API exists
- [ ] Connect to backend AI service or external LLM
- [ ] Pass farmer context to AI
- [ ] Make responses dynamic

### 10. GOVERNMENT SCHEMES ✅ EXISTS | ✅ PARTIALLY CONNECTED
**Status**: Has API integration but needs verification
**Files**: `frontend/src/screens/Schemes.tsx`
**Backend**: `backend/src/services/schemesService.js` EXISTS
**Required Actions**:
- [ ] Verify filtering works correctly
- [ ] Ensure farmer profile matching works
- [ ] Test state/category/search filters
- [ ] Verify demo vs real user data

### 11. GRADING ✅ EXISTS | ⚠️ NEEDS INTEGRATION
**Status**: UI exists, ML service exists
**Files**: 
- `frontend/src/screens/GradeCapture.tsx`
- `frontend/src/screens/GradingResult.tsx`
- `frontend/src/screens/GradingHistory.tsx`
**Backend**: `backend/src/services/gradingService.js` EXISTS
**Required Actions**:
- [ ] Connect capture screen to grading API
- [ ] Store results in database
- [ ] Load actual grading history per farmer
- [ ] Show correct result per grading session

### 12. REVENUE SUMMARY ✅ EXISTS | ❌ NOT CONNECTED
**Status**: 100% hardcoded
**Files**: `frontend/src/screens/RevenueSummary.tsx`
**Backend**: `backend/src/services/revenueService.js` EXISTS
**Required Actions**:
- [ ] Connect to revenue calculation service
- [ ] Load actual grading results
- [ ] Calculate from real harvest data
- [ ] Link to schemes claimed
- [ ] Show actual revenue trajectory

### 13. SEASON REVIEW ✅ EXISTS | ❌ NOT CONNECTED
**Status**: Static UI
**Files**: `frontend/src/screens/SeasonReview.tsx`
**Required Actions**:
- [ ] Load actual recommendations followed/skipped
- [ ] Calculate real attribution
- [ ] Generate shareable card with actual data

### 14. SETTINGS ✅ EXISTS | ⚠️ PARTIAL
**Status**: UI exists, needs backend connection
**Files**: `frontend/src/screens/Settings.tsx`
**Required Actions**:
- [ ] Connect to farmer profile CRUD
- [ ] Make farm details editable
- [ ] Persist notification preferences
- [ ] Connect sensor information

### 15. MESSAGES, VOICE, HELP, OFFLINE ⚠️ PLACEHOLDER SCREENS
**Status**: May be placeholder/future features
**Required Actions**:
- [ ] Determine if these should be functional or removed from nav

## Priority Order for Fixes

### Phase 1: Authentication & Data Foundation (CRITICAL)
1. Fix AuthContext to properly distinguish demo vs real users
2. Ensure farmer_id is passed to all API calls
3. Create/verify farmer profile setup flow for new users
4. Implement demo data service properly

### Phase 2: Core Feature Connection (HIGH PRIORITY)
1. Dashboard - connect to real data
2. Crop Condition - connect to crop_state_snapshots
3. Settings - farmer profile CRUD
4. Schemes - verify and fix filtering

### Phase 3: Major Features (HIGH PRIORITY)
1. Recommendation - connect to recommendation service
2. Irrigation - connect to irrigation service  
3. Grading flow - complete integration
4. Disease Detection - verify and enhance

### Phase 4: Analytics & Calculations (MEDIUM PRIORITY)
1. Revenue Summary - connect calculations
2. Harvest Window - connect to harvest service
3. Season Review - aggregate actual data

### Phase 5: Communication Features (LOW PRIORITY / FUTURE)
1. Chatbot - AI integration if time permits
2. Messages - implement or remove
3. Voice - implement or remove

## Success Criteria
- [ ] Demo account shows existing demo data
- [ ] New users see empty states or their own data
- [ ] No cross-contamination between users
- [ ] All navigation items lead to functional pages
- [ ] All API endpoints are connected where backend exists
- [ ] Loading and error states implemented
- [ ] Build completes without errors
- [ ] Application runs end-to-end without crashes

## Files to Create/Update
- [ ] `demoDataService.ts` - centralize demo data logic
- [ ] `AuthContext.tsx` - enhance with demo detection
- [ ] All screen components - add API integration
- [ ] New API client functions as needed
- [ ] Backend route files - create missing endpoints

---
**Audit Date**: 2024-11-14
**Total Features to Audit**: 15+
**Estimated Effort**: High (comprehensive refactor required)
