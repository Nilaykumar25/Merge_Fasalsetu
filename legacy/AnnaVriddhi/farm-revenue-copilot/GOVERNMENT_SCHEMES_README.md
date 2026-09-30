# Government Schemes Feature - AnnaVriddhi

## Overview

The Government Schemes feature provides intelligent, personalized matching of government agricultural schemes to farmers based on their profile, location, and current farming activities.

## Architecture

### Backend (Already Implemented)

**Location:** `backend/src/`

#### Core Components:

1. **Scheme Data** (`models/schemeSeedData.js`)
   - 50+ verified government schemes
   - Central and state-level schemes
   - Categories: Income Support, Crop Insurance, Credit, Irrigation, Soil Health, etc.
   - Official source URLs and verification dates included

2. **Matching Engine** (`services/schemesService.js`)
   - Multi-factor eligibility evaluation
   - Relevance scoring (0-100)
   - Geographic filtering (state/district)
   - Crop applicability matching
   - Activity-based filtering
   - Season matching
   - Land size eligibility
   - Application window status tracking
   - Revenue impact calculation

3. **API Routes** (`routes/schemes.js`)
   - `GET /api/schemes/match` - Match schemes to farmer profile
   - `GET /api/schemes/state/:state` - Browse by state
   - `GET /api/schemes/category/:category` - Browse by category
   - `GET /api/schemes/:schemeId` - Get single scheme details

### Frontend (Newly Implemented)

**Location:** `frontend/src/screens/Schemes.tsx`

#### Features:

1. **Farmer-Context Matching**
   - Automatically uses authenticated farmer's profile
   - State, district, crop, land size integration
   - Real-time eligibility evaluation

2. **Search & Filters**
   - State dropdown (15+ states supported)
   - Category dropdown (9 categories)
   - Quick search chips for common schemes
   - Real backend API integration

3. **Scheme Cards**
   - Relevance score with visual progress bar
   - Eligibility status badges
   - Application window status
   - Expandable details view
   - Revenue impact display
   - Required documents list
   - Direct application links

4. **Loading States**
   - Loading spinner during API calls
   - Error handling with user-friendly messages
   - Empty state guidance
   - Profile completion prompts

## Data Flow

```
User Opens Schemes Page
       ↓
Frontend loads farmer profile from AuthContext
       ↓
Auto-fetch schemes using farmer's state/district
       ↓
Backend: schemesService.match(farmerProfile)
       ↓
Geographic filtering (HARD: state must match)
       ↓
Relevance scoring (state, crop, activity, season, land size)
       ↓
Eligibility determination (POTENTIALLY_ELIGIBLE, MATCHED, INSUFFICIENT_INFO)
       ↓
Sort by: status → relevance → window urgency → revenue impact
       ↓
Frontend displays ranked scheme cards
       ↓
User can expand for details, apply online
```

## Scheme Categories

The system supports these verified categories:

1. **Income Support & Credit** - Direct benefit transfers, PM-KISAN
2. **Crop Insurance & Risk Protection** - PMFBY, weather-based insurance
3. **Agricultural Credit** - Kisan Credit Card, farm loans
4. **Irrigation & Water** - Drip irrigation, PMKSY
5. **Soil Health & Farming Practices** - Soil health cards, organic farming
6. **Market Access & Selling** - e-NAM, market infrastructure
7. **Infrastructure & Storage** - Warehousing, cold storage
8. **Technology & Mechanisation** - Farm equipment, drone subsidies
9. **Specialised Crop Missions** - Horticulture, oilseeds, pulses

## States Supported

- All India (Central schemes)
- Andhra Pradesh
- Bihar
- Gujarat
- Haryana
- Karnataka
- Madhya Pradesh
- Maharashtra
- Odisha
- Punjab
- Rajasthan
- Tamil Nadu
- Telangana
- Uttar Pradesh
- West Bengal

## Matching Algorithm

### Relevance Score Calculation (0-100):

- **State match** (30 points) - Scheme available in farmer's state
- **Crop match** (20 points) - Scheme applicable to farmer's crop
- **Activity match** (20 points) - Scheme relevant to current activity
- **Season match** (10 points) - Scheme applicable to current season
- **Land size** (10 points) - Farmer meets land size requirements
- **Timing bonus** (10 points) - Application window currently open

### Eligibility Status:

- **POTENTIALLY_ELIGIBLE** - High relevance (70+), all criteria met
- **MATCHED** - Moderate relevance (50-69), criteria met
- **INSUFFICIENT_INFORMATION** - Missing required farmer data
- **NOT_MATCHED** - Does not meet hard criteria (filtered out)

### Geographic Filtering (CRITICAL):

State-level schemes are **HARD FILTERED** - a scheme for Uttar Pradesh will NEVER appear for a farmer from Punjab. Central schemes (state = null) are available nationwide.

## Revenue Impact

For eligible schemes, the system calculates potential financial benefit:

- **Direct transfers** - Shown as potential annual benefit
- **Subsidies** - Calculated based on farmer's estimated cost and subsidy percentage
- **Insurance** - Coverage amount displayed
- **Credit** - Interest savings calculated (not shown as direct revenue)

## Application Window Status

- **OPEN** - Application window currently open
- **CLOSING_SOON** - Less than 7 days remaining
- **YEAR_ROUND** - No specific application window
- **UPCOMING** - Application window not yet started
- **CLOSED** - Application deadline passed (filtered out)

## API Integration

### Environment Configuration

```bash
# Frontend .env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Example API Call

```typescript
const params = new URLSearchParams();
params.append('state', farmer.state);
params.append('district', farmer.district);
params.append('crop', 'wheat');
params.append('activity', 'INSURE_CROP');

const response = await fetch(
  `${API_BASE_URL}/schemes/match?${params.toString()}`
);

const data = await response.json();
// Returns: { success, farmerContext, summary, schemes[] }
```

## Quick Search Activities

The frontend provides quick search buttons for common needs:

- **crop insurance** → `INSURE_CROP` activity filter
- **drip irrigation** → `PLAN_IRRIGATION` activity filter
- **kisan credit card** → `SEEK_CREDIT` activity filter
- **solar pump** → `BUY_EQUIPMENT` activity filter
- **seed subsidy** → `BUY_SEED` activity filter

## User Experience Flow

1. **First Visit**
   - System checks if farmer profile is complete
   - If missing state/district, prompts to complete profile
   - Shows relevant message: "Complete your profile to see matched schemes"

2. **Profile Complete**
   - Auto-loads schemes on page open
   - Uses farmer's state, district, crop, land size
   - Displays ranked results immediately

3. **Filtering**
   - User can change state dropdown
   - User can filter by category
   - User can click quick search chips
   - Each action triggers new backend API call with updated filters

4. **Viewing Details**
   - Click scheme card to expand
   - Shows match score breakdown
   - Lists reasons for match
   - Displays missing information if any
   - Shows required documents
   - Provides direct application link

5. **Application**
   - "Apply Online →" button opens official government portal
   - Application method displayed (Online portal, CSC, Bank, etc.)
   - Official source and verification date shown for trust

## Design System Integration

The UI follows AnnaVriddhi's existing design tokens:

- **Colors:** Sage green theme (C.sage, C.sageDeep, C.sageTint)
- **Typography:** Playfair Display for headers, system font for body
- **Spacing:** Consistent radius (8/12/16/20/24px)
- **Components:** Reuses Card, Badge, Btn, PageHeader from ui.tsx
- **Shadow:** Card shadows for depth (shadow.card, shadow.cardHover)

## Error Handling

The frontend handles these scenarios gracefully:

1. **No Farmer Profile**
   ```
   ⚠️ Complete your farm profile in Settings to see matched schemes
   ```

2. **API Error**
   ```
   ⚠️ Failed to fetch schemes: [error message]
   ```

3. **No Results**
   ```
   🔍 No schemes found matching your criteria.
   Try adjusting your filters or complete your farm profile.
   ```

4. **Backend Unavailable**
   ```
   ⚠️ Unable to connect to server. Please try again later.
   ```

## Testing

### Backend Test Script

```bash
cd backend
node test-schemes.js
```

Test script verifies:
- Scheme matching for different farmer profiles
- State filtering (geographic restrictions)
- Category filtering
- Relevance scoring
- Eligibility determination
- Revenue impact calculation

### Frontend Testing

1. **With Complete Profile:**
   - Login with authenticated user
   - Navigate to "Schemes" from sidebar
   - Verify schemes load automatically
   - Check relevance scores are displayed
   - Expand scheme details
   - Test filtering and quick searches

2. **With Incomplete Profile:**
   - Login with user missing state/district
   - Navigate to "Schemes"
   - Verify prompt to complete profile
   - Complete profile in Settings
   - Return to Schemes to see matches

3. **Quick Search Testing:**
   - Click "crop insurance" chip
   - Verify PMFBY appears in results
   - Click "PM-KISAN" chip
   - Verify PM-KISAN scheme appears
   - Check relevance scores adjust appropriately

## Security Considerations

1. **No Sensitive Data Exposure**
   - Scheme data is public information from government sources
   - No PII in scheme records
   - Farmer profile used only for matching, not stored in schemes

2. **API Validation**
   - Backend validates all query parameters
   - State filtering enforced on backend (frontend cannot bypass)
   - Input sanitization for search queries

3. **Official Links**
   - All application URLs point to verified government portals
   - Official source URLs included for verification
   - Last verified dates displayed for transparency

## Future Enhancements

Potential improvements for next iteration:

1. **Enhanced Farmer Profile**
   - Add crop, season, land ownership to farmer table
   - Support multiple crops per farmer
   - Track applied schemes history

2. **Application Tracking**
   - "Applied" status marking
   - Application deadline reminders
   - Document checklist tracking

3. **Notifications**
   - SMS alerts for closing deadlines
   - New scheme notifications
   - Application status updates

4. **Multilingual Support**
   - Scheme descriptions in Hindi, regional languages
   - Use Gemini API for translation
   - Language preference from user settings

5. **Scheme Comparison**
   - Side-by-side comparison of similar schemes
   - Best fit recommendation
   - Combined benefit calculation

## Maintenance

### Adding New Schemes

Edit `backend/src/models/schemeSeedData.js`:

```javascript
{
  id: 'NEW_SCHEME_ID',
  name: 'Scheme Full Name',
  short_name: 'Short Name',
  description: 'Detailed description',
  scheme_type: 'INCOME_SUPPORT', // Use existing category
  level: 'CENTRAL' | 'STATE',
  state: null, // null for central, 'State Name' for state
  // ... other fields
  status: 'ACTIVE',
  verification_status: 'VERIFIED',
  last_verified_at: '2024-01-15T00:00:00Z'
}
```

**Important:** Always verify from official government sources before adding schemes.

### Updating Scheme Data

Periodically verify and update:
- Application deadlines
- Benefit amounts
- Eligibility criteria
- Official URLs
- Verification dates

### Frontend Updates

If adding new UI features, maintain:
- Consistency with design system
- Responsive behavior
- Loading/error states
- Accessibility (ARIA labels, keyboard navigation)

## Support

For issues or questions:
- Check backend console logs: `npm run dev` in `/backend`
- Check browser console for frontend errors
- Verify API_BASE_URL environment variable
- Test backend routes directly with curl/Postman
- Ensure farmer profile has required fields (state minimum)

## Documentation

- Backend API: See `backend/src/routes/schemes.js` comments
- Matching Logic: See `backend/src/services/schemesService.js` comments
- Data Schema: See `backend/src/models/schemeSeedData.js` structure
- Frontend Types: See `frontend/src/screens/Schemes.tsx` interfaces
