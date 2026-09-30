# Farm Revenue Copilot — UI Screens & Landing Page Spec (Visual Design Version)

This spec describes how the app should **look and feel** — polished, warm, considered, with real visual craft. Every screen below should be built with genuine design attention: soft shadows, rounded cards, layered depth, smooth color transitions, generous spacing, and a cohesive illustrated icon system. Do not default to bare HTML elements, browser-default buttons/links, or unstyled lists — every component should be intentionally styled.

## 0. Design Tokens

**Color** — a calm sage-green as the primary brand color, applied confidently across buttons, active states, highlighted cards, section accents, and iconography. The palette should feel warm, grounded, and premium — not sterile.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FAFAF8` | Page background (warm off-white) |
| `--surface` | `#FFFFFF` | Cards, sheets — always with a soft shadow and rounded corners (12–16px radius) |
| `--ink` | `#242621` | Primary text |
| `--ink-muted` | `#6B6F66` | Secondary text |
| `--sage` | `#5C7A5E` | Primary brand/action color — buttons, active icons, highlighted borders, progress fills |
| `--sage-deep` | `#3F5940` | Pressed states, strong headings, dark accents |
| `--sage-tint` | `#E9EFE7` | Filled backgrounds for success/positive cards and badges |
| `--amber` | `#B8863B` | Attention/"act soon" — filled badge backgrounds, icon accents |
| `--rust` | `#A6503A` | Urgent alerts — bold, filled banner backgrounds, not just a thin border |
| `--line` | `#E4E2DA` | Subtle borders and dividers, used alongside shadows for depth, not instead of them |

Use gradients, soft drop shadows (`box-shadow`), and layered card elevation freely to give the interface depth and richness. Rounded corners throughout (buttons, cards, inputs, badges) for a friendly, modern feel. Icons should be custom, colorful, and illustrative — not flat monochrome glyphs — filled where it adds warmth.

**Type**
- A refined type pairing is welcome: one humanist sans for UI text (Inter or Noto Sans) with confident weight variation (regular, medium, semibold, bold) to create clear, attractive hierarchy — large bold headline numbers, medium-weight labels, comfortable body text.
- Generous type scale contrast: big, bold hero numbers and headlines; clear step-down to labels and body text. Don't be shy about large, expressive type for key numbers (₹ amounts, grades, gauge values).

**Layout & visual richness principles**
- Every screen should feel designed, not just functional — use whitespace generously, align elements to a clear grid, and give the primary action visual weight through size, color, and shadow.
- Illustrated icons, colorful badges, filled progress bars/gauges with smooth color gradients (not flat single-tone bars), subtle card hover/press states, and tasteful micro-animation (a satisfying checkmark animation, a smooth gauge fill, a gentle card entrance) are all encouraged — these make the product feel trustworthy and cared-for.
- Photography and illustration are welcome where they add warmth (a friendly illustrated crop icon set, a warm illustrated hero scene) rather than being avoided.
- Icons + color + short text together for every state — clear and easy to read, styled attractively rather than left as plain system defaults.

---

## 1. Information Architecture — Full Screen List

### A. Onboarding & Setup
1. **Language Select** — a beautifully laid out grid or list of language names in their own script, each in a rounded card with a subtle highlight/shadow on selection, maybe a small decorative flag or regional motif.
2. **Welcome / What This App Does** — a polished 3-screen swipeable explainer with a full illustration per screen, smooth dot-indicator pagination, soft background color washes per screen, and a floating "Skip" button.
3. **Phone Number / Farmer ID Entry** — a clean, styled numeric input with a large custom keypad, subtle focus glow, and an animated OTP entry screen with individual styled digit boxes.
4. **Farm Setup — Plot Basics** — an attractive icon grid for crop selection (illustrated crop icons in rounded selectable tiles with a sage highlight when chosen), a styled slider with a filled gradient track for land size, and a polished map card with a custom pin drop marker.
5. **Sensor Pairing** — a friendly animated connection status card (pulsing icon while connecting, a satisfying checkmark burst on success), styled retry button.
6. **SHC (Soil Health Card) Input** — a well-designed choice screen with two large illustrated option cards; the OCR review screen shows the 12 extracted values in a clean, styled data-grid card with edit affordances.
7. **Channel Preference** — icon-based choice cards (SMS/WhatsApp/voice) each with a nicely styled live message preview mockup inside a phone-frame illustration.
8. **Setup Complete** — a celebratory, visually rich confirmation screen — a warm illustration, a satisfying checkmark animation, bold reassuring headline.

### B. Core (Home) Experience
9. **Home / Farm Status Dashboard** — the anchor screen, richly styled. See §2 below for full detail.
10. **Crop Condition Detail** — an expanded, visually layered breakdown with styled gauge cards, a small trend chart with smooth curves and gradient fill, plain-language callouts in colored badge chips.
11. **Recommendation Detail Screen** — a hero card with a large icon, bold headline, the revenue impact shown in a prominent sage-tinted badge/banner with a large ₹ figure, and two clearly styled, well-spaced buttons.
12. **Do-Nothing / All Clear Screen** — a warm, reassuring full-bleed sage-tinted hero moment with a large friendly icon/illustration — this should feel like a small delightful win, not a blank state.
13. **Alert / Urgent Notice Screen** — a bold, high-contrast rust-toned banner card with a strong icon, clear headline, and a single prominent action button — visually the most intense screen in the app, deliberately so.

### C. Grading & Capture
14. **Capture Produce Photo** — a polished camera screen with a stylish glowing guide-frame overlay, subtle corner brackets, and a large satisfying shutter button.
15. **Grading Result Screen** — the grade shown as a large, beautifully rendered badge (think a filled circular meter or a ribbon-style badge in sage/amber/rust depending on grade), with a supporting price-impact card below in a clean layout with icons for each signal (size/color/surface).
16. **Grading History / Batch List** — an attractive stacked card list with thumbnail, colored grade badge, and date, generous spacing and subtle dividers/shadows between entries.

### D. Guidance Screens
17. **Irrigation Recommendation Screen** — a large, beautifully rendered circular or fuel-style gauge with a smooth gradient fill (red→amber→sage banding), bold supporting text, and a revenue-impact badge.
18. **Harvest Window Screen** — a styled horizontal calendar strip with the recommended window highlighted in a sage-filled rounded selection, weather icons rendered colorfully above each day, smooth scroll interaction.
19. **Fertilizer / Disease Detail Screen** — a photo card with a styled diagnosis overlay, a clear colored severity badge, and a neatly laid out recommended-action card with a cost estimate in a highlighted chip.

### E. Revenue & Schemes
20. **Revenue Impact Summary Screen** — a big, bold, beautifully typeset ₹ figure as the hero element, perhaps with a subtle celebratory gradient background or accent shape, supporting line beneath in muted text.
21. **Scheme Matcher — Available Schemes List** — a card list where each scheme is a richly styled card: scheme name, a colorful value badge, and a countdown chip styled like a pill/tag with urgency coloring as the deadline nears.
22. **Scheme Detail Screen** — a well-organized detail layout: eligibility in a clean highlighted box, a nicely styled checklist (custom checkbox styling, not browser default) for documents, and a prominent styled "how to apply" button.

### F. Season Review ("Crop Wrapped")
23. **Season Review — Landing/Cover Screen** — the most visually spectacular screen in the app: a full-bleed, richly colored, celebratory "wrapped" style cover with bold expressive typography, layered shapes/illustration, and a strong sense of occasion.
24. **Season Review — Recommendation vs. Action vs. Outcome** — a beautifully laid out comparison view, colorful icon chips per outcome (followed/ignored/partial), smooth card transitions between entries.
25. **Season Review — Share Card** — a polished, shareable graphic composition with bold numbers, brand color background, clean iconography — genuinely worth sharing on WhatsApp.

### G. Communication & Support
26. **Message/Alert Inbox** — a chat-style, richly styled chronological list with colored channel icons, timestamp chips, and clear read/unread styling.
27. **Chatbot / Ask a Question Screen** — a warm chat UI with nicely styled message bubbles (sage for the assistant, neutral for the farmer), rounded corners, subtle shadows, and colorful suggested-question chips.
28. **Voice Playback Screen** — a large, beautifully styled circular play button with an animated waveform visualization in brand colors.

### H. Settings & Trust
29. **Settings** — a well-organized grouped list with colorful icon tiles per row, clean dividers, and polished toggle/switch controls.
30. **Help / How This Works** — an illustrated, friendly explainer layout — not a wall of text — using icons and short illustrated steps.
31. **Offline/Sync Status Screen** — a styled status card with an animated sync indicator, clear iconography for queued/synced states, colored appropriately.

---

## 2. Home Dashboard — Detailed Visual Layout

The most important screen — it should feel premium, warm, and alive, not like a plain form.

**Top bar:** farm name in bold, plot details in muted text beside it, a styled notification bell icon with a colorful badge count in a filled circle (rust if urgent, sage if informational).

**Status hero card:** the single largest, most visually prominent element on the page — a full-width rounded card with a soft gradient or tinted background (sage-tint when clear, amber/rust-tint when action needed), a large illustrated icon, bold headline, and supporting text. This should have real presence — generous padding, a subtle shadow lifting it off the page, maybe a soft decorative background shape.

**Gauges section:** three gauge cards in a clean row or stack, each with a colorful icon, label, and a smoothly gradient-filled bar or circular gauge — not flat gray bars. Give each gauge its own subtle card treatment with rounded corners and light shadow.

**Recommendation card:** a strong, well-composed card — icon, bold title, description, and the revenue impact shown in its own prominent colored badge/banner with a large ₹ number. Two clearly designed buttons beneath (filled sage primary, outlined secondary), full-width, generously sized, rounded.

**Secondary action rows:** "Check your produce grade" and "X schemes may apply" as attractively styled tappable rows — icon in a colored circular badge, bold label text, a chevron arrow — not plain underlined links.

---

## 3. Landing Page (Marketing/Public Page)

### Design plan

A visually rich, confident, well-crafted landing page — this is the first impression and should look like a considered product, not a bare document. Use the sage palette boldly across the hero, buttons, section accents, and illustrations, balanced against the warm neutral background so it feels grounded rather than a plain green wash.

**Type:** a refined pairing with strong weight contrast — big, bold, expressive headlines; comfortable, readable body text. Real typographic hierarchy, not uniform paragraph styling.

**Layout concept:** a single-column narrative flow (sense → recommend → act → earn → review) told through well-composed sections, each with its own illustration, icon treatment, or visual moment — not plain stacked text blocks. Use color-washed section backgrounds, decorative shapes, and generous whitespace to give the page rhythm and visual interest as you scroll.

### Section-by-section

**1. Hero**
- A well-composed hero with a custom illustrated flow diagram (`Sensor/Photo → Check → Message → Result`) rendered as a polished, colorful visual — icons in filled rounded badges connected by a styled line, not a plain sketch.
- Bold, large, confident headline: "Know what your crop needs, before it costs you."
- Supporting subhead in comfortable body text.
- A prominent, well-styled sage CTA button with a soft shadow and rounded corners: "See how it works."
- A tasteful decorative background element (soft gradient shape, subtle pattern) to give the hero visual depth.

**2. The Real Problem**
- A well-typeset section, perhaps with a supporting illustration or icon, describing the real problem from the brief in a few honest, clearly readable lines — no invented statistics, but presented with real visual care (nice section background tint, good spacing).

**3. How It Works — Real Flow Depiction**
- A beautifully designed vertical step sequence — each step in its own card with a bold number badge, icon, headline, and description. Step 2 includes a polished phone-frame mockup of an example SMS message. Step 4 includes a preview mockup of the season-review card. Both mockups clearly labeled "Example," but designed attractively, not as plain screenshots.

**4. What You Get — Feature Overview**
- A well-organized feature grid or list — each feature in its own small card with a colorful icon, not a plain bullet list. Consistent color-coding tying back to the flow steps.

**5. Built for Real Field Conditions**
- Three well-designed feature callouts (SMS-based, local language, works on any phone) each with a strong icon in a colored badge and confident short copy — this section should look like a proud feature highlight, not a caveat.

**6. Season Review Teaser**
- A polished preview of the "wrapped" style season summary card, clearly labeled as an illustrative example, styled with the same visual richness as the in-app version.

**7. Closing / Contact**
- A warm, well-designed closing section — who it's for, a real functional contact/signup field styled attractively, and a clean footer with project name and a brief, honest note that this is a hackathon build.

---

## 4. Component Usage Guidance (cross-screen rules)

- **Gauges/meters**: rendered with smooth gradient fills and rounded end-caps, styled as a genuine visual centerpiece wherever they appear — never a flat, plain progress bar.
- **Icon + color + word**, always together, and always well-styled — custom colored icon badges, not default system icons.
- **Cards** are the primary building block throughout — soft shadow, rounded corners, comfortable internal padding — used generously to give the interface structure and visual richness.
- **Lists**: styled with clear dividers, icon badges, and comfortable spacing — never a bare unstyled `<ul>`.
- **Buttons**: bold, filled, rounded, with a soft shadow and a clear pressed state — never a default browser button.
- **Every screen should look considered and complete** — attractive typography, thoughtful color use, and genuine visual polish throughout, not just a wireframe brought to life.