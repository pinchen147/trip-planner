# Design Guide — Industrial Terminal

> **Last Updated:** 2026-03-15

Dark-mode, developer-focused aesthetic. Monospace typography, neon green accents, sharp corners, zero decoration.

---

## Color System

### Backgrounds

| Token             | Hex       | Usage                              |
| ----------------- | --------- | ---------------------------------- |
| `--bg-page`       | `#0C0C0C` | Main canvas, deepest dark          |
| `--bg-sidebar`    | `#080808` | Sidebar, slightly darker for depth |
| `--bg-card`       | `#0A0A0A` | Card / component surfaces          |
| `--bg-elevated`   | `#141414` | Nested elements, input fields      |
| `--bg-subtle`     | `#1A1A1A` | Avatars, image placeholders        |

### Accent — Neon Green

| Token              | Hex          | Usage                            |
| ------------------ | ------------ | -------------------------------- |
| `--green-primary`  | `#00FF88`    | CTAs, active states, success     |
| `--green-tint-40`  | `#00FF8840`  | Promotional border accents       |
| `--green-tint-20`  | `#00FF8820`  | Badge backgrounds                |
| `--green-tint-10`  | `#00FF8810`  | Active nav background tint       |

### Accent — Warning Orange

| Token              | Hex          | Usage                            |
| ------------------ | ------------ | -------------------------------- |
| `--orange-primary` | `#FF8800`    | Alerts, warning indicators       |
| `--orange-tint-40` | `#FF880040`  | Warning border accents           |
| `--orange-tint-20` | `#FF880020`  | Warning badge backgrounds        |

### Error

| Token         | Hex       | Usage                                |
| ------------- | --------- | ------------------------------------ |
| `--red-error` | `#FF4444` | Negative values, errors, decline     |

### Neutrals

| Token              | Hex       | Usage                                    |
| ------------------ | --------- | ---------------------------------------- |
| `--white-primary`  | `#FFFFFF` | Primary text on dark backgrounds         |
| `--gray-500`       | `#8a8a8a` | Secondary text, labels, descriptions     |
| `--gray-400`       | `#6a6a6a` | Muted text, placeholders, close icons    |
| `--border-primary` | `#2f2f2f` | All borders, dividers, strokes           |
| `--border-light`   | `#3f3f3f` | Subtle borders on elevated surfaces      |
| `--black-on-accent`| `#0C0C0C` | Text on green accent backgrounds         |

---

## Typography

### Fonts

| Family            | CSS Variable             | Character                        | Usage                              |
| ----------------- | ------------------------ | -------------------------------- | ---------------------------------- |
| **JetBrains Mono** | `--font-jetbrains`      | Monospace, developer-native      | 95% of text — nav, labels, body, buttons, tables, badges |
| **Space Grotesk**  | `--font-space-grotesk`  | Geometric, modern, authoritative | Page titles, metric values, section headers              |

### Type Scale

| Role          | Size  | Font           | Weight | Spacing  | Notes                    |
| ------------- | ----- | -------------- | ------ | -------- | ------------------------ |
| Page title    | 42px  | Space Grotesk  | 700    | -1px     |                          |
| Metric value  | 32px  | Space Grotesk  | 700    | -1px     | Large KPI numbers        |
| Section title | 18px  | Space Grotesk  | 600    |          |                          |
| Logo          | 16px  | JetBrains Mono | 600    | 1px      |                          |
| Subtitle      | 14px  | JetBrains Mono | 400    |          |                          |
| Body          | 13px  | JetBrains Mono | 500    |          | Content, table cells     |
| Navigation    | 12px  | JetBrains Mono | 600/500| 0.5px    | 600 active, 500 inactive |
| Label         | 11px  | JetBrains Mono | 500-700| 0.5px    | Table headers, metrics   |
| Meta          | 12px  | JetBrains Mono | 400    |          | Timestamps               |
| Badge         | 11px  | JetBrains Mono | 700    |          |                          |
| Badge tiny    | 9px   | JetBrains Mono | 700    |          | Alert labels             |

### Text Conventions

- **UPPERCASE** for navigation, labels, table headers, buttons, badges, system info.
- **Letter-spacing** `0.5px`–`1px` on labels for technical feel.
- **Code-style prefixes**: `// SYSTEM STATUS`, `// AUTHENTICATION`.
- **Bracket status**: `[ACTIVE]`, `[PENDING]`, `[OK]`, `[LINK_SENT]`.
- **Underscore naming**: `CUSTOMER_ID`, `EMAIL_ADDRESS`, `MAGIC_LINK`.

---

## Spacing

### Gap Scale

| px  | Usage                                                   |
| --- | ------------------------------------------------------- |
| 2   | Tight list stacking                                     |
| 4   | Gallery nav buttons, inline elements                    |
| 6   | Label stacks (title + meta)                             |
| 8   | Action button gap, title to subtitle, bar to label      |
| 10  | Search icon to placeholder, system info rows            |
| 12  | Logo elements, nav icon to text, section gaps           |
| 16  | Card internal vertical, list item padding               |
| 20  | Metric card gap, table row actions                      |
| 24  | Chart section padding                                   |
| 32  | Major section gaps, content padding                     |
| 40  | Content area horizontal padding                         |

### Padding Patterns

| Padding (v, h) | Usage                                     |
| --------------- | ---------------------------------------- |
| 4, 8            | Small badges                             |
| 8, 12           | Secondary actions                        |
| 10, 14          | Search box, action buttons               |
| 10, 16          | Primary/secondary buttons                |
| 12, 16          | Banners                                  |
| 12, 20          | Navigation items                         |
| 16, 20          | List items, user section                 |
| 20, 20          | Metric cards, system info                |
| 24, 24          | Chart sections                           |
| 32, 40          | Main content area                        |

---

## Corner Radius

**0px everywhere.** No exceptions.

Sharp corners create the terminal/industrial aesthetic. This is the single most distinctive trait of this design system.

---

## Borders

All structure is defined by 1px hairline borders:

| Token                | Value                  | Usage                          |
| -------------------- | ---------------------- | ------------------------------ |
| `--border-default`   | `1px solid #2f2f2f`   | Cards, dividers, inputs        |
| `--border-light`     | `1px solid #3f3f3f`   | Elevated surface borders       |
| `--border-accent`    | `1px solid #00FF88`   | Active state left-edge markers |
| `--border-accent-tint`| `1px solid #00FF8840` | Promotional borders            |
| `--border-warning`   | `1px solid #FF880040` | Alert container borders        |

No shadows. No gradients. Borders and color contrast only.

---

## Icons

- **Library**: Lucide Icons
- **Style**: Thin stroke, matching terminal aesthetic
- **Sizes**: 14–16px for UI, 12px for status indicators, 28px for decorative

| State          | Color     |
| -------------- | --------- |
| Active/accent  | `#00FF88` |
| On green bg    | `#0C0C0C` |
| Inactive/muted | `#8a8a8a` |
| Placeholder    | `#6a6a6a` |

---

## Component Patterns

### Buttons

**Primary (green CTA)**
- Background: `#00FF88`
- Text: `#0C0C0C`, 11px, JetBrains Mono, bold 700, UPPERCASE
- Padding: 10–12px vertical, 16px horizontal
- No border, no radius, no shadow

**Secondary (dark outlined)**
- Background: `#0A0A0A`
- Border: `1px solid #2f2f2f`
- Text: `#FFFFFF`, 11px, JetBrains Mono, semibold 600, UPPERCASE
- Hover: border transitions to `#00FF88`, text to `#FFFFFF`

### Input Fields

- Background: `#141414`
- Border: `1px solid #2f2f2f`
- Text: `#FFFFFF`, 13px, JetBrains Mono, medium 500
- Placeholder: `#6a6a6a`
- Focus: border changes to `#00FF88`
- Padding: 10px 14px
- Icon left at 12px, 14px size, `#6a6a6a`

### Cards

- Background: `#0A0A0A`
- Border: `1px solid #2f2f2f`
- Padding: 20px (metric cards), 32px (content cards)
- No shadow, no radius

### Navigation Items

**Active:**
- Background: `#00FF8810`
- Left border: `1px solid #00FF88`
- Icon: `#00FF88`, 16px
- Label: `#FFFFFF`, 12px, semibold 600

**Inactive:**
- Background: transparent
- Icon: `#8a8a8a`, 16px
- Label: `#8a8a8a`, 12px, medium 500

### Badges / Status

Bracket notation: `[ACTIVE]`, `[PENDING]`, `[OK]`, `[ERROR]`

| State   | Text color | Background   |
| ------- | ---------- | ------------ |
| Success | `#00FF88`  | `#00FF8820`  |
| Warning | `#FF8800`  | `#FF880020`  |
| Error   | `#FF4444`  | —            |

### Error Notices

- Background: `#FF880010`
- Border: `1px solid #FF880040`
- Text: `#FF8800`, 12px, medium 500

---

## Layout

| Dimension        | Value                |
| ---------------- | -------------------- |
| Desktop width    | 1440px               |
| Sidebar          | 240px fixed          |
| Content area     | fill remaining       |
| Content padding  | 32px vertical, 40px horizontal |
| Section gap      | 32px                 |
| Card grid gap    | 12px                 |

---

## Do / Don't

### Do

- Use JetBrains Mono for almost everything
- Use Space Grotesk only for large headlines/metrics
- Use `#00FF88` for active states, CTAs, success
- Use `#FF8800` only for warnings/alerts
- Use UPPERCASE for labels, nav, buttons, badges
- Use 1px `#2f2f2f` borders consistently
- Use 0 corner radius everywhere
- Use left-border accents for active nav
- Use bracket notation: `[ACTIVE]`, `[OK]`
- Use code-style labels: `EMAIL_ADDRESS`, `// COMMENTS`

### Don't

- Don't use rounded corners
- Don't use drop shadows
- Don't use gradients
- Don't use light backgrounds
- Don't use colored card backgrounds (keep `#0A0A0A`)
- Don't use lowercase for UI labels
- Don't overuse green — reserve for interactive/success
- Don't add accent colors beyond green/orange/red

---

## New Components (Post-Redesign)

### EmptyState (`components/EmptyState.tsx`)

Reusable empty state card with icon, title, description, and optional CTA button.
- Background: `#0A0A0A`, min-height 160px
- Icon: 28px, `#333`
- Title: 12px JetBrains Mono, semibold, uppercase, `#444`
- Description: 11px JetBrains Mono, `#333`
- CTA: green primary button style

### ErrorState (`components/ErrorState.tsx`)

Three variants: `connection-lost` (red), `sync-failed` (orange), `session-expired` (red).
- Background: `#0A0A0A`, min-height 180px
- Icon/title color matches variant
- Description: 11px JetBrains Mono, `#666`
- Button: outlined in variant color (or green filled for session-expired)

### SkeletonCard (`components/SkeletonCard.tsx`)

Loading placeholder with `skeleton-pulse` animation. Three variants: `event`, `spot`, `planner`.
- Background: `#1A1A1A`
- Pulse elements use CSS `skeleton-pulse` class from globals.css

### Modal (`components/ui/modal.tsx`)

Generic portal-based modal with overlay, Escape-to-close, and click-outside-to-close.
- Overlay: `rgba(0,0,0,0.7)`
- Container: `#111111`, max-width 560px, max-height 720px
- Title: 14px JetBrains Mono, semibold, uppercase, letter-spacing 1.5px
- Close button: X icon, `#666` -> white on hover

### Avatar (`components/ui/avatar.tsx`)

User initial avatar circle.
- Default size: 28px
- Background: `#1E1E1E`, circular (border-radius: 50%)
- Text: Space Grotesk, 600 weight, `#737373`

### CityPickerModal (`components/CityPickerModal.tsx`)

Google Places-powered city search for trip creation.
- Search input: `#0A0A0A` background, 48px height
- Results: city name in Space Grotesk 14px white, secondary text in JetBrains Mono 10px `#666`
- Loading: Loader2 spinner in `#525252`
- Resolving: Loader2 spinner in `#00E87B`

### TripSelector (`components/TripSelector.tsx`)

Header dropdown for switching trips and city legs.
- Trigger: JetBrains Mono 10px, `#737373`, MapPin icon in `#00E87B`
- Dropdown: `#111111` background, `#262626` border
- Section headers: 9px uppercase, `#525252`
- Active item: `#00E87B`, font-weight 600
- Inactive: `#a3a3a3`, font-weight 400

### StatusBar (`components/StatusBar.tsx`)

Full-width bottom bar with connection health and route summary.
- Height: 28px, background `#080808`
- Health dot: 6px circle, `#00E87B` (healthy) or `#FF4444` (error)
- Status text: JetBrains Mono 10px
- Sync age: `#444`
- Route summary: `#666`

### CookieConsent (`components/CookieConsent.tsx`)

GDPR cookie consent banner fixed to bottom of viewport.
- Background: `#111111`, border-top with `--color-border`
- Text: 0.82rem `--color-foreground-secondary`
- Buttons: standard Button component (Accept primary, Decline secondary)

### Leg Badge Colors (Dashboard)

Multi-leg trips display colored badges per city. The color cycle:
1. `#00E87B` (green)
2. `#3B82F6` (blue)
3. `#A855F7` (purple)
4. `#F59E0B` (amber)
5. `#EF4444` (red)
6. `#06B6D4` (cyan)
