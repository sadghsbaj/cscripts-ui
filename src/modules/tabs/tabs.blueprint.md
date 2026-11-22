# Tabs Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (compound macro view-switching and navigation primitive: `Tabs`, `TabsList`, `TabsTrigger`, `TabsPanel`, `TabsLabel`, `TabsIcon`)
- **Purpose:** A lightweight, typographic, open-air tab navigation system supporting both **panel-switching tabs** (`Tabs` + `TabsList` + `TabsTrigger` + `TabsPanel`) and **tablist-only / route-link navigation** (`Tabs` + `TabsList` + `TabsTrigger` without `TabsPanel`, or with `href` links). Built around the approved visual and motion contract in [tabs.design.md](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/tabs/tabs.design.md).
- **Comparison with Sibling Modules:**
  - **`SegmentedControl`:** Local, compact horizontal mode toggle (2–5 options) inside a sunken pill track with an elevated sliding thumb. `Tabs` is a macro view/section navigation strip supporting `horizontal` and `vertical` orientations, a single typographic line architecture (`1px` hairline + `2px` bar), `TabsPanel` wiring, and `href` link triggers.
  - **`Accordion`:** Vertically stacked disclosure group composing `<Collapsible>` where multiple or single sections expand in-flow. `Tabs` switches mutually exclusive views via a dedicated `TabsList` strip.
- **Boundaries:**
  - **Owns:** Selection state (`value = $bindable()`, `onValueChange`), WAI-ARIA tablist/tab/tabpanel wiring, `rovingFocus` keyboard navigation (`automatic` and `manual` activation), `pointerdown` desktop vs. `click` touch/link activation, distance-calibrated `@property` `clip-path` Push-Pull active indicator, and horizontal overflow scrolling with `scrollFade` + step chevrons.
  - **Out of scope:** Drag-to-reorder tabs, closeable/editable tabbars, nested-route matching, and folder-style three-sided bordered tabs (explicitly excluded by `tabs.design.md`).

---

## 2. Public API

### Module File Layout (`src/modules/tabs/`)

- **Public entry point:** `index.ts` (never re-exports `*.internal.*`)
- **Public source files:**
  - `Tabs.svelte` — Root container and `TabsContext` provider.
  - `TabsList.svelte` — `role="tablist"` viewport/track, `1px` baseline hairline, Push-Pull `.cs-tabs-indicator`, `rovingFocus` & `scrollFade` attachments, overflow step chevrons, and layout measurement.
  - `TabsTrigger.svelte` — Polymorphic `<button type="button">` or `<a {href}>` tab item with press-scale inner wrapper and ARIA wiring.
  - `TabsPanel.svelte` — `role="tabpanel"` content region wired to its matching `TabsTrigger`.
  - `TabsLabel.svelte` — Optional styled label `<span>` (`.cs-tabs-label`).
  - `TabsIcon.svelte` — Optional typed SVG icon wrapper (`Component<TabsIconComponentProps>`), matching `SegmentedControlIcon`.
  - `tabs.css` — `@layer components.composite` styles, `@property` registrations, and `--cs-tabs-*` variables.
  - `tabs.types.ts` — Public types and `UPPER_SNAKE_CASE` option constants.
  - `tabs.context.ts` — `createContext()` typed helpers (`getTabsContext`, `setTabsContext`, `hasTabsContext`, `type TabsContext`).
- **Internal modules (never exported):**
  - `tabs-indicator.internal.ts` — Pure helpers for clip-path offset calculation, direction detection, and distance-calibrated Push-Pull timings.
  - `tabs-scroll.internal.ts` — Overflow state, smart step-scroll delta, and scroll-into-view delta helpers (module-local, mirroring `SegmentedControl` without cross-module coupling).
- **Co-located docs/preview/tests:** `tabs.blueprint.md`, `tabs.design.md`, `tabs.docs.md`, `Tabs.preview.svelte`, `Tabs.svelte.test.ts`.

### Exports (`src/modules/tabs/index.ts`)

Flat `PascalCase` compound exports (no dot-notation, no `*.internal.*` exports):

- **Components:**
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsPanel`, `TabsLabel`, `TabsIcon`
- **Context Helpers & Types:**
  - `getTabsContext`, `setTabsContext`, `hasTabsContext`, `type TabsContext`
- **Option Arrays & Types:**
  - `TABS_ORIENTATIONS = ["horizontal", "vertical"] as const` -> `TabsOrientation`
  - `TABS_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` -> `TabsSize`
  - `TABS_WIDTHS = ["content", "equal"] as const` -> `TabsWidth`
  - `TABS_BASELINES = ["full", "content", "none"] as const` -> `TabsBaseline`
  - `TABS_ACTIVATION_MODES = ["automatic", "manual"] as const` -> `TabsActivationMode`
  - `TabsProps<T extends string = string>`
  - `TabsListProps`
  - `TabsTriggerProps<T extends string = string>`
  - `TabsPanelProps<T extends string = string>`
  - `TabsLabelProps`
  - `TabsIconComponentProps`, `TabsIconProps`

> **Naming Rule Compliance:** Subcomponents follow `<Module><Part>` (`TabsList`, `TabsTrigger`, `TabsPanel`, `TabsLabel`, `TabsIcon`). `size` is strictly reserved for `"xs" | "sm" | "md" | "lg" | "xl"`; item distribution uses `width` (`"content" | "equal"`).

### Props

#### `TabsProps<T extends string = string>` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`)

`size` **MUST NOT** have a default value—call sites must choose it explicitly.

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to root `.cs-tabs`. |
| `value` | `T` | `undefined` | `$bindable()`, active tab value. |
| `onValueChange` | `(value: T) => void` | `undefined` | Fires when selection changes via user interaction. |
| `size` | `TabsSize` | *required* | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `orientation` | `TabsOrientation` | `"horizontal"` | `"horizontal" \| "vertical"`. |
| `width` | `TabsWidth` | `"content"` | `"content"` (intrinsic fit) or `"equal"` (`1fr` columns horizontally). |
| `baseline` | `TabsBaseline` | `"full"` | `"full" \| "content" \| "none"` hairline span. |
| `activationMode` | `TabsActivationMode` | `"automatic"` | `"automatic"` selects on arrow focus; `"manual"` requires `Enter`/`Space`. |
| `loop` | `boolean` | `true` | Wraps arrow-key navigation at list boundaries. |
| `disabled` | `boolean` | `false` | Disables all triggers in the group. |
| `keepMounted` | `boolean` | `false` | Default panel mount strategy (`false`: conditional mount; `true`: `hidden` attribute). |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-tabs", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted `TabsList` and `TabsPanel` children. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to root `.cs-tabs`. |

#### `TabsListProps` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to `.cs-tabs-list-shell` root. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-tabs-list-shell", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted `TabsTrigger` children. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to `.cs-tabs-list` (`aria-label`, `aria-labelledby`, etc.). |

#### `TabsTriggerProps<T extends string = string>`

Polymorphic on `href` (discriminated union):
- **Button mode (`href?: undefined`):** `extends Omit<HTMLButtonAttributes, "value" | "type">`, `ref?: HTMLButtonElement | null` (`$bindable(null)`), enforces `type="button"` *after* `{...rest}`.
- **Link mode (`href: string`):** `extends Omit<HTMLAnchorAttributes, "href">`, `ref?: HTMLAnchorElement | null` (`$bindable(null)`).

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `value` | `T` | *required* | Unique tab identifier within the parent `Tabs`. |
| `href` | `string \| undefined` | `undefined` | Renders `<a {href}>` instead of `<button type="button">` when provided. |
| `disabled` | `boolean` | `false` | Disables this trigger independently of root `disabled`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-tabs-trigger", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Trigger content (`TabsIcon`, `TabsLabel`, `<Badge>`, or plain text). |
| `...rest` | `HTMLButtonAttributes \| HTMLAnchorAttributes` | — | Forwarded to `<button>` or `<a>`. |

#### `TabsPanelProps<T extends string = string>` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to `.cs-tabs-panel`. |
| `value` | `T` | *required* | Matching `TabsTrigger` value. |
| `keepMounted` | `boolean \| undefined` | *(from root)* | Optional per-panel override of root `keepMounted`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-tabs-panel", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Panel content. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to `.cs-tabs-panel`. |

#### `TabsLabelProps` & `TabsIconProps`

- **`TabsLabelProps`** (`extends HTMLAttributes<HTMLSpanElement>`): `ref?: HTMLSpanElement | null` (`$bindable(null)`), `class`, `children`, `...rest`.
- **`TabsIconProps`** (`extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): `icon: Component<TabsIconComponentProps>`, `color?: string`, `strokeWidth?: number | string`, `...rest`.

### CSS Custom Properties (`--cs-tabs-*`)

All library styles live in `tabs.css` inside `@layer components.composite`:

| Variable | Role |
| :--- | :--- |
| `--cs-tabs-height` | Horizontal tab height (`28px` / `32px` / `36px` / `40px` / `44px` by `size`, matching `SegmentedControl` & `Button`). |
| `--cs-tabs-min-height` | Vertical tab `min-height` (`28px` / `30px` / `34px` / `38px` / `42px` by `size`). |
| `--cs-tabs-px` | Tab inline padding (`8px` / `10px` / `12px` / `14px` / `16px` by `size`). |
| `--cs-tabs-gap` | Gap between tabs (`4px` / `4px` / `6px` / `6px` / `8px` by `size`). |
| `--cs-tabs-item-gap` | Gap between icon, label, and badge (`6px` / `6px` / `8px` / `8px` / `8px` by `size`). |
| `--cs-tabs-font-size` | Tab font size (`--cs-text-xs` for `xs`/`sm`, `--cs-text-sm` for `md`/`lg`, `--cs-text-base` for `xl`). |
| `--cs-tabs-line-height` | Integer line-height (`16px` / `16px` / `20px` / `20px` / `22px`) to prevent subpixel blur. |
| `--cs-tabs-icon-size` | Leading icon size (`14px` / `14px` / `16px` / `16px` / `18px` by `size`). |
| `--cs-tabs-fg` | Inactive tab text & icon color (`var(--cs-color-text-weak)`). |
| `--cs-tabs-fg-hover` | Hovered tab text & icon color (`var(--cs-color-text-strong)`). |
| `--cs-tabs-fg-active` | Selected tab text & icon color (`var(--cs-color-text-strong)`). |
| `--cs-tabs-bg-hover` | Subtle inset hover wash (`var(--cs-color-base-soft)`). |
| `--cs-tabs-baseline-color` | `1px` hairline baseline (`var(--cs-color-base-soft-hover)`). |
| `--cs-tabs-indicator-color` | Active indicator fill (`var(--cs-color-text-strong)`; overridable to `--cs-color-accent-solid`). |
| `--cs-tabs-indicator-thickness` | Active indicator thickness (`2px` for `xs`–`lg`, `2.5px` for `xl`). |
| `--cs-tabs-radius` | Hover wash & vertical active tint radius (`--cs-radius-md` for `xs`/`sm`, `--cs-radius-lg` for `md`/`lg`, `--cs-radius-xl` for `xl`). |
| `--cs-tabs-squircle` | Superellipse `corner-shape` (`--cs-squircle-soft` for `xs`/`sm`, `--cs-squircle-smooth` for `md`–`xl`). |
| `--cs-tabs-fade-size` | Horizontal scroll-fade mask width (`44px` / `48px` / `56px` / `56px` / `56px` by `size`). |
| `--cs-tabs-clip-start` | Resting start/top `clip-path` inset for `.cs-tabs-indicator`. |
| `--cs-tabs-clip-end` | Resting end/bottom `clip-path` inset for `.cs-tabs-indicator`. |

---

## 3. DOM, Semantics & Accessibility

### DOM Structure & Selectors

```html
<div
  class="cs-tabs"
  data-size={size}
  data-orientation={orientation}
  data-width={width}
  data-baseline={baseline}
  data-disabled={disabled ? "" : undefined}
>
  <div class="cs-tabs-list-shell" data-overflowing?>
    <!-- Optional horizontal prev chevron <button class="cs-tabs-scroll-btn" ...> with <HitArea /> -->
    <div class="cs-tabs-viewport" {@attach scrollFade(...)}>
      <div
        class="cs-tabs-list"
        role="tablist"
        aria-orientation={orientation}
        data-arrow-nav?
        {@attach rovingFocus(...)}
      >
        <div class="cs-tabs-indicator" aria-hidden="true" data-ready? data-dir={dir} data-active?></div>

        <!-- Button tab -->
        <button
          type="button"
          class="cs-tabs-trigger"
          id={triggerId}
          role="tab"
          aria-selected={isSelected}
          aria-controls={panelId}
          disabled={isDisabled}
          data-value={value}
          data-selected={isSelected ? "" : undefined}
          data-disabled={isDisabled ? "" : undefined}
        >
          <span class="cs-tabs-trigger-content">...</span>
        </button>

        <!-- Or link tab (when href is provided) -->
        <a
          class="cs-tabs-trigger"
          href={href}
          id={triggerId}
          aria-current={isSelected ? "page" : undefined}
          aria-disabled={isDisabled ? "true" : undefined}
          data-value={value}
          data-selected={isSelected ? "" : undefined}
          data-disabled={isDisabled ? "" : undefined}
        >
          <span class="cs-tabs-trigger-content">...</span>
        </a>
      </div>
    </div>
    <!-- Optional horizontal next chevron <button class="cs-tabs-scroll-btn" ...> with <HitArea /> -->
  </div>

  <!-- Optional TabsPanel(s) -->
  <div
    class="cs-tabs-panel"
    id={panelId}
    role="tabpanel"
    aria-labelledby={triggerId}
    tabindex="0"
    data-value={value}
    data-selected={isSelected ? "" : undefined}
    hidden={!isSelected || undefined}
  >
    ...
  </div>
</div>
```

### WAI-ARIA, ID Pairing & Tablist-Only / Link Mode

- **Dynamic ID Pairing:** `Tabs` generates a root ID via `$props.id()` and maintains reactive `SvelteMap<string, string>` registries for mounted `TabsTrigger`s and `TabsPanel`s.
  - `TabsTrigger` sets `aria-controls={registeredPanelId}` **only when a matching `TabsPanel` is registered**. In tablist-only or link-navigation mode without `TabsPanel`s, `aria-controls` is omitted (`undefined`) so no dangling ID references exist.
  - `TabsPanel` sets `aria-labelledby={registeredTriggerId}`.
- **Link Tabs (`href`):** When `href` is provided, `TabsTrigger` renders a native `<a>` without `role="tab"`, using `aria-current={isSelected ? "page" : undefined}` so screen readers announce it as a link and preserve browser link menus. Disabled link tabs omit `href` (or prevent click) and set `aria-disabled="true"` + `tabindex="-1"`.
- **Roving `tabindex` & Keyboard Navigation:**
  - Managed on `.cs-tabs-list` via `rovingFocus` (`src/modules/focus/index.ts`) with `orientation: () => orientation`, `loop: () => loop`, `homeEnd: true`, `dir: "auto"`, `items: ".cs-tabs-trigger:not(:disabled, [aria-disabled='true'])"`.
  - `onActiveChange`: When `reason === "keyboard"`, sets `isArrowNav = true`, calls `scrollItemIntoView(activeItem)`, and—if `activationMode === "automatic"`—selects `activeItem.dataset.value`.
  - In `activationMode === "manual"`, `Enter` or `Space` on a focused button tab triggers `onclick` and selects it.
  - `isArrowNav` (`data-arrow-nav`) clears on `pointerdown` or `focusout` leaving `.cs-tabs-list`.

### Pointer & Touch Interaction

- **Desktop Button Tabs (`!href`):** Activate immediately on `onpointerdown` when `event.button === 0 && event.pointerType !== "touch" && !isDisabled && !event.defaultPrevented`.
- **Touch Guard (`pointerType === "touch"`):** Defer activation to `onclick` so horizontal swipe-scrolling over `TabsList` never triggers accidental tab switches.
- **Link Tabs (`href`):** Never activate on `pointerdown`. Handle `onclick` only for unmodified primary clicks (`event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented`), preserving middle-click, `Cmd/Ctrl+click`, and drag-away cancel.

### `TabsPanel` Lifecycle (`keepMounted`)

- **Default (`keepMounted = false`):** Inactive panels are unmounted (`{#if isSelected}`) so heavy tab views (tables, charts, forms) incur zero DOM/effect cost until visited.
- **Opt-In (`keepMounted = true`):** Panels stay mounted with the native `hidden={!isSelected}` attribute (preserving internal DOM, scroll position, and form state). `TabsPanel` also accepts a per-panel `keepMounted` prop overriding root `Tabs`.

---

## 4. Visual & Motion Contract

- **CSS Layer:** Lives in `@layer components.composite` (`tabs.css`).
- **Surface, Baseline & Orientation:**
  - Borderless, open-air typographic strip (`tabs.design.md`) using a single typographic line architecture (no `variant` prop).
  - `1px` hairline (`--cs-tabs-baseline-color`) along `inset-block-end: 0` (horizontal) or `inset-inline-start: 0` (vertical), spanning `"full"` (container), `"content"` (track), or `"none"`. Active `2px` (`2.5px` on `xl`) indicator bar overlaps the hairline.
  - **Vertical "Connected Spine":** Vertical tabs use start-aligned typography (`justify-content: flex-start; text-align: start;`) and pair the `2px` bar with a subtle `--cs-color-base-soft` `::before` row tint on `[data-selected]` and inactive `:hover`. `::before` (`z-index: -1`) docks flush against the vertical axis (`inset-block: 1px; inset-inline: 0;`) with square start corners (`border-start-start-radius: 0; border-end-start-radius: 0;`) and rounded end corners (`border-start-end-radius: var(--cs-tabs-radius); border-end-end-radius: var(--cs-tabs-radius); corner-shape: var(--cs-tabs-squircle);`), forming a unified rail-anchored flag behind the `2px` indicator.
  - **Monochrome Default:** `--cs-tabs-indicator-color` defaults to `--cs-color-text-strong`; consumers may override `--cs-tabs-indicator-color: var(--cs-color-accent-solid)` without structural changes.
- **Zero Layout Shift & Press Physics:**
  - Rest and active tabs both use `font-weight: 500` and `white-space: nowrap`.
  - `:active` applies `scale: 0.98` to `.cs-tabs-trigger-content` **only on inactive, enabled tabs** (`:not([data-selected], :disabled, [aria-disabled="true"], [data-disabled]):active`)—never on already-selected tabs, `.cs-tabs-list`, or `.cs-tabs-indicator`—with `will-change: scale` and integer `--cs-tabs-line-height` to prevent Chromium subpixel text blur.
- **Push-Pull WAAPI `clip-path` Indicator (`tabs-indicator.internal.ts`):**
  - `.cs-tabs-indicator` spans the full `.cs-tabs-list` track (`position: absolute`), rests at `clip-path: inset(...)` driven by `--cs-tabs-clip-start` / `--cs-tabs-clip-end`, and animates via WAAPI `indicatorEl.animate(keyframes, { duration, easing: "linear", fill: "none" })` using sampled `clip-path: inset(...)` keyframes from `buildPushPullKeyframes`.
  - **Measurement & Mid-Flight Interruption:** Uses `activeEl.offsetLeft` / `offsetWidth` (horizontal) and `activeEl.offsetTop` / `offsetHeight` (vertical) relative to `trackEl.scrollWidth` / `scrollHeight`—immune to scroll offsets and `:active` `scale()` transforms. Mid-flight clicks read `getComputedStyle(indicatorEl).clipPath` via `parseComputedClipPath`, cancel the active WAAPI animation, and launch from the exact interpolated edges.
  - **Direction & Inverse-Calibrated Distance Timing:** Comparing `nextStart` vs `prevStart` sets `data-dir="forward" | "backward"`. Both edges evaluate `--cs-ease-quint-out` (`cubic-bezier(0.22, 1, 0.36, 1)`) for monotonic deceleration without overshoot, with inverse-calibrated trailing offsets capping peak stretch to `~24px–43px` across all container widths. Using start-to-start delta $\Delta = |x_{\text{next}} - x_{\text{prev}}|$:
    - **Leading Edge:** `--cs-ease-quint-out`, `0ms` delay, $T_{\text{lead}} = \text{clamp}(170\text{ms},\ 160 + 0.13 \cdot \Delta,\ 265\text{ms})$ (`170ms`–`265ms`)
    - **Trailing Edge:** `--cs-ease-quint-out`, $D_{\text{trail}} = \text{clamp}(0\text{ms},\ 16 - 0.05 \cdot \Delta,\ 12\text{ms})$ (`0ms`–`12ms`), $T_{\text{trail}} = T_{\text{lead}} + \text{clamp}(36\text{ms},\ 64 - 0.035 \cdot \Delta,\ 60\text{ms})$ (`~230ms`–`301ms`)
  - **First-Paint Flicker Guard:** Initial clip offsets are applied synchronously before `[data-ready]` is set; `[data-ready=""]` is enabled inside `requestAnimationFrame` after first paint.
  - **Layout & Font Sync:** `ResizeObserver` on `viewportEl`, `trackEl`, and `activeEl` re-syncs clip offsets on container resize, `width="equal"` reflows, or async font-load metric changes.
  - **Reduced Motion:** `prefers-reduced-motion: reduce` skips WAAPI animation and snaps clip offsets instantaneously.
- **Overflow & Step Scroll (`tabs-scroll.internal.ts`):**
  - Horizontal `TabsList` uses `scrollFade` (`overflow-x: auto; scrollbar-width: none;`) with optional prev/next chevron `<button>`s (`.cs-tabs-scroll-btn` with `<HitArea />` for compact targets) when overflowing, matching `SegmentedControl`.
  - **Surface-Agnostic Scroll Chevrons:** `.cs-tabs-scroll-btn::before` uses alpha-composited neutral tokens (`--cs-color-base-soft` at rest with `--cs-color-text-weak` icon, `--cs-color-base-soft-hover` on `:hover` with `--cs-color-text-strong` icon, and `scale: 0.92` on `:active`) instead of a white background or drop shadow, ensuring consistent contrast on both `--cs-color-canvas` and `--cs-color-elevated` surfaces in light and dark mode.
  - Vertical `TabsList` stacks naturally without horizontal scroll or chevrons.

---

## 5. Edge Cases & Constraints

- **Browser Support:** Targets modern Chromium (`@property`, `corner-shape` squircle, `clip-path: inset(... round ...)`); non-supporting engines degrade gracefully to instant clip updates or standard `border-radius`.
- **Nested Tabs:** Use direct-child / scoped selectors where appropriate so nested `Tabs` instances never inherit ancestor `data-selected`, `data-orientation`, or indicator styles.
- **No Unbounded `value` Flicker:** If `value` does not match any mounted `TabsTrigger`, `hasActiveIndicator` is `false` and `.cs-tabs-indicator` hides cleanly (`opacity: 0`) without throwing.
- **Localization:** Built-in `aria-label` defaults for horizontal scroll prev/next chevron buttons use `t({ de, en })` from `src/shared/lang.internal.ts`.

---

## 6. Verification & Preview Plan

- **Unit & DOM Tests (`src/modules/tabs/Tabs.svelte.test.ts`):**
  - Pure unit tests for `tabs-indicator.internal.ts` (clip offset math, `forward`/`backward` direction, distance-calibrated duration/delay clamping) and `tabs-scroll.internal.ts`.
  - Component tests: `bind:value` + `onValueChange`, `size`/`orientation`/`width`/`baseline` `data-*` attributes, `disabled` propagation, WAI-ARIA `role` / `aria-selected` / `aria-controls` / `aria-labelledby` (and omission of `aria-controls` in tablist-only mode), `rovingFocus` keyboard navigation (`ArrowLeft/Right/Up/Down`, `Home/End`, `loop`, `activationMode="manual"`), `pointerdown` vs `touch` `click`, `href` link mode (unmodified vs modifier clicks), `keepMounted={false}` vs `true`, and `ResizeObserver` / overflow chevron behavior.
- **Interactive Preview (`src/modules/tabs/Tabs.preview.svelte`):**
  - Showcases `horizontal` vs `vertical`, `width="content" | "equal"`, `baseline="full" | "content" | "none"`, `size="xs" | "sm" | "md" | "lg" | "xl"`, `--cs-tabs-indicator-color` accent override, `TabsIcon` + `tabular-nums` `Badge`, horizontal overflow scrolling, and `href` link navigation.
