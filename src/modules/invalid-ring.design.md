# Invalid State Design Plan — `Checkbox` & `TextInput`

## 1. Core Principle: Full-Strength `2px` Negative Ring, Neutral Inactive Surface

Across both `Checkbox` and `TextInput`, `invalid` (`aria-invalid="true"` / `data-invalid`) **must not** tint inactive backgrounds with `--cs-color-negative-soft`, and **must not** use a weak, semi-transparent `1px` resting ring that only strengthens on focus.

Instead:
- **Always full-strength `2px` ring:** Inactive/unfocused invalid controls immediately display the full, crisp **`inset 0 0 0 2px var(--cs-color-negative-solid)`** ring — identical to `TextInput`'s focused invalid state.
- **No `negative-soft` fill:** Both `soft` and `elevated` variants retain their normal neutral backgrounds (`--cs-color-base-soft` / `--cs-color-elevated` and their hover states), eliminating the muddy dark-red cast in Dark Mode.
- **Checked / Solid states unchanged:** When a `Checkbox` is `:checked` or `:indeterminate` while `invalid`, it keeps its full `--cs-color-negative-solid` background + `--cs-shadow-solid` top-lit highlight.

---

## 2. `TextInput` Changes

In [TextInput.svelte](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/text-input/TextInput.svelte):
- **Remove** the `[data-variant="soft"]` `--cs-color-negative-soft` / `--cs-color-negative-soft-hover` background overrides inside `&[data-invalid]`.
- **Replace** the resting `1px` translucent ring on `&[data-invalid]` with the full `2px` solid negative ring unconditionally (resting, hover, and `:focus-within`):
  - `--cs-text-input-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);`
  - `--cs-text-input-ring-shadow-hover: inset 0 0 0 2px var(--cs-color-negative-solid);`
- **Keep:**
  - `--cs-text-input-icon-fg: var(--cs-color-negative-soft-fg);`
  - `--cs-text-input-caret: var(--cs-color-negative-solid);`
  - Entered text stays `--cs-color-text-strong`.
  - `[data-disabled]` continues to clear the ring (`inset 0 0 0 0px transparent`) and apply disabled surface tokens.

---

## 3. `Checkbox` Changes

In [Checkbox.svelte](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/checkbox/Checkbox.svelte):
- **Keep checked/indeterminate invalid as-is:**
  - `--cs-checkbox-bg-checked: var(--cs-color-negative-solid);`
  - `--cs-checkbox-bg-checked-hover: var(--cs-color-negative-solid-hover);`
  - `:is(:checked, :indeterminate)` retains `--cs-shadow-solid`.
- **Update `&[aria-invalid="true"]:not(:checked, :indeterminate)`:**
  - **Remove** `--cs-checkbox-bg: var(--cs-color-negative-soft)` and `--cs-checkbox-bg-hover: var(--cs-color-negative-soft-hover)` so `soft` and `elevated` keep their neutral backgrounds.
  - **Apply full `2px` negative inset ring:**
    - `soft`:
      - `--cs-checkbox-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);`
      - `--cs-checkbox-shadow-hover: inset 0 0 0 2px var(--cs-color-negative-solid);`
    - `elevated` (compose with elevated shadow so elevation is not lost):
      - `--cs-checkbox-shadow: var(--cs-shadow-elevated), inset 0 0 0 2px var(--cs-color-negative-solid);`
      - `--cs-checkbox-shadow-hover: var(--cs-shadow-elevated-hover), inset 0 0 0 2px var(--cs-color-negative-solid);`
- **Keep `[disabled]` override:** Disabled unchecked invalid checkboxes continue to clear `--cs-checkbox-shadow: none` (or `0 0 0 1px var(--cs-color-disabled-border)` for `elevated`).
