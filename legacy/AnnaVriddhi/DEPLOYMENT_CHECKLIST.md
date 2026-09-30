# AnnaVriddhi Farm Revenue Copilot - Deployment Checklist

## Pre-Deployment Setup

### Supabase Configuration
- [ ] **1. Deploy Database Schema**
  - Go to Supabase Dashboard → SQL Editor
  - Create new query and run `/backend/supabase/migrations/001_init_schema.sql`
  - Verify tables created: 20 tables, 5 seeded schemes
  - Expected output: 5 rows inserted into government_schemes

- [ ] **2. Verify Auth Configuration**
  - Supabase Dashboard → Authentication → Providers
  - Confirm Email provider is enabled
  - Set up email templates (optional but recommended)

- [ ] **3. Test RLS Policies**
  - Run query: `SELECT * FROM farmers;` (should show only own row)
  - Verify policies are restricting access correctly

### Frontend Setup
- [ ] **4. Install Dependencies**
  ```bash
  cd farm-revenue-copilot/frontend
  npm install
  ```

- [ ] **5. Verify Environment Variables**
  - Check `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Verify values match your Supabase project

- [ ] **6. Build Check**
  ```bash
  npm run build
  ```
  - Should complete with "✓ built successfully"
  - Check dist/ folder exists with assets

## Local Testing

### Authentication Flow
- [ ] **7. Test Signup**
  - Start dev server: `npm run dev`
  - Navigate to http://localhost:8443
  - Click "Create Account"
  - Enter test farmer data
  - Verify user created in Supabase Auth → Users
  - Verify farmer profile in Supabase SQL: `SELECT * FROM farmers;`
  - Verify user_settings auto-created

- [ ] **8. Test Login**
  - Clear browser localStorage (DevTools → Application → Storage → Clear all)
  - Return to login screen
  - Enter test farmer credentials
  - Verify dashboard loads

- [ ] **9. Test Logout**
  - Click Settings (if available)
  - Verify logout clears auth state
  - Redirected to landing page

### Data Loading
- [ ] **10. Populate Demo Data**
  - Get your farmer ID from Supabase: `SELECT id FROM farmers LIMIT 1;`
  - Replace placeholders in `/backend/supabase/seed_demo_data.sql`
  - Run the seed script in SQL Editor
  - Verify data inserted (check row counts)

- [ ] **11. Test Dashboard**
  - Login with test account
  - Dashboard should display:
    - [ ] Farmer name and farm info
    - [ ] Crops list
    - [ ] Crop health card (today's score)
    - [ ] Top 3 recommendations
    - [ ] Active alerts
    - [ ] Recent activity

- [ ] **12. Test Crop Selection**
  - Click on a crop in the list
  - Crop Condition screen should load
  - Display 7-day health history chart
  - Show all health metrics

- [ ] **13. Test Recommendations**
  - Click top recommendation
  - Recommendation detail screen shows:
    - Title, description, why_now
    - Predicted revenue impact
    - Action checklist
    - Frequency and deadline

- [ ] **14. Test Alerts**
  - Navigate to Alert screen
  - Display all active alerts
  - Show severity, description, recommended action

- [ ] **15. Test Schemes**
  - Navigate to Schemes screen
  - Display list of 5 seeded government schemes
  - Show eligibility, deadline, benefits
  - Verify scheme applications can be created

- [ ] **16. Test Grading History**
  - Navigate to Grading History
  - Display past produce grades
  - Show grade, quality score, price, batch revenue
  - Verify date sorting

### Performance & Errors
- [ ] **17. Check Console for Errors**
  - Open DevTools → Console
  - No red errors during app startup
  - Check for missing environment variables
  - Verify no API 401/403 errors

- [ ] **18. Test with No Data**
  - Delete demo data from database
  - Login with empty farmer profile
  - Verify graceful handling (no crashes)
  - Show empty state screens

- [ ] **19. Test Network Throttling**
  - DevTools → Network → Slow 3G
  - Verify loading states appear
  - Data loads without timeout errors
  - Graceful error handling if requests fail

## Production Deployment

### Vercel/Netlify Deployment
- [ ] **20. Create Production Build**
  ```bash
  npm run build
  ```

- [ ] **21. Deploy Frontend**
  - Push code to GitHub
  - Connect to Vercel/Netlify
  - Set environment variables:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
  - Deploy (auto or manual trigger)
  - Verify production URL works

- [ ] **22. Test Production Auth**
  - Visit production URL
  - Attempt signup with new email
  - Verify email confirmation works (if enabled)
  - Verify production Supabase data isolation

### Supabase Production Hardening
- [ ] **23. Review RLS Policies**
  - Verify all tables have RLS enabled
  - Check SELECT policies restrict to user's data
  - Verify INSERT policies check user ownership
  - Test UPDATE/DELETE policies (should fail for other users' data)

- [ ] **24. Set Supabase Rate Limits**
  - Supabase Dashboard → Settings → Rate Limits
  - Set auth rate limit: 10 req/min per IP
  - Set API rate limit: 100 req/min per user
  - Set websocket limit: 10 connections per user

- [ ] **25. Enable Backup**
  - Supabase Dashboard → Settings → Database Backups
  - Enable daily backups
  - Set retention to 30 days

- [ ] **26. Monitor Usage**
  - Supabase Dashboard → Usage
  - Set up usage alerts
  - Monitor Auth requests, Storage, Realtime

### Security Review
- [ ] **27. Verify Environment Variables**
  - No secrets committed to Git
  - `.env` files in `.gitignore`
  - Production secrets only in deployment platform

- [ ] **28. Test CORS**
  - Supabase Dashboard → Settings → API
  - Allowed origins should include production domain
  - Verify API calls work from production URL

- [ ] **29. Check Sensitive Queries**
  - No direct SELECT * on farmer data from client
  - Verify RLS policies prevent data leaks
  - Test cross-farmer data access (should fail)

- [ ] **30. Enable HTTPS**
  - Verify production URL uses HTTPS
  - Check SSL certificate is valid
  - Test mixed content warnings (none should appear)

## Post-Deployment Monitoring

### Weekly Checks
- [ ] **31. Review Supabase Logs**
  - Check for failed auth attempts
  - Monitor API error rates
  - Look for unusual query patterns

- [ ] **32. Test Key Workflows**
  - Signup new test user
  - Add demo data
  - Verify all screens load
  - Check no 401/403 errors

- [ ] **33. User Feedback**
  - Collect feedback from test farmers
  - Document issues or feature requests
  - Prioritize critical bugs

### Monthly Tasks
- [ ] **34. Database Health**
  - Run: `SELECT tablename FROM pg_tables WHERE schemaname='public';`
  - Verify all 20 tables exist
  - Check row counts reasonable

- [ ] **35. Backup Verification**
  - Verify backups are running
  - Test restore process (non-production)
  - Document restore procedure

- [ ] **36. Performance Review**
  - Monitor query performance
  - Check for slow queries
  - Optimize indexes if needed

## Rollback Plan

If production deployment fails:

1. **Immediate Rollback**
   - Revert frontend deployment to previous version
   - Supabase is always live (no version switching needed)

2. **Database Recovery** (if needed)
   - Go to Supabase Dashboard → Backups
   - Restore previous backup
   - Will lose data since last backup

3. **Communication**
   - Notify users of outage
   - Provide ETA for restoration
   - Post-mortem review

## Sign-Off

- [ ] **Team Lead Sign-Off**: _________________ Date: _______
- [ ] **QA Sign-Off**: _________________ Date: _______
- [ ] **DevOps Sign-Off**: _________________ Date: _______

## Notes for Future Deployments

```
[Space for deployment notes, lessons learned, blockers encountered]
```
