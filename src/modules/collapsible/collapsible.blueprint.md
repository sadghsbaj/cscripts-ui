# Collapsible Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (lean structural primitive `<Collapsible>`)
- **Purpose:** An in-flow disclosure container that smoothly expands and collapses content along the `block` (vertical) or `inline` (horizontal) axis, supporting both full collapse (`0px`) and partial collapse (`collapsedSize`, e.g., code-block previews). Serves both as a standalone primitive and as the shared disclosure foundation for future `accordion` and non-virtualized `tree` modules.
- **Comparison with Sibling Modules:**
  - **`Popover` / `Overlay`:** Top-layer floating or modal surfaces (`position: fixed`, `:popover-open`).
  - **`Collapsible`:** In-flow structural container that participates in document layout and smoothly pushes or pulls adjacent siblings.
- **Architectural Decision — Lean Panel Primitive vs. Compound Root:**
  - **Selected:** `<Collapsible>` is the collapsible panel element itself (`.cs-collapsible`), controlled via `open = $bindable(false)`. Consumers pair it with any trigger (`<Button>`, `<Switch>`, `AccordionTrigger`, `TreeItem`, or a native `<button>`) using standard `aria-expanded` and `aria-controls`.
  - **Rationale:** Future consumers (`Accordion`, `Tree`, code-block previews) already own their own trigger elements and ARIA roles (`role="treeitem"`, heading-wrapped `<button>`, footer "Show more" `<Button>`). Making `<Collapsible>` a lean wrapper avoids redundant renderless context roots and lets composite modules compose it directly with zero extra DOM or context overhead.
- **Boundaries:**
  - Owns expand/collapse layout mechanics, `inert` + post-exit `visibility: hidden` lifecycle, initial-mount no-animation guard, lazy/unmounted-when-closed lifecycle (`keepMounted`), and `--cs-collapsible-*` timing variables.
  - **Does not** ship a trigger, chevron, background, border, shadow, or padding. `variant` and `size` are intentionally omitted because `Collapsible` is a borderless, colorless structural primitive whose dimensions come from its slotted `children` (or `collapsedSize`).
  - **Out of scope:** Virtualized lists/trees (see Section 5).

---

## 2. Public API

### Exports (`src/modules/collapsible/index.ts`)

- `Collapsible` — Structural disclosure component.
- `COLLAPSIBLE_AXES = ["block", "inline"] as const` -> `CollapsibleAxis`
- `CollapsibleProps`

### Props (`CollapsibleProps extends HTMLAttributes<HTMLDivElement>`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to the root `.cs-collapsible` element. |
| `open` | `boolean` | `false` | `$bindable()`, controls expanded/collapsed state. |
| `axis` | `CollapsibleAxis` | `"block"` | Collapse/expand direction (`"block"` = vertical, `"inline"` = horizontal). |
| `collapsedSize` | `string \| undefined` | `undefined` | Optional CSS length (e.g. `"160px"`, `"4lh"`) for partial collapse. When set, content collapses to this size instead of `0px`. |
| `animate` | `boolean` | `true` | Enables/disables expand/collapse transitions (always bypassed under `prefers-reduced-motion: reduce` and on initial mount). |
| `keepMounted` | `boolean` | `true` | When `false`, lazily mounts `children` on first open and unmounts after the close transition settles. Ignored (forced `true`) when `collapsedSize` is set, since preview content remains visible. |
| `disabled` | `boolean` | `false` | Exposes `data-disabled` on the root for consumer styling hooks (consumers remain responsible for disabling their external trigger). |
| `id` | `string \| undefined` | `$props.id()` | Root element ID for `aria-controls` wiring. |
| `class` | `ClassValue` | `undefined` | Merged via Svelte 5 array syntax `["cs-collapsible", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted content. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to the root `.cs-collapsible` element. |

*(Note: `onOpenChange` is omitted because `Collapsible` has no internal trigger that mutates `open`; state changes originate from the consumer.)*

### CSS Custom Properties (`--cs-collapsible-*`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `--cs-collapsible-dur` | `var(--cs-dur-240)` | Enter (expand) transition duration. |
| `--cs-collapsible-dur-exit` | `var(--cs-dur-180)` | Exit (collapse) transition duration. |
| `--cs-collapsible-ease` | `var(--cs-ease-cubic-out)` | Expand/collapse easing curve. |
| `--cs-collapsible-collapsed-size` | *(inline style from `collapsedSize`)* | Target size when `open={false}` in partial-collapse mode. |

---

## 3. DOM, Semantics & Accessibility

### DOM Structure

Two-layer wrapper using direct-child combinators (`.cs-collapsible > .cs-collapsible-content`) so nested collapsibles never interfere with each other:

- **Root:** `<div class="cs-collapsible">`
  - Attributes: `id`, `data-open={open ? "" : undefined}`, `data-axis={axis}`, `data-state={state}` (`"open" | "closing" | "closed"`), `data-animate={animate && ready ? "" : undefined}`, `data-disabled={disabled ? "" : undefined}`, `data-collapsed-size={collapsedSize ? "" : undefined}`.
- **Inner Clipping Track:** `<div class="cs-collapsible-content">`
  - Houses `{@render children?.()}` (conditionally rendered when `keepMounted || state !== "closed"`).

### CSS Mechanics

1. **Full Collapse Mode (`collapsedSize` omitted) — Two-Layer CSS Grid (`0fr` -> `1fr`):**
   - `axis="block"`: `.cs-collapsible` sets `display: grid; grid-template-rows: 0fr; grid-template-columns: minmax(0, 1fr);`, transitioning to `grid-template-rows: 1fr` on `[data-open]`.
   - `axis="inline"`: `.cs-collapsible` sets `display: grid; grid-template-columns: 0fr; grid-template-rows: minmax(0, 1fr);`, transitioning to `grid-template-columns: 1fr` on `[data-open]`.
   - `.cs-collapsible-content` sets `overflow: clip;` (preferred over `overflow: hidden` so it does not create an accidental scroll container or break `position: sticky` descendants) and `min-block-size: 0; min-inline-size: 0;` (overriding CSS Grid's `auto` minimum size so the track can shrink to `0px`).
   - Lives in `@layer components.primitive`.

2. **Partial Collapse Mode (`collapsedSize` provided):**
   - CSS Grid cannot interpolate between a fixed `<length>` and `1fr`. Instead, `.cs-collapsible[data-collapsed-size]` uses modern Chromium's `interpolate-size: allow-keywords` with `overflow: clip` and transitions `block-size` (or `inline-size` for `axis="inline"`) between `var(--cs-collapsible-collapsed-size)` and `auto`.
   - Avoids JS `ResizeObserver` / `scrollHeight` measurement and stale inline pixel heights; gracefully degrades to an instant snap in browsers without `interpolate-size` support.

### Accessibility & Lifecycle

- **`inert` when closed (full collapse only):**
  - `.cs-collapsible-content` receives `inert` whenever `!open && !collapsedSize`. This prevents keyboard `Tab` focus, screen-reader traversal, and pointer interaction inside collapsed content—including immediately at the start of a close transition.
  - In `collapsedSize` mode, `inert` is **not** applied because the previewed portion remains intentionally visible and selectable.
- **Post-exit `visibility: hidden` (full collapse only):**
  - During `"closing"`, `visibility` remains `visible` so the collapse animation is seen.
  - Once the exit transition finishes (`state === "closed"`), `.cs-collapsible-content` applies `visibility: hidden` (rather than `content-visibility: hidden`, which can interfere with `0fr` transition restarts) to ensure zero paint/hit-test/a11y leakage.
- **No initial open animation on mount:**
  - When mounted with `open={true}`, `Collapsible` starts directly in `"open"` with transitions suppressed until after the first animation frame (`ready` flag), preventing unwanted expand motion on page load or SSR hydration.
- **Lazy mount frame-ordering (`keepMounted={false}`):**
  - When opening from `"closed"` with `keepMounted={false}`, `children` mount first while the grid track is still `0fr`, and `data-open` is applied on the next `requestAnimationFrame` so the browser has a `0fr` start frame to animate from.
- **Trigger Guidance:**
  - Consumers wire their external trigger with `aria-expanded={open}` and `aria-controls={id}`.
  - `Collapsible` does not force `role="region"` (avoiding landmark noise); consumers may pass `role="region"` and `aria-labelledby` via `{...rest}` when a named landmark is desired.

---

## 4. Visual & Motion Contract

- **Surface & Elevation:** None. `Collapsible` is strictly unstyled structurally—no background, border, `box-shadow`, squircle, or internal padding.
- **Motion Feel:**
  - Uses `motion.css` semantic tokens (`--cs-dur-240` enter, `--cs-dur-180` exit, `--cs-ease-cubic-out`) so expansion feels responsive and collapse feels slightly brisker without overshoot.
  - `prefers-reduced-motion: reduce` is inherited globally from `src/css/foundation/motion.css` (never duplicated in module CSS).
  - JS exit settlement (`"closing"` -> `"closed"`) checks `animate` and `matchMedia("(prefers-reduced-motion: reduce)")` so `visibility: hidden` and `keepMounted={false}` unmounting settle synchronously in `0ms` when motion is disabled (and in headless/JSDOM tests where `transitionend` may not fire).

---

## 5. Edge Cases, Pitfalls & Reusability

### Edge Cases & Pitfalls

1. **Padding/Margin on Wrapper vs. Inner Child:**
   - Never apply `padding` to `.cs-collapsible` or `.cs-collapsible-content`—padding on the `0fr` track remains visible as an empty strip when closed. Always place padding/margins on a child *inside* `Collapsible`.
2. **Parent Flex/Grid `gap` Phantom Spacing:**
   - A `0px`-tall `.cs-collapsible` inside a flex/grid parent with `gap` still incurs a `gap` between itself and adjacent siblings. Consumers (including `Accordion`) should wrap header + `Collapsible` cleanly or place spacing via `margin-block-start` on the inner content child rather than parent `gap`.
3. **Horizontal Collapse (`axis="inline"`) Text Wrapping:**
   - Shrinking `grid-template-columns` from `1fr` to `0fr` causes normal wrapping text to reflow into taller columns during the animation. Consumers animating horizontal text should apply `white-space: nowrap` or an explicit `inline-size` on the inner content element.
4. **Nested Collapsibles:**
   - `transitionend` handlers MUST verify `event.target === rootEl` (and match the transitioned property) so a nested `Collapsible` finishing its exit transition does not prematurely mark an ancestor `Collapsible` as `"closed"`.
5. **Dynamic Content Resizing While Open:**
   - `1fr` (and `block-size: auto` with `interpolate-size: allow-keywords`) adapts automatically to async content, images, or nested collapsibles without JS measurement.
6. **When NOT to Use `Collapsible`:**
   - **Virtualized lists/trees** (e.g., `virtual-scroll`, large `data-table`, or virtualized `tree` with 1,000+ rows): Virtualizers rely on flat item arrays and recycled DOM nodes; animating `0fr -> 1fr` on recycled rows causes scroll-anchor jitter and invalidates row-height caches. Use instant flat-list splicing instead.

### Reusability Strategy

All composite modules consume `{ Collapsible }` exclusively through `src/modules/collapsible/index.ts` (zero cross-module internal imports):

- **`Accordion`:** `AccordionContent` wraps `<Collapsible {id} {open} {animate} {keepMounted}>` with an inner `.cs-accordion-body` holding padding/spacing, while `AccordionTrigger` owns `<button aria-expanded aria-controls>`.
- **`Tree` (non-virtualized):** `TreeItem` (`role="treeitem"`, `aria-expanded`) wraps its nested `<ul role="group">` in `<Collapsible {open} keepMounted={false}>` to lazily mount deep subtrees only when expanded.
- **Code-Block Previews:** Wraps `<pre><code>` in `<Collapsible bind:open collapsedSize="160px">`, optionally pairing `fadeMask({ variant: "bottom", strength: "lg", enabled: () => !open })` with a `<Button>` toggle below.
