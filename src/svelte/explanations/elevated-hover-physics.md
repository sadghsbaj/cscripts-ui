# Elevated Surface Hover Physics (Light vs. Dark Mode)

This architectural guide explains why `elevated` surfaces use different physical feedback mechanisms in Light and Dark mode.

---

## 1. The `elevated` Role

The `elevated` variant provides a neutral floating surface intended for overlays, controls, cards, and triggers placed above content:
- **No Chromatic Colors:** Unlike `solid`, `soft`, and `ghost`, `elevated` controls do not participate in semantic color matrices and require no `data-color` attribute.
- **Surface Elevation:** Uses `--cs-color-elevation-1` as its base background, paired with subtle borders and shadows.

---

## 2. Hover Physics by Color Scheme

Due to physical differences in how human vision perceives contrast on light vs. dark canvases, hover feedback is split:

### A. Light Mode: Pure Shadow Lift
- In Light Mode, the app canvas (`elevation-0`) is light (`base-100`), while `elevation-1` is pure white (`#ffffff`).
- White cannot brighten further. Darkening the white surface on hover would reduce contrast against the canvas, muddy the colors, and flatten the visual depth hierarchy.
- **Solution:** The background color stays pure white on hover; interaction feedback relies entirely on **shadow lift** (`shadow-sm` stepping up to `shadow-md`).

### B. Dark Mode: Surface Luminance Step
- In Dark Mode, drop shadows are physically imperceptible against dark canvases (`base-950` / `base-900`).
- Relying on shadow changes alone would make hover feedback nearly invisible.
- **Solution:** Hover steps up the surface luminance from `elevation-1` (`base-900`) to `elevation-2` (`base-800`) via `light-dark(var(--_bg), var(--cs-color-elevation-2))`, providing immediate and tactile edge definition.
