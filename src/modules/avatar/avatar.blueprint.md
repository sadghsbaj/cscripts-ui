# Avatar Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (typographic & geometric identity stamp with optional group container: `Avatar` and `AvatarGroup`)
- **Purpose:** A photo-free "Typographic & Geometric Identity Stamp" representing a user, entity, or workspace through deterministic OKLCH color, extracted initials, and a subtle geometric micro-pattern layer. Designed for crisp legibility at compact UI scales without relying on external image URLs.
- **Comparison with Sibling Modules:**
  - **`Badge`:** Inline status/count pill sharing the same `xs | sm | md | lg | xl` T-shirt scale, `soft | solid` surface vocabulary, and `base | accent | positive | caution | negative` semantic colors.
  - **`Chip` / `ChipGroup`:** Shares the `createContext()` inheritance pattern where `variant`, `size`, and `disabled` are required at standalone call sites and optionally inherited from an enclosing group.
  - **`Button`:** Shares `--cs-shadow-solid` / `--cs-shadow-solid-active` tactile physics when `Avatar` is rendered as an interactive `solid` control.
- **Boundaries:**
  - **Owns:** Deterministic identity hue hashing (`auto`), initials extraction, squircle geometry, diagonal micro-pattern vignette layer, status indicator with cutout ring, polymorphic static/button/link rendering, and `AvatarGroup` overlap + `+N` overflow.
  - **Does not own:** Image fetching/cropping (`<img>` / `src`), built-in tooltips/popovers (consumers compose `Tooltip` or `Popover` around `Avatar`), or selection state management.
  - **Out of scope (v1):** `src` / image upload, custom `shape` variants (circle/square), `info` color palette, and drag-to-reorder groups.

---

## 2. Public API

### Exports (`src/modules/avatar/index.ts`)

Flat `PascalCase` exports (no dot-notation, no `*.internal.*` exports):

- **Components:**
  - `Avatar` — Identity stamp rendering as `<span>`, `<button type="button">`, or `<a>`.
  - `AvatarGroup` — Overlapping/spaced stack container with `max` truncation and `+N` overflow squircle.
- **Option Arrays & Types:**
  - `AVATAR_VARIANTS = ["soft", "solid"] as const` -> `AvatarVariant`
  - `AVATAR_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` -> `AvatarSize`
  - `AVATAR_COLORS = ["auto", "base", "accent", "positive", "caution", "negative"] as const` -> `AvatarColor`
  - `AVATAR_PATTERNS = ["diagonal", "none"] as const` -> `AvatarPattern`
  - `AVATAR_STATUSES = ["online", "busy", "away", "offline"] as const` -> `AvatarStatus`
  - `AvatarProps`
  - `AvatarGroupProps`

### Props

#### `AvatarProps`

`variant` and `size` **MUST NOT** have default values. In TypeScript they are optional on `AvatarProps` solely so `<Avatar>` nested inside `<AvatarGroup>` can inherit them via `AvatarGroupContext` (matching `Chip` / `ChipGroup`). If either `variant` or `size` is missing both directly and from `AvatarGroupContext`, `Avatar` throws an `Error` in `$effect.pre()`.

Polymorphic element selection is driven by `href` and `onclick`:

- **`href` provided (`href: string`):** Renders `<a class="cs-avatar">` (`Omit<HTMLAnchorAttributes, "color" | "size">`, `ref?: HTMLAnchorElement | null`).
- **`onclick` provided (without `href`):** Renders `<button type="button" class="cs-avatar">` (`Omit<HTMLButtonAttributes, "color" | "size" | "type">`, `ref?: HTMLButtonElement | null`). `type="button"` is enforced *after* `{...rest}`.
- **Neither `href` nor `onclick`:** Renders `<span class="cs-avatar">` (`Omit<HTMLAttributes<HTMLSpanElement>, "color" | "size">`, `ref?: HTMLSpanElement | null`).

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLSpanElement \| HTMLButtonElement \| HTMLAnchorElement \| null` | `null` | `$bindable()`, bound to root `.cs-avatar`. |
| `variant` | `AvatarVariant` | *(required standalone)* | `"soft" \| "solid"`. Inherited from `AvatarGroup` when nested. |
| `size` | `AvatarSize` | *(required standalone)* | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. Inherited from `AvatarGroup` when nested. |
| `name` | `string \| undefined` | `undefined` | Full name used for initials extraction, `auto` hue seeding, and default `aria-label`. |
| `initials` | `string \| undefined` | `undefined` | Explicit initials override (trimmed, uppercased, capped to 1 char at `xs`, 2 chars at `sm`–`xl`). |
| `seed` | `string \| undefined` | `undefined` | Optional deterministic hash seed overriding `name` for `auto` color (e.g. stable user ID). |
| `color` | `AvatarColor` | `"auto"` | `"auto" \| "base" \| "accent" \| "positive" \| "caution" \| "negative"`. |
| `pattern` | `AvatarPattern` | `"diagonal"` | `"diagonal" \| "none"`. |
| `status` | `AvatarStatus \| undefined` | `undefined` | `"online" \| "busy" \| "away" \| "offline"`. Renders status dot with `2px` cutout ring. |
| `disabled` | `boolean` | `false` | Disables interactive `Avatar` (combined with `AvatarGroup` `disabled`). |
| `href` | `string \| undefined` | `undefined` | Renders root as `<a>` when defined. |
| `onclick` | `MouseEventHandler \| undefined` | `undefined` | Renders root as `<button type="button">` when defined without `href`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-avatar", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Custom inner content (e.g. icon/monogram) replacing extracted initials and fallback glyph. |
| `...rest` | Element-specific HTML attributes | — | Forwarded to root element. |

#### `AvatarGroupProps` (`extends Omit<HTMLAttributes<HTMLDivElement>, "color">`)

`variant` and `size` are **strictly required** on `AvatarGroup` (no defaults).

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to root `.cs-avatar-group`. |
| `variant` | `AvatarVariant` | *required* | Shared surface variant (`"soft" \| "solid"`) inherited by child `Avatar`s and `+N` overflow. |
| `size` | `AvatarSize` | *required* | Shared T-shirt scale (`"xs"`–`"xl"`) inherited by child `Avatar`s and `+N` overflow. |
| `max` | `number \| undefined` | `undefined` | Maximum visible avatars before collapsing excess items into a `+N` overflow squircle. |
| `overlap` | `boolean` | `true` | `true`: negative inline-start overlap with cutout ring; `false`: spaced row. |
| `disabled` | `boolean` | `false` | Propagated to all child `Avatar` items via `AvatarGroupContext`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-avatar-group", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted `<Avatar>` items. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to root `.cs-avatar-group`. |

### CSS Custom Properties (`--cs-avatar-*`, `--cs-avatar-group-*`)

| Variable | Purpose |
| :--- | :--- |
| `--cs-avatar-size` | Width and height of the squircle (`20px` / `24px` / `32px` / `40px` / `56px`). |
| `--cs-avatar-radius` | Corner radius (`42%`). |
| `--cs-avatar-squircle` | Superellipse `corner-shape` (`--cs-squircle-soft` or `--cs-squircle-smooth`). |
| `--cs-avatar-font-size` | Initials font size per T-shirt scale. |
| `--cs-avatar-bg` | Surface background fill. |
| `--cs-avatar-bg-hover` | Hover surface fill when `data-interactive` is present. |
| `--cs-avatar-fg` | Initials / fallback icon foreground color. |
| `--cs-avatar-shadow` | Surface shadow (`--cs-shadow-solid` for interactive `solid`, or `none`). |
| `--cs-avatar-shadow-active` | Active press shadow (`--cs-shadow-solid-active` for interactive `solid`). |
| `--cs-avatar-hue` | Deterministic OKLCH hue (`0`–`360`) set inline when `color="auto"` has a `seed` or `name`. |
| `--cs-avatar-ring-color` | Cutout ring color for status indicator and `AvatarGroup` overlap (default `var(--cs-color-canvas)`). |
| `--cs-avatar-ring-width` | Cutout ring thickness (`2px`). |
| `--cs-avatar-pattern-color` | Tint used by the micro-pattern motif. |
| `--cs-avatar-pattern-opacity` | Opacity of the micro-pattern layer. |
| `--cs-avatar-status-size` | Diameter of the status indicator dot per size. |
| `--cs-avatar-status-bg` | Semantic fill of the status indicator dot. |
| `--cs-avatar-group-overlap` | Negative inline margin between overlapping avatars in `AvatarGroup`. |
| `--cs-avatar-group-gap` | Positive gap between avatars when `overlap={false}`. |

---

## 3. DOM, Semantics & Accessibility

### DOM Structure & Selectors

```html
<!-- Static Avatar -->
<span
  class="cs-avatar"
  data-variant="soft"
  data-size="md"
  data-color="auto"
  data-pattern="diagonal"
  data-status="online"
  role="img"
  aria-label="Ada Lovelace, online"
  style="--cs-avatar-hue: 214;"
>
  <span class="cs-avatar-surface" aria-hidden="true">
    <span class="cs-avatar-pattern"></span>
    <span class="cs-avatar-content">AL</span>
  </span>
  <span class="cs-avatar-status" aria-hidden="true"></span>
</span>

<!-- Interactive Avatar (<button type="button"> or <a>) -->
<button
  type="button"
  class="cs-avatar"
  data-variant="solid"
  data-size="md"
  data-color="accent"
  data-pattern="none"
  data-interactive=""
  aria-label="Ada Lovelace"
>
  <!-- <HitArea /> when standalone and size is xs..lg -->
  <span class="cs-avatar-surface" aria-hidden="true">
    <span class="cs-avatar-pattern"></span>
    <span class="cs-avatar-content">AL</span>
  </span>
</button>

<!-- AvatarGroup -->
<div class="cs-avatar-group" role="group" data-variant="soft" data-size="md" data-overlap="">
  <!-- Slotted <Avatar> items (items beyond `max` are hidden) -->
  <span class="cs-avatar cs-avatar-overflow" data-variant="soft" data-size="md" aria-label="3 more">
    <span class="cs-avatar-surface" aria-hidden="true">
      <span class="cs-avatar-content">+3</span>
    </span>
  </span>
</div>
```

- **Separated `.cs-avatar-surface` clip wrapper:** Placing `overflow: clip`, `border-radius`, and `corner-shape` on `.cs-avatar-surface` (or keeping `.cs-avatar-status` outside the clipped surface) allows the `status` dot at the bottom-end corner to sit cleanly on the squircle edge with its `2px` cutout ring without being clipped, and allows `<HitArea />` to expand outside the visual bounds on compact interactive avatars.

### WAI-ARIA & Accessibility

- **Static `<span>`:**
  - If `aria-label` is provided by the consumer, it is used directly with `role="img"`.
  - Else if `name` is provided (and `aria-hidden` is not `"true"`), `role="img"` and `aria-label` are derived from `name` plus localized status (via `t({ de, en })` from `src/shared/lang.internal.ts`).
  - Else if neither `name`, `aria-label`, nor `children` is present (purely decorative fallback), `aria-hidden="true"` is applied.
  - `.cs-avatar-surface` and `.cs-avatar-status` always carry `aria-hidden="true"` so screen readers do not announce raw two-letter initials as words.
- **Interactive `<button type="button">` / `<a>`:**
  - Native `<button type="button">` or `<a>` semantics; `role="img"` is never applied to interactive elements.
  - Default `aria-label` falls back to `name` (+ localized status) if no `aria-label` or `aria-labelledby` is passed.
  - Disabled `<a>`: applies `aria-disabled="true"`, `tabindex={-1}`, and `event.preventDefault()` on click. Disabled `<button>` uses native `disabled`.
  - **Hit Area (`<HitArea />`):** Standalone interactive `Avatar`s at `xs` (`400px²`), `sm` (`576px²`), `md` (`1024px²`), and `lg` (`1600px²`) are below `1936px²` and render `<HitArea />` inside the `<button>`/`<a>`. Inside an overlapping `AvatarGroup`, `<HitArea />` is omitted so adjacent overlapping avatars do not collide on pointer hit-testing.
- **Keyboard & Focus:**
  - Relies on global `:focus-visible` from `src/css/foundation/focus.css`.
  - In `AvatarGroup`, `:hover` and `:focus-visible` elevate the focused/hovered avatar's `z-index` above its overlapping siblings.

---

## 4. Visual & Motion Contract

- **CSS Layer:** `@layer components.primitive`.
- **Shape:** Signature squircle with `border-radius: 42%` (`--cs-avatar-radius: 42%`). Uses `corner-shape: var(--cs-squircle-soft)` (`superellipse(1.2)`) for `xs` and `sm`, and `corner-shape: var(--cs-squircle-smooth)` (`superellipse(1.6)`) for `md`, `lg`, and `xl`. No `shape` prop.
- **Proportional `size` Scale (`xs`–`xl`):**
  - `xs`: `20px` square, `9px` font, `6px` status dot, max 1 initial char.
  - `sm`: `24px` square, `10px` font, `7px` status dot, max 2 initial chars.
  - `md`: `32px` square, `12px` font, `8px` status dot, max 2 initial chars.
  - `lg`: `40px` square, `14px` font, `10px` status dot, max 2 initial chars.
  - `xl`: `56px` square, `18px` font, `12px` status dot, max 2 initial chars.
- **Surface & Color:**
  - `soft` and `solid` variants across `base | accent | positive | caution | negative` map directly to `--cs-color-*` foundation tokens (`color-semantics.css`).
  - **Opaque Overlap Backing:** `.cs-avatar-surface` composites `--cs-avatar-bg` over `var(--cs-avatar-ring-color)` via `background: linear-gradient(var(--cs-avatar-bg), var(--cs-avatar-bg)), var(--cs-avatar-ring-color)` so semi-transparent fills (`base-soft`, `disabled`, and `+N` overflow stamps) never bleed through underlying siblings in `AvatarGroup` overlap mode.
  - `auto` with `seed ?? name`: Deterministic hash computes `--cs-avatar-hue` (`0`–`360`) on a curated OKLCH hue ring using `light-dark()` so both `soft` (tinted bg + crisp high-contrast fg) and `solid` (rich mid-chroma bg + white/dark high-contrast fg) maintain WCAG AA contrast. Without `seed` or `name`, `auto` falls back to `base`.
  - Interactive `solid` applies `--cs-shadow-solid` and `--cs-shadow-solid-active` on `:active`.
  - Disabled interactive avatars use `--cs-color-disabled-bg` and `--cs-color-disabled-fg` (`--cs-disabled-opacity: 1`).
- **Initials Extraction & Fallback:**
  - `initials` prop takes priority if non-empty after trimming.
  - Otherwise extracted from `name` (whitespace-normalized):
    - `xs`: First character of first word.
    - `sm`–`xl`: Single word -> first 2 characters; multi-word -> first character of first word + first character of last word.
  - Uppercased; `font-weight: 600`; `letter-spacing: 0.02em`; `line-height: var(--cs-leading-none)`.
  - If `children`, `initials`, and `name` are all absent, renders a minimal built-in fallback user SVG glyph.
- **Micro-Pattern Layer:**
  - `pattern` supports `"diagonal" | "none"` (default `"diagonal"`).
  - Pure CSS `repeating-linear-gradient` diagonal motif on `.cs-avatar-pattern` masked with a radial vignette so center initials remain razor-sharp:
    - `soft`: `--cs-avatar-pattern-opacity: 0.16` with `mask-image: radial-gradient(circle, transparent 28%, black 85%)`.
    - `solid`: `--cs-avatar-pattern-opacity: 0.10` with a tighter `mask-image: radial-gradient(circle, transparent 32%, black 88%)`.
  - Suppressed at `xs` (`20px`) to avoid visual noise.
- **Status Indicator:**
  - `online` -> `--cs-color-positive-solid`, `busy` -> `--cs-color-negative-solid`, `away` -> `--cs-color-caution-solid`, `offline` -> `--cs-color-base-400` / `--cs-color-text-weaker`.
  - Positioned at `inset-block-end: -1px; inset-inline-end: -1px;` with `box-shadow: 0 0 0 2px var(--cs-avatar-ring-color)`.
- **Motion:**
  - Interactive `Avatar` transitions `background`, `box-shadow`, and `transform` using `--cs-dur-hover` / `--cs-dur-press` and `--cs-ease-cubic-out` from `src/css/foundation/motion.css`, with subtle `scale(0.96)` on `:active`.
  - In `AvatarGroup`, hovered/focused avatars smoothly lift (`translateY(-2px)` + `z-index: 2`) over `--cs-dur-hover`.
  - `prefers-reduced-motion` is inherited globally from `src/css/foundation/motion.css`.

---

## 5. Edge Cases & Constraints

- **Deterministic `AvatarGroup` `max` Truncation Without DOM Queries:** Child `Avatar`s register their root element with `AvatarGroupContext` on mount and unregister on unmount. `AvatarGroup` sorts registered items by DOM order (`Node.compareDocumentPosition`) to compute each item's index, hiding items where `index >= max` (`data-overflow-hidden=""` / `hidden`) and rendering the `+N` overflow squircle when `total > max`. Zero `document.querySelector` calls.
- **Interactive Elements Inside `AvatarGroup`:** `AvatarGroup` uses `role="group"` (never `role="img"`), so interactive `<button>`/`<a>` avatars inside a group remain individually focusable in the natural `Tab` order.
- **RTL Support:** Status indicator positioning (`inset-inline-end`) and `AvatarGroup` overlap (`margin-inline-start`) use CSS logical properties so RTL layouts mirror automatically.
- **Subpixel Typography:** Centered initials use `display: grid; place-items: center;` with `line-height: 1` to avoid half-pixel vertical drift across `20px`–`56px` containers.
- **Explicit Non-Goals:** No `<img>` / `src` support in v1, no `shape` prop, no `info` color, no built-in tooltip/popover, and no cross-module internal imports.

---

## 6. Planned File List

- `src/modules/avatar/index.ts` — Public exports, option arrays, and TypeScript types.
- `src/modules/avatar/Avatar.svelte` — Main `Avatar` component.
- `src/modules/avatar/AvatarGroup.svelte` — `AvatarGroup` container with `max` overflow squircle.
- `src/modules/avatar/avatar.context.internal.ts` — Typed `createContext()` helper for `AvatarGroupContext`.
- `src/modules/avatar/avatar-identity.internal.ts` — Deterministic FNV-1a hash, OKLCH hue ring calculation, and initials extractor.
- `src/modules/avatar/avatar.internal.css` — Shared `@layer components.primitive` styles for `.cs-avatar` and `.cs-avatar-group`.
- `src/modules/avatar/Avatar.preview.svelte` — Interactive playground preview.
- `src/modules/avatar/avatar.docs.md` — Module documentation.
- `src/modules/avatar/Avatar.svelte.test.ts` — Unit & component tests (initials, deterministic hash, polymorphism, `AvatarGroup` `max` overflow, a11y).
- `src/modules/avatar/AvatarTestHost.internal.svelte` — Test harness for snippet/group/reactivity tests.
- `src/modules/avatar/avatar.blueprint.md` — This blueprint.
