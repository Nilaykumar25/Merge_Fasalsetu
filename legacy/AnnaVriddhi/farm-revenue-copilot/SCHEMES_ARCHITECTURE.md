# Government Schemes - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Schemes.tsx Component                   │   │
│  │                                                      │   │
│  │  State Management:                                   │   │
│  │  • schemes[]                                         │   │
│  │  • loading, error                                    │   │
│  │  • selectedState, selectedCategory                   │   │
│  │  • expandedScheme                                    │   │
│  │                                                      │   │
│  │  UI Components:                                      │   │
│  │  • PageHeader                                        │   │
│  │  • Search/Filter Card                                │   │
│  │  • Quick Search Chips                                │   │
│  │  • SchemeCard[] (expandable)                         │   │
│  │  • ScoreBar (relevance visualization)                │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│                 │ useAuth() → farmer profile                 │
│                 ↓                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           AuthContext                                │   │
│  │  • user, session                                     │   │
│  │  • farmer { state, district, ... }                   │   │
│  │  • isAuthenticated                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ fetch(`${API_BASE_URL}/schemes/match?...`)
                  │
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Express Server (index.js)                   │   │
│  │                                                      │   │
│  │  Routes:                                             │   │
│  │  GET /api/schemes/match                              │   │
│  │  GET /api/schemes/state/:state                       │   │
│  │  GET /api/schemes/category/:category                 │   │
│  │  GET /api/schemes/:schemeId                          │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│                 ↓                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │       routes/schemes.js                              │   │
│  │  • Validates query parameters                        │   │
│  │  • Parses farmer profile                             │   │
│  │  • Calls schemesService                              │   │
│  │  • Returns JSON response                             │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│                 ↓                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │       services/schemesService.js                     │   │
│  │                                                      │   │
│  │  Core Functions:                                     │   │
│  │  • match(farmerProfile)                              │   │
│  │  • getById(schemeId)                                 │   │
│  │  • getByState(state)                                 │   │
│  │  • getByCategory(category)                           │   │
│  │                                                      │   │
│  │  Matching Logic:                                     │   │
│  │  1. Geographic filtering (HARD)                      │   │
│  │  2. Relevance scoring (0-100)                        │   │
│  │  3. Eligibility determination                        │   │
│  │  4. Window status calculation                        │   │
│  │  5. Revenue impact calculation                       │   │
│  │  6. Sorting by priority                              │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│                 │ require(schemeSeedData)                    │
│                 ↓                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │       models/schemeSeedData.js                       │   │
│  │                                                      │   │
│  │  SCHEMES = [                                         │   │
│  │    {                                                 │   │
│  │      id: 'PM-KISAN',                                 │   │
│  │      name: 'Pradhan Mantri...',                      │   │
│  │      level: 'CENTRAL',                               │   │
│  │      state: null,                                    │   │
│  │      scheme_type: 'INCOME_SUPPORT',                  │   │
│  │      benefit_amount: 6000,                           │   │
│  │      crop_applicability: null,                       │   │
│  │      eligibility_rules: {...},                       │   │
│  │      status: 'ACTIVE',                               │   │
│  │      verification_status: 'VERIFIED'                 │   │
│  │    },                                                │   │
│  │    ... 49 more schemes                               │   │
│  │  ]                                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
┌──────────────┐
│    USER      │
│  opens page  │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────┐
│  Schemes.tsx useEffect()         │
│  • Check if farmer exists        │
│  • Check if state is available   │
└──────┬───────────────────────────┘
       │
       ├─ No farmer ──→ Display "Complete profile" message
       │
       ↓ Has farmer
┌──────────────────────────────────┐
│  Build API call                  │
│  • state = farmer.state          │
│  • district = farmer.district    │
│  • crop = farmer.crop            │
│  • landSize = farmer.landSize    │
│  • + filters from UI             │
└──────┬───────────────────────────┘
       │
       │ fetch()
       ↓
┌──────────────────────────────────┐
│  Backend: GET /api/schemes/match │
│  ?state=Punjab&crop=wheat...     │
└──────┬───────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  schemesService.match(farmerProfile)        │
│                                             │
│  Step 1: Filter Active & Verified          │
│  schemes.filter(s =>                        │
│    s.status === 'ACTIVE' &&                 │
│    s.verification_status === 'VERIFIED'     │
│  )                                          │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Step 2: Geographic Filtering (HARD)        │
│                                             │
│  For each scheme:                           │
│  • If CENTRAL & state=null → INCLUDE        │
│  • If STATE & state matches → INCLUDE       │
│  • If STATE & state mismatch → EXCLUDE      │
│  • If district restrictions → CHECK         │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Step 3: Calculate Relevance Score (0-100)  │
│                                             │
│  For each scheme:                           │
│  score = 0                                  │
│  + 30 if state matches                      │
│  + 20 if crop matches                       │
│  + 20 if activity matches                   │
│  + 10 if season matches                     │
│  + 10 if land size eligible                 │
│  + 10 if window is open                     │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Step 4: Determine Eligibility Status       │
│                                             │
│  For each scheme:                           │
│  • Missing required info?                   │
│    → INSUFFICIENT_INFORMATION               │
│  • Hard criteria not met?                   │
│    → NOT_MATCHED (filtered out)             │
│  • High relevance (≥70)?                    │
│    → POTENTIALLY_ELIGIBLE                   │
│  • Medium relevance (50-69)?                │
│    → MATCHED                                │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Step 5: Calculate Revenue Impact           │
│                                             │
│  For each scheme:                           │
│  • DIRECT_TRANSFER → Show amount            │
│  • SUBSIDY → Calculate % of cost            │
│  • CREDIT → Don't show (not revenue)        │
│  • INSURANCE → Show coverage                │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Step 6: Filter Closed Schemes              │
│                                             │
│  schemes.filter(s =>                        │
│    s.window.status !== 'CLOSED'             │
│  )                                          │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Step 7: Sort by Priority                   │
│                                             │
│  Sort order:                                │
│  1. Eligibility status                      │
│     (POTENTIALLY_ELIGIBLE > MATCHED >       │
│      INSUFFICIENT_INFORMATION)              │
│  2. Relevance score (high to low)           │
│  3. Window urgency                          │
│     (CLOSING_SOON > OPEN > YEAR_ROUND)      │
│  4. Revenue impact (high to low)            │
└──────┬──────────────────────────────────────┘
       │
       │ JSON response
       ↓
┌─────────────────────────────────────────────┐
│  Frontend receives:                         │
│  {                                          │
│    success: true,                           │
│    farmerContext: {...},                    │
│    summary: {                               │
│      totalMatches: 12,                      │
│      highRelevance: 5,                      │
│      closingSoon: 2,                        │
│      potentiallyEligible: 8                 │
│    },                                       │
│    schemes: [...]                           │
│  }                                          │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Schemes.tsx setState()                     │
│  • setSchemes(data.schemes)                 │
│  • setLoading(false)                        │
│  • setSearched(true)                        │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  React renders SchemeCard components        │
│  • Map over schemes array                   │
│  • Display rank, name, badges               │
│  • Show relevance score bar                 │
│  • Expandable on click                      │
└──────┬──────────────────────────────────────┘
       │
       ↓
┌──────────────┐
│    USER      │
│ views results│
└──────────────┘
```

## 🔄 User Interaction Flow

```
┌──────────────────────────────────────────────────────────┐
│                    INITIAL LOAD                          │
└──────────────┬───────────────────────────────────────────┘
               │
               ↓
       Is farmer authenticated?
               │
       ┌───────┴────────┐
       │                │
      YES              NO
       │                │
       ↓                ↓
Has state field?   Redirect to Auth
       │
┌──────┴───────┐
│              │
YES            NO
│              │
↓              ↓
Auto-load   Show "Complete
schemes     profile" message
│
↓
Display
results
│
└────────┬─────────────────────────────────────────────────┐
         │                                                 │
         ↓                                                 ↓
┌────────────────────┐                          ┌──────────────────┐
│ USER FILTERS       │                          │ USER EXPANDS     │
│                    │                          │ SCHEME CARD      │
│ Actions:           │                          │                  │
│ • Change state     │                          │ Shows:           │
│ • Change category  │                          │ • Score bar      │
│ • Click search     │                          │ • Match reasons  │
│ • Click chip       │                          │ • Full details   │
│                    │                          │ • Documents      │
└────────┬───────────┘                          │ • Revenue impact │
         │                                      │ • Apply button   │
         │ Triggers new API call                └────────┬─────────┘
         ↓                                               │
┌────────────────────┐                                   │
│ Results update     │                                   ↓
│ • New schemes[]    │                          ┌──────────────────┐
│ • Loading state    │                          │ USER APPLIES     │
│ • Error handling   │                          │                  │
└────────────────────┘                          │ Clicks button    │
                                                │ Opens portal     │
                                                │ in new tab       │
                                                └──────────────────┘
```

## 🎯 Relevance Score Calculation

```
┌────────────────────────────────────────────────┐
│         RELEVANCE SCORE (0-100)                │
└────────────────────────────────────────────────┘

30 points: STATE MATCH
           ├─ Scheme.state === null (Central) → +30
           ├─ Scheme.state === Farmer.state → +30
           └─ Else → +0

20 points: CROP MATCH
           ├─ Scheme.crop_applicability === null → +20
           ├─ Farmer.crop in Scheme.crop_applicability → +20
           └─ Else → +0

20 points: ACTIVITY MATCH
           ├─ Scheme.activity_applicability === null → +20
           ├─ Farmer.activity in Scheme.activity_applicability → +20
           └─ Else → +0

10 points: SEASON MATCH
           ├─ Scheme.season_applicability === null → +10
           ├─ Farmer.season in Scheme.season_applicability → +10
           └─ Else → +0

10 points: LAND SIZE ELIGIBILITY
           ├─ No restrictions → +10
           ├─ Within min/max → +10
           └─ Else → +0

10 points: TIMING BONUS
           ├─ Window.status === 'OPEN' → +10
           ├─ Window.status === 'YEAR_ROUND' → +10
           ├─ Window.status === 'CLOSING_SOON' → +5
           └─ Else → +0

═══════════════════════════════════════════════
TOTAL: 0-100 points

Interpretation:
• 70-100: POTENTIALLY_ELIGIBLE (High Match)
• 50-69:  MATCHED (Medium Match)
• 30-49:  MATCHED (Low Match)
• 0-29:   Usually filtered out
```

## 🛡️ Eligibility Status Logic

```
┌──────────────────────────────────────────────┐
│      ELIGIBILITY DETERMINATION               │
└──────────────────────────────────────────────┘

Step 1: Check for Missing Information
        ┌──────────────────────────────┐
        │ Required by scheme:          │
        │ • State                      │
        │ • Crop (if crop-specific)    │
        │ • Land size (if restricted)  │
        │ • Land ownership (if req'd)  │
        └──────┬───────────────────────┘
               │
               ↓
        Any missing? → INSUFFICIENT_INFORMATION
               │
               ↓ No missing
Step 2: Hard Criteria Checks
        ┌──────────────────────────────┐
        │ • State matches?             │
        │ • Crop in applicability?     │
        │ • Land size in range?        │
        │ • District matches?          │
        └──────┬───────────────────────┘
               │
               ↓
        Fail any? → NOT_MATCHED (filtered out)
               │
               ↓ All pass
Step 3: Confidence Level
        ┌──────────────────────────────┐
        │ Relevance Score:             │
        │ • ≥ 70 → High confidence     │
        │ • 50-69 → Medium confidence  │
        │ • < 50 → Low confidence      │
        └──────┬───────────────────────┘
               │
               ↓
        ┌──────────────────────────────┐
        │ FINAL STATUS:                │
        │ • High: POTENTIALLY_ELIGIBLE │
        │ • Med:  MATCHED              │
        │ • Low:  MATCHED              │
        └──────────────────────────────┘
```

## 💰 Revenue Impact Calculation

```
┌──────────────────────────────────────────────┐
│       REVENUE IMPACT CALCULATION             │
└──────────────────────────────────────────────┘

Input: Scheme + Farmer Profile

Step 1: Check Benefit Type
        │
        ├─ DIRECT_TRANSFER
        │  └─> Show benefit_amount
        │      Example: PM-KISAN ₹6,000/year
        │
        ├─ SUBSIDY (percentage-based)
        │  └─> Calculate:
        │      subsidyAmount = min(
        │        (estimatedCost × percentage) / 100,
        │        benefit_max_amount || Infinity
        │      )
        │      Example: 50% of ₹100,000 = ₹50,000
        │
        ├─ INSURANCE
        │  └─> Show coverage amount
        │      Example: Sum insured ₹50,000
        │
        └─ CREDIT
           └─> Do NOT show as revenue
               (Credit ≠ Direct Benefit)

Step 2: Format Response
        {
          available: true/false,
          type: 'POTENTIAL_DIRECT_BENEFIT' | 'POTENTIAL_COST_SAVING',
          amount: number,
          basis: string (explanation)
        }

Step 3: Display in UI
        ┌────────────────────────────┐
        │ 💰 Potential Revenue Impact│
        │ ₹50,000                    │
        │ 50% subsidy on estimated   │
        │ cost of ₹100,000          │
        └────────────────────────────┘
```

## 🔐 Security & Data Flow

```
┌──────────────────────────────────────────────┐
│          SECURITY ARCHITECTURE               │
└──────────────────────────────────────────────┘

Frontend:
┌────────────────────────────────────┐
│ AuthContext                        │
│ • Firebase/Supabase Auth           │
│ • User session management          │
│ • Farmer profile from Supabase     │
└────────┬───────────────────────────┘
         │
         │ Authenticated requests
         ↓
Backend:
┌────────────────────────────────────┐
│ Express Server                     │
│ • No auth middleware (public data) │
│ • Input validation                 │
│ • Query parameter parsing          │
└────────┬───────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│ Business Logic                     │
│ • Geographic filtering (HARD)      │
│ • State mismatch = auto-exclude    │
│ • Cannot bypass in frontend        │
└────────┬───────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│ Data Source                        │
│ • Static verified data             │
│ • No PII stored                    │
│ • Public government schemes        │
│ • Official source URLs             │
└────────────────────────────────────┘

Key Points:
✓ No sensitive farmer data in scheme records
✓ State filtering enforced on backend
✓ Cannot query schemes for wrong state
✓ All data from verified government sources
✓ Application links go to official portals
```

## 🎨 Component Hierarchy

```
Schemes (root component)
│
├─ PageHeader
│  ├─ Title & Subtitle
│  ├─ Back button
│  └─ Badges (eligible count, closing soon)
│
├─ Header Card (gradient)
│  ├─ Icon 🏛️
│  ├─ Title & Description
│  └─ "Verified Schemes" Badge
│
├─ Search/Filter Card
│  ├─ State Dropdown
│  ├─ Category Dropdown
│  ├─ Quick Search Chips
│  │  └─ 9 × Chip Button
│  └─ Search Button
│
├─ Error Display (conditional)
│  └─ Error message
│
├─ Loading Spinner (conditional)
│  └─ Spinner + text
│
├─ Empty State (conditional)
│  └─ Icon + message
│
└─ Results List
   └─ SchemeCard[] (map)
      ├─ Header
      │  ├─ Rank Badge
      │  ├─ Scheme Name
      │  ├─ Badges (level, status, category)
      │  └─ Relevance Score
      │
      ├─ Key Info (always visible)
      │  ├─ Benefit Description
      │  ├─ Benefit Amount
      │  └─ Window Status Badge
      │
      └─ Expanded Details (conditional)
         ├─ ScoreBar (progress bar)
         ├─ Match Reasons (bullets)
         ├─ Missing Info Alert
         ├─ Full Description
         ├─ Document Badges
         ├─ Revenue Impact Card
         ├─ Apply Button
         └─ Source Info + Links
```

## 🔄 State Management

```
┌────────────────────────────────────────────┐
│      REACT STATE MANAGEMENT                │
└────────────────────────────────────────────┘

Component State (Schemes.tsx):
┌────────────────────────────────────┐
│ schemes: SchemeResponse[]          │  ← API response
│ loading: boolean                   │  ← API call status
│ error: string | null               │  ← Error message
│ searched: boolean                  │  ← Has searched yet?
│ selectedState: string              │  ← UI filter
│ selectedCategory: string           │  ← UI filter
│ searchQuery: string                │  ← Text input
│ expandedScheme: string | null      │  ← Currently expanded ID
└────────────────────────────────────┘

External Context (AuthContext):
┌────────────────────────────────────┐
│ farmer: Farmer | null              │  ← User profile
│   ├─ id                            │
│   ├─ name                          │
│   ├─ state                         │
│   ├─ district                      │
│   ├─ phone                         │
│   └─ ...                           │
└────────────────────────────────────┘

State Updates:
• Page load → useEffect() → loadSchemes()
• Filter change → handleSearch() → loadSchemes()
• Quick search click → handleQuickSearch() → loadSchemes()
• Card click → setExpandedScheme()
• API response → setSchemes(), setLoading(false)
• API error → setError(), setLoading(false)
```

---

This architecture document provides a comprehensive visual understanding of how all components interact in the Government Schemes feature implementation.
