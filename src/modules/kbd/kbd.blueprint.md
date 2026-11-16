# `Kbd` Module Blueprint

<meta>
  <module>kbd</module>
  <kind>component</kind>
  <layer>components.primitive</layer>
  <status>approved</status>
</meta>

---

## 1. Overview & Scope

`Kbd` renders physical keyboard keys and shortcut combinations as calm, tactile primitives tailored to a **single unified Linux & Windows standard**.

- **Kind:** `component` (compound component suite under `src/modules/kbd/`, exported via `index.ts`).
- **Platform Philosophy:** No OS detection, no dual-mode branching, no macOS support, and no macOS-specific key names or glyphs (`⌘`, `⌥`, `⇧`, `⌃`, `⏎`, `⌫`, `⎋`, `⇥`).
- **Boundaries:**
  - `Kbd` is a **static display primitive** (non-interactive, non-focusable, no `<HitArea />`).
  - **One `<KbdGroup>` = ONE coherent shortcut** (e.g. `Ctrl + C`). Each `<Kbd>` inside it represents a single key, separated by `<KbdSeparator />`.
  - Multiple unrelated or sequential shortcuts (e.g. `Ctrl + C` then `Ctrl + V`) use **separate `<KbdGroup>` instances** (or standalone `<Kbd>`s for single keys).
  - **Variant Group Behavior:**
    - `soft` and `ghost`: `<KbdGroup>` renders visually as **one shared container** (`soft` = single shared `base-soft` squircle pill around the entire shortcut; `ghost` = transparent inline group). Child `<Kbd>` elements do **not** render nested boxes, padding, or backgrounds.
    - `keycap`: the **exact same markup** (`<KbdGroup>` with `<Kbd>` + `<KbdSeparator>`) automatically renders each `<Kbd>` as its own **separate 3D keycap** with `--cs-kbd-group-gap` between keys and separator.
  - **Relation to `TooltipKbd`:** `src/modules/tooltip/TooltipKbd.svelte` remains a separate, lightweight `@layer components.composite` helper (`11px`, `--cs-radius-full`) for now to avoid cross-module coupling. Future alignment (e.g., adopting `Kbd`'s keycap squircle or delegating to `Kbd` at `xs`/`sm`) is straightforward once `Kbd` is established.

---

## 2. Public API

### 2.1 Exports (`src/modules/kbd/index.ts`)

- **Components (flat `PascalCase`):**
  - `Kbd` — single keycap (`<kbd class="cs-kbd">`)
  - `KbdGroup` — inline-flex container for shortcut sequences (`<span class="cs-kbd-group">`)
  - `KbdSeparator` — optional muted separator (`+`) between keys in a group (`<span class="cs-kbd-separator">`)
  - `KbdSymbol` — typed registry key/icon renderer with custom icon escape hatch
- **Constants & Types:**
  - `KBD_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` -> `KbdSize`
  - `KBD_VARIANTS = ["soft", "ghost", "keycap"] as const` -> `KbdVariant`
  - `KBD_KEYS` -> `KbdKey = keyof typeof KBD_KEYS`, `KbdKeyDefinition`
  - `KbdProps`, `KbdGroupProps`, `KbdSeparatorProps`, `KbdSymbolProps`, `KbdSymbolDisplay`

### 2.2 Component Props & Context Inheritance

Per `.agents/rules/architecture-and-apis.md`, `variant` and `size` have **no default values**—call sites must always make an explicit choice.

- **Parent-Child Context (`kbd.context.internal.ts`):**
  - Uses Svelte 5 `createContext<KbdGroupContext>()` (`{ readonly variant: KbdVariant; readonly size: KbdSize }`) with reactive getters on `KbdGroup` (not exported from `index.ts`).
  - `<Kbd>` resolves `variant ?? group?.variant` and `size ?? group?.size`. If neither prop nor `KbdGroupContext` provides `variant` or `size`, `<Kbd>` fails fast with a descriptive error rather than silently defaulting.

- **`KbdGroupProps`** (`HTMLAttributes<HTMLSpanElement>`):
  - `ref?: HTMLSpanElement | null` (`$bindable(null)`)
  - `variant: KbdVariant` *(required)* — `"soft" | "ghost" | "keycap"`
  - `size: KbdSize` *(required)* — `"xs" | "sm" | "md" | "lg" | "xl"`
  - `{...rest}` forwarded to `<span>` with `class={["cs-kbd-group", className]}`

- **`KbdProps`** (`HTMLAttributes<HTMLElement>`):
  - `ref?: HTMLElement | null` (`$bindable(null)`)
  - `variant?: KbdVariant` — required standalone; inherited from `<KbdGroup>` when nested
  - `size?: KbdSize` — required standalone; inherited from `<KbdGroup>` when nested
  - `symbol?: KbdKey` — optional shorthand to render a registered key directly without nesting `<KbdSymbol>`
  - `display?: KbdSymbolDisplay` — `"auto" | "icon" | "text" | "both"` (used when `symbol` is set; defaults to `"auto"`)
  - `children?: Snippet` — takes precedence over `symbol` when provided (e.g. `<Kbd variant="soft" size="md">K</Kbd>` or `<Kbd ...><KbdSymbol ... /></Kbd>`)
  - `{...rest}` forwarded to `<kbd>` with `class={["cs-kbd", className]}`

- **`KbdSeparatorProps`** (`HTMLAttributes<HTMLSpanElement>`):
  - `ref?: HTMLSpanElement | null` (`$bindable(null)`)
  - `children?: Snippet` — optional override (e.g. `/`); when omitted, defaults to Lucide `<Plus strokeWidth={2} aria-hidden="true" class="cs-kbd-separator-icon" />`
  - `{...rest}` forwarded to `<span>` with `aria-hidden="true"` and `class={["cs-kbd-separator", className]}`

- **`KbdSymbolProps`**:
  - Discriminated union for either a **typed registry key** or a **custom icon escape hatch**:
    - Registry mode: `{ symbol: KbdKey; display?: KbdSymbolDisplay; icon?: never; label?: never }`
    - Custom icon mode: `{ icon: Component<KbdIconComponentProps>; label?: string; symbol?: never; display?: never }`
  - `display`:
    - `"auto"` *(default)*: renders the Lucide icon if defined in `KBD_KEYS[symbol].icon`, otherwise `text`.
    - `"icon"`: renders icon (falls back to `text` if the key has no icon).
    - `"text"`: renders `text` even if an icon is defined.
    - `"both"`: renders icon + `text` side by side with `--cs-kbd-gap`.
  - All Lucide / custom icons are rendered with `strokeWidth={2.25}` and `aria-hidden="true"`.

### 2.3 Typed Key Registry (`KBD_KEYS`) & `keys.md` Cleanup

`KBD_KEYS` maps canonical lowercase key identifiers to `{ readonly text: string; readonly title: string; readonly icon?: Component }`.

**Cleanup of macOS leftovers & inconsistencies from `keys.md`:**

| `keys.md` Entry | Issue | Blueprint Resolution |
| :--- | :--- | :--- |
| `alt: { icon: Option }` | `Option` is the macOS `⌥` glyph | Remove `icon`; use `{ text: "Alt", title: "Alt" }` |
| `option`, `opt` | macOS-only key names | **Remove** aliases |
| `globe`, `world` | macOS/Apple Fn-globe key | **Remove** aliases; keep `fn: { text: "Fn", title: "Function" }` (title case) |
| `return` | macOS naming | **Remove** alias; keep `enter` |
| `num` (lines 48–49) | Duplicate key entry | Deduplicate to single `num` alias |
| `meta` / `super` / `win` | Missing OS-level modifier for Linux/Windows | Add `super: { text: "Super", title: "Super" }`, `win: { text: "Win", title: "Windows" }`, and `meta: { text: "Meta", title: "Meta" }` |

### 2.4 CSS Variables (`--cs-kbd-*`)

All styling lives in `@layer components.primitive` using `--cs-kbd-*` tokens. Shared size-scale tokens (`[data-size="xs" | "sm" | "md" | "lg" | "xl"]`) live in a single internal stylesheet (`kbd.internal.css`, imported by `Kbd.svelte` and `KbdGroup.svelte`) so size tables are never duplicated:

- **Surface & typography:** `--cs-kbd-bg`, `--cs-kbd-fg`, `--cs-kbd-shadow`, `--cs-kbd-font-size`, `--cs-kbd-icon-size`, `--cs-kbd-gap`
- **Box geometry:** `--cs-kbd-height`, `--cs-kbd-px`
- **Group & separator:** `--cs-kbd-group-gap`, `--cs-kbd-separator-size`, `--cs-kbd-separator-offset`
- **Child box inheritance (`--cs-kbd-item-*`):**
  - `.cs-kbd` reads `block-size: var(--cs-kbd-item-height, var(--cs-kbd-height))`, `min-inline-size: var(--cs-kbd-item-min-width, calc(var(--cs-kbd-height) + 4px))`, `padding-inline: var(--cs-kbd-item-px, var(--cs-kbd-px))`, `background: var(--cs-kbd-item-bg, var(--cs-kbd-bg))`, and `box-shadow: var(--cs-kbd-item-shadow, var(--cs-kbd-shadow, none))`.
  - `.cs-kbd-group[data-variant="soft"]` and `.cs-kbd-group[data-variant="ghost"]` set `--cs-kbd-item-height: auto; --cs-kbd-item-min-width: 0; --cs-kbd-item-px: 0; --cs-kbd-item-bg: none; --cs-kbd-item-shadow: none;`, flattening child `<Kbd>` boxes cleanly via CSS inheritance without `:global()` selector overrides or `!important`.
  - `.cs-kbd-group[data-variant="keycap"]` leaves `--cs-kbd-item-*` unset so each child `<Kbd>` renders its own standalone 3D keycap box, and sets `--cs-kbd-separator-offset: 2px` so `<KbdSeparator>` aligns with the `2px` bottom lip.

---

## 3. DOM, Semantics & Accessibility

- **Native Elements:**
  - `Kbd` -> `<kbd class="cs-kbd">` (1:1 semantic mapping per key).
  - `KbdGroup` -> `<span class="cs-kbd-group">` (`display: inline-flex; align-items: center;`). Using `<span>` as the group container around sibling `<kbd>`s is valid HTML5, avoids nested `<kbd>` selector collisions in consumer stylesheets, and matches the `keycap` layout where `KbdGroup` is a spatial container rather than a single key.
  - `KbdSeparator` -> `<span class="cs-kbd-separator" aria-hidden="true">`.
  - `KbdSymbol` -> renders `<Icon aria-hidden="true" class="cs-kbd-icon" />` and/or `<span class="cs-kbd-label">` (no extra wrapper DOM when unnecessary).
- **`data-*` Attributes:**
  - `KbdGroup`: `data-variant={variant}`, `data-size={size}`
  - `Kbd`: `data-variant={resolvedVariant}`, `data-size={resolvedSize}`, `data-icon-only={isIconOnly ? "" : undefined}` (when `Kbd` renders via `symbol` in icon-only mode)
- **Accessible Labels (No Native `title` Attribute!):**
  - The repository ESLint rule `title-attribute/no-title-attribute` forbids native HTML `title` attributes in `.svelte` templates.
  - Therefore, `KBD_KEYS[symbol].title` MUST NOT be bound to `title="..."`.
  - Instead:
    - When `<Kbd symbol="..." />` is used, `<kbd>` sets `aria-label={entry.title}` (unless the caller explicitly passes `aria-label` in `{...rest}`). This gives screen readers `"Control"` instead of `"C-t-r-l"` and `"Enter"` / `"Up Arrow"` for icon-only keys.
    - When `<KbdSymbol>` is composed inside `<Kbd>` children, icon-only output includes a visually hidden `<span class="cs-kbd-sr-only">{title}</span>` (or `label` for custom icons) so `<kbd>` remains self-describing without needing parent-child context coupling.
- **Focus & Keyboard:** Non-interactive, non-focusable (`tabindex` not set).

---

## 4. Visual & Motion Contract

- **Typography & Icon Calibration:**
  - `font-family: var(--cs-font-sans)` (`Inter`), `font-weight: 500`, `font-variant-numeric: tabular-nums`, `line-height: var(--cs-leading-none)`, `text-box: trim-both cap alphabetic`.
  - `KbdSymbol` / `Kbd` key icons use `strokeWidth={2.25}` and `--cs-kbd-icon-size` (`1–2px` larger than `--cs-kbd-font-size`).
  - `KbdSeparator` defaults to Lucide `<Plus />` (`strokeWidth={2}`, `color: var(--cs-color-text-weak)`, `aria-hidden="true"`), sized to `--cs-kbd-separator-size` (`9px / 10px / 11px / 12px / 13px` across `xs`–`xl`) with `margin-block-end: var(--cs-kbd-separator-offset, 0px)`. Custom `{#if children}` overrides (e.g. `/`) inherit the same color, font-size, and offset.
- **Sizing (`xs | sm | md | lg | xl`):**
  - `xs`: `18px` height, `22px` min-width, `5px` px, `10px` font, `11px` icon, `2px` gap, `3px` group-gap, `9px` separator.
  - `sm`: `20px` height, `24px` min-width, `6px` px, `11px` font, `12px` icon, `3px` gap, `3px` group-gap, `10px` separator.
  - `md`: `24px` height, `28px` min-width, `7px` px, `12px` (`--cs-text-xs`) font, `13px` icon, `4px` gap, `4px` group-gap, `11px` separator.
  - `lg`: `28px` height, `32px` min-width, `9px` px, `13px` font, `14px` icon, `4px` gap, `4px` group-gap, `12px` separator.
  - `xl`: `32px` height, `36px` min-width, `11px` px, `14px` (`--cs-text-sm`) font, `15px` icon, `5px` gap, `5px` group-gap, `13px` separator.
  - Slightly wide floor (`min-inline-size: calc(var(--cs-kbd-height) + 4px)`) prevents single-char or icon-only standalone/keycap keys from collapsing into circles when paired with `--cs-radius-full`.
- **Shape:** Uniform `border-radius: var(--cs-radius-full)` + `corner-shape: var(--cs-squircle-smooth)` (`superellipse(1.6)`) on standalone `<Kbd>`, `keycap` `<Kbd>`s, and `soft` `<KbdGroup>` pills (matching `TooltipKbd` and `Button`).
- **Surface Variants:**
  - `soft`: `--cs-color-base-soft` bg, `--cs-color-text-main` fg, no shadow. When grouped in `<KbdGroup variant="soft">`, the group owns the `block-size: var(--cs-kbd-height)`, `padding-inline: var(--cs-kbd-px)`, and squircle pill surface.
  - `ghost`: `transparent` bg, `--cs-color-text-weak` fg, no shadow. When grouped in `<KbdGroup variant="ghost">`, the group renders as a transparent inline-flex row at `block-size: var(--cs-kbd-height)`.
  - `keycap`: 3D tactile keycap with `2px` bottom lip, top-lit inset highlight, and `margin-block-end: 2px` optical baseline compensation (light/dark calibrated per `kbd.design.md` §5, borderless via `box-shadow`). When grouped in `<KbdGroup variant="keycap">`, each `<Kbd>` keeps its individual 3D keycap and `<KbdSeparator>` receives `margin-block-end: 2px`.
- **Motion:** Static by default (`transition: none`).

---

## 5. Edge Cases & Constraints

### 5.1 Guarding Against Unicode Key Glyphs (TypeScript + ESLint)

- **TypeScript (Initial Batch):** `symbol: KbdKey` constrains named keys to `KBD_KEYS` at compile time, guiding authors to typed registry keys instead of ad-hoc Unicode strings.
- **ESLint (Deferred / Future Follow-Up):** A targeted custom rule (mirroring `src/eslint/rules/unicode-dots.ts`)—e.g. `no-unicode-kbd-glyphs`—checking `SvelteText`, `Literal`, and `TemplateElement` nodes against `/[\u2318\u2325\u21E7\u2303\u23CE\u232B\u238B\u21E5\u21EA\u2326]/u` (`⌘`, `⌥`, `⇧`, `⌃`, `⏎`, `⌫`, `⎋`, `⇥`, `⇪`, `⌦`) is **deferred to a follow-up** and intentionally excluded from this initial implementation batch.

### 5.2 Browser Support & Non-Goals

- **Browser Support:** Modern Chromium-first (`corner-shape: superellipse(1.6)`, `text-box: trim-both cap alphabetic`), with graceful fallback to standard `border-radius` and `line-height: 1`.
- **Non-Goals:**
  - No OS detection or macOS support.
  - No interactive key-press recording or clickable button behavior.
  - No automatic string parsing (e.g. `"Ctrl+Shift+P"` -> `<KbdGroup>`); composition stays explicit and type-safe.
