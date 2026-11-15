# Checkbox — Internal Engineering Notes

> **Do not rename to `*.internal.docs.md`:** `playground/PreviewView.svelte` globs `../src/modules/**/*.docs.md` by folder, so a second `.docs.md` file would collide with `checkbox.docs.md`.

## Morph Architecture (`rAF` 3-Point Path)

- **Why `requestAnimationFrame` instead of CSS `d: path(...)`:** Safari/iOS does not support CSS transitions on the SVG `d` attribute. `Checkbox.svelte` interpolates a shared 3-point polyline (`DASH_COORDS = [5, 12, 12, 12, 19, 12]` ↔ `CHECK_COORDS = [4, 12, 9, 17, 20, 6]`) over `160ms` with `quartOut` easing via `rAF`, setting `d` on `.cs-checkbox-morph` before activating `data-morph`.
- **Why `data-morph` stays active after morph completion:** Once an `indeterminate <-> checked` morph finishes, `data-morph` remains set until the checkbox transitions to `unchecked`. Swapping back from `.cs-checkbox-morph` to `.cs-checkbox-check` / `.cs-checkbox-dash` at `t = 1` risks a 1-frame opacity/paint flash; keeping `.cs-checkbox-morph` visible avoids any swap artifact while preserving the exact final geometry.
- **Reduced motion:** When `prefers-reduced-motion: reduce` matches, `morphActive` is cleared and coordinates snap immediately without scheduling `rAF`.

## Tri-State Event Ordering (`handleChange`)

- **Why a single `onchange={handleChange}` instead of `<input bind:checked bind:indeterminate {...rest} />`:** In Svelte, `bind:checked` mounts its internal `change` listener before `{...rest}`'s `onchange` listener. In Blink, a microtask checkpoint runs between separate `change` listeners, which flushes Svelte's reactive graph with the browser's intermediate `checked`/`unchecked` state before the consumer's `onchange` handler runs—triggering false state transitions (e.g., morphing from `checked` when cycling `unchecked -> indeterminate`).
- **How `handleChange` prevents it:** `Checkbox.svelte` binds `checked={Boolean(checked)}` and `indeterminate={Boolean(indeterminate)}` one-way and registers a single `onchange={handleChange}`. `handleChange` invokes `onchange?.(event)` **first** so tri-state consumers can mutate `event.currentTarget.checked` and `event.currentTarget.indeterminate` synchronously, and only then syncs `checked` and `indeterminate`.
- **Why `onclick` + `event.preventDefault()` + `queueMicrotask()` fails in Chromium:** Blink executes microtasks *before* C++ post-activation rollback reverts `input.checked` / `input.indeterminate` on a prevented click, so reading or overriding state in `queueMicrotask()` observes the pre-rollback DOM state and gets overwritten by Blink's rollback.

## Regression Safety Net

- **`Checkbox.svelte.test.ts` (Vitest DOM):** Verifies `data-morph` presence/absence across binary and tri-state cycles, `rAF` interpolation, reduced-motion snapping, and `handleChange` ordering.
- **`Checkbox.browser.spec.ts` (Playwright Chromium):** Verifies real Blink click/change event ordering and computed CSS opacity/path attributes across `Cycle A` (`unchecked -> indeterminate -> checked -> unchecked`) and `Cycle B` (`unchecked -> checked -> indeterminate -> unchecked`).
