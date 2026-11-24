# Command Palette Design Spec (`src/modules/command-palette/`)

## 1. Anti-Clunk & Anti-Noise Visual Principles

Most command palettes fail visually in one of two directions: they either look like a **clunky modal form** (heavy outer padding, boxed search input, loud focus rings, tall two-line cards) or **visual noise** (blurred chromatic smears behind translucent chrome, fragmented floating sub-cards, 3D keycap badges on every row, hairline-carved boxes, and jittery list animations on every keystroke).

`CommandPalette` achieves calm, high-speed focus—even when extended with plugins, scope stacks, inline widgets, and split previews—through five strict optical rules:

### 1. Zero Double-Chrome (2-Region Machined Pair — Max 2 Surfaces)
- **Single Canonical Design (No `variant` Prop):** Matching `Modal` and `Dropdown`, `CommandPalette` ships one cohesive floating architecture—no visual `variant` prop, no outer dialog card, and **zero** structural hairline borders between regions.
- **Transparent Motion Shell (`.cs-command-palette`):** `.cs-command-palette` is a transparent flex-column container (`background: transparent`, `box-shadow: none`, `border: none`, `overflow: visible`, `gap: var(--cs-command-palette-gap)` — `8px` at `sm`/`md`, `10px` at `lg`). It owns the unified enter/exit motion (`260ms` enter / `120ms` exit) so both surfaces move together as one rigid instrument.
- **Strict 2-Surface Ceiling:** At most **two** `--cs-color-elevated` floating regions ever appear, sharing identical `--cs-command-palette-radius` (`18px` / `20px` / `22px`), identical `corner-shape: var(--cs-squircle)` (`2.0`), and native `--cs-shadow-floating`, separated cleanly by `--cs-command-palette-gap`:
  - **Region 1 (`CommandPaletteBar`):** Standalone floating command bar (`--cs-color-elevated`, `--cs-command-palette-radius`, `corner-shape: var(--cs-squircle)` `2.0`, `--cs-shadow-floating`, zero borders). `CommandPaletteInput` carries **zero** inner border, fill, or inset focus ring—readiness is signaled purely by the crisp `--cs-color-accent-solid` blinking caret and calm `--cs-color-text-weak` leading icon.
  - **Region 2 (`CommandPaletteBody` — Unified Tray):** A single `--cs-color-elevated` tray (`--cs-command-palette-radius`, `corner-shape: var(--cs-squircle)` `2.0`, `--cs-shadow-floating`, `overflow: hidden`) that houses `CommandPaletteList`, optional `CommandPalettePreview`, scoped `CommandPalettePage`, and optional `CommandPaletteFooter` via borderless interior separation. When `CommandPaletteBody` is omitted in simple palettes, a direct-child `CommandPaletteList` (or standalone `CommandPalettePage`) assumes the identical Region 2 surface treatment.
- **Native `--cs-shadow-floating` Across Clean Gaps:** Because the palette caps at two stacked regions separated by an `8px` / `10px` gap (never narrow side-by-side split shadows), both regions use the system's canonical `--cs-shadow-floating` directly—preserving uniform ambient depth and dark-mode top-lit rim alignment with `Modal` and `Popover`.
- **Pure CLI Pill State (Zero Stray Chrome):** Because there is no outer box or bar hairline, omitting or collapsing Region 2 leaves `CommandPaletteBar` floating cleanly on its own as a pure Spotlight/CLI launcher with zero stray borders or empty shells.

### 2. Upper-Viewport Optical Anchor (`min(15dvh, 128px)` -> `min(16dvh, 160px)` on Large Desktop)
- **The Problem:** Vertically centering (`align-items: center`) a dynamic search dialog causes the input bar to jump up and down on every keystroke as matching rows shrink from 12 items to 1 item.
- **Our Solution:** `.cs-command-palette-overlay` pins `align-items: flex-start` and `justify-content: center` with `padding-block-start: calc(var(--cs-command-palette-offset-top) + var(--cs-overlay-inset-top, 0px))`, where `--cs-command-palette-offset-top` defaults to `min(15dvh, 128px)` and lifts to `min(16dvh, 160px)` at `@media (min-width: 1536px)` so wide desktop monitors maintain a balanced upper-sixth horizon.
- `<CommandPaletteBar>` stays locked at the reading horizon while only Region 2 below expands or contracts downward.

### 3. Calm Backdrop (`overlayVariant="dim"` Default vs. `"blur"`)
- **The Problem:** Over dense workspaces (tables, syntax-highlighted code, status badges), `backdrop-filter: blur(16px) saturate(160%)` smears underlying UI colors into distracting chromatic blobs and adds unnecessary GPU compositing work for an overlay toggled dozens of times per session via `Mod+K`.
- **Our Solution:** `overlayVariant` defaults to `"dim"` (`light-dark(color-mix(in oklch, var(--cs-color-base-950) 28%, transparent), color-mix(in oklch, black 65%, transparent))` from [`Overlay`](../overlay/Overlay.svelte)). It quiets the background uniformly while keeping peripheral workspace context legible and giving the two `--cs-color-elevated` surfaces + `--cs-shadow-floating` crisp figure-ground separation in both light and dark themes.
- When opted into `overlayVariant="blur"` (for sparse marketing/dashboard surfaces), `.cs-command-palette-overlay` inherits `Overlay`'s frosted blur while syncing its exit duration to `120ms` so dismissal stays instantaneous.

### 4. Shortcut & Metadata Restraint (Avoiding "Keycap Soup")
- **The Problem:** Stacking 8–10 rows of 3D `variant="keycap"` `<Kbd>` badges creates a high-contrast right-hand column of borders and bottom lips that visually competes with command titles.
- **Our Solution:**
  - **In command rows (`CommandPaletteItemShortcut`):** Defaults to `--cs-command-palette-shortcut-fg: var(--cs-color-text-weaker)` with `font-variant-numeric: tabular-nums` and pairs with `<KbdGroup variant="ghost" size="sm">` (at `sm`/`md`) or `<KbdGroup variant="ghost" size="md">` (at `lg`), using `transparent` fill and zero shadow. Nested `.cs-kbd[data-variant="ghost"]` inherits `--cs-kbd-fg: var(--cs-command-palette-shortcut-fg)`. Only when the row is `[data-highlighted]` (or pointer-hovered) does `--cs-command-palette-shortcut-fg` step up to `--cs-color-text-main`—keeping unfocused rows quiet and surfacing the shortcut right when targeted.
  - **In `CommandPaletteFooter`:** Uses `<Kbd variant="soft" size="sm">` (at `sm`/`md`) or `<Kbd variant="soft" size="md">` (at `lg`)—or matching `<KbdGroup>`—where `--cs-color-base-soft` pill fills frame navigation legends (`↑↓`, `↵`, `Esc`) softly without borders or 3D lips.

### 5. Single-Line Density by Default & Plumb-Line Optical Alignment
- **The Problem:** Rendering every command as a tall two-line card (`52px+`) halves visual scan speed and makes a 6-item menu feel bloated.
- **Our Solution:**
  - **Single-line primary density:** Items default to crisp single-line rows (`34px` / `38px` / `42px` min-height) with `font-weight: 500` labels (`text-box: trim-both cap alphabetic`). Brief contextual metadata (e.g. parent category or workspace name) should sit **inline** beside `CommandPaletteItemText` in `--cs-color-text-weak` (`font-weight: 400`) whenever it fits on one line; reserve `CommandPaletteItemDescription` (the 2-row `listbox.css` subtitle grid, `row-gap: 2px`, `--cs-text-xs`, `--cs-color-text-weak`) strictly for rich search entities (e.g. documentation hits or file paths) that genuinely need a second line.
  - **Vertical optical plumb line:** Both `CommandPaletteBar` and `CommandPaletteItem` subtract `2px` from `padding-inline-start` when a leading icon is present (compensating for Lucide's `2px` internal SVG viewBox whitespace), and calibrate `bar-px === list-pad + item-px === footer-px` across every size (`16px`, `18px`, `22px`) so `CommandPaletteIcon`, `CommandPaletteGroupLabel`, `CommandPaletteItemIcon`, and `CommandPaletteFooter` align on a single vertical axis across both regions.

---

## 2. Geometry & Proportional Scale (`sm` | `md` | `lg`)

`size` (`"sm" | "md" | "lg"`, required, no default) scales shell width, inter-region gap, corner radii, command bar height, scope pills, list item geometry, and footer proportions cohesively, with a calibrated large-desktop lift at `@media (min-width: 1536px)`:

### Shell, Region Geometry & Command Bar Matrix

| Token / Metric | `sm` | `md` | `lg` |
| :--- | :--- | :--- | :--- |
| `--cs-command-palette-max-width` (base) | `480px` | `600px` | `704px` |
| `--cs-command-palette-max-width` (`>= 1536px`) | `512px` | `656px` | `768px` |
| `--cs-command-palette-offset-top` (base / `>= 1536px`) | `min(15dvh, 128px)` / `min(16dvh, 160px)` | `min(15dvh, 128px)` / `min(16dvh, 160px)` | `min(15dvh, 128px)` / `min(16dvh, 160px)` |
| `--cs-command-palette-list-max-height` (base) | `min(360px, 52dvh)` | `min(400px, 54dvh)` | `min(440px, 56dvh)` |
| `--cs-command-palette-list-max-height` (`>= 1536px`) | `min(400px, 54dvh)` | `min(460px, 56dvh)` | `min(520px, 58dvh)` |
| `--cs-command-palette-gap` | `8px` | `8px` | `10px` |
| `--cs-command-palette-radius` (Region 1 & Region 2) | `18px` | `20px` | `22px` |
| Region 1 & Region 2 `corner-shape` / `box-shadow` | `--cs-squircle` (`2.0`) / `--cs-shadow-floating` | `--cs-squircle` (`2.0`) / `--cs-shadow-floating` | `--cs-squircle` (`2.0`) / `--cs-shadow-floating` |
| `--cs-command-palette-bar-height` | `46px` | `52px` | `58px` |
| `--cs-command-palette-bar-px` | `16px` (`14px` w/ icon) | `18px` (`16px` w/ icon) | `22px` (`20px` w/ icon) |
| `--cs-command-palette-bar-gap` | `8px` | `10px` | `12px` |
| `--cs-command-palette-icon-size` (Bar) | `16px` (`stroke: 2.25`) | `18px` (`stroke: 2.25`) | `20px` (`stroke: 2.25`) |
| `CommandPaletteInput` `font-size` | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-base)` (`16px`) | `var(--cs-text-base)` (`16px`) |
| `CommandPaletteScope` height / `px` / radius | `22px` / `8px` / `7px` | `24px` / `9px` / `8px` | `26px` / `10px` / `9px` |
| `CommandPaletteScope` `font-size` | `11px` | `var(--cs-text-xs)` (`12px`) | `var(--cs-text-xs)` (`12px`) |
| `CommandPaletteClear` size / icon | `24px` / `14px` | `28px` / `16px` | `30px` / `16px` |
| `CommandPaletteClear` concentric end inset | `11px` (`(46 - 24) / 2`) | `12px` (`(52 - 28) / 2`) | `14px` (`(58 - 30) / 2`) |

### Concentric List, Item, Group & Footer Matrix

`CommandPaletteList` composes [`src/shared/listbox/listbox.css`](../../shared/listbox/listbox.css) (`data-size={size}`) while calibrating `--cs-listbox-content-padding` so inner item and preview corners (`calc(var(--cs-command-palette-radius) - var(--cs-listbox-content-padding))`) sit concentrically inside Region 2's `--cs-squircle` tray and align identically with `CommandPaletteBar`:

| Token / Metric | `sm` | `md` | `lg` |
| :--- | :--- | :--- | :--- |
| `--cs-listbox-content-padding` | `8px` | `8px` | `10px` |
| `--cs-listbox-item-radius` (concentric) | `10px` (`18 - 8`) | `12px` (`20 - 8`) | `12px` (`22 - 10`) |
| `--cs-listbox-item-min-height` | `34px` | `38px` | `42px` |
| `--cs-listbox-item-px` / `py` | `8px` (`6px` w/ icon) / `6px` | `10px` (`8px` w/ icon) / `7px` | `12px` (`10px` w/ icon) / `8px` |
| Plumb-line text inset (`list-pad + item-px`) | `16px` (`= bar-px`) | `18px` (`= bar-px`) | `22px` (`= bar-px`) |
| `--cs-listbox-item-font-size` | `13px` | `var(--cs-text-sm)` (`14px`) | `15px` |
| `--cs-listbox-icon-size` (Item) | `15px` (`stroke: 2.25`) | `16px` (`stroke: 2.25`) | `17px` (`stroke: 2.25`) |
| `--cs-listbox-group-label-font-size` | `11px` | `var(--cs-text-xs)` (`12px`) | `var(--cs-text-xs)` (`12px`) |
| `.cs-command-palette-group-label` `padding-block` | `6px 4px` (first: `6px` top -> `14px` total) | `6px 4px` (first: `6px` top -> `14px` total) | `6px 4px` (first: `8px` top -> `18px` total) |
| `--cs-command-palette-footer-height` (min) | `36px` | `40px` | `44px` |
| `--cs-command-palette-footer-font-size` | `var(--cs-text-xs)` (`12px`) | `13px` | `13px` |
| `--cs-command-palette-footer-px` / `py` | `16px` / `8px` | `18px` / `8px` | `22px` / `10px` |
| `<Kbd>` / `<KbdGroup>` `size` (Row & Footer) | `sm` | `sm` | `md` |

### Top-Padding Breathing Room Fix
- **The Problem:** With tight list padding and zeroed first-group top padding, the first `CommandPaletteGroupLabel` crowds the ceiling of Region 2—feeling optically cramped compared to the balanced horizontal inset (`16px` / `18px` / `22px`).
- **Our Solution:** Combine `--cs-listbox-content-padding` (`8px` at `sm`/`md`, `10px` at `lg`) with `.cs-command-palette-group-label` `padding-block: 6px 4px`, keeping the first group (`.cs-command-palette-group:first-of-type > .cs-command-palette-group-label`) at `padding-block-start: 6px` (`sm`/`md` -> **`14px`** total from tray ceiling) and `8px` (`lg` -> **`18px`** total from tray ceiling). Subsequent groups add `--cs-listbox-group-gap` naturally above their `6px` top padding.

### Hit Areas & Subpixel GPU Crispness
- **Compact Button Hit Areas:** Both `CommandPaletteClear` (`24px–30px`) and `CommandPaletteScope` (`22px–26px` tall) are `<button type="button">` controls below `1936px²` and render `<HitArea size="sm" />`. `CommandPaletteInput` is a void `<input>` whose full surrounding bar focuses it on `mousedown`—never wrap `<input>` in pseudo/container hit-area helpers.
- **Whole-Pixel Line-Height Snapping:** Because `.cs-command-palette` promotes `will-change: opacity, scale, translate` while open (`:popover-open`), fractional computed line heights (`14px × 1.25 = 17.5px`, `12px × 1.375 = 16.5px`, `13px × 1.375 = 17.875px`) MUST snap locally via CSS `round()`:
  - Group labels (`--cs-leading-tight`): `line-height: round(up, calc(var(--cs-listbox-group-label-font-size) * var(--cs-leading-tight)), 1px)`
  - Descriptions & empty state (`--cs-leading-snug`): `line-height: round(up, calc(var(--cs-text-xs) * var(--cs-leading-snug)), 1px)`
  - Footer (`--cs-leading-snug`): `line-height: round(up, calc(var(--cs-command-palette-footer-font-size) * var(--cs-leading-snug)), 1px)`
  - Horizontal centering relies strictly on `.cs-command-palette-overlay` flex layout (`justify-content: center`), never `translate: -50%`.

---

## 3. Extensibility Surfaces (Scope, Widgets, Unified Region 2 Tray, Preview, Footer & Separators)

### DOM & Slot Hierarchy

```text
.cs-overlay.cs-command-palette-overlay (data-variant="dim"|"blur"|...)
└── .cs-command-palette (transparent flex-column shell, gap: 8px|10px, overflow: visible, role="dialog", data-size, data-has-page, data-nav="keyboard")
    ├── [Region 1] .cs-command-palette-bar (elevated surface, radius: 18|20|22px, squircle 2.0, --cs-shadow-floating, zero borders)
    │   ├── [optional] .cs-command-palette-icon
    │   ├── [auto/optional] .cs-command-palette-scope (<HitArea size="sm" />)
    │   ├── .cs-command-palette-input (input[role="combobox"])
    │   └── [optional] .cs-command-palette-clear (<HitArea size="sm" />, data-visible="false"|"")
    └── [Region 2] .cs-command-palette-body (unified elevated tray, radius: 18|20|22px, squircle 2.0, --cs-shadow-floating, overflow: hidden, CSS Grid)
        │   OR [shorthand] direct-child .cs-command-palette-list (assumes identical Region 2 surface when CommandPaletteBody is omitted)
        ├── [col 1, row 1] .cs-command-palette-list (transparent inside Body; ScrollArea + scrollFade)
        │   ├── .cs-command-palette-widget (inline plugin/answer surface)
        │   ├── .cs-command-palette-group -> .cs-command-palette-group-label + .cs-command-palette-item*
        │   ├── .cs-command-palette-separator (unlabeled sections only)
        │   └── .cs-command-palette-empty
        ├── [col 1, row 1, scoped] .cs-command-palette-page (active when activePage === value)
        ├── [col 2, row 1, optional] .cs-command-palette-preview (--cs-color-base-soft concentric inset card, squircle-smooth 1.6)
        └── [col 1 / -1, row 2, optional] .cs-command-palette-footer (tonal floor strip, 3% text-main tint, zero border, zero shadow)
```

### 1. `CommandPaletteScope` (Breadcrumb / Prefix Pill)
- **Surface & Typography:** `display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; max-inline-size: 160px;` in `--cs-command-palette-scope-bg` (`var(--cs-color-base-soft)`) with `--cs-command-palette-scope-fg` (`var(--cs-color-text-main)`), `font-weight: 500`, `corner-shape: var(--cs-squircle-soft)` (`1.2`), and `text-box: trim-both cap alphabetic` on its truncated label span.
- **Seamless Typing Rhythm:** When `.cs-command-palette-scope` immediately precedes `.cs-command-palette-input`, it pulls the input `2px` closer (`margin-inline-end: -2px`) so the blinking caret feels visually tethered to the active scope rather than stranded across a wide gap.
- **Hover & Press:** Brightens to `--cs-command-palette-scope-bg-hover` (`var(--cs-color-base-soft-hover)`) and `--cs-color-text-strong` on `:hover`; `onpointerdown` calls `preventDefault()` so clicking to pop a scope never blurs `CommandPaletteInput`.

### 2. `CommandPaletteWidget` (Inline Extension & Instant-Answer Cards)
- **Role:** Hosts non-option blocks inside `CommandPaletteList` or `CommandPalettePage`—such as live calculator readouts (`= 42 * 1.19`), unit/currency conversions, status summaries, or compact inline forms—without disguising them as selectable `role="option"` rows.
- **Native Surface Integration:**
  - Rendered inside the list's `--cs-listbox-content-padding` inset with concentric `border-radius: var(--cs-listbox-item-radius)` and `corner-shape: var(--cs-squircle-smooth)` (`1.6`).
  - Uses `--cs-command-palette-widget-bg: var(--cs-color-base-soft)` (`padding: 10px 12px` at `sm`, `12px 14px` at `md`, `14px 16px` at `lg`), **zero CSS borders**, and **zero drop shadows**—separating from the `--cs-color-elevated` tray purely via calm monochrome tone contrast.
  - Adjacent widgets and groups maintain clean breathing room (`margin-block-end: 4px` when followed by `.cs-command-palette-group` or `.cs-command-palette-item`).
  - Interactive child controls (`Button`, `Switch`, `CopyButton`, `TextInput`) own their native `:focus-visible` rings and tactile press physics while `.cs-command-palette-widget` itself remains static (`cursor: default`, no row hover fill).

### 3. `CommandPaletteBody` + `CommandPalettePreview` (Unified Tray & Concentric Inset Card)
- **CSS Grid Tray Layout:** `.cs-command-palette-body` is Region 2's unified `--cs-color-elevated` surface (`border-radius: var(--cs-command-palette-radius)`, `corner-shape: var(--cs-squircle)` `2.0`, `box-shadow: var(--cs-shadow-floating)`, `overflow: hidden`) driven by a 2-row CSS Grid with **zero** interior borders:
  - Default columns: `grid-template-columns: minmax(0, 1fr)`
  - Split columns (`.cs-command-palette-body:has(> .cs-command-palette-preview)`): `grid-template-columns: minmax(0, 1fr) var(--cs-command-palette-preview-width, 44%)`
  - Rows: `grid-template-rows: minmax(0, 1fr) auto`
  - `.cs-command-palette-list` (and active `.cs-command-palette-page`) occupies `grid-column: 1; grid-row: 1` with transparent background and zero shadow when nested inside `CommandPaletteBody`.
- **Concentric Inset Preview Card (`CommandPalettePreview`):**
  - Placed at `grid-column: 2; grid-row: 1` as a borderless `--cs-color-base-soft` inset card seated directly inside Region 2's padding rhythm:
    - `margin-block: var(--cs-listbox-content-padding)`
    - `margin-inline-end: var(--cs-listbox-content-padding)`
    - `margin-inline-start: 0`
    - `border-radius: var(--cs-listbox-item-radius)` (`10px` / `12px` / `12px`, concentric with Region 2's outer radius)
    - `corner-shape: var(--cs-squircle-smooth)` (`1.6`)
  - **Independent Scroll & Optical Padding:** Both `.cs-command-palette-list` and `.cs-command-palette-preview` cap block height to `--cs-command-palette-list-max-height` (subtracting `2 * var(--cs-listbox-content-padding)` on the inset preview card so it aligns flush with the list's scroll viewport) with `overflow-y: auto; overscroll-behavior: contain` and `padding: 12px 14px` (`sm`) / `14px 16px` (`md`) / `16px 20px` (`lg`) inside `CommandPalettePreview`.
- **Narrow-Viewport Collapse (`@media (width < 560px)`):** Below `560px`, `.cs-command-palette-body` collapses back to `grid-template-columns: minmax(0, 1fr)` and `.cs-command-palette-preview` hides (`display: none`), keeping `.cs-command-palette-list` at `100%` inline width without crushing command labels or competing with on-screen keyboards.

### 4. `CommandPaletteFooter` (Tonal Floor Strip inside Region 2)
- **Zero-Footprint Optionality:** Never rendered unless explicitly placed by the consumer.
- **Borderless Tonal Separation:** Placed at `grid-column: 1 / -1; grid-row: 2` inside `.cs-command-palette-body`, spanning the full tray floor beneath both list and preview with **zero border** and **zero shadow**:
  - Fill: `--cs-command-palette-footer-bg: color-mix(in oklab, var(--cs-color-text-main) 3%, transparent)` — a whisper-quiet tonal shelf that distinguishes navigation legends from scrollable results without introducing a `1px` hairline or a third floating card.
  - Geometry & Type: `min-block-size: 36px / 40px / 44px`, `display: flex; align-items: center; justify-content: space-between; gap: 12px`, `font-size: var(--cs-command-palette-footer-font-size)` (`12px` at `sm`, `13px` at `md`/`lg`), and `color: var(--cs-command-palette-footer-fg)` (`var(--cs-color-text-weak)`). Inline padding (`16px` / `18px` / `22px`) locks left-aligned status hints onto the exact same vertical plumb line as `CommandPaletteBar` and item labels above.

### 5. Internal Separators (`CommandPaletteSeparator`)
- **Strict Restraint Rule:** **Never pair `<CommandPaletteSeparator>` with `<CommandPaletteGroupLabel>`.** Group labels already establish clear section hierarchy through vertical spacing (`--cs-listbox-group-gap`) and muted typography; adding a horizontal line above or below a labeled group reintroduces visual noise. Reserve `<CommandPaletteSeparator>` strictly for separating unlabeled groups or standalone action blocks.
- **Automatic `:has()` Orphan-Separator Collapse:** When query filtering hides all items in neighboring groups, orphaned leading, trailing, or consecutive separators collapse automatically with pure CSS `:has()` so a stray horizontal rule never lingers at the top, bottom, or middle of the list:

```css
/* Hide groups whose items are all filtered out */
.cs-command-palette-group:has(.cs-command-palette-item):not(
    :has(.cs-command-palette-item:not([data-hidden]))
) {
    display: none;
}

/* Collapse leading, trailing, or consecutive orphaned separators after filtering */
.cs-command-palette-separator {
    &:first-child,
    &:last-child,
    &:not(
        :has(
            ~ .cs-command-palette-item:not([data-hidden]),
            ~ .cs-command-palette-widget,
            ~ .cs-command-palette-group:has(.cs-command-palette-item:not([data-hidden]))
        )
    ) {
        display: none;
    }
}
```

---

## 4. Motion & Interaction Choreography

Command palettes are high-frequency muscle-memory tools: users often press `Mod+K`, type 3 characters, hit `ArrowDown` + `Enter`, and return to work within `600ms`. Any motion inside the result list creates visual drag and perceived input latency.

### 1. Crisp Unified Shell Enter & Exit (`CommandPalette` + `Overlay` Only)

Because `.cs-command-palette` owns the enter/exit transform and opacity for the entire 2-region machined pair, Region 1 (`CommandPaletteBar`) and Region 2 (`CommandPaletteBody` / direct-child `CommandPaletteList`) arrive and depart together as a single rigid instrument—never staggered:

| Phase | Target | Properties & Delta | Duration Token | Easing Token |
| :--- | :--- | :--- | :--- | :--- |
| **Enter (Spatial)** | `.cs-command-palette` (`@starting-style` -> `:popover-open`) | `transform-origin: top center`; `scale: 0.97 -> 1`; `translate: 0 -6px -> 0 0` | `--cs-command-palette-dur-in` (`--cs-dur-enter-sm`, `260ms`) | `--cs-command-palette-ease-in` (`--cs-ease-enter`, `--cs-spring-snappy`) |
| **Enter (Opacity)** | `.cs-command-palette` | `opacity: 0 -> 1` | `--cs-command-palette-dur-fade-in` (`--cs-dur-effect`, `160ms`) | `--cs-ease-effect` (`--cs-ease-quad-out`) |
| **Enter (Backdrop)** | `.cs-command-palette-overlay:popover-open` | `opacity: 0 -> 1` (plus `backdrop-filter` when `blur`) | `--cs-dur-enter-sm` (`260ms`) | `--cs-ease-effect` |
| **Exit (Shell)** | `.cs-command-palette` (when `:popover-open` removed) | `opacity: 1 -> 0`; `scale: 1 -> 0.98`; `translate: 0 0 -> 0 -4px` | `--cs-command-palette-dur-out` (`--cs-dur-exit-md`, `120ms`) | `--cs-command-palette-ease-out` (`--cs-ease-exit`, `--cs-ease-quad-in`) |
| **Exit (Backdrop)** | `.cs-command-palette-overlay` | Overrides `Overlay` exit transitions (`opacity`, `backdrop-filter`, `display`/`overlay allow-discrete`) to match shell exit | `--cs-command-palette-dur-out` (`120ms`) | `--cs-command-palette-ease-out` (`--cs-ease-exit`) |

- **Why `transform-origin: top center` + `-6px` Y-offset:** Because the pair is anchored near the top of the viewport (`min(15dvh, 128px)` / `min(16dvh, 160px)` at `>= 1536px`), unfolding slightly downward (`-6px -> 0`) with `0.97 -> 1` snappy spring (`~4%` subtle settle) feels physically tethered to the upper horizon without theatrical bounce.
- **Synced `120ms` Top-Layer Teardown:** Overriding `.cs-command-palette-overlay`'s exit duration from `Overlay`'s default `180ms` (`--cs-dur-exit-lg`) down to `120ms` (`--cs-command-palette-dur-out`) ensures `Overlay`'s `out:overlayExit` unmounts the DOM cleanly the instant the palette finishes fading out.

### 2. Strict `0ms` No-Animation Zone Inside the Shell

Inside `.cs-command-palette`, **every** list, item, filter, highlight, group, empty-state, and page transition is strictly `0ms`. Because `CommandPaletteList` composes `src/shared/listbox/listbox.css`, `command-palette.internal.css` MUST explicitly neutralize inherited listbox transitions:

```css
/* Strictly instant (0ms) highlight, press, icon, and shortcut updates */
.cs-command-palette-item {
    scale: 1;
    will-change: auto;
    transition: none;

    &:not([data-disabled]):active {
        scale: 1;
        background-color: var(--cs-command-palette-item-bg-active);
    }

    & .cs-listbox-item-icon,
    & .cs-command-palette-item-shortcut {
        transition: none;
    }
}

/* Strictly instant (0ms) empty-state swap — neutralizes cs-listbox-empty-in */
.cs-command-palette-empty {
    animation: none;
}
```

- **No Highlight Lag or Press Bounce:** Holding `ArrowDown` steps `[data-highlighted]` across items at `60–120Hz` with zero trailing background fade (`transition: none`) and zero compositor layer per item (`will-change: auto`), while `:active` applies `--cs-command-palette-item-bg-active` (`--cs-color-base-soft-hover`, or `--cs-color-negative-soft-hover` on `[data-negative]`) instantaneously with `scale: 1`.
- **No Height, Reflow, or Page-Slide Animations:** `.cs-command-palette-body`, `.cs-command-palette-list`, `.cs-command-palette-group`, `.cs-command-palette-page`, `.cs-command-palette-widget`, and `.cs-command-palette-preview` never animate `height`, `max-height`, `opacity`, or `translate`. Filtering items, auto-collapsing empty groups/separators, showing `CommandPaletteEmpty`, and drilling into `pushPage()` / `popPage()` all snap in a single synchronous paint (`0ms`).
- **Crisp Bar Controls (`CommandPaletteClear` & `CommandPaletteScope`):** Appear/disappear synchronously (`data-visible="false"` -> `display: none`) without width/margin collapse animations so typing the first character or popping a scope never triggers horizontal text reflow in `CommandPaletteBar`; hover and `:active` states provide immediate surface brightening (`--cs-color-base-soft` -> `--cs-color-base-soft-hover`).

### 3. Quiet Keyboard-Nav Scrollbar

When users step rapidly through long result lists with `ArrowDown` / `ArrowUp`, `scrollIntoView({ block: "nearest" })` triggers `ScrollArea`'s `[data-scrolling]` attribute, causing `.cs-scroll-area-track` to glide in and out along the right edge on every scroll jump. During keyboard navigation the active highlight bar already tracks vertical progress—a flashing scrollbar adds peripheral flicker without offering a drag target.

Suppress `.cs-scroll-area-track` reveal while `.cs-command-palette[data-nav="keyboard"]` is active unless the user explicitly hovers or drags the scroll area (or opted into `scrollbar="always"`):

```css
/* Quiet keyboard-nav scrollbar: suppress [data-scrolling] track reveal during keyboard traversal */
.cs-command-palette[data-nav="keyboard"]
    .cs-scroll-area:not([data-scrollbar="always"]):not(:hover, [data-dragging])
    > .cs-scroll-area-track {
    opacity: 0;
    translate: var(--cs-scroll-area-track-hide-translate);
    pointer-events: none;
}
```

### 4. Destructive & Disabled Item Semantics
- **Destructive (`data-negative`):** Calm monochrome at rest (`--cs-command-palette-item-fg: var(--cs-color-text-strong)`, icon `--cs-color-text-weak`) so destructive commands never shout in an idle list. On `[data-highlighted]` or pointer `:hover` (when `:not([data-nav="keyboard"])`), row fill switches instantaneously to `--cs-command-palette-item-negative-bg-highlighted` (`var(--cs-color-negative-soft)`), text and icon switch to `--cs-command-palette-item-negative-fg` (`var(--cs-color-negative-soft-fg)`), and shortcut text tints to `color-mix(in oklab, var(--cs-color-negative-soft-fg) 75%, transparent)` (`--cs-color-negative-soft-hover` on `:active`).
- **Disabled (`data-disabled`):** Uses dedicated colorless `--cs-color-disabled-fg` (`--cs-disabled-opacity: 1`) across label, description, icon, and shortcut with `background-color: transparent`, skipped during keyboard highlight traversal.
