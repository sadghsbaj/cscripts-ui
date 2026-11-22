# Sidebar Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (compound application-shell navigation container: `Sidebar`, `SidebarHeader`, `SidebarSubheader`, `SidebarBody`, `SidebarPinned`, `SidebarFooter`, `SidebarSection`, `SidebarSectionHeader`, `SidebarSectionLabel`, `SidebarGroup`, `SidebarGroupTrigger`, `SidebarGroupContent`, `SidebarItemRow`, `SidebarItem`, `SidebarItemIcon`, `SidebarItemLabel`, `SidebarItemActions`, `SidebarToggle`, `SidebarViews`, `SidebarView`)
- **Purpose:** A composable, borderless application sidebar supporting edge-docked and floating-island presentations, two distinct collapse strategies (`"rail"` icon-strip collapse and `"hidden"` full hide), both in-flow (`"inline"`) and off-canvas drawer (`"overlay"`) behaviors, collapsible nested navigation groups, hover/context-menu item actions, and multi-view drill-down navigation (`SidebarViews` / `SidebarView`).
- **Comparison with Sibling Modules:**
  - **`Splitter`:** Owns manual pointer-drag pane resizing and `role="separator"` split gutters. `Sidebar` does **not** implement drag resizing; instead it composes standalone OR directly inside a `<SplitterPane>` via `width="fill"`.
  - **`Collapsible`:** Lean structural disclosure primitive (`0fr -> 1fr` / `inert` / post-exit `visibility: hidden`). `SidebarGroupContent`, `SidebarSection`, and `SidebarSubheader` compose `{ Collapsible }` directly from `src/modules/collapsible/index.ts`.
  - **`Card`:** Static content surface container sharing the `"sm" | "md" | "lg"` scale and borderless squircle elevation philosophy.
  - **`Overlay` / `Focus`:** Top-layer backdrop + scroll-lock (`Overlay`) and focus trapping (`focusTrap`), composed by `Sidebar` when `behavior="overlay"` is active.
  - **`ScrollArea` / `ScrollFade`:** Powers `SidebarBody`'s inner vertical scrollport (`scrollbar="hover"`) and optional edge fade masks.
  - **`VirtualScroll`:** Windowed list virtualizer for 1,000+ flat rows; intentionally decoupled from `SidebarBody`'s default `ScrollArea` + `Collapsible` flow via `scrollable={false}` (see Section 5).
- **Boundaries:**
  - **Owns:** Sidebar shell layout, `"elevated" | "floating" | "transparent"` surface styling, `open` expand/collapse state and layout-shift-free animations, icon-rail geometry and automatic rail tooltips, semantic navigation sections/items/groups, valid sibling row-actions layout (3-dot hover menus without nested `<button>`s), and `SidebarViews` drill-down transitions with focus handoff.
  - **Does not** mandate any internal regions—header branding, top-right actions, subheader `SegmentedControl`, pinned regions, footer profile/CTAs, and internal toggles are 100% optional via children/snippet composition.
  - **Out of scope:** Pointer drag-resizing (use `Splitter`), built-in `localStorage` persistence (bind `open` / `value` externally), and virtualized tree folding inside `<Collapsible>`.

---

## 2. Public API

### Module File Layout (`src/modules/sidebar/`)

- **Public entry point:** `index.ts` (never re-exports `*.internal.*`)
- **Public source files:**
  - `Sidebar.svelte` — Root layout shell, `Overlay` integration for `"overlay"` behavior, and `SidebarContext` provider.
  - `SidebarHeader.svelte`, `SidebarSubheader.svelte`, `SidebarBody.svelte`, `SidebarPinned.svelte`, `SidebarFooter.svelte` — Optional vertical shell regions.
  - `SidebarSection.svelte`, `SidebarSectionHeader.svelte`, `SidebarSectionLabel.svelte` — Optional labeled/unlabeled or collapsible navigation sections.
  - `SidebarGroup.svelte`, `SidebarGroupTrigger.svelte`, `SidebarGroupContent.svelte` — Collapsible parent items and nested sub-item containers composing `<Collapsible>`.
  - `SidebarItemRow.svelte`, `SidebarItem.svelte`, `SidebarItemIcon.svelte`, `SidebarItemLabel.svelte`, `SidebarItemActions.svelte` — Interactive links/buttons, icon/label slots, and hover-revealed trailing action overlays.
  - `SidebarToggle.svelte` — Composable collapse/expand toggle button (works both inside `Sidebar` via context and externally via `bind:open` / `aria-controls`).
  - `SidebarViews.svelte`, `SidebarView.svelte` — Animated drill-down multi-view stage with automatic navigation stack direction and focus management.
  - `sidebar.css` — `@layer components.composite` styles and `--cs-sidebar-*` variables.
  - `sidebar.types.ts` — Public types and `UPPER_SNAKE_CASE` option constants.
  - `sidebar.context.ts` — `createContext()` typed helpers (`getSidebarContext`, `setSidebarContext`, `hasSidebarContext`, `getSidebarGroupContext`, `setSidebarGroupContext`, `hasSidebarGroupContext`, `getSidebarViewsContext`, `setSidebarViewsContext`, `hasSidebarViewsContext`).
- **Internal modules (never exported):**
  - `sidebar-views.internal.ts` — History stack / direction resolution and focus-handoff helpers for `SidebarViews`.
- **Co-located docs/preview/tests:** `sidebar.blueprint.md`, `sidebar.docs.md`, `Sidebar.preview.svelte`, `sidebar.svelte.test.ts`.

### Exports (`src/modules/sidebar/index.ts`)

Flat `PascalCase` compound exports (no dot-notation, no `*.internal.*` exports):

- **Components:**
  - `Sidebar`, `SidebarHeader`, `SidebarSubheader`, `SidebarBody`, `SidebarPinned`, `SidebarFooter`
  - `SidebarSection`, `SidebarSectionHeader`, `SidebarSectionLabel`
  - `SidebarGroup`, `SidebarGroupTrigger`, `SidebarGroupContent`
  - `SidebarItemRow`, `SidebarItem`, `SidebarItemIcon`, `SidebarItemLabel`, `SidebarItemActions`
  - `SidebarToggle`
  - `SidebarViews`, `SidebarView`
- **Context Helpers & Types:**
  - `getSidebarContext`, `setSidebarContext`, `hasSidebarContext`, `type SidebarContext`
  - `getSidebarGroupContext`, `setSidebarGroupContext`, `hasSidebarGroupContext`, `type SidebarGroupContext`
  - `getSidebarViewsContext`, `setSidebarViewsContext`, `hasSidebarViewsContext`, `type SidebarViewsContext`
- **Option Arrays & Types:**
  - `SIDEBAR_VARIANTS = ["elevated", "floating", "transparent"] as const` -> `SidebarVariant`
  - `SIDEBAR_SIZES = ["sm", "md", "lg"] as const` -> `SidebarSize`
  - `SIDEBAR_SIDES = ["start", "end"] as const` -> `SidebarSide`
  - `SIDEBAR_BEHAVIORS = ["inline", "overlay"] as const` -> `SidebarBehavior`
  - `SIDEBAR_COLLAPSE_MODES = ["hidden", "rail"] as const` -> `SidebarCollapseMode`
  - `SIDEBAR_ELEMENTS = ["aside", "nav"] as const` -> `SidebarElement`
  - `SIDEBAR_VIEW_TRANSITIONS = ["slide", "fade", "none"] as const` -> `SidebarViewTransition`
  - `SIDEBAR_VIEW_DIRECTIONS = ["auto", "forward", "backward"] as const` -> `SidebarViewDirection`
  - `SidebarProps`, `SidebarHeaderProps`, `SidebarSubheaderProps`, `SidebarBodyProps`, `SidebarPinnedProps`, `SidebarFooterProps`, `SidebarSectionProps`, `SidebarSectionHeaderProps`, `SidebarSectionLabelProps`, `SidebarGroupProps`, `SidebarGroupTriggerProps`, `SidebarGroupContentProps`, `SidebarItemRowProps`, `SidebarItemProps`, `SidebarItemIconProps`, `SidebarItemLabelProps`, `SidebarItemActionsProps`, `SidebarToggleProps`, `SidebarViewsProps`, `SidebarViewProps`

> **Naming Rule Compliance:** `open = $bindable(true)` is the canonical state prop (`checked, pressed, open`), `current` maps to `aria-current` on `SidebarItem` (never `active`), `width` is used for non-T-shirt sizing (`"fill"` or custom CSS length), and `size` is strictly reserved for `"sm" | "md" | "lg"`.

### Props

#### `SidebarProps` (`extends Omit<HTMLAttributes<HTMLElement>, "children">`)

`variant` and `size` **MUST NOT** have default values—call sites must choose both explicitly.

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` | `null` | `$bindable()`, bound to root `.cs-sidebar` element. |
| `variant` | `SidebarVariant` | *required* | `"elevated" \| "floating" \| "transparent"` surface treatment. |
| `size` | `SidebarSize` | *required* | `"sm" \| "md" \| "lg"` T-shirt scale for width, rail width, density, typography, and radii. |
| `as` | `SidebarElement` | `"aside"` | Semantic landmark tag (`"aside"` or `"nav"`). |
| `side` | `SidebarSide` | `"start"` | Edge alignment (`"start"` or `"end"`), governing directional shadow, rail placement, and slide direction. |
| `open` | `boolean` | `true` | `$bindable()`, controls expanded (`true`) vs. collapsed (`false`) state. |
| `onOpenChange` | `(open: boolean) => void` | `undefined` | Fires when `open` changes via `SidebarToggle`, Escape, or overlay backdrop dismissal. |
| `behavior` | `SidebarBehavior` | `"inline"` | `"inline"` (in-flow push/pull) or `"overlay"` (top-layer off-canvas drawer with backdrop & focus trap). |
| `collapseMode` | `SidebarCollapseMode` | `"hidden"` | Collapse behavior when `behavior="inline"`: `"hidden"` (collapses to `0px`) or `"rail"` (shrinks to slim icon strip). Ignored in `"overlay"` (always hides off-canvas). |
| `width` | `"fill" \| (string & {}) \| undefined` | `undefined` | Expanded width override (e.g. `"280px"`, or `"fill"` to fill `100%` of a parent `SplitterPane`). |
| `railWidth` | `string \| undefined` | `undefined` | Collapsed rail width override when `collapseMode="rail"`. |
| `overlayVariant` | `OverlayVariant` | `"dim"` | Backdrop `<Overlay>` variant when `behavior="overlay"`. |
| `animate` | `boolean` | `true` | Enables/disables collapse, hide, and drawer transitions (suppressed on initial mount and under reduced motion). |
| `id` | `string` | `$props.id()` | Root ID for `aria-controls` wiring with `SidebarToggle`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-sidebar", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Arbitrary region and navigation children. |
| `...rest` | `HTMLAttributes<HTMLElement>` | — | Forwarded to root `.cs-sidebar`. |

#### Shell Region Props

- **`SidebarHeaderProps`**, **`SidebarPinnedProps`**, **`SidebarFooterProps`** (`extends HTMLAttributes<HTMLDivElement>`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `class`, `children`, `...rest`.
- **`SidebarSubheaderProps`** (`extends HTMLAttributes<HTMLDivElement>`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `railBehavior?: "collapse" | "keep"` (default `"collapse"` — automatically collapses smoothly & sets `inert` in `"rail"` mode so controls like `<SegmentedControl>` never squish), `class`, `children`, `...rest`.
- **`SidebarBodyProps`** (`extends HTMLAttributes<HTMLDivElement>`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `scrollable?: boolean` (default `true` — renders internal `<ScrollArea direction="vertical" scrollbar="hover">`; set `false` when mounting `<VirtualScroll>` directly inside), `scrollbar?: ScrollAreaScrollbar` (default `"hover"`), `fade?: boolean | ScrollFadeSize` (default `false` — enables `scrollFade` edge mask when `scrollable={true}`), `class`, `children`, `...rest`.

#### Section & Group Props

- **`SidebarSectionProps`** (`extends HTMLAttributes<HTMLElement>`):
  - `ref?: HTMLElement | null` (`$bindable(null)`), `collapsible?: boolean` (default `false`), `open?: boolean` (`$bindable(true)`), `onOpenChange?: (open: boolean) => void`, `animate?: boolean` (inherits root `animate`), `class`, `children`, `...rest`.
- **`SidebarSectionHeaderProps`** (`extends HTMLAttributes<HTMLDivElement>`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `class`, `children`, `...rest`.
- **`SidebarSectionLabelProps`** (`extends HTMLAttributes<HTMLElement>`):
  - `ref?: HTMLElement | null` (`$bindable(null)`), `as?: "div" | "h2" | "h3" | "h4" | "span"` (default `"div"`; renders `<button type="button">` automatically when parent `SidebarSection` has `collapsible={true}`), `class`, `children`, `...rest`.
- **`SidebarGroupProps`** (`extends HTMLAttributes<HTMLDivElement>`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `open?: boolean` (`$bindable(false)`), `onOpenChange?: (open: boolean) => void`, `disabled?: boolean` (default `false`), `keepMounted?: boolean` (default `true`, forwarded to `<Collapsible>`), `animate?: boolean` (inherits root `animate`), `class`, `children`, `...rest`.
- **`SidebarGroupTriggerProps`** (`extends Omit<HTMLButtonAttributes, "type">`):
  - `ref?: HTMLButtonElement | null` (`$bindable(null)`), `icon?: Component<SidebarIconComponentProps>`, `indicator?: Snippet<[{ open: boolean }]> | false` (default built-in rotating chevron; `false` hides indicator), `tooltip?: string | boolean` (composes `tooltip` from `../tooltip/index.ts` via `{@attach tooltip({ text, placement, enabled: () => ... })}` whenever `tooltip` is provided or rail mode is active), `iconOnly?: boolean` (for Pattern B split link + chevron inside `SidebarItemRow`), `current?: boolean | AriaCurrent`, `disabled?: boolean`, `class`, `children`, `...rest`.
- **`SidebarGroupContentProps`** (`extends Omit<CollapsibleProps, "open">`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `class`, `children`, `...rest` (forwards to `<Collapsible>`).

#### Item & Toggle Props

- **`SidebarItemRowProps`** (`extends HTMLAttributes<HTMLDivElement>`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `class`, `children`, `...rest`. Container pairing a full-row `<SidebarItem>` with sibling `<SidebarItemActions>` without nesting interactive `<button>` elements.
- **`SidebarItemProps`** (polymorphic on `href`):
  - When `href` is provided: renders `<a {href} ...>`, `ref?: HTMLAnchorElement | null`, `Omit<HTMLAnchorAttributes, "color">`.
  - When `href` is omitted: renders `<button type="button" ...>`, `ref?: HTMLButtonElement | null`, `Omit<HTMLButtonAttributes, "type" | "color">`.
  - Shared props: `current?: boolean | "page" | "step" | "location" | "date" | "time" | "true"` (default `false`), `negative?: boolean` (default `false`, calm at rest, negative highlight on hover/focus), `disabled?: boolean` (default `false`), `icon?: Component<SidebarIconComponentProps>`, `badge?: Snippet` (or slotted `<Badge>` inside `children`), `tooltip?: string | boolean` (composes `tooltip` from `../tooltip/index.ts` via `{@attach tooltip({ text, placement, enabled: () => ... })}` whenever `tooltip` is provided or rail mode is active; `true` reads `SidebarItemLabel` text), `class`, `children`, `...rest` (including `{@attach contextMenuTrigger(...)}` and manual `{@attach tooltip(...)}`).
- **`SidebarItemIconProps`** (`extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`):
  - `icon: Component<SidebarIconComponentProps>`, `color?: string`, `strokeWidth?: number | string`.
- **`SidebarItemLabelProps`** (`extends HTMLAttributes<HTMLSpanElement>`):
  - `ref?: HTMLSpanElement | null` (`$bindable(null)`), `class`, `children`, `...rest`.
- **`SidebarItemActionsProps`** (`extends HTMLAttributes<HTMLDivElement>`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `alwaysVisible?: boolean` (default `false` — revealed on row `:hover`, `:focus-within`, or open child menu `[data-open]`/`[aria-expanded="true"]`), `class`, `children`, `...rest`.
- **`SidebarToggleProps`** (`extends Omit<HTMLButtonAttributes, "type">`):
  - `ref?: HTMLButtonElement | null` (`$bindable(null)`), `open?: boolean` (`$bindable()` — auto-binds to `SidebarContext.open` when inside `Sidebar`, or controls external state when outside), `sidebarId?: string` (overrides `aria-controls` when placed outside `<Sidebar>`), `variant?: ButtonVariant` (default `"ghost"`), `size?: ButtonSize` (defaults proportionally from `SidebarContext.size`: `sm -> "xs"`, `md -> "sm"`, `lg -> "md"`), `iconOnly?: boolean` (default `true`, renders `<HitArea />` when compact), `label?: string` (localized default via `t({ de, en })`), `class`, `children`, `...rest`.

#### Multi-View Props

- **`SidebarViewsProps<T extends string = string>`** (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `value: T` (`$bindable()`), `onValueChange?: (value: T) => void`, `transition?: SidebarViewTransition` (default `"slide"`), `direction?: SidebarViewDirection` (default `"auto"`), `keepMounted?: boolean` (default `false`), `animate?: boolean` (default `true`), `class`, `children`, `...rest`.
- **`SidebarViewProps<T extends string = string>`** (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`):
  - `ref?: HTMLDivElement | null` (`$bindable(null)`), `value: T` (*required*), `label?: string`, `initialFocus?: "auto" | "none" | HTMLElement | (() => HTMLElement | null)` (default `"auto"`), `class`, `children`, `...rest`.

### Rail Visibility Helper Attribute (`data-sidebar-rail`)

For arbitrary consumer markup inside `SidebarHeader`, `SidebarPinned`, or `SidebarFooter` (such as brand wordmarks, user email subtitles, or secondary buttons):
- `data-sidebar-rail="hide"` — smoothly fades (`opacity: 0`) and collapses inline/block footprint when `Sidebar` is in rail-collapsed mode (`!open && collapseMode === "rail"`), setting `pointer-events: none` and `visibility: hidden` post-transition.
- `data-sidebar-rail="only"` — hidden while expanded, revealed only when rail-collapsed.
*(Note: `SidebarItemLabel`, `SidebarSectionLabel`, `SidebarSubheader`, `SidebarItemActions`, and `SidebarGroupContent` handle rail behavior automatically without needing this attribute.)*

### CSS Custom Properties (`--cs-sidebar-*`)

All library styles live in `sidebar.css` inside `@layer components.composite`:

| Variable | Purpose |
| :--- | :--- |
| `--cs-sidebar-width` | Expanded inline size of `.cs-sidebar-surface` (`224px` / `260px` / `300px` by `size`; `floating` outer shell adds `var(--cs-sidebar-floating-inset) * 2`). |
| `--cs-sidebar-rail-width` | Rail-collapsed inline size of `.cs-sidebar-surface` (`52px` / `60px` / `68px` by `size`; `floating` outer shell adds `var(--cs-sidebar-floating-inset) * 2`). |
| `--cs-sidebar-floating-inset` | Outer inset padding around `.cs-sidebar-surface` in `variant="floating"` (`8px` / `10px` / `12px` by `size`). |
| `--cs-sidebar-padding-x` | Horizontal inner padding (`8px` / `10px` / `12px` by `size`). |
| `--cs-sidebar-padding-y` | Vertical outer region padding (`8px` / `10px` / `12px` by `size`). |
| `--cs-sidebar-bg` | Surface background (`--cs-color-elevated` or `transparent`). |
| `--cs-sidebar-fg` | Base text color (`--cs-color-text-main`). |
| `--cs-sidebar-shadow` | Surface shadow (directional elevated inner-edge shadow/rim, `--cs-shadow-floating`, or `none`). |
| `--cs-sidebar-radius` | Outer surface radius (`0px` for `elevated`/`transparent`; `16px` (`--cs-radius-2xl`) / `20px` / `24px` (`--cs-radius-3xl`) for `floating`). |
| `--cs-sidebar-squircle` | Superellipse `corner-shape` (`var(--cs-squircle)`). |
| `--cs-sidebar-section-gap` | Vertical whitespace separating sections (`14px` / `18px` / `22px` by `size`, no `<hr>`). |
| `--cs-sidebar-item-height` | Expanded item row height (`30px` / `34px` / `40px` by `size`). |
| `--cs-sidebar-rail-item-height` | Square rail-mode item height (`36px` / `40px` / `44px` by `size`). |
| `--cs-sidebar-rail-gap` | Vertical gap between items in rail-collapsed mode (`4px`). |
| `--cs-sidebar-item-padding-x` | Item horizontal padding (`8px` / `10px` / `11px` by `size`). |
| `--cs-sidebar-item-gap` | Gap between icon, label, and trailing badge (`8px` / `10px` / `12px` by `size`). |
| `--cs-sidebar-item-radius` | Concentric item highlight pill radius (`8px` (`--cs-radius-lg`) / `10px` / `12px` (`--cs-radius-xl`) by `size`). |
| `--cs-sidebar-item-bg-hover` | Item hover surface (`--cs-color-base-soft`). |
| `--cs-sidebar-item-bg-current` | Current/selected item surface (`--cs-color-accent-soft`). |
| `--cs-sidebar-item-fg-current` | Current/selected item foreground (`--cs-color-accent-soft-fg`). |
| `--cs-sidebar-actions-reserve` | Trailing `padding-inline-end` reserve when `SidebarItemActions` reveals on a badge-less row, `alwaysVisible`, or touch (`30px` / `32px` / `36px` by `size`). |
| `--cs-sidebar-icon-box` | Fixed leading icon box width (`20px` / `20px` / `22px`) preserving the rail center invariant. |
| `--cs-sidebar-icon-size` | Leading SVG icon size (`16px` / `18px` / `20px` by `size`). |
| `--cs-sidebar-indent` | Per-level nested `SidebarGroup` indentation (`16px` / `20px` / `22px`). |
| `--cs-sidebar-dur-enter` | Width/expand transition duration (`var(--cs-dur-240)`). |
| `--cs-sidebar-dur-exit` | Full-hide (`hidden`) collapse transition duration (`var(--cs-dur-180)`). |
| `--cs-sidebar-dur-rail-exit` | Rail-mode collapse transition duration (`var(--cs-dur-200)`). |
| `--cs-sidebar-dur-rail-delay` | Label fade-in delay on rail expand (`var(--cs-dur-60)`). |
| `--cs-sidebar-dur-fade` | Label & action fade duration (`var(--cs-dur-140)` / `var(--cs-dur-100)` exit). |
| `--cs-sidebar-ease` | Primary spatial easing (`var(--cs-ease-quart-out)`). |
| `--cs-sidebar-view-shift` | `SidebarViews` slide travel distance (`20px`). |

---

## 3. DOM, Semantics & Accessibility

### DOM Structure & Selectors

```html
<!-- In behavior="overlay", wrapped in <Overlay class="cs-sidebar-overlay" variant={overlayVariant}> -->
<aside
  class="cs-sidebar"
  id={id}
  aria-label={resolvedLabel}
  data-variant={variant}
  data-size={size}
  data-side={side}
  data-behavior={effectiveBehavior}
  data-collapse-mode={effectiveCollapseMode}
  data-open={open ? "" : undefined}
  data-state={state}
  data-width={width === "fill" ? "fill" : undefined}
  data-animate={animate && ready ? "" : undefined}
>
  <div class="cs-sidebar-surface" inert={isFullyHidden ? true : undefined}>
    <!-- Optional regions in arbitrary consumer order -->
    <div class="cs-sidebar-header">...</div>
    <div class="cs-sidebar-subheader">...</div>
    <div class="cs-sidebar-pinned">...</div>

    <div class="cs-sidebar-body">
      <ScrollArea size={scrollAreaSize} direction="vertical" scrollbar={scrollbar}>
        <ScrollAreaContent class="cs-sidebar-scroll-content">
          <section class="cs-sidebar-section" aria-labelledby={labelId}>
            <div class="cs-sidebar-section-header">
              <div class="cs-sidebar-section-label" id={labelId}>...</div>
            </div>

            <div class="cs-sidebar-item-row">
              <a class="cs-sidebar-item" href="/..." aria-current="page" data-current>
                <span class="cs-sidebar-item-icon" aria-hidden="true">...</span>
                <span class="cs-sidebar-item-label">...</span>
              </a>
              <div class="cs-sidebar-item-actions">...</div>
            </div>

            <div class="cs-sidebar-group" data-open? data-depth="1">
              <button type="button" class="cs-sidebar-item cs-sidebar-group-trigger" aria-expanded="..." aria-controls="...">...</button>
              <Collapsible class="cs-sidebar-group-content" open={effectiveGroupOpen}>...</Collapsible>
            </div>
          </section>
        </ScrollAreaContent>
      </ScrollArea>
    </div>

    <div class="cs-sidebar-footer">...</div>
  </div>
</aside>
```

- **Direct-child scoped selectors:** Key shell rules use direct-child selectors (`.cs-sidebar > .cs-sidebar-surface`, `.cs-sidebar-item-row > .cs-sidebar-item`) so nested `SidebarViews`, `Dropdown`, or nested `SidebarGroup` levels never leak styles across boundaries.

### Layout-Shift-Free Rail Geometry & `:focus-visible` Clearance

1. **The Golden Rail Alignment Invariant (Zero Horizontal Icon Jump):**
   - Across all sizes, `--cs-sidebar-padding-x + --cs-sidebar-item-padding-x + (--cs-sidebar-icon-box / 2) === --cs-sidebar-rail-width / 2`:
     - `sm`: `8px + 8px + 10px = 26px === 52px / 2`
     - `md`: `10px + 10px + 10px = 30px === 60px / 2`
     - `lg`: `12px + 11px + 11px = 34px === 68px / 2`
   - Leading icons (and `SidebarHeader`/`SidebarFooter` marks aligned to the same offset) never shift horizontally by even a subpixel between expanded and rail modes—no `justify-content` flipping or margin transitions needed.
2. **Non-Wrapping Text & Fixed Inner Layer:**
   - **`collapseMode="hidden"` (`behavior="inline"`):** `.cs-sidebar` animates `inline-size` (`var(--cs-sidebar-width) -> 0px`, or `calc(var(--cs-sidebar-width) + var(--cs-sidebar-floating-inset) * 2) -> 0px` for `floating`) and `padding-inline` (`--cs-sidebar-floating-inset -> 0px`) while `.cs-sidebar-surface` keeps a locked `inline-size: var(--cs-sidebar-width)` and nudges subtly (`translate: -12px 0` for `start`, `+12px 0` for `end`) with `opacity: 0`. Arbitrary consumer children never wrap or squish.
   - **`collapseMode="rail"` (`behavior="inline"`):** `.cs-sidebar` animates `inline-size` (`var(--cs-sidebar-width) -> var(--cs-sidebar-rail-width)`, adding `var(--cs-sidebar-floating-inset) * 2` on `variant="floating"` so `.cs-sidebar-surface` always stays `--cs-sidebar-rail-width`). `.cs-sidebar-item-label` locks `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` and fades `opacity` out ahead of the shrinking edge (`100ms` exit, delayed by `--cs-sidebar-dur-rail-delay` `60ms` on expand), while trailing badges/chevrons fade out (`opacity: 0; pointer-events: none;`) and collapse cleanly without disturbing the pinned leading icon.
3. **Zero `:focus-visible` Outline Clipping:**
   - Global `:focus-visible` (`src/css/foundation/focus.css`) draws `outline: 2px solid var(--cs-color-accent-solid); outline-offset: 2px;` (**4px** outside element bounds).
   - **Outer `.cs-sidebar`:** Keeps `overflow: visible;` while `open={true}` or `collapseMode="rail"`; switches to `overflow: clip;` only when `collapseMode="hidden"` and `data-state` is `"closing"` or `"closed"`.
   - **Scrollable `.cs-sidebar-body` (`<ScrollArea>`):** Because `ScrollArea` sets `overflow: hidden;` and `ScrollAreaContent` sets `overflow-x: hidden; overflow-y: auto;`, `<ScrollArea>` spans **full bleed** (`inline-size: 100%`) and the `8px–12px` `--cs-sidebar-padding-x` + `4px` vertical clearance live **inside `.cs-sidebar-scroll-content`**, guaranteeing at least `4px–8px` of breathing room between every focusable item and any clipping edge.
   - **Header, Pinned & Footer:** Keep `overflow: visible;` and `padding-inline: var(--cs-sidebar-padding-x)` (`>= 8px`) plus `>= 4px` block clearance.
   - **`.cs-sidebar-item`:** Focusable `<button>`/`<a>` keeps `overflow: visible;` (text clipping lives strictly on inner `.cs-sidebar-item-label`), so neither rest, hover, scrolling, nor rail collapse ever clips the focus ring.

### Semantics, Keyboard Navigation & Menu Composition

- **Landmarks & Labels:** Root defaults to `<aside aria-label={t({ de: "Seitenleiste", en: "Sidebar" })}>` (or `<nav>` via `as="nav"`). `SidebarSection` uses `<section aria-labelledby={labelId}>` when a `SidebarSectionLabel` is present.
- **Current Item (`aria-current`):** `SidebarItem` sets `aria-current={current === true ? (href ? "page" : "true") : current || undefined}` and `data-current={current ? "" : undefined}`.
- **Native Tab Navigation & Collapsible Wiring:** Items remain standard `<a href>` / `<button type="button">` elements in normal document `Tab` order (no forced roving-tabindex hijack over mixed links, inputs, `SegmentedControl`, and footer buttons). `SidebarGroupTrigger` and collapsible `SidebarSectionLabel` wire `aria-expanded` and `aria-controls` to their `<Collapsible>` IDs.
- **Hidden `inert` Lifecycle:** When fully hidden (`collapseMode="hidden"` or `behavior="overlay"` with `open={false}`), `.cs-sidebar-surface` receives `inert` immediately at close start and `visibility: hidden` once the exit transition settles; no initial-mount transition plays when mounting with `open={false}` or `open={true}`.
- **`ContextMenu` & Hover 3-Dot `Dropdown` Composition:**
  - `SidebarItem` forwards `{...rest}` directly to the `<button>`/`<a>` element, so `{@attach contextMenuTrigger()}` works natively. Because `ContextMenu` sets `data-open=""` on the active trigger while open, `.cs-sidebar-item[data-open]` keeps the item highlighted as if hovered until the menu dismisses.
  - Inside `SidebarItemRow`, `.cs-sidebar-item-actions` (hosting a 3-dot `<Button variant="ghost" size="xs" iconOnly {@attach dropdownTrigger()}>`) stays `opacity: 0; pointer-events: none;` at rest and reveals smoothly (`opacity: 1; pointer-events: auto;`) on `.cs-sidebar-item-row:is(:hover, :focus-within, :has([data-open]), :has([aria-expanded="true"]))`:
    - **In-Place Badge-to-Actions Cross-Swap:** When the row contains a trailing `<Badge>` (`:has(.cs-badge, .cs-sidebar-item-badge)`), the badge fades out in place (`opacity: 0; scale: 0.9;` over `--cs-dur-effect-fast`) as `.cs-sidebar-item-actions` fades in over the exact same trailing footprint—avoiding horizontal label jitter or badge collisions.
    - **Badge-less / Touch / `alwaysVisible` Fallback:** When no trailing badge is present (or on `@media (hover: none)` / `alwaysVisible={true}`), `.cs-sidebar-item` reserves `padding-inline-end: var(--cs-sidebar-actions-reserve)` (`30px` / `32px` / `36px`) so long labels and side-by-side badges yield clean space without overlapping or nesting `<button>` tags.
- **`SidebarViews` Focus Handoff:** When switching views while keyboard focus resides inside the outgoing `SidebarView`, `SidebarViews` moves focus (`preventScroll: true`) to `[data-autofocus]`, `initialFocus`, or the first focusable element (e.g. Back button) in the incoming `SidebarView` before marking the outgoing view `inert`.

---

## 4. Visual & Motion Contract

- **CSS Layer:** Lives in `@layer components.composite`.
- **Borderless Variants (No `<hr>` Dividers):**
  - **`elevated`:** Edge-docked `--cs-color-elevated` full-height surface with `border-radius: 0` and a subtle inner-edge directional shadow (whisper-soft ambient separation in light mode; `inset -1px 0 0 rgb(255 255 255 / 0.06)` rim on `side="start"` in dark mode) instead of a hard CSS border.
  - **`floating`:** Outer `.cs-sidebar` provides transparent `--cs-sidebar-floating-inset` padding (`8px` / `10px` / `12px`) and expands its outer footprint to `calc(--cs-sidebar-width + --cs-sidebar-floating-inset * 2)` (`calc(--cs-sidebar-rail-width + --cs-sidebar-floating-inset * 2)` when rail-collapsed) so `.cs-sidebar-surface` preserves full inner item width and the Golden Rail Alignment Invariant; `.cs-sidebar-surface` renders `--cs-color-elevated` with `--cs-shadow-floating`, concentric radius (`16px` `--cs-radius-2xl` / `20px` / `24px` `--cs-radius-3xl`), and `corner-shape: var(--cs-squircle)`.
  - **`transparent`:** `background-color: transparent`, `box-shadow: none`, `border-radius: 0`; separates purely through whitespace and item hover/current pills over the parent `canvas`.
- **Item States & Status:**
  - Resting: `bg: transparent`, `fg: var(--cs-color-text-main)`.
  - Hover: `bg: var(--cs-color-base-soft)`, `fg: var(--cs-color-text-strong)`.
  - Current (`[data-current]`): `bg: var(--cs-color-accent-soft)`, `fg: var(--cs-color-accent-soft-fg)` with `font-weight: 500`.
  - Negative (`negative` prop): calm monochrome at rest; reveals `--cs-color-negative-soft-fg` / `--cs-color-negative-soft` on `:hover`, `:focus-visible`, and `:active`.
  - Disabled: uses `--cs-color-disabled-fg` (`opacity: 1`, never lazy opacity dimming).
  - Item pills apply concentric `--cs-sidebar-item-radius` (`outerRadius - paddingX === itemRadius`: `8px` `--cs-radius-lg` / `10px` / `12px` `--cs-radius-xl`) and `corner-shape: var(--cs-squircle-smooth)` (shared with `SidebarToggle`).
- **Proportional `size` Scale (`sm | md | lg`):**
  - **`sm`:** `width: 224px`, `railWidth: 52px`, `itemHeight: 30px`, `railItemHeight: 36px`, `text: --cs-text-xs` (`13px` / `18px`), `icon: 16px`, `paddingX: 8px`, `floatingInset: 8px`, `radius: 16px` (`--cs-radius-2xl`), `itemRadius: 8px` (`--cs-radius-lg`), `actionsReserve: 30px`.
  - **`md`:** `width: 260px`, `railWidth: 60px`, `itemHeight: 34px`, `railItemHeight: 40px`, `text: --cs-text-sm` (`14px` / `20px`), `icon: 18px`, `paddingX: 10px`, `floatingInset: 10px`, `radius: 20px`, `itemRadius: 10px`, `actionsReserve: 32px`.
  - **`lg`:** `width: 300px`, `railWidth: 68px`, `itemHeight: 40px`, `railItemHeight: 44px`, `text: 15px` / `20px`, `icon: 20px`, `paddingX: 12px`, `floatingInset: 12px`, `radius: 24px` (`--cs-radius-3xl`), `itemRadius: 12px` (`--cs-radius-xl`), `actionsReserve: 36px`.
- **Hit Areas (`design-and-tokens.md`):**
  - Expanded `SidebarItem` rows exceed `1936px²` (`208×30 = 6240px²` at `sm`).
  - Compact icon-only `SidebarToggle` (`28×28` / `32×32` / `36×36`, all `< 1936px²`) includes `<HitArea size="sm" />`.
  - `SidebarItemActions` 3-dot buttons (`24×24` / `28×28`) omit vertical `<HitArea />` overflow under the tight-layout exception so they never steal clicks from adjacent rows.
  - In rail mode (`--cs-sidebar-rail-gap: 4px`), square rail items align to exact zero-overlap vertical pitch: `sm` (`36×36 = 1296px²`, `40px` pitch) mounts `<HitArea size="sm" />` (`40×40`), `md` (`40×40 = 1600px²`, `44px` pitch) mounts `<HitArea size="md" />` (`44×44`), and `lg` (`44×44 = 1936px²`) meets the threshold natively with no `<HitArea />`.
- **Motion:**
  - **Inline collapse/expand (`hidden` & `rail`):** Asymmetric durations with damped `--cs-ease-quart-out` (zero overshoot prevents workspace reflow bounce): `hidden` expands over `--cs-sidebar-dur-enter` (`var(--cs-dur-240)`) and collapses over `--cs-sidebar-dur-exit` (`var(--cs-dur-180)`); `rail` expands over `--cs-dur-240` and collapses over `--cs-sidebar-dur-rail-exit` (`var(--cs-dur-200)`). Labels/badges/chevrons fade out in `100ms` (`--cs-ease-exit`) on collapse and fade in over `160ms` delayed by `--cs-sidebar-dur-rail-delay` (`var(--cs-dur-60)`) on expand so text never flashes cramped.
  - **Overlay drawer (`behavior="overlay"`):** Enters over `320ms` (`--cs-dur-320`, `--cs-ease-quart-out` — no spring overshoot pulling the docked edge off the bezel) and exits over `180ms` (`--cs-dur-exit-lg`, `--cs-ease-cubic-in`), synchronizing 1:1 with `Overlay.svelte` backdrop fade-out.
  - **`SidebarViews` drill-down:** CSS Grid `1 / 1` overlay stack; outgoing view fades (`120ms`) + shifts `20px` (`160ms` `--cs-ease-cubic-out`), incoming view enters via `@starting-style` / RAF over `240ms` `--cs-ease-quart-out` (`180ms` fade with `20ms` delay).
  - `prefers-reduced-motion: reduce` is inherited globally from `src/css/foundation/motion.css`.

---

## 5. Edge Cases & Constraints

- **`SplitterPane` Composition (`width="fill"`):**
  - When placed inside `<SplitterPane>`, consumers set `width="fill"` (making `.cs-sidebar` `inline-size: 100%;` and suppressing competing `.cs-sidebar` `inline-size` transitions so `SplitterPane` owns drag tracking and programmatic collapse animation).
  - Rail collapse integrates seamlessly by binding `<SplitterPane bind:collapsed collapsedExtent="60px">` alongside `<Sidebar open={!collapsed} collapseMode="rail" width="fill">`.
- **`VirtualScroll` vs. `Collapsible` Boundary:**
  - `Collapsible` `0fr -> 1fr` animations and `VirtualScroll` recycled node caches are mutually exclusive inside the same scroll list.
  - For 1,000+ flat items (chat histories, logs, massive file trees), set `<SidebarBody scrollable={false}>` and mount `<VirtualScroll class="flex-1 min-h-0" items={...}>` directly as its child so only a single scrollport exists.
- **Preserving Nested `SidebarGroup` Open State Across Rail Collapse:**
  - Collapsing to `rail` mode sets `effectiveOpen = group.open && !sidebar.isRailCollapsed` inside `SidebarGroupContent` without mutating the consumer's `group.open` binding—re-expanding the sidebar restores previously open folders automatically.
- **Overlay Drawer Lifecycle & Responsive Switching:**
  - When `behavior="overlay"`, `Sidebar` renders inside `<Overlay class="cs-sidebar-overlay" variant={overlayVariant}>` (`popover="manual"`) with `focusTrap` (`restoreFocus={true}`, `onEscape`), backdrop click-to-close, and automatic `open` state continuity if a responsive app switches `behavior` between `"inline"` and `"overlay"` across breakpoints.
  - Because `Overlay.svelte` defaults to centered modal layout (`padding: var(--cs-overlay-padding); align-items: center; justify-content: center;`), `.cs-sidebar-overlay` overrides `padding: 0; align-items: stretch; justify-content: flex-start;` (`flex-end` for `side="end"`), letting the drawer dock flush (or with `floating` inset) and exit in `180ms` (`--cs-dur-exit-lg`) in lockstep with `Overlay` backdrop fade-out.
- **Sticky Regions Inside `SidebarBody`:**
  - Because `.cs-sidebar` and `.cs-sidebar-surface` use `overflow: clip` rather than `overflow: hidden`, consumers can also use standard `position: sticky; inset-block-start: 0;` section headers inside `ScrollAreaContent` when desired, or use `SidebarPinned` for non-scrolling pinned blocks outside `ScrollArea`.
- **Browser Support:**
  - Targets modern evergreen Chromium (`popover="manual"`, `:has()`, `@starting-style`, `overflow: clip`, `corner-shape`, CSS Nesting, `inert`).
- **Explicit Non-Goals:**
  - No built-in pointer drag-resizing (handled by `Splitter`), no `<hr>` separator components between sections, no `sunken` or `soft` sidebar shell variants, no horizontal sidebar orientation, and no `info` semantic color tokens.
