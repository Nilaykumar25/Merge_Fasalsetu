# Government Schemes - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Test Backend API (Optional but Recommended)

```bash
cd backend
npm run test:schemes-api
```

This will test all scheme matching functionality and verify data integrity.

### 2. Start Backend

```bash
cd backend
npm run dev
```

Backend should start on `http://localhost:4000`

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend should start on `http://localhost:5173`

### 4. Test the Feature

1. **Login** to AnnaVriddhi (create account or use Google Sign-in)

2. **Complete Profile** (if not already done):
   - Click Settings in sidebar
   - Add at minimum:
     - Name
     - State (e.g., "Uttar Pradesh")
     - District (optional but recommended)
   - Save profile

3. **Navigate to Schemes**:
   - Click "Government Schemes" in the sidebar
   - Schemes should auto-load based on your state

4. **Test Filtering**:
   - Try changing the State dropdown
   - Try selecting a Category
   - Click "Search Schemes" button
   - Observe results update

5. **Test Quick Search**:
   - Click "crop insurance" chip
   - Should show PMFBY and insurance schemes
   - Click "PM-KISAN" chip
   - Should show PM-KISAN scheme

6. **Expand Scheme Details**:
   - Click on any scheme card
   - Details should expand showing:
     - Match score visualization
     - Why it matched
     - Missing information (if any)
     - Full description
     - Required documents
     - Revenue impact (if available)
     - Application link

7. **Test Application**:
   - Click "Apply Online →" button
   - Should open official government portal in new tab

## ✅ What Should Work

- ✓ Auto-load schemes when page opens (if profile complete)
- ✓ Display relevance scores (0-100%)
- ✓ Show eligibility status badges
- ✓ State filtering (only show schemes available in selected state)
- ✓ Category filtering
- ✓ Quick search chips
- ✓ Expandable scheme details
- ✓ Revenue impact display (where applicable)
- ✓ Application links to official portals
- ✓ Required documents list
- ✓ Application window status
- ✓ Match reasoning

## 🐛 Troubleshooting

### No schemes showing?

**Check:**
1. Is farmer profile complete? Need at least `state` field
2. Is backend running? Check console logs
3. Check browser console for errors
4. Verify API_BASE_URL in frontend/.env
5. Try different state in dropdown

**Debug:**
```bash
# Check backend logs
cd backend
npm run dev

# Test API directly
curl "http://localhost:4000/api/schemes/match?state=Punjab"
```

### Profile not loading?

**Check:**
1. Are you logged in?
2. Check AuthContext in browser React DevTools
3. Verify Supabase connection in frontend/.env
4. Check browser console for auth errors

### Schemes loading but not matching?

**This is normal if:**
- Your profile is incomplete (missing crop, district, etc.)
- Selected state has limited schemes
- No schemes match your specific criteria

**Try:**
- Select "All India" in state dropdown to see central schemes
- Click quick search chips for common schemes
- Complete more profile fields for better matching

### API errors?

**Check:**
1. Backend is running on port 4000
2. No CORS errors in browser console
3. Check backend console for error logs
4. Verify routes are registered in src/index.js

## 📊 Expected Results

### For Farmer from Uttar Pradesh (wheat, 2.5 acres):

Should see schemes like:
- PM-KISAN (Income Support) - High relevance
- PMFBY (Crop Insurance) - Medium-High relevance
- Kisan Credit Card - Medium relevance
- State-specific UP schemes (if any)

### For Farmer from Punjab (rice, 5 acres):

Should see schemes like:
- PM-KISAN - High relevance
- PMFBY - High relevance (rice is covered)
- Irrigation schemes - Medium relevance
- Central schemes only (no UP schemes should appear!)

### For Incomplete Profile (only state):

Should see:
- Central schemes available in that state
- Many with "INSUFFICIENT_INFORMATION" status
- Missing information indicators

## 🎯 Key Features to Demo

### 1. Intelligent Matching
"The system automatically matches schemes to YOUR farm profile"
- Show how relevance scores differ for different farmers
- Demonstrate state-based filtering

### 2. Revenue Impact
"See the potential financial benefit of each scheme"
- Expand a scheme with revenue impact
- Show the ₹ amount prominently

### 3. Application Guidance
"Direct links to apply + document checklist"
- Expand scheme
- Show required documents
- Click Apply Online button

### 4. Real-time Filtering
"Find exactly what you need with smart filters"
- Use quick search chips
- Change categories
- Watch results update instantly

### 5. Trust & Verification
"All schemes verified from official government sources"
- Point out "Verified Schemes" badge
- Show source authority and last verified date in expanded view

## 🔄 Testing Different Scenarios

### Scenario 1: New Farmer Setup
```
1. Create new account
2. Go to Schemes - see "Complete profile" message
3. Add state in Settings
4. Return to Schemes - auto-loads
5. See schemes matched to state
```

### Scenario 2: Crop Insurance Search
```
1. Login with complete profile
2. Go to Schemes
3. Click "crop insurance" quick search
4. See PMFBY as top result
5. Expand PMFBY
6. Check eligibility status
7. View required documents
8. Click Apply Online
```

### Scenario 3: State Comparison
```
1. Select "Punjab" in state dropdown
2. Note which schemes appear
3. Change to "Uttar Pradesh"
4. Compare results - different state schemes
5. Change to "All India"
6. See only central schemes
```

### Scenario 4: Complete Journey
```
1. Login
2. Navigate to Schemes
3. See auto-matched schemes
4. Click highest relevance scheme
5. Expand to see match reasoning
6. Review required documents
7. Note revenue impact
8. Click Apply Online
9. Complete application on government portal
```

## 📝 Demo Script (1 minute)

> "Let me show you our Government Schemes feature. 
>
> [Open Schemes page]
> 
> As you can see, the system has automatically found 12 government schemes that match my farm profile in Punjab.
>
> [Point to top scheme]
>
> This one has 85% relevance - let me expand it to show you why.
>
> [Click to expand]
>
> See? It matched because it's available in Punjab, applies to my wheat crop, and I meet the land size requirements. The system calculated I could potentially save ₹8,400 with this scheme.
>
> [Scroll to documents]
>
> Here's exactly what documents I need to apply.
>
> [Click Apply Online]
>
> And this button takes me directly to the official government portal.
>
> [Go back]
>
> I can also use these quick search chips - like if I click 'crop insurance'...
>
> [Click chip]
>
> ...it immediately shows me all insurance schemes, sorted by how well they match my needs.
>
> The best part? All 50+ schemes are verified from official government sources, and the system ensures state-specific schemes only show for eligible states."

## 🎨 Design Highlights

Point out during demo:
- Clean, agricultural green theme
- Visual relevance score bars
- Color-coded badges for status
- Expandable cards (progressive disclosure)
- Official government portal links
- Trust indicators (verification badges)

## 💡 Pro Tips

1. **Profile Completion = Better Matching**
   - More profile fields = higher relevance scores
   - Encourage users to complete full profile

2. **Quick Searches Are Powerful**
   - Fastest way to find specific scheme types
   - Pre-configured for common farmer needs

3. **Expand for Details**
   - All critical information in expanded view
   - Don't miss the "why matched" section

4. **Check Application Windows**
   - "CLOSING_SOON" badges are critical
   - Year-round schemes are always available

5. **Revenue Impact**
   - Not all schemes show revenue (credit schemes don't)
   - Direct transfers and subsidies show clear ₹ amounts

## 🚢 Production Checklist

Before deploying:
- [ ] Backend running on production server
- [ ] Frontend API_BASE_URL points to production
- [ ] Supabase connection configured
- [ ] Firebase Auth configured
- [ ] All environment variables set
- [ ] Scheme data is up-to-date (check last_verified_at dates)
- [ ] Test with multiple farmer profiles
- [ ] Verify state filtering works correctly
- [ ] Check application links are valid
- [ ] Test on mobile devices
- [ ] Verify error handling
- [ ] Check loading states
- [ ] Test with slow network

## 📚 Additional Resources

- Full documentation: `GOVERNMENT_SCHEMES_README.md`
- Backend API: `backend/src/routes/schemes.js`
- Matching logic: `backend/src/services/schemesService.js`
- Scheme data: `backend/src/models/schemeSeedData.js`
- Frontend component: `frontend/src/screens/Schemes.tsx`

## 🆘 Need Help?

1. Check backend console logs for errors
2. Check browser console for frontend errors
3. Use React DevTools to inspect AuthContext
4. Test API endpoints directly with curl/Postman
5. Review GOVERNMENT_SCHEMES_README.md for detailed info

## ✨ Success Criteria

You'll know it's working when:
- ✅ Schemes load automatically on page open
- ✅ Relevance scores make sense for your profile
- ✅ State filtering excludes schemes from other states
- ✅ Quick searches find relevant schemes
- ✅ Expanded details show complete information
- ✅ Application links work and open government portals
- ✅ No console errors
- ✅ Loading states display properly
- ✅ Error messages are user-friendly

---

**Happy Testing! 🎉**

For detailed technical documentation, see `GOVERNMENT_SCHEMES_README.md`.
