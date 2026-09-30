# Supabase Migration Guide

Complete guide for migrating Farm Revenue Copilot from local PostgreSQL to Supabase.

## ✅ Prerequisites Completed

- [x] Supabase project created: `[YOUR_PROJECT_ID]`
- [x] `.env` file updated with Supabase credentials
- [x] Node.js migration scripts created (no `pg_dump` needed)

## 📋 Migration Steps

### Step 1: Apply Schema to Supabase

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy the entire contents of `src/models/schema.sql`
5. Paste into SQL Editor
6. Click **Run** (or press F5)
7. Verify success: You should see "Success. No rows returned"

**Expected result:** All 7 tables created with proper indexes and constraints.

### Step 2: Disable Row Level Security (RLS)

For hackathon speed, disable RLS on all tables. In the same SQL Editor, run:

```sql
-- Disable RLS on all tables for hackathon development
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE crop_state_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE grading_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE schemes DISABLE ROW LEVEL SECURITY;
```

**⚠️ Production Note:** Re-enable RLS before production deployment with proper policies.

### Step 3: Test Supabase Connection

```powershell
node test-supabase-connection.js
```

**Expected output:**
- ✓ Connected successfully
- All 7 tables listed
- All schema columns present
- RLS status: DISABLED for all tables

If you see errors:
- Check DATABASE_URL in `.env`
- Verify database password is correct (from Supabase dashboard)
- Confirm Step 1 was completed successfully

### Step 4: Migrate Data from Local PostgreSQL

**Option A: If you have local data to migrate**

```powershell
node migrate-to-supabase.js
```

This script will:
- Connect to both local and Supabase databases
- Export data from local tables (in correct order)
- Import into Supabase tables
- Verify row counts match
- Show detailed migration report

**Option B: If starting fresh (no local data)**

Skip this step. Your Supabase database is ready with schema only.

### Step 5: Verify Migration

```powershell
node test-supabase-connection.js
```

Check that row counts match your local database (if migrating).

### Step 6: Test Feature 1 Against Supabase

```powershell
npm run test:crop-state
```

This will:
- Create a test farmer and crop in Supabase
- Run the crop state job
- Insert a row into `crop_state_snapshots`
- Verify the data was written correctly

**Expected output:**
```
✅ Test passed! Snapshot created with ID: <uuid>
Composite score: 82
Data quality: complete
```

### Step 7: Create Storage Bucket for Images

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `produce-images`
4. Set as **Public bucket** (toggle on)
5. Click **Create bucket**

This bucket will be used for grading event images (Feature 3).

### Step 8: Test REST API Endpoint

Verify the auto-generated REST API works:

```powershell
curl "https://[YOUR_PROJECT_ID].supabase.co/rest/v1/crop_state_snapshots?limit=1" `
  -H "apikey: YOUR_SUPABASE_ANON_KEY"
```

**Expected:** JSON response with the most recent crop state snapshot.

## 🎯 What Your UI Teammate Needs

Share these credentials with your frontend developer:

```env
SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=<get_from_supabase_dashboard>
```

**Note:** Get the actual anon key from Supabase Dashboard → Settings → API

They can now:
- Query all tables via REST API
- Subscribe to `recommendation_events` via Realtime
- Upload images to `produce-images` bucket
- Build the UI without waiting on your backend routes

**Example Realtime subscription (JavaScript):**

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe to new recommendations
supabase
  .channel('recommendations')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'recommendation_events' },
    (payload) => {
      console.log('New recommendation:', payload.new)
      // Show notification to farmer
    }
  )
  .subscribe()
```

## 🔍 Troubleshooting

### Connection Errors

**Error:** `getaddrinfo ENOTFOUND db.[YOUR_PROJECT_ID].supabase.co`
- Check internet connection
- Verify Supabase project URL is correct
- Try using connection string directly

**Error:** `password authentication failed`
- Double-check DB_PASSWORD in `.env` (get from Supabase Dashboard → Settings → Database)
- Reset password in Supabase Dashboard if needed

### Schema Issues

**Error:** `relation "farmers" does not exist`
- Complete Step 1 (apply schema.sql)
- Verify in Supabase → Table Editor that tables exist

**Error:** `column "predicted_revenue_impact" does not exist`
- The schema.sql includes all ALTER TABLE statements
- Re-run the full schema.sql in SQL Editor

### Migration Issues

**Error:** `pg_dump: command not found`
- Use the Node.js migration script instead: `node migrate-to-supabase.js`
- No PostgreSQL CLI tools needed

**Error:** `Cannot insert duplicate key`
- Migration script uses `ON CONFLICT DO NOTHING`
- Safe to re-run if interrupted
- Check if data already exists in Supabase

## 📊 Database Schema Reference

### Tables Created

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `farmers` | Farmer profiles | name, phone, state, land_area_ac |
| `crops` | Active crops | farmer_id, crop_type, sow_date, status |
| `crop_state_snapshots` | Feature 1 output | crop_id, score, soil_moisture_pct, growth_stage_pct |
| `recommendation_events` | Feature 2 output | crop_id, type, priority, predicted_revenue_impact |
| `grading_events` | Feature 3 output | crop_id, grade, score, image_url |
| `irrigation_logs` | Feature 2.3 output | crop_id, amount_mm, method |
| `schemes` | Government schemes | name, eligibility, states_eligible |

### Recommendation Types

Valid values for `recommendation_events.type`:
- `irrigation` - Water deficit detected
- `fertilizer` - Nutrient deficiency
- `pesticide` - Pest pressure high
- `cover` - Weather protection needed
- `do_nothing` - All conditions optimal
- `harvest` - Crop ready for harvest
- `scheme` - Eligible for government program

## 🚀 Next Steps After Migration

1. ✅ Run all test suites against Supabase
2. ✅ Verify scheduled jobs work with Supabase
3. ✅ Test Twilio SMS delivery (Feature 2.4)
4. ✅ Test weather API integration (wait for key activation)
5. 🔄 Deploy backend to production (Railway, Render, or Vercel)
6. 🔄 Share API docs with UI team
7. 🔄 Set up Supabase Realtime subscriptions
8. 🔄 Configure proper RLS policies for production

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard → Logs for error details
2. Run `node test-supabase-connection.js` for diagnostics
3. Verify all environment variables in `.env`
4. Check Supabase status: https://status.supabase.com/

## 🔐 Security Notes

**Current Setup (Hackathon):**
- RLS disabled on all tables
- Anon key has full read/write access
- Suitable for development/demo only

**Production Requirements:**
- Enable RLS on all tables
- Create policies for each table
- Use service role key only on backend
- Implement proper authentication
- Add API rate limiting
- Enable Supabase Auth for farmers
