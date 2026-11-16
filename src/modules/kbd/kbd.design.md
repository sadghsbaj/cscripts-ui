# `Kbd` Design Specification

<meta>
  <module>kbd</module>
  <layer>components.primitive</layer>
  <status>draft</status>
</meta>

## 1. Visual Direction & Platform Philosophy

`Kbd` represents physical keyboard keys and shortcut combinations in a calm, tactile, OS-neutral way tailored for **Linux and Windows** workflows (no macOS-first glyph conventions).

- **No Unicode Key Glyphs:** Avoid Unicode symbol characters (`⌘`, `⌥`, `⇧`, `⌃`, `⏎`, `⌫`), which render inconsistently across Linux/Windows system fonts and often clip or misalign vertically.
- **Clean Text + Vector Icons:** Use concise English key labels (`Ctrl`, `Alt`, `Shift`, `Esc`, `Del`, `PgUp`, `PgDn`) paired with or replaced by crisp `lucide-svelte` vector icons (as mapped in [keys.md](./keys.md)) for directional and structural keys (`ArrowUp`, `Enter`, `Backspace`, `Tab`, `Shift`).
- **Character Casing:** Single-character keys (`K`, `S`, `F1`) render uppercase for visual balance inside square keycaps; multi-letter labels (`Ctrl`, `Esc`, `Space`) use title case.

---

## 2. Typography & Icon Calibration

| Property | Value / Token | Rationale |
| :--- | :--- | :--- |
| **Font Family** | `var(--cs-font-sans)` (`Inter`) | Matches the UI sans-serif system (`design-and-tokens.md`). Monospace (`--cs-font-mono`) makes multi-letter words (`Ctrl`, `Shift`, `Backspace`) look wide and uneven alongside proportional UI copy. |
| **Font Weight** | `500` (Medium) | At `10px–13px`, `500` stays crisp without clogging counters (unlike `600`), while keeping enough visual weight to read as a keycap. |
| **Numeric & Trim** | `font-variant-numeric: tabular-nums;`<br>`line-height: var(--cs-leading-none);`<br>`text-box: trim-both cap alphabetic;` | `tabular-nums` prevents width jitter across `F1–F12` or `1–9`. `text-box: trim-both cap alphabetic` eliminates descender slack so glyphs sit optically centered inside the keycap. |
| **Icon Stroke** | `strokeWidth={2.25}` | Calibrated to `font-weight: 500` per `design-and-tokens.md` so icons and adjacent text share identical stroke density. |
| **Icon Sizing** | `1–2px` larger than `font-size` | Compensates for open stroke geometry next to solid letterforms. |

---

## 3. Sizing & Proportions

`Kbd` is a compact inline/display primitive—smaller than action controls (`Button` `md` = `36px`) so it sits naturally inside body copy, `TextInput` trailing slots, `Tooltip` panels, and command menus.

| `size` | Height | Min Width | Padding Inline | Font Size | Icon Size | Icon-Label Gap | Typical Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` | `18px` | `22px` | `5px` | `10px` | `11px` | `2px` | Dense tooltips, compact badges |
| `sm` | `20px` | `24px` | `6px` | `11px` | `12px` | `3px` | Inline body text, `TextInput` hints, `TooltipKbd` |
| `md` *(default)* | `24px` | `28px` | `7px` | `12px` (`--cs-text-xs`) | `13px` | `4px` | Shortcut lists, documentation, command palettes |
| `lg` | `28px` | `32px` | `9px` | `13px` | `14px` | `4px` | Feature cards, onboarding, visual key maps |
| `xl` | `32px` | `36px` | `11px` | `14px` (`--cs-text-sm`) | `15px` | `5px` | Hero sections, large keyboard visualizers |

### Optical Rules
- **Slightly Wide Floor (`min-inline-size > block-size`):** Setting `min-inline-size` ~`4px` wider than `block-size` (with generous `padding-inline`) prevents single-character keys (`K`, `?`, `1`) and icon-only keys (`↑`, `⏎`) from collapsing into circles when using `--cs-radius-full`.
- **Shortcut Sequences:** Multiple keys in a combo sit with a `4px` gap (`3px` at `xs`/`sm`). Prefer clean spacing over `+` separators in dense UI; when `+` is used in documentation, style it in `--cs-color-text-weaker` at `font-weight: 400`.

---

## 4. Shape & Corner Geometry

Use one unified shape across all `Kbd` sizes and variants—matching [TooltipKbd.svelte](../tooltip/TooltipKbd.svelte) and `Button`:

- **Radius:** `border-radius: var(--cs-radius-full)`
- **Corner Shape:** `corner-shape: var(--cs-squircle-smooth)` (`superellipse(1.6)`).

Because `min-inline-size` is slightly wider than `block-size` and `superellipse(1.6)` flattens the corner arc noticeably compared to `1.2`, single keys read as soft, tactile keycaps rather than circles—while combo pills (`Ctrl K`) and wide keys (`Backspace`) share the exact same organic pill silhouette.

---

## 5. Surface Variants

`Kbd` is static by default (non-interactive display), so its variants solve **surface contrast** across different host backgrounds (`canvas`, `elevated`, `sunken`, `solid` tooltips):

### 1. `soft` *(Default)*
Quiet, low-contrast neutral chip for inline text, tables, and command palettes.
- **Background (`--cs-kbd-bg`):** `var(--cs-color-base-soft)`
- **Foreground (`--cs-kbd-fg`):** `var(--cs-color-text-main)` (or `var(--cs-color-text-strong)` at `xs`/`sm` for crispness)
- **Shadow:** `none`

### 2. `ghost`
Borderless, background-free hint for ultra-dense contexts (dropdown menus, context menus, right-aligned shortcut columns) where boxes around every shortcut add visual noise.
- **Background:** `transparent`
- **Foreground:** `var(--cs-color-text-weak)` (or `var(--cs-color-text-main)`)
- **Shadow:** `none`

### 3. `keycap` *(3D Tactile Key)*
A dedicated tactile keycap variant with a physical bottom skirt/lip and top-lit rim—giving documentation, hero sections, and shortcut overlays unmistakable keyboard character without raw CSS `border`.

- **Light Mode:**
  - `--cs-kbd-bg`: `linear-gradient(to bottom, white, var(--cs-color-base-50))` (or `var(--cs-color-elevated)`)
  - `--cs-kbd-fg`: `var(--cs-color-text-strong)`
  - `--cs-kbd-shadow`:
    ```css
    inset 0 1px 0 0 rgb(255 255 255 / 0.9),
    0 2px 0 0 var(--cs-color-base-300),
    0 0 0 1px rgb(0 0 0 / 0.08),
    0 2px 3px -1px rgb(0 0 0 / 0.08)
    ```
- **Dark Mode:**
  - `--cs-kbd-bg`: `var(--cs-color-base-800)` *(one step lighter than `--cs-color-elevated` `base-900` so keycaps remain distinct on elevated cards)*
  - `--cs-kbd-fg`: `var(--cs-color-text-strong)`
  - `--cs-kbd-shadow`:
    ```css
    inset 0 1px 0 0 rgb(255 255 255 / 0.14),
    0 2px 0 0 rgb(0 0 0 / 0.65),
    inset 0 0 0 1px rgb(255 255 255 / 0.08),
    0 2px 4px 0 rgb(0 0 0 / 0.4)
    ```
- **Optical Compensation:** Because the `2px` bottom lip extends visually downward, nudge internal content or give `keycap` `margin-block-end: 2px` in inline/flex layouts so it aligns cleanly with neighboring text baselines.
- **Optional Interactive Press State (`data-pressed` / `:active` if ever interactive):** `translateY(1px)` with the `2px` bottom lip compressed to `1px` using `var(--cs-dur-press)` and `var(--cs-ease-press)`.

---

## 6. CSS Token Architecture

Follow `--cs-kbd-<property>` naming under `@layer components.primitive`:

- `--cs-kbd-bg`
- `--cs-kbd-fg`
- `--cs-kbd-shadow`
- `--cs-kbd-height`
- `--cs-kbd-px`
- `--cs-kbd-gap`
- `--cs-kbd-font-size`
- `--cs-kbd-icon-size`
