# Charts — Module Blueprint

## 1. Overview & Scope

- **Module:** `charts` (`src/modules/charts/`)
- **Import Path:** `cs/svelte/charts` (`src/modules/charts/index.ts`)
- **Kind:** `hybrid` (reactive Svelte 5 `ChartState` + typed `ChartContext` + flat `PascalCase` Tier-1 composable primitives + Tier-2 batteries-included business charts)
- **CSS Layer:** `@layer components.composite` (co-located `charts.css`, imported by `Chart.svelte`)
- **Purpose:** A clean, responsive, high-craft data visualization system tailored for business and management applications in `cscripts-ui`. Combines calm typographic precision, borderless surface integration, crisp vector rendering, and a genuine 2-tier architecture: concise batteries-included chart components built directly on top of an open, reactive primitive layer.

### 1.1 Architecture Decision: Pure-Math D3 Micro-Packages

**Locked Decision: Use 4 pure-math, tree-shakeable D3 micro-packages (`d3-scale`, `d3-shape`, `d3-array`, `d3-time`) strictly as an internal math & geometry kernel.**

| Dimension | 100% Custom Math | Pure-Math D3 Micro-Packages (`scale`, `shape`, `array`, `time`) |
| :--- | :--- | :--- |
| **Bundle Impact** | ~2–4 KB gzipped initially (grows as edge cases accumulate) | ~9–13 KB gzipped tree-shaken (unused generators like `pie`/`arc` tree-shake out) |
| **DOM Coupling** | Zero | **Zero** — `d3-selection`, `d3-transition`, `d3-axis` are strictly forbidden; Svelte 5 owns 100% of DOM/SVG rendering and reactivity |
| **Time Scales & DST** | High risk: leap years, month/quarter ticks, CET/CEST DST transitions require 600+ LOC of subtle calendar logic | Battle-tested calendar interval math & multi-resolution time ticks |
| **Tick Generation** | Prone to IEEE-754 float drift (`0.30000000000000004`), awkward step sizes, zero-crossing bugs | Wilkinson/Heckbert-grade `ticks()` & `nice()` rounding out of the box |
| **Path Geometry** | Monotone cubic splines (no overshoot on KPIs), diverging negative stacks, and rounded donut arcs (`padAngle` + `cornerRadius`) are non-trivial geometry | Solved once: `curveMonotoneX`, `stackOffsetDiverging`, `area().defined()`, `arc().cornerRadius().padAngle()` |
| **API Leakage** | N/A | **Zero public leakage** — D3 is confined to `chart-scales.internal.ts` and `chart-geometry.internal.ts`; public API exposes clean `cscripts-ui` TypeScript interfaces |

`d3-scale`, `d3-shape`, `d3-array`, and `d3-time` are approved as `dependencies` (with `@types/d3-scale`, `@types/d3-shape`, `@types/d3-array`, and `@types/d3-time` as `devDependencies`). Every scale and path generator is wrapped behind internal helpers so the kernel stays completely encapsulated and swappable.

---

### 1.2 Two-Tier Architecture

1. **Tier 1 — Open Composable Primitives & Reactive `ChartContext`:**
   - `<Chart>` provides the visual container, palette tokens, and `ChartState` via Svelte 5 `createContext()`.
   - `<ChartCanvas>` owns the responsive `ResizeObserver`, dynamic margin calculation, X / Y / Y2 scales, pointer/keyboard bisector scrubbing, and renders the `<svg>` stage with deterministic layer order.
   - Pluggable SVG mark/chrome layers (`ChartGrid`, `ChartAxis`, `ChartLine`, `ChartArea`, `ChartBar`, `ChartArc`, `ChartReferenceLine`, `ChartReferenceBand`, `ChartCrosshair`, `ChartAnnotation`) and HTML chrome (`ChartHeader`, `ChartLegend`, `ChartTooltip`, `ChartOverlay`, `ChartEmpty`, `ChartLoading`) all consume `getChartContext()`.
   - **Zero plugin registry boilerplate:** Any consuming app can write a custom `.svelte` layer, call `const chart = getChartContext()`, and place it directly inside `<ChartCanvas>` (SVG) or `<ChartOverlay>` (HTML) to access the exact same scales, margins, colors, and hover state.

2. **Tier 2 — Batteries-Included Business/Management Charts (V1 Set):**
   - Built *exclusively* by composing Tier-1 primitives (zero duplicated rendering logic).
   - Every Tier-2 chart accepts declarative `referenceLines` / `referenceBands` props for the 80% case **plus** an optional `children?: Snippet` (mounted inside the `<svg>` above series marks) and `tooltip?: Snippet` so consumers can layer custom SVG marks or custom tooltip content without dropping down to full Tier-1 boilerplate.

#### V1 Core Chart Set vs. Explicit Non-Goals

| Chart | In V1? | Rationale |
| :--- | :--- | :--- |
| **`LineChart`** | **Yes** | Core time-series & KPI trend tracking (multi-series, curves, dashed forecast/comparison lines, dual Y-axis). |
| **`AreaChart`** | **Yes** | Cumulative volume and stacked mix over time (`mode="overlay" \| "stacked"`). |
| **`BarChart`** | **Yes** | Categorical and period comparisons (`orientation="vertical" \| "horizontal"`, `mode="grouped" \| "stacked"`, diverging negative values). Covers both Column and Horizontal Bar charts cleanly. |
| **`ComposedChart`** | **Yes** | Essential management combo view (e.g., revenue bars on left Y-axis + margin % line on right Y2-axis). |
| **`DonutChart`** | **Yes** | Part-to-whole composition with optional center KPI callout. **Locked: `DonutChart` only (no separate `PieChart`)** — `innerRadiusRatio={0}` produces a full Pie cleanly without API duplication. |
| Scatter / Bubble | No (V2) | Lower frequency in management dashboards; trivial to build on Tier-1 primitives (`scaleLinear` X + custom `<circle>` layer) today. |
| Heatmap / Treemap / Sankey / Waterfall | No (V2) | Distinct layout engines; keep V1 focused and rock-solid. |
| Radar / Gauge | No | Poor perceptual accuracy vs. `BarChart` or `KpiCard` + `Progress`. |
| Zoom / Brush / Pan | No (V2) | Adds complex gesture/domain state; V2 can add `<ChartBrush>` on the same `ChartContext`. |
| SVG / PNG Export Utility | No (V2) | Not shipped in V1, **but** plot DOM/SVG is engineered from Day 1 for crisp, zero-`foreignObject` export in V2. |

---

### 1.3 Rendering Engine: SVG vs. Canvas, Text Labels & Export Readiness

- **SVG as the V1 Rendering Engine:**
  - Infinite vector sharpness at any DPR, zoom, print, or PDF scale.
  - Native CSS styling (`var(--cs-*)`, `light-dark()`, `:hover`, CSS transitions, `@layer components.composite`).
  - Fine-grained Svelte 5 reactivity and native DOM accessibility without manual dirty-rect redraw loops.
  - Business/management charts typically contain 5–500 data points (rarely >2,000), where SVG renders at 60–120fps.
  - *Canvas boundary:* Canvas only becomes relevant above ~5,000–10,000 simultaneous marks (e.g. dense scatter clouds or telemetry streams). Because Tier 1 decouples `ChartState` from mark layers, a future `<ChartCanvasRaster>` layer can plug into the same coordinate system if ever needed.

- **Strict Boundary: Plot-Internal SVG vs. Outer HTML Chrome:**
  - **Plot-Internal Elements (100% Native SVG — ZERO `<foreignObject>`):**
    - Gridlines, zero baseline, axes, tick marks, tick labels (`<text>` / `<tspan>`), axis titles, data marks, direct value labels, reference lines/bands & their labels, and `<ChartAnnotation>` callouts.
    - **Why:** Serializing `<svg>` containing `<foreignObject>` breaks CSS inheritance, drops web fonts, taints canvas during PNG rasterization, and renders inconsistently across PDF/Office tools. Pure SVG guarantees future `exportSvg` / `exportPng` (`2x`/`3x`) produces razor-sharp, layout-identical output.
  - **Outer Chrome & Interactive Overlays (Semantic HTML):**
    - `ChartHeader` (Title, Description, Actions), `ChartLegend` (keyboard-accessible interactive series toggles), `ChartTooltip` (floating crosshair readout), `ChartEmpty`, `ChartLoading`, and opt-in `ChartOverlay` (for interactive HTML controls/badges when export is not required).

- **Crisp SVG Text & Long Management Label Strategy:**
  - **Crispness:** Snap 1px horizontal/vertical SVG hairlines (`grid`, `axis`, `reference`, `crosshair`) to `Math.floor(v) + 0.5` (`shape-rendering="crispEdges"` on straight `<line>` elements only); snap bar edges, hover bands, and `<text>` coordinates to integer pixels (`Math.round(v)`). Apply `font-family: var(--cs-font-sans)` and `font-variant-numeric: tabular-nums lining-nums` on numeric SVG `<text>`. Never apply `will-change: transform` to the `<svg>` itself.
  - **Offscreen Text Measurement (`chart-measure.internal.ts`):** Use a single cached `CanvasRenderingContext2D.measureText()` helper (reading resolved font size/family once per size change) to measure tick strings in sub-millisecond time with **zero DOM layout reflow**.
  - **Dynamic Margins:** `ChartCanvas` computes `margin.left`, `margin.right`, `margin.bottom`, and `margin.top` reactively from the measured max width of formatted Y / Y2 ticks, optional axis titles, and X-axis tick height/rotation—eliminating both clipped currency labels (`€1,250,000`) and wasted whitespace.
  - **Long Labels:**
    - *Auto-skip (X-axis):* Automatically thin tick density when adjacent labels would collide.
    - *Truncation:* Truncate overflowing category labels (especially Y-axis labels on horizontal `BarChart`) to exact pixel budget with `…`, preserving the full label in `<title>` and `ChartTooltip`.
    - *Smart Rotation:* `tickAngle="auto" | 0 | -35 | -45` tilts dense categorical X-labels to `-35°` (`text-anchor="end"`) and expands `margin.bottom` via `width * sin(35°)`.
    - *Optional 2-Line Wrap:* `wrapTicks?: boolean` splits category names on word boundaries into at most 2 `<tspan>` lines.

---

### 1.4 Tooltip Strategy

- **Why NOT `src/modules/tooltip/Tooltip.svelte`:**
  `Tooltip` is a single-line `26px` pill (`border-radius: var(--cs-radius-full)`) built for discrete static triggers with CSS Anchor Positioning (`--anchor-<id>`), hover warmup/cooldown timers, and discrete entry/exit blur animations. Chart scrubbing is continuous 60fps pointer tracking over a 2D plot with bisector snapping and multi-row structured readouts (header + color swatch + series label + tabular value + optional total). Reusing `Tooltip` would require fighting every styling and lifecycle assumption it makes.
- **Why NOT `src/modules/popover/Popover.svelte`:**
  `Popover` relies on CSS `position-anchor` bound to a static DOM element. Repositioning a dummy anchor element on every `pointermove` forces layout/anchor recalculations every frame and fights `Popover`'s discrete `blur`/`scale` transition choreography.
- **Locked Architecture (`ChartTooltip.svelte`):**
  - Renders a dedicated floating card using native **`popover="manual"`** (promoted to the browser top layer so it is **never clipped** by parent `Card` or `ScrollArea` `overflow: clip`), styled with `--cs-color-elevated`, `--cs-shadow-floating`, `--cs-chart-tooltip-radius` (`12px` / `14px`), `--cs-squircle-smooth`, and `pointer-events: none`.
  - **Zero-reflow GPU positioning:** `ChartCanvas` caches the SVG bounding rect on `pointerenter` / `ResizeObserver` / passive scroll, computes viewport coordinates from the snapped crosshair/bar/slice anchor (`12px` horizontal offset, `16px` flip hysteresis deadzone, `8px` viewport edge clamp), snaps `(x, y)` to integer pixels (`Math.round`), and positions via `transform: translate3d(x, y, 0)`.
  - **Instant-first, glide-after motion:** On first appearance, coordinates apply immediately (never flying in from `(0, 0)`) with opacity/scale enter (`--cs-dur-enter-sm`); while open, scrubbing smoothly glides `transform` over `--cs-chart-dur-scrub` (`--cs-dur-80`) `--cs-ease-cubic-out`.
  - **Direct `NumberMorph` integration:** Numeric values render directly through `<NumberMorph willChange={false} respectMotionPreference={true} />` from `../number-morph/index.ts` (no fallback shim) with fast scrubbing timing (`~160ms`) and snapped integer line-heights (`16px` header / `18px` rows). `@number-flow/svelte` is intentionally an optional peer dependency that consuming apps install whenever they use a component relying on it. Custom `children` snippets or custom string `format` callbacks remain supported.

---

### 1.5 Boundaries & File Layout (`src/modules/charts/`)

- **Public Sibling Composition Only (Zero Cross-Module Internals):**
  - `../button/index.ts` (`Button`, `ButtonLabel`) — Quiet reset button in empty/all-hidden state.
  - `../number-morph/index.ts` (`NumberMorph`) — Direct rolling numeric readouts in `ChartTooltip` and `DonutChart` center metric (`@number-flow/svelte` is an optional peer dependency installed by consuming apps).
- **Shared Internal Utilities:**
  - `../../shared/surface-radius/index.ts` (`createSurfaceRadius`) — Concentric corner radii when nested inside `Card` or `KpiCard`.
  - `../../shared/resolve-getter.ts` (`resolveGetter`) — Uniform `MaybeGetter<T>` resolution.
  - `../../shared/lang.internal.ts` (`t`) — Compile-time `de`/`en` localization for built-in UI and ARIA defaults.

| File | Visibility | Responsibility |
| :--- | :--- | :--- |
| `index.ts` | Public | Sole public barrel exporting Tier-1 primitives, Tier-2 charts, context helpers, constants, and types. |
| `charts.css` | Internal stylesheet | Complete `@layer components.composite` styling (variants, sizes, palettes, SVG typography, legend, tooltip, loading shimmer). |
| `chart-state.svelte.ts` | Public (via `index.ts`) | Reactive Svelte 5 `ChartState` class (dimensions, scales, visibility, hover/isolation, bisected active datum, palette resolution). |
| `chart.context.ts` | Public (via `index.ts`) | Typed `ChartContext` via Svelte 5 `createContext()` (`getChartContext`, `setChartContext`, `hasChartContext`). |
| `chart-scales.internal.ts` | Internal | Encapsulated `d3-scale` / `d3-array` / `d3-time` scale creation, domain padding, zero-baseline & dual-axis logic. |
| `chart-geometry.internal.ts` | Internal | Encapsulated `d3-shape` path builders (line, area, stacked/grouped/diverging bars, rounded donut arcs, bisector lookup). |
| `chart-measure.internal.ts` | Internal | Offscreen `CanvasRenderingContext2D.measureText` cache, truncation, auto-skip, 2-line wrap, and dynamic margin calculation. |
| `Chart.svelte` | Public | Root shell (`variant`, `size`, `palette`, `createSurfaceRadius`, `ChartContext` provider). |
| `ChartHeader.svelte` / `ChartTitle.svelte` / `ChartDescription.svelte` / `ChartActions.svelte` | Public | Optional outer HTML header chrome. |
| `ChartLegend.svelte` | Public | Interactive outer HTML series legend (toggle visibility + hover/focus isolate). |
| `ChartCanvas.svelte` | Public | Responsive `ResizeObserver` plot stage, `<svg>` host, pointer/keyboard scrubbing, and overlay mount. |
| `ChartGrid.svelte` | Public | SVG horizontal/vertical gridlines and zero baseline. |
| `ChartAxis.svelte` | Public | SVG X / Y / Y2 axes with smart tick density, truncation, rotation, and optional title. |
| `ChartLine.svelte` | Public | SVG line mark layer (curve, stroke, dashed style, active dots, value labels). |
| `ChartArea.svelte` | Public | SVG area fill + optional top stroke layer (overlay or stacked, subtle vertical gradient). |
| `ChartBar.svelte` | Public | SVG vertical column / horizontal bar layer (grouped, stacked, diverging, rounded outer corners, value labels). |
| `ChartArc.svelte` | Public | SVG pie / donut arc layer with `padAngle`, `cornerRadius`, slice hover emphasis, and center slot. |
| `ChartReferenceLine.svelte` | Public | SVG horizontal/vertical threshold line with crisp inline label pill. |
| `ChartReferenceBand.svelte` | Public | SVG horizontal/vertical target corridor with soft tint fill and optional label. |
| `ChartCrosshair.svelte` | Public | SVG active hairline rule + point highlight rings snapped to active index. |
| `ChartAnnotation.svelte` | Public | Export-safe SVG data-coordinate callout (marker + optional leader + text). |
| `ChartOverlay.svelte` | Public | Optional HTML overlay layer aligned to the plot box for custom interactive controls/badges. |
| `ChartTooltip.svelte` | Public | Dedicated `popover="manual"` GPU-translated floating tooltip with tabular formatting and custom snippet support. |
| `ChartEmpty.svelte` / `ChartLoading.svelte` | Public | Calm empty state (including all-series-hidden reset) and silhouette loading skeleton. |
| `LineChart.svelte` | Public | Tier-2 batteries-included Line Chart. |
| `AreaChart.svelte` | Public | Tier-2 batteries-included Area Chart. |
| `BarChart.svelte` | Public | Tier-2 batteries-included Bar / Column Chart. |
| `ComposedChart.svelte` | Public | Tier-2 batteries-included Combo (Bar + Line + Area + Dual Y-axis) Chart. |
| `DonutChart.svelte` | Public | Tier-2 batteries-included Donut / Pie Chart. |
| `charts.blueprint.md` | Docs | This technical architecture blueprint. |
| `charts.docs.md` | Docs | Consumer documentation. |
| `Charts.preview.svelte` | Preview | Interactive playground covering all V1 charts, palettes, dark mode, dual-axis, reference bands, and Tier-1 custom layers. |
| `charts.test.ts` / `charts.svelte.test.ts` | Tests | Vitest unit tests (scales, geometry, diverging stacks, text measurement, bisector) and Svelte component/interaction tests. |

---

## 2. Public API

### 2.1 Exports (`src/modules/charts/index.ts`)

**Tier-1 Primitives (flat `PascalCase`):**
- `Chart`, `ChartHeader`, `ChartTitle`, `ChartDescription`, `ChartActions`, `ChartLegend`
- `ChartCanvas`, `ChartGrid`, `ChartAxis`, `ChartLine`, `ChartArea`, `ChartBar`, `ChartArc`
- `ChartReferenceLine`, `ChartReferenceBand`, `ChartCrosshair`, `ChartAnnotation`, `ChartOverlay`
- `ChartTooltip`, `ChartEmpty`, `ChartLoading`

**Tier-2 Batteries-Included Charts:**
- `LineChart`, `AreaChart`, `BarChart`, `ComposedChart`, `DonutChart`

**Context & State:**
- `ChartState`, `getChartContext`, `setChartContext`, `hasChartContext`, `type ChartContext`

**Constants & Union Types:**
- `CHART_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const` → `ChartVariant` *(1:1 parity with `Card` and `KpiCard`)*
- `CHART_SIZES = ["sm", "md", "lg"] as const` → `ChartSize`
- `CHART_PALETTES = ["categorical", "semantic"] as const` → `ChartPalette`
- `CHART_MONOTONE_HUES = ["accent", "blue", "slate", "emerald", "teal", "violet", "amber", "rose"] as const` → `ChartMonotoneHue`
- `CHART_TONES = ["base", "accent", "positive", "caution", "negative"] as const` → `ChartTone`
- `CHART_CURVES = ["linear", "monotone", "step"] as const` → `ChartCurve`
- `CHART_ORIENTATIONS = ["vertical", "horizontal"] as const` → `ChartOrientation`
- `CHART_BAR_MODES = ["grouped", "stacked"] as const` → `ChartBarMode`
- `CHART_AREA_MODES = ["overlay", "stacked"] as const` → `ChartAreaMode`
- `CHART_AXIS_POSITIONS = ["bottom", "left", "right"] as const` → `ChartAxisPosition`
- `CHART_LEGEND_POSITIONS = ["top", "bottom", "none"] as const` → `ChartLegendPosition`
- `CHART_X_SCALE_TYPES = ["auto", "band", "point", "time", "linear"] as const` → `ChartXScaleType`
- `CHART_TICK_ANGLES = ["auto", 0, -35, -45] as const` → `ChartTickAngle`
- `CHART_TITLE_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "div"] as const` → `ChartTitleElement`

### 2.2 Core Data, Series & Configuration Contracts

```ts
export type ChartDatum = Record<string, unknown>;
export type ChartXValue = string | number | Date;

export interface ChartSeries<TDatum = ChartDatum> {
    /** Unique series identifier (also default key on datum if `accessor` omitted). */
    id: string;
    /** Human-readable legend & tooltip label. */
    label: string;
    /** Value extractor. Falls back to `Number(datum[id])` (preserving `null`/`undefined` as gaps). */
    accessor?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    /** Target Y-axis (`"left"` primary or `"right"` secondary). @default "left" */
    yAxis?: "left" | "right";
    /** Mark type when used inside `ComposedChart`. @default "line" */
    type?: "line" | "area" | "bar";
    /** Semantic status tone override (`base | accent | positive | caution | negative`). */
    tone?: ChartTone;
    /** Explicit CSS color override (e.g. `"var(--cs-color-teal-500)"` or hex/oklch). */
    color?: string;
    /** Optional dashed stroke style (Line / Area top stroke / Reference). */
    dashed?: boolean;
    /** Optional per-series value formatter (overrides axis/chart formatter in tooltips & value labels). */
    format?: (value: number, datum: TDatum) => string;
    /** Initial visibility. @default true */
    visible?: boolean;
}

export interface ChartAxisConfig {
    label?: string;
    show?: boolean;
    domain?: readonly [number | "auto" | "dataMin", number | "auto" | "dataMax"];
    tickCount?: number;
    format?: (value: ChartXValue) => string;
    tickAngle?: ChartTickAngle;
    wrapTicks?: boolean;
    maxTickWidth?: number;
    includeZero?: boolean;
}

export interface ChartReferenceLineConfig {
    id?: string;
    axis: "x" | "y" | "y2";
    value: ChartXValue;
    label?: string;
    labelPosition?: "start" | "center" | "end";
    tone?: ChartTone;
    color?: string;
    dashed?: boolean;
}

export interface ChartReferenceBandConfig {
    id?: string;
    axis: "x" | "y" | "y2";
    from: ChartXValue;
    to: ChartXValue;
    label?: string;
    tone?: ChartTone;
    color?: string;
}

export interface ChartTooltipContext<TDatum = ChartDatum> {
    index: number;
    datum: TDatum;
    xValue: ChartXValue;
    xLabel: string;
    items: readonly {
        series: ChartSeries<TDatum>;
        value: number | null;
        formatted: string;
        color: string;
    }[];
    total?: number;
}
```

### 2.3 Tier-1 Primitive Component Props

> **Mandatory API Rules:** `variant` and `size` on `Chart` and all Tier-2 chart components are **required** with NO default values. Every DOM/SVG-rendering component exposes `ref = $bindable(null)` and forwards `{...rest}`.

#### `Chart<TDatum>` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `variant: ChartVariant` — **Required** (`"elevated" | "soft" | "sunken" | "transparent"`).
- `size: ChartSize` — **Required** (`"sm" | "md" | "lg"`).
- `palette?: ChartPalette` — `@default "categorical"` (`"categorical" | "semantic"`).
- `monotone?: ChartMonotoneHue` — Optional single-hue interleaved tonal ramp (`"accent" | "blue" | "slate" | "emerald" | "teal" | "violet" | "amber" | "rose"`). When provided, overrides `palette` slots via `data-monotone`.
- `data: readonly TDatum[]` — Source dataset (use `$state.raw` for large reactive arrays).
- `x?: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue)` — X-value extractor (Cartesian charts).
- `xScaleType?: ChartXScaleType` — `@default "auto"` (infers `time` for `Date`, `band`/`point` for `string`, `linear` for `number`).
- `series?: readonly ChartSeries<TDatum>[]` — Registered series definitions.
- `hiddenSeriesIds = $bindable<readonly string[]>([])` — Controllable hidden series state.
- `activeIndex = $bindable<number | null>(null)` — Controllable active/hovered datum index.
- `hoveredSeriesId = $bindable<string | null>(null)` — Controllable legend/mark highlight isolation.
- `loading?: boolean` — `@default false`.
- `label?: string` / `labelledBy?: string` — Accessible figure label.
- `children?: Snippet`

#### `ChartCanvas` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)` — Plot stage wrapper.
- `svgRef = $bindable<SVGSVGElement | null>(null)` — Inner `<svg>` element (clean hook for future V2 export!).
- `height?: number | string` — Explicit plot height override (otherwise driven by `size` token `--cs-chart-plot-height` or parent flex height).
- `aspectRatio?: string` — Optional CSS `aspect-ratio` (e.g. `"16 / 9"`).
- `interactive?: boolean` — Enables pointer bisector & keyboard scrubbing (`@default true`).
- `orientation?: ChartOrientation` — `@default "vertical"` (flips category/value axes for horizontal bar charts).
- `margin?: Partial<{ top: number; right: number; bottom: number; left: number }>` — Optional explicit overrides on top of dynamic margin measurement.
- `children?: Snippet` — SVG layers (`ChartGrid`, `ChartAxis`, marks, reference lines/bands, custom SVG layers).
- `overlay?: Snippet` — Optional HTML overlay slot (or compose `<ChartOverlay>` / `<ChartTooltip>`).

#### `ChartLegend` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `interactive?: boolean` — `@default true` (click toggles visibility; hover/focus isolates series).
- `align?: "start" | "center" | "end"` — `@default "start"`.
- `children?: Snippet`

#### `ChartTooltip<TDatum>` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `showTotal?: boolean` — `@default false` (automatically enabled on stacked charts when appropriate).
- `morph?: boolean` — `@default true` (direct `<NumberMorph willChange={false} respectMotionPreference={true} />` integration for numeric readouts; falls back to string rendering only when a custom string `format` callback is provided or `morph={false}`).
- `formatX?: (value: ChartXValue) => string`
- `children?: Snippet<[ChartTooltipContext<TDatum>]>` — Full custom tooltip body override.

#### Key SVG Layer Primitives (all expose `ref = $bindable<SVGGElement | null>(null)` + `{...rest}`)
- **`ChartGrid`:** `horizontal?: boolean` (`true`), `vertical?: boolean` (`false`), `zeroLine?: boolean` (`true`).
- **`ChartAxis`:** `position: ChartAxisPosition` (**Required**), `label?`, `tickCount?`, `format?`, `tickAngle?`, `wrapTicks?`, `maxTickWidth?`, `hideLine?` (`true` by default on Y-axis for calm borderless aesthetic).
- **`ChartLine`:** `seriesId?: string` (renders one series or all `"line"` series if omitted), `curve?: ChartCurve` (`"monotone"`), `strokeWidth?: number`, `showDots?: boolean | "active"` (`"active"`), `connectNulls?: boolean` (`false`), `valueLabels?: boolean`.
- **`ChartArea`:** `seriesId?: string`, `mode?: ChartAreaMode` (`"overlay"`), `curve?: ChartCurve` (`"monotone"`), `gradient?: boolean` (`true`), `showLine?: boolean` (`true`), `connectNulls?: boolean` (`false`).
- **`ChartBar`:** `seriesId?: string`, `mode?: ChartBarMode` (`"grouped"`), `radius?: number`, `maxBarWidth?: number`, `barGap?: number`, `groupGap?: number`, `valueLabels?: boolean`.
- **`ChartArc`:** `valueAccessor`, `labelAccessor`, `innerRadiusRatio?: number` (`0.68`; `0` = full Pie with `1.5px` `--cs-chart-point-ring-bg` slice seams), `padAngle?: number` (yielding `~2px` visual gap), `cornerRadius?: number` (`3px`), `valueLabels?: boolean`, `center?: Snippet<[{ total: number; activeSlice: ChartSlice | null }]>`.
- **`ChartReferenceLine`:** `axis: "x" | "y" | "y2"`, `value: ChartXValue`, `label?`, `labelPosition?`, `tone?`, `color?`, `dashed?` (`true`).
- **`ChartReferenceBand`:** `axis: "x" | "y" | "y2"`, `from: ChartXValue`, `to: ChartXValue`, `label?`, `tone?`, `color?`.
- **`ChartCrosshair`:** `vertical?: boolean` (`true`), `horizontal?: boolean` (`false`), `showDots?: boolean` (`true`).
- **`ChartAnnotation`:** `x: ChartXValue`, `y: number`, `yAxis?: "left" | "right"`, `label: string`, `dx?: number`, `dy?: number`, `tone?: ChartTone`, `color?: string`.

### 2.4 Tier-2 Batteries-Included Chart Props

All Tier-2 components share a consistent base contract:
- **Required:** `variant: ChartVariant`, `size: ChartSize`, `data: readonly TDatum[]`.
- **Optional Common Props:** `ref = $bindable(null)`, `svgRef = $bindable(null)`, `palette?: ChartPalette`, `monotone?: ChartMonotoneHue`, `title?: string`, `description?: string`, `actions?: Snippet`, `legend?: ChartLegendPosition` (`"top"`), `height?: number | string`, `loading?: boolean`, `emptyTitle?: string`, `tooltip?: boolean | Snippet<[ChartTooltipContext<TDatum>]>`, `hiddenSeriesIds = $bindable([])`, `activeIndex = $bindable(null)`, `onPointClick?: (datum: TDatum, index: number) => void`, `children?: Snippet` (extra SVG layers rendered above marks).
- **Cartesian Charts (`LineChart`, `AreaChart`, `BarChart`, `ComposedChart`) additionally accept:**
  - `x: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue)` (**Required**)
  - `series: readonly ChartSeries<TDatum>[]` (**Required**)
  - `xAxis?: ChartAxisConfig`, `yAxis?: ChartAxisConfig`, `y2Axis?: ChartAxisConfig`
  - `grid?: boolean | { horizontal?: boolean; vertical?: boolean }` (`true`)
  - `referenceLines?: readonly ChartReferenceLineConfig[]`
  - `referenceBands?: readonly ChartReferenceBandConfig[]`
  - `valueLabels?: boolean` (`false`)
- **Chart-Specific Props:**
  - `LineChart`: `curve?: ChartCurve` (`"monotone"`), `showDots?: boolean | "active"` (`"active"`), `connectNulls?: boolean` (`false`).
  - `AreaChart`: `mode?: ChartAreaMode` (`"overlay"`), `curve?: ChartCurve` (`"monotone"`), `gradient?: boolean` (`true`), `showLine?: boolean` (`true`).
  - `BarChart`: `orientation?: ChartOrientation` (`"vertical"`), `mode?: ChartBarMode` (`"grouped"`).
  - `ComposedChart`: `curve?: ChartCurve` (`"monotone"`), `barMode?: ChartBarMode` (`"grouped"`), `areaMode?: ChartAreaMode` (`"overlay"`).
  - `DonutChart`: `value: keyof TDatum | ((d: TDatum) => number)`, `name: keyof TDatum | ((d: TDatum) => string)`, `innerRadiusRatio?: number` (`0.68`; `0` = full Pie with `1.5px` `--cs-chart-point-ring-bg` slice seams — no separate `PieChart`), `centerLabel?: string`, `centerValue?: string | number`, `center?: Snippet<[{ total: number; activeSlice: ChartSlice<TDatum> | null }]>`, `valueLabels?: boolean` (`false`).

### 2.5 Built-in Palettes, Monotone Mode & CSS Custom Properties (`--cs-chart-*`)

All palettes derive exclusively from `src/css/foundation/color-primitives.css` and `color-semantics.css` using `light-dark(...)` and `color-mix(in oklch, ...)` so light and dark modes maintain WCAG 1.4.11 (`>= 3:1`) contrast without JS theme listeners (matching `charts.design.md` §3 verbatim):

| Mode | Token Strategy | Intended Use |
| :--- | :--- | :--- |
| **`palette="categorical"`** *(default, 10 slots)* | `--cs-chart-series-1..10`: **1.** Accent (`--cs-color-accent-*`, blue by default), **2.** Teal, **3.** Amber, **4.** Violet, **5.** Rose, **6.** Sky, **7.** Emerald, **8.** Orange, **9.** Fuchsia, **10.** Slate. Calibrated `500`–`550` in light mode and `400`–`450` in dark mode. | Multi-series comparisons (regions, products, categories) with calm 1–3 series executive cohesion and deuteranopia/protanopia separation. |
| **`monotone="<hue>"`** *(`accent`, `blue`, `slate`, `emerald`, `teal`, `violet`, `amber`, `rose`)* | Interleaved single-hue lightness steps across `--cs-chart-series-1..6` for crisp contrast at every series count: **Light:** `550 → 300 → 700 → 400 → 200 → 800`; **Dark:** `400 → 600 → 300 → 500 → 700 → 200`. For `monotone="slate"`, shifts one step for neutral gray contrast (**Light:** `700 → 400 → 900 → 500 → 300 → 600`; **Dark:** `200 → 500 → 100 → 400 → 600 → 300`). | Executive monochrome decks, cohort breakdowns, and stacked comparisons where multi-hue palettes feel noisy. |
| **`palette="semantic"`** & status tokens | `--cs-chart-positive`, `--cs-chart-caution`, `--cs-chart-negative` (plus `-soft` / `-fg` pairs) mapped directly from `color-semantics.css` (strictly no `info`). | Status distributions (On Track / At Risk / Delayed), variance bars, threshold bands, and SLA zones. |

#### `--cs-chart-*` CSS Custom Properties

| Token | Role & Default |
| :--- | :--- |
| `--cs-chart-bg` | Shell fill (`--cs-color-elevated` / `--cs-color-base-soft` / `--cs-color-sunken` / `transparent`). |
| `--cs-chart-fg` | Primary text (`--cs-color-text-main`). |
| `--cs-chart-shadow` | Outer shell shadow (`--cs-shadow-elevated` on `elevated`, `--cs-shadow-sunken` on `sunken`, `none` on `soft`/`transparent`). |
| `--cs-chart-point-ring-bg` | Opaque surface-matched cutout backing for active point halos, pie seams, and stacked bar gaps (`elevated` → `--cs-color-elevated`, `soft` → `--cs-color-base-soft`, `sunken` → `--cs-color-sunken`, `transparent` → `var(--cs-chart-backdrop-bg, var(--cs-color-canvas))`). |
| `--cs-chart-radius` / `--cs-chart-squircle` | Outer squircle radius matching `Card`/`KpiCard` (`sm: 16px`, `md: 24px`, `lg: 28px`, `--cs-squircle`; concentric `--cs-chart-nested-radius` + `--cs-squircle-smooth` when `[data-nested]`). |
| `--cs-chart-padding` | Inner shell padding matching `Card`/`KpiCard` (`sm: 12px`, `md: 16px`, `lg: 24px`; `0px` on `transparent`). |
| `--cs-chart-gap` | Section spacing (`sm: 8px`, `md: 12px`, `lg: 16px`). |
| `--cs-chart-plot-height` | Default plot block-size by `size` (`sm: 180px`, `md: 260px`, `lg: 340px`). |
| `--cs-chart-grid` | Whisper horizontal gridline stroke (`light-dark(6% base-900, 7% base-100)`). |
| `--cs-chart-axis` | Firmer baseline / zero-line stroke (`light-dark(14% base-900, 15% base-100)`). |
| `--cs-chart-tick-fg` | Tick label fill (`--cs-color-text-weak`). |
| `--cs-chart-tick-size` | SVG tick font size (`11px` at `sm`/`md`, `12px` at `lg`). |
| `--cs-chart-crosshair` | Active scrubbing hairline stroke (`light-dark(18% base-900, 22% base-100)`). |
| `--cs-chart-hover-band` | Active category hover band fill (`light-dark(3.5% base-900, 5.5% base-100)`). |
| `--cs-chart-series-1` .. `--cs-chart-series-10` | Resolved palette color slots (10 categorical slots, slot 1 anchored on `--cs-color-accent-*`; overridable per instance on `.cs-chart`). |
| `--cs-chart-positive` / `--cs-chart-caution` / `--cs-chart-negative` | Semantic status mark colors (plus `-soft` and `-fg` pairs for pills/bands). |
| `--cs-chart-dim-opacity` | Opacity of non-focused series during legend/mark isolation (`0.24`). |
| `--cs-chart-bar-radius` | Outer corner radius on bars/columns (`sm: 3px`, `md: 4px`, `lg: 5px`). |
| `--cs-chart-bar-max-width` | Maximum bar thickness cap (`sm: 40px`, `md: 52px`, `lg: 64px`). |
| `--cs-chart-stroke-width` | Default line/area stroke width (`sm: 1.75px`, `md: 2px`, `lg: 2.25px`). |
| `--cs-chart-point-radius` | Active point dot radius (`sm: 3.5px`, `md: 4px`, `lg: 4.5px`). |
| `--cs-chart-tooltip-bg` / `--cs-chart-tooltip-shadow` | Floating tooltip surface (`--cs-color-elevated` / `--cs-shadow-floating`). |
| `--cs-chart-tooltip-radius` / `--cs-chart-tooltip-padding` | Tooltip geometry (`12px` / `8px 10px` at `sm`/`md`; `14px` / `10px 12px` at `lg`). |

---

## 3. DOM, Semantics & Accessibility

### 3.1 DOM & SVG Structure

```text
figure.cs-chart (data-variant, data-size, data-palette, data-monotone, data-nested, data-scrubbing, data-loading, data-empty)
├── [optional] div.cs-chart-header
│   ├── div.cs-chart-header-copy (ChartTitle + ChartDescription)
│   └── div.cs-chart-actions
├── [optional, top] div.cs-chart-legend (role="list")
│   └── button.cs-chart-legend-item (type="button", aria-pressed, data-hidden, data-active)
├── div.cs-chart-canvas (ResizeObserver target; tabindex="0" when interactive; role="application" or focusable plot region)
│   ├── svg.cs-chart-svg (role="img", aria-labelledby / aria-label, width, height — exact integer px)
│   │   ├── defs (area linearGradients, clipPath for plot box)
│   │   ├── g.cs-chart-layer-bands (ChartReferenceBand)
│   │   ├── g.cs-chart-layer-grid (ChartGrid)
│   │   ├── g.cs-chart-layer-marks (clip-path="url(#...)" -> ChartArea, ChartBar, ChartLine, ChartArc)
│   │   ├── g.cs-chart-layer-references (ChartReferenceLine)
│   │   ├── g.cs-chart-layer-axes (ChartAxis bottom / left / right)
│   │   ├── g.cs-chart-layer-crosshair (ChartCrosshair)
│   │   └── g.cs-chart-layer-annotations (ChartAnnotation + custom children)
│   ├── [optional] div.cs-chart-overlay (HTML overlay aligned to plot box, pointer-events: none; children opt-in)
│   ├── [when loading] div.cs-chart-loading (aria-busy="true")
│   └── [when empty] div.cs-chart-empty
├── [optional, bottom] div.cs-chart-legend
├── div.cs-chart-sr-live (visually hidden aria-live="polite" announcing keyboard-scrubbed datum)
└── [single instance] div.cs-chart-tooltip (popover="manual", role="status" / presentation, GPU translate3d)
```

### 3.2 `data-*` Selectors

- Root `.cs-chart`: `data-variant`, `data-size`, `data-palette`, `data-monotone`, `data-nested`, `data-scrubbing`, `data-loading`, `data-empty`.
- Series marks (`.cs-chart-series`): `data-series-id={id}`, `data-dimmed={isDimmed ? "" : undefined}`, `data-active={isFocused ? "" : undefined}`.
- Legend items (`.cs-chart-legend-item`): `data-hidden={isHidden ? "" : undefined}`, `data-active={isHovered ? "" : undefined}`.
- Tooltip (`.cs-chart-tooltip`): `data-open={isOpen ? "" : undefined}`, `data-side="start" | "end"`.

### 3.3 Keyboard Navigation & Focus

- **Plot Scrubbing:** When `interactive` is `true`, `.cs-chart-canvas` is keyboard-focusable (`tabindex="0"`, relying on global `:focus-visible` with clean inset outline).
  - `ArrowRight` / `ArrowLeft` (or `ArrowDown` / `ArrowUp` on horizontal bars / donut): steps `activeIndex` through data points, moving both `<ChartCrosshair>` and `<ChartTooltip>` and announcing the concise summary via `.cs-chart-sr-live` (`aria-live="polite"`).
  - `Home` / `End`: jumps to first / last datum.
  - `Escape`: clears `activeIndex` and dismisses tooltip.
  - `Enter` / `Space`: fires `onPointClick` if provided.
- **Legend Controls:** Each legend item is a native `<button type="button" aria-pressed={!isHidden}>`. `Enter`/`Space` toggles visibility; `:focus-visible` highlights that series and softly dims siblings (matching hover isolation).
- **Localization:** All default labels (`aria-label`, `"No data available"`, `"All series hidden"`, `"Show all"`, `"Total"`) use `t({ de, en })` from `../../shared/lang.internal.ts`.

---

## 4. Visual & Motion Contract

- **Surface & Elevation (Borderless by Default — 1:1 Parity with `Card` & `KpiCard`):**
  - `variant="elevated"`: `--cs-color-elevated` fill + `--cs-shadow-elevated` + `--cs-squircle` (`2.0`) for primary standalone chart cards on `--cs-color-canvas`.
  - `variant="soft"`: `--cs-color-base-soft` fill, zero outer shadow, `--cs-squircle` (`2.0`).
  - `variant="sunken"`: `--cs-color-sunken` fill + `--cs-shadow-sunken` + `--cs-squircle` (`2.0`) for recessed chart wells nested inside an `elevated` `Card` or drawer without double-shadowing.
  - `variant="transparent"`: zero fill, zero padding, zero shadow—designed for frameless embedding inside `Card` or `KpiCard` (`KpiCardVisual`).
  - Concentric radius automatically resolved via `createSurfaceRadius` when nested (`[data-nested]`, stepping `corner-shape` down to `--cs-squircle-smooth`).
  - Opaque cutout backing `--cs-chart-point-ring-bg` resolves automatically per variant so active point halos, stacked bar gaps, and pie seams stay crisp (`--cs-chart-backdrop-bg` override supported on `transparent`).
- **Proportional `size` Scale (`sm | md | lg`):**
  - Calibrated 1:1 with `Card`, `KpiCard`, and `charts.design.md` §2:
    - `sm`: Compact dashboard widget / `KpiCard` companion (`180px` plot height, `11px` ticks, `12px` padding, `16px` standalone radius).
    - `md`: Standard analytical chart (`260px` plot height, `11px` ticks, `16px` padding, `24px` standalone radius).
    - `lg`: Executive report / full-width view (`340px` plot height, `12px` ticks, `24px` padding, `28px` standalone radius).
- **Calm Visual Hierarchy:**
  - Horizontal gridlines only by default; vertical axis line hidden by default (only ticks + firmer zero baseline) so data marks own the visual weight.
  - Bars use subtle top-only (vertical) or end-only (horizontal) corner rounding (`--cs-chart-bar-radius`), clamped to `min(radius, thickness / 2, length)`, automatically flipping to bottom/start corners on negative bars and applying only to the outermost segment of a stack (`1.5px` gap between stacked segments).
  - Areas use a quiet vertical gradient (`--cs-chart-area-top-opacity`: `22%` light / `28%` dark → `0%`) paired with a crisp `--cs-chart-stroke-width` top stroke.
- **Motion Roles (Aligned with `charts.design.md` §7):**
  - **Mount Entrance (One-Shot, Zero Overshoot):** Scoped local tokens `--cs-chart-dur-draw` (`520ms`, `--cs-chart-ease-draw` / `expo-out`) for left-to-right clip reveal on lines/areas; `--cs-chart-dur-bar` (`420ms`, `--cs-chart-ease-data` / `quart-out`) for zero-baseline bar growth with capped stagger; `--cs-chart-dur-arc` (`540ms`, `--cs-chart-ease-draw`) for donut radial sweep.
  - **Series Isolation (Legend/Mark Hover):** Opacity transition to `--cs-chart-dim-opacity` (`0.24`) over `--cs-dur-effect` (`160ms`) `--cs-ease-effect`.
  - **Tooltip Enter / Scrub Glide / Exit:** Instant coordinate snap on first open (no flying from origin) with opacity/scale enter (`--cs-dur-enter-sm` `--cs-ease-enter`); smooth `transform` glide over `--cs-chart-dur-scrub` (`--cs-dur-80`) `--cs-ease-cubic-out` while scrubbing; exit over `--cs-dur-exit-sm` `--cs-ease-exit`.
  - **Series Toggle / Data Update:** Smooth bar/arc/path updates over `--cs-chart-dur-update` (`--cs-dur-380`) `--cs-chart-ease-data` (zero overshoot).
  - **Reduced Motion & Theme-Switching Safety:** CSS relies exclusively on global `prefers-reduced-motion: reduce` and `[data-theme-switching]` in `motion.css` (never duplicated locally). JS-driven SVG interpolation guards against `matchMedia("(prefers-reduced-motion: reduce)")` and `<NumberMorph>` always receives `respectMotionPreference={true}`.

---

## 5. Edge Cases & Constraints

- **Data Edge Cases:**
  - **Empty array (`data.length === 0`) or all series toggled hidden:** Renders `<ChartEmpty>` cleanly inside the plot frame; when all series are hidden by user interaction, displays a localized one-click `Show all` button (`<Button variant="ghost" size="xs">`).
  - **Null / `NaN` / `undefined` gaps:** Line and Area marks break paths cleanly via `defined()` (`connectNulls={false}` default) rather than dropping to zero; tooltip displays `—` for missing series at that X-index.
  - **Negative & Diverging Values:** Bar stacks use `stackOffsetDiverging` so positive values stack upward from `0` and negative values stack downward from `0`; zero baseline is emphasized automatically whenever domain crosses `0`.
  - **Single Data Point & All-Zero Data:** Guard linear scale domains (`[0, 1]` fallback when `min === max === 0`, or symmetric padding when `min === max !== 0`) and render a visible point/bar without `NaN` SVG attributes.
- **Layout, Sizing & Hit Areas:**
  - **Zero-size initial render (e.g. hidden tab / SSR):** `ChartCanvas` guards `<svg>` mark rendering until `width > 0 && height > 0` (using initial container measurement on mount with zero flash of broken coordinates).
  - **Responsive Throttling:** `ResizeObserver` updates coalesce via `requestAnimationFrame` to avoid layout jitter during sidebar or window dragging.
  - **Legend Hit Areas:** Legend toggle buttons maintain comfortable tap/click height (`>= 24px` with horizontal padding, or `<HitArea />` if below `1936px²`), using `cursor: default` per design rules.
- **Browser Support:**
  - Modern Chromium-first (`popover="manual"`, `light-dark()`, `oklch`/`color-mix`, `corner-shape` squircles, CSS Nesting, `@layer`). Graceful degradation in Firefox/Safari (native `popover="manual"` is Baseline; squircles degrade to standard `border-radius`).
- **Explicit Non-Goals (V1):**
  - No separate `PieChart` component (`DonutChart` with `innerRadiusRatio={0}` covers full Pie), no built-in zoom/pan/brush, no WebGL/Canvas scatter mode, no server-side image rendering, no export utility (reserved for V2 on top of the clean `<svg>` contract), no `foreignObject` inside plot SVG, and no D3 DOM/transition modules.

---

## 6. V2 Executive & Controlling Expansion (M8–M12)

> **Architectural Invariants (Inherited from V1):** 100% native SVG inside `<svg>` (zero `<foreignObject>`, zero SVG `<filter>`), pure-math D3 micro-packages only (`d3-scale`, `d3-shape`, `d3-array`, `d3-time`), required `variant` and `size` (no defaults) on all shelled Tier-2 charts, `ref = $bindable(null)` + `{...rest}` on every DOM/SVG component, and direct `NumberMorph` integration (`willChange={false}`, `respectMotionPreference={true}`) in floating `popover="manual"` tooltips.

### 6.1 Overview & Scope

V2 extends `src/modules/charts/` (`cs/svelte/charts`) for executive management reporting, financial controlling (IBCS), and operational analytics without fragmenting the module or duplicating kernel logic:

| Milestone | Addition | Kind | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **M8** | Controlling upgrades on existing charts | Kernel + Tier-1/2 enhancement | Conditional per-datum coloring, IBCS scenario fills (`solid` / `hatch` / `outline`), 100% normalized stacks (`mode="percent"`), persistent `selectedIndex` cross-filtering, and direct end-of-line series labels. |
| **M9** | `<Sparkline>` | Frameless micro-chart primitive | Zero-chrome inline trends (`line` / `area` / `bar`) for `KpiCardVisual` (`52px`) and `DataTable` cells (`24–32px`). |
| **M10** | `<WaterfallChart>` & `<ChartWaterfall>` | Tier-1 primitive + Tier-2 chart | Financial P&L / variance bridges with running cumulative geometry (`start` / `delta` / `subtotal` / `total`) and step connectors. |
| **M11** | `<BulletChart>` & `<ChartBullet>` | Tier-1 primitive + Tier-2 chart | Compact IBCS Plan/Actual/Target scorecards with qualitative range bands and optional prior-period comparative markers. |
| **M12** | `<HeatmapChart>` & `<ChartHeatmap>` | Tier-1 primitive + Tier-2 chart | Operations, SLA, and cohort retention matrices with dual band scales, OKLCH sequential/diverging ramps, and 2D keyboard navigation. |

#### V2 File Layout Additions (`src/modules/charts/`)

| File | Visibility | Responsibility |
| :--- | :--- | :--- |
| `Sparkline.svelte` | Public | Featherweight zero-chrome inline micro-chart (`line | area | bar`). |
| `ChartWaterfall.svelte` | Public | Tier-1 SVG waterfall bars, dashed step connectors, and signed delta labels. |
| `WaterfallChart.svelte` | Public | Tier-2 batteries-included Waterfall / Bridge chart. |
| `ChartBullet.svelte` | Public | Tier-1 SVG qualitative bands, actual bar, target tick, comparative marker, and inline SVG labels/readouts. |
| `BulletChart.svelte` | Public | Tier-2 batteries-included single- or multi-row IBCS Bullet scorecard. |
| `ChartHeatmap.svelte` | Public | Tier-1 SVG 2D band-scale matrix cells, contrast-safe centered values, and hover/selection outlines. |
| `HeatmapChart.svelte` | Public | Tier-2 batteries-included Heatmap matrix with continuous/stepped ramp legend and 2D keyboard navigation. |

---

### 6.2 Public API Additions

#### 6.2.1 M8 — Controlling Upgrades on Existing Charts

**New & Extended Constants / Types:**
- `CHART_BAR_PATTERNS = ["solid", "hatch", "outline"] as const` → `ChartBarPattern`
- `CHART_BAR_MODES = ["grouped", "stacked", "percent"] as const` → `ChartBarMode`
- `CHART_AREA_MODES = ["overlay", "stacked", "percent"] as const` → `ChartAreaMode`

**Extended `ChartSeries<TDatum>` Contract:**
```ts
export interface ChartSeries<TDatum = ChartDatum> {
    // ...existing V1 fields...
    /** Static or per-datum semantic tone override. */
    tone?: ChartTone | ((datum: TDatum, index: number) => ChartTone | undefined);
    /** Static or per-datum explicit CSS color override. */
    color?: string | ((datum: TDatum, index: number) => string | undefined);
    /** IBCS scenario fill pattern (`solid` = Actual, `hatch` = Forecast, `outline` = Plan). @default "solid" */
    pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined);
}
```
- **Color resolution order (per datum):** `color(datum, index)` → static `series.color` → `tone(datum, index)` → static `series.tone` → palette slot `--cs-chart-series-N`. Series-level color (legend swatch, continuous line stroke) resolves from static `series.color` → static `series.tone` → palette slot.
- **IBCS Scenario Patterns:** Export-safe SVG `<defs><pattern>` generated with `$props.id()` (deduplicated per unique `(resolvedColor, pattern)` pair within the `<svg>`):
  - `"solid"`: standard filled mark.
  - `"hatch"`: `45°` diagonal stripe pattern (`patternUnits="userSpaceOnUse"`, `6×6` tile, `1.5px` stroke in resolved color) framed by a `1px` crisp perimeter stroke.
  - `"outline"`: `--cs-chart-point-ring-bg` fill framed by an inset `1.5px` stroke in resolved color.
  - `ChartLegend` mirrors static `hatch` / `outline` patterns on its swatch indicator.
- **100% Normalized Stacking (`mode="percent"`):**
  - Available on `ChartBar`, `BarChart`, `ChartArea`, and `AreaChart` (`ChartState` accepts `percent?: boolean`, implying `stacked`).
  - Uses `d3-shape`'s `stackOffsetExpand` (`[0, 1]` domain; rows where all visible values sum to `0` clamp safely to `[0, 0]` without `NaN`).
  - Automatically formats value axis ticks as percentages (`0%`–`100%`) unless overridden by `yAxis.format`.
  - Extends `ChartTooltipItem<TDatum>` with `share?: number` and `formattedShare?: string`; in `percent` mode `ChartTooltip` renders **both** the raw value (`NumberMorph`) and its `% share` in aligned `tabular-nums`.
- **Persistent Selection (`selectedIndex`):**
  - Added to `ChartState`, `Chart`, `LineChart`, `AreaChart`, `BarChart`, `ComposedChart`, `DonutChart`, `WaterfallChart`, and `BulletChart`:
    - `selectedIndex = $bindable<number | null>(null)` — Persistent selected datum index (distinct from hover `activeIndex`) for dashboard cross-filtering.
    - `selectable?: boolean` — `@default false`. When `true`, clicking a mark or pressing `Enter`/`Space` toggles `selectedIndex` (clicking the active selection clears it to `null`). Even when `selectable={false}`, binding `selectedIndex` externally highlights matching marks with `data-selected=""`.
- **Direct End-of-Line Series Labels (`directLabels`):**
  - Added to `ChartLine`, `LineChart`, and `AreaChart`: `directLabels?: boolean` (`@default false`).
  - Places each visible series' `label` as pure SVG `<text>` (`text-anchor="start"`) right of its last valid datum (`+8px` offset), colored with the series color.
  - `resolveDirectLabelPositions()` in `chart-measure.internal.ts` applies greedy vertical collision nudging (`minGap = 14px` at `sm`/`md`, `16px` at `lg`, clamped to `[0, plotHeight]`).
  - `ChartState` automatically reserves `margin.right` based on measured label widths (capped at `120px` with ellipsis truncation) so labels never clip.

#### 6.2.2 M9 — `<Sparkline>` Micro-Chart

**Constants & Types:**
- `SPARKLINE_TYPES = ["line", "area", "bar"] as const` → `SparklineType`

**Props (`SparklineProps<TDatum>`):**
- `ref = $bindable<HTMLDivElement | null>(null)`
- `svgRef = $bindable<SVGSVGElement | null>(null)`
- `type?: SparklineType` — `@default "line"` (`"line" | "area" | "bar"`).
- `data: readonly TDatum[]` — Supports `readonly (number | null | undefined)[]` directly or object arrays with `value`.
- `value?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined)` — Required for object data; optional for primitive numeric arrays.
- `tone?: ChartTone` — `@default "accent"`.
- `color?: string` — Explicit CSS color override.
- `curve?: ChartCurve` — `@default "monotone"` (`line` / `area`).
- `strokeWidth?: number` — `@default 1.75`.
- `target?: number` — Optional horizontal dashed `1px` reference hairline (`snapHalf(y)`).
- `showEndDot?: boolean` — `@default false` (crisp final-datum dot with `--cs-chart-point-ring-bg` halo).
- `interactive?: boolean` — `@default false` (enables lightweight pointer scrub and active highlight).
- `activeIndex = $bindable<number | null>(null)` — Controllable scrubbed index when `interactive={true}`.
- `domain?: ChartAxisDomain` — Optional explicit Y bounds (defaults to tight data bounds for `line`/`area`, zero-inclusive for `bar`).
- `height?: number | string` — `@default 32` (`24–32px` for `DataTable` cells, `52px` for `KpiCardVisual`).
- `width?: number | string` — `@default "100%"` (responsive via `ResizeObserver` or fixed `px`).
- `label?: string` — Accessible `aria-label` (omitting sets `aria-hidden="true"` when purely decorative).
- `{...rest}` forwarded to `<div class="cs-sparkline">`.

> **Design Note:** `Sparkline` intentionally omits `variant` and `size` because it is a frameless micro-visualization primitive (zero shell, zero padding, zero axes) whose dimensions are dictated directly by `height` / `width` and its host container (`KpiCardVisual`, `DataTable` cell).

#### 6.2.3 M10 — `<WaterfallChart>` & `<ChartWaterfall>`

**Constants & Types:**
- `CHART_WATERFALL_ROW_TYPES = ["start", "delta", "subtotal", "total"] as const` → `ChartWaterfallRowType`
- `ChartWaterfallBar<TDatum>`: `{ index, xValue, xLabel, rowType, value, y0, y1, runningTotal, isPositive, color, pattern, datum }`
- `ChartWaterfallTooltipContext<TDatum>`: `{ index, bar: ChartWaterfallBar<TDatum>, formattedValue: string, formattedRunningTotal: string }`

**`ChartWaterfallProps<TDatum>` (Tier-1 SVG Layer):**
- `ref = $bindable<SVGGElement | null>(null)`
- `value: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined)`
- `rowType?: keyof TDatum | ((datum: TDatum, index: number) => ChartWaterfallRowType)` — Defaults to `"delta"`.
- `color?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined)`
- `tone?: keyof TDatum | ((datum: TDatum, index: number) => ChartTone | undefined)`
- `pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined)`
- `connectors?: boolean` — `@default true` (`1px` dashed horizontal step hairlines snapped to `snapHalf(y)`).
- `valueLabels?: boolean` — `@default true` (signed `+$1.4M` / `-$320k` on `"delta"` bars; unsigned on `"start"`/`"subtotal"`/`"total"`).
- `formatValue?: (value: number, datum: TDatum, isDelta: boolean) => string`
- `radius?: number`, `maxBarWidth?: number`

**`WaterfallChartProps<TDatum>` (Tier-2 Batteries-Included Chart):**
- **Required:** `variant: ChartVariant`, `size: ChartSize`, `data: readonly TDatum[]`, `x`, `value`.
- **Optional:** All `ChartWaterfallProps` options (`rowType`, `connectors`, `valueLabels`, `formatValue`, `color`, `tone`, `pattern`, `radius`, `maxBarWidth`), plus standard Tier-2 shell & interaction props (`ref`, `svgRef`, `xAxis`, `yAxis`, `grid`, `referenceLines`, `referenceBands`, `annotations`, `legend`, `tooltip`, `numberFormat`, `locales`, `palette`, `monotone`, `title`, `description`, `actions`, `height`, `aspectRatio`, `margin`, `loading`, `empty`, `interactive`, `activeIndex = $bindable(null)`, `selectedIndex = $bindable(null)`, `selectable`, `onPointClick`, `children`, `overlay`, `{...rest}`).

#### 6.2.4 M11 — `<BulletChart>` & `<ChartBullet>`

**Data & Context Types:**
```ts
export interface ChartBulletRange {
    to: number;
    tone?: ChartTone;
    color?: string;
}

export interface ChartBulletRow<TDatum = ChartDatum> {
    index: number;
    label: string;
    subtitle?: string;
    actual: number;
    target: number;
    comparative?: number;
    ranges: readonly ChartBulletRange[];
    max: number;
    color: string;
    pattern: ChartBarPattern;
    datum: TDatum;
}

export interface ChartBulletTooltipContext<TDatum = ChartDatum> {
    index: number;
    row: ChartBulletRow<TDatum>;
    variance: number;
    variancePercent: number | null;
    formattedActual: string;
    formattedTarget: string;
    formattedComparative?: string;
}
```

**`ChartBulletProps<TDatum>` (Tier-1 SVG Layer):**
- `ref = $bindable<SVGGElement | null>(null)`
- `label: keyof TDatum | ((datum: TDatum, index: number) => string)`
- `subtitle?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined)`
- `actual: keyof TDatum | ((datum: TDatum, index: number) => number)`
- `target: keyof TDatum | ((datum: TDatum, index: number) => number)`
- `comparative?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined)`
- `ranges?: keyof TDatum | ((datum: TDatum, index: number) => readonly (number | ChartBulletRange)[])`
- `max?: keyof TDatum | ((datum: TDatum, index: number) => number | undefined)`
- `tone?: ChartTone | ((datum: TDatum, index: number) => ChartTone | undefined)`
- `color?: string | ((datum: TDatum, index: number) => string | undefined)`
- `pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined)`
- `sharedScale?: boolean` — `@default false` (per-row normalized scale so heterogeneous KPIs fit in one scorecard; `true` aligns all rows on a shared numeric X-axis).
- `showReadout?: boolean` — `@default true` (inline right-aligned `tabular-nums` actual / target SVG readout).
- `showVariance?: boolean` — `@default false` (appends signed variance delta to readout).
- `formatValue?: (value: number, datum: TDatum) => string`

**`BulletChartProps<TDatum>` (Tier-2 Batteries-Included Chart):**
- **Required:** `variant: ChartVariant`, `size: ChartSize`, `data: readonly TDatum[]`, `label`, `actual`, `target`.
- **Optional:** All `ChartBulletProps` options, plus standard Tier-2 props (`ref`, `svgRef`, `palette`, `monotone`, `title`, `description`, `actions`, `height`, `loading`, `empty`, `interactive`, `tooltip`, `numberFormat`, `locales`, `activeIndex = $bindable(null)`, `selectedIndex = $bindable(null)`, `selectable`, `onRowClick?: (datum: TDatum, index: number) => void`, `children`, `{...rest}`).

#### 6.2.5 M12 — `<HeatmapChart>` & `<ChartHeatmap>`

**Constants & Types:**
- `CHART_HEATMAP_COLOR_SCALES = ["sequential", "diverging"] as const` → `ChartHeatmapColorScale`
- `CHART_HEATMAP_RAMPS = ["accent", "teal", "emerald", "slate", "amber", "rose"] as const` → `ChartHeatmapRamp`
- `CHART_HEATMAP_LEGEND_STYLES = ["continuous", "stepped"] as const` → `ChartHeatmapLegendStyle`
- `ChartHeatmapCoord`: `{ xIndex: number; yIndex: number }`
- `ChartHeatmapCell<TDatum>`: `{ xIndex, yIndex, xValue, yValue, value: number | null, normalized: number | null, fill: string, fg: string, x, y, width, height, datum: TDatum | null }`
- `ChartHeatmapTooltipContext<TDatum>`: `{ cell: ChartHeatmapCell<TDatum>; formattedValue: string }`

**`ChartHeatmapProps<TDatum>` (Tier-1 SVG Layer):**
- `ref = $bindable<SVGGElement | null>(null)`
- `x: keyof TDatum | ((datum: TDatum, index: number) => string)`
- `y: keyof TDatum | ((datum: TDatum, index: number) => string)`
- `value: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined)`
- `xDomain?: readonly string[]`, `yDomain?: readonly string[]`
- `colorScale?: ChartHeatmapColorScale` — `@default "sequential"`.
- `ramp?: ChartHeatmapRamp` — `@default "accent"` (used when `colorScale="sequential"`).
- `midpoint?: number` — `@default 0` (neutral pivot when `colorScale="diverging"`).
- `domain?: readonly [number, number]` — Optional explicit `[min, max]` value clamp.
- `cellGap?: number` — `@default 2` (integer px).
- `cellRadius?: number` — Defaults to `--cs-chart-bar-radius` (`3 / 4 / 5px`).
- `square?: boolean` — `@default false` (constrains cells to square aspect ratio).
- `showValues?: boolean` — `@default true` (centered `tabular-nums` SVG text; auto-suppressed when cell `< 28×18px`).
- `formatValue?: (value: number, datum: TDatum) => string`

**`HeatmapChartProps<TDatum>` (Tier-2 Batteries-Included Chart):**
- **Required:** `variant: ChartVariant`, `size: ChartSize`, `data: readonly TDatum[]`, `x`, `y`, `value`.
- **Optional:** All `ChartHeatmapProps` options, plus `xAxis?`, `yAxis?`, `legend?: "top" | "bottom" | "none"` (`@default "top"`), `legendStyle?: ChartHeatmapLegendStyle` (`@default "continuous"`), `tooltip?`, `numberFormat?`, `locales?`, `title?`, `description?`, `actions?`, `height?`, `loading?`, `empty?`, `interactive?`, `activeCell = $bindable<ChartHeatmapCoord | null>(null)`, `selectedCell = $bindable<ChartHeatmapCoord | null>(null)`, `selectable?`, `onCellClick?: (datum: TDatum | null, cell: ChartHeatmapCell<TDatum>) => void`, `ref = $bindable(null)`, `svgRef = $bindable(null)`, `children?`, `{...rest}`.

#### 6.2.6 V2 `--cs-chart-*` CSS Custom Properties

| Token | Role & Default |
| :--- | :--- |
| `--cs-chart-unselected-opacity` | Opacity of non-selected marks when `selectedIndex` / `selectedCell` is active (`0.38`). |
| `--cs-chart-waterfall-connector` | Dashed `1px` step connector stroke (`light-dark(24% base-900, 26% base-100)`). |
| `--cs-chart-waterfall-subtotal` | Grounded subtotal column fill (`light-dark(base-600, base-400)`). |
| `--cs-chart-waterfall-total` | Grounded total column fill (`--cs-chart-series-1`). |
| `--cs-chart-bullet-range-1..3` | Calm stepped neutral qualitative band fills (`base-200`, `base-150`, `base-100` light; `base-750`, `base-800`, `base-850` dark). |
| `--cs-chart-bullet-target` | Vertical target marker tick fill (`--cs-color-text-strong`). |
| `--cs-chart-bullet-row-height` | Track block-size per `size` (`sm: 20px`, `md: 24px`, `lg: 28px`). |
| `--cs-chart-heatmap-empty` | Missing/`null` cell fill (`--cs-color-base-soft`). |
| `--cs-chart-heatmap-mid` | Diverging midpoint neutral fill (`light-dark(base-100, base-800)`). |
| `--cs-chart-heatmap-cell-fg-light` / `-dark` | Contrast-safe cell text colors selected automatically per cell luminance. |

---

### 6.3 DOM, Semantics & Accessibility (V2)

- **Selection State (`data-selected`):** Selected bars, points, slices, waterfall columns, bullet rows, and heatmap cells expose `data-selected=""`; container exposes `data-has-selection=""` when `selectedIndex !== null` (or `selectedCell !== null`) so non-selected siblings cleanly step down to `--cs-chart-unselected-opacity` in CSS without per-element JS opacity overrides.
- **`Sparkline`:** Renders `<div class="cs-sparkline" data-type={type} data-interactive={interactive ? "" : undefined}>` wrapping `<svg class="cs-sparkline-svg">` (`role="img"` + `aria-label` when `label` provided, otherwise `aria-hidden="true"`).
- **`WaterfallChart`:** Uses standard `Chart` + `ChartCanvas` keyboard scrubbing (`ArrowLeft`/`ArrowRight`/`Home`/`End`/`Escape`/`Enter`/`Space`); `.cs-chart-sr-live` announces `"<category>, <rowType>: <signedValue>, total <runningTotal>"`.
- **`BulletChart`:** Vertical row navigation (`ArrowUp`/`ArrowDown`/`Home`/`End`/`Escape`/`Enter`/`Space`); `.cs-chart-sr-live` announces `"<label>: actual <actual>, target <target>"`.
- **`HeatmapChart`:** Full 2D grid navigation on focusable `.cs-chart-canvas`: `ArrowLeft`/`ArrowRight` (column), `ArrowUp`/`ArrowDown` (row), `Home`/`End` (row start/end), `Escape` (clear `activeCell`), `Enter`/`Space` (click/select cell). `.cs-chart-sr-live` announces `"<yLabel>, <xLabel>: <formattedValue>"`.

---

### 6.4 Visual & Motion Contract (V2)

- **Zero Visual Drift:** `WaterfallChart`, `BulletChart`, and `HeatmapChart` inherit the exact `Card`/`KpiCard` borderless 4-variant surface contract (`elevated`, `soft`, `sunken`, `transparent`), concentric `[data-nested]` squircle radii, and `sm | md | lg` density scale from V1.
- **Export-Safe SVG Patterns & Ramps:** IBCS `hatch` patterns use pure `<pattern>` + `<path>`/`<line>` (zero CSS background hacks inside `<svg>`). Heatmap fills resolve via deterministic OKLCH color stops (`color-mix(in oklch, ...)` / pre-calibrated primitive steps) with automatic light/dark contrast switching for centered cell labels.
- **Motion:**
  - `Sparkline`: static by default (high-density tables and KPI grids must never jitter on scroll/mount); optional active indicator glides over `--cs-chart-dur-scrub` (`--cs-dur-80`).
  - `WaterfallChart` / `BulletChart`: baseline-anchored growth (`--cs-chart-dur-bar` `--cs-chart-ease-data`, zero overshoot); selection transitions over `--cs-dur-effect` (`160ms`).
  - `HeatmapChart`: calm cell hover/selection highlight ring transition (`--cs-dur-hover` `--cs-ease-hover`); floating `popover="manual"` tooltip uses the exact V1 instant-first / glide-after GPU `translate3d` choreography with `NumberMorph`.

---

### 6.5 Edge Cases & Constraints (V2)

- **Percent Stack Zero-Sum Rows:** When all visible series at an X-index are `0` or `null`, `stackOffsetExpand` would yield `NaN`; geometry kernel guards `sum === 0` to `[0, 0]` cleanly.
- **Direct Label Collisions & Narrow Viewports:** If `plotWidth` is too narrow to reserve direct label margin safely, direct labels cap at `maxWidth` with `…` truncation and fall back cleanly without collapsing the plot below `120px`.
- **Sparkline Degenerate Data:** Handles `[]` (empty SVG), single datum (renders centered dot), all-equal values (renders centered flat line without divide-by-zero), and `null` gaps (`defined()`).
- **Waterfall Zero-Crossing & Negative Deltas:** Cumulative `y0 → y1` spans crossing `0` snap cleanly, cap radii apply to the leading direction of each delta (top for `+`, bottom for `-`), and connector lines always exit from `runningAfter[i]` (`y1` for deltas/start, top/bottom of column for subtotal/total).
- **Heatmap Sparse / Duplicate Data:** Missing `(x, y)` pairs render as calm `--cs-chart-heatmap-empty` cells (announced as `"No data"` on keyboard focus); `cellGap` and cell dimensions snap to integer pixels to prevent moiré seams.
- **Explicit Non-Goals (V2):** Still zero `<foreignObject>`, zero SVG `<filter>`, zero WebGL/Canvas rasterizers, and no zoom/pan/brush (deferred to V3).
