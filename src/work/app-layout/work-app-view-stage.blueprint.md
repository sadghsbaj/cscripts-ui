# `WorkAppViewStage` & View Transitions Blueprint

## 1. Overview & Scope

- **Module:** `src/work/app-layout/` (publicly re-exported via `src/work/index.ts` → `cs/svelte/work`)
- **Kind:** `hybrid` (layout stage component `WorkAppViewStage.svelte` + Svelte transition utilities `workAppViewIn` / `workAppViewOut`)
- **Purpose:** Provide overlap-safe view transitions and automatic RAM-only scroll-position restoration inside `WorkAppMain` (or any scrollable ancestor such as `ScrollAreaContent`).
- **Boundaries:**
  - `WorkAppViewStage` owns the CSS Grid overlap container and per-view `scrollTop` memory.
  - `workAppViewIn` and `workAppViewOut` own compositor-friendly enter/exit `TransitionConfig` animations and exit pointer-locking.
  - Does **not** persist scroll positions to `localStorage`/`sessionStorage`, manage URL routing, or own tab/navigation state.

---

## 2. Public API

### 2.1 Exports (`src/work/app-layout/index.ts`)

- `WorkAppViewStage` (`WorkAppViewStage.svelte`)
- `workAppViewIn` (`work-app-view-transition.ts`)
- `workAppViewOut` (`work-app-view-transition.ts`)
- Types:
  - `WorkAppViewStageProps`
  - `WorkAppViewKey` (`string | number`)
  - `WorkAppViewTransitionAxis` (`"x" | "y"`)
  - `WorkAppViewTransitionDirection` (`1 | -1`)
  - `WorkAppViewTransitionOptions`
- Constants:
  - `WORK_APP_VIEW_TRANSITION_AXES = ["x", "y"] as const`

### 2.2 `WorkAppViewStageProps`

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable(null)`) | `null` | Bound reference to the root `.cs-work-app-view-stage` element. |
| `activeKey` | `WorkAppViewKey` | — (required) | Identifier of the currently active view. Changing `activeKey` triggers saving the outgoing view's `scrollTop` and restoring the incoming view's `scrollTop`. |
| `restoreScroll` | `boolean` | `true` | Enables automatic in-memory `scrollTop` save/restore on `activeKey` changes. Set to `false` when only grid overlap is needed. |
| `scrollContainer` | `HTMLElement \| null` | `undefined` | Optional explicit scrolling element override. When omitted, auto-resolves the nearest `.cs-scroll-area-content` ancestor (falling back to the nearest scrollable ancestor). |
| `children` | `Snippet` | — | View content (`{#if ...}` / `{:else}` or `{#key ...}` blocks). |

### 2.3 `workAppViewIn` & `workAppViewOut`

```ts
export interface WorkAppViewTransitionOptions {
    axis?: WorkAppViewTransitionAxis;          // default: "y"
    direction?: WorkAppViewTransitionDirection; // default: 1
    distance?: number;                          // default: 12 (px)
    duration?: number;                          // default: 240 (in) / 160 (out) ms
    delay?: number;                             // default: 0 ms
    easing?: (t: number) => number;             // default: cubicOut (in) / quadIn (out)
}

export function workAppViewIn(
    node: HTMLElement,
    options?: WorkAppViewTransitionOptions,
): TransitionConfig;

export function workAppViewOut(
    node: HTMLElement,
    options?: WorkAppViewTransitionOptions,
): TransitionConfig;
```

### 2.4 CSS Variables

No new `--cs-work-app-view-stage-*` theme tokens are required; layout uses standard grid primitives and transition parameters are passed directly via `WorkAppViewTransitionOptions`.

### 2.5 Usage Patterns (No Boilerplate)

- **2-View Toggle (`{#if showDocs}`):**
  ```svelte
  <WorkAppViewStage activeKey={showDocs ? "docs" : "main"}>
      {#if showDocs}
          <div in:workAppViewIn={{ axis: "y", direction: 1 }} out:workAppViewOut={{ axis: "y", direction: -1 }}>
              <WorkAppDocs ... />
          </div>
      {:else}
          <div in:workAppViewIn={{ axis: "y", direction: -1 }} out:workAppViewOut={{ axis: "y", direction: 1 }}>
              <!-- Main app view -->
          </div>
      {/if}
  </WorkAppViewStage>
  ```

- **Multi-View Tabs (`{#key activeTab}`):**
  ```svelte
  <WorkAppViewStage activeKey={activeTab}>
      {#key activeTab}
          <div in:workAppViewIn={{ axis: "x", direction: tabDir }} out:workAppViewOut={{ axis: "x", direction: -tabDir }}>
              <!-- Active tab view -->
          </div>
      {/key}
  </WorkAppViewStage>
  ```

---

## 3. DOM, Semantics & Accessibility

### 3.1 Root Element & Grid Overlap

- `WorkAppViewStage` renders a single `<div {...rest} bind:this={ref} class={["cs-work-app-view-stage", className]}>` with `data-active-key={String(activeKey)}`.
- **Grid Overlap Layout (`@layer components.primitive`):**
  - `.cs-work-app-view-stage`: `display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; min-width: 0; width: 100%;`
  - `.cs-work-app-view-stage > :global(*)`: `grid-area: 1 / 1; align-self: start; min-width: 0; width: 100%;`
  - Because outgoing and incoming views share `grid-area: 1 / 1`, container height smoothly equals `max(outgoing, incoming)` during the overlap without vertical stacking, height collapse, or layout jumping.

### 3.2 In-Memory Scroll Restoration Lifecycle

- **RAM-Only Store:** A local `Map<WorkAppViewKey, number>` inside `WorkAppViewStage` (not persisted across page reloads).
- **Scrolling Ancestor Resolution:**
  - If `scrollContainer` is provided, use it directly.
  - Otherwise, resolve from `ref`: first `ref.closest(".cs-scroll-area-content")`, falling back to walking `parentElement` for `overflow-y: auto | scroll` (using `getComputedStyle`), and finally `document.scrollingElement`.
  - Never use `document.querySelector` / `document.getElementById`.
- **Save Phase (`$effect.pre`):**
  - Track `previousKey` (initialized to initial `activeKey` without restoring on first mount).
  - When `activeKey !== previousKey`:
    - Before Svelte updates the DOM, read `scroller.scrollTop` and store `scrollPositions.set(previousKey, scroller.scrollTop)`.
    - Update `previousKey = activeKey`.
- **Restore Phase (`$effect`):**
  - Runs after the incoming view is mounted in the DOM (so the grid height already reflects `max(outgoing, incoming)` and will not clamp a taller saved offset).
  - Read `const targetTop = scrollPositions.get(activeKey) ?? 0`.
  - Apply **instantly** without smooth scrolling: `scroller.scrollTo({ top: targetTop, behavior: "instant" })`.

### 3.3 Pointer Safety & Reduced Motion

- **Exit Pointer Lock:**
  - `workAppViewOut` sets `node.style.pointerEvents = "none"` and `node.setAttribute("data-exiting", "")` on start so users cannot click controls inside a fading-out view.
  - `workAppViewIn` clears `node.style.removeProperty("pointer-events")` and removes `data-exiting` on start so rapid view toggles that reverse/re-enter a node never leave it unclickable.
- **Reduced Motion:**
  - Both `workAppViewIn` and `workAppViewOut` check `typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches`.
  - When active, both return `{ duration: 0, delay: 0 }`, making view swaps instantaneous while still preserving scroll restoration.

---

## 4. Visual & Motion Contract

- **Surface & Elevation:** `WorkAppViewStage` is completely transparent (no background, border, shadow, or padding) so it drops cleanly inside `WorkAppMain` without altering spacing or visual hierarchy.
- **Compositor-Only `TransitionConfig`:**
  - Uses `css: (t, u) => ...` exclusively (never `tick`) so animations run on the browser compositor thread.
  - Animates only `opacity` and `transform: translate3d(...)`:
    - `workAppViewIn`: `t` goes `0 → 1`, `u` goes `1 → 0`.
      - `opacity: ${t};`
      - `transform: translate3d(${x * u}px, ${y * u}px, 0);`
    - `workAppViewOut`: `t` goes `1 → 0`, `u` goes `0 → 1`.
      - `opacity: ${t};`
      - `transform: translate3d(${x * u}px, ${y * u}px, 0);`
    - Where `(x, y)` is `(direction * distance, 0)` for `axis === "x"` and `(0, direction * distance)` for `axis === "y"`.
- **Motion Feel:**
  - Enter (`240ms`, `cubicOut`) settles crisply into place; exit (`160ms`, `quadIn`) clears slightly faster than enter so the overlapping cross-fade feels clean and responsive rather than muddy.
  - Default `distance: 12` (px) keeps spatial movement subtle across full-width `WorkAppMain` content.

---

## 5. Edge Cases & Constraints

- **Single Direct Child per View:** Because `.cs-work-app-view-stage > :global(*)` assigns every direct child to `grid-area: 1 / 1`, multi-block views (e.g. multiple cards) must be wrapped in a single element (`<div>` or component root) when placed inside `WorkAppViewStage`. That wrapper is also the natural target for `in:` / `out:` (since Svelte transitions attach to DOM elements, not components).
- **Scroll Clamping on Shorter Views:** If a tall view (`scrollTop = 900`) transitions to a short view (`scrollTop = 0`), restoring `0` immediately in `$effect` scrolls to top cleanly while the outgoing view fades out. Conversely, transitioning from a short view (`0`) to a previously scrolled tall view (`900`) works without clamping because the incoming view is already mounted in the grid when `$effect` runs.
- **Initial Mount:** On first mount of `WorkAppViewStage`, `previousKey` matches `activeKey`, so no artificial `scrollTo(0)` is triggered.
- **Explicit Non-Goals:**
  - No `WorkAppView` wrapper component (keeps `{#if}` / `{#key}` composition direct and avoids redundant DOM nesting).
  - No `sessionStorage` / `localStorage` persistence.
  - No automatic direction inference inside `WorkAppViewStage` (direction is explicitly chosen by the caller via `workAppViewIn` / `workAppViewOut` options).
