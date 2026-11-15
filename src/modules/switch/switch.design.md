# Switch Design Spec

## Role & Anatomy
- **Element:** Single native `<input type="checkbox" role="switch" class="cs-switch" />` (`appearance: none`, no wrapper elements).
- **Track:** Host `.cs-switch` element.
- **Thumb:** `.cs-switch::after` pseudo-element.
- **Hit Area:** No `<HitArea />` (void `<input>` cannot contain children; click targets are provided by the wrapping `<label>`, settings row, or card).
- **Cursor:** `default` (consistent with all non-link interactive controls).

---

## Proportions & Shape
- **Style:** Modern wide-pill thumb (iOS-26-inspired) inside a pill track (~`1.85 : 1` track ratio, ~`1.4 : 1` thumb ratio, thumb occupying ~55% of inner track width).
- **Radius & Squircle:** Both track and thumb use full pill rounding (`border-radius: calc(var(--cs-switch-height) / 2)` / `9999px`) paired with `corner-shape: var(--cs-squircle-soft)` (`superellipse(1.2)`) to match Button and Checkbox curvature.

---

## Size Scale (`xs`–`xl`)
Calibrated between Checkbox (`12–28px`) and Button (`28–44px`):

| `data-size` | Track (H × W) | Padding | Thumb (H × W) |
| :--- | :--- | :--- | :--- |
| `xs` | `14px × 26px` | `2px` | `10px × 14px` |
| `sm` | `18px × 34px` | `2px` | `14px × 20px` |
| `md` | `22px × 42px` | `2.5px` | `17px × 24px` |
| `lg` | `26px × 48px` | `3px` | `20px × 28px` |
| `xl` | `30px × 56px` | `3px` | `24px × 34px` |

---

## Colors & Shadows
Single recessed `soft` track surface (`variant` / `data-variant` omitted; switches sit on `elevated` cards/rows or `canvas`, and an `elevated` white track would conflict with the `#fff` thumb in Light Mode). Also omits `invalid` (boolean validation errors belong on Checkbox):

- **Unchecked Track:** `--cs-color-base-soft` (`--cs-color-base-soft-hover` on hover).
- **Checked Track (`:checked`):** `--cs-color-accent-solid` (`--cs-color-accent-solid-hover` on hover) with `--cs-shadow-solid` (1px top-lit inset highlight + subtle drop shadow).
- **Thumb (`::after`):** Always pure white (`#fff`) in active states, **no** top-lit inset highlight, using a crisp drop shadow (`0 1px 3px rgb(0 0 0 / 0.18), 0 1px 1px rgb(0 0 0 / 0.08)`) for physical separation on both `soft` and `accent-solid` tracks.
- **Disabled State (`:disabled`):** Uses `--cs-color-disabled-*` tokens (`--cs-disabled-opacity: 1`), using `--cs-color-disabled-bg` when unchecked and `--cs-color-disabled-bg-strong` when checked, with a subtly dimmed thumb.

---

## Motion & Tactile Physics (Pure CSS)
1. **Press Anticipation (`:active:not(:disabled)`):**
   - Thumb stretches `+14%` (`* 1.14`) along the travel axis via `width` (preserving pill corner geometry without distortion, ~25–30% of remaining travel gap across `xs`–`xl`).
   - Anchored to the origin edge: expands rightward when unchecked (`left` anchored) and leftward when checked (`right` anchored).
   - **Timing Lockstep:** Both `translate` and `width` MUST share `var(--cs-dur-press)` (`140ms`) + `var(--cs-ease-press)` while pressed (via local `--cs-switch-thumb-dur` / `--cs-switch-thumb-ease` overrides) so the trailing edge stays mathematically pinned with zero wobble.
2. **Release / Toggle (`:checked` transition):**
   - `:active` clears, restoring `translate` to `var(--cs-dur-180)` with `var(--cs-ease-quart-out)` (crisp, zero-overshoot magnetic lock-in right after the `140ms` `+14%` anticipation settles) while `width` settles back to resting size in `var(--cs-dur-press)` (`140ms`).
   - Reduced motion: Handled globally by foundation CSS (`prefers-reduced-motion`).
