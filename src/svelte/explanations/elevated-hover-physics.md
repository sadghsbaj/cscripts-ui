# Elevated Surface Hover Physics (Light vs. Dark Mode)

This architectural guide explains why `elevated` surfaces use different physical feedback mechanisms in Light and Dark mode.

---

## 1. The `elevated` Role

The `elevated` variant provides a neutral floating surface intended for overlays, controls, cards, and triggers placed above content:

- **No Chromatic Colors:** Unlike chromatic variants (`primary`, `secondary`, `ghost`, or `soft` on toggle controls), `elevated` controls provide a fixed neutral floating surface and accept no `color` or `danger` props.
- **Surface Elevation:** Uses `--cs-color-elevated` as its base background, paired with `--cs-shadow-elevated` (soft drop shadow in Light Mode, top-lit inset hairline in Dark Mode).

---

## 2. Hover Physics by Color Scheme

Due to physical differences in how human vision perceives contrast on light vs. dark canvases, hover feedback is split:

### A. Light Mode: Pure Shadow Lift

- In Light Mode, the app canvas (`canvas`) is light (`base-100`), while `elevated` is pure white (`#ffffff`).
- White cannot brighten further. Darkening the white surface on hover would reduce contrast against the canvas, muddy the colors, and flatten the visual depth hierarchy.
- **Solution:** The background color stays pure white on hover; interaction feedback relies entirely on **shadow lift** (`--cs-shadow-elevated` -> `--cs-shadow-elevated-hover`, stepping up from `shadow-sm` to `shadow-md`).

### B. Dark Mode: Surface Luminance Step

- In Dark Mode, drop shadows are physically imperceptible against dark canvases (`base-950` / `base-900`).
- Relying on drop shadow changes alone would make hover feedback nearly invisible and destroy the top-lit inset edge.
- **Solution:** `--cs-shadow-elevated-hover` maintains the exact top-lit inset hairline in Dark Mode (`var(--cs-shadow-elevated)`). Hover feedback steps up the surface luminance via `--cs-color-elevated-hover` (`base-900` -> `base-800`), providing immediate and tactile edge definition.
