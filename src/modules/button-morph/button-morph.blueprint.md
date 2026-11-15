# ButtonMorph (Hover Surface Continuity) — Blueprint

## 1. Overview & Scope
- **Kind:** `hybrid` (`ButtonMorph` composite component + `ButtonMorphManager` reactive state)
- **Purpose:** Fix surface color/shadow/corner snapping at both the start and end of a morph transition when pointer hover state changes before, during, or after the `160ms` morph window—in **both** directions (`hover → rest` and `rest → hover`).
- **Boundary:** Internal state and shell CSS refinement only (`button-morph-state.internal.svelte.ts` and `ButtonMorph.svelte`). Public props, slot API, sizing (`width`/`height` spring), and directional content animations remain unchanged.

---

## 2. Public API & Internal State Contract
- **Public API:** Unchanged (`ButtonMorphProps`, `ButtonMorphItemProps`).
- **Internal Manager (`ButtonMorphManager`):**
  - `surfaceFrom`: Captured with the current hover state (`readButtonSurface(fromNode, isHovered)`) so clicking a hovered button starts from its actual hovered surface rather than its resting surface.
  - `surfaceToRest` & `surfaceToHover`: Both target surfaces are snapshotted once at transition start (`readButtonSurface(toNode, false)` and `readButtonSurface(toNode, true)`).
  - `surfaceTo`: Reactive getter/derived value returning `this.isPointerHovered ? this.#surfaceToHover : this.#surfaceToRest`, so `--cs-button-morph-to-bg` and `--cs-button-morph-to-shadow` stay live throughout the transition window.
  - Sync `this.isPointerHovered = isHovered` at transition start when `:hover` is already active on `#rootEl` (covers cases where the pointer was already over the element before `pointerenter` fired).

---

## 3. DOM, Semantics & Accessibility
- **DOM & Selectors:** Unchanged (`.cs-button-morph`, `[data-transitioning]`, `[data-morph-hover]`, `--cs-button-morph-from-*`, `--cs-button-morph-to-*`).
- **Keyboard & Focus:** Keyboard-triggered morphs (`Enter`/`Space` without pointer hover) keep `isPointerHovered = false`, resolving both `surfaceFrom` and `surfaceTo` to resting surfaces—unless the pointer moves onto the button mid-transition, in which case `surfaceTo` switches live to `surfaceToHover`.
- **Disabled Targets:** `readButtonSurface(toNode, true)` already skips hover probing on `:disabled`, `[aria-disabled="true"]`, and `[data-disabled]`, so `surfaceToHover` naturally matches `surfaceToRest`.

---

## 4. Visual & Motion Contract
- **Start Continuity:** Leaving a hovered outgoing button morphs smoothly *from* its hovered color/shadow (no frame-0 flash to rest).
- **End Continuity (Both Directions):**
  - *Hover → Leave mid-morph:* `pointerleave` flips `isPointerHovered` to `false` → `--cs-button-morph-to-bg` / `--cs-button-morph-to-shadow` update immediately to `surfaceToRest` → when `data-transitioning` ends at `160ms`, the shell and underlying button match seamlessly.
  - *Rest → Enter mid-morph:* `pointerenter` flips `isPointerHovered` to `true` → `surfaceTo` updates immediately to `surfaceToHover` → seamless handoff to the hovered incoming button at `160ms`.
- **CSS Layer (`ButtonMorph.svelte`):** Existing `@keyframes cs-button-morph-surface` (`160ms var(--cs-ease-quad-in-out)`) remains intact and consumes the now-reactive `--cs-button-morph-to-*` custom properties.

---

## 5. Edge Cases & Constraints
- **Reset / Teardown:** Clear `#surfaceToRest` and `#surfaceToHover` on `destroy()` (and when `reset()` clears transition state).
- **Mid-flight keyframe re-targeting:** Because `@keyframes` interpolates toward `var(--cs-button-morph-to-bg)` live, toggling hover mid-flight shifts the remaining interpolation target within the `160ms` window without needing fragile `getComputedStyle` frame-flushing or extra DOM layers.
- **Non-goals:** No changes to `guardDelay`, `resetTimeout`, `ResizeObserver` sizing, or `ButtonMorphItem` slot visibility rules.
