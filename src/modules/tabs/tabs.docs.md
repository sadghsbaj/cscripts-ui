---
name: Tabs
kind: component
import: cs/svelte/tabs
exports:
  - Tabs
  - TabsList
  - TabsTrigger
  - TabsPanel
  - TabsLabel
  - TabsIcon
  - getTabsContext
  - setTabsContext
  - hasTabsContext
  - TabsContext
  - TABS_ORIENTATIONS
  - TABS_SIZES
  - TABS_WIDTHS
  - TABS_BASELINES
  - TABS_ACTIVATION_MODES
  - TabsOrientation
  - TabsSize
  - TabsWidth
  - TabsBaseline
  - TabsActivationMode
  - TabsProps
  - TabsListProps
  - TabsTriggerButtonProps
  - TabsTriggerLinkProps
  - TabsTriggerProps
  - TabsPanelProps
  - TabsLabelProps
  - TabsIconComponentProps
  - TabsIconProps
---

# Tabs

## Overview
Typographic, open-air tab navigation primitive composed of `<Tabs />`, `<TabsList />`, `<TabsTrigger />`, `<TabsPanel />`, `<TabsLabel />`, and `<TabsIcon />`. Supports both **panel-switching tabs** and **tablist-only / `href` route-link navigation**, featuring horizontal and vertical orientations, a `1px` hairline baseline with a distance-calibrated Push-Pull active indicator, roving focus, and horizontal overflow step-scrolling with edge fade masks.

**Choosing between siblings:**
- **`SegmentedControl`:** Compact, horizontal `role="radiogroup"` mode toggle (typically 2–5 options) inside a sunken pill track with an elevated sliding thumb. Use `Tabs` for macro view/section navigation, vertical settings rails, `TabsPanel` wiring, or `href` link triggers.
- **`Accordion`:** Vertically stacked disclosure group composing `Collapsible` where one or more sections expand in-flow. Use `Tabs` when switching between mutually exclusive views from a dedicated `TabsList` strip.

## API

### `Tabs` Props
Generic over `T extends string = string`. Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Provides `TabsContext` to descendant components.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `TabsSize` | Yes | — | T-shirt size: `"xs"` (`28px`), `"sm"` (`32px`), `"md"` (`36px`), `"lg"` (`40px`), `"xl"` (`44px`) horizontal height. |
| `value` | `T \| undefined` | No | `undefined` | `$bindable` active tab value. Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: T) => void` | No | `undefined` | Fires with the newly selected value when selection changes via user interaction. |
| `orientation` | `TabsOrientation` | No | `"horizontal"` | Layout and keyboard navigation axis (`"horizontal"` or `"vertical"`). |
| `width` | `TabsWidth` | No | `"content"` | `"content"` sizes each trigger to its intrinsic content; `"equal"` distributes horizontal triggers evenly (`1fr` columns). |
| `baseline` | `TabsBaseline` | No | `"full"` | `1px` hairline baseline span (`"full"` across the list shell, `"content"` across the track, or `"none"`). |
| `activationMode` | `TabsActivationMode` | No | `"automatic"` | `"automatic"` selects on arrow-key focus; `"manual"` moves focus and requires `Enter`/`Space` to activate. |
| `loop` | `boolean` | No | `true` | Wraps arrow-key navigation at the start/end of `TabsList`. |
| `disabled` | `boolean` | No | `false` | Disables all child triggers in the group (`data-disabled`). |
| `keepMounted` | `boolean` | No | `false` | Default mount strategy for `TabsPanel` (`false` unmounts inactive panels; `true` keeps them mounted with `hidden`). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `.cs-tabs` `<div>`. |
| `children` | `Snippet` | No | `undefined` | Child `<TabsList />` and `<TabsPanel />` elements. |

### `TabsList` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `.cs-tabs-list-shell` containing optional horizontal scroll chevrons, `.cs-tabs-viewport`, `.cs-tabs-list` (`role="tablist"` by default, overridable via `role`), and `.cs-tabs-indicator`. Additional attributes (`role`, `aria-label`, `aria-labelledby`, etc.) are forwarded to `.cs-tabs-list`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the `.cs-tabs-list-shell` `<div>`. |
| `class` | `ClassValue` | No | `undefined` | Merged onto `.cs-tabs-list-shell`. |
| `children` | `Snippet` | No | `undefined` | Child `<TabsTrigger />` elements. |

### `TabsTrigger` Props
Generic over `T extends string = string`. Polymorphic on `href` via a discriminated union of `TabsTriggerButtonProps<T>` and `TabsTriggerLinkProps<T>`:
- **Button mode (`href?: undefined`):** Extends `Omit<HTMLButtonAttributes, "value" | "type" | "children" | "disabled">`. Renders `<button type="button" role="tab">`.
- **Link mode (`href: string`):** Extends `Omit<HTMLAnchorAttributes, "href" | "children">`. Renders `<a {href}>` without `role="tab"`, using `aria-current="page"` when selected.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `T` | Yes | — | Unique identifier matching a `Tabs` `value` and optional `TabsPanel` (exposed as `data-value={value}`). |
| `href` | `string \| undefined` | No | `undefined` | When provided, renders an `<a>` link trigger instead of a `<button type="button">`. |
| `disabled` | `boolean` | No | `false` | Disables this individual trigger (effective disabled state is `tabs.disabled \|\| disabled`). |
| `ref` | `HTMLButtonElement \| HTMLAnchorElement \| null` | No | `null` | `$bindable` reference to the `<button>` or `<a>` element. |
| `children` | `Snippet` | No | `undefined` | Trigger content (`<TabsIcon />`, `<TabsLabel />`, `<Badge />`, or text). |

### `TabsPanel` Props
Generic over `T extends string = string`. Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="tabpanel" tabindex="0">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `T` | Yes | — | Matching `TabsTrigger` `value` (exposed as `data-value={value}`). |
| `keepMounted` | `boolean \| undefined` | No | *(from `Tabs`)* | Optional per-panel override of the root `Tabs` `keepMounted` setting. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the `.cs-tabs-panel` `<div>`. |
| `children` | `Snippet` | No | `undefined` | Panel content. |

### `TabsLabel` & `TabsIcon`
- **`TabsLabel`** (`TabsLabelProps` extending `HTMLAttributes<HTMLSpanElement>`): Renders `<span class="cs-tabs-label">` with `ref = $bindable(null)`, single-line ellipsis truncation (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`), and `text-box: trim-both cap alphabetic`.
- **`TabsIcon`** (`TabsIconProps` extending `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): Props `{ icon: Component<TabsIconComponentProps>; color?: string; strokeWidth?: number | string; ...SVGAttributes }`. Renders `<Icon {...rest} aria-hidden="true" class={["cs-tabs-icon", className]} />` sized to `--cs-tabs-icon-size`.

### Exported Constants, Types & Context Helpers
- `TABS_ORIENTATIONS`: `readonly ["horizontal", "vertical"]` (`TabsOrientation`)
- `TABS_SIZES`: `readonly ["xs", "sm", "md", "lg", "xl"]` (`TabsSize`)
- `TABS_WIDTHS`: `readonly ["content", "equal"]` (`TabsWidth`)
- `TABS_BASELINES`: `readonly ["full", "content", "none"]` (`TabsBaseline`)
- `TABS_ACTIVATION_MODES`: `readonly ["automatic", "manual"]` (`TabsActivationMode`)
- `TabsProps<T>`, `TabsListProps`, `TabsTriggerButtonProps<T>`, `TabsTriggerLinkProps<T>`, `TabsTriggerProps<T>`, `TabsPanelProps<T>`, `TabsLabelProps`, `TabsIconComponentProps`, `TabsIconProps`
- `TabsContext`, `getTabsContext`, `setTabsContext`, `hasTabsContext`

### `data-*` Attributes
- Root (`.cs-tabs`): `data-size={size}`, `data-orientation={orientation}`, `data-width={width}`, `data-baseline={baseline}`, `data-disabled` (when `disabled`).
- List shell (`.cs-tabs-list-shell`): `data-overflowing` (when horizontally scrollable in either direction).
- Viewport (`.cs-tabs-viewport`): `data-scroll-prev` (when scrollable toward start), `data-scroll-next` (when scrollable toward end).
- List track (`.cs-tabs-list`): `data-arrow-nav` (while navigating via arrow/`Home`/`End` keys).
- Indicator (`.cs-tabs-indicator`): `data-active` (when `value` matches a mounted `TabsTrigger`).
- Scroll buttons (`.cs-tabs-scroll-btn`): `data-direction="prev" | "next"`, `data-visible` (when scrollable in that direction).
- Trigger (`.cs-tabs-trigger`): `data-value={value}`, `data-selected` (when selected), `data-disabled` (when group or trigger is disabled).
- Panel (`.cs-tabs-panel`): `data-value={value}`, `data-selected` (when selected).

### CSS Custom Properties
Overridable on `.cs-tabs`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-tabs-fg` | `var(--cs-color-text-weak)` | Inactive trigger text and icon color. |
| `--cs-tabs-fg-hover` | `var(--cs-color-text-strong)` | Hovered trigger text and icon color. |
| `--cs-tabs-fg-active` | `var(--cs-color-text-strong)` | Selected trigger text and icon color. |
| `--cs-tabs-bg-hover` | `var(--cs-color-base-soft)` | Inset hover wash (and vertical selected row tint). |
| `--cs-tabs-baseline-color` | `var(--cs-color-base-soft-hover)` | `1px` hairline baseline color. |
| `--cs-tabs-indicator-color` | `var(--cs-color-text-strong)` | Active indicator bar color (`var(--cs-color-disabled-fg)` when `[data-disabled]`). |
| `--cs-tabs-indicator-thickness` | `2px` (`xs`–`lg`), `2.5px` (`xl`) | Active indicator bar thickness. |
| `--cs-tabs-height` | `28px` / `32px` / `36px` / `40px` / `44px` | Horizontal tab height per `data-size` (`xs`–`xl`). |
| `--cs-tabs-min-height` | `28px` / `30px` / `34px` / `38px` / `42px` | Vertical tab `min-height` per `data-size` (`xs`–`xl`). |
| `--cs-tabs-px` | `8px` / `10px` / `12px` / `14px` / `16px` | Trigger inline padding per `data-size` (`xs`–`xl`). |
| `--cs-tabs-gap` | `4px` / `4px` / `6px` / `6px` / `8px` | Gap between triggers in `.cs-tabs-list`. |
| `--cs-tabs-item-gap` | `6px` / `6px` / `8px` / `8px` / `8px` | Gap between icon, label, and badge inside `.cs-tabs-trigger-content`. |
| `--cs-tabs-font-size` | `--cs-text-xs` (`xs`/`sm`), `--cs-text-sm` (`md`/`lg`), `--cs-text-base` (`xl`) | Trigger font size. |
| `--cs-tabs-line-height` | `16px` / `16px` / `20px` / `20px` / `22px` | Integer line-height per `data-size` (`xs`–`xl`). |
| `--cs-tabs-icon-size` | `14px` / `14px` / `16px` / `16px` / `18px` | Leading `<TabsIcon />` width and height. |
| `--cs-tabs-radius` | `--cs-radius-md` (`xs`/`sm`), `--cs-radius-lg` (`md`/`lg`), `--cs-radius-xl` (`xl`) | Hover wash and vertical active tint border-radius. |
| `--cs-tabs-squircle` | `--cs-squircle-soft` (`xs`/`sm`), `--cs-squircle-smooth` (`md`–`xl`) | Superellipse `corner-shape` token. |
| `--cs-tabs-fade-size` | `44px` / `48px` / `56px` / `56px` / `56px` | Horizontal scroll-fade width forwarded to `--cs-scroll-fade-size`. |

Internal / computed properties:
- `--cs-tabs-mask-left` / `--cs-tabs-mask-right`: Registered `@property` (`<length>`, `initial-value: 0px`) animating the `mask-image` chevron safe-space on `.cs-tabs-viewport`.
- `--cs-tabs-lane`: `calc(var(--cs-tabs-height) - 8px + 20px)` target mask inset when `data-scroll-prev` / `data-scroll-next` is active.
- `--cs-tabs-clip-start` / `--cs-tabs-clip-end`: Inline pixel insets driving `clip-path: inset(...)` on `.cs-tabs-indicator`.

## Examples

### Horizontal with Panels
```svelte
<script lang="ts">
    import { Activity, FolderKanban, Rocket, Settings } from "@lucide/svelte";
    import { Tabs, TabsIcon, TabsLabel, TabsList, TabsPanel, TabsTrigger } from "cs/svelte/tabs";

    let value = $state("overview");
</script>

<Tabs size="md" bind:value>
    <TabsList aria-label="Project sections">
        <TabsTrigger value="overview">
            <TabsIcon icon={FolderKanban} />
            <TabsLabel>Overview</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="deployments">
            <TabsIcon icon={Rocket} />
            <TabsLabel>Deployments</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="analytics">
            <TabsIcon icon={Activity} />
            <TabsLabel>Analytics</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="settings">
            <TabsIcon icon={Settings} />
            <TabsLabel>Settings</TabsLabel>
        </TabsTrigger>
    </TabsList>

    <TabsPanel value="overview">Project summary and recent activity.</TabsPanel>
    <TabsPanel value="deployments">Recent builds and rollout status.</TabsPanel>
    <TabsPanel value="analytics">Traffic and latency metrics.</TabsPanel>
    <TabsPanel value="settings">Workspace configuration.</TabsPanel>
</Tabs>
```

### Vertical Settings with `TabsIcon` & `Badge`
```svelte
<script lang="ts">
    import { Bell, CreditCard, ShieldCheck, User, Users } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Tabs, TabsIcon, TabsLabel, TabsList, TabsPanel, TabsTrigger } from "cs/svelte/tabs";

    let section = $state("profile");
</script>

<Tabs size="md" orientation="vertical" bind:value={section}>
    <TabsList aria-label="Account settings" class="w-52 shrink-0">
        <TabsTrigger value="profile">
            <TabsIcon icon={User} />
            <TabsLabel>Profile</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="team">
            <TabsIcon icon={Users} />
            <TabsLabel>Team</TabsLabel>
            <Badge variant="soft" color="base" size="xs" class="ms-auto tabular-nums">
                <BadgeLabel>12</BadgeLabel>
            </Badge>
        </TabsTrigger>
        <TabsTrigger value="billing">
            <TabsIcon icon={CreditCard} />
            <TabsLabel>Billing</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="security">
            <TabsIcon icon={ShieldCheck} />
            <TabsLabel>Security</TabsLabel>
            <Badge variant="soft" color="caution" size="xs" class="ms-auto tabular-nums">
                <BadgeLabel>2</BadgeLabel>
            </Badge>
        </TabsTrigger>
        <TabsTrigger value="notifications">
            <TabsIcon icon={Bell} />
            <TabsLabel>Notifications</TabsLabel>
        </TabsTrigger>
    </TabsList>

    <TabsPanel value="profile" class="flex-1 pl-6">Profile details...</TabsPanel>
    <TabsPanel value="team" class="flex-1 pl-6">Team members...</TabsPanel>
    <TabsPanel value="billing" class="flex-1 pl-6">Billing & plan...</TabsPanel>
    <TabsPanel value="security" class="flex-1 pl-6">Security & keys...</TabsPanel>
    <TabsPanel value="notifications" class="flex-1 pl-6">Notification digests...</TabsPanel>
</Tabs>
```

### Tablist-Only & `href` Link Tabs
Omit `TabsPanel` for standalone filter strips, or pass `href` to `TabsTrigger` for route-link navigation. For pure link lists without `TabsPanel`, pass `role="navigation"` directly on `TabsList` (e.g., `<TabsList role="navigation" aria-label="...">`, which overrides the default `role="tablist"` and omits `aria-orientation`) or wrap in a `<nav aria-label="...">` landmark.

```svelte
<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Tabs, TabsLabel, TabsList, TabsTrigger } from "cs/svelte/tabs";

    let filter = $state("all");
    let route = $state("overview");
</script>

<!-- Tablist-only filter strip -->
<Tabs size="sm" bind:value={filter}>
    <TabsList aria-label="Issue filter">
        <TabsTrigger value="all">
            <TabsLabel>All Issues</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="open">
            <TabsLabel>Open</TabsLabel>
            <Badge variant="soft" color="base" size="xs" class="tabular-nums">
                <BadgeLabel>24</BadgeLabel>
            </Badge>
        </TabsTrigger>
        <TabsTrigger value="closed">
            <TabsLabel>Closed</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="archived" disabled>
            <TabsLabel>Archived</TabsLabel>
        </TabsTrigger>
    </TabsList>
</Tabs>

<!-- Link-mode navigation -->
<nav aria-label="Repository navigation">
    <Tabs size="md" bind:value={route}>
        <TabsList role="navigation" aria-label="Repository sections">
            <TabsTrigger value="overview" href="/repo/overview">
                <TabsLabel>Overview</TabsLabel>
            </TabsTrigger>
            <TabsTrigger value="releases" href="/repo/releases">
                <TabsLabel>Releases</TabsLabel>
            </TabsTrigger>
            <TabsTrigger value="changelog" href="/repo/changelog">
                <TabsLabel>Changelog</TabsLabel>
            </TabsTrigger>
        </TabsList>
    </Tabs>
</nav>
```

### Accent Indicator Override (`--cs-tabs-indicator-color`)
`--cs-tabs-indicator-color` defaults to `var(--cs-color-text-strong)` and can be overridden to `var(--cs-color-accent-solid)` on `.cs-tabs`:

```svelte
<Tabs size="md" bind:value style="--cs-tabs-indicator-color: var(--cs-color-accent-solid);">
    <TabsList aria-label="Sections">
        <TabsTrigger value="overview">
            <TabsLabel>Overview</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="activity">
            <TabsLabel>Activity</TabsLabel>
        </TabsTrigger>
    </TabsList>
</Tabs>
```

## Behavior & Quirks
- **`$bindable()` pitfall (`value={fn()}`):** Never pass a non-bound expression (e.g. `value={getTab()}`) to `value`. Because `value` is declared with `$bindable()` and updated internally on selection, passing a non-bound expression passes `svelte-check` without warning but throws a Svelte 5 runtime error **even if `onValueChange` is also passed**. Use `bind:value={state}` for local `$state`, `bind:value={getter, setter}` (or `bind:value={() => current, () => {}}` paired with `onValueChange`) for controlled state, or omit `value` for uncontrolled mode.
- **Desktop `pointerdown` vs. Touch `click` & Link Handling:**
  - Enabled button triggers (`!href`) activate immediately on primary `pointerdown` (`event.button === 0 && event.pointerType !== "touch"`) when not prevented.
  - Touch interactions (`pointerType === "touch"`) defer activation to `click` so horizontal swipe-scrolling across `TabsList` never causes accidental tab switches.
  - Link triggers (`href`) never activate on `pointerdown`; they update `value` on `click` only for unmodified primary clicks (`button === 0` without `metaKey`, `ctrlKey`, `shiftKey`, or `altKey`), preserving middle-click, `Cmd/Ctrl+click`, and drag-away cancellation. Disabled link triggers omit `href`, set `aria-disabled="true"` and `tabindex="-1"`, and call `event.preventDefault()` on click.
- **WAAPI Push-Pull Indicator & Mid-Flight Interruption:**
  - `.cs-tabs-indicator` spans the full `.cs-tabs-list` track and rests at `clip-path: inset(...)` driven by `--cs-tabs-clip-start` / `--cs-tabs-clip-end`.
  - On `value` changes, `TabsList` animates `clip-path` via `element.animate()` using distance-calibrated Push-Pull keyframes (`--cs-ease-quint-out` on both edges, leading edge `170ms`–`265ms` with `0ms` delay, trailing edge `0ms`–`12ms` delay and `36ms`–`60ms` longer duration).
  - Rapid mid-flight clicks read `getComputedStyle(indicatorEl).clipPath`, cancel the running animation, and launch from the exact interpolated edges.
  - Initial offsets sync synchronously before paint without animating; `ResizeObserver` on the viewport, track, and active trigger keeps alignment synced on resize, `width="equal"` reflows, or async font loads. `prefers-reduced-motion: reduce` skips WAAPI animation and snaps instantaneously.
  - If `value` does not match any mounted `TabsTrigger`, `data-active` is omitted and `.cs-tabs-indicator` hides cleanly (`opacity: 0`).
- **`rovingFocus` & Keyboard Navigation:**
  - `TabsList` attaches `rovingFocus` (`orientation`, `loop`, `homeEnd: true`, `dir: "auto"`, `preventScroll: true`, targeting `:scope > .cs-tabs-trigger:not(:disabled, [aria-disabled='true'])`).
  - Arrow/`Home`/`End` navigation sets `data-arrow-nav` on `.cs-tabs-list` (suppressing `:focus-visible` outlines while the indicator moves) and scrolls the newly focused trigger into view. `data-arrow-nav` clears on `pointerdown` or `focusout` leaving `.cs-tabs-list`.
  - When `activationMode="automatic"`, arrow navigation immediately selects non-link triggers; `href` link triggers still require `Enter` to follow the link. When `activationMode="manual"`, arrow keys only move focus and `Enter`/`Space` activates button triggers.
- **Dynamic `aria-controls` / `aria-labelledby` Pairing:**
  - `Tabs` maintains reactive `SvelteMap` registries for mounted triggers and panels.
  - Button `TabsTrigger`s set `aria-controls={panelId}` **only when a matching `TabsPanel` is registered**—in tablist-only mode without panels, `aria-controls` is omitted so no dangling ID references exist.
  - `TabsPanel` sets `aria-labelledby={triggerId}` from the matching registered trigger.
- **`TabsPanel` Lifecycle (`keepMounted`):**
  - When `keepMounted` is `false` (default), inactive panels are unmounted (`{#if isSelected}`) so heavy views incur zero DOM or effect cost until visited.
  - When `keepMounted` is `true` (on `Tabs` or overridden per `TabsPanel`), panels remain mounted with `hidden={!isSelected || undefined}` to preserve DOM, scroll position, and form state.
- **Overflow Scrolling & Surface-Agnostic Chevrons:**
  - Horizontal `TabsList` attaches `scrollFade({ size: "md", direction: "horizontal", edges: "both" })` using `--cs-tabs-fade-size`, with animated `@property` mask insets (`--cs-tabs-mask-left` / `--cs-tabs-mask-right`) carving out chevron safe-space when overflowing.
  - Prev/next scroll buttons (`.cs-tabs-scroll-btn`, `tabindex="-1"`, with `<HitArea size="sm" />`) use alpha-composited `--cs-color-base-soft` / `--cs-color-base-soft-hover` fills so they remain legible on both canvas and elevated surfaces in light and dark mode. Vertical `TabsList` stacks without horizontal scroll or chevrons.
- **Vertical "Connected Spine" & Zero-Shift Press Physics:**
  - Vertical triggers align content to `flex-start` and pair the `2px` (`2.5px` on `xl`) vertical indicator bar with a `--cs-tabs-bg-hover` `::before` row tint with square start corners and squircle-rounded end corners.
  - Both resting and selected triggers use `font-weight: 500` and `white-space: nowrap` for zero layout shift. `:active` applies `scale: 0.98` to `.cs-tabs-trigger-content` only on inactive, enabled triggers.
