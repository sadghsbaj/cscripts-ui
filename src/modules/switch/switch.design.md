# `Switch` Design Specification — Motion Cleanup

<meta>
  <module>switch</module>
  <layer>components.primitive</layer>
  <status>proposed</status>
</meta>

## 1. Diagnosis: Why `:active` Press Anticipation Feels Jittery

In [Switch.svelte](./Switch.svelte), the thumb (`::after`) currently stretches to `width * 1.14` during `:active` under `@media (hover: hover) and (pointer: fine)` (and compensates `--cs-switch-thumb-x` when `:checked:active`).

On a normal desktop click (`pointerdown` → `pointerup` in `~60–90ms`):
1. `:active` starts expanding `width` using `--cs-dur-press` / `--cs-ease-press`.
2. Before the stretch settles, `pointerup` fires `change`, removing `:active` and switching `--cs-switch-thumb-dur` back to `var(--cs-dur-180)` (`--cs-ease-quart-out`).
3. The thumb simultaneously **shrinks back to 1.0×** and **slides across the track**, creating subtle visual jitter on routine clicks.

*(This same `:active` latch issue already required excluding touch devices via `@media (hover: hover) and (pointer: fine)`.)*

---

## 2. Decision: Remove Press Anticipation Completely

Remove the `:active` thumb-stretch anticipation so `Switch` behaves like `SegmentedControl`—calm at rest, with a single decisive `translate` slide on toggle (`pointerup` / `change` / `Space`).

### Benefits
- **Zero click jitter:** Fast clicks trigger one clean, uninterrupted `180ms` (`--cs-ease-quart-out`) slide.
- **Cross-input parity:** Mouse, touch, and keyboard (`Space`) share identical physics without media-query workarounds.
- **Simpler CSS:** Eliminates the `@media (hover: hover) and (pointer: fine)` `:active` override and removes `width` from the thumb's `transition` list.

---

## 3. Concrete CSS Adjustments in `Switch.svelte`

1. **Remove the `:active` anticipation block** (the `@media (hover: hover) and (pointer: fine)` rule containing `&:active:not(:disabled)` and `width: calc(var(--cs-switch-thumb-width) * 1.14)`).
2. **Remove `width` from `&::after` transitions** so only compositor/color properties transition on toggle:
   ```css
   transition:
       translate var(--cs-switch-thumb-dur) var(--cs-switch-thumb-ease),
       background-color var(--cs-dur-press) var(--cs-ease-press),
       box-shadow var(--cs-dur-press) var(--cs-ease-press),
       opacity var(--cs-dur-press) var(--cs-ease-press);
   ```
3. **Keep existing toggle motion tokens unchanged:**
   - `--cs-switch-thumb-dur: var(--cs-dur-180)`
   - `--cs-switch-thumb-ease: var(--cs-ease-quart-out)`
   - Track `background-color` and `box-shadow` transitions (`--cs-dur-press` / `--cs-ease-press`).
