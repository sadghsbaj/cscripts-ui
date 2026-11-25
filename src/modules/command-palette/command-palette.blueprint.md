# Command Palette Module Blueprint

## 1. Overview & Scope

- **Kind:** `hybrid` (compound component suite + `commandPaletteShortcut` attachment + `createCommandPaletteRegistry` reactive plugin/command registry + `scoreCommandPaletteMatch` utility)
- **Purpose:** A fast, calm, non-clunky floating CLI/Spotlight command launcher and extensible workspace palette built on top of `Overlay`, `focusTrap`, `ScrollArea`, `scrollFade`, `HitArea`, `Kbd`, and `src/shared/listbox/`.
- **Comparison with Sibling Modules:**
  - **`Modal`:** General-purpose centered dialog card with padded header/body/footer chrome and medium dialog choreography.
  - **`Combobox`:** Anchor-positioned form autocomplete (`variant: "soft" | "elevated"`, `value`, hidden `<input name>`, validation states).
  - **`Dropdown`:** Anchor-positioned action menu (`role="menu"`, `rovingFocus`, no search `<input>`).
  - **`CommandPalette`:** Top-anchored, 2-region machined pair (`role="dialog"` + ARIA 1.2 `<input role="combobox">` + `role="listbox"`), zero double-chrome, instant (`0ms`) filtering/navigation, multi-page scope stack (`pages`), inline custom widgets, and dynamic runtime plugin registration.
- **Boundaries:**
  - Owns internal `<Overlay>` mounting (`open`), top-anchored viewport geometry, query filtering, ARIA 1.2 combobox highlight synchronization (`highlightedValue`), nested scope/page navigation (`pages`), custom widget focus coexistence, global hotkey handling (`Mod+K`), and dynamic plugin/command aggregation.
  - Delegates top-layer promotion, `VisualViewport` keyboard tracking, and scroll locking to `Overlay`, modal focus containment to `focusTrap`, list scrolling to `ScrollArea` / `scrollFade`, compact button touch targets to `HitArea`, shortcut key rendering to `Kbd` / `KbdGroup`, and base item layout/label extraction to `src/shared/listbox/`.
  - **Does not** implement form submission (`name`, `required`, `invalid`), virtualized 10,000-row windowing, or built-in network fetching/debouncing primitives.

---

## 2. Public API

### Exports (`src/modules/command-palette/index.ts`)

**Components (flat `PascalCase`):**
- `CommandPalette` — Root state/context coordinator, internal `<Overlay>` owner, and transparent floating dialog shell coordinating the 2-region machined pair (Region 1 Bar + Region 2 Content Tray).
- `CommandPaletteBar` — Region 1 (top): standalone floating `--cs-color-elevated` squircle bar housing leading icon, active scope/prefix chips, `<CommandPaletteInput>`, and trailing clear/action controls (works seamlessly solo when no Region 2 content is shown).
- `CommandPaletteIcon` — Optional leading decorative `<svg>` icon inside `CommandPaletteBar` (defaults to `Search` from `@lucide/svelte` when `icon` is omitted).
- `CommandPaletteScope` — Interactive breadcrumb/scope chip inside `CommandPaletteBar` (auto-rendered by `CommandPaletteBar` when `pages.length > 0` or an active prefix plugin is engaged, or customizable explicitly).
- `CommandPaletteInput` — Native `<input type="text" role="combobox">` bound to `inputValue`.
- `CommandPaletteClear` — Compact `<button type="button">` (`<HitArea size="sm" />`) that clears `inputValue` when non-empty.
- `CommandPaletteBody` — Region 2 (bottom): unified `--cs-color-elevated` squircle tray (`overflow: hidden`, CSS Grid `grid-template-rows: minmax(0, 1fr) auto`) housing `CommandPaletteList`, optional `CommandPalettePreview`, optional `CommandPalettePage`, and optional `CommandPaletteFooter` together with zero internal borders.
- `CommandPaletteList` — Scrollable `role="listbox"` (`ScrollArea` + `scrollFade`) rendering declarative groups/items/widgets alongside registered plugin commands/widgets; automatically acts as the Region 2 squircle tray when placed directly inside `CommandPalette` without `CommandPaletteBody`.
- `CommandPalettePreview` — Optional contextual detail/inspector rendered beside `CommandPaletteList` inside `CommandPaletteBody` as a calm borderless `--cs-color-base-soft` concentric inset card.
- `CommandPalettePage` — Scoped sub-view rendered exclusively when `activePage === value`; direct-child pages automatically act as the Region 2 squircle tray supporting nested command lists or arbitrary custom extension UIs.
- `CommandPaletteWidget` — Non-option custom block (`div`) inside `CommandPaletteList` or `CommandPalettePage` (e.g. inline calculator result, unit converter, live status card, or mini-form).
- `CommandPaletteFooter` — Optional subtle tonal bottom strip inside `CommandPaletteBody` for hints/status (zero `border-top`, zero extra shadow, zero footprint when omitted).
- `CommandPaletteEmpty` — Empty-state block rendered when `visibleItemCount === 0 && visibleWidgetCount === 0`.
- `CommandPaletteGroup` — Semantic option group (`role="group"`), auto-hidden when all child items are filtered out.
- `CommandPaletteGroupLabel` — Accessible group heading wired via `aria-labelledby`.
- `CommandPaletteItem` — Action/command option (`role="option"`, supports `value`, `keywords`, `negative`, `href`, `closeOnSelect`, `checked`, `onSelect(event, palette)`).
- `CommandPaletteItemIcon` — Leading decorative `<svg>` icon inside an item.
- `CommandPaletteItemText` — Primary single-line item label (`text-trim` when standalone).
- `CommandPaletteItemDescription` — Secondary muted subtitle/metadata.
- `CommandPaletteItemTrailing` — Trailing text slot (current value) before the shortcut.
- `CommandPaletteItemShortcut` — Trailing shortcut container (`aria-hidden="true"`, designed for `<KbdGroup variant="ghost" | "soft" size="sm" | "md">` or plain text).
- `CommandPaletteSeparator` — Subtle horizontal divider (`role="separator"`) reserved for unlabelled sections (not paired with `CommandPaletteGroupLabel`).

**Attachments, Registry & Utilities:**
- `commandPaletteShortcut(options?: CommandPaletteShortcutOptions): Attachment<HTMLElement>` — Global `Mod+K` (or custom key) listener attachment.
- `createCommandPaletteRegistry(): CommandPaletteRegistry` — Reactive Svelte 5 registry allowing external features/modules to register commands, prefix modes, inline widgets, and sub-pages dynamically at runtime.
- `scoreCommandPaletteMatch(query: string, candidate: CommandPaletteFilterCandidate): number` — Pure deterministic multi-token matcher/scorer (`> 0` match, `0` non-match) used by the default filter and available to dynamic/plugin sorters.
- `getCommandPaletteContext`, `hasCommandPaletteContext` — Typed Svelte 5 `createContext` accessors so custom widgets and extension sub-pages can read `inputValue`, `activePage`, `highlightedValue`, and call `pushPage` / `popPage` / `close`.

**Constants & Types:**
- `COMMAND_PALETTE_SIZES = ["sm", "md", "lg"] as const` -> `CommandPaletteSize`
- `COMMAND_PALETTE_CLOSE_REASONS = ["escape", "outside-click", "close-button", "select", "shortcut", "programmatic"] as const` -> `CommandPaletteCloseReason`
- `CommandPaletteFilterCandidate`, `CommandPaletteFilterFn`, `CommandPaletteShortcutOptions`, `CommandPaletteShortcutConfig`, `CommandPalettePageEntry`, `CommandPaletteCommand`, `CommandPalettePlugin`, `CommandPaletteQueryContext`, `CommandPalettePluginRenderContext`, `CommandPaletteRegistry`, `CommandPaletteContext`, plus `*Props` interfaces for every exported component.

### Architectural API Decisions

1. **No `variant` Prop on `<CommandPalette>` (Single Canonical 2-Region Machined Pair):**
   - Matching `Modal` and `Dropdown`, `CommandPalette` has a single canonical visual architecture: a transparent `.cs-command-palette` flex-column shell coordinating at most two separated borderless `--cs-color-elevated` squircle surfaces (`--cs-shadow-floating`) — Region 1 (`CommandPaletteBar`) and Region 2 (`CommandPaletteBody`, or a direct-child `CommandPaletteList` / `CommandPalettePage`). Backdrop treatment is controlled via `overlayVariant?: OverlayVariant` (`@default "dim"` — fast, calm, zero backdrop-blur noise over dense workspaces, while `"blur"`, `"solid"`, and `"transparent"` remain selectable).
2. **Required `size: CommandPaletteSize` (`"sm" | "md" | "lg"`, no default):**
   - Enforces explicit sizing per `architecture-and-apis.md`, scaling shell max-width, inter-region gap, command bar height, squircle radius, list max-height, footer height, and item density together (with a `@media (min-width: 1536px)` large-desktop lift).
3. **Internal `<Overlay>` Ownership:**
   - `<CommandPalette>` mounts `<Overlay>` internally when `open` is `true`, eliminating `{#if open}<Overlay>` boilerplate while preserving native exit transitions via `Overlay`'s `out:overlayExit`.

### Component, Attachment & Registry Contracts

#### `CommandPalette` (`Omit<HTMLAttributes<HTMLDivElement>, "title">`)
- `ref = $bindable<HTMLDivElement | null>(null)` — Bound to the `role="dialog"` shell element.
- `open = $bindable(false)` — Controls palette visibility and `<Overlay>` mounting.
- `onOpenChange?: (open: boolean) => void`
- `size: CommandPaletteSize` — **Required** (`"sm" | "md" | "lg"`, no default).
- `inputValue = $bindable("")` — Live query string in `CommandPaletteInput`.
- `onInputValueChange?: (inputValue: string) => void`
- `highlightedValue = $bindable<string | undefined>()` — Currently highlighted `CommandPaletteItem` `value`.
- `onHighlightedValueChange?: (value: string | undefined) => void`
- `pages = $bindable<string[]>([])` — Active nested scope/page stack (`pages.at(-1)` is `activePage`; empty array means root).
- `onPagesChange?: (pages: string[]) => void`
- `filter?: boolean | CommandPaletteFilterFn` — `@default true`.
  - `true`: Built-in multi-token case-insensitive match via `scoreCommandPaletteMatch` across `label`, `keywords`, and enclosing `groupLabel`.
  - `false`: Opts out of client-side item hiding (for async/external/plugin-driven filtering).
  - `(candidate, query) => boolean`: Custom client-side predicate.
- `loop?: boolean` — `@default true`. Wraps `ArrowDown`/`ArrowUp` highlight between first and last visible enabled items (standard CLI launcher ergonomics).
- `resetOnClose?: boolean` — `@default true`. Resets `inputValue = ""` and `pages = []` after closing so reopening starts clean.
- `popPageOnEscape?: boolean` — `@default true`. When `pages.length > 0`, `Escape` pops one scope level instead of closing (`Shift+Escape` always closes immediately).
- `popPageOnBackspace?: boolean` — `@default true`. When `inputValue === ""` and `pages.length > 0`, `Backspace` pops the active scope.
- `shortcut?: boolean | CommandPaletteShortcutConfig` — `@default false`. Opt-in global hotkey (`Mod+K` when `true`, or custom `{ key, mod, ignoreInputs }`) toggling `open`.
- `registry?: CommandPaletteRegistry` — Optional external reactive command/plugin registry.
- `plugins?: readonly CommandPalettePlugin[]` — Optional declarative array of plugins merged with `registry`.
- `overlayVariant?: OverlayVariant` — `@default "dim"`.
- `lockScroll?: boolean` — `@default true` (forwarded to `Overlay`).
- `dismissible?: boolean` — `@default true` (controls outside-click and `Escape` dismissal).
- `closeOnEscape?: boolean` — Defaults to `dismissible`.
- `focusTrap?: boolean` — `@default true`.
- `initialFocus?: FocusTrapTarget | false` — Defaults to focusing `CommandPaletteInput` (`() => inputRef ?? "first-focusable"`).
- `restoreFocus?: boolean | HTMLElement | (() => HTMLElement | null)` — `@default true`.
- `onBeforeClose?: (reason: CommandPaletteCloseReason) => boolean | void | Promise<boolean | void>`
- `onClose?: (reason: CommandPaletteCloseReason) => void`
- `id?: string` — Base ID for dialog/input/listbox ARIA wiring (falls back to `$props.id()`).
- **Exported Component Methods (`bind:this`):** `requestClose(reason?)`, `pushPage(pageId, options?)`, `popPage()`, `resetPages()`, `focusInput()`.

#### `CommandPaletteBar` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `showScope?: boolean` — `@default true`. Automatically renders `<CommandPaletteScope>` before `<CommandPaletteInput>` when `activePage` or an active `prefix` plugin is present (unless the consumer renders `<CommandPaletteScope>` manually).
- Clicking empty padding inside `CommandPaletteBar` keeps/moves focus on `CommandPaletteInput` (`mousedown` `preventDefault()`).

#### `CommandPaletteScope` (`Omit<HTMLButtonAttributes, "type">`)
- `ref = $bindable<HTMLButtonElement | null>(null)`
- Renders a calm pill badge (`<button type="button" tabindex={-1}>` with `<HitArea size="sm" />`) displaying the current page/prefix label; clicking pops the active page (or clears the active prefix) while preserving `<input>` focus (`onpointerdown` `preventDefault()`).

#### `CommandPaletteInput` (`Omit<HTMLInputAttributes, "size" | "children" | "value">`)
- `ref = $bindable<HTMLInputElement | null>(null)`
- `disabled?: boolean`
- Forwards `{...rest}` (`placeholder`, `autocomplete="off"` default, `spellcheck={false}` default, `aria-label`) to `<input>`.

#### `CommandPaletteIcon` & `CommandPaletteClear`
- `CommandPaletteIcon`: `icon?: Component<CommandPaletteIconComponentProps>` (`@default Search`), `color?: string`.
- `CommandPaletteClear`: `ref = $bindable<HTMLButtonElement | null>(null)`, `icon?: Component<CommandPaletteIconComponentProps>` (`@default X`), `disabled?: boolean`. Hidden (`data-visible="false"`, `aria-hidden="true"`) when `inputValue === ""`, includes `<HitArea size="sm" />`.

#### `CommandPaletteBody`, `CommandPaletteList`, `CommandPalettePreview`, `CommandPaletteFooter`
- `CommandPaletteBody`: `ref = $bindable<HTMLDivElement | null>(null)` — Unified Region 2 squircle tray (`overflow: hidden`, CSS Grid `grid-template-rows: minmax(0, 1fr) auto`) housing `CommandPaletteList`, optional `CommandPalettePreview`, optional `CommandPalettePage`, and optional `CommandPaletteFooter`.
- `CommandPaletteList`: `ref = $bindable<HTMLDivElement | null>(null)`, `maxHeight?: string` (`@default undefined` — governed by size-aware & `@media (min-width: 1536px)` CSS tokens unless explicitly overridden), `scrollbar?: ScrollAreaScrollbar` (`@default "hover"`). Automatically acts as Region 2 when rendered as a direct child of `CommandPalette` without `CommandPaletteBody`.
- `CommandPalettePreview`: `ref = $bindable<HTMLDivElement | null>(null)` — Borderless `--cs-color-base-soft` concentric inset card beside `CommandPaletteList` inside `CommandPaletteBody`.
- `CommandPaletteFooter`: `ref = $bindable<HTMLDivElement | null>(null)` — Subtle tonal bottom strip inside `CommandPaletteBody` (`grid-row` `auto`, zero `border-top`, zero extra shadow).

#### `CommandPalettePage` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `value: string` — Unique scope/page identifier matched against `activePage`.
- `label?: string` — Human-readable scope title surfaced in `CommandPaletteScope`.
- `filter?: boolean | CommandPaletteFilterFn` — Optional per-page filter override (e.g. `filter={false}` for a custom form or async search sub-page).

#### `CommandPaletteWidget` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- Registers its presence with context while mounted so `CommandPaletteEmpty` suppresses `"No results."` when a widget is answering the query (even if `visibleItemCount === 0`).

#### `CommandPaletteGroup`, `CommandPaletteGroupLabel`, `CommandPaletteSeparator`, `CommandPaletteEmpty`
- Mirror `ComboboxGroup`, `ComboboxGroupLabel`, `ComboboxSeparator`, `ComboboxEmpty` (`ref = $bindable()`).
- `CommandPaletteGroupLabel` registers its text with the enclosing `CommandPaletteGroup` context so child items include `groupLabel` in default search matching.
- `CommandPaletteSeparator` is reserved for unlabelled sections (not paired with `CommandPaletteGroupLabel`) and auto-hides via CSS `:has()` whenever no visible group, item, or widget precedes or follows it during filtering.
- `CommandPaletteEmpty` falls back to `t({ de: "Keine Ergebnisse.", en: "No results." })` when `children` is omitted.

#### `CommandPaletteItem` (`Omit<HTMLAttributes<HTMLElement>, "children"> & Pick<HTMLAnchorAttributes, "href" | "target" | "rel" | "download" | "hreflang" | "referrerpolicy">`)
- `ref = $bindable<HTMLElement | null>(null)` — `<div>` by default, or `<a>` when `href` is set.
- `value?: string` — Unique item identifier within the active scope (falls back to a stable `$props.id()` when omitted for pure action items).
- `label?: string` — Explicit filter/screen-reader label override (falls back to `extractListboxItemLabel`).
- `keywords?: readonly string[]` — Additional search terms matched by `scoreCommandPaletteMatch`.
- `icon?: Component<CommandPaletteIconComponentProps>` — Shorthand leading icon.
- `negative?: boolean` — `@default false`. Marks destructive commands (`data-negative`), matching `DropdownItem` and `naming.md`.
- `disabled?: boolean` — `@default false`.
- `closeOnSelect?: boolean` — `@default true`. Closes the palette after `onSelect` unless `false`, `event.preventDefault()` was called, or `onSelect` pushed/popped a page during execution! (Auto-detecting `pushPage()` inside `onSelect` avoids forcing `closeOnSelect={false}` boilerplate on every sub-page drill-down item.)
- `checked?: boolean` — `@default undefined`. Sets `aria-checked`/`data-checked` and renders an accent check mark.
- `onSelect?: (event: MouseEvent | KeyboardEvent, palette: CommandPaletteContext) => void`
- `children?: Snippet`

#### `CommandPaletteItemIcon`, `CommandPaletteItemText`, `CommandPaletteItemDescription`, `CommandPaletteItemShortcut`
- Mirror `DropdownItemIcon`, `DropdownItemText`, `DropdownItemDescription`, `DropdownItemShortcut` (`ref = $bindable()`).

#### `commandPaletteShortcut(options?: CommandPaletteShortcutOptions): Attachment<HTMLElement>`
- Single options object (`architecture-and-apis.md`):
  - `key?: string` — `@default "k"` (case-insensitive).
  - `mod?: boolean` — `@default true` (`metaKey` on macOS/iOS, `ctrlKey` elsewhere; rejects `altKey`).
  - `shiftKey?: boolean` — `@default false`.
  - `altKey?: boolean` — `@default false`.
  - `ignoreInputs?: boolean` — `@default true` (ignores editable targets outside `.cs-command-palette`).
  - `enabled?: boolean | (() => boolean)` — `@default true` (via `resolveGetter`).
  - `onTrigger: (event: KeyboardEvent) => void` — Invoked after `event.preventDefault()`.

#### `createCommandPaletteRegistry(): CommandPaletteRegistry`
- Reactive Svelte 5 store (`command-palette-registry.svelte.ts`) using `SvelteMap`:
  - `register(plugin: CommandPalettePlugin): () => void` — Registers a plugin (`id`, `label?`, `prefix?`, `page?`, `priority?`, `items?`, `widget?`, `pageView?`, `onOpen?`) and returns an `unregister` cleanup function suitable for `$effect(() => registry.register(plugin))`.
  - `registerCommands(commands: readonly CommandPaletteCommand[], options?: { group?: string; page?: string; priority?: number }): () => void` — Ergonomic shorthand for registering dynamic command arrays from app features/routes.
  - `unregister(pluginId: string): void`
  - `readonly plugins: ReadonlyMap<string, CommandPalettePlugin>`

### CSS Variables (`--cs-command-palette-*`)

- **Overlay, Shell & 2-Region Geometry (`.cs-command-palette-overlay`, `.cs-command-palette`):**
  - `--cs-command-palette-offset-top` (`min(15dvh, 128px)`), `--cs-command-palette-max-width`, `--cs-command-palette-max-height`, `--cs-command-palette-gap` (`8px` for `sm`/`md`, `10px` for `lg`)
  - `--cs-command-palette-bg` (`var(--cs-color-elevated)`), `--cs-command-palette-fg` (`var(--cs-color-text-main)`), native `--cs-shadow-floating`
  - `--cs-command-palette-radius` (`18px` / `20px` / `22px`), `--cs-command-palette-squircle` (`var(--cs-squircle)`)
- **Shell Motion (`.cs-command-palette`):**
  - `--cs-command-palette-dur-in` (`var(--cs-dur-enter-sm)`), `--cs-command-palette-dur-fade-in` (`var(--cs-dur-effect)`), `--cs-command-palette-dur-out` (`var(--cs-dur-exit-md)`)
  - `--cs-command-palette-ease-in` (`var(--cs-ease-enter)`), `--cs-command-palette-ease-out` (`var(--cs-ease-exit)`)
  - `--cs-command-palette-scale-start` (`0.97`), `--cs-command-palette-scale-exit` (`0.98`), `--cs-command-palette-translate-y` (`-6px`)
- **Command Bar & Scope Chip (`.cs-command-palette-bar`):**
  - `--cs-command-palette-bar-height` (`46px` / `52px` / `58px`), `--cs-command-palette-bar-px`, `--cs-command-palette-bar-gap`
  - `--cs-command-palette-input-fg` (`var(--cs-color-text-strong)`), `--cs-command-palette-placeholder-fg` (`var(--cs-color-text-weaker)`), `--cs-command-palette-caret` (`var(--cs-color-accent-solid)`), `--cs-command-palette-icon-fg` (`var(--cs-color-text-weak)`), `--cs-command-palette-icon-size`
  - `--cs-command-palette-scope-bg` (`var(--cs-color-base-soft)`), `--cs-command-palette-scope-bg-hover` (`var(--cs-color-base-soft-hover)`), `--cs-command-palette-scope-fg` (`var(--cs-color-text-main)`)
- **List, Items, Preview & Footer (`.cs-command-palette-body`, `.cs-command-palette-list`, `.cs-command-palette-item`, `.cs-command-palette-preview`, `.cs-command-palette-footer`):**
  - Inherits `--cs-listbox-*` item geometry mapped to `size` (`sm`, `md`, `lg`) plus:
  - `--cs-command-palette-list-max-height` (`360px` / `400px` / `440px`, lifting to `400px` / `460px` / `520px` at `@media (min-width: 1536px)`)
  - `--cs-command-palette-item-bg`, `--cs-command-palette-item-bg-highlighted` (`var(--cs-color-base-soft)`), `--cs-command-palette-item-bg-active` (`var(--cs-color-base-soft-hover)`)
  - `--cs-command-palette-item-fg` (`var(--cs-color-text-strong)`), `--cs-command-palette-item-description-fg` (`var(--cs-color-text-weak)`), `--cs-command-palette-item-icon-fg` (`var(--cs-color-text-weak)`), `--cs-command-palette-shortcut-fg` (`var(--cs-color-text-weaker)`)
  - `--cs-command-palette-item-negative-fg` (`var(--cs-color-negative-soft-fg)`), `--cs-command-palette-item-negative-bg-highlighted` (`var(--cs-color-negative-soft)`), `--cs-command-palette-item-negative-bg-active` (`var(--cs-color-negative-soft-hover)`)
  - `--cs-command-palette-preview-width` (`44%`), `--cs-command-palette-footer-bg` (`color-mix(in oklab, var(--cs-color-text-main) 3%, transparent)`), `--cs-command-palette-footer-height` (`36px` / `40px` / `44px`), `--cs-command-palette-footer-px`, `--cs-command-palette-footer-py`, `--cs-command-palette-footer-fg` (`var(--cs-color-text-weak)`)

---

## 3. DOM, Semantics & Accessibility

### Native Elements & `data-*` Selectors
- **Overlay (`.cs-command-palette-overlay`):**
  - Rendered internally via `<Overlay variant={overlayVariant}>` when `open` is `true`.
  - Backdrop click triggers `requestClose("outside-click")`.
- **Shell (`.cs-command-palette`):**
  - `<div role="dialog" aria-modal="true" aria-label={resolvedAriaLabel} data-size={size} data-has-page={activePage ? "" : undefined} data-nav={isKeyboardNav ? "keyboard" : undefined}>`
  - Default `aria-label` when neither `aria-label` nor `aria-labelledby` is supplied: `t({ de: "Befehlspalette", en: "Command palette" })` via `src/shared/lang.internal.ts`.
  - Attaches `focusTrap` (`initialFocus` targeting `CommandPaletteInput`, `allowOutsideClick` permitting `.cs-overlay` backdrop clicks, `onEscape` wired to scope-aware `handleEscape`).
- **Command Bar & Input (`.cs-command-palette-bar`, `.cs-command-palette-input`):**
  - `<input type="text" role="combobox" autocomplete="off" spellcheck={false}>`
  - `aria-expanded={hasListMounted ? "true" : "false"}`
  - `aria-controls={hasListMounted ? listboxId : undefined}`
  - `aria-autocomplete="list"`
  - `aria-activedescendant={highlightedItemId}`
  - Default `aria-label` fallback: `t({ de: "Befehl suchen", en: "Search commands" })`.
- **Listbox & Items (`.cs-command-palette-list`, `.cs-command-palette-item`):**
  - `<ScrollAreaContent id={listboxId} role="listbox" tabindex={-1} aria-label={resolvedListboxLabel}>`
  - `<div|a id={itemId} role="option" tabindex={-1} aria-selected={isHighlighted ? "true" : "false"} aria-disabled={isDisabled ? "true" : undefined} data-value={resolvedValue} data-highlighted={isHighlighted ? "" : undefined} data-negative={negative ? "" : undefined} data-disabled={isDisabled ? "" : undefined} data-hidden={!isVisible ? "" : undefined} hidden={!isVisible}>`
- **Groups & Auto-Collapsing Chrome:**
  - `CommandPaletteGroup`: `<div role="group" aria-labelledby={groupLabelId}>` — hidden via CSS `:has(.cs-command-palette-item):not(:has(.cs-command-palette-item:not([data-hidden])))` when all items inside are filtered out.
  - `CommandPaletteSeparator`: Reserved for unlabelled sections (not paired with `CommandPaletteGroupLabel`). Auto-hides via CSS `:has()` whenever no visible group, item, or widget precedes or follows it during filtering (collapsing orphaned leading, trailing, or consecutive separators).
  - Because `CommandPaletteBar` is a standalone floating Region 1 surface with no structural dividers between regions, omitting or collapsing Region 2 (`CommandPaletteBody` / `CommandPaletteList` / `CommandPalettePage`) leaves a pure solo command bar with zero stray borders or chrome.

### Keyboard, Combobox Focus & Widget Coexistence
- **ARIA 1.2 Input-Retained Focus:**
  - DOM focus remains on `CommandPaletteInput` during list filtering and option traversal (`rovingFocus` is **not** used).
  - Whenever `inputValue`, `activePage`, or plugin items change, if `highlightedValue` is no longer visible/enabled, `highlightedValue` snaps synchronously (`0ms`) to the first visible enabled item.
- **Navigation Keys (when focus is in `CommandPaletteInput`):**
  - `ArrowDown` / `Ctrl+N` (macOS/CLI convention when no `metaKey`/`altKey`): Moves `highlightedValue` to next visible enabled item (`scrollIntoView({ block: "nearest" })`, sets `data-nav="keyboard"`).
  - `ArrowUp` / `Ctrl+P`: Moves `highlightedValue` to previous visible enabled item.
  - `Mod+ArrowUp` / `PageUp` and `Mod+ArrowDown` / `PageDown`: Jumps to first / last visible enabled item while keeping plain `Home` and `End` exclusively for `<input>` text-caret movement.
  - `Enter`: Ignores if `event.isComposing`. Activates the highlighted `CommandPaletteItem` (`click()` for `<a href>` items or `selectItem(item, event)`).
  - `Backspace`: When `inputValue === ""` (and selection is collapsed at `0`) and `pages.length > 0` with `popPageOnBackspace`: `preventDefault()` and calls `popPage()`, restoring the parent scope's query and highlight.
  - `Escape` (handled via `focusTrap`'s capture `onEscape` hook): Ignores if `event.isComposing`. If `pages.length > 0 && popPageOnEscape && !event.shiftKey`, calls `popPage()`; otherwise calls `requestClose("escape")`.
- **`Mod+A` Background Selection Guard:**
  - Pressing `Mod+A` (`Ctrl+A` / `Cmd+A`) inside `.cs-command-palette` calls `event.preventDefault()` whenever `event.target` is not an editable field (`input`, `textarea`, `[contenteditable]`), preventing accidental selection of background page text behind the overlay when focus is inside a widget or button.
- **Pointer vs. Keyboard Discipline & Quiet Keyboard-Nav Scrollbar:**
  - `data-nav="keyboard"` on `.cs-command-palette` suppresses `:hover` while scrolling via keyboard so stationary cursors never hijack highlight. Actual `pointermove` (`pointerType === "mouse"`) clears `data-nav="keyboard"` and updates `highlightedValue` to the hovered item.
  - When `data-nav="keyboard"` is active and the pointer is neither hovering nor dragging the list's `ScrollArea`, the overlay scrollbar track stays suppressed (relying on `scrollFade` edge masks for quiet spatial cues) while mouse hover, wheel, and drag behave normally.
  - `onpointerdown` on `CommandPaletteItem`, `CommandPaletteClear`, and `CommandPaletteScope` calls `event.preventDefault()` (except on interactive controls inside `CommandPaletteWidget`) so clicking an item or chip never blurs `CommandPaletteInput`.
- **Interactive Widget & Custom Page Coexistence (`guardCustomWidgetKeys`):**
  - Focusable controls inside `<CommandPaletteWidget>`, `<CommandPalettePreview>`, `<CommandPalettePage>`, or `<CommandPaletteFooter>` participate naturally in `focusTrap`'s `Tab` / `Shift+Tab` loop after `CommandPaletteInput`.
  - List navigation handlers bail out whenever `event.target` is inside an interactive widget element outside `CommandPaletteInput`, ensuring `<Button>`, `<Switch>`, `<TextInput>`, or custom extension forms receive unmodified `Space`, `Enter`, `Arrow*`, and `Backspace` keys.

---

## 4. Visual & Motion Contract

### Surface, Shape & Proportional Sizing
- **2-Region Machined Pair (Max 2 Separated Surfaces, Zero Double-Chrome, Zero Structural Borders):**
  - `.cs-command-palette` is a transparent flex-column container (`gap: var(--cs-command-palette-gap)` — `8px` for `sm`/`md`, `10px` for `lg`; `overflow: visible`) that owns `max-inline-size`, `max-block-size`, and unified shell enter/exit motion (`260ms` enter / `120ms` exit) so both regions animate together as one rigid body.
  - At most two separated borderless `--cs-color-elevated` squircle surfaces (`18px` / `20px` / `22px` radius, `--cs-squircle` `2.0`, native `--cs-shadow-floating`, zero structural `1px` borders):
    - **Region 1 (Top) — `CommandPaletteBar`:** Standalone floating `--cs-color-elevated` squircle (`18px` / `20px` / `22px` radius, `--cs-squircle` `2.0`, native `--cs-shadow-floating`), working seamlessly solo when no Region 2 content is shown. `CommandPaletteInput` has **no** inner border, fill, or inset focus ring—the blinking `--cs-color-accent-solid` caret and calm leading icon indicate readiness without heavy form-field chrome.
    - **Region 2 (Bottom) — `CommandPaletteBody`:** ONE unified `--cs-color-elevated` squircle tray (`18px` / `20px` / `22px` radius, `--cs-squircle` `2.0`, native `--cs-shadow-floating`, `overflow: hidden`) housing `CommandPaletteList`, optional `CommandPalettePreview`, optional `CommandPalettePage`, and optional `CommandPaletteFooter` together via CSS Grid (`grid-template-rows: minmax(0, 1fr) auto`). When `CommandPaletteBody` is omitted in minimal list-only palettes, a direct-child `CommandPaletteList` (or `CommandPalettePage`) automatically acts as Region 2.
    - **Inside Region 2 (Zero Borders):**
      - `CommandPalettePreview`: Calm borderless `--cs-color-base-soft` concentric inset card (`border-radius: var(--cs-listbox-item-radius)`, `--cs-squircle-smooth`), zero vertical border, zero extra shadow.
      - `CommandPaletteFooter`: Subtle tonal bottom strip (`--cs-command-palette-footer-bg: color-mix(in oklab, var(--cs-color-text-main) 3%, transparent)`), zero `border-top`, zero extra shadow, zero footprint when omitted.
- **Top-Anchored Viewport Stability:**
  - `.cs-command-palette-overlay` uses `align-items: flex-start` with `padding-block-start: calc(var(--cs-command-palette-offset-top) + var(--cs-overlay-inset-top, 0px))`. Changing result counts from 20 items to 0 items changes only the bottom edge of Region 2—the `CommandPaletteBar` never shifts vertically.
- **Scale Calibration (`sm` | `md` | `lg`) & Large-Desktop Lift (`@media (min-width: 1536px)`):**
  - `sm`: `max-width: 480px` (`512px` at `>= 1536px`), inter-region gap `8px`, radius `18px`, bar height `46px`, list max-height `360px` (`400px` at `>= 1536px`), item height `34px`, footer height `36px`, input `--cs-text-sm` (`14px`), `<Kbd>` size `sm`.
  - `md`: `max-width: 600px` (`656px` at `>= 1536px`), inter-region gap `8px`, radius `20px`, bar height `52px`, list max-height `400px` (`460px` at `>= 1536px`), item height `38px`, footer height `40px`, input `--cs-text-base` (`16px`), `<Kbd>` size `sm`.
  - `lg`: `max-width: 704px` (`768px` at `>= 1536px`), inter-region gap `10px`, radius `22px`, bar height `58px`, list max-height `440px` (`520px` at `>= 1536px`), item height `42px`, footer height `44px`, input `--cs-text-base` (`16px`), `<Kbd>` size `md`.
- **Item, Scrollbar & Shortcut Aesthetics:**
  - Highlighted/hovered items use `--cs-color-base-soft` (`--cs-squircle-soft`, concentric inner radius `tray-radius - list-padding`).
  - Destructive (`data-negative`) items use `--cs-color-negative-soft-fg` text/icons on highlight with `--cs-color-negative-soft` fill (staying calm in resting state or subtly tinted on highlight/hover, matching `DropdownItem`).
  - During keyboard navigation (`data-nav="keyboard"`), the list's `ScrollArea` overlay scrollbar track stays hidden unless hovered or dragged, relying on `scrollFade` edge masks for quiet spatial cues.
  - Shortcuts in `CommandPaletteItemShortcut` and `CommandPaletteFooter` pair cleanly with `<KbdGroup variant="ghost" | "soft" size="sm">` (for `sm`/`md`) or `size="md"` (for `lg`) (`tabular-nums`, `color: var(--cs-command-palette-shortcut-fg)`).

### Strict Motion Discipline
- **Fast, Crisp Unified Shell Enter/Exit ONLY:**
  - **Enter (`:popover-open` + `@starting-style`):** Applied on `.cs-command-palette` so both regions move as one rigid body. `transform-origin: top center`; `opacity` `0 -> 1` over `--cs-dur-effect` (`160ms`, `--cs-ease-effect`), `scale` `0.97 -> 1` and `translate` `0 -6px -> 0 0` over `--cs-dur-enter-sm` (`260ms`, `--cs-ease-enter`).
  - **Exit:** `opacity` `1 -> 0`, `scale` `1 -> 0.98`, `translate` `0 0 -> 0 -4px` over `--cs-dur-exit-md` (`120ms`, `--cs-ease-exit`). `.cs-command-palette-overlay` matches its exit duration to `120ms` so `Overlay`'s `overlayExit` unmounts promptly.
- **Zero (`0ms`) List, Filter, Highlight & Layout Transitions:**
  - `.cs-command-palette-item`, `.cs-command-palette-item .cs-listbox-item-icon`, and `.cs-command-palette-item-shortcut` enforce `transition: none; scale: 1; will-change: auto;` (explicitly overriding `listbox.css` color/background/scale transitions). `:active` applies `--cs-command-palette-item-bg-active` instantaneously with **no** scale bounce.
  - `.cs-command-palette-empty` enforces `animation: none;` (explicitly overriding `cs-listbox-empty-in`).
  - `.cs-command-palette-body`, `.cs-command-palette-list`, `.cs-command-palette-group`, `.cs-command-palette-page`, and `.cs-command-palette-widget` have **zero** height, opacity, or transform transitions—typing, filtering, highlighting, and page switching update in `0ms`.

---

## 5. Edge Cases & Constraints

- **Subpixel Text Crispness on GPU Layer:**
  - Because `.cs-command-palette` promotes `will-change: opacity, scale, translate` while open (matching `Modal`), fractional computed `line-height` values inside the shell MUST snap to whole pixels via CSS `round(up, ..., 1px)` and horizontal centering uses flex layout rather than `translate: -50%` (`design-and-tokens.md`).
- **Hit Area Compliance:**
  - `CommandPaletteClear` and `CommandPaletteScope` are compact `<button>` controls `< 1936px²` and MUST render `<HitArea size="sm" />`.
  - `CommandPaletteInput` is a void `<input>` inside clickable `CommandPaletteBar`—never wrap it in pseudo/button hit-area helpers.
- **IME Composition & Capture-Phase `Escape`:**
  - Both `CommandPaletteInput` (`Enter`, `Backspace`) and `focusTrap`'s capture-phase `onEscape` callback MUST check `if (event.isComposing) return;` so CJK/IME candidate confirmation or cancellation never prematurely runs a command or dismisses the palette.
- **`Mod+A` Background Selection Guard:**
  - When focus is inside a non-editable control within `.cs-command-palette` (such as a widget button or toggle), pressing `Mod+A` (`Ctrl+A` / `Cmd+A`) calls `event.preventDefault()` so the browser does not select background page text behind the overlay; editable targets (`input`, `textarea`, `[contenteditable]`) retain native select-all behavior.
- **Prefix Plugin Modes vs. Page Stack:**
  - Typing a registered plugin `prefix` (e.g. `> ` or `= `) at the start of `inputValue` activates that plugin's mode dynamically without mutating `pages`; backspacing through the prefix naturally exits prefix mode, whereas `pushPage(id)` pushes an explicit scope frame onto `pages` with parent query/highlight restoration on `popPage()`.
- **Mobile On-Screen Keyboard (`VisualViewport`):**
  - `Overlay` automatically tracks `window.visualViewport` (`--cs-overlay-inset-top` / `--cs-overlay-inset-bottom`). `.cs-command-palette` constrains `max-block-size: 100%` with `CommandPaletteList` flexing (`flex: 1 1 auto; min-height: 0`), ensuring the list shrinks cleanly above mobile keyboards without pushing `CommandPaletteBar` off-screen.
- **Explicit Non-Goals (v1):**
  - Form field binding (`name`, `required`, `invalid`), multi-select token tagging, virtualized DOM windowing, and built-in remote fetch/debounce orchestration.
- **Browser Support:**
  - Targets modern Chromium first with graceful degradation in modern engines, leveraging native `[popover="manual"]` top-layer (`:popover-open`, `@starting-style`, `allow-discrete`), CSS `:has()`, CSS Nesting, `round()`, and `corner-shape` squircles.
