# Supabase Migration - Quick Start Guide

## 🚨 Current Issue: Project May Be Paused

The database hostname `db.[YOUR_PROJECT_ID].supabase.co` is not resolving. This typically means:

1. **Supabase project is paused** (free tier pauses after inactivity)
2. Network connectivity issue

## ✅ STEP 1: Wake Up Your Supabase Project

### Option A: Via Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]
2. You should see a "Resume Project" or "Restore Project" button if paused
3. Click to activate the project
4. Wait 1-2 minutes for the database to become available
5. Proceed to Step 2

### Option B: Via Any Database Query

Simply visiting the dashboard or making any API call will wake up the project automatically.

## ✅ STEP 2: Apply Schema to Supabase

You MUST do this through the Supabase Dashboard (not via direct PostgreSQL connection):

1. Open: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql/new
2. Copy the **entire** contents of `src/models/schema.sql`
3. Paste into the SQL Editor
4. Click **Run** (or press F5)
5. Wait for "Success. No rows returned"

**✓ This creates all 7 tables with proper columns and indexes**

## ✅ STEP 3: Disable Row Level Security (RLS)

In the same SQL Editor, run this:

```sql
-- Disable RLS for hackathon speed (re-enable for production!)
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE crop_state_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE grading_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE schemes DISABLE ROW LEVEL SECURITY;
```

## ✅ STEP 4: Test Connection

After completing Steps 1-3, try:

```powershell
node test-supabase-simple.js
```

**Expected output:**
```
✅ Connected successfully!
Server time: 2026-09-11...
PostgreSQL version: PostgreSQL 15.x
```

If still failing:
- Check if project is fully restored (status indicator in dashboard)
- Try waiting another minute
- Check Supabase status page: https://status.supabase.com/

## ✅ STEP 5: Migrate Data (If You Have Local Data)

### Option A: If Local PostgreSQL is Running

```powershell
npm run migrate:supabase
```

This will:
- Export data from `farm_revenue_copilot` local database
- Import into Supabase
- Verify row counts match

### Option B: If No Local Data (Starting Fresh)

Skip migration! Your Supabase database is ready with empty tables.

Optionally seed with test data:

```powershell
node src/models/seedDatabase.js
```

## ✅ STEP 6: Verify Everything Works

```powershell
# Test Supabase connection
npm run test:supabase

# Test Feature 1 (Crop State Job)
npm run test:crop-state

# Test Feature 2 (Alerts)
npm run test:alerts

# Test Feature 2.3 (Irrigation)
npm run test:irrigation

# Test Feature 2.4 (SMS/WhatsApp)
npm run test:delivery
```

## 🎯 What If Direct PostgreSQL Access Never Works?

If the direct PostgreSQL connection continues to fail, you can still use Supabase via the REST API:

### Update db.js to Use Supabase Client

Instead of direct PostgreSQL connection, use the `@supabase/supabase-js` client:

```bash
npm install @supabase/supabase-js
```

Then modify `src/models/db.js` to use Supabase client for queries.

### Or Use pgBouncer Connection Pooler

Try the transaction mode pooler:

```
postgresql://postgres.[PROJECT_ID]:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

## 📊 Quick Verification Commands

### Check if tables exist (via SQL Editor):
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected: 7 tables (crops, crop_state_snapshots, farmers, grading_events, irrigation_logs, recommendation_events, schemes)

### Check row counts (via SQL Editor):
```sql
SELECT 
  'farmers' as table_name, COUNT(*) as rows FROM farmers
UNION ALL SELECT 'crops', COUNT(*) FROM crops
UNION ALL SELECT 'crop_state_snapshots', COUNT(*) FROM crop_state_snapshots
UNION ALL SELECT 'recommendation_events', COUNT(*) FROM recommendation_events
UNION ALL SELECT 'grading_events', COUNT(*) FROM grading_events
UNION ALL SELECT 'irrigation_logs', COUNT(*) FROM irrigation_logs
UNION ALL SELECT 'schemes', COUNT(*) FROM schemes;
```

### Test REST API (via PowerShell):
```powershell
curl "https://[YOUR_PROJECT_ID].supabase.co/rest/v1/farmers?limit=1" `
  -H "apikey: $env:SUPABASE_ANON_KEY" `
  -H "Content-Type: application/json"
```

## 🔧 Troubleshooting

### Error: "getaddrinfo ENOTFOUND db.[YOUR_PROJECT_ID].supabase.co"

**Solution:** Project is paused. Visit dashboard to wake it up (Step 1).

### Error: "relation does not exist"

**Solution:** Schema not applied yet. Complete Step 2.

### Error: "permission denied for table"

**Solution:** RLS still enabled. Complete Step 3.

### Error: "password authentication failed"

**Solution:** Check password in `.env` (get from Supabase Dashboard → Settings → Database)

### Connection works but queries fail

**Solution:** Ensure you completed Steps 2 & 3 (schema + RLS)

## 📞 Your Credentials Summary

```
Project URL: https://[YOUR_PROJECT_ID].supabase.co
Direct DB Host: db.[YOUR_PROJECT_ID].supabase.co
Pooler Host: aws-0-ap-south-1.pooler.supabase.com
Port: 5432 (direct) or 6543 (pooler)
Database: postgres
User: postgres
Password: [Get from Supabase Dashboard → Settings → Database]

Anon Key: [Get from Supabase Dashboard → Settings → API]
Service Role Key: [Get from Supabase Dashboard → Settings → API]
```

## 🚀 Once Everything Works

1. ✅ All tests pass
2. ✅ Scheduled jobs work against Supabase
3. ✅ SMS/WhatsApp delivery working
4. ✅ Share API credentials with frontend team
5. ✅ Deploy backend to production (Railway, Render, Vercel)

## 📝 Next Steps After Migration

- [ ] Create `produce-images` storage bucket in Supabase
- [ ] Set up Supabase Realtime for live updates
- [ ] Configure proper RLS policies for production
- [ ] Add authentication for farmers
- [ ] Deploy backend API server
- [ ] Hand off to UI team with credentials

---

**Need Help?** 
1. Check Supabase logs: Dashboard → Logs
2. Verify project status: Dashboard → Settings → General
3. Test with SQL Editor first before trying Node.js connection
