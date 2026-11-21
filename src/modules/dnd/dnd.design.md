# Drag & Drop (`dnd`) Design Spec (`src/modules/dnd/`)

## 1. Visual Direction & Tactile Philosophy

`dnd` is a zero-wrapper, pointer-driven interaction engine in `@layer attachments`. Its visual and physical language is built around one overarching rule: **direct manipulation must feel calm, weighty, and predictable—never twitchy, flashy, or rubbery.**

### Core Design Principles

1. **Calm Displacement Over Visual Chrome:**
   - In 1D lists, Kanban boards, and 2D grids, **smooth WAAPI sibling displacement** is the primary spatial feedback. No default drop lines, no flashing borders, and no bouncy spring wobble on neighboring items while the user is scanning for a slot.
   - Drop indicators (`before` / `inside` / `after`) are strictly secondary—enabled by default only for hierarchical `"tree"` layouts and opt-in for non-displacing layouts like `<table>` rows.
2. **A Crisp, Razor-Sharp Drag Thumbnail Is Half the Battle:**
   - The dragged item lifts cleanly into the browser **Top Layer** (`popover="manual"`) with `cscripts-ui`'s floating elevation (`--cs-shadow-floating`), subtle `1.02` lift scale, **zero tilt (`0deg`)**, full `1` opacity, and integer-pixel GPU positioning so text and icons stay 100% sharp without bilinear blur.
3. **Zero-Jitter Spatial Physics:**
   - Collision detection evaluates **resting layout rects** (never chasing mid-flight animated rects), gated by a calibrated `6px` activation threshold, `6px` directional swap hysteresis, and an unequal-size post-swap guard. Moving the pointer `1mm` around a boundary never causes oscillation.
4. **Non-Invasive Attachment Styling:**
   - Because `dnd` attaches directly to arbitrary consumer HTML (`<li>`, `<tr>`, `<article>`, `<div>`), `dnd.attach.css` applies zero layout-altering chrome, zero borders, and zero background overrides on resting items or sortable containers.

---

## 2. Cursor Semantics

Reconciling `design-and-tokens.md`'s `cursor: default` rule for standard controls with direct spatial manipulation:

| Surface / State | Selector | Cursor | Rationale |
| :--- | :--- | :--- | :--- |
| **Whole-element draggable at rest** | Consumer item (no handle) | `default` *(unchanged)* | Cards, list rows, and table rows often hold selectable copy or nested buttons. Painting `grab` across an entire card feels noisy and breaks the calm desktop-app feel. |
| **Explicit drag handle at rest** | `[data-dnd-handle]` | `var(--cs-dnd-handle-cursor, grab)` | A dedicated grip handle has one sole purpose: spatial manipulation (analogous to a splitter's `col-resize`). `grab` gives immediate native OS affordance on the narrow grip target without polluting the surrounding row. |
| **Disabled handle** | `[data-dnd-handle][data-disabled]` | `default` | Removes manipulation affordance when dragging is disabled. |
| **Active pointer drag (global)** | `html[data-dnd-active]`, `html[data-dnd-active] *` | `var(--cs-dnd-active-cursor, grabbing) !important` | Locks the cursor globally while sweeping over links (`pointer`), inputs (`text`), or disabled surfaces so the OS cursor never flickers mid-drag. Paired with `user-select: none !important`. |
| **Keyboard drag / `settling` flight** | `data-dnd-active` **not set** | `default` | `data-dnd-active` is emitted **only** when `status === "dragging" && inputMethod === "pointer"`. Keyboard users never see a stuck `grabbing` fist, and pointer users regain their normal cursor the instant they release. |

---

## 3. Threshold & Hysteresis Calibration

Every threshold is tuned to eliminate both accidental drags and boundary oscillation:

| Parameter | Default | Guard / Clamping | Why This Exact Value |
| :--- | :--- | :--- | :--- |
| `activation.distance` | `6px` | Euclidean `Math.hypot(dx, dy) >= 6` | Below `4px`, sloppy clicks and trackpad taps trigger accidental drags. Above `8px`, the card feels "stuck" before jumping suddenly. `6px` (`12` device pixels on 2× screens) absorbs click micro-slips while feeling instantaneous. |
| `activation.delay` | `0ms` *(touch preset: `180ms`)* | Aborts to `idle` if drift `> tolerance` before `delay` elapses | `0ms` keeps desktop and handle drags immediate. For touch-scrollable whole-item lists, `180ms` cleanly separates vertical scroll gestures from intentional hold-to-drag without feeling sluggish (`> 250ms` feels broken). |
| `activation.tolerance` | `6px` | Checked only while `delay > 0` | Matches `distance` so natural finger roll during a `180ms` press-and-hold does not cancel pickup, while an intentional scroll swipe aborts immediately. |
| `hysteresisPx` | `6px` | Clamped to `min(hysteresisPx, targetMainAxisSize * 0.2)` | Adds a directional `±6px` (`12px` total) deadband around every sibling midpoint. Micro-tremors around 50% never oscillate; the `20%` clamp ensures compact `24px` chips still swap smoothly (`4.8px` deadzone). |
| **Unequal-Size Swap Guard** | Always on | Active when `size(A) !== size(B)` | After swapping two unequally sized siblings, a pair guard `(A, B)` blocks an immediate reverse swap until the pointer either reverses past the smaller item's far boundary or exits the overlap band—eliminating the classic tall-over-short strobe bug. |

### Pre-Drag Readiness Cue (`delay > 0` Only)

When `activation.delay > 0`, the engine emits `data-pending=""` on the pressed `[data-dnd-item]` during `status === "pending"` (never emitted when `delay === 0`, so normal clicks never twitch):
- Subtle tactile compression: `scale: 0.985` over `var(--cs-dur-press)` (`140ms`) `var(--cs-ease-press)`.
- As soon as `delay` elapses, the item pops cleanly into the Top-Layer thumbnail at `scale(1.02)`, giving clear physical "pressed → lifted" feedback on touch devices.

### Cross-Container Velocity / Intent Gating

Intra-container sorting remains 1:1 instant, but live cross-container `onReorder` (`targetContainerId !== active.containerId`, e.g. sweeping a Kanban card across a middle column) is gated by EMA-smoothed pointer velocity (`α = 0.3`, decaying to `0` after `40ms` idle) and travel axis:

| Pointer Velocity / Motion Band | Behavior | Rationale |
| :--- | :--- | :--- |
| **`<= 100 px/s`** *(slow / deliberate)* | **Instant (`0ms`)** cross-container `onReorder` | Deliberately placing a card into an adjacent column feels immediate with zero lag. |
| **`100 – 240 px/s`** *(aiming / decelerating)* | **`45ms`** confirmation dwell | Absorbs accidental border grazes while opening almost immediately as the user slows down. |
| **`240 – 320 px/s`** *(medium speed / turning into column)* | **`120ms`** dwell inside container | Allows smooth entry when scanning vertically down a target column (`\|vy\| >= \|vx\|`). |
| **`> 320 px/s` or fast cross-axis sweep (`\|vx\| > \|vy\|`)** | **Suppressed** (middle column stays calm) | Sweeping from Column A across Column B to Column C never expands/collapses Column B mid-flight. |
| **Release (`pointerup`) while gated** | **Synchronous flush before `onDrop`** | Fast flick-and-drop into a column always commits cleanly into that target container and plays the normal `200ms` settle flight—zero dropped moves. |

---

## 4. WAAPI Motion Choreography

All spatial motion runs through `waapi-flip.internal.ts` using native `Element.animate()`—zero `svelte/animate` `flip` and zero CSS `transition` hacks on consumer items.

### Choreography Table

| Phase | Target | Duration Token | Default | Easing Token | Default Curve | Animated Properties & Feel |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pickup / Lift-off** | `.cs-dnd-thumbnail` | `--cs-dnd-pickup-dur` | `var(--cs-dur-160)` (`160ms`) | `--cs-dnd-pickup-ease` | `var(--cs-ease-quart-out)` | `scale(1) → scale(var(--cs-dnd-thumbnail-scale))` + shadow ramp to `--cs-dnd-thumbnail-shadow`. Fast, confident lift with **zero overshoot** so the thumbnail never wobbles as the pointer starts moving. |
| **Sibling FLIP Displacement** | Displaced siblings | `--cs-dnd-flip-dur` | `var(--cs-dur-240)` (`240ms`) | `--cs-dnd-flip-ease` | `var(--cs-ease-quart-out)` | Independent CSS `translate: ${dx}px ${dy}px 0px → 0px 0px 0px` (`composite: "add"`, effect-level `easing`). Never overwrites consumer `transform` (`scale`/`rotate`), opens the target slot smoothly with **zero overshoot**. |
| **Drop Settle Flight** | `.cs-dnd-thumbnail` | `--cs-dnd-settle-dur` | `var(--cs-dur-200)` (`200ms`) | `--cs-dnd-settle-ease` | `var(--cs-ease-quart-out)` | Release `(x, y)` + `scale(1.02)` + floating shadow → target slot resting `(targetX, targetY)` + `scale(1)` + resting shadow. Short micro-drops (`< 24px`) compress proportionally down to a `120ms` floor so dropping in place never lingers. |
| **Cancel Snap-Back Flight** | `.cs-dnd-thumbnail` | `--cs-dnd-cancel-dur` | `var(--cs-dur-240)` (`240ms`) | `--cs-dnd-cancel-ease` | `var(--cs-ease-quart-out)` | Release `(x, y)` + `scale(1.02)` → origin slot resting `(originX, originY)` + `scale(1)`. Slightly calmer (`240ms`) to accommodate longer cross-viewport returns. |
| **Dropzone / Indicator State** | `[data-over]`, `[data-drop-position]` | `var(--cs-dur-effect-fast)` | `100ms` | `var(--cs-ease-effect)` | `var(--cs-ease-quad-out)` | CSS transition on `background-color`, `box-shadow`, and `opacity` for crisp, non-distracting target confirmation. |

### Why `--cs-ease-quart-out` (Zero Overshoot) Everywhere in `dnd`

- `--cs-spring-snappy` (`~4%` overshoot) and `--cs-spring-squash` (`~28%` overshoot) are calibrated for discrete toggles and popovers—not continuous spatial sorting.
- During rapid list/grid scanning, overshooting siblings visually collide with adjacent items and create seasick micro-bounces. `cubic-bezier(0.25, 1, 0.5, 1)` (`--cs-ease-quart-out`) delivers immediate responsiveness in the first `60ms` followed by a silky, damped deceleration.

### Mid-Flight Interruption Continuity

1. Before `onReorder`, `waapiFlip.snapshot()` reads every sibling's **live interpolated visual rect** via `getBoundingClientRect()` (capturing exact mid-flight coordinates if a prior FLIP is still running).
2. After Svelte flushes the updated DOM, `waapiFlip.play()` synchronously calls `prevAnim.cancel()` and starts the new `el.animate()` in the **same frame before paint**.
3. Result: rapid back-and-forth sweeps redirect siblings smoothly from their exact in-flight position with zero snapping, jumping, or velocity glitches.

### Reduced Motion (`prefers-reduced-motion: reduce`)

Because `motion.css`'s global `@media (prefers-reduced-motion: reduce)` neutralizes CSS transitions/animations but **does not** affect imperative `Element.animate()` calls:
- `waapi-flip.internal.ts` checks `window.matchMedia("(prefers-reduced-motion: reduce)").matches` before every animation.
- When reduced motion is active (or `animate: false`), pickup lift, sibling FLIP, drop settle, and cancel snap-back bypass `Element.animate()` and settle synchronously in `0ms`.

---

## 5. Drag Thumbnail & Origin Placeholder Visual Language

### Top-Layer Thumbnail Host (`.cs-dnd-thumbnail-host`)

Rendered lazily as `<div class="cs-dnd-thumbnail-host" popover="manual" aria-hidden="true">` and promoted via `showPopover()` so the thumbnail floats above modals, drawers, and `overflow: hidden` ancestors without `z-index` wars.

- **Strict UA Popover Reset:** Browser UA stylesheets apply `margin: auto`, `border: solid`, `padding: 0.25em`, and `background: Canvas` to `[popover]`. `.cs-dnd-thumbnail-host` resets all of them explicitly (`position: fixed; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: transparent; overflow: visible; pointer-events: none;`) and hides `::backdrop`.
- **Graceful Fallback:** In environments lacking `showPopover`, falls back to `position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;`.

### Drag Thumbnail (`.cs-dnd-thumbnail`)

| Token | Default | Rationale |
| :--- | :--- | :--- |
| `--cs-dnd-thumbnail-scale` | `1.02` | `1.00` feels flat/stuck to the surface; `1.05+` bloats wide cards (`400px+`) and blurs text. `1.02` gives unmistakable tactile elevation. |
| `--cs-dnd-thumbnail-rotate` | `0deg` | Zero tilt keeps `Inter` glyphs and `1px` edges razor-sharp and matches `cscripts-ui`'s architectural minimalism. Consumers can opt into playful tilt (e.g. `1.5deg`) locally on sticky-note boards. |
| `--cs-dnd-thumbnail-shadow` | `var(--cs-shadow-floating)` | Uses `shapes.css`'s floating elevation token—including dark mode's crisp `1px` top-lit and outer inset rim so elevated cards never blend into `--cs-color-elevated` backgrounds underneath. |
| `--cs-dnd-thumbnail-opacity` | `1` | Full opacity keeps text, avatars, and icons crisp and legible while moving (no foggy `0.8` ghosting). |
| `--cs-dnd-thumbnail-radius` | `inherit` | Preserves the cloned item's exact `border-radius` and `corner-shape` squircle. |

#### Subpixel Sharpness Protocol on GPU-Promoted Layers

To prevent blurry text on the GPU-promoted thumbnail:
1. **Integer Box Lock:** Auto-clone locks `width: ${Math.round(rect.width)}px` and `height: ${Math.round(rect.height)}px` with `margin: 0; box-sizing: border-box;` so compositor textures have exact integer dimensions and list margins never offset the grab point.
2. **Integer-Snapped Coordinates:** Every `pointermove` frame writes `transform: translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scale(var(--cs-dnd-thumbnail-scale)) rotate(var(--cs-dnd-thumbnail-rotate))`—never fractional subpixel floats.
3. **Clean Clone Hygiene & `<tr>` Fidelity:** Auto-cloning strips all `id` attributes (preventing duplicate DOM IDs), removes `data-dragging` and `data-pending` (preventing placeholder opacity from leaking into the thumbnail), and sets `pointer-events: none`. When cloning a `<tr>`, each `<td>`/`<th>` width is locked via `getBoundingClientRect().width` (`box-sizing: border-box`) and the row is wrapped in a minimal `<table class="cs-dnd-thumbnail cs-dnd-thumbnail-table"><tbody>…</tbody></table>` (`table-layout: fixed`, inheriting `border-collapse`, `border-spacing`, and `<table>` typography—`font`, `color`, `line-height`, `letter-spacing`—from the source `<table>`) so columns, `colspan`, `vertical-align`, and cell text match 1:1.
4. **Crisp Handoff on Settle:** On `settling -> idle`, the thumbnail finishes at exact integer target coordinates with `scale(1)` and unmounts in the same frame `data-dragging` clears, revealing the native crisp DOM element with zero shift.

### Origin Item Placeholder (`[data-dragging]`)

- **Universal Default:** `opacity: var(--cs-dnd-placeholder-opacity, 0.35);`
  - Works safely across **every** native HTML element (`<li>`, `<tr>`, `<article>`, `<div>`, grid tiles) without breaking table row layout or injecting unwanted backgrounds/radii onto transparent list rows.
  - Holds the exact resting box in flow so surrounding geometry never collapses.
- **Recommended Recessed-Slot Recipe (for Elevated Cards & Kanban Tiles):**
  Consumers building card-based Kanban boards or dashboard grids can turn `[data-dragging]` into a physical recessed tray using `cscripts-ui` surface tokens:
  ```css
  .my-card[data-dragging] {
      opacity: 1;
      background-color: var(--cs-color-sunken);
      box-shadow: var(--cs-shadow-sunken);
  }
  .my-card[data-dragging] > * {
      opacity: 0;
  }
  ```

---

## 6. Dropzone & Indicator Styling (Secondary / Optional)

### Free Dropzones (`[data-dnd-droppable][data-layout="free"]`)

Sortable containers (`list`, `grid`, `tree`) remain visually calm by default so dragging within a list does not flash the entire container. Free dropzones (`[data-dnd-droppable][data-layout="free"]`) receive clean, borderless feedback matching `UploadArea`:

| State | Selector | Background (`bg`) | Inset Ring (`::after`) |
| :--- | :--- | :--- | :--- |
| **Idle / Hovering Outside** | `[data-dnd-droppable][data-layout="free"]` | Consumer surface | `none` |
| **Valid Target** | `[data-dnd-droppable][data-layout="free"][data-over][data-drop-valid]` | `var(--cs-dnd-drop-valid-bg)` (`--cs-color-accent-soft`) | `inset 0 0 0 2px var(--cs-dnd-drop-valid-ring)` (`--cs-color-accent-solid`) |
| **Invalid Target** | `[data-dnd-droppable][data-layout="free"][data-over][data-drop-invalid]` | `var(--cs-dnd-drop-invalid-bg)` (`--cs-color-negative-soft`) | `inset 0 0 0 2px var(--cs-dnd-drop-invalid-ring)` (`--cs-color-negative-solid`) |

- The `::after` overlay uses `position: absolute; inset: 0; border-radius: inherit; corner-shape: inherit; pointer-events: none;` so the inset ring follows `corner-shape: squircle` accurately with zero box-model shift.
- Transitions run over `var(--cs-dur-effect-fast)` (`100ms`) `var(--cs-ease-effect)`.

### Tree & Non-Displacing Row Indicators (`[data-dnd-item][data-drop-position]`)

Emitted when `indicator: true` (default for `"tree"`, opt-in for `"list"`/`"grid"` such as `<table>` rows):

- **`before` / `after` (Non-Displacing Lists & Grids):**
  - Renders a crisp `2px` (`--cs-dnd-indicator-thickness`) full-pill (`--cs-dnd-indicator-radius: var(--cs-radius-full)`) accent bar (`--cs-dnd-indicator-bg: var(--cs-color-accent-solid)`) via `::after` (`position: absolute; inset-inline: var(--cs-dnd-indicator-inset-start, 0px) 0; height: var(--cs-dnd-indicator-thickness); pointer-events: none; z-index: 1;`).
  - Centered straddling the boundary (`top: calc(var(--cs-dnd-indicator-thickness) / -2)` for `before`; `bottom: calc(var(--cs-dnd-indicator-thickness) / -2)` for `after`) so it sits cleanly in the gap between rows without clipping content.
- **Depth-Aware Tree Indicators (`[data-dnd-droppable][data-layout="tree"] [data-dnd-item][data-drop-position]`):**
  - **Target Depth Semantics:**
    - `before` any node → lands at `node.depth`.
    - `after` a collapsed folder or leaf → lands at `node.depth` (next sibling).
    - `after` an **expanded folder** (`canNest && expanded`) → lands at **`node.depth + 1`** (first child), visually aligning with the child list immediately below.
    - `inside` a `canNest` node → highlights the row itself (`--cs-dnd-indicator-inside-bg` + `1.5px` inset accent ring), no line.
  - **Depth-Aligned Inset + Leading Hollow Anchor Ring:**
    - `dnd` writes `--cs-dnd-target-depth` on the hovered tree item so `--cs-dnd-indicator-inset-start` computes to `calc(var(--cs-dnd-tree-base-inset, 12px) + var(--cs-dnd-target-depth, 0) * var(--cs-dnd-tree-indent, 20px))`.
    - `::before` renders a `6px` (`--cs-dnd-indicator-dot-size`) hollow circular anchor ring (`background: var(--cs-color-elevated); box-shadow: inset 0 0 0 2px var(--cs-dnd-indicator-bg); border-radius: var(--cs-radius-full);`) pinned at `inset-inline-start: calc(var(--cs-dnd-indicator-inset-start) - var(--cs-dnd-indicator-dot-size) / 2)` (centered on the top/bottom boundary), while the `2px` bar (`::after`) starts flush at its outer right edge (`inset-inline-start: calc(var(--cs-dnd-indicator-inset-start) + var(--cs-dnd-indicator-dot-size) / 2)`). Setting `--cs-dnd-indicator-dot-size: 0px` cleanly hides the ring.
    - Depth/edge changes snap immediately (no sliding transition across row text) so scanning across nesting levels feels surgical.
- **`before` / `after` on Table Rows (`tr[data-dnd-item][data-drop-position]`):**
  - Because `<tr>` positioning for `::after` varies across table layout modes, `tr[data-dnd-item][data-drop-position="before"]` and `tr[data-dnd-item][data-drop-position="after"]` use `box-shadow: inset 0 var(--cs-dnd-indicator-thickness) 0 0 var(--cs-dnd-indicator-bg)` (and negative Y for `after`) for rock-solid, zero-shift table lines.
- **`before` / `after` (Horizontal Lists `[data-dnd-droppable][data-orientation="horizontal"]`):**
  - Rotates the `2px` pill bar to vertical (`inset-block: 0; width: var(--cs-dnd-indicator-thickness); inset-inline-start` / `inset-inline-end`).
- **`inside` (Tree Nesting):**
  - Applies `background-color: var(--cs-dnd-indicator-inside-bg)` (`var(--cs-color-accent-soft)`) and `box-shadow: inset 0 0 0 1.5px var(--cs-dnd-indicator-bg)` so nesting into a folder/parent node is immediately distinct from inserting `before`/`after`.

---

## 7. Auto-Scroll Ergonomics & `ScrollArea` Harmony

Auto-scroll must feel like an extension of the user's hand—never yanking the list unexpectedly, never lagging behind the pointer.

| Parameter | Default | Calibration Rationale |
| :--- | :--- | :--- |
| `edgeSize` | `48px` | Auto-clamped to `min(edgeSize, containerDimension * 0.25)` so compact containers (`140px` tall) keep a comfortable `50%+` quiet center zone. |
| `minSpeed` | `60px/s` | Gentle creep in the outer edge zone so users can aim precisely at the last visible row without overshooting. |
| `maxSpeed` | `900px/s` | Brisk traversal for long 100+ item lists when pushed flush against the container edge. |
| **Acceleration Curve** | Quadratic `min + (max - min) * p²` | `p ∈ [0, 1]` is normalized edge penetration. Quadratic keeps the outer half calm (`60–270 px/s`) and ramps rapidly only in the deepest `25%` (`p > 0.75`). Linear curves feel abrupt at the outer edge; cubic curves feel dead until the last `10px`. |
| **Frame Normalization** | `dt = Math.min((now - last) / 1000, 0.05)` | Identical scroll velocity across 60Hz, 120Hz, and 144Hz displays, with a `50ms` tab-switch spike cap. |
| **Initial-Edge Guard** | `true` (`8px` unlock) | Edges already occupied by the pointer at `pending -> dragging` stay locked until the pointer either leaves the edge zone or advances `>= 8px` deeper toward that edge. Grabbing the bottom item of a list never triggers runaway scrolling. |

### `ScrollArea` Harmony (Zero Coupling)

- `ScrollArea` renders a native overflow container (`.cs-scroll-area-content`, `overflow: auto`) and updates its custom overlay scrollbars from native `scroll` events.
- `auto-scroll.internal.ts` mutates `el.scrollTop` / `el.scrollLeft` directly (never `scrollBy({ behavior: "smooth" })`, which introduces lag and fights RAF updates). Native `scroll` events fire automatically, causing `ScrollArea`'s custom thumb to glide and reveal smoothly in sync with zero cross-module imports.

---

## 8. Complete CSS Token & Selector Contract (`dnd.attach.css`)

All styles live in `src/modules/dnd/dnd.attach.css` inside `@layer attachments`:

### CSS Custom Properties (`--cs-dnd-*`)

| Token | Default | Role |
| :--- | :--- | :--- |
| `--cs-dnd-handle-cursor` | `grab` | Resting cursor on `[data-dnd-handle]`. |
| `--cs-dnd-active-cursor` | `grabbing` | Global cursor on `html[data-dnd-active]` during pointer drag. |
| `--cs-dnd-thumbnail-shadow` | `var(--cs-shadow-floating)` | Elevation shadow of `.cs-dnd-thumbnail`. |
| `--cs-dnd-thumbnail-scale` | `1.02` | Lift scale of `.cs-dnd-thumbnail`. |
| `--cs-dnd-thumbnail-rotate` | `0deg` | Optional tilt angle of `.cs-dnd-thumbnail` (`0deg` for crisp optics). |
| `--cs-dnd-thumbnail-opacity` | `1` | Opacity of `.cs-dnd-thumbnail`. |
| `--cs-dnd-thumbnail-radius` | `inherit` | Corner radius of `.cs-dnd-thumbnail`. |
| `--cs-dnd-placeholder-opacity` | `0.35` | Opacity of the in-flow origin item (`[data-dragging]`). |
| `--cs-dnd-drop-valid-bg` | `var(--cs-color-accent-soft)` | Soft fill on valid hovered free dropzones. |
| `--cs-dnd-drop-valid-ring` | `var(--cs-color-accent-solid)` | `2px` inset ring on valid hovered free dropzones. |
| `--cs-dnd-drop-invalid-bg` | `var(--cs-color-negative-soft)` | Soft fill on invalid hovered free dropzones. |
| `--cs-dnd-drop-invalid-ring` | `var(--cs-color-negative-solid)` | `2px` inset ring on invalid hovered free dropzones. |
| `--cs-dnd-indicator-bg` | `var(--cs-color-accent-solid)` | Fill color of `before`/`after` indicator line, hollow anchor ring, and `inside` inset ring. |
| `--cs-dnd-indicator-thickness` | `2px` | Thickness of `before`/`after` indicator bar. |
| `--cs-dnd-indicator-radius` | `var(--cs-radius-full)` | Pill radius of `before`/`after` indicator bar. |
| `--cs-dnd-indicator-inside-bg` | `var(--cs-color-accent-soft)` | Soft fill on `[data-drop-position="inside"]` tree nodes. |
| `--cs-dnd-indicator-dot-size` | `6px` | Diameter of the hollow leading anchor ring on tree `before`/`after` indicators (`0px` disables). |
| `--cs-dnd-tree-base-inset` | `12px` | Base leading padding before depth indentation on tree drop indicators. |
| `--cs-dnd-tree-indent` | `20px` | Per-level horizontal step for depth-aware tree drop indicators. |
| `--cs-dnd-target-depth` | `0` *(dynamic)* | Target nesting depth written by `dnd` (`depth` or `depth + 1` for expanded-folder `after`). |
| `--cs-dnd-indicator-inset-start` | `0px` *(tree: computed)* | Leading inset of `before`/`after` indicator bar (auto-derived from `--cs-dnd-target-depth` in trees). |
| `--cs-dnd-pickup-dur` | `var(--cs-dur-160)` | WAAPI thumbnail pickup lift duration (`160ms`). |
| `--cs-dnd-pickup-ease` | `var(--cs-ease-quart-out)` | WAAPI thumbnail pickup lift easing. |
| `--cs-dnd-flip-dur` | `var(--cs-dur-240)` | WAAPI sibling FLIP displacement duration (`240ms`). |
| `--cs-dnd-flip-ease` | `var(--cs-ease-quart-out)` | WAAPI sibling FLIP displacement easing. |
| `--cs-dnd-settle-dur` | `var(--cs-dur-200)` | WAAPI drop-settle flight duration (`200ms`). |
| `--cs-dnd-settle-ease` | `var(--cs-ease-quart-out)` | WAAPI drop-settle flight easing. |
| `--cs-dnd-cancel-dur` | `var(--cs-dur-240)` | WAAPI cancel snap-back flight duration (`240ms`). |
| `--cs-dnd-cancel-ease` | `var(--cs-ease-quart-out)` | WAAPI cancel snap-back flight easing. |

### Selector Contract (`@layer attachments`)

| Selector | Applied Rules |
| :--- | :--- |
| `html[data-dnd-active]`, `html[data-dnd-active] *` | `cursor: var(--cs-dnd-active-cursor, grabbing) !important; user-select: none !important;` |
| `[data-dnd-handle]` | `cursor: var(--cs-dnd-handle-cursor, grab); touch-action: none; user-select: none;` |
| `[data-dnd-handle][data-disabled]` | `cursor: default;` |
| `[data-dnd-item][data-pending]` | `scale: 0.985; transition: scale var(--cs-dur-press) var(--cs-ease-press);` *(emitted only when `delay > 0`)* |
| `[data-dnd-item][data-dragging]` | `opacity: var(--cs-dnd-placeholder-opacity, 0.35);` |
| `.cs-dnd-thumbnail-host` | Top-Layer `popover="manual"` UA reset: `position: fixed; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: transparent; overflow: visible; pointer-events: none;` (`::backdrop { display: none; }`; fallback `z-index: 2147483647`). |
| `.cs-dnd-thumbnail` | `position: fixed; top: 0; left: 0; margin: 0; box-sizing: border-box; pointer-events: none; will-change: transform; box-shadow: var(--cs-dnd-thumbnail-shadow, var(--cs-shadow-floating)); opacity: var(--cs-dnd-thumbnail-opacity, 1); border-radius: var(--cs-dnd-thumbnail-radius, inherit);` |
| `[data-dnd-droppable][data-layout="free"]` | `position: relative; transition: background-color var(--cs-dur-effect-fast) var(--cs-ease-effect);` |
| `[data-dnd-droppable][data-layout="free"]::after` | `content: ""; position: absolute; inset: 0; border-radius: inherit; corner-shape: inherit; pointer-events: none; transition: box-shadow var(--cs-dur-effect-fast) var(--cs-ease-effect);` |
| `[data-dnd-droppable][data-layout="free"][data-over][data-drop-valid]` | `background-color: var(--cs-dnd-drop-valid-bg, var(--cs-color-accent-soft));` (`::after` `box-shadow: inset 0 0 0 2px var(--cs-dnd-drop-valid-ring, var(--cs-color-accent-solid));`) |
| `[data-dnd-droppable][data-layout="free"][data-over][data-drop-invalid]` | `background-color: var(--cs-dnd-drop-invalid-bg, var(--cs-color-negative-soft));` (`::after` `box-shadow: inset 0 0 0 2px var(--cs-dnd-drop-invalid-ring, var(--cs-color-negative-solid));`) |
| `[data-dnd-item][data-drop-position="before"]`, `[data-dnd-item][data-drop-position="after"]` | `position: relative;` + `::after` `2px` accent pill bar (`--cs-dnd-indicator-bg`, `--cs-dnd-indicator-radius`, `pointer-events: none; z-index: 1;`) on top/bottom edge (or inline-start/end inside `[data-dnd-droppable][data-orientation="horizontal"]`). `tr[data-dnd-item][data-drop-position]` uses inset `box-shadow` fallback. |
| `[data-dnd-droppable][data-layout="tree"] [data-dnd-item][data-drop-position="before" \| "after"]` | Sets depth-derived `--cs-dnd-indicator-inset-start`; `::before` draws the `6px` hollow leading anchor ring (`--cs-color-elevated` core + `2px` `--cs-dnd-indicator-bg` inset stroke) and `::after` starts flush at the ring's outer right edge. |
| `[data-dnd-item][data-drop-position="inside"]` | `background-color: var(--cs-dnd-indicator-inside-bg, var(--cs-color-accent-soft)); box-shadow: inset 0 0 0 1.5px var(--cs-dnd-indicator-bg, var(--cs-color-accent-solid));` |
| `.cs-dnd-announcer` | Visually hidden `aria-live="assertive"` live region (`position: fixed; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;`). |
