# Charts — Implementation & Testing Milestones

Incremental engineering roadmap for `src/modules/charts/` (`cs/svelte/charts`), aligned with [charts.blueprint.md](./charts.blueprint.md), [charts.design.md](./charts.design.md), and `.agents/rules/naming.md`.

## Finalized Baseline Decisions

- **Dependencies:** `d3-scale`, `d3-shape`, `d3-array`, `d3-time` in `dependencies`; `@types/d3-scale`, `@types/d3-shape`, `@types/d3-array`, `@types/d3-time` in `devDependencies`. Strictly pure-math/geometry — zero `d3-selection`, `d3-transition`, or `d3-axis`.
- **Shell `variant`:** `"elevated" | "soft" | "sunken" | "transparent"` (exact 1:1 parity with `Card` and `KpiCard`; both `variant` and `size` required with no defaults).
- **Color Palette:** 10 ordered categorical slots (`--cs-chart-series-1..10`), interleaved monotone single-hue ramps (`monotone` / palette modes), and semantic status tokens (`positive`, `caution`, `negative`).
- **Polar Chart:** `DonutChart` only (`innerRadiusRatio={0}` renders a full Pie).
- **`NumberMorph` in `ChartTooltip`:** Direct integration via `../number-morph/index.ts` (`willChange={false}`, `respectMotionPreference={true}`, no fallback path).
- **Export Readiness:** 100% native SVG inside `<svg>` (zero `<foreignObject>`, zero SVG `<filter>`).

## Dependency Order Overview

```text
M0 Kernel & State ─▶ M1 Shell, Canvas, Axes & Palettes ─▶ M2 Scrubbing, Crosshair, Tooltip & Legend
                                                                        │
                        ┌───────────────────────────────────────────────┴────────────────────┐
                        ▼                                                                    ▼
               M3 Line & Area ──▶ M4 Bar (Vert/Horiz/Stack/Diverging) ──▶ M5 Refs, Annotations & Composed
                                                                                             │
                                                                                             ▼
                                                                             M6 DonutChart & Polar ──▶ M7 Polish, A11y & Docs
```

---

## M0 — Dependencies, Math Kernel, Measurement & Reactive State

### 1. Goal & Scope
Establish the pure-TypeScript math/geometry kernel, offscreen text measurement, and Svelte 5 reactive state/context layer with zero UI components yet. Every scale, path generator, bisector, and margin calculation must be deterministic and unit-tested in isolation before any SVG renders.

### 2. Files to Create / Update
- **Update:** `package.json` (add `d3-scale`, `d3-shape`, `d3-array`, `d3-time` + `@types/d3-*` via `bun add` / `bun add -d`).
- **Create:**
  - `src/modules/charts/chart-scales.internal.ts` — X (`auto | band | point | time | linear`), Y, and Y2 scale builders; `includeZero` & domain padding; single-point / all-zero guards; nice tick generation.
  - `src/modules/charts/chart-geometry.internal.ts` — Line/area path generators (`linear | monotone | step`, `defined()` null gaps); grouped, stacked, and diverging (`stackOffsetDiverging`) bar rect geometry with clamped outer-only cap radii; rounded donut/pie arc geometry (`padAngle`, `cornerRadius`); bisector index lookup; `snapHalf(v)` (`Math.floor(v) + 0.5`) and `snapInt(v)` (`Math.round(v)`) helpers.
  - `src/modules/charts/chart-measure.internal.ts` — Cached `CanvasRenderingContext2D.measureText()` helper (with deterministic fallback when canvas context is unavailable in `happy-dom`); pixel-budget ellipsis truncation; X-axis auto-skip collision thinning; 2-line word wrap; rotated-tick (`-35°`/`-45°`) margin expansion; dynamic `{ top, right, bottom, left }` margin calculator.
  - `src/modules/charts/chart-state.svelte.ts` — Reactive `ChartState` class (Svelte 5 runes): container/plot dimensions, computed margins, active scales, series registry, `hiddenSeriesIds`, `activeIndex`, `hoveredSeriesId`, and series color slot resolution.
  - `src/modules/charts/chart.context.ts` — Typed Svelte 5 `createContext()` (`getChartContext`, `setChartContext`, `hasChartContext`, `ChartContext`).
  - `src/modules/charts/index.ts` — Initial barrel exporting constants (`CHART_VARIANTS`, `CHART_SIZES`, `CHART_PALETTES`, `CHART_TONES`, etc.), types (`ChartSeries`, `ChartAxisConfig`, `ChartTooltipContext`, etc.), `ChartState`, and context helpers (zero `*.internal.*` exports).
  - `src/modules/charts/charts.test.ts` — Unit test suite for M0 kernel modules.

### 3. Verification & Testing Gate
- **Vitest Unit (`bunx --bun vitest run src/modules/charts/charts.test.ts`):**
  - Scale type inference (`Date` → `time`, `string` → `band`/`point`, `number` → `linear`).
  - Edge domains: empty data, single datum, all-zero values, all-negative values, negative-to-positive zero-crossing, dual Y/Y2 independent domains.
  - Path/geometry checks: `defined()` breaks on `null`/`NaN`/`undefined`, `connectNulls=true` bridges gaps, `stackOffsetDiverging` stacks positives up and negatives down from `0`, bar cap radius clamps to `min(radius, thickness / 2, length)`, `snapHalf` produces `n + 0.5`.
  - Measurement checks: truncation appends `…` within budget, auto-skip guarantees minimum gutter, 2-line wrap caps at 2 lines, rotated ticks expand `margin.bottom`.
  - `ChartState` checks: toggling `hiddenSeriesIds`, `hoveredSeriesId` dimming logic, and `activeIndex` clamping.
- **Static Checks:** `bun run typecheck` and `bun run lint` pass with 0 errors.

### 4. Done Criteria
- [ ] D3 micro-packages installed; zero `d3-selection`/`d3-transition`/`d3-axis` imports anywhere.
- [ ] All M0 unit tests in `charts.test.ts` pass.
- [ ] `index.ts` exports zero `*.internal.*` modules.
- [ ] `bun run typecheck` and `bun run lint` green.

---

## M1 — Core Shell, Palette CSS, Plot Canvas, Grid, Axes & Empty/Loading States

### 1. Goal & Scope
Deliver the visual shell, full OKLCH palette CSS, responsive `<ChartCanvas>` stage, `<ChartGrid>`, `<ChartAxis>`, outer header primitives, and `<ChartEmpty>` / `<ChartLoading>` states. At the end of M1, an empty-mark Cartesian frame renders crisply in the playground across all variants, sizes, palettes, and light/dark themes.

### 2. Files to Create / Update
- **Create:**
  - `src/modules/charts/charts.css` — `@layer components.composite` stylesheet:
    - 4 shell variants (`elevated`, `soft`, `sunken`, `transparent`) + opaque cutout backing `--cs-chart-point-ring-bg`.
    - Concentric `[data-nested]` radius & `--cs-squircle-smooth` integration.
    - `sm | md | lg` density tokens aligned 1:1 with `Card` and `KpiCard`.
    - 10-slot `--cs-chart-series-1..10` categorical palette, interleaved monotone single-hue ramps, and semantic status tokens (`positive | caution | negative`).
    - Structural tokens (`--cs-chart-grid`, `--cs-chart-axis`, `--cs-chart-crosshair`, `--cs-chart-hover-band`), SVG tabular typography, empty/loading shimmer, and focus ring rules.
  - `src/modules/charts/Chart.svelte` — Root `<figure class="cs-chart">`, required `variant` & `size`, `palette`, `createSurfaceRadius`, `ChartState` & `ChartContext` provider, `ref = $bindable(null)`.
  - `src/modules/charts/ChartHeader.svelte`, `ChartTitle.svelte`, `ChartDescription.svelte`, `ChartActions.svelte`.
  - `src/modules/charts/ChartCanvas.svelte` — `ResizeObserver` (rAF-coalesced), zero-size render guard, integer-pixel `<svg>` host (`svgRef = $bindable(null)`), `<defs>` plot `clipPath`, deterministic `<g>` layer order.
  - `src/modules/charts/ChartGrid.svelte` — Horizontal/vertical `1px` hairlines snapped to `floor(v) + 0.5` (`shape-rendering="crispEdges"`) + emphasized zero-baseline when domain crosses `0`.
  - `src/modules/charts/ChartAxis.svelte` — `bottom | left | right` axes; hidden Y-axis spine by default; smart auto-skip, truncation (`<title>` with full label), 2-line wrap, angled ticks (`-35°`/`-45°`), optional axis title.
  - `src/modules/charts/ChartEmpty.svelte` — Quiet empty frame + localized all-series-hidden state with `<Button variant="ghost" size="xs">` (`Show all`).
  - `src/modules/charts/ChartLoading.svelte` — Calm `--cs-color-base-soft` shimmer silhouette matching `--cs-chart-plot-height`.
  - `src/modules/charts/Charts.preview.svelte` — Initial playground scaffold verifying shell variants, sizes, nested-in-`Card` concentric radii, palettes, long axis labels, and empty/loading states.
  - `src/modules/charts/charts.svelte.test.ts` + `src/modules/charts/ChartTestHost.internal.svelte` — Component tests for M1 primitives.
- **Update:** `src/modules/charts/index.ts` (export M1 components).

### 3. Verification & Testing Gate
- **Vitest DOM (`bunx --bun vitest run src/modules/charts/charts.svelte.test.ts`):**
  - `Chart` sets `data-variant`, `data-size`, `data-palette`, `data-nested`, `data-loading`, `data-empty` correctly and binds `ref`.
  - `ChartCanvas` guards mark rendering when dimensions are `0×0` and exposes `svgRef`.
  - `ChartAxis` renders `bottom`/`left`/`right` ticks with `tabular-nums`, truncates overflowing labels with `<title>`, and skips colliding ticks.
  - `ChartEmpty` renders localized empty message and fires reset callback when all series are hidden.
- **Playwright Visual Check (`bun run dev` → `Charts` preview):**
  - Inspect all 4 variants (`elevated`, `soft`, `sunken`, `transparent`) in Light and Dark mode; verify `sunken`/`transparent` nested inside `Card` has concentric radii and no double shadow.
  - Verify `1px` gridlines are crisp with zero clipping of long Y-axis currency labels (`€1,250,000`) or angled X-axis category labels.
  - Verify zero console errors and zero `<foreignObject>` inside `<svg>`.
- **Static Checks:** `bun run typecheck` and `bun run lint`.

### 4. Done Criteria
- [ ] All 4 shell variants (`elevated | soft | sunken | transparent`) and 3 sizes (`sm | md | lg`) match `Card`/`KpiCard` geometry.
- [ ] Dynamic margins prevent tick label clipping without manual margin tuning.
- [ ] Playground visual check passes in Light and Dark modes.
- [ ] Unit/component tests, `typecheck`, and `lint` pass.

---

## M2 — Interactive Scrubbing, Crosshair, Floating Tooltip (`NumberMorph`), Legend & Overlay

### 1. Goal & Scope
Implement the complete interactive layer shared by all charts: pointer bisector & keyboard scrubbing, `<ChartCrosshair>`, top-layer `popover="manual"` `<ChartTooltip>` with direct `NumberMorph` integration, interactive `<ChartLegend>` with series toggle + hover/focus isolation, and `<ChartOverlay>`.

### 2. Files to Create / Update
- **Update:**
  - `src/modules/charts/ChartCanvas.svelte` — Add pointermove/pointerleave bisector scrubbing, cached SVG bounding rect (updated on `pointerenter` / resize / passive scroll), keyboard scrubbing (`ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Home`/`End`/`Escape`/`Enter`/`Space`), `onPointClick`, and `.cs-chart-sr-live` (`aria-live="polite"`).
  - `src/modules/charts/charts.css` — Add styles for `.cs-chart-crosshair`, `.cs-chart-hover-band`, `.cs-chart-tooltip`, `.cs-chart-legend`, `.cs-chart-legend-item`, `.cs-chart-overlay`, and `.cs-chart-sr-live`.
  - `src/modules/charts/index.ts` — Export M2 components.
- **Create:**
  - `src/modules/charts/ChartCrosshair.svelte` — Snapped hairline rule, optional category hover band, and active point highlight dot (`--cs-chart-point-ring-bg` cutout ring + soft outer halo).
  - `src/modules/charts/ChartTooltip.svelte` — Native `popover="manual"` floating card (`--cs-color-elevated`, `--cs-shadow-floating`, `--cs-squircle-smooth`, `pointer-events: none`), GPU `translate3d(round(x), round(y), 0)`, horizontal flip with `16px` hysteresis + viewport clamping, instant-first / glide-after motion, direct `NumberMorph` (`willChange={false}`, `respectMotionPreference={true}`) value readouts, optional `showTotal`, and `children?: Snippet<[ChartTooltipContext]>`.
  - `src/modules/charts/ChartLegend.svelte` — Outer HTML interactive legend (`top | bottom | end`), mark-matched swatch indicators, native `<button type="button" aria-pressed>`, hover/focus series isolation dimming siblings to `--cs-chart-dim-opacity`, `<HitArea />` for compact targets, `cursor: default`.
  - `src/modules/charts/ChartOverlay.svelte` — Plot-aligned HTML overlay host (`pointer-events: none` container; interactive children opt in).
- **Update:** `src/modules/charts/charts.svelte.test.ts` and `src/modules/charts/Charts.preview.svelte`.

### 3. Verification & Testing Gate
- **Vitest DOM (`charts.svelte.test.ts`):**
  - Keyboard scrubbing updates `activeIndex` across `ArrowRight`/`ArrowLeft`/`Home`/`End`, clears on `Escape`, triggers `onPointClick` on `Enter`/`Space`, and updates `.cs-chart-sr-live` text.
  - Clicking legend items toggles `aria-pressed` and updates `hiddenSeriesIds`; hiding all series triggers `ChartEmpty` with working `Show all` reset.
  - Hovering/focusing a legend item sets `hoveredSeriesId` and marks sibling series `data-dimmed`.
  - `ChartTooltip` opens via `popover="manual"`, renders `NumberMorph` values, handles `null` values as `—`, and renders custom `children` snippet when provided.
- **Playwright Interaction Check:**
  - Scrub cursor left-to-right across the plot: verify tooltip appears immediately at cursor (never flying from `(0, 0)`), flips sides cleanly near the right edge without flicker, and is never clipped by a parent `Card` with `overflow: clip`.
  - Tab to plot stage and scrub with arrow keys; tab to legend buttons and toggle with `Space`/`Enter`.
- **Static Checks:** `bun run typecheck` and `bun run lint`.

### 4. Done Criteria
- [ ] Tooltip uses native `popover="manual"` + GPU `translate3d` + direct `NumberMorph`.
- [ ] Legend toggle, hover/focus isolation, and keyboard scrubbing all work end-to-end.
- [ ] All M2 tests, Playwright checks, `typecheck`, and `lint` pass.

---

## M3 — `LineChart` & `AreaChart` (Tier-1 Marks + Tier-2 Components)

### 1. Goal & Scope
Build the first two complete Tier-2 business charts (`LineChart` and `AreaChart`) strictly by composing Tier-1 primitives (`ChartLine`, `ChartArea`, plus M1/M2 primitives) with zero duplicated scale or rendering logic.

### 2. Files to Create / Update
- **Create:**
  - `src/modules/charts/ChartLine.svelte` — SVG `<path>` per series (`monotone | linear | step`), `stroke-linecap="round"`, dashed stroke support, `connectNulls` (`false` default), `showDots` (`"active" | boolean`), direct value labels with `--cs-chart-point-ring-bg` halo, left-to-right clip-path mount reveal.
  - `src/modules/charts/ChartArea.svelte` — `overlay | stacked` modes, per-series vertical SVG `<linearGradient>` (`--cs-chart-area-top-opacity` → `0`), optional crisp top stroke (`showLine`), `connectNulls`, staggered stroke-then-fill reveal.
  - `src/modules/charts/LineChart.svelte` — Tier-2 batteries-included Line Chart (`variant`, `size`, `data`, `x`, `series`, `curve`, `showDots`, `connectNulls`, `tooltip`, `children` SVG slot).
  - `src/modules/charts/AreaChart.svelte` — Tier-2 batteries-included Area Chart (`mode="overlay" | "stacked"`, `curve`, `gradient`, `showLine`, `tooltip`, `children` SVG slot).
- **Update:**
  - `src/modules/charts/charts.css` (line/area stroke, gradient, and mount-reveal keyframes).
  - `src/modules/charts/index.ts` (export `ChartLine`, `ChartArea`, `LineChart`, `AreaChart`).
  - `src/modules/charts/charts.test.ts`, `src/modules/charts/charts.svelte.test.ts`, and `src/modules/charts/Charts.preview.svelte`.

### 3. Verification & Testing Gate
- **Vitest Unit & DOM:**
  - `LineChart` renders multi-series paths, breaks path segments on `null` when `connectNulls={false}`, bridges on `connectNulls={true}`, applies `stroke-dasharray` on `dashed: true`.
  - `AreaChart` renders stacked cumulative geometry in `mode="stacked"` and enables tooltip `showTotal` appropriately; toggling a legend series recalculates stacked baselines and Y domain.
  - Single-point dataset renders a visible dot without `NaN` path coordinates.
- **Playwright Visual Check:**
  - Inspect multi-series `LineChart` (with time scale, dashed forecast line, and null gap) and `AreaChart` (`overlay` + `stacked`) in Light & Dark modes and monotone palette.
  - Verify active point dot + cutout ring tracks crosshair smoothly during pointer scrub.
- **Static Checks:** `bun run typecheck` and `bun run lint`.

### 4. Done Criteria
- [ ] `LineChart` and `AreaChart` compose Tier-1 primitives cleanly and support custom `children` SVG layers and custom `tooltip` snippets.
- [ ] Stacked area legend toggling updates stack totals and domain cleanly.
- [ ] Tests, Playwright visual checks, `typecheck`, and `lint` pass.

---

## M4 — `BarChart` (Vertical / Horizontal, Grouped / Stacked / Diverging)

### 1. Goal & Scope
Deliver `ChartBar` and Tier-2 `BarChart` covering vertical columns, horizontal bars, grouped series, stacked series, and diverging positive/negative variance stacks with optical pixel snapping and long-label ergonomics.

### 2. Files to Create / Update
- **Create:**
  - `src/modules/charts/ChartBar.svelte` — Vertical & horizontal orientations; `grouped` & `stacked` (with `stackOffsetDiverging`); integer pixel snapping; clamped outer-cap-only corner radii (flipping to bottom/left on negative bars and applying only to outermost stack segment); `maxBarWidth`; `min-bar-height: 2px` for tiny non-zero values; `1.5px` segment separation in stacks; direct outside & contrast-safe inside value labels (auto-suppressed when bar is too small); baseline-anchored mount growth (`scaleY`/`scaleX`, zero overshoot).
  - `src/modules/charts/BarChart.svelte` — Tier-2 batteries-included Bar/Column Chart (`orientation="vertical" | "horizontal"`, `mode="grouped" | "stacked"`, `valueLabels`, `labelLayout="gutter" | "above"` for horizontal bars).
- **Update:**
  - `src/modules/charts/charts.css` (bar transitions, baseline growth animation, hover band).
  - `src/modules/charts/index.ts` (export `ChartBar`, `BarChart`).
  - `src/modules/charts/charts.test.ts`, `src/modules/charts/charts.svelte.test.ts`, and `src/modules/charts/Charts.preview.svelte`.

### 3. Verification & Testing Gate
- **Vitest Unit & DOM:**
  - Grouped vertical & horizontal rect coordinates snap to integer pixels and respect `maxBarWidth`.
  - Stacked diverging dataset (`positive` + `negative` values in same category) stacks upward and downward from the exact zero-baseline without overlap.
  - Negative bars flip rounded caps to bottom (vertical) / left (horizontal); internal stack segments have `0px` corner radius.
  - Tiny non-zero values clamp to `>= 2px` visual thickness; exact `0` renders `0px`.
  - Inside value labels auto-hide when `barLength < labelWidth + 14` or `barThickness < 18`.
- **Playwright Visual Check:**
  - Inspect grouped columns, stacked columns, diverging negative variance bars (with semantic `positive`/`negative` tones), and horizontal bars with long category labels (`gutter` truncation + `above` inline layout) in Light & Dark modes.
  - Verify category hover band and legend series toggle transitions.
- **Static Checks:** `bun run typecheck` and `bun run lint`.

### 4. Done Criteria
- [ ] All 4 bar combinations (`vertical`/`horizontal` × `grouped`/`stacked`) plus diverging negative stacks render with crisp pixel alignment.
- [ ] Long horizontal category labels never clip or crush the plot area.
- [ ] Tests, Playwright visual checks, `typecheck`, and `lint` pass.

---

## M5 — Reference Lines, Reference Bands, Annotations & `ComposedChart` (Dual Y-Axis)

### 1. Goal & Scope
Add analytical context layers (`ChartReferenceLine`, `ChartReferenceBand`, `ChartAnnotation`) and the Tier-2 `ComposedChart` combining Bars, Lines, and Areas on a shared X-axis with optional dual Y / Y2 axes.

### 2. Files to Create / Update
- **Create:**
  - `src/modules/charts/ChartReferenceLine.svelte` — Horizontal/vertical dashed `1px` hairline (`axis: "x" | "y" | "y2"`, `tone`, `color`, `dashed`) + inline semantic pill badge (`18px` height, `-soft` fill, `-soft-fg` text, zero border).
  - `src/modules/charts/ChartReferenceBand.svelte` — Horizontal/vertical target corridor (`from` → `to` on `x | y | y2`) with soft tint fill and optional label.
  - `src/modules/charts/ChartAnnotation.svelte` — Export-safe pure-SVG data-coordinate callout (`x`, `y`, `yAxis`, `dx`, `dy`, `label`, `tone`): `3.5px` anchor dot with cutout ring + `1px` leader line + SVG label pill (zero `<foreignObject>`).
  - `src/modules/charts/ComposedChart.svelte` — Tier-2 combo chart mixing `type: "bar" | "line" | "area"` series across `yAxis: "left" | "right"`, automatic right `ChartAxis` when any series targets `"right"`, unified crosshair & tooltip.
- **Update:**
  - `src/modules/charts/LineChart.svelte`, `AreaChart.svelte`, `BarChart.svelte` — Wire declarative `referenceLines` and `referenceBands` props.
  - `src/modules/charts/charts.css` (reference line/band/pill and annotation SVG styles).
  - `src/modules/charts/index.ts` (export `ChartReferenceLine`, `ChartReferenceBand`, `ChartAnnotation`, `ComposedChart`).
  - `src/modules/charts/charts.test.ts`, `src/modules/charts/charts.svelte.test.ts`, and `src/modules/charts/Charts.preview.svelte`.

### 3. Verification & Testing Gate
- **Vitest Unit & DOM:**
  - Dual Y/Y2 scales compute independent domains and dynamic `margin.right` accommodates formatted Y2 ticks (e.g. `100%`) without clipping.
  - `ChartReferenceLine`, `ChartReferenceBand`, and `ChartAnnotation` map coordinates accurately against `x`, `y`, and `y2` scales and render zero `<foreignObject>`.
  - `ComposedChart` renders bars behind lines/areas in deterministic SVG layer order and shows formatted values from both axes in a single tooltip.
- **Playwright Visual Check:**
  - Inspect executive `ComposedChart` (Revenue bars on left Y in `$`, Margin % line on right Y2 in `%`, target SLA band, budget reference line with pill badge, and peak-month annotation) in Light & Dark modes.
- **Static Checks:** `bun run typecheck` and `bun run lint`.

### 4. Done Criteria
- [ ] Declarative `referenceLines` & `referenceBands` work across all 4 Cartesian Tier-2 charts.
- [ ] `ComposedChart` handles dual Y-axis scaling, dynamic right margin, and unified tooltip cleanly.
- [ ] All analytical overlays are 100% native SVG (export-safe).
- [ ] Tests, Playwright visual checks, `typecheck`, and `lint` pass.

---

## M6 — `DonutChart` & Polar Geometry (`ChartArc`)

### 1. Goal & Scope
Implement polar part-to-whole visualization via `ChartArc` and Tier-2 `DonutChart` (`innerRadiusRatio={0.64}` default; `innerRadiusRatio={0}` for full Pie) with centered KPI callout, slice hover emphasis, and keyboard slice navigation.

### 2. Files to Create / Update
- **Create:**
  - `src/modules/charts/ChartArc.svelte` — `d3-shape` `pie()`/`arc()` paths, `innerRadiusRatio`, `padAngle`, `cornerRadius`, `+3px` subtle radial hover expansion, sibling dimming on slice/legend hover, radial sweep mount animation, optional `center` slot positioned cleanly inside the donut hole.
  - `src/modules/charts/DonutChart.svelte` — Tier-2 batteries-included Donut/Pie Chart (`value`, `name`, `innerRadiusRatio`, `centerLabel`, `centerValue`, `center` snippet with `NumberMorph`, `valueLabels`, `legend`, `tooltip`, keyboard `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown` slice scrubbing).
- **Update:**
  - `src/modules/charts/charts.css` (arc transitions, radial sweep, `.cs-chart-center` HTML KPI typography, vertical `end` legend layout).
  - `src/modules/charts/index.ts` (export `ChartArc`, `DonutChart`).
  - `src/modules/charts/charts.test.ts`, `src/modules/charts/charts.svelte.test.ts`, and `src/modules/charts/Charts.preview.svelte`.

### 3. Verification & Testing Gate
- **Vitest Unit & DOM:**
  - Polar geometry handles zero/negative slice values safely (filtered or clamped without `NaN`), single 100% slice renders complete ring, `innerRadiusRatio={0}` produces full Pie arcs.
  - Hovering/selecting a slice updates `activeIndex`, morphs center KPI readout, and cross-highlights the matching legend item; toggling legend items recalculates slice percentages and total.
  - Keyboard arrows step through slices and announce slice label + value + share via `.cs-chart-sr-live`.
- **Playwright Visual Check:**
  - Inspect `DonutChart` (center KPI + `NumberMorph` hover swap + `end` vertical legend) and full Pie (`innerRadiusRatio={0}`) in Light & Dark modes and monotone palette.
- **Static Checks:** `bun run typecheck` and `bun run lint`.

### 4. Done Criteria
- [ ] `DonutChart` cleanly covers both Donut (`innerRadiusRatio > 0`) and full Pie (`innerRadiusRatio={0}`).
- [ ] Center KPI, slice hover expansion, legend toggle, and tooltip all stay in sync.
- [ ] Tests, Playwright visual checks, `typecheck`, and `lint` pass.

---

## M7 — Polish, Accessibility, Export-Safety Audit, Docs & Full Playground

### 1. Goal & Scope
Harden edge cases, complete accessibility & reduced-motion audits, verify SVG export-safety, publish complete consumer documentation (`charts.docs.md`), and finalize the comprehensive interactive `Charts.preview.svelte` showcase.

### 2. Files to Create / Update
- **Create:**
  - `src/modules/charts/charts.docs.md` — Full consumer documentation (Tier-2 quickstarts, Tier-1 custom layer composition recipe, props/API tables, palette/monotone guide, nesting inside `Card`/`KpiCard`, accessibility & keyboard controls).
- **Update:**
  - `src/modules/charts/Charts.preview.svelte` — Complete interactive playground covering all 5 Tier-2 charts (`LineChart`, `AreaChart`, `BarChart`, `ComposedChart`, `DonutChart`), Tier-1 custom SVG layer example, all 4 variants, all 3 sizes, categorical + monotone + semantic palettes, Light/Dark mode, nested-in-`Card`/`KpiCard`, empty/loading states, and live data updates.
  - `src/modules/charts/charts.test.ts` & `src/modules/charts/charts.svelte.test.ts` — Add regression tests for reduced motion, theme switching, and SVG export cleanliness.
  - `src/modules/charts/index.ts` — Final public API & export audit.

### 3. Verification & Testing Gate
- **Reduced Motion & Theme Switching:**
  - Verify `prefers-reduced-motion: reduce` disables JS/SVG animations and passes `respectMotionPreference={true}` to `NumberMorph`; verify `[data-theme-switching]` causes zero transition flicker.
- **Export-Safety Audit:**
  - Assert `svg.querySelectorAll("foreignObject, filter").length === 0` across all 5 Tier-2 chart types in `charts.svelte.test.ts`.
  - Verify `svgRef` serializes cleanly via `XMLSerializer` with explicit integer `width`/`height`.
- **Full Repository Gate:**
  - `bun run test` — 100% passing.
  - `bun run typecheck` — 0 errors.
  - `bun run lint` — 0 errors / warnings.
  - `bun run build:docs` — builds cleanly with `charts.docs.md` and `Charts.preview.svelte`.
  - End-to-end Playwright walkthrough of `Charts.preview.svelte` in Light & Dark modes at desktop and narrow viewports.

### 4. Done Criteria
- [ ] All 5 Tier-2 charts + full Tier-1 primitive layer documented and showcased.
- [ ] Zero `<foreignObject>`, zero SVG `<filter>`, zero `*.internal.*` exports, zero UnoCSS in library files.
- [ ] `bun run test`, `bun run typecheck`, `bun run lint`, and `bun run build:docs` all pass cleanly.
