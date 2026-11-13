# `cs` CSS Architecture & Foundation Tokens

All paths below are relative to `./node_modules/cs/src/agents/`.

## 1. Cascade Layers & Override Architecture

`../css/index.css` establishes a strict CSS `@layer` cascade so UnoCSS utilities can cleanly override foundation and component styles without specificity wars (`!important` is almost never needed):

- **Top-level layers:** `foundation`, `attachments`, `components` (defined in `../css/index.css`, attachment stylesheets, and colocated Svelte component `<style>` blocks).
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
- **Surface Hierarchy (Auto `light-dark()`):**
    - `--cs-color-canvas`: App root background (Light: `base-100`, Dark: `base-950`).
    - `--cs-color-elevated` & `--cs-color-elevated-hover`: Primary elevated surfaces like Cards, Modals, Sidebars sitting on `canvas` (Light: `white`, Dark: `base-900` -> `base-800` on hover).
    - `--cs-color-sunken`: Recessed/nested surfaces sitting inside `elevated` (Light: `base-100`, Dark: `base-950`).
    - **Rule:** Follow the `canvas -> elevated -> sunken` surface model instead of picking arbitrary gray/zinc shades or writing manual `dark:` background overrides.
- **Text Hierarchy (Auto `light-dark()`):**
    - `--cs-color-text-strong`: Headings, high-emphasis labels.
    - `--cs-color-text-main`: Default body/UI text (already set globally on root).
    - `--cs-color-text-weak`: Secondary text, subtitles, descriptions, icons.
    - `--cs-color-text-weaker`: Muted text, placeholders, subtle metadata.
    - **Rule:** NEVER use raw shades like `zinc-700` or `base-500` for text colors. Always use the 4 semantic text tokens.

### Easings, Containers, Shapes & Typography

- **Easings (`../css/foundation/easings.css`):**
    - Standard curves (`--cs-ease-<curve>-<direction>`): Curves (`sine`, `quad`, `cubic`, `quart`, `quint`, `expo`, `circ`, `back`) × Directions (`in`, `out`, `in-out`), e.g., `--cs-ease-cubic-out`, `--cs-ease-expo-out`.
    - Custom `linear(...)` physics springs (e.g., `--cs-spring-release`, `--cs-spring-snappy` — inspect `../css/foundation/easings.css` for all available curves).
- **Containers (`../css/foundation/container.css`):**
    - Standard max-width scale tokens (`--cs-container-3xs` through `--cs-container-7xl` plus `--cs-container-prose`). Inspect `../css/foundation/container.css` for exact pixel/ch values.
- **Shapes (`../css/foundation/shapes.css`) & Typography (`../css/foundation/typography.css`):**
  Maps UnoCSS `presetWind4` scales to `--cs-*` variables:
    - Radii: `--cs-radius-none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`
    - Shadows: `--cs-shadow-2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `inner`, `elevated`, `elevated-hover`, `sunken`, `solid`, `solid-active`
    - Squircles (`corner-shape`): `--cs-squircle`, `--cs-squircle-smooth`, `--cs-squircle-soft`
    - Typography: Inspect `../css/foundation/typography.css` for font, size, leading, and tracking tokens.
- **Namespace Rule:** The `--cs-*` prefix is strictly reserved for `cs` library tokens. Consuming applications must NEVER define new custom properties starting with `--cs-` (use unprefixed `--my-var` or `--app-*` for app-specific variables, and only set `--cs-*` when intentionally overriding a library token like `--cs-scrollbar-size`).
