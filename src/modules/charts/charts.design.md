# Charts Design Spec (`src/modules/charts/`)

## 1. Visual Direction & "Calm Clarity" Craft

`Charts` is a standalone, general-purpose data visualization suite in `@layer components.composite` with a V1 Tier-2 set covering `LineChart`, `AreaChart`, `BarChart` (grouped, stacked, horizontal, diverging), `ComposedChart`, and `DonutChart` (which also covers full Pie via `innerRadiusRatio={0}`—no separate `PieChart`), built on open Tier-1 composable primitives (which also support custom marks such as Scatter or embedded Sparklines). It combines the editorial restraint of Apple, Linear, Stripe, and modern crafted chart systems with `cscripts-ui`'s native monochrome surfaces, OKLCH color calibration, concentric squircles, and tactile motion.

### Core Anti-Slop Principles

1. **Data Owns the Visual Mass (Zero Chartjunk):**
   - No heavy dark axis frames, no 4-sided plot boxes, no 3D/neon glow filters, no distracting vertical gridlines on time-series charts, and no uncalibrated rainbow palettes.
   - Whisper-light horizontal hairlines, a grounded zero-baseline, generous outer breathing room, and calibrated OKLCH marks carry hierarchy effortlessly.
2. **Hybrid SVG + HTML Architecture:**
   - **SVG** owns the geometric plot canvas (gridlines, axis ticks, marks, direct value labels, reference lines, crosshair hairlines, active point halos) for crisp vector scaling and clean SVG/PNG export.
   - **Semantic HTML** owns the outer shell, header, interactive legend, empty/loading states, and floating crosshair tooltip—unlocking native `corner-shape` squircles, `--cs-shadow-floating`, `NumberMorph` digit rolling, keyboard accessibility, and crisp browser text layout without `<foreignObject>` quirks.
3. **Optical Precision Over Raw Math:**
   - `1px` hairlines snap to half-pixel coordinates (`floor(v) + 0.5`) so gridlines and crosshairs never blur across two device pixel rows at `1x` DPR.
   - Bars and hover bands snap to integer pixels with clamped cap radii and maximum width caps so sparse 2-bar charts never bloat into giant blocks.
4. **Honest Motion & System DNA:**
   - Motion communicates data relationships (drawing curves from left to right, growing bars cleanly from the zero-baseline without misleading overshoot) rather than gimmicky bounce.
   - `cursor: default` across interactive chart surfaces, legend triggers, and marks; `cursor: pointer` strictly on explicit `:any-link` drill-down anchors.
   - Direct `px` units across all module metrics; all custom properties use `--cs-chart-*` (never `--_`).

---

## 2. Shell Variants (`variant`), Density Scale (`size`) & Anatomy

Both `variant` and `size` are **required props** with no defaults on standalone chart containers (matching `Card`, `KpiCard`, and `DataTable`). Embedded sparklines default to frameless `transparent` geometry.

### DOM & Slot Anatomy

```text
figure.cs-chart (position: relative; display: flex; flex-direction: column;
                 data-variant, data-size, data-palette, data-nested, data-loading, data-empty)
├── [optional] .cs-chart-header (flex; justify-content: space-between; align-items: start; gap: 12px)
│   ├── .cs-chart-header-copy (ChartTitle + optional ChartDescription)
│   └── [optional] .cs-chart-actions (timeframe/unit controls)
├── [optional, top] .cs-chart-legend (flex-wrap interactive button strip)
├── .cs-chart-canvas (position: relative; flex: 1 1 auto; min-block-size: var(--cs-chart-plot-height))
│   ├── svg.cs-chart-svg (width: 100%; height: 100%; overflow: visible for edge labels)
│   │   ├── defs (linear gradients, clip-paths for plot box & mount draw-in)
│   │   ├── g.cs-chart-layer-bands (reference target corridors)
│   │   ├── g.cs-chart-layer-grid (whisper horizontal hairlines + firmer zero-baseline)
│   │   ├── g.cs-chart-layer-marks (areas, bars, lines, donut arcs)
│   │   ├── g.cs-chart-layer-references (dashed target/threshold lines + soft label pills)
│   │   ├── g.cs-chart-layer-axes (crisp tabular SVG ticks + optional axis titles)
│   │   ├── g.cs-chart-layer-crosshair (hover category band, crosshair hairline, active point halos)
│   │   └── g.cs-chart-layer-annotations (direct value labels + SVG data-coordinate callouts)
│   ├── [optional] .cs-chart-overlay (HTML overlay aligned to plot box; e.g. DonutChart center KPI readout)
│   ├── [when loading] .cs-chart-loading
│   └── [when empty] .cs-chart-empty
├── [optional, bottom] .cs-chart-legend (flex-wrap interactive button strip)
└── .cs-chart-tooltip (HTML floating layer; popover="manual"; pointer-events: none; GPU translate3d)
```

### Surface Variants (`variant`: `"elevated" | "soft" | "sunken" | "transparent"`)

Exact 1:1 parity with `Card` and `KpiCard`:

| Variant | `--cs-chart-bg` | `--cs-chart-shadow` | Outer Shape | Padding | Recommended Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `elevated` | `var(--cs-color-elevated)` | `var(--cs-shadow-elevated)` | Squircle (`--cs-chart-radius`) | `--cs-chart-padding` | Primary standalone chart card on `--cs-color-canvas`. |
| `soft` | `var(--cs-color-base-soft)` | `none` | Squircle (`--cs-chart-radius`) | `--cs-chart-padding` | Quiet borderless tonal surface on `--cs-color-canvas` or inside an `elevated` `Card` without elevation shadow. |
| `sunken` | `var(--cs-color-sunken)` | `var(--cs-shadow-sunken)` | Squircle (`--cs-chart-radius`) | `--cs-chart-padding` | Recessed chart well nested inside an `elevated` `Card` or drawer without double-shadowing. |
| `transparent` | `transparent` | `none` | `0px` (flush) | `0px` | Frameless embedding inside a `Card` / `KpiCard` that already owns the outer shell, or inline sparklines. |

> **Opaque Cutout Backing (`--cs-chart-point-ring-bg`):**
> Active point halos, stacked bar gaps, and full-pie slice seams need an opaque surface-matched cutout color. Resolve `--cs-chart-point-ring-bg` automatically per variant:
> - `elevated`: `var(--cs-color-elevated)`
> - `soft`: Because `--cs-color-base-soft` is translucent (`5%` `base-900` in light, `11%` `base-100` in dark), resolve an opaque composite matching the soft surface over `--cs-chart-backdrop-bg` (defaulting to `var(--cs-color-canvas)`, or `var(--cs-color-elevated)` when `[data-nested]`):
>   `light-dark(color-mix(in oklch, var(--cs-color-base-900) 5%, var(--cs-chart-backdrop-bg, var(--cs-color-canvas))), color-mix(in oklch, var(--cs-color-base-100) 11%, var(--cs-chart-backdrop-bg, var(--cs-color-canvas))))`
> - `sunken`: `var(--cs-color-sunken)`
> - `transparent`: `var(--cs-chart-backdrop-bg, var(--cs-color-canvas))` (override `--cs-chart-backdrop-bg: var(--cs-color-elevated)` when a `transparent` chart sits inside an `elevated` `Card`).

### Concentric Nesting (`[data-nested]`)

`Charts` participates in `createSurfaceRadius` (sharing context with `Card`, `KpiCard`, and `DataTable`):
- Inside a `Card` or `KpiCard`, `soft`, `sunken` (or `elevated`) charts receive `data-nested`, adopt `--cs-chart-radius: var(--cs-chart-nested-radius)` (`8px`–`12px`), and step `corner-shape` down to `var(--cs-squircle-smooth)` (`1.6`).
- **Surface pairing rule:** `elevated` `Card` → `transparent`, `soft`, or `sunken` chart; `--cs-color-canvas` → `elevated`, `soft`, or `transparent` chart. Never nest `elevated` inside `elevated`.

### Density & Size Scale (`size`: `"sm" | "md" | "lg"`)

Shell padding, gaps, and standalone squircle radii match `Card` and `KpiCard` **1:1** so charts align pixel-for-pixel beside KPI cards in dashboard grids:

| Token / Metric | `sm` *(Compact / Tile)* | `md` *(Balanced / Default)* | `lg` *(Editorial / Analytical)* |
| :--- | :--- | :--- | :--- |
| `--cs-chart-padding` *(`elevated`/`soft`/`sunken`)* | `12px` | `16px` | `24px` |
| `--cs-chart-gap` *(section gap)* | `8px` | `12px` | `16px` |
| `--cs-chart-radius` *(standalone)* | `16px` (`--cs-radius-2xl`) | `24px` (`--cs-radius-3xl`) | `28px` |
| `--cs-chart-squircle` | `var(--cs-squircle)` | `var(--cs-squircle)` | `var(--cs-squircle)` |
| `--cs-chart-plot-height` *(default)* | `180px` | `260px` | `340px` |
| `--cs-chart-title-size` / `lh` | `13px` / `18px` | `14px` / `20px` | `16px` / `22px` |
| `--cs-chart-subtitle-size` / `lh` | `11px` / `15px` | `12px` / `16px` | `13px` / `18px` |
| `--cs-chart-tick-size` *(SVG)* | `11px` | `11px` | `12px` |
| `--cs-chart-value-label-size` *(SVG)* | `10px` | `11px` | `11px` |
| `--cs-chart-legend-font-size` | `11px` | `12px` | `12px` |
| `--cs-chart-stroke-width` *(line/area)* | `1.75px` | `2px` | `2.25px` |
| `--cs-chart-point-radius` *(active dot)* | `3.5px` | `4px` | `4.5px` |
| `--cs-chart-bar-radius` *(cap radius)* | `3px` | `4px` | `5px` |
| `--cs-chart-bar-max-width` | `40px` | `52px` | `64px` |
| `--cs-chart-bar-group-gap` | `3px` | `4px` | `5px` |
| `--cs-chart-tooltip-radius` | `12px` | `12px` | `14px` |
| `--cs-chart-tooltip-padding` | `8px 10px` | `8px 10px` | `10px 12px` |

---

## 3. Color Palette System (OKLCH, Light & Dark Mode)

All series colors derive exclusively from `src/css/foundation/color-primitives.css` and `src/css/foundation/color-semantics.css` using CSS `light-dark()` and `color-mix(in oklch, ...)`.

### Calibration Principles
- **Light mode (`#fff` / `zinc-100` surfaces):** Marks target OKLCH lightness `L ≈ 56%–68%` (`500`–`550` calibrated steps), achieving `>= 3:1` non-text contrast (WCAG 1.4.11) without looking muddy or heavy.
- **Dark mode (`zinc-900` `L=21%` / `zinc-950` `L=14%` surfaces):** Marks step up to `400`–`450` (`L ≈ 67%–79%`) with controlled chroma—luminous and crisp against dark surfaces without neon vibration.

### 3.1 Default Categorical Palette (`palette="categorical"`, 10 Ordered Slots)

Ordered for **calm executive aesthetics** on 1–3 series and **perceptual + colorblind separation** (maximizing hue and luminance distance across the first 5 slots for deuteranopia/protanopia):

- **1 series:** Accent (`blue` by default)—100% cohesive with `cscripts-ui`'s monochrome + single-accent identity.
- **2 series:** Accent + Teal—cool, balanced, zero alarmist traffic-light bias.
- **3 series:** Accent + Teal + Amber—triadic cool/warm split with strong luminance differentiation.
- **4–5 series:** Adds Violet + Rose—rich, distinguishable without colliding with semantic `negative` red.
- **6–10 series:** Sky, Emerald, Orange, Fuchsia, and neutral Slate anchor.

```css
.cs-chart {
    /* 1. Accent (tracks app --cs-color-accent-*, Blue 260° by default) */
    --cs-chart-series-1: light-dark(
        var(--cs-color-accent-solid),
        color-mix(in oklch, var(--cs-color-accent-400) 65%, var(--cs-color-accent-500))
    );
    /* 2. Teal (182°) */
    --cs-chart-series-2: light-dark(
        color-mix(in oklch, var(--cs-color-teal-500) 45%, var(--cs-color-teal-600)),
        var(--cs-color-teal-400)
    );
    /* 3. Amber (64°) */
    --cs-chart-series-3: light-dark(
        color-mix(in oklch, var(--cs-color-amber-500) 55%, var(--cs-color-amber-600)),
        var(--cs-color-amber-400)
    );
    /* 4. Violet (293°) */
    --cs-chart-series-4: light-dark(
        var(--cs-color-violet-500),
        var(--cs-color-violet-400)
    );
    /* 5. Rose (16°) */
    --cs-chart-series-5: light-dark(
        color-mix(in oklch, var(--cs-color-rose-500) 60%, var(--cs-color-rose-600)),
        var(--cs-color-rose-400)
    );
    /* 6. Sky (237°) */
    --cs-chart-series-6: light-dark(
        color-mix(in oklch, var(--cs-color-sky-500) 55%, var(--cs-color-sky-600)),
        var(--cs-color-sky-400)
    );
    /* 7. Emerald (163°) */
    --cs-chart-series-7: light-dark(
        color-mix(in oklch, var(--cs-color-emerald-500) 50%, var(--cs-color-emerald-600)),
        var(--cs-color-emerald-400)
    );
    /* 8. Orange (44°) */
    --cs-chart-series-8: light-dark(
        color-mix(in oklch, var(--cs-color-orange-500) 60%, var(--cs-color-orange-600)),
        var(--cs-color-orange-400)
    );
    /* 9. Fuchsia (322°) */
    --cs-chart-series-9: light-dark(
        var(--cs-color-fuchsia-500),
        var(--cs-color-fuchsia-400)
    );
    /* 10. Slate (257°, low-chroma neutral anchor) */
    --cs-chart-series-10: light-dark(
        var(--cs-color-slate-500),
        var(--cs-color-slate-400)
    );
}
```

### 3.2 Monotone / Tonal Single-Hue Mode (`monotone="accent" | "blue" | "slate" | "emerald" | "teal" | "violet" | "amber" | "rose"`)

Designed for executive decks, cohort breakdowns, and stacked comparisons where multi-hue palettes feel noisy.

**Interleaved Tonal Separation (Critical Design Detail):**
Instead of stepping sequentially `600 → 500 → 400` (where a 2-series chart would pair nearly indistinguishable adjacent shades), `monotone` interleaves lightness steps so **every series count from 2 to 6 has crisp perceptual separation**:

| Series Slot | Light Mode Step (from `<hue>`) | Dark Mode Step (from `<hue>`) | Visual Role |
| :--- | :--- | :--- | :--- |
| `--cs-chart-series-1` | `550` (`50% 500 / 50% 600`) | `400` | Primary focus / Current period |
| `--cs-chart-series-2` | `300` | `600` | Secondary comparison / Prior period (high delta from Slot 1) |
| `--cs-chart-series-3` | `700` | `300` | Deep contrast anchor |
| `--cs-chart-series-4` | `400` | `500` | Mid-tone fill |
| `--cs-chart-series-5` | `200` *(+ subtle 1px inner `300` rim on bars/donuts)* | `700` | Whisper tint |
| `--cs-chart-series-6` | `800` | `200` | Deepest / brightest extreme |

For `monotone="slate"` (strict monochrome executive mode), shift one step darker in light mode (`700`, `400`, `900`, `500`, `300`, `600`) and lighter in dark mode (`200`, `500`, `100`, `400`, `600`, `300`) to preserve contrast on neutral grays.

### 3.3 Semantic Status Tokens (Intent-Driven, No `info`)

Strictly mirrors `color-semantics.css` for variance bars, waterfall deltas, target thresholds, and SLA zones:

```css
.cs-chart {
    --cs-chart-positive: light-dark(var(--cs-color-positive-solid), var(--cs-color-positive-400));
    --cs-chart-positive-soft: var(--cs-color-positive-soft);
    --cs-chart-positive-fg: var(--cs-color-positive-soft-fg);

    --cs-chart-caution: light-dark(var(--cs-color-caution-solid), var(--cs-color-caution-400));
    --cs-chart-caution-soft: var(--cs-color-caution-soft);
    --cs-chart-caution-fg: var(--cs-color-caution-soft-fg);

    --cs-chart-negative: light-dark(var(--cs-color-negative-solid), var(--cs-color-negative-400));
    --cs-chart-negative-soft: var(--cs-color-negative-soft);
    --cs-chart-negative-fg: var(--cs-color-negative-soft-fg);
}
```

### 3.4 Structural & Chrome Tokens

```css
.cs-chart {
    /* Whisper horizontal gridlines */
    --cs-chart-grid: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 6%, transparent),
        color-mix(in oklch, var(--cs-color-base-100) 7%, transparent)
    );
    /* Firmer baseline / zero-line grounding marks */
    --cs-chart-axis: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 14%, transparent),
        color-mix(in oklch, var(--cs-color-base-100) 15%, transparent)
    );
    /* Active scrubbing hairline (line/area/scatter) */
    --cs-chart-crosshair: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 18%, transparent),
        color-mix(in oklch, var(--cs-color-base-100) 22%, transparent)
    );
    /* Active category hover band (bar/column) */
    --cs-chart-hover-band: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 3.5%, transparent),
        color-mix(in oklch, var(--cs-color-base-100) 5.5%, transparent)
    );
    /* Typography */
    --cs-chart-title-fg: var(--cs-color-text-strong);
    --cs-chart-subtitle-fg: var(--cs-color-text-weak);
    --cs-chart-tick-fg: var(--cs-color-text-weak);
    --cs-chart-label-fg: var(--cs-color-text-main);
    /* Area gradient top stop opacity */
    --cs-chart-area-top-opacity: light-dark(0.22, 0.28);
    --cs-chart-area-bottom-opacity: 0;
    /* Dimmed sibling series opacity on hover/focus */
    --cs-chart-dim-opacity: 0.24;
}
```

---

## 4. Typography, Labels & Optical Precision

### 4.1 SVG `<text>` vs. HTML Chrome

All chart text uses `--cs-font-sans` (never defaulting numeric axes or readouts to monospace).

| Element | Layer | Font Size (`sm`/`md`/`lg`) | Weight | Color | Numeric Features & Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chart Title** | HTML | `13 / 14 / 16px` | `600` | `--cs-chart-title-fg` | Sentence case, `-0.015em` tracking. |
| **Chart Subtitle** | HTML | `11 / 12 / 13px` | `400` | `--cs-chart-subtitle-fg` | Concise unit/period context (e.g. `Monthly revenue, USD`). |
| **Axis Ticks** | SVG | `11 / 11 / 12px` | `400` | `--cs-chart-tick-fg` | `font-variant-numeric: tabular-nums lining-nums`. |
| **Direct Value Labels** | SVG | `10 / 11 / 11px` | `500` | `--cs-chart-label-fg` or contrast-safe inside ink | `tabular-nums`, `paint-order: stroke fill` (`3px` `--cs-chart-point-ring-bg` halo when crossing strokes/gridlines). |
| **Donut Center Metric** | HTML | `22 / 26 / 32px` | `600` | `--cs-color-text-strong` | `-0.025em` tracking, `tabular-nums`, `NumberMorph` compatible. |
| **Donut Center Label** | HTML | `11 / 12 / 12px` | `400` | `--cs-color-text-weak` | Single short noun (`Total`, or hovered slice label). |
| **Legend Item** | HTML | `11 / 12 / 12px` | `400` (`500` on active/hover) | `--cs-color-text-main` → `strong` | Single-line `whitespace-nowrap`. |
| **Tooltip Readout** | HTML | `11px` header / `12px` rows | `500` header / `400` label / `600` value | `weak` / `main` / `strong` | Snapped integer `line-height` (`16px`/`18px`), `tabular-nums`. |

### 4.2 Subpixel Snapping & Export Cleanliness

- **Hairline Strokes (`1px`):** Horizontal gridlines, zero-baselines, reference lines, and vertical crosshairs MUST snap to `Math.floor(coord) + 0.5` (`shape-rendering="crispEdges"` on straight axis/grid `<line>` elements only—never on curved paths or rounded bars).
- **Bars & Hover Bands:** Snap `x`, `y`, `width`, `height` to integer pixels (`Math.round()`).
- **Bar Cap Radii:**
  - Round **only the outer cap** (top corners for positive columns, bottom corners for negative columns, right corners for positive horizontal bars).
  - Clamp radius to `min(var(--cs-chart-bar-radius), barThickness / 2, barLength)` so tiny values never distort into ovals.
  - Stacked bars apply `1.5px` gaps (via `--cs-chart-point-ring-bg` stroke or geometry inset) between segments, keeping internal segments square (`0px`) and rounding only the outermost positive/negative cap.
- **Export Fidelity:** Never use SVG `<filter>` drop shadows on bars, lines, or arcs. Keep all geometry pure vector paths so PNG/SVG export renders identically to screen.

### 4.3 Long-Label Ergonomics

1. **X-Axis Categories (Columns / Lines):**
   - **Auto-thinning (default for time series):** Enforce a minimum `12px` horizontal gutter between adjacent tick labels; hide colliding intermediate ticks cleanly rather than overlapping.
   - **Truncate (`labelMode="truncate"`, default for categorical):** Constrain each tick to `bandWidth - 6px` with `…` ellipsis; reveal the full untruncated label in the tooltip header.
   - **Wrap (`labelMode="wrap"`):** Max 2 lines (`14px` line-height), centered under the band, truncating line 2 with `…`.
   - **Angled (`labelMode="angle"`):** Rotate `-38deg` around the tick anchor with `text-anchor="end"` and optical `dy="4"` so the trailing character aligns directly beneath the tick center without colliding with the baseline.
2. **Y-Axis Categories (Horizontal Bars):**
   - **Left Gutter (default):** Cap gutter at `min(140px, 32% of plot width)`, right-aligned (`text-anchor="end"`), `10px` gap to baseline, single-line ellipsis with full text in tooltip.
   - **Inline Above-Bar Mode (`labelLayout="above"`):** Ideal for long business labels (e.g. `Enterprise Annual Renewal`). Renders category name flush-left `4px` above the bar (`12px`, `--cs-color-text-main`) and the formatted value flush-right (`12px`, `weight: 600`, `tabular-nums`, `--cs-color-text-strong`)—zero horizontal space wasted on a wide left gutter.
3. **Direct Value Labels:**
   - **Outside (default):** `6px` clearance from bar tip, `--cs-chart-label-fg`. Auto-expand plot top/right margin by `18px–36px` so the tallest bar's label never clips.
   - **Inside (`labelPosition="inside"`):** `8px` inset from bar tip. Auto-resolve contrast-safe ink: `#fff` on dark/saturated tones (`500`–`800` light, `500`–`700` dark) and `var(--cs-color-base-950)` on light tones (`200`–`300` monotone tints, `amber-400`). Automatically suppress inside labels when `barLength < labelWidth + 14px` or `barThickness < 18px`.
4. **Reference Lines & Badges/Pills:**
   - Dashed `1px` hairline (`stroke-dasharray: 4 3`) in `--cs-chart-axis` (neutral) or `--cs-chart-{positive|caution|negative}`.
   - Inline pill badge anchored `4px` inside the trailing plot edge (or top edge for vertical reference lines): `18px` height, `6px` horizontal padding, `5px` radius, semantic `-soft` fill + `-soft-fg` text (`11px`, `weight: 500`), zero border.
5. **Floating Annotations:**
   - Crisp `1px` leader line (`--cs-chart-axis`) + `3.5px` anchor dot (`--cs-chart-title-fg` with `1.5px` `--cs-chart-point-ring-bg` ring) + compact label pill (`padding: 2px 7px`, `radius: 6px`, `background: var(--cs-color-elevated)`, `box-shadow: var(--cs-shadow-xs)`, `11px`, `weight: 500`, `--cs-color-text-strong`).

---

## 5. Mark-Specific Visual Craft

| Chart Type | Key Optical Specs |
| :--- | :--- |
| **Line** | `stroke-linecap: round`, `stroke-linejoin: round`. Dots **hidden at rest** on dense series (`> 12` points) to eliminate visual clutter; active point dot + halo appears on crosshair scrub. Sparse opt-in dots: `3px` radius + `1.5px` `--cs-chart-point-ring-bg` cutout stroke. |
| **Area** | Crisp top stroke (`--cs-chart-stroke-width`) + vertical linear gradient (`--cs-chart-area-top-opacity` → `0`). Stacked areas use subtle `1.5px` top strokes with translucent fills (`light: 0.45 → 0.25`, `dark: 0.50 → 0.22`) so overlapping depth reads clearly. |
| **Bar / Column** | Category outer padding `28%` of band; `min-bar-height: 2px` for non-zero values so tiny figures stay visible and hoverable. Negative variance bars flip cap radius to bottom/left and invert zero-line cleanly. |
| **Donut (`DonutChart`)** | Single component covering both Donut and full Pie (no separate `PieChart`). Default `innerRadiusRatio={0.64}` (clean ring framing the center KPI); `padAngle` yielding `2px` visual gap between slices; `3px` arc corner radius. Setting `innerRadiusRatio={0}` renders a full Pie with a `1.5px` `--cs-chart-point-ring-bg` stroke seam between slices. |
| **Scatter** | Default circle radius `4.5px` (`sm`/`md`) / `5.5px` (`lg`), fill at `78%` opacity with `1.5px` solid `100%` stroke of the same series color—making overlapping clusters immediately legible without muddiness. |
| **Sparkline** | Frameless (`transparent`), zero axes/gridlines, `1.5px` stroke, subtle area wash (`18% → 0%`), optional trailing end-cap dot (`2.5px` radius + `1.5px` cutout ring) anchoring the latest value. |

---

## 6. Interactive Legend & Floating Crosshair Tooltip

### 6.1 Interactive Legend (`.cs-chart-legend`)

- **Placement:** `top` (default, aligned cleanly below header) or `bottom`, with `align: "start" | "center" | "end"` (or `none` to hide).
- **Layout:** `display: flex; flex-wrap: wrap; gap: 4px 8px;` (`row-gap: 4px`, `column-gap: 8px`).
- **Indicator Geometry (Matches Mark Type):**
  - Bar / Column / Donut: `8px × 8px` square (`border-radius: 2.5px`).
  - Line / Area: `10px × 2.5px` horizontal pill (`border-radius: 9999px`).
  - Scatter *(custom Tier-1)*: `7px × 7px` circle (`border-radius: 9999px`).
- **Interactive Button States (`.cs-chart-legend-item`):**
  - Native `<button type="button">` (`cursor: default`, `display: inline-flex; align-items: center; gap: 6px; padding: 3px 7px; border-radius: 7px; corner-shape: var(--cs-squircle-soft);`). Include `<HitArea />` when rendered surface area is `< 1936px²` (typical at `sm`).
  - **Rest:** `background: transparent`, `color: var(--cs-color-text-main)`, swatch `100%`.
  - **Hover:** `background: var(--cs-chart-legend-hover-bg)` (`var(--cs-color-base-soft)` on `elevated`/`sunken`/`transparent`; stepped up to `var(--cs-color-base-soft-hover)` on `data-variant="soft"` so hovered pills remain legible against the soft shell), `color: var(--cs-color-text-strong)`. Simultaneously cross-highlights that series in the SVG while dimming siblings to `--cs-chart-dim-opacity`.
  - **Active press (`:active`):** `background: var(--cs-color-base-soft-hover)`, `scale: 0.97` (`--cs-dur-press`).
  - **Hidden (`aria-pressed="false"`):** Uses dedicated colorless disabled tokens (never lazy global opacity): swatch switches to `background: transparent; box-shadow: inset 0 0 0 1.5px var(--cs-color-disabled-bg-strong);`, label switches to `color: var(--cs-color-disabled-fg); text-decoration: line-through;`.

### 6.2 Floating Crosshair Tooltip (`.cs-chart-tooltip`)

Built as a crisp HTML overlay sharing `cscripts-ui`'s floating material grammar:

```text
┌─────────────────────────────┐  ← --cs-color-elevated, --cs-shadow-floating
│ Nov 2026                    │  ← 11px, 500, --cs-color-text-weak, lh: 16px
│ ▎ Revenue          $48,290  │  ← 2.5×10px pill swatch + 12px main + 12px 600 tabular NumberMorph
│ ▎ Forecast         $44,100  │
├─────────────────────────────┤  ← optional 1px hairline (--cs-chart-grid) for stacked totals
│ Total              $92,390  │  ← 12px weak + 12px 600 strong tabular
└─────────────────────────────┘
```

- **Surface & Shape:**
  - Native `popover="manual"` (top-layer promoted so parent `Card` or `ScrollArea` `overflow: clip` never clips the tooltip)
  - `background: var(--cs-color-elevated)`
  - `box-shadow: var(--cs-shadow-floating)` (gives ambient depth in light mode + crisp specular rim in dark mode so it never merges into an `elevated` chart card!)
  - `border-radius: var(--cs-chart-tooltip-radius)` (`12px` / `14px`), `corner-shape: var(--cs-squircle-smooth)`
  - `padding: var(--cs-chart-tooltip-padding)` (`8px 10px` / `10px 12px`)
  - `min-inline-size: 148px; max-inline-size: 260px; pointer-events: none;`
- **Row Grid:** `display: grid; grid-template-columns: auto minmax(0, 1fr) auto; column-gap: 8px; row-gap: 4px; align-items: center;`.
- **Series Swatch:** `2.5px × 10px` vertical pill (`border-radius: 9999px`) in the series color—optically anchors multi-row readouts cleaner than tiny dots.
- **Live Scrubbing (`NumberMorph` — Direct Integration):**
  - Numeric values render directly inside `<NumberMorph willChange={false} respectMotionPreference={true} />` (direct integration with zero fallback branch) using fast scrubbing timing (`~160ms` transform/spin) so digits roll fluidly as the pointer scrubs across points with **zero horizontal width jitter** (`tabular-nums` + `min-inline-size`).
  - Keep `willChange={false}` on `NumberMorph` and snap tooltip `line-height` to exact integers (`16px` header, `18px` rows) and tooltip `transform: translate3d(round(x), round(y), 0)` so text stays razor-sharp while gliding. Under `prefers-reduced-motion: reduce`, `NumberMorph` snaps immediately with zero rolling animation.
- **Positioning & Hysteresis:**
  - Instant-first, glide-after: on first open, snap coordinates immediately (never flying in from `(0, 0)`); while open, smoothly glide `transform` as the pointer scrubs.
  - Offset `12px` horizontally from the crosshair; flip smoothly from right-side to left-side when `x + tooltipWidth + 16px > viewportWidth` (with `16px` hysteresis deadzone so the tooltip never flickers at the midpoint). Clamp vertically inside the viewport with `8px` edge clearance.

---

## 7. Motion & Animation Choreography

Standard UI transitions use semantic tokens from `src/css/foundation/motion.css`. One-off SVG data-draw choreography uses clearly scoped local `--cs-chart-dur-*` tokens (per `design-and-tokens.md`).

### Local Motion Tokens

```css
.cs-chart {
    /* Mount & data-draw choreography (scoped to charts) */
    --cs-chart-dur-draw: 520ms;       /* Line/area reveal */
    --cs-chart-dur-bar: 420ms;        /* Bar/column baseline growth */
    --cs-chart-dur-arc: 540ms;        /* Donut/pie radial sweep */
    --cs-chart-dur-update: var(--cs-dur-380); /* Data/timeframe morphs */
    --cs-chart-dur-scrub: var(--cs-dur-80);   /* Tooltip & crosshair glide */
    --cs-chart-ease-data: var(--cs-ease-quart-out);
    --cs-chart-ease-draw: var(--cs-ease-expo-out);
}
```

### 7.1 Mount Entrance (Calm, One-Shot, Honest)

| Chart Type | Animation Mechanics | Duration & Curve | Stagger / Notes |
| :--- | :--- | :--- | :--- |
| **Line** | Left-to-right clip reveal (`clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`)—preserves dashed strokes without `stroke-dashoffset` artifacts. | `--cs-chart-dur-draw` (`520ms`), `--cs-chart-ease-draw` (`expo-out`) | Multi-series stagger `40ms` per series (capped at `120ms`). |
| **Area** | Top stroke reveals with Line; gradient fill fades in (`opacity: 0 → 1`). | Fill: `--cs-dur-380`, `--cs-ease-quad-out`, `80ms` delay | Stroke leads the fill for crisp visual hierarchy. |
| **Bar / Column** | Grows strictly from the zero-baseline (`transform-origin` locked to baseline; `scaleY(0) → scaleY(1)` or `scaleX`). **Zero overshoot**—overshooting misrepresents quantitative values. | `--cs-chart-dur-bar` (`420ms`), `--cs-chart-ease-data` (`quart-out`) | Per-category stagger: `min(index * 18ms, 180ms)` so 6 bars ripple cleanly while 40 bars never lag. |
| **Donut (`DonutChart`)** | Radial sweep from `12 o'clock` (`-90deg`) clockwise (applies identically when `innerRadiusRatio={0}`). | `--cs-chart-dur-arc` (`540ms`), `--cs-chart-ease-draw` (`expo-out`) | Center KPI fades + lifts `4px` (`--cs-dur-enter-sm`, `100ms` delay). |
| **Scatter** | Points scale in (`scale(0.6) → 1`, `opacity: 0 → 1`). | `--cs-dur-260`, `--cs-spring-snappy` | Capped stagger: `min(index * 8ms, 160ms)`. |

### 7.2 Data Update Transitions (Live Filtering / Timeframe Changes)

- **Bar height / width / position & Donut arcs:** Smoothly interpolate over `--cs-chart-dur-update` (`380ms`) `--cs-chart-ease-data` (`quart-out`)—zero overshoot.
- **Line / Area paths:** Smooth SVG path morph over `--cs-chart-dur-update` (`380ms`) `--cs-chart-ease-data` when point topologies match; calm crossfade (`--cs-dur-240` `--cs-ease-quad-out`) when point counts differ significantly.
- **Axis ticks & gridlines:** Crossfade + `4px` drift over `--cs-dur-240` `--cs-ease-quad-out`.
- **Entering / Exiting marks:** Entering bars grow from baseline (`--cs-dur-320`); exiting bars collapse to baseline + `opacity: 0` (`--cs-dur-180` `--cs-ease-quad-in`).

### 7.3 Hover, Focus & Scrubbing Choreography

- **Series Dimming:** Hovering a legend item, bar, donut slice, or nearest line holds the target series at `opacity: 1` and dims sibling series to `--cs-chart-dim-opacity` (`0.24`) over `--cs-dur-effect` (`160ms`) `--cs-ease-effect`.
- **Active Point Halo (Line/Area):** Solid dot (`r = var(--cs-chart-point-radius)`) + `2px` `--cs-chart-point-ring-bg` cutout ring + soft outer ring (`r + 4px`, `22%` series color) pops in over `--cs-dur-140` `--cs-spring-snappy`.
- **Crosshair & Hover Band:** Opacity fades in over `--cs-dur-effect-fast` (`100ms`) `--cs-ease-effect`; horizontal position glides in `--cs-dur-60` (`60ms`) `--cs-ease-quad-out`.
- **Donut Slice Hover:** Subtle radial expansion (`+3px` outer radius) over `--cs-dur-180` `--cs-ease-cubic-out` while center KPI smoothly morphs to the hovered slice's value and label.
- **Tooltip Enter / Glide / Exit:**
  - *Enter:* `opacity: 0 → 1`, `scale: 0.96 → 1` over `--cs-dur-enter-sm` (`260ms`) `--cs-ease-enter`.
  - *Scrub Glide:* `transform` glides smoothly over `--cs-chart-dur-scrub` (`80ms`) `--cs-ease-cubic-out` (eliminates discrete-step teleport jank while staying magnetically locked to the cursor).
  - *Exit:* `opacity: 1 → 0`, `scale: 1 → 0.98` over `--cs-dur-exit-sm` (`100ms`) `--cs-ease-exit`.

### 7.4 Strict `prefers-reduced-motion` & Theme-Switching Safety

- **CSS animations/transitions:** Rely on `src/css/foundation/motion.css`'s global `@media (prefers-reduced-motion: reduce)` and `[data-theme-switching]` rules—never duplicate them inside `charts`.
- **JS-driven SVG interpolation & `NumberMorph`:** Guard every `requestAnimationFrame` / spring / path morph with `matchMedia("(prefers-reduced-motion: reduce)")` and pass `respectMotionPreference={true}` to `NumberMorph`. When reduced motion is active, mount reveals, data updates, crosshair glides, and tooltip appearances snap directly to their resting state (`0ms`).

---

## 8. Empty, Loading & Focus States

- **Empty State (`[data-empty]`):** Render subtle placeholder gridlines at `50%` normal contrast behind a centered quiet message (`13px`, `--cs-color-text-weak`, max 1–2 short lines, no loud warning boxes).
- **Loading / Skeleton State:** Render quiet `--cs-color-base-soft` bar/arc silhouettes with a gentle shimmer (respecting reduced motion) matching the exact `--cs-chart-plot-height` so layout never jumps when data arrives.
- **Keyboard Focus (`:focus-visible`):**
  - Rely on global `focus.css` (`2px solid var(--cs-color-accent-solid)`).
  - Legend buttons use standard outset `outline-offset: 2px`.
  - Keyboard-focusable SVG plot container (`.cs-chart-canvas:focus-visible`, enabling Left/Right arrow scrubbing across data points) applies `outline-offset: -2px` and `border-radius: calc(var(--cs-chart-radius) - var(--cs-chart-padding))` so focus stays crisp and unclipped inside squircle shells.

---

## 9. V2 Executive & Controlling Visual & Motion Specification

All V2 additions extend the V1 "Calm Clarity" grammar under `@layer components.composite`: **100% pure SVG inside `<svg>`** (zero `<foreignObject>`, zero `<filter>`), calibrated for Light & Dark mode across all 4 shell variants (`elevated | soft | sunken | transparent`), and anchored to `var(--cs-chart-point-ring-bg)` for opaque cutouts and surface-matched tonal mixing.

### 9.1 IBCS Scenario Fills (`pattern: "solid" | "hatch" | "outline"`)

Maps directly to IBCS controlling semantics without adding noisy extra colors:
- `solid` = **Actual** (default full series fill).
- `hatch` = **Forecast / Estimate** (45° diagonal vector hatch over a quiet tinted backdrop).
- `outline` = **Plan / Budget** (crisp inset stroke + whisper inner wash).

#### Diagonal Hatch `<pattern>` Geometry (`pattern="hatch"`)
Define one scoped `<pattern>` per hatched series/color in `<defs>` (`id="{uid}-hatch-{key}"`):
- **Tile & Rotation:** `patternUnits="userSpaceOnUse"`, `width="8"`, `height="8"`, `patternTransform="rotate(45)"`. An integer `8px` pitch eliminates subpixel moiré/vibration on `1x` and `2x` displays and remains unmistakable in grayscale print.
- **Backdrop Tint:** `<rect width="8" height="8" fill="{color}" fill-opacity="var(--cs-chart-hatch-bg-opacity)" />` (`light: 0.14`, `dark: 0.18`) so hatched bars hold cohesive silhouette mass.
- **Diagonal Stripe:** `<rect x="0" y="0" width="2.25" height="8" fill="{color}" fill-opacity="var(--cs-chart-hatch-stripe-opacity)" />` (`light: 0.85`, `dark: 0.88`, `~28%` duty cycle—cleanly readable at `10px` bar widths without optical buzzing). Using `<rect>` instead of `<line>` prevents edge-seam clipping at pattern boundaries.
- **Crisp Silhouette Rim:** Apply `stroke="{color}"`, `stroke-opacity="0.55"`, `stroke-width="1px"` on an inset path (`0.5px` inward) so the rounded outer cap stays razor-sharp where light gaps meet the bar edge.

#### Outline Bar Treatment (`pattern="outline"`)
- **Geometry Inset:** Inset the bar path by `0.75px` on all edges (`x + 0.75`, `y + 0.75`, `width - 1.5`, `height - 1.5`) with outer cap radius clamped to `max(0, capRadius - 0.75)` so outlined bars match adjacent `solid` and `hatch` bar widths pixel-for-pixel.
- **Stroke & Inner Fill:** `stroke="{color}"`, `stroke-width="1.5px"`, `fill="{color}"`, `fill-opacity="var(--cs-chart-outline-fill-opacity)"` (`light: 0.09`, `dark: 0.12`).

#### Legend & Tooltip Swatch Parity
- `.cs-chart-legend-swatch[data-pattern="hatch"]`: `background-image: repeating-linear-gradient(-45deg, var(--cs-chart-swatch-color) 0 1.75px, color-mix(in oklch, var(--cs-chart-swatch-color) 14%, transparent) 1.75px 4.5px); box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--cs-chart-swatch-color) 50%, transparent);`.
- `.cs-chart-legend-swatch[data-pattern="outline"]`: `background-color: color-mix(in oklch, var(--cs-chart-swatch-color) 10%, transparent); box-shadow: inset 0 0 0 1.5px var(--cs-chart-swatch-color);`.
- `.cs-chart-tooltip-swatch` (`2.5px × 10px` pill) mirrors `[data-pattern="outline"]` via `inset 0 0 0 1px` and `[data-pattern="hatch"]` via `repeating-linear-gradient(-45deg, ...)`.

```css
.cs-chart {
    --cs-chart-hatch-bg-opacity: 0.14;
    --cs-chart-hatch-stripe-opacity: 0.85;
    --cs-chart-outline-fill-opacity: 0.09;
}

:root[data-theme="dark"] .cs-chart {
    --cs-chart-hatch-bg-opacity: 0.18;
    --cs-chart-hatch-stripe-opacity: 0.88;
    --cs-chart-outline-fill-opacity: 0.12;
}
```

---

### 9.2 Per-Datum Conditional Coloring & Persistent `data-selected` State

#### Per-Datum Conditional Coloring
- Any datum may override its series fill with an explicit color or semantic tone (`positive` → `--cs-chart-positive`, `caution` → `--cs-chart-caution`, `negative` → `--cs-chart-negative`, `neutral` → `--cs-chart-series-10`).
- Inside value labels recompute contrast per datum (`white` on dark/saturated tones, `var(--cs-color-base-950)` on light tones such as `caution-400` in dark mode or `200`–`300` monotone tints).
- When combined with `pattern="hatch"` or `"outline"`, the resolved datum color drives the pattern stripe/stroke directly.

#### Persistent `data-selected` State (Distinct from Transient Hover)
Hover is soft and ephemeral (`--cs-chart-dim-opacity: 0.24` + hover band); selection (`data-selected`) is crisp, anchored, and stays visually distinct even while hovering another mark:

- **Peer Softening (`[data-has-selection]`):**
  - Unselected marks soften to `--cs-chart-unselected-opacity: 0.38` (calmer than hover dimming so surrounding data stays legible).
  - If the user hovers a *different* unselected mark while a selection is active, the hovered peer lifts to `opacity: 0.88` while the selected mark holds `opacity: 1`.
- **Selected Mark Treatment (Pure SVG, Zero `<filter>`):**
  - **Bars / Columns / Waterfall:** Render a dedicated sibling `<path>`/`.cs-chart-selection-ring` expanded `2.5px` outward around the selected bar (`radius = capRadius + 2.5px`, `fill: none`, `stroke: var(--cs-chart-selected-ring)`, `stroke-width: 1.75px`). Because the `2.5px` gap reveals the underlying surface (`--cs-chart-point-ring-bg`), the selection halo stays razor-sharp without eating into the bar fill.
  - **Line / Area / Scatter Points:** Persistent solid dot (`r = calc(var(--cs-chart-point-radius) + 0.5px)`) + `2px` `--cs-chart-point-ring-bg` cutout stroke + outer `1.5px` ring (`r + 3.5px`, `fill: none`, `stroke: var(--cs-chart-selected-ring)`).
  - **Donut / Pie Slices:** Persistent `+4px` radial offset (vs. `+3px` on hover) + `1.75px` outer arc stroke in `--cs-chart-selected-ring` offset `2.5px` beyond the slice's outer radius; center KPI locks to the selected slice when no other slice is hovered.
- **Tokens & Motion:**
  - `--cs-chart-selected-ring: var(--cs-color-text-strong);`
  - `--cs-chart-unselected-opacity: 0.38;`
  - Selection ring enters via `opacity: 0 → 1`, `scale: 0.96 → 1` (`transform-box: fill-box; transform-origin: center`) over `--cs-dur-160` `--cs-spring-snappy`. Peer opacity transitions over `--cs-dur-effect` (`160ms`) `--cs-ease-effect`.

---

### 9.3 100% Normalized Stacked (`mode="percent"`) & Direct End-of-Line Labels

#### 100% Normalized Stacked (`mode="percent"`)
- **Axis Scale:** Locks domain to `[0, 1]` with formatted ticks `0%`, `25%`, `50%`, `75%`, `100%` (`md`/`lg`) or `0%`, `50%`, `100%` (`sm`).
- **Tooltip Dual Readout:** Each series row renders both raw value and normalized share on one aligned line (`$420k · 48%`):
  - `.cs-chart-tooltip-value`: primary raw value (`12px`, `weight: 600`, `--cs-color-text-strong`, `tabular-nums`, `NumberMorph`).
  - `.cs-chart-tooltip-sep`: `·` (`color: var(--cs-color-text-weaker)`, `padding-inline: 3px`).
  - `.cs-chart-tooltip-share`: percentage share (`11px`, `weight: 500`, `--cs-color-text-weak`, `tabular-nums`).
  - Optional `.cs-chart-tooltip-total` footer shows the raw category sum (`Total  $875k`).

#### Direct End-of-Line Labels (`directLabels`)
Replaces or complements the top/bottom legend on multi-series `LineChart` / `AreaChart`:
- **Margin & Anchor:** Auto-expand right plot margin (`88px–136px`, capped at `32%` of canvas width). Anchor labels at `x = plotRight + 8px`, `text-anchor="start"`, `dominant-baseline="central"`.
- **Typography (Pure SVG `<text>`):**
  - Series name: `11px`, `weight: 600`, `fill: <series-color>` (using calibrated `--cs-chart-series-*` tokens).
  - Inline latest value (`<tspan dx="5">`): `11px`, `weight: 500`, `fill: var(--cs-color-text-weak)`, `font-variant-numeric: tabular-nums lining-nums`.
- **Vertical Collision Relaxation:**
  - Enforce a strict `14px` minimum vertical center-to-center spacing (`minGap = 14px`) via iterative relaxation clamped inside `[plotTop + 6, plotBottom - 6]`.
  - When a label is nudged `> 3px` from its true endpoint `y`, draw a whisper `1px` leader `<path>` (`stroke: <series-color>`, `stroke-opacity: 0.35`, `stroke-linecap: round`) from `(plotRight + 2, yTrue)` to `(plotRight + 6, yNudged)`.
- **Choreography & Dimming:** Direct labels fade in near the tail of the line reveal (`opacity: 0 → 1`, `--cs-dur-200`, `--cs-ease-quad-out`, `280ms` delay) and participate in `[data-dimmed]` (`--cs-chart-dim-opacity: 0.24`) over `--cs-dur-effect`.

---

### 9.4 `<Sparkline>` Micro-Chart

Ultra-compact, zero-chrome trend mark engineered for **zero layout shift** inside `KpiCardVisual` and `DataTable` cells:

- **Container & Layout Stability:**
  - Defaults to frameless `transparent` (`padding: 0`, `border-radius: 0`, `box-shadow: none`), `display: block`, `inline-size: 100%`, explicit `block-size` so height is reserved from first paint:
    - `KpiCardVisual` context: `block-size: 52px` (`width: 100%`).
    - `DataTable` cell context: `block-size: 24px` (compact) or `28px` (comfortable), typical `inline-size: 72px–112px`.
  - Internal SVG inset: `4px` top/bottom padding; `4px` right padding when `showEndDot` is enabled so the `2.5px` dot + `1.5px` cutout ring never clips.
  - `--cs-chart-point-ring-bg` resolves to `var(--cs-chart-backdrop-bg, var(--cs-color-elevated))` inside cards/elevated tables, or `var(--cs-color-canvas)` on canvas.
- **Line & Area Geometry:**
  - Stroke: `1.5px`, `stroke-linecap: round`, `stroke-linejoin: round`, `vector-effect: non-scaling-stroke`.
  - Area wash: vertical `<linearGradient>` from `--cs-chart-sparkline-area-top-opacity` (`light: 0.18`, `dark: 0.22`) to `0` at the bottom baseline.
  - End-dot (`showEndDot`): `<circle r="2.5" />` filled with series color + `stroke: var(--cs-chart-point-ring-bg)`, `stroke-width: 1.5px`.
- **Bar Geometry (`type="bar"`):**
  - `2px` inter-bar gap, `2px` top cap radius (clamped to `barWidth / 2`), `min-bar-height: 2px` for non-zero values, integer-snapped coordinates.
- **Target Hairline (`target`):**
  - Crisp `1px` horizontal dashed `<line>` (`stroke-dasharray: 3 2`, `y = floor(y) + 0.5`, `shape-rendering="crispEdges"`) in `--cs-chart-axis` (neutral) or semantic `--cs-chart-{positive|caution|negative}`.
- **Motion (Crisp Micro-Cadence):**
  - Line reveal: `--cs-dur-320` (`320ms`), `--cs-ease-expo-out`; area wash fade: `--cs-dur-240`, `40ms` delay; end-dot pop: `--cs-dur-180`, `--cs-spring-snappy`, `220ms` delay.
  - Bar mount: `--cs-dur-280` (`280ms`), `--cs-ease-quart-out`, micro-stagger `min(index * 10ms, 100ms)`.
  - Interactive scrub is opt-in (off by default in dense tables); when enabled, renders a `1px` `--cs-chart-crosshair` + `2.5px` active dot with `1.5px` cutout ring.

```css
.cs-chart-sparkline {
    --cs-chart-sparkline-area-top-opacity: 0.18;
    display: block;
    inline-size: 100%;
    block-size: var(--cs-chart-sparkline-height, 52px);
    min-inline-size: 0;
}

:root[data-theme="dark"] .cs-chart-sparkline {
    --cs-chart-sparkline-area-top-opacity: 0.22;
}
```

---

### 9.5 `<WaterfallChart>` (Bridge Chart)

Built for P&L bridges, ARR movements, and variance walkdowns:

- **Semantic Role Palette:**
  - `start` / `subtotal` / `total` (anchor pillars): `--cs-chart-waterfall-total` = `light-dark(var(--cs-color-slate-700), var(--cs-color-slate-300))` so calm neutral totals frame chromatic deltas without competing with them. (Optional `totalTone="accent"` switches anchor pillars to `var(--cs-chart-series-1)`.)
  - Positive delta (`> 0`): `var(--cs-chart-positive)`.
  - Negative delta (`< 0`): `var(--cs-chart-negative)`.
- **Bar Geometry & Zero-Baseline:**
  - Anchor pillars extend from `yZero` and round **only their outer cap** (`--cs-chart-bar-radius`).
  - Floating delta steps round their **direction tip** (`--cs-chart-bar-radius`, top for positive, bottom for negative) and apply a subtle `1.5px` radius on their origin edge so floating blocks feel crafted without looking like pills.
  - When values cross zero, render `.cs-chart-grid-zero[data-style="strong"]` (`1.5px` `--cs-chart-zero-line-strong`).
- **Step Connector Hairlines:**
  - `1px` horizontal dashed `<line>` (`stroke-dasharray: 3 2`, `stroke: var(--cs-chart-axis)`, snapped to `floor(y) + 0.5`, `shape-rendering="crispEdges"`) spanning cleanly from the trailing edge of bar `i` (`x1 = bar[i].x + bar[i].width`) to the leading edge of bar `i + 1` (`x2 = bar[i+1].x`) at the running cumulative `y`.
- **Signed Outside Labels:**
  - Deltas always format with explicit sign (`+$1.4M`, `-$320k`); anchor pillars format unsigned (`$4.2M`).
  - Placement: `6px` clearance above positive deltas/totals and `6px` below negative deltas (automatically flipping above if clearance to X-axis ticks `< 14px`).
  - Typography: `var(--cs-chart-value-label-size)` (`10px / 11px`), `tabular-nums`, `3px` `--cs-chart-point-ring-bg` halo (`paint-order: stroke fill`); `weight: 600` + `--cs-color-text-strong` for totals, `weight: 500` + `--cs-chart-positive-fg` / `--cs-chart-negative-fg` for signed deltas.
- **Baseline-Anchored Staggered Mount:**
  - Anchor pillars grow from `yZero`; floating deltas grow strictly from their **previous cumulative baseline `yPrev`** (`transform-origin` locked to `yPrev`, so positive steps rise upward and negative steps drop downward).
  - Duration `--cs-chart-dur-bar` (`420ms`), `--cs-chart-ease-data` (`quart-out`), **zero overshoot**.
  - Sequential left-to-right stagger `min(index * 32ms, 260ms)` so the eye follows the bridge equation; connector hairlines fade in smoothly (`opacity: 0 → 1`, `--cs-dur-200`, `180ms` delay).

---

### 9.6 `<BulletChart>` (IBCS Plan / Actual / Target Scorecard)

Compact horizontal scorecard replacing bloated gauge widgets with high-density plan-vs-actual clarity:

#### Row Rhythm & Density Scale (`sm | md | lg`)
| Metric | `sm` | `md` | `lg` |
| :--- | :--- | :--- | :--- |
| Row Pitch (`rowHeight`) | `34px` | `44px` | `54px` |
| Row Gap | `8px` | `12px` | `16px` |
| Qualitative Track Height (`trackH`) | `12px` | `16px` | `20px` |
| Track Corner Radius (`rx`) | `4px` | `5px` | `6px` |
| Centered Actual Bar Height (`50%` of `trackH`) | `6px` | `8px` | `10px` |
| Actual Bar Right Cap Radius | `2px` | `2.5px` | `3px` |
| Target Tick Height (`barH + 6px`, `+3px` past bar) | `12px` | `14px` | `16px` |
| Label / Readout Font Size | `11px` | `12px` | `13px` |

- **3-Step Calm Monochrome Qualitative Range Track:**
  - Render the 3 contiguous range `<rect>` segments inside a single rounded `<clipPath>` (`rx = trackRadius`) so outer ends are smooth while internal tier boundaries remain razor-sharp vertical seams.
  - Mix against `var(--cs-chart-point-ring-bg)` so all 3 tiers remain opaque and evenly stepped across `elevated`, `soft`, `sunken`, and `transparent` in both Light and Dark mode:
```css
.cs-chart {
    --cs-chart-bullet-range-1: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 15%, var(--cs-chart-point-ring-bg)),
        color-mix(in oklch, var(--cs-color-base-100) 20%, var(--cs-chart-point-ring-bg))
    );
    --cs-chart-bullet-range-2: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 9.5%, var(--cs-chart-point-ring-bg)),
        color-mix(in oklch, var(--cs-color-base-100) 13%, var(--cs-chart-point-ring-bg))
    );
    --cs-chart-bullet-range-3: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 4.5%, var(--cs-chart-point-ring-bg)),
        color-mix(in oklch, var(--cs-color-base-100) 6.5%, var(--cs-chart-point-ring-bg))
    );
    --cs-chart-bullet-target: var(--cs-color-text-strong);
}
```
- **Centered Actual Bar:** Vertically centered inside the track (`y = trackY + trackH * 0.25`), filled with `var(--cs-chart-series-1)` (or per-row semantic `positive | caution | negative` / monochrome `var(--cs-color-base-solid)`).
- **Crisp Target Tick Marker:** `<rect width="2.5" height="{barH + 6}" rx="1.25" />` centered on `x = targetX`, extending `3px` above and `3px` below the actual bar, filled with `var(--cs-chart-bullet-target)` + `1px` `var(--cs-chart-point-ring-bg)` halo (`paint-order: stroke fill`) so the marker never merges when the actual bar crosses past target.
- **Inline Header Row (Pure SVG, Zero Left-Gutter Waste):**
  - Positioned `5px` above each track: flush-left metric label (`weight: 500`, `--cs-color-text-strong`) + optional muted unit/subtitle (`11px`, `--cs-color-text-weak`); flush-right `tabular-nums` readout (`text-anchor="end"`): actual value (`weight: 600`, `--cs-color-text-strong`) followed by ` / {target}` (`weight: 400`, `--cs-color-text-weak`).
  - Optional shared scale ticks render beneath the final row (`10px`/`11px`, `--cs-chart-tick-fg`, `tabular-nums`).
- **Motion:** Actual bars grow horizontally from `0` (`scaleX(0) → 1`) over `--cs-chart-dur-bar` (`420ms`), `--cs-chart-ease-data` (`quart-out`), staggered `min(rowIndex * 45ms, 220ms)`. Target ticks fade + scale in vertically (`scaleY(0.5) → 1`) over `--cs-dur-240` `--cs-spring-snappy` (`120ms` delay).

---

### 9.7 `<HeatmapChart>` (Matrix / Cohort Grid)

Designed for retention cohorts, weekday×hour load matrices, and correlation grids:

- **Cell Geometry & Gutter:**
  - Pure SVG `<rect>` cells snapped to integer coordinates, with `rx`/`ry` = `4px` (`sm`), `5px` (`md`), `6px` (`lg`), clamped to `min(cellRadius, cellWidth / 4, cellHeight / 4)`.
  - Inter-cell gutter: `2px` (`sm` or dense grids `> 12` columns) / `3px` (`md` & `lg`).
  - Null / missing cells render as a quiet flat recess: `--cs-chart-heatmap-empty: light-dark(color-mix(in oklch, var(--cs-color-base-900) 4%, var(--cs-chart-point-ring-bg)), color-mix(in oklch, var(--cs-color-base-100) 6%, var(--cs-chart-point-ring-bg)))`.
- **Calibrated 7-Step OKLCH Color Ramps (Light & Dark Mode):**
  - **Sequential (`scale="sequential"`, default `ramp="accent"`, plus `emerald | amber | violet | rose | slate`):**
    | Step | Normalized `t` | Light Mode Token (`<hue>`) | Dark Mode Token (`<hue>`) |
    | :--- | :--- | :--- | :--- |
    | `1` | `0.00–0.14` | `color-mix(in oklch, <hue-500> 8%, var(--cs-chart-point-ring-bg))` | `color-mix(in oklch, <hue-500> 14%, var(--cs-chart-point-ring-bg))` |
    | `2` | `0.15–0.28` | `var(--cs-color-<hue>-100)` | `color-mix(in oklch, var(--cs-color-<hue>-900) 65%, var(--cs-color-<hue>-800))` |
    | `3` | `0.29–0.42` | `var(--cs-color-<hue>-200)` | `var(--cs-color-<hue>-800)` |
    | `4` | `0.43–0.57` | `var(--cs-color-<hue>-300)` | `var(--cs-color-<hue>-700)` |
    | `5` | `0.58–0.71` | `var(--cs-color-<hue>-500)` | `var(--cs-color-<hue>-500)` |
    | `6` | `0.72–0.85` | `var(--cs-color-<hue>-600)` | `var(--cs-color-<hue>-400)` |
    | `7` | `0.86–1.00` | `var(--cs-color-<hue>-700)` | `var(--cs-color-<hue>-300)` |
  - **Diverging (`scale="diverging"`, 7 steps centered on `0` / midpoint):**
    | Step | Role | Light Mode Token | Dark Mode Token |
    | :--- | :--- | :--- | :--- |
    | `-3` | Deep negative | `var(--cs-color-negative-600)` | `var(--cs-color-negative-400)` |
    | `-2` | Mid negative | `var(--cs-color-negative-400)` | `var(--cs-color-negative-600)` |
    | `-1` | Soft negative | `var(--cs-color-negative-200)` | `var(--cs-color-negative-800)` |
    | `0` | Neutral midpoint | `color-mix(in oklch, var(--cs-color-base-900) 6%, var(--cs-chart-point-ring-bg))` | `color-mix(in oklch, var(--cs-color-base-100) 10%, var(--cs-chart-point-ring-bg))` |
    | `+1` | Soft positive | `var(--cs-color-positive-200)` | `var(--cs-color-positive-800)` |
    | `+2` | Mid positive | `var(--cs-color-positive-400)` | `var(--cs-color-positive-600)` |
    | `+3` | Deep positive | `var(--cs-color-positive-600)` | `var(--cs-color-positive-400)` |
- **Automatic Foreground Contrast Threshold (`tabular-nums` Cell Values):**
  - Typography: `10px` (`sm`) / `11px` (`md`/`lg`), `weight: 500`, `tabular-nums`, centered (`text-anchor="middle"`, `dominant-baseline="central"`). Auto-suppress when `cellWidth < 28px` or `cellHeight < 20px`.
  - **Light mode:** `t < 0.55` (steps `1`–`4` / `-1..+1`) → `var(--cs-color-base-900)`; `t >= 0.55` (steps `5`–`7` / `±2..±3`) → `white`.
  - **Dark mode:** `t < 0.62` (steps `1`–`4` / `-2..+2`) → `var(--cs-color-base-100)`; `t >= 0.62` (luminous steps `5`–`7` / `±3`) → `var(--cs-color-base-950)`.
- **Crisp Active-Cell Ring (Hover & Selection):**
  - Pure SVG overlay `<g class="cs-chart-heatmap-focus" pointer-events="none">` rendered above the cell matrix:
    - Inner gap `<rect>`: expanded `0.75px` around the cell, `fill: none`, `stroke: var(--cs-chart-point-ring-bg)`, `stroke-width: 1.5px`, `rx = cellRadius + 0.75px`.
    - Outer ring `<rect>`: expanded `2px` around the cell, `fill: none`, `stroke: var(--cs-color-text-strong)`, `stroke-width: 2px`, `rx = cellRadius + 2px`.
  - Matching X and Y axis tick labels promote to `--cs-color-text-strong` (`weight: 600`) while a cell is active for instant row/column triangulation.
- **Compact Horizontal Gradient Ramp Legend:**
  - Lives in the `.cs-chart-legend` slot (`display: inline-flex; align-items: center; gap: 8px;`):
    - Min label (`11px`, `--cs-color-text-weak`, `tabular-nums`) + gradient pill (`inline-size: 120px` at `sm` / `148px` at `md`/`lg`, `block-size: 8px`, `border-radius: 9999px`, `background-image: linear-gradient(to right, <step-1 .. step-7>)`) + Max label (`11px`, `--cs-color-text-weak`, `tabular-nums`).
    - On cell hover, a `2px × 12px` indicator notch (`background: var(--cs-color-text-strong)`, `border-radius: 9999px`, `box-shadow: 0 0 0 1.5px var(--cs-chart-point-ring-bg)`) glides along the bar over `--cs-dur-80` `--cs-ease-cubic-out` to pinpoint the hovered cell's value in the distribution.
- **Motion:**
  - Mount: calm diagonal wave (`opacity: 0 → 1`, `scale: 0.92 → 1`, `transform-box: fill-box; transform-origin: center`) over `--cs-dur-240` `--cs-ease-quart-out`, staggered `min((row + col) * 12ms, 220ms)`.
  - Active-cell ring: opacity fades over `--cs-dur-effect-fast` (`100ms`); position glides over `--cs-dur-60` `--cs-ease-quad-out`.
