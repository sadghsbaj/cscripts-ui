# `cs` UnoCSS Preset, Rules & Philosophy

All paths below are relative to `./node_modules/cs/src/agents/`.
The `presetCS()` configuration builds on `presetWind4` (with `preflights.reset: false`, `extractorSvelte`, `transformerDirectives`, and `transformerVariantGroup`).

## 1. Core Styling Philosophy: UnoCSS vs. Vanilla CSS (CRITICAL)

`cs` mirrors all design tokens (`--cs-*`) across both Vanilla CSS and UnoCSS so both can be mixed seamlessly, with a clear division of responsibility:

- **When to use UnoCSS:** Use utility classes for layout, spacing, flex/grid containers, positioning, and quick structural wrappers (avoiding pointless `.outer-wrapper` / `.inner-wrapper` classes in `<style>`).
- **When to use Vanilla CSS (`<style>` or CSS files):** For complex, stateful, or multi-part UI components (e.g., a complex sidebar, custom interactive controls, intricate animations), prefer clean Vanilla CSS using `--cs-*` variables rather than unreadable 25-class utility strings.

## 2. Typography Shortcuts (MANDATORY FOR TEXT ROLES)

Do NOT manually combine font-size, font-weight, line-height, and text-color utilities (`text-sm font-500 text-weak...`) when a semantic text role fits. Always use the predefined shortcuts from `../uno/shortcuts/typography.ts` for visual consistency:

- **`title-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)`:** Headings and titles (uses `text-strong`, tight tracking/leading, semibold/bold).
- **`subtitle-(xs|sm|md|lg|xl)`:** Secondary headings paired with titles (uses `text-weak`).
- **`label-(xs|sm|md|lg)`:** UI control labels, e.g., next to checkboxes, switches, or form inputs (`font-500`, `leading-none`, `select-none`, `text-strong`).
- **`description-(xs|sm|md|lg)`:** Helper or description text below controls/labels (`text-weak`).
- **`body-(xs|sm|md|lg)`:** Long-form prose/reading text (articles, documentation, multi-paragraph content) with generous `leading-relaxed` (`text-main`). Note: Standard UI text already inherits `16px`, `font-400`, `1.5` line-height, and `text-main` globally from the CSS foundation.

## 3. Enforced Layout & Dot Shortcuts

The following shortcuts are strictly enforced by ESLint (`../eslint/shortcuts.ts` & `../eslint/unicode-dots.ts`). NEVER write the raw utilities or unicode characters instead:

- **Layout (`../uno/shortcuts/layout.ts`):**
    - `flex-center` -> Use instead of `flex justify-center items-center`
    - `absolute-center` -> Use instead of `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
- **Separator Dots (`../uno/shortcuts/dots.ts`):**
    - `dot-sm` (`3px`), `dot-md` (`4px`), `dot-lg` (`5px`) -> Use an empty `<span class="dot-md"></span>` instead of unicode middle dots (`·`, `•`).

## 4. Semantic Colors, Elevations & Text Levels (Auto `light-dark()`)

All semantic UnoCSS color tokens map to `--cs-color-*` variables (`../uno/theme/colors.ts` & `../uno/rules/colors.ts`) which resolve Light and Dark mode automatically via native CSS `light-dark()`. **NEVER write redundant `dark:bg-...` or `dark:text-...` pairs when using semantic tokens:**

- **Surface Elevations & Borders (`../uno/rules/colors.ts`):**
    - `bg-elevation-0`: App background (Light: `base-100`, Dark: `base-950`)
    - `bg-elevation-1`: Cards/panels on `elevation-0` (Light: `white`, Dark: `base-900`)
    - `bg-elevation-2`: Nested containers on `elevation-1` (Light: `base-100`, Dark: `base-800`)
    - `border-elevation-1`: Subtle surface hairline for primary cards/islands (auto `light-dark()`, transparent in Light Mode, 5% hairline in Dark Mode)
    - `border-elevation-2`: Subtle inner container border when extra contrast is needed (8% hairline in Dark Mode)
- **Text Hierarchy (`../uno/rules/colors.ts`):**
    - `text-strong`, `text-main` (default inherited), `text-weak`, `text-weaker`
    - **Rule:** NEVER use raw gray/zinc classes (`text-zinc-500`, `text-base-600`) for typography.
- **Semantic Palettes (`base`, `accent`, `success`, `warning`, `danger`, `info`):**
    - Pre-mixed soft/solid tokens (auto `light-dark()`): `<palette>-soft`, `<palette>-soft-hover`, `<palette>-solid`, `<palette>-solid-hover` (e.g., `bg-accent-soft hover:bg-accent-soft-hover`, `bg-base-soft`, `bg-danger-solid`). Note: For matching `-fg` foreground variables, check `../css/foundation/colors.css`.
    - Raw shades: `50`–`950` (e.g., `border-base-200`, `text-accent-500`).

## 5. Custom Rules (Scrollbars, Squircles, Text-Trim)

- **Scrollbars (`../uno/rules/scrollbar.ts`):**
    - Sizing (Cross-browser WebKit + Firefox): `scrollbar-sm` (`8px`), `scrollbar-md` (`10px`), `scrollbar-lg` (`12px`)
    - Hiding: `no-scrollbar` or `scrollbar-none`
- **Squircles (`../uno/rules/shapes.ts`):**
    - `squircle`, `squircle-smooth`, `squircle-soft` (sets CSS `corner-shape` via `--cs-squircle*`).
- **Optical Text Trimming (`../uno/rules/typography.ts`):**
    - `text-trim`: Applies `text-box: trim-both cap alphabetic` for pixel-perfect vertical alignment.
    - `text-trim-truncate`: Combines `text-trim` with single-line ellipsis truncation (`min-w-0`, `overflow-x-clip`, `text-overflow: ellipsis`, ` white-space: nowrap`).

## 6. Smart Interaction Variants (`../uno/variants/interaction.ts`)

`presetCS` overrides default `hover:`, `active:`, and `disabled:` variants (including `group-<state>:` and `peer-<state>:`, plus named groups like `group-hover/name:`):

- **Auto Inactive Guard:** `hover:` and `active:` automatically include `:not([aria-disabled="true"], [aria-busy="true"], :disabled)`. Additionally, `hover:` is wrapped in `@media (hover: hover) and (pointer: fine)` to prevent sticky hover states on touch devices.
- **`disabled:` Variant:** Matches both `:disabled` and `[aria-disabled="true"]`.
- **Rule:** NEVER manually write `enabled:hover:...` or `not-disabled:hover:...` guards—standard `hover:` and `active:` already ignore disabled and busy elements automatically.
