# Tabs Design Spec (`src/modules/tabs/`)

## 1. Role & Visual Differentiation from `SegmentedControl`

`Tabs` is a **macro view-switching navigation primitive** for page sections, settings panes, inspector views, and route-level sub-navigation. While `SegmentedControl` already exists for local, compact mode toggles, `Tabs` is intentionally distinct in both visual weight and spatial role:

| Dimension | `SegmentedControl` | `Tabs` |
| :--- | :--- | :--- |
| **Role** | Local state/mode toggle (2–5 short options) | Macro view/section navigation (can scale to many tabs + panels) |
| **Container Shell** | Sunken pill track (`--cs-color-base-soft`) + elevated sliding thumb | Open-air, borderless typographic strip anchored by a `1px` hairline |
| **Visual Weight** | Tactile, contained widget | Editorial, lightweight, architectural |
| **Orientation** | Horizontal only | `horizontal` & `vertical` |
| **Indicator** | Full-height elevated pill behind label | `2px` crisp edge bar (`2.5px` on `lg`) overlapping a `1px` hairline |

Four core principles govern `Tabs`:
1. **Typographic Authority Without Chrome:** Strong, scannable labels (`font-weight: 500`) separated by clean rhythm and a single `1px` hairline—never heavy boxes or 3-sided folder borders.
2. **Monochrome Restraint:** Active state uses `--cs-color-text-strong` and a neutral strong indicator (`--cs-color-text-strong`) by default, keeping `--cs-color-accent-*` free for `:focus-visible` rings and primary CTAs.
3. **Zero Layout Shift:** Tabs maintain identical horizontal metrics between rest and active states—never shifting adjacent tabs when selected.
4. **Direct WAAPI Slide Indicator:** The active indicator glides cleanly between tabs in `200ms` (`--cs-dur-200`, `--cs-ease-quart-out`) via GPU-composited `clip-path: inset(...)` without rubbery overshoot or layout shift.

---

## 2. Baseline & Indicator Architecture

`Tabs` uses a single, dedicated **typographic line architecture** (no `variant` prop, no `ghost` or `enclosed` variants). Every `Tabs` instance pairs a `1px` hairline baseline (`--cs-tabs-baseline-color`) with a `2px` (`2.5px` on `lg`) solid active indicator bar (`--cs-tabs-indicator-color`).

> **Why a single architecture?** `SegmentedControl` already owns the contained pill-indicator pattern. Keeping `Tabs` strictly as a borderless typographic line primitive preserves a clear visual boundary between local mode toggles and macro view navigation, while avoiding dated 3-sided folder borders (*Borderless by Default* in `design-and-tokens.md`).

### Baseline Span & Width (`width` & `baseline`)

`Tabs` separates **tab item distribution** (`width`) from **hairline span** (`baseline`) so it adapts cleanly to both full-page headers and compact inline toolbars:

- **`width="content"` (default):** Each tab sizes to its intrinsic label + icon/badge width (`fit-content`), spaced by `--cs-tabs-gap`.
- **`width="equal"`:** Tabs divide the available container width equally (`grid-auto-flow: column; grid-auto-columns: 1fr;` horizontally).
- **`baseline="full" | "content" | "none"`:**
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
| Indicator thickness | `2px` | `2px` | `2.5px` |
| Hover / vertical active tint radius (`--cs-tabs-radius`) | `var(--cs-radius-md)` (`6px`) | `var(--cs-radius-lg)` (`8px`) | `var(--cs-radius-xl)` (`12px`) |
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
  - **Inset Hover Wash (`:not([data-selected])` only):** An inner `::before` pseudo-layer fades in `--cs-color-base-soft` with `border-radius: var(--cs-tabs-radius); corner-shape: var(--cs-tabs-squircle);`.
  - *Optical inset detail (horizontal):* The hover wash is inset vertically (`inset-block: 4px; inset-inline: 2px;`) so the hover pill never touches or muddies the `1px` baseline or `2px` active indicator bar.
- **Active Tab (`[data-selected]` / `aria-selected="true"`):**
  - Label & icon: `--cs-color-text-strong`.
  - **Horizontal hover:** Hovering an already-active horizontal tab keeps the label strong without showing a background box. Because desktop button tabs activate on `pointerdown`, the `:not([data-selected])` hover wash disappears cleanly the instant the tab is pressed, leaving only the `2px` indicator bar.
- **Press (`:active` on inactive tabs only):**
  - Subtle `scale: 0.98` on `.cs-tabs-trigger-content` (never on the indicator track) over `--cs-dur-press` (`140ms`) `--cs-ease-press`, with `will-change: scale` and integer `line-height` to prevent Chromium subpixel text blur.
  - **No press scale on already-selected tabs:** Matching `SegmentedControl`, `[data-selected]` tabs suppress `:active` press scaling (`&:not([data-selected], :disabled, [aria-disabled="true"], [data-disabled]):active`) so clicking an already-active tab produces zero redundant bounce.
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
3. **Spine-Anchored Active & Hover Row Tint:** On wide vertical lists (`180px–240px`), a `2px` left bar alone can feel sparse next to long labels. Vertical tabs pair the `2px` bar with a subtle `--cs-color-base-soft` row tint on `[data-selected]` (and on inactive `:hover`).
   - **Connected Spine Geometry (Recommended over `4px` gap):** Instead of floating `4px` away from the vertical line (`inset-inline: 4px 0` with all 4 corners rounded), `::before` docks **flush against the vertical axis** (`inset-block: 1px; inset-inline: 0;`) with **square inner corners and rounded outer corners** (`border-start-start-radius: 0; border-end-start-radius: 0; border-start-end-radius: var(--cs-tabs-radius); border-end-end-radius: var(--cs-tabs-radius); corner-shape: var(--cs-tabs-squircle);`).
   - **Why this is cleaner:** Anchoring `::before` (`z-index: -1`) directly behind the `2px` indicator (`z-index: 2`) turns the bar + row tint into a single unified rail-anchored flag, eliminates any `4px` visual disconnect or subpixel seam, and keeps RTL mirroring automatic via logical properties.

---

## 6. Direct WAAPI Slide Indicator Motion (Core Specification)

Instead of animating `transform`/`width` (which distorts border radii on `scaleX` or triggers layout) or using multi-step Push-Pull curves, the active indicator glides directly between tabs with a single, crisp deceleration curve.

### Technical Architecture (WAAPI + `clip-path: inset(...)`)

`.cs-tabs-indicator` spans the full `.cs-tabs-list` track (`position: absolute`) and rests at a `clip-path: inset(...)` driven by two inline custom properties (`--cs-tabs-clip-start` and `--cs-tabs-clip-end`):

- **Horizontal:** `clip-path: inset(0 var(--cs-tabs-clip-end) 0 var(--cs-tabs-clip-start) round 9999px);`
- **Vertical:** `clip-path: inset(var(--cs-tabs-clip-start) 0 var(--cs-tabs-clip-end) 0 round 9999px);`
- **Why this works:**
  1. **100% GPU-composited:** `clip-path` animates on the compositor without triggering layout.
  2. **Crisp caps at every frame:** `round 9999px` maintains perfectly rounded ends regardless of tab width or height.
  3. **Scroll- & Transform-Immune Measurement:** `measureIndicatorMetrics` reads `activeEl.offsetLeft` / `offsetWidth` (horizontal) and `activeEl.offsetTop` / `offsetHeight` (vertical) against `trackEl.scrollWidth` / `scrollHeight`, staying immune to horizontal scroll offsets and `:active` `scale()` transforms.

### Direct 2-Keyframe Slide & Interruptibility

When `tabs.value` changes after initial mount:

1. **2-Keyframe WAAPI Animation:** `TabsList` calls `indicatorEl.animate([{ clipPath: fromClip }, { clipPath: toClip }], { duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)", fill: "none" })`.
   - `200ms` aligns with `--cs-dur-200` and `"cubic-bezier(0.25, 1, 0.5, 1)"` aligns with `--cs-ease-quart-out` in `src/css/foundation/motion.css`.
   - Using `fill: "none"` ensures the indicator falls back cleanly to its updated resting `--cs-tabs-clip-start` / `--cs-tabs-clip-end` inline styles once the animation finishes or is cancelled.
2. **Mid-Flight Interruptibility:** If a new tab is selected while an animation is already running, `syncIndicator` reads the live interpolated `getComputedStyle(indicatorEl).clipPath` via `parseComputedClipPath`, cancels the active `Animation` (`anim.cancel()`), and launches the next 2-keyframe slide from that exact mid-flight position.
3. **Initial Mount (`prevMetrics === null`):** Suppresses animation on first paint so the indicator snaps directly to the initial active tab without sliding in from `0px`.
4. **Layout & Resize (`ResizeObserver`):** Calls `syncIndicator(false)` to update resting clip offsets immediately without triggering a slide animation.
5. **`prefers-reduced-motion: reduce`:** Skips WAAPI animation and updates `--cs-tabs-clip-start` / `--cs-tabs-clip-end` instantaneously.

---

## 7. Interaction, Overflow & Token Contract

### Responsive Activation (`pointerdown`)
- **Button tabs:** Activate on `pointerdown` (primary button `button === 0`, non-disabled, `pointerType !== "touch"`) for instant view-switching feel without the `~80–120ms` click-release delay.
- **Touch & Scroll Guard:** For `pointerType === "touch"`, defer activation to `click` so horizontal swipe-scrolling over a `TabList` never triggers accidental tab switches.
- **Link tabs (`href` / `<a>`):** Activate via native `click` / browser navigation so `Cmd/Ctrl+click`, middle-click, and drag-away cancel work natively.

### Overflow Behavior & Surface-Agnostic Scroll Chevrons
- Horizontal `TabList` uses `scrollFade` (`overflow-x: auto; scrollbar-width: none;`) with optional prev/next chevron buttons (`.cs-tabs-scroll-btn`) when overflowing, automatically scrolling newly focused/selected tabs into view.
- **Background-Agnostic Chevron Contrast (Light & Dark Mode):** Because `Tabs` can sit directly on white `--cs-color-elevated` cards as well as `--cs-color-canvas`, white-tinted scroll buttons disappear on light cards. Instead, `.cs-tabs-scroll-btn::before` uses alpha-composited neutral tokens:
  - **Rest (`[data-visible]`):** `background-color: var(--cs-color-base-soft);` (`5%` `base-900` in light mode, `11%` `base-100` in dark mode) with `--cs-color-text-weak` icon.
  - **Hover (`:hover`):** `background-color: var(--cs-color-base-soft-hover);` (`9%` / `17%`) with `--cs-color-text-strong` icon—no hardcoded white fill or drop shadow needed.
  - **Press (`:active`):** `::before { scale: 0.92; }` for crisp tactile feedback.
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
| `--cs-tabs-bg-hover` | `var(--cs-color-base-soft)` | Subtle inset hover wash & vertical active tint |
| `--cs-tabs-baseline-color` | `var(--cs-color-base-soft-hover)` | `1px` hairline baseline |
| `--cs-tabs-indicator-color` | `var(--cs-color-text-strong)` | Active indicator fill (overridable to `--cs-color-accent-solid`) |
| `--cs-tabs-indicator-thickness` | `2px` (`sm`/`md`) / `2.5px` (`lg`) | Active indicator thickness |
| `--cs-tabs-radius` | Size-scaled (`md` / `lg` / `xl`) | Hover wash & vertical active tint radius |
| `--cs-tabs-squircle` | Size-scaled (`--cs-squircle-soft` / `--cs-squircle-smooth`) | Superellipse `corner-shape` |
| `--cs-tabs-clip-start` | Computed inline (`0px`+) | Resting start/top `clip-path` inset for `.cs-tabs-indicator` |
| `--cs-tabs-clip-end` | Computed inline (`0px`+) | Resting end/bottom `clip-path` inset for `.cs-tabs-indicator` |
