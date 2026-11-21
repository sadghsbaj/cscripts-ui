# Splitter (`splitter`) Design Spec (`src/modules/splitter/`)

## 1. Visual Direction & Tactile Philosophy

`Splitter` is a compound layout primitive (`Splitter`, `SplitterPane`, `SplitterHandle`) in `@layer components.composite`. Its visual language is built around one core principle: **panes own the visual stage; dividers stay silent at rest and reveal tactile precision only on deliberate intent.**

Multi-pane applications—especially an AI chatboard with a collapsible sidebar, primary workspace, and right inspector—quickly feel cluttered ("noisy") when every split boundary draws a permanent heavy track, drop shadow, or bright accent pill. `Splitter` avoids wireframe chrome by pairing quiet monochrome resting boundaries with hover-intent gating, generous invisible pointer targets, and zero-lag direct manipulation.

### Core Design Principles

1. **Silent Boundaries at Rest (Zero Visual Noise):**
   - `Splitter` itself renders a transparent flex container (`background: transparent`) with zero outer borders or shadows.
   - `subtle` and `transparent` handles hide their center grip pill completely at rest (`opacity: 0`). Only `elevated` shows a quiet, low-contrast monochrome pill at rest for high-discoverability studio/dashboard layouts.
2. **Progressive Color Revelation (Monotone → Accent):**
   - **Rest:** Strictly monochrome (`--cs-color-base-soft` or `transparent`). Never blue at rest.
   - **Hover (`:hover`):** Strictly **monotone** contrast shift on the boundary + crisp neutral grip pill emerging after an **`80ms` hover-intent delay** (`--cs-dur-80`). Sweeping the cursor across panes never flashes blue lines.
   - **Active Drag (`[data-dragging]`) & Keyboard Focus (`:focus-visible`):** Transitions immediately (`0ms` delay) to `--cs-color-accent-solid` on the grip pill and an accent-tinted boundary line, confirming active lock-in.
3. **Effortless Grab Without Visual Bulk:**
   - Visual thickness stays razor-thin (`1px`–`2px` for `subtle`, `4px`–`8px` for `elevated`/`transparent`), while an invisible `::before` hit zone spans `12px`–`16px` centered on the separator (`touch-action: none`).
4. **1:1 Direct Manipulation + Damped Programmatic Motion:**
   - Active pointer dragging disables pane layout transitions (`transition: none`) for 60/120fps 1:1 tracking.
   - Programmatic collapse/expand and double-click reset animate smoothly with `--cs-ease-quart-out` (zero overshoot, preventing sibling text/scrollbar bounce).

---

## 2. Noisy vs. Clean: Resting & Reveal Strategy

| Variant | At Rest | On `:hover` *(after `80ms` intent delay)* | On `[data-dragging]` / `:focus-visible` *(instant `0ms`)* |
| :--- | :--- | :--- | :--- |
| **`subtle`** *(default app shell)* | `1px` (`sm`/`md`) or `2px` (`lg`) neutral hairline (`--cs-color-base-soft`). **Pill hidden** (`opacity: 0`). | Hairline deepens to `--cs-color-base-soft-hover`; monochrome pill (`--cs-color-text-weak`) fades & scales in cleanly. | Pill snaps to `--cs-color-accent-solid` (`--cs-shadow-solid`); hairline shifts to `--cs-color-accent-soft-fg` (or `2px` visual indicator via box-shadow/scale). |
| **`transparent`** *(island / card gaps)* | **Invisible** (`0px`–`8px` gap, `background: transparent`). **Pill hidden** (`opacity: 0`). | Gap stays transparent (no full-height line); monochrome pill (`--cs-color-text-weak`) emerges cleanly in the center of the gap. | Pill snaps to `--cs-color-accent-solid` (`--cs-shadow-solid`); subtle `1px` center guide (`--cs-color-accent-soft`) may appear only during active drag to aid alignment. |
| **`elevated`** *(explicit studio handle)* | `4px`–`8px` subtle recessed/neutral gutter (`--cs-color-base-soft`) with a **quiet monochrome resting pill** (`--cs-color-text-weaker`). | Gutter shifts to `--cs-color-base-soft-hover`; pill brightens to `--cs-color-text-main` and scales subtly (`1.04`). | Gutter tints to `--cs-color-accent-soft`; pill snaps to `--cs-color-accent-solid` (`--cs-shadow-solid`). |

### Why No Permanent Pill on `subtle` and `transparent`?

- In a 3-pane AI chatboard (left sidebar + center chat + right inspector, plus a nested vertical split inside the inspector), permanent pills create 3–4 floating dashes competing with message bubbles, scrollbars, and action buttons.
- The `1px` hairline (`subtle`) or natural island gap (`transparent`) already communicates the spatial boundary. The cursor switching immediately to `col-resize` / `row-resize` on entry—followed `80ms` later by the monochrome pill—gives unmistakable affordance without resting clutter.

---

## 3. Color Semantics: Monotone vs. Accent

### Recommendation: Monotone Hover + Accent on Drag & Focus-Visible

1. **Why NOT Accent (`--cs-color-accent-solid`) on Rest or Immediate Hover:**
   - `cscripts-ui` reserves `--cs-color-accent-solid` for primary emphasis and active selection (`design-and-tokens.md`). Painting a `100vh` vertical blue line every time the user's mouse passes from the sidebar to the chat input creates visual strobing.
   - Even with a `1px` line, full-height bright blue lines feel overly technical/CAD-like in a calm conversational UI.
2. **Why `80ms` Hover-Intent Delay (`--cs-dur-80`) on Visuals (Instant Cursor):**
   - A cursor sweeping across a `14px` hit zone at normal desktop speed (`~600–1200 px/s`) crosses it in `12ms–23ms`.
   - Keeping the native OS cursor (`col-resize` / `row-resize`) **instant (`0ms`)** while gating the pill/line visual transition behind `transition-delay: var(--cs-splitter-hover-delay)` (`80ms`) ensures:
     - **Fast pass-throughs (`< 80ms`):** Zero visual flicker on the boundary.
     - **Deliberate pause (`>= 80ms`):** The monochrome pill materializes crisply before the user even finishes clicking.
     - **Mouse leave:** `transition-delay: 0ms` on the base state so the pill recedes immediately without lingering.
3. **When Accent Appears (`[data-dragging]` & `:focus-visible`):**
   - The instant `pointerdown` initiates a drag (`[data-dragging]`) or keyboard `Tab` lands on the separator (`:focus-visible`), `transition-delay` drops to `0ms` and the pill lights up with `--cs-color-accent-solid` + `--cs-shadow-solid`.
   - **Why `[data-dragging]` keeps the full-span line restrained:** Rather than flooding a `100vh` `6px` gutter with solid blue, `[data-dragging]` uses `--cs-color-accent-solid` on the compact grip pill and a refined `--cs-color-accent-soft` / `color-mix` accent line along the track—high-contrast enough to track alignment, calm enough to keep focus on the resizing content.

---

## 4. Thickness, Hit Area & T-Shirt `size` Scale (`sm`, `md`, `lg`)

### Visual Thickness vs. Hit-Zone Matrix

`SplitterHandle` separates **layout thickness** (`--cs-splitter-handle-size`) from **pointer hit area** (`--cs-splitter-handle-hit-size`) and **grip pill geometry** (`--cs-splitter-pill-length` × `--cs-splitter-pill-thickness`):

| `size` | `subtle` Track | `elevated` Track | `transparent` Gap | Hit Zone (`::before`) | Pill (`length × thickness`) | Best Fit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`sm`** | `1px` | `4px` | `4px` *(overrideable to `0px`)* | `12px` (`±5.5px` around `1px`) | `20px × 3px` | Nested sub-panes, compact inspector splits, dense toolbars |
| **`md`** | `1px` | `6px` | `6px` | `14px` (`±6.5px` around `1px`) | `28px × 4px` | Default application shells (AI chatboard sidebar/inspector) |
| **`lg`** | `2px` | `8px` | `8px` | `16px` (`±7px` around `2px`) | `36px × 5px` | Touch-friendly layouts, high-contrast dashboards |

### Hit-Area Implementation (`::before`) & Optical Centering

- **Zero-DOM Hit Expansion:** `.cs-splitter-handle` uses `position: relative; flex: 0 0 var(--cs-splitter-handle-size); z-index: 2;` and centers a `::before` pseudo-element across the separator axis:
  - **Horizontal `Splitter` (vertical divider):** `inset-block: 0; inset-inline: calc((var(--cs-splitter-handle-hit-size) - 100%) / -2);`
  - **Vertical `Splitter` (horizontal divider):** `inset-inline: 0; inset-block: calc((var(--cs-splitter-handle-hit-size) - 100%) / -2);`
  - Includes `content: ""; position: absolute; touch-action: none;` so touch and pen drags never trigger page scroll.
- **Note on `design-and-tokens.md` Hit-Area Rule:** `design-and-tokens.md` prohibits pseudo-element hit areas on *void `<input>` controls* (checkboxes/radios) where `<label>` pairing owns the hit area. `SplitterHandle` is a structural `div[role="separator"]` with no `<label>`, making `::before` the canonical zero-DOM-bloat hit-zone pattern.
- **Pill Floating Over `1px` Hairlines:** Because a `3px`–`5px` pill is thicker than a `1px` `subtle` handle track, `.cs-splitter-handle-pill` is `position: absolute; top: 50%; left: 50%; translate: -50% -50%; pointer-events: none;` (with `border-radius: var(--cs-radius-full); corner-shape: var(--cs-squircle-soft);`). It floats cleanly centered over the `1px` line without ever widening layout geometry.

---

## 5. Variants & AI Chatboard Shell Mapping

### Concrete Token Mapping per Variant

| Token | `subtle` | `elevated` | `transparent` |
| :--- | :--- | :--- | :--- |
| `--cs-splitter-handle-bg` | `var(--cs-color-base-soft)` | `var(--cs-color-base-soft)` | `transparent` |
| `--cs-splitter-handle-bg-hover` | `var(--cs-color-base-soft-hover)` | `var(--cs-color-base-soft-hover)` | `transparent` |
| `--cs-splitter-handle-bg-active` | `var(--cs-color-accent-soft-fg)` | `var(--cs-color-accent-soft)` | `var(--cs-color-accent-soft)` |
| `--cs-splitter-pill-bg` | `transparent` *(hidden)* | `var(--cs-color-text-weaker)` | `transparent` *(hidden)* |
| `--cs-splitter-pill-bg-hover` | `var(--cs-color-text-weak)` | `var(--cs-color-text-main)` | `var(--cs-color-text-weak)` |
| `--cs-splitter-pill-bg-active` | `var(--cs-color-accent-solid)` | `var(--cs-color-accent-solid)` | `var(--cs-color-accent-solid)` |
| `--cs-splitter-pill-opacity-rest` | `0` | `1` | `0` |

### Disabled State (`[data-disabled]`)

- Per `design-and-tokens.md`, disabled handles use colorless `--cs-color-disabled-*` tokens rather than opacity dimming:
  - `cursor: default;`
  - `pointer-events: none;` (and `::before` `pointer-events: none;`)
  - On `elevated`, resting pill switches to `var(--cs-color-disabled-fg)`; on `subtle`, hairline switches to `var(--cs-color-disabled-border)`.

### AI Chatboard Shell Mapping

Consider a 3-pane AI chatboard: **Left Sidebar** (threads/history) | **Main Chat Workspace** | **Right Panel** (code/artifact inspector, optionally split vertically inside):

1. **Flush App-Shell Pattern (`variant="subtle"`, `size="md"`):**
   - Left sidebar uses `--cs-color-sunken` or `--cs-color-canvas`; Main workspace uses `--cs-color-elevated` (or `--cs-color-canvas`); Right panel uses `--cs-color-elevated`.
   - The `1px` `--cs-color-base-soft` hairline cleanly separates flush panes without wasting horizontal space.
   - A nested vertical split inside the right panel steps down to `variant="subtle"` + `size="sm"` (`1px` line, `20px × 3px` pill).
2. **Floating-Islands Pattern (`variant="transparent"`, `size="md"` or `"lg"`):**
   - Root container sits on `--cs-color-canvas`; each `SplitterPane` wraps an `elevated` island card (`--cs-color-elevated`, `--cs-shadow-elevated`, `--cs-radius-xl`, `corner-shape: var(--cs-squircle)`).
   - `transparent` provides a `6px` (`md`) or `8px` (`lg`) clean canvas gap with zero lines or pills at rest. Hovering in the gap reveals the subtle pill; dragging reveals `--cs-color-accent-solid` on the pill without ever drawing harsh borders around rounded cards.

---

## 6. Motion & Drag Feel

### Choreography Table

| Interaction | Target | Duration | Easing | Delay | Properties & Feel |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hover Enter** | `.cs-splitter-handle` & `.cs-splitter-handle-pill` | `var(--cs-dur-effect-fast)` (`100ms`) | `var(--cs-ease-effect)` (`--cs-ease-quad-out`) | `var(--cs-dur-80)` (`80ms`) | Pill scales `0.75 → 1` & fades `opacity: 0 → 1` in monotone; track deepens to `--cs-splitter-handle-bg-hover`. Prevents cursor-sweep flicker. |
| **Hover Leave** | `.cs-splitter-handle` & `.cs-splitter-handle-pill` | `var(--cs-dur-effect-fast)` (`100ms`) | `var(--cs-ease-effect)` | `0ms` | Immediate, clean recession back to silent resting state. |
| **Pointer Down / Drag Lock** | `.cs-splitter-handle-pill` | `var(--cs-dur-40)` (`40ms`) | `var(--cs-ease-effect)` | `0ms` | Instant `0ms` delay lock-in: pill switches to `--cs-color-accent-solid`, `--cs-shadow-solid`, and `scale: 1.08` (slight tactile swell). |
| **Active Pointer Drag** | `.cs-splitter-pane` (`[data-dragging]`) | `0ms` (`transition: none`) | — | `0ms` | Zero-lag 1:1 `flex-basis` tracking at 60/120fps. Never interpolate pane sizes during pointer move. |
| **Collapse / Expand / Double-Click Reset** | `.cs-splitter-pane` (`animate={true}`) | `var(--cs-dur-200)` (`200ms`) | `var(--cs-ease-quart-out)` | `0ms` | Smooth, strictly monotonic `flex-basis` glide. |

### Why `--cs-ease-quart-out` (Zero Overshoot) for Pane Transitions

- Just like `Collapsible`'s `0fr ↔ 1fr` track, pane `flex-basis` is a **layout-flow dimension bounded by `0px` and sibling `min` extents**.
- Using `--cs-spring-snappy` (`~4%` overshoot) or `--cs-spring-squash` (`~28%` overshoot) on `flex-basis` bounces adjacent panes, reflows wrapped chat messages, and jitters scrollbars at the end of a collapse or reset.
- `--cs-ease-quart-out` (`cubic-bezier(0.25, 1, 0.5, 1)`) delivers immediate visual velocity in the first `50ms` and settles with zero bounce.

### Cursor, Selection & Reduced Motion

- **Global Drag Lock:** While `data-splitter-dragging="horizontal" | "vertical"` is set on `<html>`, `html[data-splitter-dragging="horizontal"] * { cursor: col-resize !important; user-select: none !important; }` (and `row-resize` for `"vertical"`) prevents cursor flicker when the pointer sweeps fast over links, text inputs, or scrollbars.
- **Reduced Motion:** No module-level `@media (prefers-reduced-motion: reduce)` rules. Global `src/css/foundation/motion.css` neutralizes all CSS transition durations to `0.01ms !important` automatically.

---

## 7. 2D Nested Splitters (Intersections & Hierarchy)

When a `SplitterPane` contains a nested perpendicular `<Splitter>` (e.g., a vertical top/bottom split inside the right inspector of a horizontal 3-pane shell):

1. **Single-Owner Boundary Rule (No Double Borders):**
   - `SplitterPane` renders **zero borders** (`border: 0; background: transparent;`). Only `SplitterHandle` draws dividers.
   - At a T-junction where an inner horizontal divider meets an outer vertical divider, the inner `1px` line terminates cleanly against the outer `1px` line—never `1px + 1px = 2px` doubled edges.
2. **Natural Pill Clearance at T-Junctions:**
   - Because `.cs-splitter-handle-pill` is strictly centered (`50%`) along each handle's span, two perpendicular handles meeting at a corner/T-junction never have colliding pills.
3. **Hit-Zone (`::before`) Priority:**
   - All resting handles share `z-index: 2`.
   - On `:hover`, `:focus-visible`, or `[data-dragging]`, `.cs-splitter-handle` elevates to `z-index: 3`, ensuring the actively targeted handle's `12px–16px` `::before` hit zone wins cleanly near T-junctions without fighting perpendicular neighbors.
4. **Visual Weight Hierarchy:**
   - Nested splitters should step down in visual weight when possible: e.g., outer shell `size="md"` (`transparent` or `subtle`) → nested split `size="sm"` (`subtle`).
5. **Clipping Safety:**
   - `.cs-splitter-pane` uses `min-width: 0; min-height: 0; overflow: hidden;` so long code blocks or `ScrollArea` children never break layout.
   - Inside a nested `<Splitter>`, handles sit *between* inner panes, so their perpendicular `::before` hit zones extend into the inner panes' interiors (never clipped at the outer pane boundary).

---

## 8. Blueprint Alignment & Recommended Adjustments

Comparing this design spec against `src/modules/splitter/splitter.blueprint.md`:

1. **Token Split for Monotone Hover vs. Accent Active (Recommended):**
   - The blueprint currently defines `--cs-splitter-pill-bg` and `--cs-splitter-pill-bg-active` (used for `:hover`, `:focus-visible`, and `[data-dragging]`).
   - **Adjustment:** Add `--cs-splitter-pill-bg-hover` (defaulting to monotone `var(--cs-color-text-weak)` on `subtle`/`transparent` and `var(--cs-color-text-main)` on `elevated`) and reserve `--cs-splitter-pill-bg-active` (`var(--cs-color-accent-solid)`) for `[data-dragging]` and `:focus-visible`. This keeps hover calm and non-noisy while still letting consumers override `--cs-splitter-pill-bg-hover` if they ever want accent-on-hover.
2. **Hover-Intent Delay Token (Recommended):**
   - Add `--cs-splitter-hover-delay: var(--cs-dur-80)` (`80ms`) to the `--cs-splitter-*` token table so cursor sweeps across panes never flash hover states.
3. **Token Naming Alignment with `color-semantics.css`:**
   - Ensure `splitter.css` uses `--cs-color-base-soft` / `--cs-color-base-soft-hover` and `--cs-color-disabled-border` / `--cs-color-disabled-fg` (there is no `--cs-color-border-*` token in `src/css/foundation/color-semantics.css`).
4. **`:focus-visible` on `1px` Handles:**
   - Global `src/css/foundation/focus.css` applies `outline: 2px solid var(--cs-color-accent-solid); outline-offset: 2px;`. On `.cs-splitter-handle:focus-visible`, keep `z-index: 3` and activate the `--cs-color-accent-solid` pill so keyboard focus is unmistakably clear at the center of the divider as well as along the track.
