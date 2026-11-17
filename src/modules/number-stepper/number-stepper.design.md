# NumberStepper — Visual & Motion Design Specification

## 1. Design Intent & Role

`NumberStepper` is a compact numeric adjustment primitive for toolbars, inspectors, and forms. It supports three structural compositions across two orientations (`horizontal`, `vertical`) and two surface variants (`soft`, `elevated`):

1. **Value Stepper (Read-only / Resettable):** `[-]` `|` `100%` `|` `[+]` — calm pill track with hairline separators; clicking the center value optionally resets to a default.
2. **Editable Input Stepper:** `[-]` `[ 100 % ]` `[+]` — pill shell housing a contrasting inner input capsule (`data-has-input`).
3. **Icon-Only Pair:** `[-]` `|` `[+]` — compact dual-trigger bar (horizontal or vertical) for zoom, pagination, or step-only controls.

All proportions, radii, and tokens calibrate 1:1 with `Button`, `TextInput`, and `SegmentedControl` so `NumberStepper` aligns cleanly on shared toolbar baselines.

---

## 2. Surface Variants (`soft` & `elevated`)

`NumberStepper` is **borderless by default**, separating foreground from background through surface contrast and elevation shadows.

### 2.1 Shell Surfaces

| State | `variant="soft"` | `variant="elevated"` |
| :--- | :--- | :--- |
| **Rest** | `bg`: `--cs-color-base-soft`<br>`shadow`: `none` | `bg`: `--cs-color-elevated`<br>`shadow`: `--cs-shadow-elevated` |
| **Disabled** (`data-disabled`) | `bg`: `--cs-color-disabled-bg`<br>`shadow`: `none` | `bg`: `--cs-color-disabled-bg-elevated`<br>`shadow`: `0 0 0 1px var(--cs-color-disabled-border)` |

- **Outer Corner Shape:** `border-radius: calc(var(--cs-number-stepper-height) / 2)` (horizontal) or `calc(var(--cs-number-stepper-width) / 2)` (vertical), paired with `corner-shape: var(--cs-squircle-soft)`. Computing radius from the resolved dimension instead of `--cs-radius-full` (`9999px`) prevents CSS corner-overlap reduction from distorting adjacent inner capsules.

### 2.2 Inner Input Well (`data-has-input`)

In editable mode, the center input well uses **inverted figure-ground contrast** against the outer shell so it reads as an interactive text field rather than a flat label:

| State | `variant="soft"` (Elevated Inner Well) | `variant="elevated"` (Recessed Inner Well) |
| :--- | :--- | :--- |
| **Rest** | `bg`: `light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 14%, transparent))`<br>`shadow`: `light-dark(var(--cs-shadow-xs), none)` | `bg`: `--cs-color-base-soft`<br>`shadow`: `none` |
| **Hover** (not `:focus-within`) | `bg`: `light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 18%, transparent))`<br>`shadow`: `light-dark(var(--cs-shadow-sm), none)` | `bg`: `--cs-color-base-soft-hover`<br>`shadow`: `none` |
| **Focus-Within** | `::after` ring: `inset 0 0 0 2px var(--cs-color-accent-solid)` | `::after` ring: `inset 0 0 0 2px var(--cs-color-accent-solid)` |
| **Invalid** (`data-invalid`) | `::after` ring: `inset 0 0 0 2px var(--cs-color-negative-solid)`<br>`caret-color`: `--cs-color-negative-solid` | `::after` ring: `inset 0 0 0 2px var(--cs-color-negative-solid)`<br>`caret-color`: `--cs-color-negative-solid` |
| **Disabled** (`data-disabled`) | `bg`: `--cs-color-disabled-bg-elevated`<br>`shadow`: `none`<br>`fg`: `--cs-color-disabled-fg` | `bg`: `--cs-color-disabled-bg`<br>`shadow`: `none`<br>`fg`: `--cs-color-disabled-fg` |

### 2.3 Focus Ring Architecture

- **Buttons (`-`, `+`, and read-only value button):** Rely on global `:focus-visible` (`outline: 2px solid var(--cs-color-accent-solid); outline-offset: 2px;`). Set `z-index: 2` on `:focus-visible` so the outline renders cleanly above adjacent segments and hairline separators.
- **Inner Input Well:** Suppress native `outline: none` on `.cs-number-stepper-field` and render the focus ring on `.cs-number-stepper-input-shell::after` via `box-shadow` (matching `TextInput`), transitioned over `var(--cs-dur-120) var(--cs-ease-quart-out)`. This prevents `box-shadow` elevation from colliding with the focus ring.

---

## 3. 5-Step Size Scale (`xs`, `sm`, `md`, `lg`, `xl`)

Heights match `Button`, `TextInput`, and `SegmentedControl` 1:1 (`28px`–`44px`).

### 3.1 Horizontal Orientation (`data-orientation="horizontal"`)

| Size | Height | Font Size | Icon Size | Shell Pad (`--cs-number-stepper-pad`) | Inner Well Height (`h - pad * 2`) | Value Min-Width | Outer Radius |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` | `28px` | `--cs-text-xs` (`12px`) | `14px` | `3px` | `22px` | `42px` | `14px` |
| `sm` | `32px` | `--cs-text-xs` (`12px`) | `14px` | `3px` | `26px` | `46px` | `16px` |
| `md` | `36px` | `--cs-text-sm` (`14px`) | `16px` | `3px` | `30px` | `52px` | `18px` |
| `lg` | `40px` | `--cs-text-sm` (`14px`) | `16px` | `4px` | `32px` | `58px` | `20px` |
| `xl` | `44px` | `--cs-text-base` (`16px`) | `18px` | `4px` | `36px` | `64px` | `22px` |

- **Icon Stroke Weight:** `2.35` (calibrated to `font-weight: 600` numeric labels).
- **Button Proportions:**
  - *Without Input:* `aspect-ratio: 1; height: 100%` (`28×28` to `44×44`).
  - *With Input:* Concentric end-cap buttons sized `width: calc(var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2); height: calc(var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2)` (`22×22` to `36×36`), inset by `--cs-number-stepper-pad` from the shell edges.
  - *Hit Area:* Compact step buttons in `xs`–`lg` (and input-mode `xl`) have a visual surface below `1936px²` (`44×44`). Include `<HitArea />` inside `.cs-number-stepper-btn` where layout spacing permits, without expanding the visible hover pill.

### 3.2 Vertical Orientation (`data-orientation="vertical"`)

Vertical orientation is designed for **icon-only pairs** and **read-only value steppers** (compact floating toolbars/canvas zoom controls). Editable `<input>` wells are discouraged in vertical orientation because narrow `28px`–`44px` widths clip multi-digit typing.

| Size | Width | Total Height (Icon-Only Pair) | Icon Size | Outer Radius |
| :--- | :--- | :--- | :--- | :--- |
| `xs` | `28px` | `56px` | `14px` | `14px` |
| `sm` | `32px` | `64px` | `14px` | `16px` |
| `md` | `36px` | `72px` | `16px` | `18px` |
| `lg` | `40px` | `80px` | `16px` | `20px` |
| `xl` | `44px` | `88px` | `18px` | `22px` |

- **Button Proportions:** `width: 100%; aspect-ratio: 1` stacked in `flex-direction: column`. Increment (`+` / `ZoomIn` / `ChevronUp`) sits on top; decrement (`-` / `ZoomOut` / `ChevronDown`) sits on bottom.

---

## 4. Middle Element Craft

### 4.1 With Input (`data-has-input`)

- **Concentric Nesting:** The inner input capsule has `height: calc(var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2)` and `border-radius: calc((var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2) / 2)` with `corner-shape: var(--cs-squircle-soft)`, sharing the exact curvature center as the outer shell.
- **Padding & Alignment:** `padding-inline: 8px` (`xs`/`sm`) to `10px` (`md`–`xl`), `gap: 2px` between `<input>` and optional unit suffix.
- **Typography & Stability:**
  - `font-weight: 600`, `font-variant-numeric: tabular-nums`, `line-height: 1`.
  - When a unit suffix (e.g. `%`, `px`) is present, right-align the `<input>` text (`text-align: right`) so the digits hug the unit cleanly; when unitless, center-align (`text-align: center`).
  - Unit suffix uses `color: var(--cs-color-text-weak)`, `font-weight: 500`, `pointer-events: none`, `user-select: none`.
- **Cursor:** `cursor: text` on `.cs-number-stepper-input-shell`, `cursor: default` on step buttons.

### 4.2 Without Input (Value Button & Icon-Only)

- **Hairline Separators (`.cs-number-stepper-sep`):**
  - Zero-width flex item (`width: 0` horizontal, `height: 0` vertical) with a `::before` pseudo-element so separators consume zero layout space.
  - Dimensions: `1px` thick, `inset-block: 24%` (horizontal) or `inset-inline: 24%` (vertical), `background-color: color-mix(in oklch, var(--cs-color-text-main) 16%, transparent)`.
  - **Adjacent Interaction Fade:** Whenever a button or value slot adjacent to a separator is `:hover`, `:active`, or `:focus-visible`, transition the touching separator to `opacity: 0` (`var(--cs-dur-effect) var(--cs-ease-effect)`). This prevents a harsh vertical line from cutting along the edge of a highlighted segment.
- **Value Slot (`.cs-number-stepper-value`):**
  - `min-width: var(--cs-number-stepper-value-min-width)` (`42px`–`64px`), `padding-inline: 8px`, `font-variant-numeric: tabular-nums`, `font-weight: 600`, `color: var(--cs-color-text-strong)`.
  - Prevents horizontal jitter when stepping across digit counts (e.g. `99%` -> `100%`).

---

## 5. Hover, Active & Motion Choreography

### 5.1 With Input: Button Hover & Active

- **Decision:** Use **icon color brightening + a concentric circular/squircle hover tint** (`--cs-number-stepper-btn-bg-hover`), rather than a full end-cap fill or a color-only shift.
- **Optical Reasoning:** Because the center input well is already an inset pill (`3px`–`4px` from the shell edge), filling the entire outer end-cap creates an awkward half-moon shape that collides visually with the rounded input capsule. Conversely, a color-only icon shift feels too faint on `soft` shells. A concentric circular/squircle button (`width = height = inner well height`) centered in the end-cap echoes the input well's geometry and provides clear target feedback without visual seams.
- **Tokens:**
  - Rest: `color: var(--cs-color-text-main)`, `bg: transparent`.
  - Hover (`@media (hover: hover)`): `color: var(--cs-color-text-strong)`, `bg: var(--cs-color-base-soft-hover)` (`soft` shell) or `var(--cs-color-base-soft)` (`elevated` shell).

### 5.2 Without Input: Full-Segment Fill vs. Inner Icon Highlight

- **Decision:** Use **full-segment surface fill** flush to the outer pill and separator line, paired with **hairline separator fade-out**.
- **Optical Reasoning:** Without an inner input capsule, the outer pill *is* the primary control surface. An inset circular hover inside a flat segmented track leaves an unhighlighted outer gutter, makes the hairline separator appear disconnected, and visually shrinks the hit target. Full-segment fill—with `border-radius` matching the outer cap on `:first-child` / `:last-child` and `0` on the inner edge—makes the pill behave as a cohesive unified bar.
- **Tokens:**
  - `soft` shell hover: `bg: var(--cs-color-base-soft-hover)`, `color: var(--cs-color-text-strong)`.
  - `elevated` shell hover: `bg: light-dark(color-mix(in oklch, var(--cs-color-base-900) 4%, transparent), var(--cs-color-base-soft))`, `color: var(--cs-color-text-strong)`. (In light mode, `elevated` surfaces must not darken heavily; a 4% neutral tint keeps the white surface crisp while confirming the active segment.)

### 5.3 Press & Spring Micro-Interaction

Stepper buttons are high-frequency repeat targets (users often click `+` 4–6 times rapidly). Heavy `600ms` bounce on the button icon feels rubbery during rapid clicks, whereas the center reset value is an infrequent action that benefits from playful squash.

- **Step Button Icon (`.cs-number-stepper-icon`):**
  - **Press (`:active`):** `scale: 0.88` over `var(--cs-dur-press)` (`140ms`) `var(--cs-ease-press)`.
  - **Release:** Return to `scale: 1` over `var(--cs-dur-200)` `var(--cs-spring-snappy)` (crisp `~4%` overshoot that settles cleanly between rapid clicks).
- **Center Value Text (resettable `.cs-number-stepper-value`):**
  - **Press (`:active`):** `scale: 0.93` over `var(--cs-dur-press)` (`140ms`) `var(--cs-ease-press)`.
  - **Release:** Return to `scale: 1` over `var(--cs-dur-squash)` (`600ms`) `var(--cs-ease-squash)` (`--cs-spring-squash`).
- **Color & Surface Transitions:** `var(--cs-dur-effect)` (`160ms`) `var(--cs-ease-effect)`.
- **Reduced Motion:** Handled globally by `motion.css` (`prefers-reduced-motion: reduce`); never duplicate media-query overrides inside the module.

---

## 6. Disabled & Boundary States

### 6.1 Whole-Stepper Disabled (`data-disabled`)

- Set `--cs-disabled-opacity: 1` to opt out of the global `0.5` opacity fallback.
- Apply colorless semantic tokens (`--cs-color-disabled-bg` / `--cs-color-disabled-bg-elevated` and `--cs-color-disabled-fg`) across the shell, buttons, and inner input well.
- `pointer-events: none` is enforced globally by `disabled.css`.

### 6.2 Individual Boundary-Disabled (`min` or `max` Reached)

When `value <= min` or `value >= max`, only the corresponding step `<button>` receives the native `disabled` attribute:

- **Opt out of global opacity fade:** `.cs-number-stepper-btn:disabled { --cs-disabled-opacity: 1; }`.
- **Foreground:** `color: var(--cs-color-disabled-fg)` (`--cs-color-text-weaker`).
- **Background & Motion:** Keep `background-color: transparent`, suppress hover background and `:active` icon scaling.
- **Shell & Sibling Preservation:** The outer shell, hairline separator, center value/input, and opposite enabled button remain at full crispness and contrast—avoiding the muddy appearance of a half-faded pill.

---

## 7. CSS Architecture & Token Contract

All component styles live in plain CSS under `@layer components.primitive`.

### 7.1 Class Structure

- `.cs-number-stepper` — Root shell (`data-variant="soft" | "elevated"`, `data-size="xs" | "sm" | "md" | "lg" | "xl"`, `data-orientation="horizontal" | "vertical"`, `data-has-input`, `data-invalid`, `data-disabled`)
- `.cs-number-stepper-btn` — Decrement / increment `<button>` (`data-direction="decrement" | "increment"`)
- `.cs-number-stepper-icon` — Icon inside `.cs-number-stepper-btn`
- `.cs-number-stepper-sep` — Hairline separator (`aria-hidden="true"`)
- `.cs-number-stepper-value` — Read-only or resettable value `<button>` / `<span>`
- `.cs-number-stepper-input-shell` — Inner `<label>` capsule for editable mode
- `.cs-number-stepper-field` — Native `<input>` inside `.cs-number-stepper-input-shell`
- `.cs-number-stepper-unit` — Optional trailing unit `<span>`

### 7.2 Module Custom Properties (`--cs-number-stepper-*`)

```css
--cs-number-stepper-height
--cs-number-stepper-width
--cs-number-stepper-pad
--cs-number-stepper-radius
--cs-number-stepper-font-size
--cs-number-stepper-icon-size
--cs-number-stepper-value-min-width

--cs-number-stepper-bg
--cs-number-stepper-shadow
--cs-number-stepper-fg
--cs-number-stepper-fg-strong
--cs-number-stepper-fg-disabled
--cs-number-stepper-btn-bg-hover
--cs-number-stepper-sep-color

--cs-number-stepper-well-bg
--cs-number-stepper-well-bg-hover
--cs-number-stepper-well-shadow
--cs-number-stepper-well-ring
```
