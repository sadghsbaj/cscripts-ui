---
name: CommandPalette
kind: hybrid
import: cs/svelte/command-palette
exports:
  - CommandPalette
  - CommandPaletteBar
  - CommandPaletteIcon
  - CommandPaletteScope
  - CommandPaletteInput
  - CommandPaletteClear
  - CommandPaletteBody
  - CommandPaletteList
  - CommandPalettePreview
  - CommandPalettePage
  - CommandPaletteWidget
  - CommandPaletteFooter
  - CommandPaletteEmpty
  - CommandPaletteGroup
  - CommandPaletteGroupLabel
  - CommandPaletteSeparator
  - CommandPaletteItem
  - CommandPaletteItemIcon
  - CommandPaletteItemText
  - CommandPaletteItemDescription
  - CommandPaletteItemShortcut
  - commandPaletteShortcut
  - createCommandPaletteRegistry
  - scoreCommandPaletteMatch
  - getCommandPaletteContext
  - hasCommandPaletteContext
  - COMMAND_PALETTE_SIZES
  - COMMAND_PALETTE_CLOSE_REASONS
  - CommandPaletteSize
  - CommandPaletteCloseReason
  - CommandPaletteIconComponentProps
  - CommandPaletteFilterCandidate
  - CommandPaletteFilterFn
  - CommandPaletteShortcutConfig
  - CommandPaletteShortcutOptions
  - CommandPalettePageEntry
  - CommandPalettePushPageOptions
  - CommandPaletteQueryContext
  - CommandPalettePluginRenderContext
  - CommandPaletteCommand
  - CommandPalettePlugin
  - CommandPaletteRegisterCommandsOptions
  - CommandPaletteRegistry
  - CommandPaletteContext
  - CommandPaletteProps
  - CommandPaletteBarProps
  - CommandPaletteIconProps
  - CommandPaletteScopeProps
  - CommandPaletteInputProps
  - CommandPaletteClearProps
  - CommandPaletteBodyProps
  - CommandPaletteListProps
  - CommandPalettePreviewProps
  - CommandPalettePageProps
  - CommandPaletteWidgetProps
  - CommandPaletteFooterProps
  - CommandPaletteEmptyProps
  - CommandPaletteGroupProps
  - CommandPaletteGroupLabelProps
  - CommandPaletteSeparatorProps
  - CommandPaletteItemProps
  - CommandPaletteItemIconProps
  - CommandPaletteItemTextProps
  - CommandPaletteItemDescriptionProps
  - CommandPaletteItemShortcutProps
---

# CommandPalette

## Overview

Top-anchored floating command launcher and extensible workspace palette (`<CommandPalette />`) built on `Overlay`, `focusTrap`, `ScrollArea`, `scrollFade`, `HitArea`, `Kbd`, and `src/shared/listbox/`. It owns an internal `<Overlay>` and coordinates a **2-Region Machined Pair**:

- **Region 1 (`CommandPaletteBar`):** Standalone `--cs-color-elevated` squircle bar housing the leading icon, active scope chip, borderless `<input role="combobox">`, and clear trigger. Works cleanly solo when Region 2 is omitted or empty.
- **Region 2 (`CommandPaletteBody` or direct-child `CommandPaletteList` / `CommandPalettePage`):** Unified `--cs-color-elevated` squircle tray housing the scrollable `role="listbox"`, optional split `CommandPalettePreview`, scoped `CommandPalettePage`, and optional tonal `CommandPaletteFooter` with zero interior hairline borders.

The outer shell animates together as one rigid body (`260ms` enter / `120ms` exit), while everything inside Region 2 enforces strict **`0ms` motion discipline**—filtering, highlighting, group collapsing, and page switching snap in a single synchronous paint.

## Usage Guidance

### Choosing a Composition Pattern
- **Minimal Launcher:** Place `<CommandPaletteBar>` and `<CommandPaletteList>` directly inside `<CommandPalette>` (omitting `CommandPaletteBody` when no preview or footer is needed).
- **Sub-Pages & Scopes (`pages`):** Use `<CommandPalettePage value="..." label="...">` for nested drill-down views (e.g., switching workspaces, picking a theme, or custom forms with `filter={false}`). Calling `pushPage()` inside `CommandPaletteItem` `onSelect` automatically keeps the palette open without needing `closeOnSelect={false}`.
- **Inline Widgets (`CommandPaletteWidget`):** Embed non-option blocks (e.g., live calculator readouts, unit converters, or quick toggles) inside `CommandPaletteList` or `CommandPalettePage`. Widgets suppress `CommandPaletteEmpty` when answering a query even if `visibleItemCount === 0`.
- **Split Preview (`CommandPalettePreview`):** Wrap `CommandPaletteList` and `CommandPalettePreview` in `<CommandPaletteBody>` to inspect the currently `highlightedValue` in a borderless `--cs-color-base-soft` inset card (automatically collapses below `560px` viewport width).
- **Dynamic Plugin Registry (`createCommandPaletteRegistry`):** Create a shared registry so routes or feature modules can dynamically `register()` prefix modes (e.g., `>`, `=`), async/dynamic `items`, inline `widget` snippets, or `pageView` extensions via `$effect`.
- **Global `Mod+K` Shortcut:** Set `shortcut={true}` (or a `CommandPaletteShortcutConfig` object) on `<CommandPalette>` for a self-contained global toggle, or attach `{@attach commandPaletteShortcut({ onTrigger })}` to an app-shell element when coordinating multiple triggers or pre-open state.

### Size, Backdrop & Separator Restraint
- **`size` (required):** Choose explicitly from `"sm"` (`480px`), `"md"` (`600px`), or `"lg"` (`704px`); each lifts proportionally at `@media (width >= 1536px)`.
- **`overlayVariant`:** Defaults to `"dim"` for crisp figure-ground separation without backdrop-blur smear over dense workspaces (`"blur"`, `"solid"`, and `"transparent"` remain selectable).
- **Separators:** Never pair `<CommandPaletteSeparator>` with `<CommandPaletteGroupLabel>`. Reserve separators strictly for unlabeled sections.

## API

### `CommandPalette` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "title">` and mounts `<Overlay>` internally when `open` is `true`, rendering `<div role="dialog" aria-modal="true" class="cs-command-palette">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `CommandPaletteSize` | Yes | — | Shell width and density scale: `"sm" \| "md" \| "lg"`. |
| `open` | `boolean` | No | `false` | `$bindable` visibility state controlling internal `<Overlay>` mounting. |
| `onOpenChange` | `(open: boolean) => void` | No | `undefined` | Called whenever `open` changes. |
| `inputValue` | `string` | No | `""` | `$bindable` query string in `CommandPaletteInput`. |
| `onInputValueChange` | `(inputValue: string) => void` | No | `undefined` | Called whenever `inputValue` changes. |
| `highlightedValue` | `string \| undefined` | No | `undefined` | `$bindable` `value` of the currently highlighted `CommandPaletteItem`. |
| `onHighlightedValueChange` | `(value: string \| undefined) => void` | No | `undefined` | Called whenever `highlightedValue` changes. |
| `pages` | `string[]` | No | `[]` | `$bindable` active scope stack (`pages.at(-1)` is `activePage`; `[]` is root). |
| `onPagesChange` | `(pages: string[]) => void` | No | `undefined` | Called whenever `pages` changes. |
| `filter` | `boolean \| CommandPaletteFilterFn` | No | `true` | `true` uses `scoreCommandPaletteMatch`; `false` disables client-side hiding; or pass a custom `(candidate, query) => boolean`. |
| `loop` | `boolean` | No | `true` | Wraps `ArrowDown`/`ArrowUp` highlight between first and last visible enabled items. |
| `resetOnClose` | `boolean` | No | `true` | Clears `inputValue` and `pages` after closing. |
| `popPageOnEscape` | `boolean` | No | `true` | Pops the active page on `Escape` when `pages.length > 0` (`Shift+Escape` always closes). |
| `popPageOnBackspace` | `boolean` | No | `true` | Pops the active page on `Backspace` when `inputValue === ""` (or caret is collapsed at `0`) and `pages.length > 0`. |
| `shortcut` | `boolean \| CommandPaletteShortcutConfig` | No | `false` | Registers a global `Mod+K` (or custom) toggle shortcut on `window`. |
| `registry` | `CommandPaletteRegistry` | No | `undefined` | Reactive plugin/command registry merged with `plugins`. |
| `plugins` | `readonly CommandPalettePlugin[]` | No | `undefined` | Declarative plugin array merged with `registry` (sorted by `priority` descending). |
| `overlayVariant` | `OverlayVariant` | No | `"dim"` | Backdrop treatment forwarded to `<Overlay>`. |
| `lockScroll` | `boolean` | No | `true` | Locks document scroll while open (forwarded to `<Overlay>`). |
| `dismissible` | `boolean` | No | `true` | Master dismissibility flag for `outside-click` and `Escape`. |
| `closeOnEscape` | `boolean` | No | `dismissible` | Granular override for `Escape` key dismissal. |
| `focusTrap` | `boolean` | No | `true` | Enables built-in `focusTrap` attachment. |
| `initialFocus` | `FocusTrapTarget \| false` | No | `CommandPaletteInput` | Initial focus target when opened; defaults to focusing `CommandPaletteInput` (or `"first-focusable"`). |
| `restoreFocus` | `boolean \| HTMLElement \| (() => HTMLElement \| null)` | No | `true` | Restores focus when closed. |
| `onBeforeClose` | `(reason: CommandPaletteCloseReason) => boolean \| void \| Promise<boolean \| void>` | No | `undefined` | Intercepts close requests; returning `false` cancels closing. |
| `onClose` | `(reason: CommandPaletteCloseReason) => void` | No | `undefined` | Called after `open` transitions to `false`. |
| `id` | `string` | No | `$props.id()` | Base ID for dialog, input, and listbox ARIA wiring. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `role="dialog"` element. |

### `CommandPalette` Instance Methods
Accessible via `bind:this={palette}` on `<CommandPalette>`:
- `requestClose(reason?: CommandPaletteCloseReason): Promise<boolean>` — Runs `dismissible`, `closeOnEscape`, and `onBeforeClose` checks (`reason` defaults to `"programmatic"`). Closes `open = false` if allowed.
- `pushPage(pageId: string, options?: CommandPalettePushPageOptions): void` — Pushes `pageId` onto `pages`, saving the current `inputValue` and `highlightedValue` to restore on `popPage()`. `options` accepts `{ label?: string; inputValue?: string }` (`inputValue` defaults to `""`).
- `popPage(): void` — Pops the top page and restores the parent scope's `inputValue` and `highlightedValue`.
- `resetPages(): void` — Clears `pages` to `[]` and restores root state.
- `focusInput(): void` — Focuses `CommandPaletteInput`.

### Command Bar Subcomponents
- **`CommandPaletteBar`** (`HTMLAttributes<HTMLDivElement>`):
  - `showScope?: boolean` (`@default true`) — Automatically renders a scope pill before `CommandPaletteInput` when `activePage` or an active `prefix` plugin is engaged (unless an explicit `<CommandPaletteScope>` is mounted).
  - `ref = $bindable(null)`. Clicking empty padding focuses `CommandPaletteInput`.
- **`CommandPaletteIcon`** (`Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`):
  - `icon?: Component<CommandPaletteIconComponentProps>` (`@default Search` from `@lucide/svelte`), `color?: string`.
- **`CommandPaletteScope`** (`Omit<HTMLButtonAttributes, "type">`):
  - `label?: string` (defaults to the active page/prefix label), `ref = $bindable(null)`. Renders `<button type="button" tabindex={-1}>` with `<HitArea size="sm" />`; clicking pops the active page or clears the active prefix without blurring `CommandPaletteInput`.
- **`CommandPaletteInput`** (`Omit<HTMLInputAttributes, "size" | "children" | "value">`):
  - `disabled?: boolean` (`@default false`), `autocomplete` (`@default "off"`), `spellcheck` (`@default false`), `ref = $bindable(null)`. Renders `<input type="text" role="combobox">`.
- **`CommandPaletteClear`** (`Omit<HTMLButtonAttributes, "type">`):
  - `icon?: Component<CommandPaletteIconComponentProps>` (`@default X`), `disabled?: boolean` (`@default false`), `ref = $bindable(null)`. Hidden (`data-visible="false"`, `aria-hidden="true"`) when `inputValue === ""` or `disabled`; includes `<HitArea size="sm" />`.

### Region 2 Tray, Page, Widget, Preview & Footer Subcomponents
- **`CommandPaletteBody`** (`HTMLAttributes<HTMLDivElement>`): `ref = $bindable(null)`. Unified Region 2 squircle tray (`grid-template-rows: minmax(0, 1fr) auto`) coordinating `CommandPaletteList`, optional `CommandPalettePreview`, `CommandPalettePage`, and `CommandPaletteFooter`.
- **`CommandPaletteList`** (`HTMLAttributes<HTMLDivElement>`): `maxHeight?: string` (overrides `--cs-command-palette-list-max-height`), `scrollbar?: ScrollAreaScrollbar` (`@default "hover"`), `ref = $bindable(null)`. Renders `<ScrollArea>` + `<ScrollAreaContent role="listbox">` with `scrollFade`. Acts as Region 2 when placed directly inside `CommandPalette` without `CommandPaletteBody`.
- **`CommandPalettePreview`** (`HTMLAttributes<HTMLDivElement>`): `ref = $bindable(null)`. Borderless `--cs-color-base-soft` concentric inset card in column 2 of `CommandPaletteBody` (hidden below `560px` viewport width).
- **`CommandPalettePage`** (`HTMLAttributes<HTMLDivElement>`): `value: string` (required), `label?: string`, `filter?: boolean | CommandPaletteFilterFn`, `ref = $bindable(null)`. Renders exclusively when `activePage === value`.
- **`CommandPaletteWidget`** (`HTMLAttributes<HTMLDivElement>`): `ref = $bindable(null)`. Non-option block (`div`) that registers its presence so `CommandPaletteEmpty` stays hidden while a widget is mounted.
- **`CommandPaletteFooter`** (`HTMLAttributes<HTMLDivElement>`): `ref = $bindable(null)`. Subtle tonal bottom strip spanning `grid-column: 1 / -1; grid-row: 2` inside `CommandPaletteBody`.

### Group, Separator, Empty & Item Subcomponents
- **`CommandPaletteGroup`** (`HTMLAttributes<HTMLDivElement>`): `ref = $bindable(null)`. Semantic `role="group"`, auto-hidden via CSS `:has()` when all child items have `data-hidden`.
- **`CommandPaletteGroupLabel`** (`HTMLAttributes<HTMLDivElement>`): `ref = $bindable(null)`. Wired via `aria-labelledby` and registered so child items include `groupLabel` in default search matching.
- **`CommandPaletteSeparator`** (`Omit<HTMLAttributes<HTMLDivElement>, "children">`): `ref = $bindable(null)`. `role="separator"` for unlabeled sections; auto-collapses via `:has()` when orphaned by filtering.
- **`CommandPaletteEmpty`** (`HTMLAttributes<HTMLDivElement>`): `ref = $bindable(null)`. Renders when `visibleItemCount === 0 && visibleWidgetCount === 0` (defaults to `"No results."` / `"Keine Ergebnisse."`).
- **`CommandPaletteItem`** (`Omit<HTMLAttributes<HTMLElement>, "children"> & Pick<HTMLAnchorAttributes, "href" | "target" | "rel" | "download" | "hreflang" | "referrerpolicy">`):

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | No | `$props.id()` | Unique identifier within the active scope. |
| `label` | `string` | No | Extracted text | Explicit filter/screen-reader label override. |
| `keywords` | `readonly string[]` | No | `undefined` | Extra search terms matched by `scoreCommandPaletteMatch`. |
| `icon` | `Component<CommandPaletteIconComponentProps>` | No | `undefined` | Shorthand leading icon. |
| `href` | `string` | No | `undefined` | Renders `<a href>` instead of `<div>` when set. |
| `negative` | `boolean` | No | `false` | Marks destructive commands (`data-negative`). |
| `disabled` | `boolean` | No | `false` | Disables highlight and activation (`aria-disabled="true"`). |
| `closeOnSelect` | `boolean` | No | `true` | Closes palette after `onSelect` unless `false`, `event.preventDefault()`, or `onSelect` mutated `pages`. |
| `onSelect` | `(event: MouseEvent \| KeyboardEvent) => void` | No | `undefined` | Activation callback. |
| `ref` | `HTMLElement \| null` | No | `null` | `$bindable` reference to the `<div>` or `<a>`. |

- **`CommandPaletteItemIcon`** (`Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): `icon: Component<CommandPaletteIconComponentProps>` (required), `color?: string`.
- **`CommandPaletteItemText`** (`HTMLAttributes<HTMLSpanElement>`): `ref = $bindable(null)`. Primary label; contributes to default label extraction.
- **`CommandPaletteItemDescription`** (`HTMLAttributes<HTMLParagraphElement>`): `ref = $bindable(null)`. Secondary muted subtitle.
- **`CommandPaletteItemShortcut`** (`HTMLAttributes<HTMLSpanElement>`): `ref = $bindable(null)`. Trailing shortcut slot (`aria-hidden="true"`, `tabular-nums`), designed for `<KbdGroup variant="ghost" size="sm" | "md">` or text.

### `commandPaletteShortcut(options?)`
Returns `Attachment<HTMLElement>` attaching a `keydown` listener to `node.ownerDocument.defaultView`:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `"k"` | Case-insensitive key name. |
| `mod` | `boolean` | `true` | Requires `metaKey` (without `ctrlKey`) on macOS/iOS, or `ctrlKey` (without `metaKey`) elsewhere. When `false`, rejects both. |
| `shiftKey` | `boolean` | `false` | Required `Shift` modifier state. |
| `altKey` | `boolean` | `false` | Required `Alt` modifier state. |
| `ignoreInputs` | `boolean` | `true` | Ignores editable targets outside `.cs-command-palette`. |
| `enabled` | `boolean \| (() => boolean)` | `true` | Reactive getter or boolean gate. |
| `onTrigger` | `(event: KeyboardEvent) => void` | `undefined` | Invoked after `event.preventDefault()`. |

### `createCommandPaletteRegistry()` & Plugin Types
Creates a reactive `CommandPaletteRegistry` backed by `SvelteMap`:
- `plugins: ReadonlyMap<string, CommandPalettePlugin>` — Reactive map of registered plugins.
- `register(plugin: CommandPalettePlugin): () => void` — Registers a plugin and returns an `unregister` cleanup function (only deletes if the same plugin instance is still registered).
- `registerCommands(commands: readonly CommandPaletteCommand[], options?: { group?: string; page?: string; priority?: number }): () => void` — Shorthand for registering command arrays.
- `unregister(pluginId: string): void` — Removes a plugin by ID.

`CommandPalettePlugin`:
- `id: string` (required), `label?: string`, `prefix?: string` (activates when `inputValue.startsWith(prefix)` at root), `page?: string` (target page ID, or `"*"` for all pages), `priority?: number`, `filter?: boolean`, `items?: readonly CommandPaletteCommand[] | ((ctx: CommandPaletteQueryContext) => readonly CommandPaletteCommand[])`, `widget?: Snippet<[CommandPalettePluginRenderContext]>`, `pageView?: Snippet<[CommandPalettePluginRenderContext]>`, `onOpen?: (palette: CommandPaletteContext) => void | (() => void)`.

`CommandPaletteCommand`:
- `value: string` (required), `label: string` (required), `description?: string`, `keywords?: readonly string[]`, `group?: string`, `icon?: Component<CommandPaletteIconComponentProps>`, `shortcut?: readonly string[] | string`, `href?: string`, `target?: string`, `rel?: string`, `negative?: boolean`, `disabled?: boolean`, `closeOnSelect?: boolean`, `onSelect?: (event: MouseEvent | KeyboardEvent) => void`.

### `scoreCommandPaletteMatch(query, candidate)`
Pure deterministic multi-token matcher (`> 0` match, `0` non-match). Splits `query.trim().toLowerCase()` on whitespace; every token must match at least one of `label`, `keywords`, `groupLabel`, or `value`, weighted by exact (`100` on label) > prefix (`80`) > word-boundary (`65`) > substring (`45`), plus full-phrase label bonuses (`+120` exact, `+60` prefix, `+30` substring).

### Constants & Context Helpers
- `COMMAND_PALETTE_SIZES = ["sm", "md", "lg"] as const`
- `COMMAND_PALETTE_CLOSE_REASONS = ["escape", "outside-click", "close-button", "select", "shortcut", "programmatic"] as const`
- `getCommandPaletteContext(): CommandPaletteContext`, `hasCommandPaletteContext(): boolean` — Exposes `{ open, size, inputValue, highlightedValue, pages, activePage, activePrefix, visibleItemCount, visibleWidgetCount, setInputValue, setHighlightedValue, pushPage, popPage, resetPages, focusInput, close }`.

### `data-*` Attributes
- **On `CommandPalette`:** `data-size={size}`, `data-has-page` (present when `activePage` is defined), `data-nav="keyboard"` (present during keyboard traversal).
- **On `CommandPaletteBar`:** `data-auto-scope` on the auto-rendered `CommandPaletteScope` button.
- **On `CommandPaletteClear`:** `data-visible=""` when visible, `data-visible="false"` when hidden.
- **On `CommandPalettePage`:** `data-page={value}`.
- **On `CommandPaletteItem`:** `data-value={resolvedValue}`, `data-highlighted`, `data-negative`, `data-disabled`, `data-hidden`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-command-palette-offset-top` | `min(15dvh, 128px)` (`min(16dvh, 160px)` `>= 1536px`) | Top viewport anchor offset on `.cs-command-palette-overlay`. |
| `--cs-command-palette-max-width` | `480px` / `600px` / `704px` (`512px` / `656px` / `768px` `>= 1536px`) | Shell max inline width by `size`. |
| `--cs-command-palette-max-height` | `100%` | Shell max block height inside overlay. |
| `--cs-command-palette-gap` | `8px` (`sm`/`md`), `10px` (`lg`) | Vertical gap between Region 1 and Region 2. |
| `--cs-command-palette-bg` / `--cs-command-palette-fg` | `var(--cs-color-elevated)` / `var(--cs-color-text-main)` | Surface fill and base text color for both regions. |
| `--cs-command-palette-shadow` | `var(--cs-shadow-floating)` | Floating shadow on Bar and Tray. |
| `--cs-command-palette-radius` | `18px` / `20px` / `22px` | Outer corner radius for Bar and Tray. |
| `--cs-command-palette-squircle` | `var(--cs-squircle)` | `corner-shape` superellipse value (`2.0`). |
| `--cs-command-palette-divider-bg` | `color-mix(in oklab, var(--cs-color-text-main) 9%, transparent)` | Hairline separator color. |
| `--cs-command-palette-dur-in` / `--cs-command-palette-dur-fade-in` / `--cs-command-palette-dur-out` | `--cs-dur-enter-sm` / `--cs-dur-effect` / `--cs-dur-exit-md` | Shell enter transform, enter opacity, and exit durations. |
| `--cs-command-palette-ease-in` / `--cs-command-palette-ease-out` | `--cs-ease-enter` / `--cs-ease-exit` | Shell enter and exit easing curves. |
| `--cs-command-palette-scale-start` / `--cs-command-palette-scale-exit` / `--cs-command-palette-translate-y` | `0.97` / `0.98` / `-6px` | Shell enter/exit scale and enter Y offset. |
| `--cs-command-palette-bar-height` / `--cs-command-palette-bar-px` / `--cs-command-palette-bar-gap` | `46/52/58px`, `16/18/22px`, `8/10/12px` | Command bar height, inline padding, and item gap. |
| `--cs-command-palette-icon-fg` / `--cs-command-palette-icon-size` | `var(--cs-color-text-weak)` / `17/19/20px` | Leading bar icon color and size. |
| `--cs-command-palette-input-fg` / `--cs-command-palette-placeholder-fg` / `--cs-command-palette-caret` | `text-strong` / `text-weaker` / `accent-solid` | Input text, placeholder, and caret colors. |
| `--cs-command-palette-input-font-size` | `var(--cs-text-sm)` (`sm`), `var(--cs-text-base)` (`md`/`lg`) | Input font size. |
| `--cs-command-palette-scope-bg` / `--cs-command-palette-scope-bg-hover` / `--cs-command-palette-scope-fg` | `base-soft` / `base-soft-hover` / `text-main` | Scope chip colors. |
| `--cs-command-palette-scope-height` / `--cs-command-palette-scope-px` / `--cs-command-palette-scope-radius` / `--cs-command-palette-scope-font-size` | `24/26/28px`, `9/10/10px`, `8/9/10px`, `var(--cs-text-xs)` | Scope chip geometry and typography. |
| `--cs-command-palette-clear-size` / `--cs-command-palette-clear-icon-size` / `--cs-command-palette-clear-inset` | `26/28/32px`, `14/16/16px`, `10/12/13px` | Clear button dimensions and trailing inset. |
| `--cs-command-palette-list-max-height` | `min(360/400/440px, 52/54/56dvh)` (lifts `>= 1536px`) | Scrollable list viewport ceiling. |
| `--cs-command-palette-first-group-pt` | `6px` (`sm`/`md`), `8px` (`lg`) | Top padding of the first group label. |
| `--cs-command-palette-item-bg` / `--cs-command-palette-item-bg-highlighted` / `--cs-command-palette-item-bg-active` | `transparent` / `base-soft` / `base-soft-hover` | Item background states. |
| `--cs-command-palette-item-fg` / `--cs-command-palette-item-description-fg` / `--cs-command-palette-item-icon-fg` / `--cs-command-palette-shortcut-fg` | `text-strong` / `text-weak` / `text-weak` / `text-weaker` | Item text, description, icon, and shortcut colors. |
| `--cs-command-palette-item-negative-fg` / `--cs-command-palette-item-negative-bg-highlighted` / `--cs-command-palette-item-negative-bg-active` | `negative-soft-fg` / `negative-soft` / `negative-soft-hover` | Destructive (`data-negative`) item colors. |
| `--cs-command-palette-widget-bg` / `--cs-command-palette-widget-px` / `--cs-command-palette-widget-py` | `var(--cs-color-base-soft)` / `12/14/16px` / `10/12/14px` | Inline widget surface and padding. |
| `--cs-command-palette-preview-width` / `--cs-command-palette-preview-px` / `--cs-command-palette-preview-py` | `44%` / `16/18/20px` / `14/16/18px` | Split preview column width and inset padding. |
| `--cs-command-palette-footer-bg` / `--cs-command-palette-footer-fg` | `3% text-main` tint / `var(--cs-color-text-weak)` | Tonal footer strip fill and text color. |
| `--cs-command-palette-footer-height` / `--cs-command-palette-footer-px` / `--cs-command-palette-footer-py` / `--cs-command-palette-footer-font-size` | `36/40/44px`, `16/18/22px`, `8px`, `12/13/13px` | Footer strip geometry and typography. |

## Examples

### Minimal Launcher with Global `Mod+K`
```svelte
<script lang="ts">
    import { FolderPlus, Settings } from "@lucide/svelte";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        CommandPalette,
        CommandPaletteBar,
        CommandPaletteClear,
        CommandPaletteEmpty,
        CommandPaletteGroup,
        CommandPaletteGroupLabel,
        CommandPaletteIcon,
        CommandPaletteInput,
        CommandPaletteItem,
        CommandPaletteItemShortcut,
        CommandPaletteItemText,
        CommandPaletteList,
    } from "cs/svelte/command-palette";
    import { Kbd, KbdGroup } from "cs/svelte/kbd";

    let open = $state(false);
</script>

<Button variant="secondary" size="md" onclick={() => (open = true)}>
    <ButtonLabel>Open Palette</ButtonLabel>
</Button>

<CommandPalette bind:open size="md" shortcut>
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Type a command or search..." />
        <CommandPaletteClear />
    </CommandPaletteBar>

    <CommandPaletteList>
        <CommandPaletteGroup>
            <CommandPaletteGroupLabel>Workspace</CommandPaletteGroupLabel>
            <CommandPaletteItem value="new-project" icon={FolderPlus} onSelect={() => {}}>
                <CommandPaletteItemText>New Project</CommandPaletteItemText>
                <CommandPaletteItemShortcut>
                    <KbdGroup variant="ghost" size="sm">
                        <Kbd>⌘</Kbd>
                        <Kbd>N</Kbd>
                    </KbdGroup>
                </CommandPaletteItemShortcut>
            </CommandPaletteItem>
            <CommandPaletteItem value="settings" icon={Settings} href="/settings">
                <CommandPaletteItemText>Workspace Settings</CommandPaletteItemText>
            </CommandPaletteItem>
        </CommandPaletteGroup>
        <CommandPaletteEmpty />
    </CommandPaletteList>
</CommandPalette>
```

### Sub-Pages / Scopes & Inline Widget
```svelte
<script lang="ts">
    import { Palette } from "@lucide/svelte";
    import {
        CommandPalette,
        CommandPaletteBar,
        CommandPaletteClear,
        CommandPaletteEmpty,
        CommandPaletteGroup,
        CommandPaletteGroupLabel,
        CommandPaletteIcon,
        CommandPaletteInput,
        CommandPaletteItem,
        CommandPaletteItemText,
        CommandPaletteList,
        CommandPalettePage,
        CommandPaletteWidget,
    } from "cs/svelte/command-palette";

    let open = $state(false);
    let inputValue = $state("");
    let palette = $state<CommandPalette | undefined>();
</script>

<CommandPalette bind:this={palette} bind:open bind:inputValue size="md">
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Search commands..." />
        <CommandPaletteClear />
    </CommandPaletteBar>

    <CommandPaletteList>
        {#if inputValue.startsWith("=")}
            <CommandPaletteWidget>
                <span>Quick expression: {inputValue.slice(1).trim() || "0"}</span>
            </CommandPaletteWidget>
        {/if}

        <CommandPaletteGroup>
            <CommandPaletteGroupLabel>Preferences</CommandPaletteGroupLabel>
            <CommandPaletteItem
                value="theme"
                icon={Palette}
                onSelect={() => palette?.pushPage("theme", { label: "Theme" })}
            >
                <CommandPaletteItemText>Switch Theme...</CommandPaletteItemText>
            </CommandPaletteItem>
        </CommandPaletteGroup>
        <CommandPaletteEmpty />
    </CommandPaletteList>

    <CommandPalettePage value="theme" label="Theme">
        <CommandPaletteList>
            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Appearance</CommandPaletteGroupLabel>
                <CommandPaletteItem value="theme-light"><CommandPaletteItemText>Light</CommandPaletteItemText></CommandPaletteItem>
                <CommandPaletteItem value="theme-dark"><CommandPaletteItemText>Dark</CommandPaletteItemText></CommandPaletteItem>
            </CommandPaletteGroup>
            <CommandPaletteEmpty />
        </CommandPaletteList>
    </CommandPalettePage>
</CommandPalette>
```

### Split Preview & Footer (`CommandPaletteBody`)
```svelte
<CommandPalette bind:open bind:highlightedValue size="lg">
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Search files and actions..." />
        <CommandPaletteClear />
    </CommandPaletteBar>

    <CommandPaletteBody>
        <CommandPaletteList>
            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Documents</CommandPaletteGroupLabel>
                <CommandPaletteItem value="readme">
                    <CommandPaletteItemText>README.md</CommandPaletteItemText>
                </CommandPaletteItem>
            </CommandPaletteGroup>
            <CommandPaletteEmpty />
        </CommandPaletteList>

        <CommandPalettePreview>
            <p class="text-sm font-medium">{highlightedValue ?? "Select an item"}</p>
        </CommandPalettePreview>

        <CommandPaletteFooter>
            <span>Select an action</span>
            <KbdGroup variant="soft" size="md">
                <Kbd>↵</Kbd>
                <Kbd>Esc</Kbd>
            </KbdGroup>
        </CommandPaletteFooter>
    </CommandPaletteBody>
</CommandPalette>
```

### Dynamic Plugin Registry & Global Attachment
```svelte
<script lang="ts">
    import {
        CommandPalette,
        CommandPaletteBar,
        CommandPaletteEmpty,
        CommandPaletteIcon,
        CommandPaletteInput,
        CommandPaletteList,
        commandPaletteShortcut,
        createCommandPaletteRegistry,
    } from "cs/svelte/command-palette";

    const registry = createCommandPaletteRegistry();
    let open = $state(false);

    $effect(() => {
        return registry.register({
            id: "commands-prefix",
            label: "Commands",
            prefix: ">",
            items: [{ value: "reload", label: "Reload Window", onSelect: () => {} }],
        });
    });
</script>

<div {@attach commandPaletteShortcut({ onTrigger: () => (open = !open) })}></div>

<CommandPalette bind:open size="md" {registry}>
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Search or type > for commands..." />
    </CommandPaletteBar>
    <CommandPaletteList>
        <CommandPaletteEmpty />
    </CommandPaletteList>
</CommandPalette>
```

## Behavior & Quirks

- **ARIA 1.2 Combobox-in-Dialog:** `CommandPalette` renders `role="dialog" aria-modal="true"` with `focusTrap` keeping DOM focus on `CommandPaletteInput` (`role="combobox"`, `aria-autocomplete="list"`, `aria-activedescendant`, `aria-controls`, `aria-expanded`) while `ArrowDown`/`ArrowUp` (and `Ctrl+N`/`Ctrl+P`, `Mod+ArrowUp`/`PageUp`, `Mod+ArrowDown`/`PageDown`) step `highlightedValue`. Plain `Home`/`End` remain reserved for text-caret movement inside `<input>`.
- **IME Composition & Capture-Phase `Escape`:** Both `CommandPaletteInput` (`Enter`, `Backspace`) and `focusTrap`'s capture-phase `onEscape` check `if (event.isComposing) return;` so IME candidate selection or cancellation never triggers a command or dismisses the palette.
- **Scope Stack Navigation (`Escape` / `Shift+Escape` / `Backspace`):** When `pages.length > 0`, `Escape` pops one scope (`popPageOnEscape`), while `Shift+Escape` always closes the palette immediately (`requestClose("escape")`). Pressing `Backspace` with an empty query (or collapsed caret at `0`) pops the active scope (`popPageOnBackspace`), restoring the parent scope's `inputValue` and `highlightedValue`.
- **`Mod+A` Background Selection Guard:** Pressing `Mod+A` inside `.cs-command-palette` calls `event.preventDefault()` whenever `event.target` is not an editable field (`input`, `textarea`, `[contenteditable]`), preventing accidental selection of background page text behind the overlay when focus is inside a widget or button.
- **Widget Focus Coexistence:** Interactive controls inside `CommandPaletteWidget`, `CommandPalettePreview`, `CommandPalettePage`, or `CommandPaletteFooter` participate in `focusTrap`'s `Tab` loop, and list keyboard handlers bail out when `event.target` is inside a custom widget control.
- **Quiet Keyboard-Nav Scrollbar & `0ms` Motion:** `data-nav="keyboard"` suppresses `:hover` highlight hijacking and `ScrollArea` track reveal during keyboard traversal (`scrollFade` edge masks remain active). Inside Region 2, all item, highlight, empty-state, group, and page updates happen in `0ms` (`transition: none; animation: none`).
- **Auto-Collapsing Chrome & Narrow Viewports:** Groups with zero visible items and orphaned leading/trailing/consecutive `CommandPaletteSeparator` elements collapse automatically via CSS `:has()`. Below `560px` viewport width, `CommandPalettePreview` hides (`display: none`) so `CommandPaletteList` retains full width.
