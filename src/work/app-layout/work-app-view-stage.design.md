# Work App View Stage Design & Motion Spec (`src/work/app-layout/`)

## 1. Visual & Motion Philosophy

`WorkAppViewStage` orchestrates full-view transitions inside [`WorkAppMain`](WorkAppMain.svelte) (within [`WorkAppFrame`](WorkAppFrame.svelte), up to `1280px` wide via `--cs-container-7xl`). It handles two distinct desktop-first navigation axes:

1. **Mode Switch (`App ↔ Docs`):** Toggling between the primary application workspace and [`WorkAppDocs`](../app-docs/WorkAppDocs.svelte) via `WorkAppHelpButton` (`showDocs`). Feels like a calm, vertical sheet/layer swap—grounded, deliberate, and authoritative.
2. **Directional Tab Switch (`Tab A ↔ Tab B`):** Switching between top-level application views or chapters along a horizontal axis. Feels like a crisp, lateral slide—lightweight and immediate.

### Why Large Content Views Must Never Use Springs or 50/50 Crossfades

- **No bouncy springs (`--cs-spring-squash`, `--cs-spring-snappy`):** Those curves in [`motion.css`](../../css/foundation/motion.css) are calibrated for compact controls, pills, and popovers. Applying even a `4%` overshoot (`--cs-spring-snappy`) to a `1280px`-wide view containing cards, tables, and dense typography creates visual seasickness and makes the workspace feel unanchored. Large surfaces require **critically damped deceleration (`out`)** on entry and **clean acceleration (`in`)** on exit—zero overshoot.
- **No symmetric 50/50 crossfades:** When two opaque-text, card-heavy surfaces fade simultaneously over the same timeline (`50%` outgoing + `50%` incoming), headings, `box-shadow` rims, and table hairlines collide into a muddy double-exposure. Instead, `WorkAppViewStage` uses an **asymmetric exit-then-enter cadence**: the outgoing view clears the stage quickly first, and the incoming view enters into a clean visual field.

---

## 2. Stage Geometry & Layout Stability

During any transition (or rapid reversal), Svelte briefly keeps both the outgoing and incoming view nodes in the DOM. If `WorkAppViewStage` were a normal flex column (`WorkAppMain` is `display: flex; flex-direction: column`), the two views would stack vertically, doubling `scrollHeight` and causing `ScrollAreaContent` to jump its scrollbar and `scrollFade` masks.

### Single-Cell CSS Grid Stage

```css
@layer components.primitive {
    .cs-work-app-view-stage {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: start;
        min-width: 0;
    }

    .cs-work-app-view-stage > * {
        grid-area: 1 / 1;
        min-width: 0;
    }
}
```

- **Shared `1 / 1` cell:** Both outgoing and incoming views occupy the exact same grid track without stacking vertically.
- **`align-items: start`:** Prevents a shorter view from stretching to match a taller view's height during the brief overlap.
- **`minmax(0, 1fr)` + `min-width: 0`:** Preserves table/code horizontal overflow containment inside `WorkAppMain` and `WorkAppDocs`.
- **`inert` on outgoing nodes:** Outgoing views must receive `inert` (and `pointer-events: none`) immediately as `workAppViewOut` begins so keyboard focus, hover states, and rapid clicks cannot hit a departing view.
- **GPU Layer Hygiene:** `workAppViewIn` / `workAppViewOut` animate only compositor-friendly properties (`opacity`, `transform`). Once the transition settles, `transform` is removed (`none`) so text stays subpixel-sharp without permanent GPU rasterization.

---

## 3. Asymmetric Exit vs. Enter Choreography (`workAppViewIn` / `workAppViewOut`)

Every transition uses a **fast exit** (`100ms`–`120ms`, `0ms` delay) paired with a **delayed, crisp enter** (`180ms`–`220ms`, `60ms`–`80ms` delay). Because the exit begins at `0ms`, perceived latency is zero; because the enter waits `60ms`–`80ms`, the outgoing view has already dropped below `~20%` opacity before the incoming view becomes legible.

### Token & Easing Mapping (`motion.css` ↔ Svelte `easing`)

| Role | Repo Token (`motion.css`) | CSS Curve | Svelte `svelte/easing` Equivalent |
| :--- | :--- | :--- | :--- |
| **Exit timing (Mode / Tab)** | `--cs-dur-exit-sm` (`100ms`) / `--cs-dur-exit-md` (`120ms`) | `--cs-ease-quad-in` (`cubic-bezier(0.11, 0, 0.5, 0)`) / `--cs-ease-cubic-in` (`cubic-bezier(0.32, 0, 0.67, 0)`) | `quadIn` / `cubicIn` |
| **Enter timing (Mode / Tab)** | `--cs-dur-180` (`180ms`) / `--cs-dur-200` (`200ms`) | `--cs-ease-cubic-out` (`cubic-bezier(0.33, 1, 0.68, 1)`) / `--cs-ease-quart-out` (`cubic-bezier(0.25, 1, 0.5, 1)`) | `cubicOut` / `quartOut` |

> **Why not `--cs-dur-enter-lg` (`440ms`) + `--cs-ease-enter` (`--cs-spring-snappy`)?** Those tokens in `motion.css` belong to *floating & overlay surfaces* (dialogs, popovers) that enter over an existing backdrop. Full-frame views inside `WorkAppMain` are grounded content planes, not floating overlays, so they use shorter, non-spring deceleration (`180ms`–`220ms`).

### Variant A: Mode Switch (`App ↔ Docs`, `axis="vertical"` / overlay-like)

Used when toggling `showDocs` (`WorkAppHelpButton`) or switching between fundamentally different workspace modes.

| Phase | `duration` | `delay` | `easing` | `opacity` | `translateY` | `scale` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`workAppViewOut`** | `110ms` (`~--cs-dur-exit-md`) | `0ms` | `cubicIn` | `1 → 0` | `0px → -6px` (or `+6px` when closing Docs) | `1 → 0.996` |
| **`workAppViewIn`** | `220ms` (`~--cs-dur-200`) | `70ms` | `quartOut` | `0 → 1` | `+10px → 0px` (or `-8px → 0px` when returning to App) | `0.994 → 1` |

- **Subtle `scale` (`0.994 → 1`):** Gives `App ↔ Docs` a quiet sense of depth without distorting layout geometry. At `1280px` width, `0.994` is only `~3.8px` inset per side—perceptible as crispness, never as a zoom gimmick.
- **Directionality:**
  - Entering **Docs** (`App → Docs`): App recedes (`y: -6px`, `scale: 0.996`), Docs rises gently into focus (`y: +10px → 0px`, `scale: 0.994 → 1`).
  - Returning to **App** (`Docs → App`): Docs steps down (`y: +6px`, `scale: 0.996`), App settles back (`y: -8px → 0px`, `scale: 0.994 → 1`).

### Variant B: Directional Tab Switch (`Tab A ↔ Tab B`, `axis="horizontal"`)

Used when switching peer views along a tab bar (`direction: 1` for forward/right, `-1` for backward/left).

| Phase | `duration` | `delay` | `easing` | `opacity` | `translateX` | `scale` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`workAppViewOut`** | `100ms` (`--cs-dur-exit-sm`) | `0ms` | `quadIn` | `1 → 0` | `0px → calc(-12px * direction)` | `1` (none) |
| **`workAppViewIn`** | `180ms` (`--cs-dur-180`) | `60ms` | `cubicOut` | `0 → 1` | `calc(16px * direction) → 0px` | `1` (none) |

- **No `scale` on tab switches:** Peer tabs live on the same elevation plane; adding scale would falsely imply hierarchy depth.
- **Short travel (`12px` / `16px`):** On a wide desktop viewport, `16px` is enough to communicate left/right order without dragging a wall of cards across the screen.

### Variant C: Fallback / Neutral Switch (`axis="none"`)

Used when direction is unknown or irrelevant (e.g. deep-link jump or filter reset).

- **`workAppViewOut`:** `100ms`, `0ms` delay, `quadIn`, `opacity: 1 → 0` (no transform).
- **`workAppViewIn`:** `160ms` (`--cs-dur-effect`), `50ms` delay, `cubicOut`, `opacity: 0 → 1` (no transform).

---

## 4. Scroll-Position & Visual Continuity

In [`WorkAppLayout.preview.svelte`](WorkAppLayout.preview.svelte), `ScrollAreaContent` sits **above** `WorkAppFrame` and `WorkAppMain` in the tree. This means `App` and `Docs` (and all tabs inside `WorkAppMain`) share **one** vertical scroll container.

### Instant Per-View `scrollTop` Restoration

When switching from `App` (scrolled to `y = 640px`) to `Docs` (fresh or previously scrolled to `y = 0px`), and later back to `App`:

1. **Snapshot on leave:** Record `scrollContainer.scrollTop` into an in-memory `Map<viewKey, number>` *before* the outgoing view unmounts or changes height.
2. **Instant restore on enter (`behavior: "instant"`):** Restore `scrollContainer.scrollTop = savedTop ?? 0` **synchronously** as the incoming view mounts and enters (after `tick()` / once the incoming view's DOM establishes its `scrollHeight`, before the incoming view's `opacity` ramps up during its `60ms`–`70ms` delay).
3. **Never use `scroll-behavior: smooth` for view restoration:**
   - Smooth scrolling during a `translateY` / `translateX` view entrance forces the user's eye to track two simultaneous motion vectors—causing content to **slide diagonally** across the viewport.
   - Smooth scrolling also triggers multi-frame layout/scroll events while `workAppViewIn` is animating, creating jitter on large tables and cards.
   - Direct assignment (`scrollContainer.scrollTop = targetTop`) or `scrollTo({ top: targetTop, behavior: "instant" })` snaps the scroll offset in a single frame while the incoming view is still near `opacity: 0`, so the view fades in already positioned at its exact reading spot.

### `ScrollAreaContent` & `scrollFade` Behavior During Switches

[`scrollFade`](../../modules/scroll-fade/scroll-fade.attach.css) uses native CSS Scroll-Driven Animations (`animation-timeline: scroll(self block)`) to compute `--cs-scroll-fade-top` and `--cs-scroll-fade-bottom` directly from the scroll container's `scrollTop` and `scrollHeight` on the compositor.

- **Why `grid-area: 1 / 1` protects `scrollFade`:** Because outgoing and incoming views overlap in the same grid cell rather than stacking vertically, `scrollHeight` never temporarily balloons to `AppHeight + DocsHeight` (which would falsely trigger a bottom fade even on short views).
- **Short-to-Tall & Tall-to-Short transitions:**
  - When leaving a tall scrolled `App` view (`scrollTop = 640`) for a short `Docs` view (`scrollHeight <= clientHeight`): restoring `scrollTop = 0` immediately upon `Docs` mount deactivates the scroll timeline cleanly, so `--cs-scroll-fade-top` and `--cs-scroll-fade-bottom` reset to `0px` without a lingering dark/transparent edge mask.
  - Note on `scrollHeight` clamping: while the tall outgoing view is still in the `1 / 1` grid cell for `100ms`–`110ms`, `scrollHeight` remains at `max(outgoing, incoming)`. Setting `scrollTop = savedTop` (e.g., `0` for Docs) works cleanly because `0` is always valid; when restoring a *large* `savedTop` onto a tall incoming view while leaving a short outgoing view, restoring after `tick()` (once the incoming view is mounted in the grid) ensures `scrollHeight` is already tall enough and the browser will not clamp `savedTop` down to `0`.
- **Rapid switching:** Because `scrollFade` has no JS timers or CSS `transition` lag—it is purely scroll-timeline-driven—rapidly toggling views never leaves `scrollFade` stuck in a stale state.

---

## 5. Reduced Motion & Rapid Toggling

### `prefers-reduced-motion: reduce` (`0ms` Fallback)

[`motion.css`](../../css/foundation/motion.css) globally sets `transition-duration: 0.01ms !important` and `animation-duration: 0.01ms !important` for CSS animations, **but Svelte JS transition functions (`workAppViewIn` / `workAppViewOut`) calculate durations in JavaScript** (or drive WAAPI keyframes with explicit JS options).

Therefore, `workAppViewIn` and `workAppViewOut` **MUST** check `window.matchMedia("(prefers-reduced-motion: reduce)").matches`:

- When reduced motion is active, return `{ duration: 0, delay: 0 }` (and omit `css` transform keyframes).
- View switching becomes an instantaneous `0ms` swap, while per-view `scrollTop` restoration still executes cleanly.

### Rapid Clicks & Clean Cancellation / Reversal

If a user clicks `WorkAppHelpButton` (`App → Docs → App`) or clicks across three tabs within `80ms`:

1. **Out-before-In never deadlocks:** Svelte's `in:` / `out:` transitions on keyed `{#key activeView}` blocks automatically abort/reverse or replace an in-flight transition when the key flips back.
2. **No orphaned DOM ghosts:** Because `WorkAppViewStage` places children in `grid-area: 1 / 1`, even if two outgoing views and one incoming view briefly coexist during rapid triple-clicking, layout height and header position (`WorkAppHeader` above `WorkAppMain`) remain rock-solid.
3. **Out-flight `inert` guard:** Keeping `inert` on any departing node guarantees that rapid double-clicks on controls inside the outgoing view cannot fire duplicate actions mid-exit.
4. **Scroll snapshot guard:** Only snapshot `scrollTop` for the *currently active* view key before switching away—never overwrite a view's saved `scrollTop` from an already-departing (`inert`) node.
