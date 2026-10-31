# `cs` CSS Architecture, Tokens & Components

All paths below are relative to `./node_modules/cs/src/agents/`.

## 1. Cascade Layers & Override Architecture

`../css/index.css` establishes a strict CSS `@layer` cascade so UnoCSS utilities can cleanly override foundation and component styles without specificity wars (`!important` is almost never needed):

- **Top-level layers:** `foundation`, `components` (defined in `../css/index.css`).
- **Foundation sub-layers:** `reset` and `base` (defined in `../css/foundation/index.css`).

## 2. Automated Foundation Behaviors (DO NOT RE-IMPLEMENT)

The following behaviors are globally active via `../css/foundation/`. NEVER write redundant CSS or UnoCSS utilities for them:

- **Reset (`reset.css`):** Comprehensive modern CSS reset is already applied in the `reset` layer (defaults body to `16px`, `font-400`, `1.5` line-height, and `--cs-color-text-main`).
- **Disabled States (`disabled.css`):** Automatically styles `:disabled`, `[aria-disabled="true"]`, and `[data-disabled]` with `opacity: 0.5`, `user-select: none`, and `pointer-events: none`.
    - **Rule:** NEVER add manual `disabled:opacity-50` or `disabled:pointer-events-none` classes. Just set the native `disabled`, `aria-disabled="true"`, or `data-disabled` attribute.
- **Focus Rings (`focus.css`) & Selection (`selection.css`):** Handled globally. NEVER write custom `:focus-visible` outlines.
- **Scrollbars (`scroll.css`):** Globally styled. To adjust scrollbar thickness on specific scrollable containers, apply one of the built-in size classes (or override `--cs-scrollbar-size`):
    - `.scrollbar-sm` (`8px`)
    - `.scrollbar-md` (`10px`)
    - `.scrollbar-lg` (`12px`)
- **Motion (`motion.css`):** Global motion/reduced-motion defaults.

## 3. Design Tokens (`--cs-*` Prefix)

All custom CSS variables provided by `cs` are strictly prefixed with `--cs-`. When writing raw CSS or arbitrary properties, always use these tokens instead of hardcoded values:

### Colors & Automatic `light-dark()` Resolution (`../css/foundation/colors.css`)

- **Primitive Palettes:** All standard Tailwind/Wind4 palettes (`red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`, `slate`, `gray`, `zinc`, `neutral`, `stone`) exist as `--cs-color-<name>-<50..950>`, Avoid raw primitives in UI code; prefer semantic tokens below.
- **Semantic Palettes:** `base` (Zinc), `accent` (Blue), `success` (Green), `warning` (Orange), `danger` (Red), `info` (Sky).
    - Raw shades: `--cs-color-<palette>-<50..950>`
    - **Pre-mixed UI State Tokens (Auto `light-dark()`):** Every semantic palette (`base`, `accent`, `success`, `warning`, `danger`, `info`) provides ready-to-use soft (tinted surface) and solid (high-emphasis fill) tokens:
        - `--cs-color-<palette>-soft` & `--cs-color-<palette>-soft-hover`
        - `--cs-color-<palette>-soft-fg` (plus `--cs-color-base-soft-fg-hover` on `base`)
        - `--cs-color-<palette>-solid` & `--cs-color-<palette>-solid-hover`
        - `--cs-color-<palette>-solid-fg`
        - **Rule:** NEVER manually mix tints with `color-mix()` or alpha utilities when building badges, buttons, alerts, or interactive states. Always use the `-soft` / `-solid` tokens (check `../css/foundation/colors.css` for exact definitions).
- **Surface Elevation Hierarchy (Auto `light-dark()`):**
    - `--cs-color-elevation-0`: App root background (Light: `base-100`, Dark: `base-950`).
    - `--cs-color-elevation-1`: Primary elevated surfaces like Cards, Modals, Sidebars sitting on `elevation-0` (Light: `white`, Dark: `base-900`).
    - `--cs-color-elevation-2`: Nested surfaces/elements sitting inside `elevation-1` (Light: `base-100`, Dark: `base-800`).
    - **Rule:** Follow the `0 -> 1 -> 2` surface stacking model instead of picking arbitrary gray/zinc shades or writing manual `dark:` background overrides.
- **Text Hierarchy (Auto `light-dark()`):**
    - `--cs-color-text-strong`: Headings, high-emphasis labels.
    - `--cs-color-text-main`: Default body/UI text (already set globally on root).
    - `--cs-color-text-weak`: Secondary text, subtitles, descriptions, icons.
    - `--cs-color-text-weaker`: Muted text, placeholders, subtle metadata.
    - **Rule:** NEVER use raw shades like `zinc-700` or `base-500` for text colors. Always use the 4 semantic text tokens.

### Easings, Shapes & Typography

- **Easings (`../css/foundation/easings.css`):**
  Pattern: `--cs-ease-<curve>-<direction>`
    - Curves: `sine`, `quad`, `cubic`, `quart`, `quint`, `expo`, `circ`, `back`
    - Directions: `in`, `out`, `in-out` (e.g., `--cs-ease-cubic-out`, `--cs-ease-back-in-out`)
    - Physics spring: `--cs-spring-release`
- **Shapes (`../css/foundation/shapes.css`) & Typography (`../css/foundation/typography.css`):**
  Maps UnoCSS `presetWind4` scales to `--cs-*` variables:
    - Radii: `--cs-radius-none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`
    - Shadows: `--cs-shadow-2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `inner`
    - Squircles (`corner-shape`): `--cs-squircle`, `--cs-squircle-smooth`, `--cs-squircle-soft`
    - Typography: Inspect `../css/foundation/typography.css` for font, size, leading, and tracking tokens.
- **Namespace Rule:** The `--cs-*` prefix is strictly reserved for `cs` library tokens. Consuming applications must NEVER define new custom properties starting with `--cs-` (use unprefixed `--my-var` or `--app-*` for app-specific variables, and only set `--cs-*` when intentionally overriding a library token like `--cs-scrollbar-size`).

## 4. CSS Components (`../css/components/`)

NEVER build standard UI primitives (buttons, inputs, etc.) from scratch with UnoCSS utilities before checking existing CSS components.

1. **Discover available components:** Read `../css/components/index.css` to see all exported CSS component stylesheets.
2. **Inspect implementation:** Read the specific `../css/components/<name>.css` file to check the base class, variant modifiers, and custom properties before using it.
