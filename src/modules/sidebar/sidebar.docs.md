---
name: Sidebar
kind: component
import: cs/svelte/sidebar
exports:
  - Sidebar
  - SidebarHeader
  - SidebarSubheader
  - SidebarBody
  - SidebarPinned
  - SidebarFooter
  - SidebarSection
  - SidebarSectionHeader
  - SidebarSectionLabel
  - SidebarGroup
  - SidebarGroupTrigger
  - SidebarGroupContent
  - SidebarItemRow
  - SidebarItem
  - SidebarItemIcon
  - SidebarItemLabel
  - SidebarItemActions
  - SidebarToggle
  - SidebarViews
  - SidebarView
  - getSidebarContext
  - setSidebarContext
  - hasSidebarContext
  - getSidebarGroupContext
  - setSidebarGroupContext
  - hasSidebarGroupContext
  - getSidebarViewsContext
  - setSidebarViewsContext
  - hasSidebarViewsContext
  - SidebarContext
  - SidebarGroupContext
  - SidebarViewsContext
  - SIDEBAR_VARIANTS
  - SIDEBAR_SIZES
  - SIDEBAR_SIDES
  - SIDEBAR_BEHAVIORS
  - SIDEBAR_COLLAPSE_MODES
  - SIDEBAR_ELEMENTS
  - SIDEBAR_VIEW_TRANSITIONS
  - SIDEBAR_VIEW_DIRECTIONS
  - SidebarVariant
  - SidebarSize
  - SidebarSide
  - SidebarBehavior
  - SidebarCollapseMode
  - SidebarElement
  - SidebarViewTransition
  - SidebarViewDirection
  - SidebarState
  - SidebarAriaCurrent
  - SidebarSubheaderRailBehavior
  - SidebarSectionLabelElement
  - SidebarViewInitialFocus
  - SidebarIconComponentProps
  - SidebarProps
  - SidebarHeaderProps
  - SidebarSubheaderProps
  - SidebarBodyProps
  - SidebarPinnedProps
  - SidebarFooterProps
  - SidebarSectionProps
  - SidebarSectionHeaderProps
  - SidebarSectionLabelProps
  - SidebarGroupProps
  - SidebarGroupTriggerProps
  - SidebarGroupContentProps
  - SidebarItemRowProps
  - SidebarItemProps
  - SidebarItemIconProps
  - SidebarItemLabelProps
  - SidebarItemActionsProps
  - SidebarToggleProps
  - SidebarViewsProps
  - SidebarViewProps
---

# Sidebar

## Overview

Composable, borderless application navigation shell (`<Sidebar>`) supporting edge-docked (`"elevated"`), floating-island (`"floating"`), and flush (`"transparent"`) presentations, inline and overlay drawer behaviors (`"inline" | "overlay"`), `"hidden"` and icon-`"rail"` collapse modes, nested collapsible groups, hover/context-menu row actions, and multi-view drill-down navigation (`SidebarViews` / `SidebarView`).

- **Zero Mandatory Internal Regions:** Header branding, subheader controls, pinned blocks, sections, footer profiles, and toggles are all optional via children composition.
- **Borderless Separation:** Surfaces separate through elevation, directional edge light, and whitespace—never raw `1px solid` CSS borders or `<hr>` dividers.
- **Monochrome `current` State:** Active items (`current`) use calibrated neutral contrast (`--cs-color-base-soft-hover` on `elevated`/`floating`, or an elevated monochrome pill on `transparent`) rather than a large accent wash.
- **Single Vertical Axis Invariant:** Brand marks (`data-sidebar-rail="anchor"`), leading navigation icons (`SidebarItem`), and footer avatars share the exact same vertical center axis (`x = railWidth / 2`) across both expanded and `rail` states.

## Usage Guidance

- **`variant` (required):**
  - **`elevated`**: Full-height, edge-docked application shell using `--cs-color-elevated` and a directional inner-edge shadow/rim.
  - **`floating`**: Elevated squircle island (`corner-shape: var(--cs-squircle)`) with outer inset padding (`8px` / `10px` / `12px`) and `--cs-shadow-floating`.
  - **`transparent`**: Quiet flush navigation directly over `--cs-color-canvas`; active items (`current`) render as tactile elevated pills (`--cs-color-elevated` + `--cs-shadow-elevated`).
- **`size` (required):** Choose `"sm"`, `"md"`, or `"lg"` to scale widths (`228px` / `264px` / `300px`), rail widths (`52px` / `60px` / `68px`), row heights, typography, icon sizes, and concentric radii.
- **No Built-In Drag Resizing:** `Sidebar` does not implement pointer drag resizing. To make a sidebar resizable, compose it inside `<SplitterPane>` with `width="fill"`.
- **Virtualization Boundary:** For 1,000+ flat rows, disable `SidebarBody`'s built-in `ScrollArea` (`scrollable={false}`) and mount `<VirtualScroll>` directly inside `SidebarBody` instead of mixing `VirtualScroll` with `<Collapsible>` groups.

## Anatomy

Import from `cs/svelte/sidebar`:

```ts
import {
    Sidebar,
    SidebarHeader,
    SidebarSubheader,
    SidebarBody,
    SidebarPinned,
    SidebarFooter,
    SidebarSection,
    SidebarSectionHeader,
    SidebarSectionLabel,
    SidebarGroup,
    SidebarGroupTrigger,
    SidebarGroupContent,
    SidebarItemRow,
    SidebarItem,
    SidebarItemIcon,
    SidebarItemLabel,
    SidebarItemActions,
    SidebarToggle,
    SidebarViews,
    SidebarView,
} from "cs/svelte/sidebar";
```

| Component | Role |
| :--- | :--- |
| `Sidebar` | Root shell (`<aside>` or `<nav>`), `Overlay` wrapper in `"overlay"` mode, and `SidebarContext` provider. |
| `SidebarHeader` | Optional non-scrolling top region (brand lockup, workspace switcher, `SidebarToggle`). |
| `SidebarSubheader` | Optional secondary top region (search input, `SegmentedControl`) with configurable rail behavior. |
| `SidebarBody` | Flexible middle region; wraps content in `ScrollArea` (`scrollable={true}`) with optional `scrollFade`. |
| `SidebarPinned` | Optional non-scrolling pinned region anchored between `SidebarBody` and `SidebarFooter`. |
| `SidebarFooter` | Optional non-scrolling bottom region (connected user profile row, primary CTA, settings). |
| `SidebarSection` | `<section>` grouping navigation items; supports `collapsible` folding with `aria-labelledby`. |
| `SidebarSectionHeader` | Optional row wrapper for `SidebarSectionLabel` plus trailing section actions. |
| `SidebarSectionLabel` | Section heading (`div` / `h2`–`h4` / `span`), or disclosure `<button>` inside collapsible sections. |
| `SidebarGroup` | Container for a collapsible parent item and nested `SidebarGroupContent` (`depth` tracked automatically). |
| `SidebarGroupTrigger` | `<button>` trigger wired with `aria-expanded`, `aria-controls`, chevron indicator, and rail tooltips. |
| `SidebarGroupContent` | `<Collapsible>` wrapper for nested sub-items; derives `effectiveOpen = group.open && !sidebar.isRailCollapsed`. |
| `SidebarItemRow` | Flex row pairing a `SidebarItem` with sibling `SidebarItemActions` without nesting `<button>` elements. |
| `SidebarItem` | Polymorphic navigation link (`<a>` when `href` is set) or action (`<button type="button">`). |
| `SidebarItemIcon` | Optional manual icon wrapper (`<span class="cs-sidebar-item-icon" aria-hidden="true">`). |
| `SidebarItemLabel` | Truncating label span (`<span class="cs-sidebar-item-label">`) that registers text for auto rail tooltips. |
| `SidebarItemActions` | Trailing action slot (e.g. 3-dot `Dropdown` trigger) revealed on row hover, focus-within, or open menu. |
| `SidebarToggle` | `Button`-based collapse/expand toggle reading `SidebarContext` or explicit `bind:open` / `sidebarId`. |
| `SidebarViews` | Animated drill-down view stack tracking history direction (`"forward"` / `"backward"`) and focus handoff. |
| `SidebarView` | Individual view panel inside `SidebarViews` with `inert` management and `initialFocus` support. |

## API

### `Sidebar` Props

Extends `Omit<HTMLAttributes<HTMLElement>, "children">` and renders `<aside>` (default) or `<nav>` with class `.cs-sidebar`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `SidebarVariant` | Yes | — | Shell surface: `"elevated" \| "floating" \| "transparent"`. |
| `size` | `SidebarSize` | Yes | — | Density and dimension scale: `"sm" \| "md" \| "lg"`. |
| `ref` | `HTMLElement \| null` | No | `null` | `$bindable` reference to the root `<aside>` or `<nav>`. |
| `as` | `SidebarElement` | No | `"aside"` | Root landmark element: `"aside" \| "nav"`. |
| `side` | `SidebarSide` | No | `"start"` | Logical edge placement: `"start" \| "end"`. |
| `open` | `boolean` | No | `true` | `$bindable` expanded/open state. |
| `onOpenChange` | `(open: boolean) => void` | No | `undefined` | Callback fired when `open` changes via `toggle()` or `setOpen()`. |
| `behavior` | `SidebarBehavior` | No | `"inline"` | Layout mode: `"inline"` (in-flow) or `"overlay"` (drawer inside `<Overlay>`). |
| `collapseMode` | `SidebarCollapseMode` | No | `"hidden"` | Collapse strategy when `behavior="inline"`: `"hidden"` or `"rail"`. Forced to `"hidden"` when `behavior="overlay"`. |
| `width` | `"fill" \| (string & {})` | No | `undefined` | Custom expanded `--cs-sidebar-width` CSS length, or `"fill"` for `inline-size: 100%` (e.g. inside `SplitterPane`). |
| `railWidth` | `string` | No | `undefined` | Custom `--cs-sidebar-rail-width` CSS length. |
| `overlayVariant` | `OverlayVariant` | No | `"dim"` | Backdrop variant passed to `<Overlay>` when `behavior="overlay"`. |
| `animate` | `boolean` | No | `true` | Enables shell, label, and child region transitions (respects `prefers-reduced-motion`). |
| `id` | `string` | No | `$props.id()` | Root ID used by `SidebarToggle` `aria-controls`. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-sidebar`. |
| `children` | `Snippet` | No | `undefined` | Sidebar regions or `SidebarViews`. |

### Shell Region Props

- **`SidebarHeader` (`SidebarHeaderProps`)**, **`SidebarPinned` (`SidebarPinnedProps`)**, **`SidebarFooter` (`SidebarFooterProps`)**: Extend `HTMLAttributes<HTMLDivElement>` with `ref = $bindable(null)`, `class`, `children`, and `...rest`.
- **`SidebarSubheader` (`SidebarSubheaderProps`)**: Extends `HTMLAttributes<HTMLDivElement>` with `ref = $bindable(null)`, `railBehavior?: "collapse" | "keep"` (default `"collapse"`), `class`, `children`, and `...rest`. When `railBehavior="collapse"`, wraps children in a vertical fade `<Collapsible open={!sidebar.isRailCollapsed} keepMounted={true}>`.
- **`SidebarBody` (`SidebarBodyProps`)**: Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to `.cs-sidebar-body`. |
| `scrollable` | `boolean` | No | `true` | Wraps children in `<ScrollArea direction="vertical">`. Set to `false` when mounting `<VirtualScroll>`. |
| `scrollbar` | `ScrollAreaScrollbar` | No | `"hover"` | Scrollbar visibility passed to `<ScrollArea>`. |
| `fade` | `boolean \| ScrollFadeSize` | No | `false` | Enables vertical `scrollFade` (`edges: "both"`); boolean uses `"sm"`, or pass a `ScrollFadeSize`. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-sidebar-body`. |
| `children` | `Snippet` | No | `undefined` | Scrollable navigation sections or custom list content. |

### Sections & Groups

- **`SidebarSection` (`SidebarSectionProps`)**: Extends `HTMLAttributes<HTMLElement>` (`<section class="cs-sidebar-section">`).
  - `ref = $bindable<HTMLElement | null>(null)`, `collapsible?: boolean` (default `false`), `open = $bindable(true)`, `onOpenChange?: (open: boolean) => void`, `animate?: boolean` (inherits `sidebar.animate`), `class`, `children`.
  - Automatically sets `aria-labelledby` to the child `SidebarSectionLabel`'s ID unless overridden.
- **`SidebarSectionHeader` (`SidebarSectionHeaderProps`)**: Extends `HTMLAttributes<HTMLDivElement>` (`ref = $bindable(null)`, `class`, `children`). Relocates outside `<Collapsible>` automatically when `SidebarSection` is `collapsible` so the label trigger and trailing actions stay interactive when folded.
- **`SidebarSectionLabel` (`SidebarSectionLabelProps`)**: Extends `HTMLAttributes<HTMLElement>`.
  - `ref = $bindable<HTMLElement | null>(null)`, `as?: "div" | "h2" | "h3" | "h4" | "span"` (default `"div"`), `class`, `children`.
  - When inside a `collapsible` `SidebarSection`, renders a `<button type="button">` with `aria-expanded`, `aria-controls`, and a rotating `ChevronDown` icon.

- **`SidebarGroup` (`SidebarGroupProps`)**: Extends `HTMLAttributes<HTMLDivElement>` (`<div class="cs-sidebar-group">`).
  - `ref = $bindable<HTMLDivElement | null>(null)`, `open = $bindable(false)`, `onOpenChange?: (open: boolean) => void`, `disabled?: boolean` (default `false`), `keepMounted?: boolean` (default `true`), `animate?: boolean` (inherits `sidebar.animate`), `class`, `children`.
- **`SidebarGroupTrigger` (`SidebarGroupTriggerProps`)**: Extends `Omit<HTMLButtonAttributes, "type">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |
| `icon` | `Component<SidebarIconComponentProps>` | No | `undefined` | Leading icon component rendered via `SidebarItemIcon`. |
| `indicator` | `Snippet<[{ open: boolean }]> \| false` | No | `undefined` | Custom expand indicator receiving `{ open }`, or `false` to omit the default `ChevronRight`. |
| `tooltip` | `string \| boolean` | No | `undefined` | Tooltip override; auto-enabled with label text when rail-collapsed unless `false`. |
| `iconOnly` | `boolean` | No | `false` | Marks the trigger as icon-only (`data-icon-only`). |
| `current` | `SidebarAriaCurrent` | No | `false` | Marks the group trigger as current (`aria-current`, `data-current`). |
| `disabled` | `boolean` | No | `false` | Disables the trigger (also disabled when parent `SidebarGroup` is disabled). |

- **`SidebarGroupContent` (`SidebarGroupContentProps`)**: Extends `Omit<CollapsibleProps, "open">` (`ref = $bindable<HTMLDivElement | null>(null)`, `class`, `children`). Sets `--cs-sidebar-depth` from `group.depth` and binds `<Collapsible open={group.effectiveOpen} axis="vertical" motion="slide">`.

### Items & Actions

- **`SidebarItem` (`SidebarItemProps`)**: Polymorphic discriminated union extending `HTMLAnchorAttributes` when `href: string` is provided (`<a>`) or `HTMLButtonAttributes` (without `type`) when `href` is omitted (`<button type="button">`).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLAnchorElement \| HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the rendered `<a>` or `<button>`. |
| `href` | `string` | No | `undefined` | Renders `<a href>` when defined; renders `<button type="button">` when omitted. |
| `current` | `SidebarAriaCurrent` | No | `false` | Sets `data-current` and `aria-current` (`"page"` for links, `"true"` for buttons when `true`, or explicit token). |
| `negative` | `boolean` | No | `false` | Destructive/negative styling revealed on hover/focus/open (`data-negative`). |
| `disabled` | `boolean` | No | `false` | Disables interaction (`disabled` on button; `role="link"`, `aria-disabled="true"`, `tabindex={-1}`, omitted `href` on anchor). |
| `icon` | `Component<SidebarIconComponentProps>` | No | `undefined` | Leading icon component rendered inside `.cs-sidebar-item-icon`. |
| `badge` | `Snippet` | No | `undefined` | Optional trailing badge snippet rendered inside `.cs-sidebar-item-badge`. |
| `tooltip` | `string \| boolean` | No | `undefined` | Tooltip text override, `true` to force, or `false` to suppress auto rail tooltips. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-sidebar-item`. |
| `children` | `Snippet` | No | `undefined` | Typically `<SidebarItemLabel>` (plus optional `<Badge>` or custom content). |

- **`SidebarItemRow` (`SidebarItemRowProps`)**: Extends `HTMLAttributes<HTMLDivElement>` (`ref = $bindable(null)`). Wraps a `SidebarItem` and sibling `SidebarItemActions` in `.cs-sidebar-item-row`.
- **`SidebarItemIcon` (`SidebarItemIconProps`)**: Extends `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">` with required `icon: Component<SidebarIconComponentProps>`, `color?: string`, `strokeWidth?: number | string`.
- **`SidebarItemLabel` (`SidebarItemLabelProps`)**: Extends `HTMLAttributes<HTMLSpanElement>` (`ref = $bindable(null)`). Registers its element for automatic rail tooltip text extraction.
- **`SidebarItemActions` (`SidebarItemActionsProps`)**: Extends `HTMLAttributes<HTMLDivElement>` (`ref = $bindable(null)`, `alwaysVisible?: boolean` default `false`).

### Toggle & Multi-View Navigation

- **`SidebarToggle` (`SidebarToggleProps`)**: Extends `Omit<HTMLButtonAttributes, "type">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |
| `open` | `boolean \| undefined` | No | `undefined` | `$bindable` open state for toggles placed outside `<Sidebar>`. Defaults to `SidebarContext.open` when inside. |
| `sidebarId` | `string` | No | `undefined` | Target sidebar ID for `aria-controls` when placed outside `<Sidebar>`. |
| `variant` | `ButtonVariant` | No | `"ghost"` | Underlying `Button` variant. |
| `size` | `ButtonSize` | No | Contextual | Underlying `Button` size (maps sidebar `sm/md/lg` to `xs/sm/md`, or `"sm"` outside). |
| `iconOnly` | `boolean` | No | `true` | Icon-only mode (`PanelLeft` / `PanelRight` based on `side`). |
| `label` | `string` | No | Localized | Accessible label (`"Collapse sidebar"` / `"Expand sidebar"`). |

- **`SidebarViews<T extends string = string>` (`SidebarViewsProps<T>`)**: Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to `.cs-sidebar-views`. |
| `value` | `T` | Yes | — | `$bindable` active view value. |
| `onValueChange` | `(value: T) => void` | No | `undefined` | Callback fired when `value` changes. |
| `transition` | `SidebarViewTransition` | No | `"slide"` | Transition style: `"slide" \| "fade" \| "none"`. |
| `direction` | `SidebarViewDirection` | No | `"auto"` | Navigation direction: `"auto"` (history stack), `"forward"`, or `"backward"`. |
| `keepMounted` | `boolean` | No | `false` | Keeps inactive `SidebarView` panels mounted in the DOM. |
| `animate` | `boolean` | No | `true` | Enables view transition animations. |

- **`SidebarView<T extends string = string>` (`SidebarViewProps<T>`)**: Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to `.cs-sidebar-view`. |
| `value` | `T` | Yes | — | Unique identifier matched against `SidebarViews` `value`. |
| `label` | `string` | No | `undefined` | Sets `role="region"` and `aria-label={label}` when provided. |
| `initialFocus` | `SidebarViewInitialFocus` | No | `"auto"` | Focus target on view entry: `"auto" \| "none" \| HTMLElement \| (() => HTMLElement \| null)`. |

### Constants, Types & Context Helpers

- **Option Arrays:** `SIDEBAR_VARIANTS`, `SIDEBAR_SIZES`, `SIDEBAR_SIDES`, `SIDEBAR_BEHAVIORS`, `SIDEBAR_COLLAPSE_MODES`, `SIDEBAR_ELEMENTS`, `SIDEBAR_VIEW_TRANSITIONS`, `SIDEBAR_VIEW_DIRECTIONS`.
- **Context Helpers:** `getSidebarContext()`, `setSidebarContext()`, `hasSidebarContext()`, `getSidebarGroupContext()`, `setSidebarGroupContext()`, `hasSidebarGroupContext()`, `getSidebarViewsContext()`, `setSidebarViewsContext()`, `hasSidebarViewsContext()`.

## Collapse & Behavior Modes

- **Inline vs. Overlay (`behavior`):**
  - `behavior="inline"` (default) occupies layout flow and transitions its `inline-size` between expanded (`--cs-sidebar-width`) and collapsed (`0px` for `"hidden"`, or `--cs-sidebar-rail-width` for `"rail"`).
  - `behavior="overlay"` renders inside `<Overlay>` (`popover="manual"`) with `focusTrap` (`restoreFocus={true}`, `Escape` and backdrop-click dismissal). `collapseMode` is forced to `"hidden"`.
- **Rail Visibility Attribute (`data-sidebar-rail`):**
  - `data-sidebar-rail="anchor"`: Wraps leading marks (e.g. brand logo or footer `<Avatar>`) in a `--cs-sidebar-rail-tile` (`36px` / `40px` / `44px`) square slot centered on `x = railWidth / 2`.
  - `data-sidebar-rail="hide"`: Smoothly fades out and collapses arbitrary consumer markup (brand titles, profile text, secondary buttons) when rail-collapsed.
  - `data-sidebar-rail="only"`: Hidden while expanded and revealed only when rail-collapsed.
  - Built-in `SidebarItemLabel`, `SidebarSectionLabel`, `SidebarSubheader`, `SidebarItemActions`, and `SidebarGroupContent` handle rail collapse automatically.
- **Preserving `group.open` Across Rail Collapse:**
  - `SidebarGroup` computes `effectiveOpen = Boolean(open) && !sidebar.isRailCollapsed` without mutating the consumer's `open` binding. Expanding back from rail mode restores previously open groups automatically.

## CSS Custom Properties

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-sidebar-width` | `228px` / `264px` / `300px` (`sm` / `md` / `lg`) | Expanded inline size of `.cs-sidebar-surface`. |
| `--cs-sidebar-rail-width` | `52px` / `60px` / `68px` | Rail-collapsed inline size of `.cs-sidebar-surface`. |
| `--cs-sidebar-floating-inset` | `8px` / `10px` / `12px` | Outer inset padding in `variant="floating"`. |
| `--cs-sidebar-padding-x` | `8px` / `10px` / `12px` | Horizontal inner padding. |
| `--cs-sidebar-padding-y` | `12px` / `14px` / `16px` | Vertical outer region padding. |
| `--cs-sidebar-region-gap` | `10px` / `12px` / `14px` | Vertical gap between shell regions. |
| `--cs-sidebar-bg` | `var(--cs-color-elevated)` (`transparent` on `transparent`) | Surface background. |
| `--cs-sidebar-fg` | `var(--cs-color-text-main)` | Base text color. |
| `--cs-sidebar-shadow` | Directional rim (`elevated`), `--cs-shadow-floating` (`floating`), `none` (`transparent`) | Surface box shadow. |
| `--cs-sidebar-inset` | `0px` (`var(--cs-sidebar-floating-inset)` on `floating`) | Outer shell inset padding. |
| `--cs-sidebar-radius` | `0px` (`var(--cs-radius-2xl)` / `20px` / `var(--cs-radius-3xl)` on `floating`) | Outer surface corner radius. |
| `--cs-sidebar-squircle` | `var(--cs-squircle)` | `corner-shape` superellipse value on `floating`. |
| `--cs-sidebar-rail-tile` | `calc(var(--cs-sidebar-rail-width) - var(--cs-sidebar-padding-x) * 2)` | Square anchor footprint (`36px` / `40px` / `44px`) in rail mode. |
| `--cs-sidebar-item-height` | `32px` / `36px` / `40px` | Expanded item row min-height. |
| `--cs-sidebar-rail-item-height` | `36px` / `40px` / `44px` | Rail-mode square item min-height. |
| `--cs-sidebar-item-list-gap` | `2px` | Vertical gap between items when expanded. |
| `--cs-sidebar-rail-gap` | `4px` | Vertical gap between items when rail-collapsed. |
| `--cs-sidebar-item-padding-x` | `8px` / `10px` / `11px` | Item horizontal padding. |
| `--cs-sidebar-item-gap` | `8px` / `10px` / `12px` | Gap between icon, label, and trailing badge. |
| `--cs-sidebar-item-radius` | `var(--cs-radius-lg)` / `10px` / `var(--cs-radius-xl)` | Item highlight pill corner radius. |
| `--cs-sidebar-item-bg-hover` | `var(--cs-color-base-soft)` | Item hover background. |
| `--cs-sidebar-item-bg-current` | `var(--cs-color-base-soft-hover)` (`var(--cs-color-elevated)` on `transparent`) | Current item background. |
| `--cs-sidebar-item-bg-current-hover` | Subtle neutral step (`var(--cs-color-elevated-hover)` on `transparent`) | Current item hover background. |
| `--cs-sidebar-item-fg-current` | `var(--cs-color-text-strong)` | Current item text color. |
| `--cs-sidebar-item-shadow-current` | `none` (`var(--cs-shadow-elevated)` on `transparent`) | Current item box shadow. |
| `--cs-sidebar-section-gap` | `18px` / `22px` / `26px` | Vertical gap between sections when expanded. |
| `--cs-sidebar-rail-section-gap` | `8px` / `8px` / `10px` | Vertical gap between sections when rail-collapsed. |
| `--cs-sidebar-indent` | `16px` / `20px` / `22px` | Per-level nested `SidebarGroup` indentation. |
| `--cs-sidebar-actions-reserve` | `30px` / `32px` / `36px` | Trailing `padding-inline-end` reserve for badge-less `SidebarItemActions`. |
| `--cs-sidebar-actions-size` | `24px` / `24px` / `28px` | Footprint for trailing action buttons. |
| `--cs-sidebar-icon-box` | `20px` / `20px` / `22px` | Fixed leading icon box width preserving rail center alignment. |
| `--cs-sidebar-icon-size` | `16px` / `18px` / `20px` | Leading SVG icon size. |
| `--cs-sidebar-dur-enter` / `--cs-sidebar-dur-exit` | `var(--cs-dur-280)` / `var(--cs-dur-200)` | Inline expand and full-hide collapse durations. |
| `--cs-sidebar-dur-rail-exit` / `--cs-sidebar-dur-rail-delay` | `var(--cs-dur-240)` / `70ms` | Rail collapse duration and label fade-in delay on expand. |
| `--cs-sidebar-dur-fade` | `var(--cs-dur-160)` | Label and action fade duration. |
| `--cs-sidebar-ease-enter` / `--cs-sidebar-ease-exit` | `var(--cs-ease-expo-out)` / `var(--cs-ease-quart-out)` | Spatial enter and exit easing curves. |
| `--cs-sidebar-view-shift` | `20px` | `SidebarViews` horizontal slide travel distance. |

## Examples

### Basic Application Shell

```svelte
<script lang="ts">
    import { Home, Inbox, Settings } from "@lucide/svelte";
    import {
        Sidebar,
        SidebarHeader,
        SidebarBody,
        SidebarSection,
        SidebarSectionLabel,
        SidebarItem,
        SidebarItemLabel,
        SidebarToggle,
    } from "cs/svelte/sidebar";

    let open = $state(true);
    let current = $state("home");
</script>

<Sidebar variant="elevated" size="md" bind:open collapseMode="rail">
    <SidebarHeader>
        <div class="flex items-center justify-between gap-2">
            <span class="font-semibold text-strong" data-sidebar-rail="hide">Acme</span>
            <SidebarToggle />
        </div>
    </SidebarHeader>

    <SidebarBody>
        <SidebarSection>
            <SidebarSectionLabel>Workspace</SidebarSectionLabel>
            <SidebarItem icon={Home} current={current === "home"} onclick={() => (current = "home")}>
                <SidebarItemLabel>Overview</SidebarItemLabel>
            </SidebarItem>
            <SidebarItem icon={Inbox} current={current === "inbox"} onclick={() => (current = "inbox")}>
                <SidebarItemLabel>Inbox</SidebarItemLabel>
            </SidebarItem>
            <SidebarItem icon={Settings} current={current === "settings"} onclick={() => (current = "settings")}>
                <SidebarItemLabel>Settings</SidebarItemLabel>
            </SidebarItem>
        </SidebarSection>
    </SidebarBody>
</Sidebar>
```

### Connected Footer Profile Row

Use `SidebarItemRow` + `SidebarItem` + `data-sidebar-rail="anchor"` around `<Avatar>` so the avatar stays centered on the single vertical axis in rail mode while text and trailing `SidebarItemActions` dissolve smoothly:

```svelte
<SidebarFooter>
    <SidebarItemRow>
        <SidebarItem tooltip="Clara Vance">
            <span data-sidebar-rail="anchor">
                <Avatar variant="soft" size="md" name="Clara Vance" status="online" />
            </span>
            <span class="flex flex-col min-w-0 flex-1 ms-1.5" data-sidebar-rail="hide">
                <span class="text-sm font-medium text-strong truncate leading-[18px]">Clara Vance</span>
                <span class="text-xs text-weak truncate leading-[16px]">clara@acme.co</span>
            </span>
        </SidebarItem>

        <SidebarItemActions>
            <Dropdown size="sm">
                <Button variant="ghost" size="xs" iconOnly aria-label="Account menu" {@attach dropdownTrigger()}>
                    <ButtonIcon icon={MoreHorizontal} />
                </Button>
                <DropdownContent>
                    <DropdownItem><DropdownItemText>Profile</DropdownItemText></DropdownItem>
                    <DropdownItem><DropdownItemText>Settings</DropdownItemText></DropdownItem>
                    <DropdownItem negative><DropdownItemText>Sign out</DropdownItemText></DropdownItem>
                </DropdownContent>
            </Dropdown>
        </SidebarItemActions>
    </SidebarItemRow>
</SidebarFooter>
```

### `ContextMenu` & Hover 3-Dot `Dropdown` (Badge-to-Actions Cross-Swap)

`SidebarItem` forwards `{...rest}` to the underlying `<button>`/`<a>`, so `{@attach contextMenuTrigger()}` works directly and keeps `[data-open]` highlighted while the menu is open. When a `<Badge>` is present in the row, hovering or opening the row menu cross-swaps the badge out in place as `SidebarItemActions` fades in:

```svelte
<SidebarItemRow>
    <SidebarItem
        icon={Inbox}
        current
        {@attach contextMenuTrigger({ onOpen: () => (target = "Inbox") })}
    >
        <SidebarItemLabel>Inbox</SidebarItemLabel>
        <Badge variant="soft" color="base" size="sm">
            <BadgeLabel>4</BadgeLabel>
        </Badge>
    </SidebarItem>

    <SidebarItemActions>
        <Dropdown size="sm">
            <Button variant="ghost" size="xs" iconOnly aria-label="Inbox actions" {@attach dropdownTrigger()}>
                <ButtonIcon icon={MoreHorizontal} />
            </Button>
            <DropdownContent>
                <DropdownItem><DropdownItemText>Mark read</DropdownItemText></DropdownItem>
                <DropdownItem negative><DropdownItemText>Archive</DropdownItemText></DropdownItem>
            </DropdownContent>
        </Dropdown>
    </SidebarItemActions>
</SidebarItemRow>
```

### `SplitterPane` (`width="fill"`) & `VirtualScroll` (`scrollable={false}`)

```svelte
<!-- Resizable pane with rail collapse -->
<SplitterPane bind:collapsed collapsedExtent="60px" defaultExtent="264px" minExtent="200px">
    <Sidebar variant="elevated" size="md" open={!collapsed} collapseMode="rail" width="fill">
        <!-- ... -->
    </Sidebar>
</SplitterPane>

<!-- 1,000+ flat items using VirtualScroll -->
<Sidebar variant="elevated" size="md">
    <SidebarBody scrollable={false}>
        <VirtualScroll class="flex-1 min-h-0" items={rows} itemHeight={36}>
            {#snippet children({ item })}
                <SidebarItem>
                    <SidebarItemLabel>{item.title}</SidebarItemLabel>
                </SidebarItem>
            {/snippet}
        </VirtualScroll>
    </SidebarBody>
</Sidebar>
```

### Multi-View Drill-Down (`SidebarViews` / `SidebarView`)

```svelte
<script lang="ts">
    import { ChevronLeft, ChevronRight, Home, Settings, Sliders } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import {
        Sidebar,
        SidebarViews,
        SidebarView,
        SidebarHeader,
        SidebarBody,
        SidebarSection,
        SidebarItem,
        SidebarItemLabel,
        SidebarItemIcon,
    } from "cs/svelte/sidebar";

    let view = $state<"root" | "settings">("root");
</script>

<Sidebar variant="floating" size="md">
    <SidebarViews bind:value={view}>
        <SidebarView value="root" label="Workspace">
            <SidebarBody>
                <SidebarSection>
                    <SidebarItem icon={Home} current>
                        <SidebarItemLabel>Overview</SidebarItemLabel>
                    </SidebarItem>
                    <SidebarItem icon={Settings} onclick={() => (view = "settings")}>
                        <SidebarItemLabel>Settings</SidebarItemLabel>
                        <SidebarItemIcon icon={ChevronRight} />
                    </SidebarItem>
                </SidebarSection>
            </SidebarBody>
        </SidebarView>

        <SidebarView value="settings" label="Settings">
            <SidebarHeader>
                <div class="flex items-center gap-1.5">
                    <Button variant="ghost" size="xs" iconOnly aria-label="Back" onclick={() => (view = "root")}>
                        <ButtonIcon icon={ChevronLeft} />
                        <HitArea size="md" />
                    </Button>
                    <span class="text-sm font-semibold text-strong">Settings</span>
                </div>
            </SidebarHeader>
            <SidebarBody>
                <SidebarSection>
                    <SidebarItem icon={Sliders}>
                        <SidebarItemLabel>General</SidebarItemLabel>
                    </SidebarItem>
                </SidebarSection>
            </SidebarBody>
        </SidebarView>
    </SidebarViews>
</Sidebar>
```

## Behavior & Quirks

- **Current Item Semantics (`aria-current`):** `SidebarItem` sets `aria-current="page"` when `current={true}` and `href` is present, `"true"` when `current={true}` on a `<button>`, or passes explicit string tokens (`"page" | "step" | "location" | "date" | "time" | "true"`).
- **Hidden `inert` Lifecycle:** When `Sidebar` is fully hidden (`!open` with `collapseMode="hidden"` or `behavior="overlay"`), `.cs-sidebar-surface` receives `inert` immediately and transitions to `visibility: hidden` after settling.
- **`:focus-visible` Clearance:** Outer `.cs-sidebar` keeps `overflow: visible` at rest, expanded, and in `rail` mode (clipping only during `"hidden"` close/closed states), `SidebarBody` keeps `4px` top and `8–12px` inline clearance inside `.cs-sidebar-scroll-content`, and `SidebarViews` uses `overflow-x: clip; overflow-y: visible;` with `4px` horizontal padding/negative-margin compensation so focus outlines are never clipped.
- **Focus Handoff in `SidebarViews`:** Switching views while keyboard focus is inside the outgoing `SidebarView` automatically moves focus (`preventScroll: true`) to `[data-autofocus]`, `initialFocus`, or the first focusable element in the incoming view before marking the outgoing view `inert`.
- **Rail Hit Area Pitch:** In rail mode (`--cs-sidebar-rail-gap: 4px`), `sm` (`36×36px`) and `md` (`40×40px`) items mount `<HitArea size="sm" />` (`40×40px`) and `<HitArea size="md" />` (`44×44px`) for zero-overlap vertical pitch; `lg` (`44×44px`) meets the `1936px²` threshold natively.
