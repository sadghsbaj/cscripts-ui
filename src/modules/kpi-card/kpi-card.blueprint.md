# KPI Card Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (compound component suite)
- **Import Path:** `cs/svelte/kpi-card` (`src/modules/kpi-card/index.ts`)
- **Purpose:** A borderless-first, composable analytics and evaluation KPI card (`<KpiCard />`) built with full visual, surface, squircle, and concentric-radius parity with `Card`. Provides explicit KPI layout presets (`stack`, `split`, `inline`, `hero`) and structured metric subcomponents (label, icon, hero value with `NumberMorph` inheritance, trend/delta badge, comparison context, progress/target benchmark, visual/sparkline slot, breakdown strip, and responsive card groups) so teams never rebuild KPI grids from scratch.
- **Boundaries & Cross-Nesting:**
  - **Shared surface-radius mechanic:** Extract `Card`'s private concentric radius context (`sm: 8px`, `md: 10px`, `lg: 12px` inner radii; `12px`, `16px`, `24px` padding subtraction down to an `8px` floor) into a tiny internal helper under `src/shared/surface-radius/` (`index.ts` + `surface-radius.svelte.ts`) consumed by both `KpiCard` and `Card`. This preserves zero cross-module imports while making `Card <-> KpiCard` cross-nesting (`Card > KpiCard`, `KpiCard > KpiCard`, `KpiCard > Card`, `KpiCard > KpiCardGroup > KpiCard`) automatically concentric.
  - **Public sibling composition only:** `KpiCardTarget` composes `Progress` (`../progress/index.ts`), and `KpiCardClose` composes `CloseButton` (`../close-button/index.ts`) + `HitArea` (`../hit-area/index.ts`).
  - **Zero hard coupling to optional peer dependencies:** Never imports `@number-flow/svelte` or `cs/svelte/number-morph`; instead, `KpiCardValue` and `KpiCardMetric` are designed for seamless Shadow DOM inheritance and baseline alignment with `<NumberMorph />` and `<NumberMorphGroup />`.

---

## 2. Public API

### Exports (`src/modules/kpi-card/index.ts`)

**Components (flat `PascalCase`):**
- `KpiCard` — Root surface container, layout coordinator, and context provider.
- `KpiCardHeader` — Top identity row aligning `KpiCardLabel`, optional leading or trailing `KpiCardIcon`, and trailing `KpiCardActions` / `Badge` / `KpiCardDelta`.
- `KpiCardIcon` — Subtle plain metric icon (`14px` / `16px` / `18px`).
- `KpiCardLabel` — Primary metric name / heading (`as` configurable).
- `KpiCardMetric` — Baseline-aligned, wrapping readout row pairing `KpiCardValue` and `KpiCardDelta` (and ideal wrapper for `<NumberMorphGroup />`).
- `KpiCardValue` — Hero numeric display with optional `prefix` / `suffix` affixes, `tabular-nums`, and `--cs-number-morph-*` styling hooks.
- `KpiCardDelta` — Trend & semantic status indicator (`trend`, `color`, `variant`) with directional Lucide icon.
- `KpiCardComparison` — Baseline comparison / benchmark note (`"vs. €114,200 last month"`).
- `KpiCardTarget` — Goal/threshold progress slot wrapping `Progress` with optional start/end labels or custom benchmark content.
- `KpiCardVisual` — Sparkline, mini-chart, ring, or gauge container (`placement`, `variant`, `ratio`, `bleed`).
- `KpiCardBreakdown` — Compact multi-column or list breakdown container for lightweight sub-KPIs.
- `KpiCardBreakdownItem` — Individual sub-metric cell (`label`, `value`, and/or custom `children`).
- `KpiCardBody` — Freeform content column matching `CardBody`.
- `KpiCardFooter` — Wrapping bottom row matching `CardFooter`.
- `KpiCardActions` — Action control group matching `CardActions` (usable in header or footer).
- `KpiCardOrnament` — Absolute-positioned decorative layer (`aria-hidden="true"`) matching `CardOrnament`.
- `KpiCardClose` — Corner dismiss button matching `CardClose` with automatic header clearance.
- `KpiCardGroup` — Responsive CSS Grid wrapper for dashboard KPI rows or nested sub-KPI `KpiCard` grids.

**Constants & Types:**
- `KPI_CARD_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const` -> `KpiCardVariant`
- `KPI_CARD_SIZES = ["sm", "md", "lg"] as const` -> `KpiCardSize`
- `KPI_CARD_LAYOUTS = ["stack", "split", "inline", "hero"] as const` -> `KpiCardLayout`
- `KPI_CARD_LABEL_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "span", "div"] as const` -> `KpiCardLabelElement`
- `KPI_CARD_COLORS = ["base", "accent", "positive", "caution", "negative"] as const` -> `KpiCardColor`
- `KPI_CARD_DELTA_VARIANTS = ["soft", "plain", "dot"] as const` -> `KpiCardDeltaVariant`
- `KPI_CARD_DELTA_TRENDS = ["up", "down", "flat"] as const` -> `KpiCardDeltaTrend`
- `KPI_CARD_VISUAL_PLACEMENTS = ["bottom", "top", "end", "start"] as const` -> `KpiCardVisualPlacement`
- `KPI_CARD_VISUAL_VARIANTS = ["transparent", "soft", "sunken"] as const` -> `KpiCardVisualVariant`
- `KPI_CARD_VISUAL_RATIOS = ["auto", "16/9", "21/9", "4/3", "3/1", "1/1"] as const` -> `KpiCardVisualRatio`
- `KPI_CARD_BREAKDOWN_VARIANTS = ["plain", "soft", "sunken"] as const` -> `KpiCardBreakdownVariant`
- `KPI_CARD_BREAKDOWN_COLUMNS = [1, 2, 3, 4, "auto"] as const` -> `KpiCardBreakdownColumns`
- `KPI_CARD_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const` -> `KpiCardActionsAlign`
- `KPI_CARD_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const` -> `KpiCardActionsOrientation`
- `KPI_CARD_ORNAMENT_PLACEMENTS = ["bottom-left", "bottom-right", "top-right", "inset"] as const` -> `KpiCardOrnamentPlacement`
- `KPI_CARD_ORNAMENT_SHAPES = ["circle", "none"] as const` -> `KpiCardOrnamentShape`
- `KPI_CARD_GROUP_COLUMNS = [1, 2, 3, 4, "auto"] as const` -> `KpiCardGroupColumns`
- Props types for every component (`KpiCardProps`, `KpiCardHeaderProps`, `KpiCardIconProps`, `KpiCardIconComponentProps`, `KpiCardLabelProps`, `KpiCardMetricProps`, `KpiCardValueProps`, `KpiCardDeltaProps`, `KpiCardComparisonProps`, `KpiCardTargetProps`, `KpiCardVisualProps`, `KpiCardBreakdownProps`, `KpiCardBreakdownItemProps`, `KpiCardBodyProps`, `KpiCardFooterProps`, `KpiCardActionsProps`, `KpiCardOrnamentProps`, `KpiCardCloseProps`, `KpiCardGroupProps`).
- Context helpers: `KpiCardContext` (`{ readonly variant: KpiCardVariant; readonly size: KpiCardSize; readonly layout: KpiCardLayout }`), `getKpiCardContext`, `setKpiCardContext`, `hasKpiCardContext`.

### Component Props

#### `KpiCard` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `variant: KpiCardVariant` — **Required** (`"elevated" | "soft" | "sunken" | "transparent"`, no default).
- `size: KpiCardSize` — **Required** (`"sm" | "md" | "lg"`, no default).
- `layout?: KpiCardLayout` — `@default "stack"`.
  - `"stack"`: Vertical KPI flow (header -> metric/value + delta -> comparison -> target -> visual -> breakdown/body -> footer).
  - `"split"`: Two-column metric + visual layout (identity, value, delta, and comparison on the start track; `KpiCardVisual` on the end track; `KpiCardTarget`, `KpiCardBreakdown`, and `KpiCardFooter` spanning full width below).
  - `"inline"`: Compact single-row horizontal strip (header/comparison on start `minmax(0, 1fr)` track; `KpiCardMetric`/`KpiCardValue` + `KpiCardDelta` end-aligned and vertically centered; optional `KpiCardTarget`/`KpiCardFooter` spanning full width underneath).
  - `"hero"`: Executive spotlight card with stepped-up display value scale, tighter display tracking, and generous section spacing for prominent charts or breakdowns.
- `children?: Snippet`

#### `KpiCardHeader` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `children?: Snippet`

#### `KpiCardIcon` (`Omit<HTMLAttributes<HTMLSpanElement>, "color">`)
- `ref = $bindable<HTMLSpanElement | null>(null)`
- `icon: Component<KpiCardIconComponentProps>` — **Required** icon component (e.g. from `@lucide/svelte`).
- `color?: KpiCardColor` — `@default "base"` (`"base" | "accent" | "positive" | "caution" | "negative"`).
- `strokeWidth?: number | string` — Defaults to `2.25` (or `2` at `lg`).

#### `KpiCardLabel` (`HTMLAttributes<HTMLHeadingElement | HTMLSpanElement | HTMLDivElement>`)
- `ref = $bindable<HTMLHeadingElement | HTMLSpanElement | HTMLDivElement | null>(null)`
- `as?: KpiCardLabelElement` — `@default "h3"`.

#### `KpiCardMetric` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- Flex-wrap baseline container for `KpiCardValue` + `KpiCardDelta` (and optional inline `KpiCardComparison` or `<NumberMorphGroup />`). Automatically switches to `justify-content: flex-end` in `layout="inline"`.

#### `KpiCardValue` (`Omit<HTMLAttributes<HTMLDivElement>, "prefix">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `prefix?: string` — Optional baseline-aligned prefix (e.g. `"€"`, `"~"`).
- `suffix?: string` — Optional baseline-aligned unit/suffix (e.g. `"ms"`, `"%"`, `"/ mo"`, `"kWh"`).
- `children?: Snippet` — Numeric text or `<NumberMorph />`.

#### `KpiCardDelta` (`Omit<HTMLAttributes<HTMLSpanElement>, "color">`)
- `ref = $bindable<HTMLSpanElement | null>(null)`
- `trend?: KpiCardDeltaTrend` — `"up" | "down" | "flat"`. Renders a directional icon (`TrendingUp`, `TrendingDown`, `Minus` from `@lucide/svelte`) unless `showIcon={false}`.
- `color?: KpiCardColor` — Semantic status palette (`"base" | "accent" | "positive" | "caution" | "negative"`). When omitted, resolves smartly from `trend` (`"up" -> "positive"`, `"down" -> "negative"`, `"flat" | undefined -> "base"`); pass explicitly to invert "lower is better" metrics (e.g. `trend="down" color="positive"`).
- `variant?: KpiCardDeltaVariant` — `@default "soft"` (`"soft" | "plain" | "dot"`).
- `showIcon?: boolean` — `@default true` (only applies when `trend` is set and `variant !== "dot"`).
- `icon?: Component<KpiCardIconComponentProps>` — Optional icon override replacing the default trend glyph.
- `children?: Snippet`

#### `KpiCardComparison` (`HTMLAttributes<HTMLParagraphElement>`)
- `ref = $bindable<HTMLParagraphElement | null>(null)`

#### `KpiCardTarget` (`Omit<HTMLAttributes<HTMLDivElement>, "color">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `value?: number | null` — Current progress value forwarded to `<Progress />` when custom track markup is not provided.
- `min?: number` — `@default 0`.
- `max?: number` — `@default 100`.
- `appearance?: ProgressAppearance` — `@default "bar"` (`"bar" | "dashed" | "dotted"`).
- `variant?: ProgressVariant` — Defaults contextually from `KpiCard`: `"elevated"` when parent `KpiCard` has `variant="sunken"` or `"soft"`, otherwise `"soft"`.
- `color?: ProgressColor` — `@default "accent"`.
- `size?: ProgressSize` — Defaults contextually from `KpiCard` (`sm`/`md` -> `"sm"`, `lg` -> `"md"`).
- `segments?: number` — Forwarded to `Progress` for `dashed`/`dotted` appearances.
- `label?: string` — Start-aligned goal description (also wired to `Progress` via `aria-labelledby`).
- `target?: string` — End-aligned tabular readout (e.g. `"€128k / €150k"`, `"84%"`).
- `children?: Snippet` — Optional custom benchmark bar or supplementary track markup.

#### `KpiCardVisual` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `placement?: KpiCardVisualPlacement` — Defaults to `"end"` when parent `KpiCard` has `layout === "split"` or `"inline"`, otherwise `"bottom"`.
- `variant?: KpiCardVisualVariant` — `@default "transparent"` (`"transparent" | "soft" | "sunken"`).
- `ratio?: KpiCardVisualRatio | (string & {})` — `@default "auto"`.
- `bleed?: boolean` — `@default false` (extends flush to card squircle edges when `"top"` or `"bottom"`).
- `children?: Snippet`

#### `KpiCardBreakdown` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `variant?: KpiCardBreakdownVariant` — `@default "plain"` (`"plain" | "soft" | "sunken"`).
- `columns?: KpiCardBreakdownColumns` — `@default "auto"` (`1 | 2 | 3 | 4 | "auto"`).
- `children?: Snippet`

#### `KpiCardBreakdownItem` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `label?: string` — Sub-metric label.
- `value?: string | number` — Tabular sub-metric value.
- `children?: Snippet` — Custom content (e.g. `<NumberMorph />`, `<KpiCardDelta />`).

#### `KpiCardBody` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`

#### `KpiCardFooter` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`

#### `KpiCardActions` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `align?: KpiCardActionsAlign` — `@default "end"`.
- `orientation?: KpiCardActionsOrientation` — `@default "horizontal"`.

#### `KpiCardOrnament` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `placement?: KpiCardOrnamentPlacement` — `@default "bottom-left"`.
- `shape?: KpiCardOrnamentShape` — `@default "none"`.

#### `KpiCardClose` (`Omit<CloseButtonProps, "size"> & { size?: CloseButtonSize }`)
- `ref = $bindable<HTMLButtonElement | null>(null)`
- `variant: CloseButtonVariant` — **Required** (`"soft" | "ghost" | "elevated"`).
- `size?: CloseButtonSize` — Contextually mapped from `KpiCard` (`sm -> "xs"`, `md -> "sm"`, `lg -> "md"`), or `"sm"` standalone.

#### `KpiCardGroup` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `columns?: KpiCardGroupColumns` — `@default "auto"` (`1 | 2 | 3 | 4 | "auto"`).
- `children?: Snippet`

### CSS Custom Properties (`--cs-kpi-card-*`)

| Variable | Description |
| :--- | :--- |
| `--cs-kpi-card-bg` / `--cs-kpi-card-fg` / `--cs-kpi-card-shadow` | Surface background, text color (`--cs-color-text-main`), and box-shadow. |
| `--cs-kpi-card-padding` / `--cs-kpi-card-gap` / `--cs-kpi-card-header-gap` / `--cs-kpi-card-section-gap` | Card padding (`12px`/`16px`/`24px`), grid gap (`8px`/`12px`/`16px`), header label stack gap (`2px`/`3px`/`4px`), and hero section spacing. |
| `--cs-kpi-card-radius` / `--cs-kpi-card-squircle` | Outer radius (`--cs-radius-2xl`/`--cs-radius-3xl`/`28px`, or `--cs-kpi-card-nested-radius` when nested) and `corner-shape` (`--cs-squircle`). |
| `--cs-kpi-card-inner-radius` / `--cs-kpi-card-inner-radius-base` / `--cs-kpi-card-nested-radius` | Concentric inner radius (`max(var(--cs-kpi-card-inner-radius-base, var(--cs-radius-lg)), calc(var(--cs-kpi-card-radius) - var(--cs-kpi-card-padding)))`) and ancestor-provided nested radius. |
| `--cs-kpi-card-label-size` / `--cs-kpi-card-comparison-size` | Typography scale for metric label (`--cs-text-xs`/`13px`/`--cs-text-sm`) and comparison text. |
| `--cs-kpi-card-value-size` / `--cs-kpi-card-value-weight` / `--cs-kpi-card-affix-fg` / `--cs-kpi-card-value-affix-gap` | Hero readout font size (scaled by `size` and `layout`), weight (`600`), prefix/suffix muted foreground (`--cs-color-text-weak`, also mapped to `--cs-number-morph-affix-fg`), and affix gap. |
| `--cs-kpi-card-icon-fg` / `--cs-kpi-card-icon-size` | `KpiCardIcon` color and glyph size (`14px`/`16px`/`18px`). |
| `--cs-kpi-card-delta-bg` / `--cs-kpi-card-delta-fg` / `--cs-kpi-card-delta-dot-bg` | `KpiCardDelta` surface tint, foreground color, and dot fill. |
| `--cs-kpi-card-visual-bg` / `--cs-kpi-card-visual-shadow` / `--cs-kpi-card-visual-radius` / `--cs-kpi-card-visual-padding` | `KpiCardVisual` well fill, shadow, radius (`--cs-kpi-card-inner-radius`), and inner padding. |
| `--cs-kpi-card-visual-inline-size` / `--cs-kpi-card-visual-inline-block-size` / `--cs-kpi-card-visual-ratio` / `--cs-kpi-card-visual-bleed-start` / `--cs-kpi-card-visual-bleed-end` | Side visual width (`104px`/`144px`/`192px`, or `72px` in `inline`), compact inline visual height (`24px`/`28px`/`32px`), aspect ratio, and top/bottom bleed offsets. |
| `--cs-kpi-card-breakdown-bg` / `--cs-kpi-card-breakdown-radius` / `--cs-kpi-card-breakdown-padding` / `--cs-kpi-card-breakdown-gap` | Breakdown plate fill, radius, padding, and cell gap. |
| `--cs-kpi-card-close-offset` / `--cs-kpi-card-close-size` | Corner close inset (`8px`/`10px`/`12px`) and header clearance width (`16px`/`24px`/`32px`). |
| `--cs-kpi-card-ornament-color` / `--cs-kpi-card-ornament-tint` / `--cs-kpi-card-ornament-size` / `--cs-kpi-card-ornament-icon-size` | Circle ornament tint (`oklab` `light-dark`), diameter (`88px`/`104px`/`124px`), and icon ratio (`40%`). |
| `--cs-kpi-card-group-gap` / `--cs-kpi-card-group-min-size` | `KpiCardGroup` grid gap (`12px` default, or inherited `--cs-kpi-card-gap` when nested) and auto-fit column minimum (`220px`). |

---

## 3. DOM, Semantics & Accessibility

- **Native HTML Elements:**
  - `KpiCard`, `KpiCardHeader`, `KpiCardMetric`, `KpiCardValue`, `KpiCardTarget`, `KpiCardVisual`, `KpiCardBreakdown`, `KpiCardBreakdownItem`, `KpiCardBody`, `KpiCardFooter`, `KpiCardActions`, `KpiCardOrnament`, `KpiCardGroup` -> `<div>`.
  - `KpiCardLabel` -> `<svelte:element this={as}>` (default `"h3"`).
  - `KpiCardComparison` -> `<p>`.
  - `KpiCardIcon`, `KpiCardDelta` -> `<span>`.
  - `KpiCardClose` -> `<CloseButton>` (`<button type="button">`).
- **`data-*` Attributes & Selectors:**
  - `KpiCard`: `data-variant={variant}`, `data-size={size}`, `data-layout={layout}`, `data-nested` (present when inside an ancestor `Card` or `KpiCard`).
  - `KpiCardIcon`: `data-color={color}`.
  - `KpiCardDelta`: `data-variant={variant}`, `data-color={resolvedColor}`, `data-trend={trend}`.
  - `KpiCardVisual`: `data-placement={resolvedPlacement}`, `data-variant={variant}`, `data-ratio={ratio === "auto" ? "auto" : undefined}`, `data-bleed={bleed ? "" : undefined}`.
  - `KpiCardBreakdown`: `data-variant={variant}`, `data-columns={columns}`.
  - `KpiCardActions`: `data-align={align}`, `data-orientation={orientation}`.
  - `KpiCardOrnament`: `data-placement={placement}`, `data-shape={shape}`.
  - `KpiCardGroup`: `data-columns={columns}`, `data-nested` (present when inside an ancestor surface context).
- **ARIA & Screen Reader Semantics:**
  - `KpiCardIcon`, `KpiCardDelta` trend glyph/dot, and `KpiCardOrnament` render `aria-hidden="true"`.
  - `KpiCardDelta` never relies solely on color or glyph: consumers supply signed delta text (`+12.4%`, `-8 ms`) or `aria-label` when using unsigned numbers.
  - `KpiCardTarget` connects `label` to `<Progress />` via `$props.id()` + `aria-labelledby`, falling back to `t({ de: "Zielerreichung", en: "Target progress" })` from `src/shared/lang.internal.ts` when `label` and `aria-label` are absent.
  - `KpiCardClose` inherits localized `aria-label` (`t({ de: "Schließen", en: "Close" })`) from `CloseButton`.
- **Keyboard & Focus Order:**
  - `KpiCard` itself is non-interactive (`<div>`), preventing nested-interactive-element violations.
  - Visual placement across `stack`, `split`, `inline`, and `hero` relies on CSS Grid column/row placement and CSS `order` (with automatic `KpiCardClose` right-padding clearance on `KpiCardHeader`). Document logical DOM order (`KpiCardHeader` -> `KpiCardClose` -> `KpiCardMetric`/`KpiCardValue` -> `KpiCardComparison` -> `KpiCardTarget` -> `KpiCardVisual` -> `KpiCardBreakdown`/`KpiCardBody` -> `KpiCardFooter`) so keyboard `Tab` flow matches visual scanning top-to-bottom.

---

## 4. Visual & Motion Contract

- **Surface & Elevation Parity with `Card`:**
  - `elevated`: `--cs-color-elevated`, `--cs-shadow-elevated` (default primary surface on `canvas` or `sunken`).
  - `soft`: `--cs-color-base-soft`, `box-shadow: none` (sub-cards or low-contrast plates).
  - `sunken`: `--cs-color-sunken`, `--cs-shadow-sunken` (recessed wells and nested sub-KPIs inside `elevated` cards).
  - `transparent`: `transparent`, `box-shadow: none` (borderless unboxed layout grouping).
  - Root `.cs-kpi-card` applies `overflow: clip; isolation: isolate;`, borderless depth (zero CSS `border`), and `corner-shape: var(--cs-squircle)` (`--cs-squircle-smooth` when `data-nested`).
  - Inner framed plates (`KpiCardDelta[data-variant="soft"]`, `KpiCardVisual[data-variant="soft"|"sunken"]`, `KpiCardBreakdown[data-variant="soft"|"sunken"]`) use `--cs-squircle-soft` / `--cs-squircle-smooth` and concentric `--cs-kpi-card-inner-radius`.
- **Proportional `size` Scale & Typography Calibration:**
  - Outer geometry mirrors `Card` 1:1 (`sm`: `12px` pad / `8px` gap / `16px` radius; `md`: `16px` pad / `12px` gap / `24px` radius; `lg`: `24px` pad / `16px` gap / `28px` radius).
  - Typographic hierarchy inverts prose cards so the numeric value dominates:
    - `KpiCardLabel`: `--cs-color-text-weak` (or `text-main`), `font-weight: 500`, `12px`/`13px`/`14px`.
    - `KpiCardValue`: `--cs-color-text-strong`, `font-weight: 600`, `line-height: 1.05`, `letter-spacing: var(--cs-tracking-tight)`, `font-variant-numeric: tabular-nums`:
      - Standard (`stack` / `split`): `sm: 20px` (`--cs-text-xl`), `md: 24px` (`--cs-text-2xl`), `lg: 30px` (`--cs-text-3xl`).
      - `layout="hero"`: `sm: 24px` (`--cs-text-2xl`), `md: 30px` (`--cs-text-3xl`), `lg: 36px` (`--cs-text-4xl`), `--cs-tracking-tighter`.
      - `layout="inline"`: `sm: 16px` (`--cs-text-base`), `md: 20px` (`--cs-text-xl`), `lg: 24px` (`--cs-text-2xl`).
    - `KpiCardValue` prefix/suffix (`--cs-kpi-card-affix-fg: var(--cs-color-text-weak)`) sit at `0.68em`–`0.75em`, `font-weight: 500`, baseline-aligned (`display: inline-flex; align-items: baseline`).
    - `KpiCardDelta`: calibrated to compact badge rhythm (`11px`/`12px`/`13px`, `font-weight: 500`, `tabular-nums`, `--cs-color-<color>-soft` + `--cs-color-<color>-soft-fg`).
- **Motion Role:**
  - `KpiCard` surfaces remain calm and stationary (no hover scale/lift on non-interactive cards).
  - Live data transitions come cleanly from composed `<NumberMorph />` / `<NumberMorphGroup />` (digit roll via `CS_NUMBER_MORPH_*_TIMING`), `<Progress />` inside `KpiCardTarget` (`--cs-dur-280` / `--cs-ease-quart-out` + segment stagger), and `<KpiCardClose />` press squash physics. Global `prefers-reduced-motion: reduce` handling lives in `motion.css`.

---

## 5. Edge Cases & Constraints

- **No `container-type: inline-size`:** Avoid CSS containment on `.cs-kpi-card` so intrinsic sizing, auto-fit `KpiCardGroup` tracks, and descendant `Popover`s/tooltips work without clipping or layout collapse.
- **Wrapping & Long Numbers:** All grid items enforce `min-inline-size: 0`. `KpiCardMetric` uses `flex-wrap: wrap; align-items: baseline` so large currency/decimal values + `KpiCardDelta` wrap cleanly in narrow tiles instead of overflowing horizontally. Direct-child `KpiCardValue` + `KpiCardDelta` without `KpiCardMetric` also place cleanly in the metric region via `:has()` grid rules, while `KpiCardMetric` is recommended whenever `Value` + `Delta` share a wrapping baseline or `<NumberMorphGroup />`.
- **Layout Stability (`tabular-nums`):** All numeric surfaces (`KpiCardValue`, `KpiCardDelta`, `KpiCardTarget` target text, `KpiCardBreakdownItem` value, `KpiCardComparison`) enforce `font-variant-numeric: tabular-nums` to prevent horizontal jitter during live updates or `NumberMorph` animations.
- **Dark Mode Nesting Guidance:** Mirror `Card`'s surface contrast rules—inside `elevated` parent cards, prefer `sunken` or `transparent` for nested `KpiCard`s (or `soft` paired with `soft` inner controls); inside `sunken` parents, use `elevated` child `KpiCard`s.
- **Explicit Non-Goals:**
  - No bundled SVG/Canvas chart-plotting engine inside `kpi-card` (`KpiCardVisual` is a layout/surface slot for consumer charts or SVGs).
  - No `KpiCard` root-level `color` variant matrix (monochrome surfaces only; semantic status lives on `KpiCardDelta`, `KpiCardTarget`, `KpiCardIcon`, and composed `Badge`s).
  - No `KpiCardRail` control dock (use `Card` + `CardRail` for vertical control strips; use `KpiCardActions` for KPI actions).
  - No built-in polling, locale formatting store, or clickable `<div>` card wrapper.
