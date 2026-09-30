# Disease Detection UI Structure

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Dashboard | Disease Detection                    [No disease detected]│
│  AI-powered crop image analysis · Plot A                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │                              │  │  ✓ No Disease Detected          │ │
│  │     MAIN IMAGE AREA          │  │  [Clear]                        │ │
│  │                              │  │                                  │ │
│  │  - Upload zone (if no image) │  │  Your crop appears healthy.     │ │
│  │  - Image preview (if loaded) │  │  Continue monitoring...         │ │
│  │  - Analyzing state (loading) │  └──────────────────────────────────┘ │
│  │                              │                                        │
│  │     420px height             │  ┌──────────────────────────────────┐ │
│  │                              │  │  🔬 Symptoms                    │ │
│  │                              │  │  • Symptom 1                    │ │
│  └──────────────────────────────┘  │  • Symptom 2                    │ │
│                                     └──────────────────────────────────┘ │
│  Analysis completed — Nov 14...                                          │
│  ML model: PlantVillage · 92%     ┌──────────────────────────────────┐ │
│                                     │  💊 Treatment                   │ │
│                                     │  • Treatment step 1             │ │
│                                     │  • Treatment step 2             │ │
│                                     └──────────────────────────────────┘ │
│                                                                           │
│                                     ┌──────────────────────────────────┐ │
│                                     │  🛡️ Prevention                  │ │
│                                     │  • Prevention step 1            │ │
│                                     │  • Prevention step 2            │ │
│                                     └──────────────────────────────────┘ │
│                                                                           │
│                                     ┌──────────────────────────────────┐ │
│                                     │  🌿 Organic Options             │ │
│                                     │  • Organic option 1             │ │
│                                     │  • Organic option 2             │ │
│                                     └──────────────────────────────────┘ │
│                                                                           │
│                                     [📷 Analyze Another Image]            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Supported Diseases (25 conditions)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │ 🍅         │ │ 🌽         │ │ 🍎         │ │ 🥔         │          │
│  │ Early      │ │ Common     │ │ Apple      │ │ Late       │          │
│  │ Blight     │ │ Rust       │ │ Scab       │ │ Blight     │          │
│  │ Tomato     │ │ Corn       │ │ Apple      │ │ Potato     │          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
│  (and more diseases in a grid...)                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Upload Flow States

### 1. Initial State (No Image)
```
┌────────────────────────────────────┐
│                                    │
│           📷                       │
│                                    │
│    Upload Crop or Leaf Image       │
│                                    │
│    Click to browse or drag and     │
│    drop an image of your crop      │
│                                    │
│    [📷 Camera] [🖼️ Gallery] [📁 File] │
│                                    │
└────────────────────────────────────┘
```

### 2. Image Loaded (Ready to Analyze)
```
┌────────────────────────────────────┐
│   [Uploaded Image Preview]         │
│                                    │
│   420px x 100% width               │
│                                    │
└────────────────────────────────────┘

Ready to analyze
[🔍 Analyze for Disease] [✕ Cancel]
```

### 3. Analyzing State
```
┌────────────────────────────────────┐
│   [Uploaded Image with Overlay]    │
│                                    │
│           🔍                       │
│     Analyzing image...             │
│  Running AI disease detection      │
│                                    │
└────────────────────────────────────┘
```

### 4. Results Displayed
```
┌────────────────────────────────────┐
│   [Analyzed Image]                 │
│                                    │
└────────────────────────────────────┘

Analysis completed — Nov 14, 10:30 AM
ML model: PlantVillage · 92% · Crop: Tomato

[Results panel shows on right side →]
```

## Result States

### Healthy Result
```
┌──────────────────────────────────┐
│  ✓  No Disease Detected          │
│     [Clear]                       │
│                                   │
│  Your crop appears healthy.       │
│  Continue regular monitoring...   │
└──────────────────────────────────┘
```

### Disease Detected (Medium Risk)
```
┌──────────────────────────────────┐
│  ⚠  Early Blight                 │
│     [Medium risk]                 │
│     Alternaria solani            │
│                                   │
│  Early Blight detected with      │
│  high confidence (92%).          │
│  Timely treatment recommended.   │
└──────────────────────────────────┘

[Symptoms section]
[Treatment section]
[Prevention section]
[Organic options section]
```

### Disease Detected (High Risk / Urgent)
```
┌──────────────────────────────────┐
│  ⚠  Late Blight                  │
│     [High risk]                   │
│     Phytophthora infestans       │
│                                   │
│  Late Blight detected with       │
│  high confidence (89%).          │
│  URGENT: Immediate action        │
│  recommended.                    │
└──────────────────────────────────┘

[Symptoms section]
[Treatment section]
[Prevention section]
```

## Color Scheme (AnnaVriddhi Design System)

### Risk Level Colors
- **Clear/Low:** Green (`C.sage`, `C.sageTint`)
- **Medium:** Amber (`C.amber`, `C.amberTint`)
- **High/Urgent:** Red (`#dc2626`, `#fef2f2`)

### UI Colors
- **Background:** `C.bg`, `C.surface`
- **Text:** `C.ink`, `C.inkMuted`
- **Borders:** `C.line`
- **Accent:** `C.sage`, `C.sageDeep`

## Responsive Behavior

### Desktop (> 1024px)
- Two-column layout: Image (left) + Results (right 420px)
- Full-width supported diseases grid

### Tablet (768px - 1024px)
- Single column layout
- Image area stacks on top
- Results panel below
- Grid adjusts to 2-3 columns

### Mobile (< 768px)
- Single column layout
- Smaller upload area
- Single column results
- 1-2 column diseases grid

## Interactive Elements

### Buttons
- **Primary:** Green background, white text
  - "🔍 Analyze for Disease"
  - "📷 Analyze Another Image"

- **Secondary:** White background, border, dark text
  - "✕ Cancel"

### States
- **Hover:** Slight opacity reduction, lift effect
- **Disabled:** 50% opacity, cursor not-allowed
- **Active:** Pressed state

### Upload Zone
- **Default:** Dashed border, gray background
- **Hover:** Green border, light green background
- **Drag Over:** Highlighted state

## Accessibility Features

- Proper semantic HTML
- Alt text on images
- Keyboard navigation support
- Focus indicators
- Screen reader friendly labels
- Error messages clearly displayed
- Loading states announced

## Animation & Transitions

- Smooth hover effects (0.2s)
- Button press animations
- Loading spinner/indicator
- Results fade-in
- Image preview transition

## Error States

### Upload Error
```
┌────────────────────────────────────┐
│  [!] Error                         │
│                                    │
│  Please select an image file       │
│                                    │
│  Only JPG, PNG, WebP supported     │
│  Maximum size: 10MB                │
└────────────────────────────────────┘
```

### Analysis Error
```
┌────────────────────────────────────┐
│  [!] Analysis Failed               │
│                                    │
│  Failed to analyze image.          │
│  Please try again.                 │
│                                    │
│  [Try Again]                       │
└────────────────────────────────────┘
```

### Service Unavailable
```
┌────────────────────────────────────┐
│  [!] Service Unavailable           │
│                                    │
│  Disease detection service is      │
│  currently unavailable.            │
│                                    │
│  Please try again later.           │
└────────────────────────────────────┘
```

## Page Header

```
← Dashboard | Disease Detection    [Status Badge]
AI-powered crop image analysis · Plot A
```

**Status Badge Examples:**
- "No analysis yet" (gray)
- "No disease detected" (green)
- "Medium risk" (amber)
- "High risk" (red)

## User Flow

1. **Land on page** → See upload zone
2. **Upload image** → See preview + analyze button
3. **Click analyze** → Show analyzing state
4. **Get results** → Show disease info + recommendations
5. **Click "Analyze Another"** → Reset to step 1

## Design Principles Applied

✅ **Clean & Minimal** - No clutter, focused on task
✅ **Informative** - Clear labels, helpful guidance
✅ **Responsive** - Works on all screen sizes
✅ **Consistent** - Matches AnnaVriddhi design system
✅ **Accessible** - Keyboard navigation, screen readers
✅ **Forgiving** - Clear error messages, easy reset
✅ **Professional** - Production-quality UI

This UI structure provides farmers with a clear, intuitive way to detect crop diseases and get actionable treatment recommendations.
