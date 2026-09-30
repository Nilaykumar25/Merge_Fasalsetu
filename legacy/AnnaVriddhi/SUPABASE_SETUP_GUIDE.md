# AnnaVriddhi Farm Revenue Copilot - Supabase Setup Guide

## Overview
This guide walks you through setting up the Supabase backend for the AnnaVriddhi Farm Revenue Copilot. The app now uses a real database with authentication, removing all hardcoded data.

## Prerequisites
- Supabase account (https://supabase.com)
- Supabase project already created with credentials in `.env`
- Node.js 18+ installed

## Setup Steps

### 1. **Deploy Supabase Schema**

The complete SQL schema is in `/backend/supabase/migrations/001_init_schema.sql`

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project → SQL Editor
2. Create a new query
3. Copy and paste the entire contents of `001_init_schema.sql`
4. Click "Run"

**Option B: Using Supabase CLI**
```bash
cd farm-revenue-copilot/backend
supabase db push
```

### 2. **Install Frontend Dependencies**

```bash
cd farm-revenue-copilot/frontend
npm install
```

This installs the new Supabase packages:
- `@supabase/supabase-js` - Supabase client library
- `@supabase/auth-ui-react` - Authentication UI components
- `@supabase/auth-ui-shared` - Shared auth utilities

### 3. **Environment Setup**

Verify `.env.local` in the frontend directory has your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

These are already configured from the project `.env`.

### 4. **Start the Dev Server**

```bash
npm run dev
```

The app will start at `http://localhost:8443`

## User Flow

### New User Signup
1. User lands on **Landing Page** (unauthenticated)
2. Click "Open App" → redirects to **Auth Screen**
3. Click "Create Account" → signup form
4. Enter: name, email, password, state, district, village, farm area
5. System creates:
   - Auth user in Supabase Auth
   - Farmer profile in `farmers` table
   - User settings in `user_settings` table (auto-created via trigger)
6. User is logged in and redirected to **Dashboard**

### Existing User Login
1. User enters email + password on Auth Screen
2. System authenticates via Supabase Auth
3. Loads farmer profile and user settings
4. Redirected to Dashboard with all personal data loaded

### Dashboard & Screens
- **Dashboard**: Shows crop overview, top 3 recommendations, alerts, recent activity
- **Crop Condition**: Detailed health metrics for selected crop
- **Irrigation/Harvest/Disease**: Guidance screens with real sensor data
- **Grading**: Produce grade capture and history
- **Schemes**: Government scheme applications
- **Season Review**: Multi-recommendation impact analysis

## Data Architecture

### Authentication Flow
```
User Signup
    ↓
Supabase Auth (creates auth user)
    ↓
AuthContext.signUp()
    ↓
Insert farmer profile + auto-create user_settings
    ↓
DataProvider loads plots, crops, recommendations, alerts
    ↓
Render Dashboard with real data
```

### Data Loading Hierarchy
```
App
  ├── AuthProvider (manages user + farmer profile)
  │   ├── stores: user, session, farmer, userSettings
  │   └── auto-syncs on mount + auth state changes
  │
  └── (if authenticated)
      └── DataProvider (manages app data)
          ├── plots + crops (from plots/crops tables)
          ├── crop health (from crop_health_daily table)
          ├── recommendations (from recommendations table)
          ├── alerts (from alerts table)
          ├── messages (from messages table)
          └── active season (from seasons table)
```

### Real-time Subscriptions (Future Enhancement)
Add this to DataContext for live updates:

```typescript
// Subscribe to recommendations changes
supabase
  .from('recommendations')
  .on('*', payload => {
    setRecommendations(prev => [...prev, payload.new]);
  })
  .subscribe();
```

## Database Schema

20 tables organized by feature:

### Core Domain
- **farmers** - User profiles
- **plots** - Farm fields
- **crops** - Crops per field
- **crop_health_daily** - Daily health metrics

### Features
- **recommendations** - Actionable guidance
- **alerts** - Critical issues
- **produce_grades** - Grading history
- **government_schemes** - Scheme catalog (seeded with 5 schemes)
- **farmer_scheme_applications** - Application tracking

### Planning & Review
- **seasons** - Multi-crop seasons
- **season_reviews** - Insights + impact analysis
- **harvest_plans** - Harvest timing optimization

### Sensors & Intelligence
- **sensor_readings** - Raw sensor data (moisture, N, pH, etc.)
- **field_scans** - AI disease detection + analysis results
- **fertilizer_applications** - Fertilizer application log
- **weather_forecast** - 7-day weather data per plot

### Communication
- **messages** - In-app notifications
- **activity_log** - Farmer activity timeline
- **user_settings** - Notification preferences + theme

### System
- **sync_log** - Offline sync tracking

All tables have Row-Level Security (RLS) policies ensuring farmers only access their own data.

## Key Services

### AuthContext (`src/contexts/AuthContext.tsx`)
- `signUp(email, password, farmerData)` - Create account + farmer profile
- `signIn(email, password)` - Login
- `signOut()` - Logout
- Automatically loads farmer profile on auth state change

### DataContext (`src/contexts/DataContext.tsx`)
- `refreshAll()` - Load plots, crops, recommendations, alerts, messages
- `setCurrentCrop(crop)` - Select crop + load its health data
- `refreshCropHealth()` - Reload 7-day health history for selected crop
- `markMessageAsRead(messageId)` - Mark notification as read
- Provides hooks: `useAuth()`, `useData()`

### supabaseService (`src/services/supabaseService.ts`)
30+ query methods:
- `getPlots()`, `createPlot()`
- `getCrops()`, `getCropWithHealth()`
- `getCropHealthHistory()`, `getCropHealthToday()`
- `getRecommendations()`, `updateRecommendation()`
- `getAlerts()`, `createAlert()`
- `getProduceGrades()`, `createProduceGrade()`
- `getGovernmentSchemes()`, `getSchemesByState()`
- `getSeasons()`, `getActiveSeason()`
- `getMessages()`, `markMessageAsRead()`
- ... and more

## Updating Screens

To convert a hardcoded screen to use real data:

### Before (Hardcoded)
```typescript
import mockData from '../mocks/data';

export default function Dashboard() {
  const { farmer, crops, recommendations } = mockData;
  // Display hardcoded data
}
```

### After (Dynamic)
```typescript
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export default function Dashboard() {
  const { farmer } = useAuth();
  const { crops, topRecommendations, alerts } = useData();
  // Display real data
}
```

## Common Patterns

### Load Screen Data
```typescript
import { useData } from '../contexts/DataContext';

export default function MyScreen() {
  const { crops, currentCrop, cropHealthHistory, loading } = useData();
  
  if (loading) return <LoadingState />;
  if (!currentCrop) return <NoCropState />;
  
  return <ScreenContent crop={currentCrop} health={cropHealthHistory} />;
}
```

### Update Record
```typescript
import * as supabaseService from '../services/supabaseService';

const handleFollowRecommendation = async (recId) => {
  try {
    const updated = await supabaseService.updateRecommendation(recId, {
      status: 'followed',
      action_taken_date: new Date().toISOString().split('T')[0],
    });
    // Refresh UI
    await refreshRecommendations();
  } catch (err) {
    console.error('Update failed:', err);
  }
};
```

### Create Record
```typescript
const handleCreateAlert = async (cropId, alertData) => {
  try {
    const alert = await supabaseService.createAlert({
      crop_id: cropId,
      farmer_id: farmer.id,
      ...alertData,
    });
    // Show confirmation
  } catch (err) {
    console.error('Creation failed:', err);
  }
};
```

## Testing

### Test Signup Flow
1. Start dev server
2. Click "Create Account" on Auth screen
3. Fill in form with test farmer data
4. Go to Supabase Dashboard → Auth → Users (verify user created)
5. Go to SQL Editor → SELECT * FROM farmers (verify farmer profile)
6. Dashboard should load with empty crop list (awaiting data entry)

### Test Data Loading
1. Manually insert test data into Supabase tables via SQL:
   ```sql
   INSERT INTO plots (farmer_id, name, area_acres, soil_type) VALUES (
     'your-farmer-id', 'Plot A', 2.5, 'loamy'
   );
   
   INSERT INTO crops (plot_id, crop_name, variety, current_stage, health_status) VALUES (
     'your-plot-id', 'Wheat', 'HD2987', 'Vegetative', 'healthy'
   );
   ```
2. Return to Dashboard (should show new crop)
3. Click crop → Crop Condition screen loads health data

### Test Recommendations
1. Insert recommendation record:
   ```sql
   INSERT INTO recommendations (crop_id, farmer_id, type, priority, title, status) VALUES (
     'your-crop-id', 'your-farmer-id', 'irrigation', 'high', 'Increase watering', 'pending'
   );
   ```
2. Dashboard shows top recommendations
3. Click recommendation → Recommendation detail screen

## Troubleshooting

### "Farmer not found" after signup
- Check Supabase Auth users table exists
- Verify auth trigger creates farmer record
- Check RLS policies aren't blocking inserts

### Data not loading on Dashboard
- Verify farmer profile exists in `farmers` table
- Check DataContext `loading` state
- Check browser console for Supabase errors
- Verify RLS policies allow SELECT for authenticated user

### "VITE_SUPABASE_URL is not defined"
- Verify `.env.local` exists in frontend directory
- Restart dev server after adding .env file
- Check variables start with `VITE_` for Vite to expose them

### Authentication not persisting
- Clear browser localStorage
- Check `persistSession: true` in supabase.ts
- Verify Supabase project has Auth enabled

## Next Steps

1. **Seed Demo Data**: Insert sample plots, crops, recommendations, alerts via SQL
2. **Integrate Sensor API**: Connect real IoT sensor data to sensor_readings table
3. **Add Realtime Subscriptions**: Use Supabase Realtime for live health updates
4. **Implement Grading ML**: Connect crop grading image analysis to field_scans table
5. **Add SMS/WhatsApp**: Use Twilio + messages table for notifications
6. **Analytics Dashboard**: Query seasons + recommendations for farmer insights

## Support

For issues or questions:
1. Check Supabase logs in Dashboard → Functions
2. Check frontend console for client errors
3. Run SQL queries in Supabase SQL Editor to verify data
4. Check RLS policies: SQL Editor → Run → View → RLS policies
