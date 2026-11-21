# Collapsible Design Spec (`src/modules/collapsible/`)

## 1. Role & Visual Direction

`Collapsible` is a **headless structural motion primitive**. It renders no surface chrome (`background`, `border`, `box-shadow`, or `padding`) of its own—it exists purely to animate layout expansion and collapse along a single axis (`vertical` or `horizontal`) while keeping child surfaces calm, crisp, and flicker-free.

It serves three primary roles across `cscripts-ui`:
1. **Standalone disclosure:** Settings panels, expandable details, and inline progressive-disclosure regions.
2. **Partial-preview container (`collapsedSize` + `fadeMask`):** Code blocks, changelogs, and long-form snippets that rest at a capped preview height with a smooth edge fade and expand cleanly on demand.
3. **Motion base for composite modules:** Underlying expand/collapse engine for future `Accordion` and `Tree` modules.

---

## 2. Motion Presets & Choreography (`data-motion`)

`Collapsible` exposes four motion presets via `data-motion` (`"slide"` default):

| Preset | Track (`0fr ↔ 1fr`) | Inner Content (`.cs-collapsible-inner`) | Best For |
| :--- | :--- | :--- | :--- |
| **`slide`** *(default)* | Smooth `0fr ↔ 1fr` | Static (`opacity: 1`, no `translate`/`scale`) | Trees, dense accordions, code-block previews |
| **`swell`** | Smooth `0fr ↔ 1fr` | `opacity: 0 ↔ 1`, subtle axis `translate` (`-6px ↔ 0`), `scale: 0.985 ↔ 1` | Standalone disclosures, settings cards, rich panels |
| **`fade`** | Smooth `0fr ↔ 1fr` | `opacity: 0 ↔ 1` only (zero `translate`/`scale`) | Editorial disclosures, minimal-shift layouts |
| **`none`** | Instant (`0s`) | Instant (`0s`, `transition: none`) | Instant state swaps, high-frequency updates |

### Asymmetric Enter vs. Exit Cadence

Following `src/css/foundation/motion.css`, **opening is slightly more deliberate than closing**:

- **Enter (Open):** `--cs-collapsible-dur-enter: var(--cs-dur-240)` (`240ms`) with `--cs-collapsible-ease-enter: var(--cs-ease-quart-out)`. Gives the eye time to track newly revealed layout without feeling sluggish.
- **Exit (Close):** `--cs-collapsible-dur-exit: var(--cs-dur-160)` (`160ms`, matching `--cs-dur-effect`) with `--cs-collapsible-ease-exit: var(--cs-ease-exit)` (`--cs-ease-quad-in`). Snappy, decisive dismissal that gets out of the user's way.
- **Inner Content Opacity (`swell` / `fade`):**
  - Enter: `--cs-collapsible-fade-dur-enter: var(--cs-dur-effect)` (`160ms`) `--cs-ease-effect` (`--cs-ease-quad-out`) — content reaches full legibility *before* the track finishes settling.
  - Exit: `--cs-collapsible-fade-dur-exit: var(--cs-dur-effect-fast)` (`100ms`) `--cs-ease-exit` (`--cs-ease-quad-in`) — content fades out cleanly *before* the track clips to `0fr`.

### Why Overshoot & Spring Curves Must NOT Be Used on `0fr ↔ 1fr` Tracks

1. **Hard `0fr` floor:** Negative overshoot (e.g., `cubic-bezier` back-in curves) clamps at `0px`, creating a dead stall instead of anticipation.
2. **Layout-flow bounce:** Positive overshoot above `1fr` (such as `--cs-spring-snappy` at `1.041` or `--cs-spring-squash` at `1.282`) stretches the grid track past its natural content size (`1.04fr`), exposing empty whitespace inside the container and bouncing every sibling element below it in the document flow.
3. **Safe layering:** The outer grid track MUST use a strictly monotonic curve (`--cs-ease-quart-out` on open, `--cs-ease-exit` on close). In `swell`, inner-content `translate` and `scale` may optionally use `--cs-ease-quart-out` (or `--cs-spring-snappy` for subtle micro-settle) because `.cs-collapsible-inner` is clipped inside the track and does not perturb sibling layout.

---

## 3. CSS Architecture & Token Contract

All styles live in `@layer components.primitive` using plain CSS and `--cs-collapsible-*` custom properties.

### DOM & Attribute Anatomy

```text
.cs-collapsible (div, data-open?, data-axis="vertical"|"horizontal", data-motion="slide"|"swell"|"fade"|"none", data-state="opening"|"open"|"closing"|"closed", data-instant?, data-fade-mask?)
└── .cs-collapsible-inner (div)
    └── {children}
```

- **`data-open`**: Boolean presence attribute (`""` when open, omitted when closed) — drives CSS open/closed target states.
- **`data-axis`**: `"vertical"` *(default)* | `"horizontal"`.
- **`data-motion`**: `"slide"` *(default)* | `"swell"` | `"fade"` | `"none"`.
- **`data-state`**: `"opening"` | `"open"` | `"closing"` | `"closed"` — exposes lifecycle state for JS/ARIA/`inert` coordination and consumer styling hooks.
- **`data-instant`**: Boolean presence attribute (`""` when suppressing transitions, e.g., on initial `open={true}` mount).
- **`data-fade-mask`**: Boolean presence attribute (`""` when partial-collapse gradient fade is active).

### Module Custom Properties (`--cs-collapsible-*`)

| Token | Default | Role |
| :--- | :--- | :--- |
| `--cs-collapsible-dur-enter` | `var(--cs-dur-240)` | Track open duration |
| `--cs-collapsible-dur-exit` | `var(--cs-dur-160)` | Track close duration |
| `--cs-collapsible-ease-enter` | `var(--cs-ease-quart-out)` | Monotonic track open curve |
| `--cs-collapsible-ease-exit` | `var(--cs-ease-exit)` | Track close curve (`--cs-ease-quad-in`) |
| `--cs-collapsible-fade-dur-enter` | `var(--cs-dur-effect)` | Inner `opacity` fade-in duration (`160ms`) |
| `--cs-collapsible-fade-dur-exit` | `var(--cs-dur-effect-fast)` | Inner `opacity` fade-out duration (`100ms`) |
| `--cs-collapsible-swell-distance` | `6px` | Inner `translate` offset for `swell` preset |
| `--cs-collapsible-swell-scale` | `0.985` | Inner `scale` start/exit value for `swell` preset |
| `--cs-collapsible-collapsed-size` | `0px` | Minimum resting size when closed (partial collapse) |
| `--cs-collapsible-fade-size` | `48px` | Edge fade-out depth when `data-fade-mask` is active |

### Core Transition Rules

- **Vertical (`data-axis="vertical"`):**
  - Closed: `grid-template-rows: 0fr;`
  - Open (`[data-open]`): `grid-template-rows: 1fr;`
  - Transition: `grid-template-rows var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit)` (swaps to `--cs-collapsible-dur-enter` / `--cs-collapsible-ease-enter` on `[data-open]`).
- **Horizontal (`data-axis="horizontal"`):**
  - Closed: `grid-template-columns: 0fr;`
  - Open (`[data-open]`): `grid-template-columns: 1fr;`
  - Transition: `grid-template-columns var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit)` (swaps to enter tokens on `[data-open]`).
- **`swell` Inner Choreography:**
  - Closed: `opacity: 0; scale: var(--cs-collapsible-swell-scale);` with `translate: 0 calc(var(--cs-collapsible-swell-distance) * -1)` (`vertical`) or `translate: calc(var(--cs-collapsible-swell-distance) * -1) 0` (`horizontal`).
  - Open (`[data-open]`): `opacity: 1; scale: 1; translate: 0 0;`
- **GPU Compositing Note:** `will-change` is omitted at rest to avoid unnecessary compositor layers on large lists (e.g., trees/accordions).

---

## 4. Layout & Optical Rules

### Strict Outer-vs-Inner Box-Model Separation

- **Outer `.cs-collapsible`:** `display: grid;` with **zero `padding`, `border`, or `margin`**. Any spacing on the outer grid container stays visible even at `0fr`, creating an unwanted collapsed gap.
- **Inner `.cs-collapsible-inner`:** Owns `min-block-size: var(--cs-collapsible-collapsed-size, 0px)` (vertical) or `min-inline-size: var(--cs-collapsible-collapsed-size, 0px)` (horizontal), plus any internal spacing or child surfaces.

### `overflow: clip` & Focus-Ring Safety

- `.cs-collapsible-inner` uses **`overflow: clip`** (never `overflow: hidden`). `overflow: clip` prevents browsers from creating an accidental scroll container (avoiding focus-triggered scroll jumps) while cleanly clipping content during `0fr ↔ 1fr` interpolation.
- **Focus-ring safety:** When closed (`:not([data-open])`), `overflow-clip-margin: 0px` prevents content from leaking outside `0fr`. When settled open (`[data-state="open"]`), `overflow-clip-margin: 4px` (or inner padding inside child content) ensures `2px` `:focus-visible` rings on interactive children are never shaved at the container edge.

### Horizontal Collapse Optical Behavior (`data-axis="horizontal"`)

- Unlike vertical collapse (where `inline-size` remains stable), horizontal collapse narrows the available width toward `0px`.
- If text wraps dynamically during `0fr ↔ 1fr`, line counts jump and cause vertical height jitter.
- **Rule:** Horizontal collapsible content should stabilize its inline width—either via `white-space: nowrap` for single-line labels/badges/toolbars, or an explicit `inline-size` / `min-inline-size: max-content` on a child wrapper inside `.cs-collapsible-inner`—so the panel reveals by clean horizontal clipping rather than text reflow.

### Partial Collapse (`collapsedSize`) & `fadeMask` (Code-Block Previews)

- **Cross-browser `0fr ↔ 1fr` with `collapsedSize`:** Because CSS cannot interpolate between `120px` and `1fr`, partial collapse keeps the outer track on `0fr ↔ 1fr` and sets `min-block-size: var(--cs-collapsible-collapsed-size, 0px)` on `.cs-collapsible-inner`. At `0fr`, the inner minimum size clamps the track to `collapsedSize` (e.g., `120px`), and `0fr → 1fr` interpolates smoothly from `120px` to full content height.
- **Surface-agnostic `fadeMask`:** Instead of a solid-color `::after` gradient overlay (which breaks across `canvas`, `elevated`, `sunken`, and syntax-highlighted backgrounds), `[data-fade-mask]` applies a CSS `mask-image` on `.cs-collapsible-inner`:
  - Uses a `200%` vertical `mask-size` (`linear-gradient(to bottom, #000 0%, #000 calc(50% - var(--cs-collapsible-fade-size)), transparent 50%, #000 50%, #000 100%)` or equivalent 2-stop mask) and transitions `mask-position` from `0 0%` (faded bottom edge when collapsed) to `0 100%` (fully opaque when `[data-open]`) over `--cs-collapsible-dur-enter` / `--cs-collapsible-dur-exit`.
  - This dissolves the fade smoothly as the code block expands and restores it smoothly as it collapses, without `@property` or background-color coupling.

---

## 5. Reduced Motion & Instant Mount

### Reduced Motion (`prefers-reduced-motion`)

- **No module-level `@media (prefers-reduced-motion: reduce)` rules:** Per `design-and-tokens.md`, `src/css/foundation/motion.css` globally neutralizes `transition-duration` and `animation-duration` to `0.01ms !important` when `prefers-reduced-motion: reduce` is active.
- Because `0.01ms` still dispatches `transitionend`, any JS lifecycle logic (`opening → open`, `closing → closed`) continues to resolve cleanly without special-case `matchMedia` CSS branches.

### Instant Initial Mount (`open={true}`)

- Mounting with `open={true}` must **never** play an entrance transition from `0fr → 1fr` or flicker `opacity`.
- When initialized open (or when `data-instant` is applied), `.cs-collapsible[data-instant]` and `.cs-collapsible[data-instant] .cs-collapsible-inner` set `transition: none !important;` for the initial frame, ensuring immediate layout stability at `1fr` / `opacity: 1`.
