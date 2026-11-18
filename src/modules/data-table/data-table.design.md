# DataTable Design Spec (`src/modules/data-table/`)

## 1. Visual Direction & "Calm Clarity" Craft

`DataTable` is a standalone, general-purpose read-only interactive data table and grid surface in `@layer components.composite`. It scales seamlessly from a 5-row summary list inside a [`Card`](../card/card.docs.md) to a 100,000-row, multi-column analytical dataset—combining the editorial typographic restraint of Apple, Linear, and Stripe with high-density scanning ergonomics.

### Core Anti-Slop Principles

1. **Typographic Calm Over Boxy Chrome:**
   - At rest, a 5-row table looks as serene as a typeset list: no grey slab header cutting through top squircle corners, no permanent filter-pill toolbar, and no 1px spreadsheet cage.
   - Surface hierarchy (`elevated`, `soft`, `transparent`), exact typographic scale, generous outer edge breathing room, and whisper-light `1px` hairlines carry the structure effortlessly.
2. **Zero Chrome Bloat (Quiet In-Header Controls):**
   - Sorting and filtering live quietly inside **column headers** rather than crowding the table with a permanent multi-row filter bar.
   - Idle headers display clean sentence-case labels with zero visual noise; hover, sort, and filter states reveal with calm precision.
   - Active filter or selection summaries dock quietly at the **bottom** of the table shell (`0px` when idle) so headers, anchored popovers, and rows under the pointer **never jump** when toggling filters or checking rows.
3. **Optical Alignment Over Raw Math:**
   - End-aligned (numeric) columns place their sort/filter indicators to the **inline-start** of the header label so header text stays locked flush with the rightmost digits below—zero horizontal shift between idle, sorted, and filtered states.
   - Outer first and last columns receive calibrated edge padding so content clears squircle curves and `ScrollArea`'s overlay thumb cleanly, while `transparent` tables tighten edge padding to align optically with sibling page/card headings.
4. **Honest Read-Only Affordance & System DNA:**
   - Monochrome `base` surfaces paired with a single `accent` color (`--cs-color-accent-*`) for active sort, filter, and selection states.
   - Concentric squircle radii (`--cs-squircle`, `--cs-squircle-smooth`, `--cs-squircle-soft`), shared floating panel grammar from [`src/shared/listbox/listbox.css`](../../shared/listbox/listbox.css), and semantic `motion.css` timings.
   - `cursor: default` on headers, rows, checkboxes, and buttons; `cursor: text` inside search/condition `<input>` fields; `cursor: pointer` strictly on `:any-link` anchors rendered inside cells.
   - Direct `px` units across all module metrics; all CSS custom properties use `--cs-data-table-*` (never `--_`).

---

## 2. Shell Variants (`variant`), Density Scale (`size`) & Anatomy

Both `variant` and `size` are **required props** with no defaults (matching `Card`, `KpiCard`, and `architecture-and-apis.md`).

### DOM & Slot Anatomy

```text
.cs-data-table (div; overflow: clip; isolation: isolate; display: flex; flex-direction: column;
                data-variant, data-size, data-striped, data-gridlines, data-nested,
                data-scrolled-y, data-scrolled-x-start, data-scrolled-x-end, data-scrolling)
├── .cs-scroll-area (ScrollArea, flex: 1 1 auto; min-height: 0; direction="both", scrollbar="hover")
│   └── .cs-data-table-viewport (.cs-scroll-area-content, scroll container)
│       └── .cs-data-table-canvas (role="table" | "grid", inline-size: max(100%, var(--cs-data-table-min-width, 0px)))
│           ├── .cs-data-table-header (position: sticky; inset-block-start: 0; opaque matching surface)
│           │   └── .cs-data-table-header-row (CSS Grid sharing --cs-data-table-grid-columns)
│           │       ├── [optional] .cs-data-table-header-cell[data-selection] (pinned start, tri-state Checkbox)
│           │       └── .cs-data-table-header-cell (data-align, data-sort, data-filtered, data-open, data-pinned)
│           │           └── .cs-data-table-header-trigger (full-cell button; inset squircle pill via ::before)
│           │               ├── .cs-data-table-header-label (sentence case, single-line ellipsis)
│           │               └── .cs-data-table-header-indicators (sort arrow, priority index, filter glyph)
│           ├── .cs-data-table-body (standard flow or VirtualScroll Padding Mode)
│           │   └── .cs-data-table-row (CSS Grid sharing --cs-data-table-grid-columns;
│           │                           data-selected, data-tone, data-even, data-interactive)
│           │       ├── [optional] .cs-data-table-cell[data-selection] (full-cell <label> + Checkbox)
│           │       └── .cs-data-table-cell (data-align, data-tone, data-emphasis, data-numeric, data-wrap, data-pinned)
│           │           └── .cs-data-table-cell-content (truncated or wrapped value / custom snippet)
│           └── [when empty] .cs-data-table-empty (sticky inline-start: 0; centered in visible viewport)
├── [optional] .cs-data-table-status-bar (flex-shrink: 0; calm bottom-docked filter/selection strip; 0px when idle)
└── [single shared] .cs-data-table-column-popover (.cs-popover, anchored to active column header)
    ├── [when sortable] .cs-data-table-popover-sort (sleek 2-up horizontal sort toggle pair)
    ├── [when both modes] .cs-data-table-popover-mode (<SegmentedControl size="xs" width="equal" />)
    ├── .cs-data-table-popover-filter (flush integrated search + checklist OR airy condition builder)
    └── [when searching/active] .cs-data-table-popover-footer (quiet action + tabular match count)
```

> **Layout Engine Note (CSS Grid Rows):** Sharing `--cs-data-table-grid-columns` across `.cs-data-table-header-row` and every `.cs-data-table-row` guarantees pixel-exact column alignment across both standard and `VirtualScroll` Padding Mode rows (`attachList` applying exact integer `padding-block-start` / `padding-block-end` in normal document flow—zero `position: absolute`, zero `translate3d`), avoids native `<table>` spacer quirks, and keeps sticky cells and inset dividers clean.

### Surface Variants (`variant`: `"elevated" | "soft" | "transparent"`)

`sunken` is intentionally omitted because `--cs-shadow-sunken`'s inset top shadow conflicts with a `position: sticky` header. All three variants use a **surface-matched opaque header at rest**—no dark grey slab slicing across top squircle corners—separating the header purely through refined typographic contrast, a crisp `1px` inset hairline, and a grounded contact shadow that fades in only while scrolled.

| Variant | `--cs-data-table-bg` | `--cs-data-table-header-bg` *(100% Opaque)* | `--cs-data-table-shadow` | Outer Shape | Recommended Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `elevated` | `var(--cs-color-elevated)` | `var(--cs-color-elevated)` | Light: `var(--cs-shadow-elevated)`<br>Dark: rim on `::after` overlay *(see below)* | Squircle (`--cs-data-table-radius`) | Primary standalone table on `--cs-color-canvas` (dashboards, lists, dense analytical grids). |
| `soft` | `var(--cs-color-base-soft)` | `light-dark(color-mix(in oklch, var(--cs-color-base-900) 5%, var(--cs-data-table-backdrop-bg, var(--cs-color-elevated))), color-mix(in oklch, var(--cs-color-base-100) 11%, var(--cs-data-table-backdrop-bg, var(--cs-color-elevated))))` | `none` | Squircle (`--cs-data-table-radius`) | Quiet secondary table nested inside an `elevated` `Card` or drawer without double-shadowing. |
| `transparent` | `transparent` | `var(--cs-data-table-backdrop-bg, var(--cs-color-canvas))` | `none` | `0px` (flush) | Frameless Linear-style list tables on `--cs-color-canvas`, or flush inside a `Card` that owns the outer shell. |

> **Why Surface-Matched Headers Win in Both Themes:**
> - **Light mode (`elevated`):** A pure white top edge preserves the effortless poise of the outer `16px–28px` squircle (`--cs-shadow-sm`) instead of looking like a tinted utility box.
> - **Dark mode (`elevated`) Top-Rim Preservation:** In `src/css/foundation/shapes.css`, dark mode defines `--cs-shadow-elevated` as an `inset` top specular highlight (`inset 0 1px 0 0 rgb(255 255 255 / 0.08), inset 0 0 0 1px rgb(255 255 255 / 0.02)`). Because an element's own `inset box-shadow` paints *behind* children, an opaque sticky header would cover that top highlight. On `.cs-data-table[data-variant="elevated"]`, render the dark-mode specular rim on a `::after` overlay (`position: absolute; inset: 0; border-radius: inherit; corner-shape: inherit; pointer-events: none; z-index: 40;`) so the `1px` glass-like edge stays crisp over sticky headers, scrolled rows, and colored cells alike.
> - **Opaque Sticky Backing (`--cs-data-table-backdrop-bg`):** Every variant resolves `--cs-data-table-header-bg` and `--cs-data-table-sticky-bg` to a **100% opaque** color so scrolled row text never ghosts behind sticky headers or pinned columns. When `variant="transparent"` sits inside an `elevated` `Card` (or `variant="soft"` sits directly on `--cs-color-canvas`), consumers set `--cs-data-table-backdrop-bg: var(--cs-color-elevated)` (or `var(--cs-color-canvas)`) for pixel-exact seamlessness. Consumers who specifically desire a subtly tinted header band can override `--cs-data-table-header-bg` in one line.

### Concentric Nesting (`[data-nested]`)

`DataTable` participates in [`createSurfaceRadius`](../../shared/surface-radius/surface-radius.svelte.ts) (sharing context with `Card` and `KpiCard`):

- Inside a `Card` or `KpiCard`, `elevated` and `soft` tables receive `data-nested`, adopt `--cs-data-table-radius: var(--cs-data-table-nested-radius)` (`8px`–`12px`), and step `corner-shape` down to `var(--cs-squircle-smooth)` (`1.6`).
- Because `SurfaceSize` supports `"sm" | "md" | "lg"`, `size="xs"` maps to `"sm"` for concentric radius math while keeping its `12px` standalone radius.
- **Surface pairing rule:** `elevated` `Card` → `soft` or `transparent` `DataTable`; `--cs-color-canvas` → `elevated` or `transparent` `DataTable`. Never nest `elevated` inside `elevated`.

### Density & Size Scale (`size`: `"xs" | "sm" | "md" | "lg"`)

Row heights step cleanly by `+8px` (`28 / 36 / 44 / 52px`), header heights remain slightly sleeker than body rows at `sm`–`lg` so the data owns the visual mass, and standalone radii match `Card` / `KpiCard` pixel-for-pixel (`16 / 24 / 28px` at `sm`–`lg`):

| Token / Metric | `xs` *(Dense Grid)* | `sm` *(Compact)* | `md` *(Balanced)* | `lg` *(Spacious / Rich)* |
| :--- | :--- | :--- | :--- | :--- |
| `--cs-data-table-row-height` *(exact integer)* | `28px` | `36px` | `44px` | `52px` |
| `--cs-data-table-header-height` *(exact integer)* | `30px` | `34px` | `38px` | `42px` |
| `--cs-data-table-cell-px` *(inner col padding)* | `8px` | `10px` | `12px` | `16px` |
| `--cs-data-table-edge-px` *(first/last col, `elevated`/`soft`)* | `12px` | `16px` | `20px` | `24px` |
| `--cs-data-table-edge-px` *(`transparent`)* | `8px` | `10px` | `12px` | `16px` |
| `--cs-data-table-cell-py` *(when wrapped)* | `6px` | `9px` | `12px` | `16px` |
| `--cs-data-table-font-size` *(body)* | `12px` (`--cs-text-xs`) | `13px` | `14px` (`--cs-text-sm`) | `14px` (`--cs-text-sm`) |
| `--cs-data-table-line-height` *(snapped integer)* | `16px` | `18px` | `20px` | `20px` |
| `--cs-data-table-header-font-size` | `11px` | `12px` (`--cs-text-xs`) | `12px` (`--cs-text-xs`) | `13px` |
| `--cs-data-table-header-line-height` | `16px` | `16px` | `16px` | `18px` |
| `--cs-data-table-header-tracking` | `0.01em` | `0.005em` | `0.005em` | `0em` |
| `--cs-data-table-radius` *(standalone)* | `12px` (`--cs-radius-xl`) | `16px` (`--cs-radius-2xl`) | `24px` (`--cs-radius-3xl`) | `28px` |
| `--cs-data-table-squircle` | `var(--cs-squircle-smooth)` | `var(--cs-squircle)` | `var(--cs-squircle)` | `var(--cs-squircle)` |
| `--cs-data-table-selection-width` | `36px` | `40px` | `44px` | `52px` |
| `--cs-data-table-status-bar-height` | `32px` | `34px` | `38px` | `42px` |
| Paired `ScrollArea` `size` | `sm` | `sm` | `md` | `md` |
| Paired `Checkbox` `size` | `xs` (`12px`) | `sm` (`16px`) | `sm` (`16px`) | `md` (`20px`) |
| Paired `Badge` `size` | `xs` (`18px`) | `sm` (`20px`) | `sm` (`20px`) / `md` (`24px`) | `md` (`24px`) |

> **Why These Proportions Feel Airy Even When Dense:**
> - **Vertical optical cushion:** `xs` (`28px` row / `16px` line-height = `6px` above & below), `sm` (`36px` / `18px` = `9px`), `md` (`44px` / `20px` = `12px`, matching Apple's comfortable row target and giving `28px` `xs` row-action buttons `8px` clearance), and `lg` (`52px` accommodates `18px` primary + `2px` gap + `16px` secondary = `36px` two-line content with `8px` symmetric air).
> - **Outer edge optical balance:** On `elevated` and `soft`, `--cs-data-table-edge-px` (`12 / 16 / 20 / 24px`) clears outer squircle curvature cleanly and keeps right-aligned final-column digits `8px–12px` clear of `ScrollArea`'s overlay thumb. On `transparent`, tightening `--cs-data-table-edge-px` to `--cs-data-table-cell-px` (`8 / 10 / 12 / 16px`) prevents awkward visual over-indentation relative to page headings while preserving comfortable horizontal hover padding.

---

## 3. Row Separation, Hover Craft, Display Modes & Focus Safety

### 1. Composed Inset Hairlines (Zero Sticky-Column Breaks)

Instead of CSS `border-bottom` (which distorts row heights and breaks `VirtualScroll` stride math) or row-level shadows (which get painted over by opaque pinned columns), every `.cs-data-table-cell` composes its inset hairlines via three non-colliding custom properties:

```css
--cs-data-table-divider: light-dark(
    color-mix(in oklch, var(--cs-color-base-900) 5.5%, transparent),
    color-mix(in oklch, var(--cs-color-base-100) 7%, transparent)
);
--cs-data-table-header-divider: light-dark(
    color-mix(in oklch, var(--cs-color-base-900) 8.5%, transparent),
    color-mix(in oklch, var(--cs-color-base-100) 11%, transparent)
);

.cs-data-table-cell {
    box-shadow:
        var(--cs-data-table-cell-edge-shadow, 0 0 0 0 transparent),      /* 2px selected leading bar (col 1) */
        var(--cs-data-table-cell-gridline-shadow, 0 0 0 0 transparent),  /* 1px opt-in vertical gridline */
        var(--cs-data-table-cell-divider-shadow, inset 0 -1px 0 0 var(--cs-data-table-divider));
}
```

- Because the horizontal divider lives on `.cs-data-table-cell`, the `1px` seam runs **unbroken** across pinned selection/ID columns and unpinned data columns alike.
- In non-virtualized tables, the final row suppresses `--cs-data-table-cell-divider-shadow` (`&:last-child`) when no bottom status bar is visible, avoiding a redundant seam against the bottom squircle edge.
- `.cs-data-table-header` applies `box-shadow: inset 0 -1px 0 0 var(--cs-data-table-header-divider)`—one quiet step firmer than body dividers—staying **completely unbroken** across all columns (never chopped into colored tab underlines).

### 2. Row Hover Feel (Whisper-Light Tracking)

Following `design-and-tokens.md` and `listbox.css`:
- **Read-only rows (default):** Hover paints an ultra-light horizontal reading guide via Layer 3 of the cell paint stack (`light-dark(color-mix(in oklch, var(--cs-color-base-900) 2.5%, transparent), color-mix(in oklch, var(--cs-color-base-100) 4.5%, transparent))`) over `--cs-dur-60` (`60ms`, snapped to `0ms` while `[data-scrolling]`). Calm enough for a 12-column horizontal eye sweep; zero cursor change (`cursor: default`).
- **Interactive rows (`[data-interactive]`, when `onRowClick` is bound):** Hover steps gently firmer (`3.5%` light / `6.5%` dark) and lifts default body text from `--cs-color-text-main` to `--cs-color-text-strong`. Active press deepens subtly to `5%` light / `9%` dark—no row-wide `scale` transform (which blurs text across wide grids).

### 3. Opt-In Display Modes (`striped` & `gridlines`)

Both default to `false` to preserve calm minimalism:

- **`striped` (`data-striped`):**
  - Applies a subtle alternating tint on logically even rows (`[data-even]`, computed from 0-based view index—never `:nth-child(even)`, so zebra parity stays rock-solid during `VirtualScroll` DOM recycling):
    ```css
    --cs-data-table-stripe-bg: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 2%, transparent),
        color-mix(in oklch, var(--cs-color-base-100) 2.8%, transparent)
    );
    ```
  - When `striped` is enabled without `gridlines`, horizontal row dividers suppress automatically (`--cs-data-table-divider: transparent`) so alternating bands carry separation cleanly without double-encoding rows.
- **`gridlines` (`data-gridlines`):**
  - Activates `--cs-data-table-cell-gridline-shadow: inset -1px 0 0 0 var(--cs-data-table-gridline)` on non-last cells (and matching subtle header column dividers on `.cs-data-table-header-cell:not(:last-child)`):
    ```css
    --cs-data-table-gridline: light-dark(
        color-mix(in oklch, var(--cs-color-base-900) 5%, transparent),
        color-mix(in oklch, var(--cs-color-base-100) 6.5%, transparent)
    );
    ```
  - Best suited for dense `xs`/`sm` multi-column numerical or financial tables.

### 4. Scroll-Triggered Depth & Horizontal Edge Cues

- **Vertical Scroll Contact Shadow (`[data-scrolled-y]`):**
  When `scrollTop > 0`, a grounded contact shadow fades in beneath `.cs-data-table-header` via a `::after` pseudo-element (`opacity: 0 → 1`, `--cs-dur-effect` `--cs-ease-effect`), avoiding expensive box-shadow repaints on wide tables:
  ```css
  --cs-data-table-header-shadow-scrolled: light-dark(
      0 4px 12px -4px rgb(0 0 0 / 0.08),
      0 6px 18px -4px rgb(0 0 0 / 0.5)
  );
  ```
- **Horizontal Scroll Edge Cues (`[data-scrolled-x-start]`, `[data-scrolled-x-end]`):**
  - Never apply `mask-image` directly to the viewport when sticky headers or pinned columns are present (it fades pinned checkboxes/IDs).
  - Render crisp `12px`-wide non-interactive (`pointer-events: none`) linear fade gradients (`light-dark(rgb(0 0 0 / 0.055), rgb(0 0 0 / 0.34))` → `transparent`):
    - **With a pinned leading column:** Attach the right-facing gradient to the trailing edge (`::after`) of the last `[data-pinned="start"]` cell, revealed only when `[data-scrolled-x-start]` is active.
    - **Without pinned columns:** Attach start/end edge gradients to the viewport bounds (`opacity: 0 → 1`, `--cs-dur-effect-fast`).

### 5. Unclipped `:focus-visible` Inside Scroll & Clip Containers

Global `focus.css` sets `outline: 2px solid var(--cs-color-accent-solid); outline-offset: 2px;`. Inside `.cs-data-table` (`overflow: clip`) and `.cs-data-table-viewport` (`overflow: auto`), outset focus rings on edge-flush elements would clip at top, start, or end boundaries:

- **Header triggers (`.cs-data-table-header-trigger:focus-visible`):** Apply `outline-offset: -2px` and `border-radius: 6px` (inheriting the global `2px solid var(--cs-color-accent-solid)` outline for full Windows High Contrast / `forced-colors` compliance—matching `listbox.css`).
- **Focusable interactive rows (`.cs-data-table-row:focus-visible`):** Apply `outline-offset: -2px` so full-row focus stays 100% inside the shell.
- **Embedded controls (`Checkbox`, `Button`, `a` inside cells):** Cell padding (`>= 6px` vertical, `>= 8px` horizontal; selection tracks `>= 36px`) provides full clearance for the global outset `2px` focus ring.
- **Sticky header focus clearance:** `.cs-data-table-viewport` sets `scroll-padding-block-start: calc(var(--cs-data-table-header-height) + 4px)` so `Shift+Tab` never scrolls a focused control underneath the sticky header.

---

## 4. Typography, Alignment & Rich Cell Recipes

All table typography uses `--cs-font-sans`. Reserve `--cs-font-mono` strictly for explicit code/hash cell renderers—never default numeric, currency, ID, or date columns to monospace.

### 4-Level Typographic Hierarchy

| Cell Role | Weight | Color Token | Numeric Features | Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Column Header** | `500` | `--cs-color-text-weak` (rest) → `--cs-color-text-strong` (hover / active / open) | `tabular-nums` on sort priority | **Sentence case only** (`Invoice amount`, `Created at`). Never all-caps. |
| **Primary Identifier Cell** (`emphasis="strong"`) | `500` | `--cs-color-text-strong` | `tabular-nums` if numeric ID | Anchors left-to-right scanning (Customer, Account, Order ID). |
| **Standard Data Cell** *(default)* | `400` | `--cs-color-text-main` | `tabular-nums lining-nums` on numeric/date types | Crisp readability without competing against identifiers or status. |
| **Secondary / Empty Cell** (`emphasis="weak"`) | `400` | `--cs-color-text-weak` (sub-line) / `--cs-color-text-weaker` (empty cue) | Inherited | Sub-lines step down `2px` (`12px` beneath `14px`). Blank cells stay blank unless a formatter provides a quiet muted placeholder. |

### Smart Alignment by Data Type (`data-align="start" | "center" | "end"`)

**Golden Rule:** Every column header MUST share the exact `data-align` of its body cells.

| Data Type | Default Alignment | Numeric Variant | Notes |
| :--- | :--- | :--- | :--- |
| Text, names, identifiers, categories, badges, links | `start` | Normal | Clean left-edge reading rhythm. |
| Numbers, currency, percentages, counts, durations | `end` | `tabular-nums lining-nums` | Decimal points and place values align vertically down the column. |
| ISO dates & timestamps (`2026-11-18`, `14:32:05`) | `end` | `tabular-nums lining-nums` | Uniform digit width; aligns cleanly beside metrics. |
| Prose dates (`Nov 18, 2026`) | `start` | `tabular-nums lining-nums` | Natural reading flow alongside text columns. |
| Selection checkboxes, boolean icons, status dots, icon-only actions | `center` | — | Optical center inside fixed-width tracks. |

### Truncation, Wrapping & Rich Cell Recipes

- **Single-Line Truncation (Default, VirtualScroll-Friendly):**
  `.cs-data-table-cell-content` sets `min-inline-size: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`. Never apply `text-trim` to table body cells (`design-and-tokens.md` reserves `text-trim` strictly for isolated single-line control labels paired with icons).
- **Opt-In Wrapping (`data-wrap`):**
  Switches cell vertical alignment from `align-items: center` to `align-items: start` with `padding-block: var(--cs-data-table-cell-py)` (`6 / 9 / 12 / 16px`) so line 1 of wrapped cells shares the exact top baseline of adjacent single-line cells (`white-space: normal; overflow-wrap: anywhere;`). Automatically switches virtualized tables to measured mode (`fixed: false`).
- **Calibrated Rich Cell Recipes:**
  - **Primary + Secondary Two-Line Cell (`lg`, `52px` rows):** Stack primary (`14px`, `weight: 500`, `lh: 18px`, `--cs-color-text-strong`) + secondary (`12px`, `weight: 400`, `lh: 16px`, `--cs-color-text-weak`) with `gap: 2px` (`36px` stack + `8px` symmetric vertical air). Optional leading `28px` (`md`) / `32px` (`lg`) avatar with `gap: 10px`.
  - **Status Cell (`Badge`):** Use `variant="dot"` or `variant="soft"` (`size="xs"` at `xs`, `size="sm"` at `sm`/`md`, `size="md"` at `lg`). Avoid `variant="solid"` pills on every row to prevent chromatic fatigue.
  - **Progress Meter Cell (`Progress`):** Inline flex (`gap: 8px`, `align-items: center`): `<Progress size="xs" />` (`xs`/`sm`) or `size="sm"` (`md`/`lg`) (`flex: 1; min-inline-size: 56px;`, `variant="soft"` on `elevated`/`transparent`, `variant="elevated"` on `soft`) + right-aligned `tabular-nums` percentage (`min-inline-size: 36px`, `12px`, `--cs-color-text-weak`).
  - **Live Numeric Metric (`NumberMorph`):** Always inside `align="end"` numeric cells with `willChange={false}` to prevent GPU subpixel text blur.
  - **Trailing Row Actions (`Button` + `Dropdown`):** Fixed-width `align="center"` column (`40 / 44 / 48 / 56px`). Use `<Button variant="ghost" size="xs" iconOnly />` (`28px` fits comfortably in `sm`/`md`/`lg` rows; compact `22px` trigger with `<HitArea />` at `xs`) opening `<Dropdown size="sm" placement="bottom-end">`. On fine-pointer hover devices (`@media (hover: hover)`), quiet the trigger to `opacity: 0.4` (or `0` when desired) at rest and reveal cleanly to `opacity: 1` (`--cs-dur-effect-fast`) on row `:hover`, `:focus-within`, or `[aria-expanded="true"]`; keep `opacity: 1` on touch devices.

---

## 5. Per-Cell, Per-Row & Per-Column Styling

To support conditional formatting, summary rows, heatmaps, and custom color-coded datasets without breaking hover feedback, selection visibility, or dark mode contrast, `DataTable` uses a **non-destructive 3-layer CSS paint stack**.

### 1. The 3-Layer Cell Paint Stack (Zero Muddy Overlaps)

Every `.cs-data-table-cell` composites three distinct visual layers using `background-color` + multi-layer `background-image` (zero extra wrapper DOM):

```css
.cs-data-table-cell {
    /* Layer 1 (Bottom): Resolved base fill — highest specificity wins:
       cell > row > column > stripe > transparent (or opaque sticky-bg when pinned) */
    background-color: var(
        --cs-data-table-cell-resolved-bg,
        var(
            --cs-data-table-row-resolved-bg,
            var(--cs-data-table-col-resolved-bg, var(--cs-data-table-stripe-resolved-bg, transparent))
        )
    );

    /* Layer 3 (Top):    Hovered-row whisper luminance sheen
       Layer 2 (Middle): Selected-row translucent accent wash */
    background-image:
        linear-gradient(var(--cs-data-table-cell-hover-overlay, transparent), var(--cs-data-table-cell-hover-overlay, transparent)),
        linear-gradient(var(--cs-data-table-cell-selected-overlay, transparent), var(--cs-data-table-cell-selected-overlay, transparent));
}
```

- **Hover consistency:** Sweeping across a row containing mixed `positive`, `caution`, and custom-tinted cells applies a uniform whisper sheen across every cell—preserving each cell's semantic hue with zero unreactive holes.
- **Unmistakable selection:** Selected rows apply a translucent accent wash (`light-dark(color-mix(in oklab, var(--cs-color-accent-500) 8%, transparent), color-mix(in oklab, var(--cs-color-accent-500) 16%, transparent))`) **plus** a crisp `2px` leading accent bar (`--cs-data-table-cell-edge-shadow: inset 2px 0 0 0 var(--cs-color-accent-solid)`) on the row's first cell, remaining unmistakable even on color-coded sheets.

### 2. Layer A — Semantic Tones (`data-tone`)

Intent-driven semantic tones matching `cscripts-ui`'s color system (strictly omitting `info`):

| `data-tone` | Background Mix (`--cs-data-table-*-resolved-bg`) | Foreground (`color`) | Intended Use |
| :--- | :--- | :--- | :--- |
| `base` | `light-dark(color-mix(in oklch, var(--cs-color-base-900) 4%, transparent), color-mix(in oklch, var(--cs-color-base-100) 7.5%, transparent))` | `var(--cs-color-text-strong)` | Summary/subtotal rows, highlighted reference columns. |
| `accent` | `light-dark(color-mix(in oklab, var(--cs-color-accent-500) 9%, transparent), color-mix(in oklab, var(--cs-color-accent-500) 17%, transparent))` | `var(--cs-color-accent-soft-fg)` | Active/focused entity, primary callout metric. |
| `positive` | `light-dark(color-mix(in oklab, var(--cs-color-positive-500) 9%, transparent), color-mix(in oklab, var(--cs-color-positive-500) 17%, transparent))` | `var(--cs-color-positive-soft-fg)` | On-target KPIs, favorable variance, healthy status. |
| `caution` | `light-dark(color-mix(in oklab, var(--cs-color-caution-500) 10%, transparent), color-mix(in oklab, var(--cs-color-caution-500) 18%, transparent))` | `var(--cs-color-caution-soft-fg)` | Threshold warnings, pending reviews, approaching limits. |
| `negative` | `light-dark(color-mix(in oklab, var(--cs-color-negative-500) 9%, transparent), color-mix(in oklab, var(--cs-color-negative-500) 18%, transparent))` | `var(--cs-color-negative-soft-fg)` | Overdue items, errors, threshold breaches. |

### 3. Layer B — Custom Colors (`--cs-data-table-{cell,row,col}-{bg,fg}` & `data-color-mode`)

Cell, row, and column styles accept arbitrary CSS color values with two explicit rendering modes (`data-color-mode`):

1. **`tint` *(Default — Theme-Harmonized & Dark-Mode Safe)*:**
   Mixes any custom fill into the surface in OKLab so bright pastel or saturated inputs automatically harmonize in both light and dark themes while keeping `--cs-color-text-strong` crisp:
   ```css
   --cs-data-table-cell-resolved-bg: light-dark(
       color-mix(in oklab, var(--cs-data-table-cell-bg) 14%, transparent),
       color-mix(in oklab, var(--cs-data-table-cell-bg) 24%, transparent)
   );
   ```
2. **`exact` *(Opt-In — Verbatim Color Fidelity)*:**
   Applies `--cs-data-table-cell-bg` verbatim (for color-coded datasets, heatmaps, or brand palettes). When an `exact` background is provided without an explicit `--cs-data-table-cell-fg`, resolve readable ink via CSS `contrast-color(var(--cs-data-table-cell-bg))` (with a safe luminance fallback) so light-colored cells never render unreadable white text in dark mode.

**Precedence Chain:** `Cell (custom / tone)` → `Row (custom / tone)` → `Column (custom / tone)` → `Stripe` → `Shell surface`, with `Selected overlay` and `Hover sheen` always compositing cleanly on top.

---

## 6. Crafted Column Sorting & Filtering UX

### 1. Column Header Interaction Model

Every interactive column header (`.cs-data-table-header-trigger`) spans the **full header cell** as a single generous hit target (no tiny colliding split buttons in narrow columns):

- **Non-interactive column** *(neither `sortable` nor `filterable`)*: Static `--cs-color-text-weak` text; zero hover chrome.
- **Sort-only column** *(`sortable`, not `filterable`)*: Single click cycles sort direction immediately (`none → asc → desc → none`). No popover opens.
- **Filterable column** *(`filterable`, with or without `sortable`)*: Single click opens the shared **Column Header Popover** anchored directly to the header cell.

### 2. Zero-Jitter Header Indicator Geometry & Inset Pill States

To keep header text optically locked with data cells below (zero horizontal bounce):
- **Start / center-aligned columns:** `[Label] [Indicators]` (indicators trailing).
- **End-aligned (numeric) columns:** `[Indicators] [Label]` (indicators **leading**, keeping the rightmost edge of the header text aligned flush with the rightmost digits below).

Instead of rectangular full-cell hover flashes or heavy `2px` Material-Tab bottom underlines, `.cs-data-table-header-trigger` paints a **soft concentric inset squircle pill** via `::before` (`inset-block: 3px; inset-inline: 4px;` at `sm`–`lg`; `inset: 2px;` at `xs`; `border-radius: 7px` at `xs`/`sm`, `8px` at `md`/`lg`, `corner-shape: var(--cs-squircle-soft)`—extending optically on the outer edge of first/last columns to `calc(var(--cs-data-table-edge-px) - 8px)` so the pill frames the label symmetrically without shifting text by `1px`).

| Header State | Inset Pill (`::before`) | Label Color | Indicator Glyph (`12px` `xs`/`sm`, `13px` `md`/`lg`, `stroke-width: 2.25`) | Header Bottom Hairline |
| :--- | :--- | :--- | :--- | :--- |
| **1. Idle (rest)** | `transparent` | `--cs-color-text-weak` | Hidden (`opacity: 0`) so wide tables look serene and editorial. | Standard unbroken `1px` hairline |
| **2. Hover / Open** (`:hover`, `[data-open]`) | `--cs-color-base-soft` (deepens to `--cs-color-base-soft-hover` on `:active`) | `--cs-color-text-strong` | Quiet `ChevronsUpDown` (sort-only) or `ChevronDown` (filterable; rotates `180deg` when `[data-open]`) fades in (`--cs-color-text-weaker`). | Standard unbroken `1px` hairline |
| **3. Sorted Only** (`data-sort="asc" \| "desc"`) | `transparent` *(at rest)* → `--cs-color-base-soft` *(hover)* | `--cs-color-text-strong` | Persistent `ArrowUp` (rotates `180deg` for `desc`) in `--cs-color-accent-soft-fg` + optional `10px` `weight: 600` `tabular-nums` priority index (`1`, `2`) in multi-sort. | Standard unbroken `1px` hairline |
| **4. Filtered Only** (`data-filtered`) | Whisper accent pill: `light-dark(color-mix(in oklab, var(--cs-color-accent-500) 8%, transparent), color-mix(in oklab, var(--cs-color-accent-500) 15%, transparent))` *(hover: `12%` / `21%`)* | `--cs-color-text-strong` | Persistent `ListFilter` in `--cs-color-accent-soft-fg`. | Standard unbroken `1px` hairline |
| **5. Sorted + Filtered** | Whisper accent pill (`8%` / `15%`, hover `12%` / `21%`) | `--cs-color-text-strong` | Compact `ArrowUp` + `ListFilter` pair (`gap: 3px`) in `--cs-color-accent-soft-fg`. | Standard unbroken `1px` hairline |

> **Why Semantic Pill Differentiation Matters:** Sorting reorders rows without hiding data, so keeping sorted-only headers pill-free at rest (`text-strong` + accent arrow) stays effortlessly light. Filtering restricts visible data, so giving filtered headers a whisper-soft accent inset pill makes active filters scannable in 100ms across 12 columns—while keeping the `1px` header hairline calm and unbroken.

### 3. Redesigned Column Header Popover (Calm, Concentric, Zero Box-in-Box)

Composed on a **single shared [`Popover`](../popover/popover.docs.md) instance** (dynamically anchored to the active column header—zero dormant DOM trees on wide tables) sharing the exact floating material DNA of [`Dropdown`](../dropdown/dropdown.design.md) and [`src/shared/listbox/listbox.css`](../../shared/listbox/listbox.css):

- **Placement & Dimensions:** `placement="bottom-start"` for start/center columns, `placement="bottom-end"` for end-aligned columns (`offset="6px"`, `width="content"`, `inline-size: 256px`, `max-inline-size: min(288px, calc(100vw - 32px))`).
- **Floating Surface & Concentric Radii:**
  - `background: var(--cs-color-elevated)`, `box-shadow: var(--cs-shadow-floating)`, `corner-shape: var(--cs-squircle-soft)`.
  - `--cs-data-table-popover-radius`: `16px` (`xs`/`sm`) or `18px` (`md`/`lg`), matching `listbox.css`.
  - `--cs-data-table-popover-pad`: `6px`, deriving exact concentric inner control radius `calc(var(--cs-data-table-popover-radius) - var(--cs-data-table-popover-pad))` (`10px` / `12px`).
- **Subpixel Snapping:** Because open `Popover` layers set `will-change: scale`, all popover text uses exact whole-pixel `line-height` (`16px` / `18px` / `20px`) via `round(up, ..., 1px)` per `design-and-tokens.md`.

```text
┌────────────────────────────────────────┐  ← 256px, --cs-color-elevated, --cs-shadow-floating, 16px/18px squircle
│ ┌─────────────────┐ ┌─────────────────┐│  ← Zone 1 (when sortable): 30px 2-up horizontal sort pair
│ │ ↑  A to Z       │ │ ↓  Z to A       ││    6px outer pad, 4px gap, 10px/12px concentric radius
│ └─────────────────┘ └─────────────────┘│    Active pill = --cs-color-accent-soft + --cs-color-accent-soft-fg
├────────────────────────────────────────┤  ← 1px hairline (--cs-listbox-separator-bg)
│  🔍  Search                         ×  │  ← Zone 2a (values): 34px flush borderless search (ZERO inner box!)
├────────────────────────────────────────┤  ← 1px hairline
│  ┌──────────────────────────────────┐  │  ← Zone 2b: ScrollArea (max-block-size: 204px, 4px pad, 2px gap)
│  │ [✓] Active                  142  │  │    30px rows, 10px/12px radius, soft hover (--cs-color-base-soft)
│  │ [ ] Pending                  38  │  │    Additive inclusion: 0 boxes checked at rest (calm monochrome!)
│  │ [ ] Archived                 19  │  │    Full-row <label> + <Checkbox variant="soft" size="sm" />
│  │ [ ] Cancelled                 4  │  │    12px label (400; strong when checked) + 11px tabular count
│  └──────────────────────────────────┘  │
├────────────────────────────────────────┤  ← Zone 3: Pinned 34px footer (ONLY when filtered or searching!)
│  Clear                    142 matching │  ← <Button variant="ghost" size="xs"> + quiet tabular count
└────────────────────────────────────────┘
```

#### Zone-by-Zone Craft Details

1. **Zone 1 — Sleek 2-Up Horizontal Sort Pair (Rendered ONLY if `sortable`):**
   - `display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 6px;`.
   - Height: `30px` (`xs`/`sm`) or `32px` (`md`/`lg`), `border-radius: calc(var(--cs-data-table-popover-radius) - 6px)` (`10px` / `12px`), `corner-shape: var(--cs-squircle-soft)`.
   - Icon (`ArrowUp` / `ArrowDown`, `13px`, `stroke-width: 2.25`, `gap: 5px`) + single-line `text-trim` label (`12px`, `weight: 500`):
     - Contextual 1–2 word copy by column type: `A to Z` / `Z to A` (text), `Lowest` / `Highest` (number/currency/percent), `Oldest` / `Newest` (date/datetime), `Ascending` / `Descending` (fallback).
   - States: Rest `background: var(--cs-color-base-soft)`, `color: var(--cs-color-text-main)` → Hover `var(--cs-color-base-soft-hover)`, `var(--cs-color-text-strong)` → `:active` `scale: 0.97` (`--cs-dur-press`) → Active sort (`aria-pressed="true"`): `background: var(--cs-color-accent-soft)`, `color: var(--cs-color-accent-soft-fg)`. Clicking the active direction toggles sorting off cleanly.
   - *Why 2-up instead of stacked listbox rows:* Cuts vertical height in half (`30px` vs. `62px`), visually separates "Sort" from the vertical "Values" list below, and feels tactile and native to `cscripts-ui`.

2. **Zone 1b — Calm Mode Switch (Rendered ONLY when a column enables both `values` and `condition`):**
   - Sits directly beneath the sort pair inside the top control region (`padding: 0 6px 6px;` when `sortable`, or `padding: 6px;` when filter-only): `<SegmentedControl size="xs" width="equal">` (`28px` height, `Values` | `Condition`).
   - Omitted completely on single-mode columns (~85% of columns stay ultra-minimal).

3. **Zone 2A — Value Checklist (Zero Box-in-Box, Calm Additive Selection):**
   - **Flush Integrated Search Header (Zero Nested Box):**
     - `height: 34px`, `padding-inline: 12px`, `gap: 8px`, `background: transparent`—separated from above and below by crisp `1px` `--cs-listbox-separator-bg` hairlines so the search bar belongs to the floating panel rather than boxing a grey rectangle inside a padded card.
     - Leading `Search` icon (`14px`, `stroke-width: 2`, `--cs-color-text-weaker` → `--cs-color-accent-soft-fg` on `:focus-within`), `<input>` (`12px`, `line-height: 18px`, `caret-color: var(--cs-color-accent-solid)`, concise placeholder `Search`), and a concentric `20px` clear button (`×`, hidden via `ComboboxClear` choreography until non-empty).
     - Focus indicator: `:focus-within::after` paints a crisp `2px` accent bottom hairline along the search row divider (no boxed inner outline fighting the panel edges).
     - Shown automatically when a column has `> 7` distinct values (for tiny 3–5 value status columns, the popover skips search altogether and shows only the ultra-clean checklist!).
   - **Calm Additive Checklist (Zero Idle Blue-Checkbox Spam, No Top Utility Strip):**
     - **Unchecked at rest = unfiltered:** Opening an unfiltered column displays serene monochrome rows with zero saturated blue checkboxes shouting for attention.
     - **1-click inclusion:** Clicking `Active` immediately checks `[✓] Active` and filters the table to `Active`; clicking `Pending` expands to `Active OR Pending`; unchecking all returns seamlessly to unfiltered.
     - **Row geometry:** `<ScrollArea size="sm" direction="vertical">` (`max-block-size: 204px`, `padding: 4px`, `gap: 2px`, virtualized via `VirtualScroll` when `> 200` values). Each row is a `30px`-tall full-row `<label>` (`padding-inline: 8px`, `gap: 8px`, `border-radius: 10px`, `corner-shape: var(--cs-squircle-soft)`):
       - `<Checkbox variant="soft" size="sm" />` (`16px` box, `5px` radius)
       - Truncated label (`12px`, `line-height: 18px`, `font-weight: 400`, `--cs-color-text-main` → `--cs-color-text-strong` when checked—keeping `weight: 400` avoids glyph-width jitter on check!)
       - Quiet trailing count (`11px`, `tabular-nums`, `--cs-color-text-weaker`, `margin-inline-start: auto`).
     - Row hover: `--cs-color-base-soft` (`--cs-dur-effect-fast`).
     - On re-open while filtered, already-checked items pin gently to the top of the list for effortless review (never jumping mid-click while checking boxes).

4. **Zone 2B — Airy Condition Filter:**
   - `padding: 8px; display: flex; flex-direction: column; gap: 8px;`.
   - Operator: Full-width `<Select variant="soft" size="xs" />` (`28px` height, `9px` radius — e.g. `Contains`, `Equals`, `Greater than`, `Less than`, `Between`, `Is empty`).
   - Value field(s):
     - `Is empty` / `Is not empty`: zero inputs rendered.
     - Single-value operators: full-width `<TextInput variant="soft" size="xs" placeholder="Value" />`.
     - `Between`: balanced 2-column grid (`grid-template-columns: 1fr 1fr; gap: 6px;`) with `<TextInput variant="soft" size="xs" placeholder="Min" />` and `<TextInput variant="soft" size="xs" placeholder="Max" />`.
   - Live application (`0ms` for `< 2,000` rows, `120ms` debounce for `>= 2,000` rows)—no redundant `Apply` button.

5. **Zone 3 — Conditional Quiet Footer (`height: 34px`, Hidden When Idle):**
   - Separated by a crisp `1px` top hairline (`--cs-listbox-separator-bg`), `padding-inline: 6px 12px` (`padding-inline-start: 6px` aligns the ghost button's inner text optically with the `12px` content edge above!).
   - **When searching in checklist (unfiltered or filtered):** Left = `<Button variant="ghost" size="xs">Select matches</Button>` (selects all search-filtered values in 1 click); Right = `N matches` (`11px`, `tabular-nums`, `--cs-color-text-weaker`).
   - **When filtered (not searching):** Left = `<Button variant="ghost" size="xs">Clear</Button>`; Right = `142 matching` (`11px`, `tabular-nums`, `--cs-color-text-weak`).
   - **When idle (neither searching nor filtered):** Footer does not render (`0px`).

### 4. Bottom-Docked Contextual Status Bar (Zero Layout Jump)

Mounting a status bar *above* the table header causes a jarring `34px–42px` downward jump whenever the first filter or row checkbox is toggled—breaking anchored popover alignment and knocking rows out from under the user's pointer during rapid multi-row selection.

**Solution: Dock `.cs-data-table-status-bar` at the BOTTOM of `.cs-data-table` (below `.cs-scroll-area`, `flex-shrink: 0`):**

- **Zero header/row shift:** Headers, anchored popovers, and visible rows stay **100% spatially locked** during filtering and multi-row selection.
- **Zero row occlusion:** Unlike floating overlay pills, a docked footer strip never covers the last row of a compact 4-row table.
- **Hidden when idle (`0px`):** Reveals smoothly via a `grid-template-rows: 0fr → 1fr` + `opacity` wrapper (`--cs-dur-200` `--cs-ease-quart-out`) only when `activeFilterCount > 0` or `selectedCount > 0` (unless custom `children` are provided).
- **Surface harmony:**
  - Separated from the scroll viewport by a single `1px` top hairline (`--cs-data-table-header-divider`).
  - `height: var(--cs-data-table-status-bar-height)` (`32 / 34 / 38 / 42px`), `padding-inline: var(--cs-data-table-edge-px)`.
  - **Filter summary mode** (`selectedCount === 0 && activeFilterCount > 0`):
    - Matches the shell's opaque header backing (`--cs-data-table-header-bg`) so it feels seamlessly integrated into the squircle bottom.
    - Start: `142 of 12,480 rows` (`12px`, `tabular-nums`, `--cs-color-text-weak`) + subtle middle dot `·` (`--cs-color-text-weaker`) + clickable column links (`Status`, `Region` in `--cs-color-text-main`, `weight: 500`, soft rounded hover pill—clicking scrolls to & opens that column's popover; `> 3` columns condense to the first 2 + `+N more`).
    - End: `<Button variant="ghost" size="xs">Reset filters</Button>`.
  - **Selection mode** (`selectedCount > 0`, takes priority cleanly):
    - Surface transitions softly to a calm accent wash (`light-dark(color-mix(in oklab, var(--cs-color-accent-500) 7%, var(--cs-data-table-header-bg)), color-mix(in oklab, var(--cs-color-accent-500) 14%, var(--cs-data-table-header-bg)))`).
    - Start: `3 selected` (`12px`, `weight: 500`, `tabular-nums`, `--cs-color-accent-soft-fg`) + optional quiet `<Button variant="ghost" size="xs">Select all 142</Button>` when partially selected.
    - End: Consumer `selectionActions` slot (`Button size="xs"`) + `<Button variant="ghost" size="xs">Clear</Button>`.

### 5. ContextMenu Scope Verdict (V1)

**A right-click `ContextMenu` is intentionally omitted in V1.**
- Column actions (sort, clear sort, value/condition filter) live inside the discoverable, keyboard-accessible **Column Header Popover**.
- Row actions live in an optional trailing **Row Actions cell** using [`Dropdown`](../dropdown/dropdown.docs.md).
- Preserving the native browser context menu on read-only cells keeps effortless text copy and inspection unobstructed.

---

## 7. Scrolling, Virtualization & Large-Dataset Ergonomics

`DataTable` composes [`ScrollArea`](../scroll-area/scroll-area.docs.md) and [`VirtualScroll`](../virtual-scroll/virtual-scroll.docs.md) so 5 rows and 100,000 rows share identical craft:

1. **Shell Clipping & Overlay Scrollbars:**
   - `.cs-data-table` sets `overflow: clip` so scrolling rows clip smoothly to the outer squircle radius without breaking `position: sticky` inside `.cs-data-table-viewport`.
   - `ScrollArea` (`direction="both"`, `scrollbar="hover"`) overlays thin (`3px → 6px` at `xs`/`sm`, `4px → 8px` at `md`/`lg`) rounded thumbs at `z-index: 30` with zero layout-gutter shift.
2. **Deterministic Layering (`z-index` Stack inside `isolation: isolate`):**
   - Body cells: `0`
   - Pinned body columns (`[data-pinned="start" | "end"]`): `5` — MUST paint a **100% opaque** backing (`--cs-data-table-sticky-bg`, resolved per variant and `[data-striped] [data-even]`, falling back to `--cs-data-table-backdrop-bg` on `transparent`) beneath Layer 2/3 selection and hover overlays so horizontally scrolling text never bleeds through.
   - Sticky header row: `10`
   - Sticky corner cells (sticky header ∩ pinned column): `15` (within header stacking context)
   - `ScrollArea` overlay tracks: `30`
   - `elevated` dark-mode specular shell rim (`::after`, `pointer-events: none`): `40`
   - Shared Column Header `Popover`: Browser top-layer (`popover="auto"`)
3. **Subpixel-Safe Layout & Flow-Preserving Virtualization:**
   - All row heights (`28 / 36 / 44 / 52px`), header heights (`30 / 34 / 38 / 42px`), and line-heights (`16 / 18 / 20px`) are **exact whole integers**.
   - `VirtualScroll` operates in flow-preserving **Padding Mode** (`attachList` setting integer `padding-block-start` / `padding-block-end` in normal document flow—zero `position: absolute`, zero `translate3d`), keeping cell text razor-sharp without permanent GPU-layer bilinear blur.
   - **Never** set permanent `will-change: transform` on rows or cells.
4. **Zero Ghost-Hover Trails During Fast Fling Scrolling:**
   - While `[data-scrolling]` is active, snap `--cs-data-table-row-hover-dur: 0ms` so rapid wheel or thumb-drag scrolling through 100,000 recycled rows never leaves lagging hover trails.

---

## 8. Empty States, Selection & Motion Choreography

### 1. Empty & Filtered-Empty States

- `.cs-data-table-header` remains visible at full width so the table retains spatial identity and zero vertical collapse.
- `.cs-data-table-empty` uses `position: sticky; inset-inline-start: 0; inline-size: var(--cs-data-table-viewport-width, 100%)` so empty-state copy stays centered in the visible viewport even on wide horizontally scrollable tables (`padding-block: 36px` `xs` / `48px` `sm` & `md` / `64px` `lg`, inner text stack `max-inline-size: 280px`, centered):
  - **Bare monochrome icon (`20px`–`24px`, `stroke-width: 1.75`, `--cs-color-text-weaker`):** Quiet vector glyph—never wrapped in a tinted circle or card box.
  - **Headline:** `13px`–`14px`, `font-weight: 500`, `--cs-color-text-strong` (`No rows yet` / `No matching rows`).
  - **Subtext (1 concise line):** `12px`, `--cs-color-text-weak` (`Adjust or clear active filters to see results.`).
  - **Filtered-empty action:** Single `<Button variant="secondary" size="xs">Reset filters</Button>`.

### 2. Row Selection (`Checkbox` Column)

- **Soft-on-Soft Guard:** Use `<Checkbox variant="soft" />` on `elevated` and `transparent` tables; switch to `<Checkbox variant="elevated" />` on `variant="soft"` tables so unchecked boxes retain crisp surface contrast.
- **Full-Cell Click Target (Void Control Rule):** Place each row's void `<Checkbox />` inside a cell-filling `<label class="cs-data-table-selection-hit">` (`display: flex; align-items: center; justify-content: center; inline-size: 100%; block-size: 100%;`)—never add pseudo-element hit-area hacks or wrapper boxes around `<input type="checkbox">`.
- **Header Tri-State:** Header `<Checkbox />` binds `checked` and `indeterminate` cleanly; selected rows highlight via the non-destructive accent wash + `2px` leading accent bar (Section 5).

### 3. Motion Choreography (`src/css/foundation/motion.css`)

All transitions use semantic `motion.css` tokens and inherit global `prefers-reduced-motion: reduce` automatically (never duplicate reduced-motion media queries inside the module):

| Interaction | Properties | Duration Token | Easing Token | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Row hover sheen** | `background-image` / `--cs-data-table-cell-hover-overlay` | `--cs-dur-60` (`60ms`) *(0ms while `[data-scrolling]`)* | `--cs-ease-effect` | High-frequency vertical sweeps demand instant response with zero lagging trail. |
| **Header inset pill & cue fade** | `color`, `background-color`, `opacity` | `--cs-dur-effect-fast` (`100ms`) | `--cs-ease-effect` | Snappy horizontal scanning across adjacent column headers. |
| **Header chevron open/close** | `rotate` (`0deg ↔ 180deg`) | Open: `--cs-dur-200` / Close: `--cs-dur-exit-md` (`120ms`) | Open: `--cs-ease-quart-out` / Close: `--cs-ease-exit` | Asymmetric precision matching `SelectTrigger` and `ComboboxTrigger`. |
| **Sort arrow flip (asc ↔ desc)** | `rotate` (`0deg ↔ 180deg`) | `--cs-dur-effect` (`160ms`) | `--cs-ease-quart-out` | Clean directional flip without distracting bounce. |
| **Sticky header scroll shadow** | `opacity` on `::after` | `--cs-dur-effect` (`160ms`) | `--cs-ease-effect` | Smooth grounded elevation as row 0 glides underneath. |
| **Column Header Popover** | Native `Popover` `[data-animate]` (`opacity`, `scale`, `translate`, `filter`) | In: `--cs-dur-enter-sm` (`260ms`) / Out: `--cs-dur-exit-sm` (`100ms`) | In: `--cs-ease-enter` / Out: `--cs-ease-exit` | Tighter travel (`distance: 6px`, `scale-start: 0.94`) so hopping between column headers feels effortless. |
| **2-up sort button press** | `scale` (`0.97`), `background-color` | `--cs-dur-press` (`140ms`) | `--cs-ease-press` | Tactile spring-like responsiveness matching `listbox.css` items. |
| **Bottom status bar reveal** | `grid-template-rows`, `opacity` | `--cs-dur-200` (`200ms`) | `--cs-ease-quart-out` | Calm bottom-edge reveal with zero shift to headers, popovers, or rows above. |
| **Virtualized row updates** | **None (`transition: none`)** | `0ms` | — | Sorting, filtering, or scrolling 100k rows must snap instantaneously. |

---

## 9. Preview Blueprint & Blueprint Sync Deltas

### Preview Composition Blueprint (`DataTable.preview.svelte`)

1. **Interactive Base & Controls Playground:** Balanced `md` `elevated` orders/invoices table (~50 rows) with live controls for `variant` (`elevated` / `soft` / `transparent`), `size` (`xs` / `sm` / `md` / `lg`), `striped`, `gridlines`, and `selectable`—demonstrating calm surface-matched headers, inset-pill active states, the streamlined Column Header Popover, bottom-docked status bar, `Badge` status cells, and right-aligned tabular currency.
2. **High-Density 100,000-Row Stress Demo:** `xs` `elevated` `gridlines` analytical dataset (100,000 rows × 16 columns) backed by `VirtualScroll` Padding Mode—verifying sticky header scroll shadow, dark-mode specular rim preservation, pinned selection column, instant sorting, virtualized additive checklist filtering, and razor-sharp text.
3. **Conditional Formatting & Custom Cell Tints:** Variance & performance table mixing semantic tones (`positive`, `caution`, `negative`, `accent`, `base`) and custom cell fills in both `tint` and `exact` modes across light and dark themes.
4. **Rich Cells & Concentric Card Nesting:** `soft` and `transparent` `DataTable`s nested cleanly inside an `elevated` [`Card`](../card/card.docs.md) with concentric squircle radii, `lg` two-line primary/secondary cells, wrapped notes, `<Progress />` attainment meters, `<NumberMorph />` readouts, and trailing `<Dropdown />` row actions.
5. **Empty & Filtered-Empty States:** Side-by-side calm empty state and interactive filtered-empty state with one-click `Reset filters`.

### Blueprint Sync Deltas (Changes Relative to Current `data-table.blueprint.md`)

The following refinements in this spec should be synced into `src/modules/data-table/data-table.blueprint.md` before implementation:

1. **Standalone Framing:** Remove `cs/excel` narrative framing from blueprint overview and preview descriptions while keeping all generic capabilities (`xs` density, `gridlines`, `bg`/`fg`/`colorMode`).
2. **Calibrated Metrics:**
   - Row heights: `28 / 36 / 44 / 52px` (`sm` `34 → 36px`, `md` `42 → 44px`).
   - Header heights: `30 / 34 / 38 / 42px` (`lg` `44 → 42px`).
   - Outer edge padding: `12 / 16 / 20 / 24px` on `elevated`/`soft` (`sm` `14 → 16px`, `md` `18 → 20px`); `8 / 10 / 12 / 16px` (`--cs-data-table-cell-px`) on `transparent`.
   - Selection track widths: `36 / 40 / 44 / 52px` (`xs` `34 → 36px`, `sm` `38 → 40px`).
   - Status bar heights: `32 / 34 / 38 / 42px`.
3. **Surface-Matched Sticky Header + Dark-Mode Top Rim Guard:** Sticky header matches the shell surface at rest across all 3 variants; `elevated` renders its dark-mode inset rim via a `z-index: 40; pointer-events: none` `::after` overlay on `.cs-data-table`.
4. **Inset-Pill Header States:** Replace `2px` bottom accent underlines with unbroken `1px` header hairlines + concentric inset squircle pills (`::before`) for hover/open (neutral) and filtered (whisper accent) states.
5. **Redesigned Column Popover (`DataTableColumnPopover.internal.svelte`):**
   - Replace two stacked sort listbox rows with a sleek **30px 2-up horizontal sort toggle pair** (`aria-pressed`).
   - Replace the boxed checklist `<TextInput>` with a **34px flush borderless search row** (hidden automatically when distinct values `<= 7`).
   - Adopt **calm additive checklist selection** (0 boxes checked at rest; 1-click inclusion; removes the top `Select all · Clear 12 of 48` utility strip; moves `Select matches` / `Clear` + tabular match count into the conditional bottom footer).
6. **Bottom-Docked `DataTableStatusBar`:** Move `.cs-data-table-status-bar` below `.cs-scroll-area` (`flex-shrink: 0`) inside `.cs-data-table` so headers, anchored popovers, and visible rows never shift vertically when filters or selections toggle.
7. **Composed Cell Inset Shadows & Inset Focus Rings:** Place horizontal row dividers inside `.cs-data-table-cell`'s composed `box-shadow` (preventing breaks across opaque pinned columns), and set `outline-offset: -2px` on `.cs-data-table-header-trigger:focus-visible` and interactive `.cs-data-table-row:focus-visible` so focus rings never clip.
