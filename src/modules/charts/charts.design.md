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
