# KPI Card Design Spec (`src/modules/kpi-card/`)

## 1. Visual Direction & The "3-to-4 Signal Rule"

`KpiCard` is a precision analytics and telemetry surface in `@layer components.composite`. It shares its exact shell DNA with [`Card`](../card/card.docs.md) while enforcing strict visual restraint so every metric reads instantaneously—like a Stripe, Linear, or Vercel instrument rather than a crowded template widget.

### Core Anti-Slop Principles

1. **The 3-to-4 Signal Rule (Zero Ballast):**
   A KPI card exists for peripheral scanning in under 300ms. Every card obeys a strict **3-to-4 signal budget**:
   - **Signal 1 (Required):** **Mini-Label** (`KpiCardLabel`) — 1–3 crisp words in `--cs-color-text-weak`.
   - **Signal 2 (Required):** **Hero Figure** (`KpiCardValue`) — bold, unified `--cs-color-text-strong`, tabular numerals.
   - **Signals 3–4 (Choose at most 1–2):**
     - `KpiCardDelta` + `KpiCardVisual` *(Trend & trajectory)*
     - `KpiCardDelta` + `KpiCardTarget` *(Quota & attainment)*
     - `KpiCardDelta` + `KpiCardComparison` *(Period-over-period, only when no chart or target is present)*
     - `KpiCardBreakdown` *(2–3 attribution rows, no extra chart or target)*
   - **Never** stack Title + Description + Comparison + Target + Sparkline in the same card.

2. **Pure Typography Over Cliché Icon Boxes:**
   - Default to a **pure typographic header** (`KpiCardLabel` alone, optionally paired with a trailing `Badge` or quiet plain glyph).
   - **Ban the `[Soft Icon Square] + Title + Description` AI-dashboard pattern.** Decorative pastel icon squares top-left add vertical bloat and compete with the primary number.
   - Omit `KpiCardDescription` from KPI cards. When a section needs narrative context, wrap a `KpiCardGroup` inside a standard [`Card`](../card/card.docs.md) using `CardHeader` and `CardDescription`.

3. **Unified Numeric Authority:**
   - Keep the entire numeric figure (`$148,920.45`, `99.94%`, `1,842`) unified at `600` weight in `--cs-color-text-strong`. Do **not** dim or shrink decimal/fractional digits (`subduedFraction` is removed); ragged partial dimming weakens visual confidence during live `NumberMorph` rolls.

4. **Borderless Monochrome Depth & 1:1 `Card` Shell Parity:**
   - Separates cards, nested wells, and breakdown rows strictly via surface contrast (`canvas` → `elevated` → `sunken` / `base-soft`), `--cs-shadow-*` tokens, and whitespace—zero raw CSS `border`.
   - Matches `Card`'s `variant` (`"elevated" | "soft" | "sunken" | "transparent"`), `size` (`"sm" | "md" | "lg"`), corner radii (`16px` / `24px` / `28px`), padding (`12px` / `16px` / `24px`), `--cs-squircle`, and concentric nesting chain pixel-for-pixel.
   - Direct `px` units everywhere; all component CSS variables use `--cs-kpi-card-*` (no `--_` private prefixes).

---

## 2. Shell Scale, Surfaces & Focused Anatomy

### DOM & Slot Structure

```text
.cs-kpi-card (div, data-variant, data-size, data-layout, data-nested)
├── .cs-kpi-card-header (typographic label row + optional trailing Badge or quiet glyph)
│   ├── .cs-kpi-card-label (concise 1–3 word metric name)
│   └── [optional] .cs-kpi-card-icon (plain 14–16px glyph, trailing by default) | Badge
├── .cs-kpi-card-metric (NumberMorphGroup-friendly baseline cluster)
│   ├── .cs-kpi-card-value (unified hero figure + optional light prefix/suffix)
│   └── [optional] .cs-kpi-card-delta (semantic trend pill, plain delta, or status dot)
├── [optional — pick at most ONE primary companion band]
│   ├── .cs-kpi-card-visual (sparkline or mini bar chart; transparent | soft | sunken | bleed)
│   ├── .cs-kpi-card-target (clean native <Progress /> + concise meta row)
│   ├── .cs-kpi-card-comparison (single-line period context when no visual/target is present)
│   └── .cs-kpi-card-breakdown (2–3 key-value micro rows)
└── [optional] .cs-kpi-card-footer (secondary meta + .cs-kpi-card-actions)
```

### Size Tokens (`sm` – `lg`)

Shell padding, gaps, and radii match `Card.svelte` 1:1 so `KpiCard` and `Card` align seamlessly in mixed grids:

| Size | `--cs-kpi-card-padding` | `--cs-kpi-card-gap` | `--cs-kpi-card-radius` | `--cs-kpi-card-inner-radius-base` | `--cs-kpi-card-squircle` | `--cs-kpi-card-visual-inline-size` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sm` | `12px` | `8px` | `var(--cs-radius-2xl)` (`16px`) | `var(--cs-radius-lg)` (`8px`) | `var(--cs-squircle)` | `104px` |
| `md` | `16px` | `12px` | `var(--cs-radius-3xl)` (`24px`) | `10px` | `var(--cs-squircle)` | `144px` |
| `lg` | `24px` | `16px` | `28px` | `12px` | `var(--cs-squircle)` | `192px` |

Concentric inner radius follows `Card`'s exact formula:

```css
--cs-kpi-card-inner-radius: max(
    var(--cs-kpi-card-inner-radius-base, var(--cs-radius-lg)),
    calc(var(--cs-kpi-card-radius) - var(--cs-kpi-card-padding))
);
```

### Surface Variants

| Variant | `--cs-kpi-card-bg` | `--cs-kpi-card-shadow` | Recommended Role |
| :--- | :--- | :--- | :--- |
| `elevated` | `var(--cs-color-elevated)` | `var(--cs-shadow-elevated)` | Primary dashboard cards on `--cs-color-canvas` or `--cs-color-sunken`. |
| `sunken` | `var(--cs-color-sunken)` | `var(--cs-shadow-sunken)` | Nested sub-KPI tiles inside `elevated` summary cards, or recessed telemetry wells. |
| `soft` | `var(--cs-color-base-soft)` | `none` | Quiet secondary tiles inside `elevated` containers when `sunken` feels too heavy. |
| `transparent` | `transparent` | `none` | Frameless metric cells or unboxed stat strips over an existing surface. |

---

## 3. Header & Icon Discipline (`KpiCardHeader`, `KpiCardLabel`, `KpiCardIcon`)

### Pure Typographic Header (Default)

- `KpiCardHeader` renders as a calm single row (`align-items: center`, `justify-content: space-between`, `column-gap: 6px`/`8px`/`10px`).
- **Default usage:** `<KpiCardHeader><KpiCardLabel>Monthly revenue</KpiCardLabel></KpiCardHeader>`—no icon, no description, no extra wrapper.
- **Trailing slot:** Optional `Badge` (`size="sm"`) or quiet `KpiCardIcon` placed *after* `KpiCardLabel` aligns to `header-end` (`justify-self: end`).

### `KpiCardIcon` — Subtle & Plain Only

- **Remove `variant="soft"` squircle boxes.** Soft icon boxes top-left are retired; `KpiCardIcon` renders exclusively as a bare, borderless `plain` glyph (`14px` at `sm`, `16px` at `md`, `18px` at `lg`, default color `--cs-color-text-weak`).
- **Placement intelligence in `KpiCardHeader`:**
  - When `KpiCardIcon` appears **after** `KpiCardLabel` (recommended default when an icon is desired), `KpiCardHeader` places it cleanly in the **trailing corner** (`header-end`) as a subtle instrument marker (`--cs-color-text-weak` or `--cs-color-text-weaker`).
  - When placed **before** `KpiCardLabel` (only for dense multi-category lists where category scanning is critical), it sits inline in `header-icon-start` without any background plate.

---

## 4. Layout Modes (`data-layout`)

All layouts live on `.cs-kpi-card` (`stack` default, `split`, `inline`, `hero`).

### 1. `stack` (Default)

Crisp vertical cadence for 2–4 column analytics grids:

- **Grid:** Single column (`[main-start] minmax(0, 1fr) [main-end]`), `gap: var(--cs-kpi-card-gap)`.
- **Metric (`KpiCardMetric`):** Flex-wrap baseline row (`align-items: baseline; column-gap: 8px; row-gap: 6px`) pairing `KpiCardValue` and `KpiCardDelta` on one line whenever width allows.
- **Bottom anchoring:** When cards sit in equal-height CSS grids, `KpiCardFooter` or a bottom `KpiCardVisual` aligns cleanly to the lower edge so metric baselines stay level across rows.

### 2. `hero` (Executive Spotlight)

Elevated scale for primary dashboard focal points:

- **Scale:** Steps `KpiCardValue` up (`26px` / `32px` / `40px`) with tighter tracking (`var(--cs-tracking-tighter)`) and airier section rhythm (`--cs-kpi-card-section-gap`: `12px` / `16px` / `20px`).
- **Focused composition:** Label (+ optional status `Badge`) → Hero Value + Delta → ONE expansive `KpiCardVisual` (e.g., `bleed` bottom area sparkline) or a `KpiCardGroup` of nested sub-KPIs. Never crowd `hero` with simultaneous description, comparison, target bar, and sparkline.

### 3. `split` (Horizontal with Visual Rail)

Two-column composition pairing a focused figure on the start side with a sparkline or mini bar chart on the end side:

- **Grid tracks (`.cs-kpi-card-split`):**
  - `main` track (`minmax(0, 1fr)`) paired with `visual` track (`minmax(var(--cs-kpi-card-visual-inline-size), 42%)`, `104px` / `144px` / `192px`).
  - **Editorial vertical anchoring:** When `main` holds `KpiCardHeader` and `KpiCardMetric` (+ optional short `KpiCardComparison`), set row sizing so `KpiCardHeader` anchors top-start and `KpiCardMetric` anchors bottom-start (`grid-template-rows: auto minmax(0, 1fr)` with `align-self: end` on `.cs-kpi-card-metric` when no target/breakdown/footer follows). This prevents the metric from floating awkwardly mid-height beside a full-height chart.
- **Responsive collapse (`@container`):** Below `300px` (`sm`/`md`) or `360px` (`lg`), `.cs-kpi-card-split` collapses cleanly to a single column.

### 4. `inline` (Razor-Sharp Horizontal Strip)

Single-band horizontal tile for summary strips, toolbars, and dense sidebars:

- **Target height:** `44px`–`60px` total block height (`padding-block: 10px` at `sm`, `12px` at `md` optional or standard shell padding with zero multi-line left stack).
- **Start cluster (`main`, `minmax(0, 1fr)`):** Single-line `KpiCardLabel` only (plus optional tiny status dot or trailing plain glyph). **No soft icon box and no second-row comparison/description paragraph**—keeping the left side ultra-clean.
- **End cluster (`metric`, `auto`):** Stepped-down `KpiCardValue` (`18px` / `20px` / `24px`) + `KpiCardDelta` (defaults to `variant="plain"` in `inline` so strips never suffer pill-fatigue) + optional compact inline sparkline (`KpiCardVisual placement="end"`, `--cs-kpi-card-inline-visual-size: 72px`, `block-size: 24px`–`28px`).

### 5. `grouped` (`KpiCardGroup`)

Macro headline card containing 2–4 subordinate sub-KPIs:

- **Parent:** `variant="elevated"`, `size="md"` or `"lg"` (`stack` or `hero`) with Label + Hero Value + Delta.
- **Child grid (`.cs-kpi-card-group`):** `repeat(auto-fit, minmax(132px, 1fr))` when nested (`gap: 8px` in `md`, `12px` in `lg`).
- **Child sub-KPIs (`[data-nested]`):** Default to `sunken` or `soft` at `size="sm"`, strictly limited to **3 signals** (`Label` + `Value` + `Delta`).

---

## 5. Typographic Hierarchy & Unified Numeric Scale

All numeric readouts use `--cs-font-sans` with `font-variant-numeric: tabular-nums lining-nums`. Never use `--cs-font-mono` for KPI metrics.

### Exact Type Scale (`px` Metrics)

| Role | `sm` | `md` | `lg` | Weight | Tracking | Color |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Label** (`.cs-kpi-card-label`) | `12px` / `lh 16px` | `13px` / `lh 18px` | `14px` / `lh 20px` | `500` | `0em` | `--cs-color-text-weak` |
| **Hero Value** (`stack` / `split`) | `22px` / `lh 26px` | `28px` / `lh 32px` | `34px` / `lh 38px` | `600` | `-0.025em` / `-0.028em` / `-0.03em` | `--cs-color-text-strong` |
| **Spotlight Value** (`hero`) | `26px` / `lh 30px` | `32px` / `lh 36px` | `40px` / `lh 44px` | `600` | `var(--cs-tracking-tighter)` | `--cs-color-text-strong` |
| **Stepped Value** (`inline` & `[data-nested]`) | `18px` / `lh 22px` | `20px` / `lh 24px` | `24px` / `lh 28px` | `600` | `var(--cs-tracking-tight)` | `--cs-color-text-strong` |
| **Prefix / Suffix** (light framing) | `0.72em` / `0.65em` | `0.72em` / `0.65em` | `0.72em` / `0.65em` | `500` | `0em` | `--cs-color-text-weak` |
| **Comparison / Target Meta** | `11px` / `lh 15px` | `12px` / `lh 16px` | `13px` / `lh 18px` | `400` / `500` | `0em` | `--cs-color-text-weak` |

### Label & Numeric Discipline

- **Sentence case only:** `Monthly revenue`, `P95 latency`, `Active seats`. Never uppercase-all-caps labels.
- **No hyphens/dashes as separators:** Write `vs. prior 30 days` or `Nov 1 to Nov 30`, never `Revenue - Q4`.
- **Single-line `inline` labels:** `white-space: nowrap; overflow-x: clip; text-overflow: ellipsis` in `inline` mode; `text-wrap: balance` in vertical modes.
- **Unified digits:** All integer, separator, and fractional digits inside `KpiCardValue` (including `NumberMorph`) share `--cs-color-text-strong` and `font-weight: 600`. Only explicit `prefix` (`$`, `€`) and `suffix` (`ms`, `%`, `req/h`) step down in weight/tint for clean optical framing.

---

## 6. Delta & Trend Styling (`KpiCardDelta`)

### Intent-Driven Semantic Colors (No `info`)

`KpiCardDelta` decouples **direction** (`trend`: `"up" | "down" | "flat"`) from **semantic color** (`color`: `"positive" | "caution" | "negative" | "base"`), so a `-24 ms` latency drop is `trend="down" color="positive"` and a `+1.1%` churn spike is `trend="up" color="negative"`.

| `color` | `soft` Pill (`--cs-kpi-card-delta-bg` / `-fg`) | `plain` Text (`--cs-kpi-card-delta-fg`) | `dot` Marker (`--cs-kpi-card-delta-dot-bg`) |
| :--- | :--- | :--- | :--- |
| `positive` | `--cs-color-positive-soft` / `--cs-color-positive-soft-fg` | `--cs-color-positive-soft-fg` | `--cs-color-positive-solid` |
| `caution` | `--cs-color-caution-soft` / `--cs-color-caution-soft-fg` | `--cs-color-caution-soft-fg` | `--cs-color-caution-solid` |
| `negative` | `--cs-color-negative-soft` / `--cs-color-negative-soft-fg` | `--cs-color-negative-soft-fg` | `--cs-color-negative-solid` |
| `base` | `--cs-color-base-soft` / `--cs-color-base-soft-fg` | `--cs-color-text-weak` | `--cs-color-text-weak` |

### Variants (`soft` | `plain` | `dot`)

Never use `-solid` chromatic pills for KPI deltas; `-solid` steals visual priority from the hero figure.

- **`variant="soft"` (Default for `stack`, `split`, `hero`):**
  - Pill radius `calc(var(--cs-kpi-card-delta-height) / 2)` with `corner-shape: var(--cs-squircle-soft)`, `font-weight: 500`, `line-height: var(--cs-leading-none)`.
  - `sm` (and `[data-nested]`): `height: 20px`, `px: 6px`, `font-size: 11px`, `icon: 12px`, `gap: 3px`.
  - `md` & `lg`: `height: 24px`, `px: 8px`, `font-size: var(--cs-text-xs)` (`12px`), `icon: 14px`, `gap: 4px`.
  - **Soft-on-Soft Guard:** Inside `.cs-kpi-card[data-variant="soft"]`, a `base` soft delta steps up to `--cs-color-base-soft-hover`.
  - **Leading-edge optical compensation:** Tighten `padding-inline-start` by `1px` (`calc(var(--cs-kpi-card-delta-px) - 1px)`) when a leading Lucide icon is present (`strokeWidth: 2.25`).
- **`variant="plain"` (Default for `inline` and `[data-nested]`):**
  - Zero background plate; renders crisp icon + tabular figure so multi-card grids stay airy.
- **`variant="dot"`:**
  - `6px` circular indicator + `--cs-color-text-main` status label (`Nominal`, `Healthy`).

---

## 7. Visuals, Clean Target Progress & Breakdowns

### 1. Visual / Chart Container (`KpiCardVisual`)

- **`variant="transparent"` (Default & Recommended):** Zero background plate; sparklines and bars sit cleanly on the card surface (`min-block-size`: `40px` `sm` / `52px` `md` / `68px` `lg` for top/bottom placement; `100%` stretch in `split`).
- **`variant="sunken"` / `"soft"`:** Recessed instrument pocket (`--cs-kpi-card-inner-radius`, `corner-shape: var(--cs-squircle-smooth)`, padding `8px` / `10px` / `12px`). Best for structured bar series inside `elevated` cards; avoid `sunken` visual inside an already `sunken` card.
- **`bleed` (`data-bleed`):** Pulls negative bottom and inline margins (`calc(var(--cs-kpi-card-padding) * -1)`) so area-fill sparklines clip smoothly against the outer squircle (`overflow: clip`), giving a crisp Stripe-like edge-to-edge baseline.

**Sparkline Visual Craft:**
- Stroke: `1.5px` (`sm`) or `2px` (`md`/`lg`), `stroke-linecap: round`, `stroke-linejoin: round`, colored via `--cs-color-accent-solid` or semantic status.
- Area fill: Vertical linear gradient from `18%–22%` opacity at top to `0%` at bottom.
- Reference baseline (optional, subtle): `1px` dashed line at `30%–40%` `--cs-color-text-weaker` opacity—never heavy gridlines.

### 2. Target & Progress Meter (`KpiCardTarget`)

`KpiCardTarget` wraps native [`Progress`](../progress/progress.docs.md) cleanly **with zero custom overlays or floating markers**:

- **Drop the `pace` vertical notch line:** No vertical tick markers or haloed dividers cutting across the bar. Rely purely on `<Progress appearance="bar" | "dashed" />` so the capsule/dashed geometry remains intact and crisp.
- **Scale & Surface Pairing:**
  - `sm` & `md` cards → `Progress size="sm"` (`6px` bar, `3px` dashed gap).
  - `lg` cards → `Progress size="md"` (`8px` bar, `4px` dashed gap).
  - Inside `elevated` or `transparent` `KpiCard` → `Progress variant="soft"`.
  - Inside `soft` or `sunken` `KpiCard` → `Progress variant="elevated"`.
- **Minimal meta row:** Keep `label` and `target` concise (`12px`, `tabular-nums`)—for example, `target="$148.9k / $175k"` or `"85%"` alone when the card's `KpiCardLabel` already names the goal.

### 3. Breakdown Rows (`KpiCardBreakdown`)

Compact 2–3 row attribution lists (`Organic` `62%`, `Direct` `24%`, `Referral` `14%`):

- **Borderless row separation:** `box-shadow: inset 0 1px 0 0 var(--cs-color-base-soft)` between consecutive rows in `variant="plain"`, or `sunken`/`soft` inner pockets (`--cs-kpi-card-inner-radius`).
- **Row geometry:** Min-height `24px` (`sm`), `28px` (`md`), `32px` (`lg`). Start: optional `6px` dot + label (`--cs-color-text-weak`); End: value (`500`, `tabular-nums`, `--cs-color-text-strong`) + optional share (`--cs-color-text-weak`).

---

## 8. Concentric Nesting, Motion & Theme Calibration

### 1. Concentric Nesting (`[data-nested]`)

Shares `createSurfaceRadius` with `Card` (`Math.max(8, parentInnerRadius - padding)`):

- Steps `corner-shape` to `var(--cs-squircle-smooth)` (`1.6`), drops `KpiCardValue` to the stepped scale (`18px` / `20px` / `24px`), and defaults `KpiCardDelta` to `variant="plain"` (`sm` sizing when `soft` is explicitly set).
- **Surface matrix:** `elevated` → `sunken` *(primary)*, `elevated` → `soft`, or `elevated` → `transparent`. Never nest `elevated` inside `elevated` or `sunken` inside `sunken`.

### 2. `NumberMorph` Ergonomics

- On `.cs-kpi-card-value`, set `--cs-number-morph-char-height: 1.05em`, `--cs-number-morph-mask-height: 0.18em`, and `--cs-number-morph-mask-width: 0.35em`.
- Wrap `.cs-kpi-card-metric` contents in `<NumberMorphGroup>` when `KpiCardDelta` sits beside an animated `KpiCardValue` so width changes glide smoothly.
- Keep `willChange={false}` on `NumberMorph` for standard dashboard updates to avoid half-pixel GPU text blur.

### 3. Static Rest vs. Interactive Calibration

- **Non-interactive KPIs (Default):** `cursor: default`, zero hover shadow or transform drift.
- **Interactive / Dismissible KPIs:** Use `src/css/foundation/` `:focus-visible` and `motion.css` tokens (`--cs-dur-effect`, `--cs-ease-effect`); `KpiCardClose` follows `design-and-tokens.md` corner-offset rules (`8px` / `10px` / `12px`).
- **Dark & Light Calibration:** `elevated` (`white` / `base-900`) separates over `canvas` (`base-100` / `base-950`); `sunken` (`base-100` / `base-950` + `--cs-shadow-sunken`) creates unmistakable inset pockets inside `elevated` parents.

---

## 9. Preview Composition Blueprint (`KpiCard.preview.svelte`)

Every preview example must model the **3-to-4 Signal Rule**—airy, focused, and free of AI-dashboard bloat:

1. **Interactive Playground:**
   - Default to a **4-signal card**: `KpiCardLabel` ("Monthly revenue") + `KpiCardValue` (`$148,920.45`, unified strong text) + `KpiCardDelta` (`+14.2%`) + `KpiCardVisual` (sparkline, toggleable `bleed`).
   - Supporting controls: Variant, Size, Layout, plus toggles for `Sparkline`, `Bleed visual`, `Target bar` (when enabled, swaps or cleanly pairs without description/comparison clutter), and `Close button`—**no** `Subdued decimals` switch, **no** `KpiCardIcon`, **no** `KpiCardDescription`.
2. **Layout Archetypes (`hero`, `stack`, `split`, `inline`):**
   - **`hero` (`lg`):** `Annual Run Rate` + `On pace` Badge + `$1,787,040` + `+21.8%` + wide `bleed` area sparkline. (4 signals—no description, comparison, or extra target bar).
   - **`stack` (`md`, 2-up):** Card A: `Active Workspaces` + `12,480` + `+9.4%` + Sparkline. Card B: `Adoption Goal` + `12,480` + `+9.4%` + clean `KpiCardTarget` (`83.2%`).
   - **`split` (`md`):** Left: `Weekly Deployments` (top) + `1,842` / `+16.2%` (bottom-anchored). Right: crisp `sunken` 7-bar series (`KpiCardVisual`).
   - **`inline` (`md`, 2-up):** Razor-sharp 1-line strips: Left = `Conversion Rate` / `Net Retention` (label only—zero icon box, zero comparison subtitle); Right = `3.84%` + `+0.4%` (plus an optional compact inline sparkline on one tile).
3. **Targets & Intents:**
   - Dedicated grid showing `KpiCardTarget` with pure `<Progress appearance="bar" />` and `<Progress appearance="dashed" />` (NO `pace` notches!) + intent-decoupled deltas (`P95 API Latency` `-24 ms` `positive`, `Net Revenue Churn` `+1.1%` `negative`, `Cloud Compute Spend` `+12.5%` `caution`). Each card has strictly Label + Value + Delta + Target (4 signals).
4. **Nesting & Groups:**
   - Parent `hero` (`Platform Throughput` + `Healthy` Badge + `1.42M req/h` + `+11.4%`) containing 3 crisp `sm` nested cards (`Edge Cache Hit`, `Origin Latency`, `Error Budget`)—each strictly **3 signals** (`Label` + `Value` + `Delta`).
   - `Card` ("Billing & Usage") containing a 2-column `KpiCardGroup` of `sunken` quota KPIs (`Active Seats` + `48 / 50` + `<Progress />`, `Storage Used` + `342 GB` + `<Progress />`).
5. **Breakdowns, Bleed & Surfaces:**
   - Attribution card (`Channel Attribution` + `$148,920` + `+14.2%` + 3-row `KpiCardBreakdown`), bottom-`bleed` sparkline card (`Daily Active Users` + `38,410` + `+6.8%` + `KpiCardVisual bleed`), and a clean 4-column surface comparison (`Elevated`, `Soft`, `Sunken`, `Transparent`) with 3 signals each.
