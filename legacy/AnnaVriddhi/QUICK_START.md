# AnnaVriddhi Farm Revenue Copilot - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+
- Supabase account (https://supabase.com) with project already created
- Your Supabase credentials (already in `.env`)

### Step 1: Deploy Database Schema (2 min)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create **New Query**
3. Copy entire file: `/farm-revenue-copilot/backend/supabase/migrations/001_init_schema.sql`
4. Paste into editor → **Run**
5. Verify: `SELECT COUNT(*) FROM government_schemes;` → Should return **5**

✅ Database is ready!

---

### Step 2: Install Frontend & Start Dev Server (2 min)

```bash
cd farm-revenue-copilot/frontend
npm install
npm run dev
```

Dev server starts at **http://localhost:8443**

✅ App is running!

---

### Step 3: Test Signup Flow (1 min)

1. Open http://localhost:8443
2. Click "Create Account"
3. Fill form:
   - Name: `Ramesh Kumar`
   - Email: `test@farm.com`
   - Password: `TestPass123!`
   - State: `Maharashtra`
   - District: `Nashik`
   - Village: `Dindori`
   - Farm Area: `2.5`
4. Click "Create Account"
5. Dashboard loads ✅

**Check Supabase:**
- Auth Users: Dashboard → Authentication → Users (see your user created)
- Farmer Profile: SQL Editor → `SELECT * FROM farmers;` (see profile)
- User Settings: `SELECT * FROM user_settings;` (auto-created)

---

### Step 4: Populate Demo Data (1 min - Optional)

To see recommendations, alerts, and crop health:

1. Get your farmer ID: `SELECT id FROM farmers LIMIT 1;`
2. Open `/farm-revenue-copilot/backend/supabase/seed_demo_data.sql`
3. Replace `'FARMER_ID_HERE'` with your actual ID (same in 2 places)
4. Replace `'PLOT_ID_1'` and `'PLOT_ID_2'` with plot IDs from: `SELECT id FROM plots;`
5. Replace `'CROP_ID_1'` and `'CROP_ID_2'` with crop IDs from: `SELECT id FROM crops;`
6. Paste entire script → Run in SQL Editor
7. Return to Dashboard → **F5 refresh** → See data loaded! ✅

---

## 📱 App Navigation

**Unauthenticated:**
- Landing Page (public overview)
- Auth Screen (sign in / sign up)

**Authenticated:**
- **Dashboard** → Main hub with crop health, top recommendations, alerts
- **Crop Condition** → Detailed 7-day health metrics + trends
- **Irrigation** → Water management + ET rate
- **Harvest Window** → Timing optimization + price forecast
- **Disease** → Pest/nutrient detection + recommendations
- **Grading** → Produce quality scoring
- **Schemes** → Government program applications
- **Season Review** → Impact analysis + recommendations follow-up
- **Messages** → Notifications inbox
- **Settings** → Preferences

---

## 🔑 Key Files

**Backend (Database)**
- `backend/supabase/migrations/001_init_schema.sql` - 20-table schema
- `backend/supabase/seed_demo_data.sql` - Test data fixture

**Frontend (React + Supabase)**
- `frontend/src/lib/supabase.ts` - Supabase client + types
- `frontend/src/contexts/AuthContext.tsx` - User authentication
- `frontend/src/contexts/DataContext.tsx` - App state management
- `frontend/src/services/supabaseService.ts` - Database queries
- `frontend/src/screens/Auth.tsx` - Login/signup UI
- `frontend/src/App.tsx` - Route management

**Configuration**
- `frontend/.env.local` - Supabase credentials (already set)

**Documentation**
- `SUPABASE_SETUP_GUIDE.md` - Complete architecture + patterns
- `DEPLOYMENT_CHECKLIST.md` - 36-point verification
- `farm-revenue-copilot/SUPABASE_INTEGRATION_SUMMARY.md` - Overview

---

## 🐛 Troubleshooting

**"Cannot find module '@supabase/supabase-js'"**
→ Run: `npm install`

**"VITE_SUPABASE_URL is undefined"**
→ Restart dev server after npm install

**"No farmers found after signup"**
→ Check Supabase Auth → Users (user created?)
→ Check SQL: `SELECT * FROM farmers;`
→ Check browser console for errors

**Data not showing on Dashboard**
→ Run demo seed script (Step 4 above)
→ Refresh page (F5)

**"Farmer ID not found" when seeding data**
→ Run: `SELECT id FROM farmers;` first
→ Get actual ID, replace in seed script

---

## 🎯 What's Next

### For Testing
- [ ] Test all screens with demo data
- [ ] Try updating a recommendation status
- [ ] Try marking messages as read
- [ ] Test logout + re-login

### For Development
- [ ] Convert remaining screens to use real data (see SUPABASE_SETUP_GUIDE.md)
- [ ] Add real-time subscriptions for live updates
- [ ] Connect sensor data API
- [ ] Implement crop grading ML

### For Production
- [ ] Deploy database schema to production Supabase
- [ ] Build + deploy frontend to Vercel/Netlify
- [ ] Test all flows in production
- [ ] Monitor Supabase usage

---

## 📊 Architecture Overview

```
Frontend (React + TypeScript)
│
├─ AuthProvider
│  ├─ useAuth() hook
│  └─ User profile + session
│
├─ DataProvider (inside authenticated routes)
│  ├─ useData() hook
│  └─ crops, recommendations, alerts, health, messages
│
└─ 20+ screens
   ├─ Auth, Landing, Dashboard
   ├─ Crop Condition, Irrigation, Harvest Window, Disease
   ├─ Grading, Schemes, Season Review
   └─ Settings, Messages, Help, Offline

         ↓

Supabase Backend
│
├─ PostgreSQL Database
│  ├─ 20 tables (farmers, crops, recommendations, etc.)
│  ├─ Row-Level Security (RLS) for data isolation
│  └─ Triggers for auto-created fields
│
├─ Authentication
│  ├─ Email/password signup
│  └─ Session management
│
└─ Real-time (Realtime subscriptions - future)
```

---

## 💡 Quick Links

- **Supabase Dashboard**: https://app.supabase.com
- **Frontend Dev**: http://localhost:8443
- **Repo**: `/farm-revenue-copilot`
- **Credentials**: `/frontend/.env.local`

---

## ✅ Verification Checklist

After setup, verify:
- [ ] Dev server running at http://localhost:8443
- [ ] Can create account successfully
- [ ] Account visible in Supabase Auth
- [ ] Farmer profile created in database
- [ ] Demo data loaded (if seed script ran)
- [ ] Dashboard shows crops + recommendations + alerts
- [ ] Can navigate between screens
- [ ] Can logout + re-login
- [ ] No errors in browser console

---

**Status:** ✅ Ready to use
**Last Updated:** September 2026
**Build:** v1.0.0
