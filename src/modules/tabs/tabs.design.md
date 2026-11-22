# Tabs Design Spec (`src/modules/tabs/`)

## 1. Role & Visual Differentiation from `SegmentedControl`

`Tabs` is a **macro view-switching navigation primitive** for page sections, settings panes, inspector views, and route-level sub-navigation. While `SegmentedControl` already exists for local, compact mode toggles, `Tabs` is intentionally distinct in both visual weight and spatial role:

| Dimension | `SegmentedControl` | `Tabs` |
| :--- | :--- | :--- |
| **Role** | Local state/mode toggle (2–5 short options) | Macro view/section navigation (can scale to many tabs + panels) |
| **Container Shell** | Sunken pill track (`--cs-color-base-soft`) + elevated sliding thumb | Open-air, borderless typographic strip anchored by a `1px` hairline |
| **Visual Weight** | Tactile, contained widget | Editorial, lightweight, architectural |
| **Orientation** | Horizontal only | `horizontal` & `vertical` |
| **Indicator** | Full-height elevated pill behind label | `2px` crisp edge bar (`line`, default) or soft-tint pill (`ghost`) |

Four core principles govern `Tabs`:
1. **Typographic Authority Without Chrome:** Strong, scannable labels (`font-weight: 500`) separated by clean rhythm and a single `1px` hairline—never heavy boxes or 3-sided folder borders.
2. **Monochrome Restraint:** Active state uses `--cs-color-text-strong` and a neutral strong indicator (`--cs-color-text-strong`) by default, keeping `--cs-color-accent-*` free for `:focus-visible` rings and primary CTAs.
3. **Zero Layout Shift:** Tabs maintain identical horizontal metrics between rest and active states—never shifting adjacent tabs when selected.
4. **Physical Push-Pull Indicator:** The active indicator moves with asymmetric leading/trailing edge timing calibrated to jump distance, creating a crisp, tactile glide without rubbery wobble.

---

## 2. Variants (`variant`) & Baseline Architecture

`Tabs` exposes **two intentional variants** via `data-variant` (`"line" | "ghost"`, default `"line"`).

| Variant | Track / Baseline | Active Indicator | Hover State (Inactive) | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **`line`** *(default)* | `1px` hairline along the inner edge (`--cs-tabs-baseline-color`) | `2px` solid bar overlapping the hairline (`--cs-tabs-indicator-color`) | Text brightens (`text-weak` → `text-strong`) + subtle inset squircle wash (`--cs-color-base-soft`) | Page headers, settings sections, card headers, primary view switching |
| **`ghost`** | None (completely open-air) | Soft monochrome squircle pill (`--cs-color-base-soft-hover`) behind the active tab | Subtle squircle wash (`--cs-color-base-soft`) + text brightens | Toolbars, secondary sub-navigation, compact vertical lists without a dividing hairline |

> **Why no `enclosed` (folder-tab) variant?** Three-sided bordered tabs violate `cscripts-ui`'s *Borderless by Default* rule (`design-and-tokens.md`), create fragile border-overlap seams with `TabPanels`, and feel visually dated.

### Baseline Span & Width (`width` & `baseline`)

`Tabs` separates **tab item distribution** (`width`) from **hairline span** (`baseline`) so it adapts cleanly to both full-page headers and compact inline toolbars:

- **`width="content"` (default):** Each tab sizes to its intrinsic label + icon/badge width (`fit-content`), spaced by `--cs-tabs-gap`.
- **`width="equal"`:** Tabs divide the available container width equally (`grid-auto-flow: column; grid-auto-columns: 1fr;` horizontally).
- **`baseline="full" | "content" | "none"` (for `variant="line"`):**
  - **`"full"` (default):** The `1px` hairline spans `100%` of the `TabList` container width—even when `width="content"` leaves whitespace after the last tab. This creates a clean architectural seam above `TabPanels`.
  - **`"content"`:** The hairline spans only the width of the tabs themselves (useful when `TabList` sits inside a flex toolbar next to action buttons).
  - **`"none"`:** Hides the hairline while keeping the `2px` active indicator bar.

### Active Indicator Color: Monochrome Default vs. Accent

- **Default (`--cs-tabs-indicator-color: var(--cs-color-text-strong)`):**
  - Neutral dark (`zinc-900` light / `zinc-50` dark) matches `cscripts-ui`'s calm monochrome navigation language (consistent with `Sidebar` and `SegmentedControl`), avoids competing with primary `Button variant="solid"` CTAs, and never clashes with semantic badges inside tabs.
- **Opt-In Accent Override:**
  - Consumers who want brand-colored navigation can override `--cs-tabs-indicator-color: var(--cs-color-accent-solid)` on `.cs-tabs` (or `.cs-tabs-list`) without altering component structure.

---

## 3. Sizes (`size`) & Typography

`size` (`"sm" | "md" | "lg"`, default `"md"`) scales height, horizontal/vertical padding, typography, icon size, and gap proportionally with `Button`, `Accordion`, and `Card`:

| Token / Property | `sm` *(Compact / Toolbar)* | `md` *(Default / Page)* | `lg` *(Spacious / Hero)* |
| :--- | :--- | :--- | :--- |
| Horizontal tab height (`--cs-tabs-height`) | `32px` | `40px` | `48px` |
| Vertical tab `min-height` | `32px` | `36px` | `42px` |
| Tab inline padding (`--cs-tabs-px`) | `10px` | `12px` | `16px` |
| Gap between tabs (`--cs-tabs-gap`) | `4px` | `6px` | `8px` |
| Internal slot gap (`--cs-tabs-item-gap`) | `6px` | `8px` | `8px` |
| Font size (`--cs-tabs-font-size`) | `var(--cs-text-xs)` (`12px`) | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-base)` (`16px`) |
| Line height (`--cs-tabs-line-height`, integer) | `16px` | `20px` | `22px` |
| Leading icon size | `14px` | `16px` | `18px` |
| Indicator thickness (`line`) | `2px` | `2px` | `2.5px` |
| Hover / `ghost` pill radius (`--cs-tabs-radius`) | `var(--cs-radius-md)` (`6px`) | `var(--cs-radius-lg)` (`8px`) | `var(--cs-radius-xl)` (`12px`) |
| Squircle (`--cs-tabs-squircle`) | `var(--cs-squircle-soft)` (`1.2`) | `var(--cs-squircle-smooth)` (`1.6`) | `var(--cs-squircle-smooth)` (`1.6`) |

### Typography, Icons & Badges

- **Zero-Shift Weight Rule:** Both resting and active tabs use `font-weight: 500` so switching tabs never changes label width or nudges neighboring tabs. Active state is communicated through contrast (`--cs-color-text-weak` → `--cs-color-text-strong`) and the active indicator.
- **Icons:** Sized `2px` larger than text (`14 / 16 / 18px`), using `strokeWidth: 2` at rest and `2.25` when active.
- **Badges / Counters:** Pair with `<Badge variant="soft" color="base" size="xs|sm">` using `font-variant-numeric: tabular-nums` so dynamic counts never jitter tab widths.
- **Truncation & Stability:** Tab labels use `white-space: nowrap` (`cursor: default` for `<button>`, `cursor: pointer` for `<a href>`).

---

## 4. Interactive States (Native CSS)

All tab states use native pseudo-classes and `data-*` attributes without JS hover wrappers:

- **Rest (Inactive):**
  - Label: `--cs-color-text-weak`; Icon: `--cs-color-text-weak`; Background: `transparent`.
- **Hover (`:hover` on inactive tab):**
  - Label & icon brighten to `--cs-color-text-strong` over `--cs-dur-effect-fast` (`100ms`) `--cs-ease-effect`.
  - **Inset Hover Wash:** An inner `::before` pseudo-layer fades in `--cs-color-base-soft` with `border-radius: var(--cs-tabs-radius); corner-shape: var(--cs-tabs-squircle);`.
  - *Optical inset detail (`line` horizontal):* The hover wash is inset `4px` vertically (`inset-block: 4px 6px; inset-inline: 2px;`) so the hover pill never touches or muddies the `1px` baseline or `2px` active indicator bar.
- **Active Tab (`[data-selected]` / `aria-selected="true"`):**
  - Label & icon: `--cs-color-text-strong`.
  - Hovering an already-active `line` tab keeps the label strong without flashing a background box; in `ghost`, `--cs-color-base-soft-hover` holds steady.
- **Press (`:active`):**
  - Subtle `scale: 0.98` on the inner label/icon wrapper (not the indicator track) over `--cs-dur-press` (`140ms`) `--cs-ease-press`, with `will-change: scale` and integer `line-height` to prevent Chromium subpixel text blur.
- **Focus (`:focus-visible`):**
  - Uses global `focus.css` (`2px solid var(--cs-color-accent-solid)`). In horizontal overflow viewports, `padding-block: 4px; margin-block: -4px;` preserves full ring clearance; during keyboard arrow navigation (`[data-arrow-nav]`), focus-ring noise can defer cleanly to the moving active indicator (matching `SegmentedControl`).
- **Disabled (`:disabled`, `[data-disabled]`):**
  - Sets `--cs-disabled-opacity: 1` and `--cs-color-disabled-fg` (`--cs-color-text-weaker`). Global `disabled.css` suppresses `:hover` and `:active` via `pointer-events: none`.

---

## 5. Horizontal & Vertical Orientation (`orientation`)

`Tabs` supports `orientation="horizontal" | "vertical"` (default `"horizontal"`):

### Horizontal (`data-orientation="horizontal"`)
- `TabList` is a horizontal flex/grid row; `1px` baseline runs along `inset-block-end: 0`.
- `2px` active indicator sits flush on `inset-block-end: 0` with rounded top caps (`border-start-start-radius` / `border-start-end-radius`, or pill-rounded `clip-path`).
- Tabs center-align their content (`justify-content: center`).

### Vertical (`data-orientation="vertical"`)
Does a `2px` line work vertically as cleanly as horizontally? **Yes, with three intentional optical adjustments:**
1. **Start-Edge Indicator + Hairline:** The `1px` vertical hairline runs along `inset-inline-end: 0` (separating `TabList` from `TabPanels`) OR `inset-inline-start: 0` (rail-style). Default **`inset-inline-start: 0`** for the `2px` indicator bar—anchoring the reading edge—with the `1px` hairline also on `inset-inline-start: 0` (or `inset-inline-end: 0` when paired with adjacent `TabPanels`).
2. **Start-Aligned Typography:** Vertical tabs MUST use `justify-content: flex-start; text-align: start;` with `padding-inline: 14px 12px` (`md`) so the `2px` bar never crowds the first character or icon.
3. **Subtle Active Row Tint:** On wide vertical lists (`180px–240px`), a `2px` left bar alone can feel sparse next to long labels. Vertical `line` tabs pair the `2px` bar with a subtle `--cs-color-base-soft` active row tint (inset `4px` from the `2px` bar) so the active row reads effortlessly across its full width.

---

## 6. Push-Pull Active Indicator Motion (Core Specification)

Instead of a rigid `translateX` + `width` slide, the active indicator uses a **Push-Pull** choreography: the **leading edge** (facing the destination tab) launches immediately to stretch toward the target, while the **trailing edge** (leaving the previous tab) follows after a short, distance-calibrated delay and catches up cleanly.

### Technical CSS Architecture (GPU-Composited, Zero Distortion)

To avoid `scaleX` border-radius distortion and layout thrash, `.cs-tabs-indicator` spans the full `TabList` track (`position: absolute; inset-inline: 0; inset-block-end: 0; height: var(--cs-tabs-indicator-thickness);`) and animates via **`clip-path: inset(...)` driven by two registered `@property` custom properties**:

```css
@property --cs-tabs-clip-start {
    syntax: "<length>";
    inherits: false;
    initial-value: 0px;
}

@property --cs-tabs-clip-end {
    syntax: "<length>";
    inherits: false;
    initial-value: 0px;
}
```

- **Horizontal:** `clip-path: inset(0 var(--cs-tabs-clip-end) 0 var(--cs-tabs-clip-start) round 9999px);`
- **Vertical:** `clip-path: inset(var(--cs-tabs-clip-start) 0 var(--cs-tabs-clip-end) 0 round 9999px);`
- **Why this works:**
  1. **100% GPU-composited:** `clip-path` animates on the compositor without triggering layout.
  2. **Crisp caps at every frame:** `round 9999px` maintains perfectly rounded ends regardless of stretch length.
  3. **Independent edge physics:** `--cs-tabs-clip-start` and `--cs-tabs-clip-end` each receive their own `duration`, `delay`, and `easing`.
  4. **`ghost` variant compatibility:** The exact same `@property` + `clip-path: inset(... round var(--cs-tabs-radius))` mechanism drives the `ghost` pill indicator!

### Direction-Aware Edge Assignment

Track movement direction (`data-dir="forward" | "backward"`) by comparing the previous and next indicator offsets:

- **Moving Forward (`next > prev`):**
  - **Leading edge (`--cs-tabs-clip-end`):** `delay: 0ms`, `duration: var(--cs-tabs-dur-lead)`, `easing: var(--cs-ease-quart-out)`
  - **Trailing edge (`--cs-tabs-clip-start`):** `delay: var(--cs-tabs-delay-trail)`, `duration: var(--cs-tabs-dur-trail)`, `easing: var(--cs-ease-expo-out)`
- **Moving Backward (`next < prev`):**
  - **Leading edge (`--cs-tabs-clip-start`):** `delay: 0ms`, `duration: var(--cs-tabs-dur-lead)`, `easing: var(--cs-ease-quart-out)`
  - **Trailing edge (`--cs-tabs-clip-end`):** `delay: var(--cs-tabs-delay-trail)`, `duration: var(--cs-tabs-dur-trail)`, `easing: var(--cs-ease-expo-out)`

> **Anti-Wobble Rule:** Both curves are **monotonically decelerating** (`--cs-ease-quart-out` and `--cs-ease-expo-out`) with **zero overshoot** (`--cs-spring-squash` / `back-out` are intentionally excluded here). The trailing edge never overtakes the leading edge or bounces past the tab boundary.

### Context-Sensitive Distance Calibration

Fixed delays feel right for 1-tab jumps but turn rubbery on 8-tab jumps. Compute the center-to-center (or start-to-start) pixel delta $\Delta = |x_{\text{next}} - x_{\text{prev}}|$ on selection and clamp all three timings:

$$\begin{aligned}
T_{\text{lead}} &= \text{clamp}(160\text{ms},\ 150\text{ms} + 0.12 \cdot \Delta,\ 260\text{ms}) \\
D_{\text{trail}} &= \text{clamp}(24\text{ms},\ 20\text{ms} + 0.06 \cdot \Delta,\ 64\text{ms}) \\
T_{\text{trail}} &= \text{clamp}(180\text{ms},\ 160\text{ms} + 0.14 \cdot \Delta,\ 280\text{ms})
\end{aligned}$$

| Jump Distance ($\Delta$) | Lead Duration ($T_{\text{lead}}$) | Trail Delay ($D_{\text{trail}}$) | Trail Duration ($T_{\text{trail}}$) | Total Settle | Perceived Feel |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Adjacent tab (`~80px`)** | `160ms` | `25ms` | `180ms` | `205ms` | Crisp, subtle stretch; zero lag |
| **Medium jump (`~240px`, 2–3 tabs)** | `179ms` | `34ms` | `194ms` | `228ms` | Fluid push-pull glide |
| **Long jump (`~800px`, 8–10 tabs)** | `246ms` | `64ms` *(clamped)* | `272ms` *(clamped)* | `336ms` | Fast across-the-board travel without rubber-band drag |

- **Initial Mount (`[data-ready]`):** Suppress indicator transitions on first paint (enable only after `requestAnimationFrame`) so the bar never animates in from `0px` on load.
- **Rapid Interruption:** Clicking another tab mid-flight updates `--cs-tabs-clip-start` / `--cs-tabs-clip-end` seamlessly from their current interpolated values.
- **`prefers-reduced-motion: reduce`:** Suppresses all indicator `transition-duration` and `transition-delay` (`0ms`) so the indicator updates instantaneously.

---

## 7. Interaction, Overflow & Token Contract

### Responsive Activation (`pointerdown`)
- **Button tabs:** Activate on `pointerdown` (primary button `button === 0`, non-disabled, `pointerType !== "touch"`) for instant view-switching feel without the `~80–120ms` click-release delay.
- **Touch & Scroll Guard:** For `pointerType === "touch"`, defer activation to `click` so horizontal swipe-scrolling over a `TabList` never triggers accidental tab switches.
- **Link tabs (`href` / `<a>`):** Activate via native `click` / browser navigation so `Cmd/Ctrl+click`, middle-click, and drag-away cancel work natively.

### Overflow Behavior
- Horizontal `TabList` uses `scrollFade` (`overflow-x: auto; scrollbar-width: none;`) with optional prev/next chevron buttons when overflowing (matching `SegmentedControl`), automatically scrolling newly focused/selected tabs into view.
- Vertical `TabList` stacks naturally without forced horizontal scroll.

### Module Custom Properties (`--cs-tabs-*`)

| Token | Default / Source | Role |
| :--- | :--- | :--- |
| `--cs-tabs-height` | Size-scaled (`32px` / `40px` / `48px`) | Horizontal tab height |
| `--cs-tabs-px` | Size-scaled (`10px` / `12px` / `16px`) | Tab inline padding |
| `--cs-tabs-gap` | Size-scaled (`4px` / `6px` / `8px`) | Gap between tabs |
| `--cs-tabs-item-gap` | Size-scaled (`6px` / `8px` / `8px`) | Gap between icon, label, and badge |
| `--cs-tabs-fg` | `var(--cs-color-text-weak)` | Inactive tab text & icon color |
| `--cs-tabs-fg-hover` | `var(--cs-color-text-strong)` | Hovered tab text & icon color |
| `--cs-tabs-fg-active` | `var(--cs-color-text-strong)` | Selected tab text & icon color |
| `--cs-tabs-bg-hover` | `var(--cs-color-base-soft)` | Subtle inset hover wash |
| `--cs-tabs-baseline-color` | `var(--cs-color-base-soft-hover)` | `1px` hairline baseline (`line` variant) |
| `--cs-tabs-indicator-color` | `var(--cs-color-text-strong)` (`line`) / `var(--cs-color-base-soft-hover)` (`ghost`) | Active indicator fill |
| `--cs-tabs-indicator-thickness` | `2px` (`sm`/`md`) / `2.5px` (`lg`) | `line` indicator thickness |
| `--cs-tabs-radius` | Size-scaled (`md` / `lg` / `xl`) | Hover wash & `ghost` pill radius |
| `--cs-tabs-squircle` | Size-scaled (`--cs-squircle-soft` / `--cs-squircle-smooth`) | Superellipse `corner-shape` |
| `--cs-tabs-dur-lead` | Distance-clamped (`160ms`–`260ms`) | Leading edge transition duration |
| `--cs-tabs-dur-trail` | Distance-clamped (`180ms`–`280ms`) | Trailing edge transition duration |
| `--cs-tabs-delay-trail` | Distance-clamped (`24ms`–`64ms`) | Trailing edge catch-up delay |
