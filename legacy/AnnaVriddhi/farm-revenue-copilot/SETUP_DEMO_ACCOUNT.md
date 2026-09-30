# Demo Account Setup Guide

This guide explains how to set up the demo account (demo@123) in Supabase.

## Demo Account Credentials

- **Email**: `demo@123`
- **Password**: `123`

## Setup Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter:
   - Email: `demo@123`
   - Password: `123`
   - Auto Confirm User: **Yes** (check this box)
5. Click **Create user**

The demo account is now ready! When users log in with these credentials, the frontend will automatically:
- Detect this is the demo account (by email)
- Load mock data from `/frontend/src/mocks/data.js`
- Display the complete demo experience with hardcoded farmer data

### Option 2: Using Supabase SQL Editor

Run this SQL in your Supabase SQL Editor:

```sql
-- Create demo user in auth.users
-- Note: This requires admin access to auth schema
-- Password hash for '123' - you may need to create via dashboard instead
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo@123',
  crypt('123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  ''
);
```

**Important**: Creating auth users via SQL can be tricky. We recommend using Option 1 (Dashboard) instead.

## How Demo Mode Works

### Frontend Detection

The frontend automatically detects the demo account in `AuthContext.tsx`:

```typescript
// Check if user email is demo@123
if (isDemoAccount(userEmail)) {
  // Load demo farmer profile from demoDataService
  const demoFarmer = getDemoFarmer(userId);
  setFarmer(demoFarmer);
  localStorage.setItem('is_demo_account', 'true');
}
```

### Demo Data Loading

When `is_demo_account` flag is set in localStorage:

1. **DataContext** loads mock data instead of querying database
2. All demo data comes from `/frontend/src/mocks/data.js`
3. Includes: farmer profile, crops, recommendations, alerts, schemes, grading history

### Mock Data Contents

The demo account shows:
- **Farmer**: Ramesh Kumar from Nashik, Maharashtra
- **Crops**: Wheat (HD-3086) and Cotton (Bt)
- **Recommendations**: 3 active recommendations (irrigation, monitoring, pest management)
- **Alerts**: Disease detection (powdery mildew)
- **Schemes**: PM-KISAN, Fasal Bima, KCC, e-NAM
- **Grading History**: Multiple grading records
- **Season Data**: Kharif 2026 season review

## Real Users vs Demo Account

### Demo Account (demo@123)
- ✅ Loads hardcoded mock data
- ✅ Shows complete demo experience
- ✅ No database records created
- ✅ All features visible with sample data

### Real Users (any other email)
- ✅ Creates real farmer record in `farmers` table
- ✅ Loads user-specific data from database
- ✅ Empty dashboard on first login (no hardcoded data)
- ✅ Data persists across sessions

## Testing the Demo Account

1. Log out if currently logged in
2. Go to Landing page
3. Click "Sign In"
4. Enter:
   - Email: `demo@123`
   - Password: `123`
5. Click "Sign In"
6. Should see dashboard with Ramesh's farm data

## Troubleshooting

### "Invalid login credentials"
- Make sure you created the user via Supabase Dashboard
- Check that email is exactly `demo@123` (lowercase)
- Check that Auto Confirm User was checked

### Demo data not loading
- Check browser console for errors
- Verify `is_demo_account` flag in localStorage (should be 'true')
- Check that `/frontend/src/mocks/data.js` exists

### Real users seeing demo data
- This should NEVER happen
- Demo data only loads when email === 'demo@123'
- Real users get their own database records
- Check AuthContext.tsx `isDemoAccount()` function
