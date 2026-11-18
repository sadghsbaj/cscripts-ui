---
name: Kbd
kind: component
import: cs/svelte/kbd
exports:
  - Kbd
  - KbdGroup
  - KbdSeparator
  - KbdSymbol
  - KBD_KEYS
  - KBD_SIZES
  - KBD_VARIANTS
  - KBD_SYMBOL_DISPLAYS
  - KbdIconComponentProps
  - KbdKey
  - KbdKeyDefinition
  - KbdSize
  - KbdVariant
  - KbdSymbolDisplay
  - KbdProps
  - KbdGroupProps
  - KbdSeparatorProps
  - KbdSymbolProps
---

# Kbd

## Overview
Tactile keyboard keycap primitive (`<Kbd />`) and shortcut composition suite (`<KbdGroup />`, `<KbdSeparator />`, `<KbdSymbol />`) standardized on Linux and Windows conventions. Supports `soft`, `ghost`, and 3D `keycap` surfaces, context-inherited group styling, and typed symbol keys (`KBD_KEYS`).

## Usage Guidance
- **`soft`** *(recommended default)*: Use in almost all standard UIs. Cleanest baseline for inline hints, command palettes, menus, and toolbars.
- **`ghost`**: Use only for ultra-quiet, understated hints where even a soft pill adds too much visual weight (not for most apps).
- **`keycap`**: Reserve for specific, intentional highlights (onboarding, hero cards, shortcut showcases) where keys should physically stand out — not for routine small inline hints.

## Shortcut Composition Rules
- **One `<KbdGroup />` = one coherent shortcut** (e.g., `Ctrl + C`). With identical inner markup, `<KbdGroup />` automatically adapts to its `variant`:
  - `soft`: Renders as **one shared pill** (`--cs-color-base-soft`) with flattened inner `<Kbd />` items.
  - `ghost`: Renders as **one inline group** with flattened inner `<Kbd />` items.
  - `keycap`: Renders **separate 3D keycaps** with `2px` bottom-lip alignment on `<KbdSeparator />`.
- **Chained / separate shortcuts** (e.g., `Ctrl + C` then `Ctrl + V`) MUST use **separate `<KbdGroup />`s** (or standalone `<Kbd />`s for single keys) placed side by side.
- **Standalone vs. Group:** Standalone `<Kbd />` **requires** both `variant` and `size` (omitting either throws a runtime error). Inside `<KbdGroup />`, `<Kbd />` inherits both automatically via context (explicit props on `<Kbd />` override group context).

## Linux & Windows Standard
- **No OS detection, no macOS keys/icons, and no Unicode key glyphs** (`⌘`, `⌥`, `⇧`, `⌃`, `⏎`, `⌫`).
- Always use standard Linux/Windows key names (`Ctrl`, `Alt`, `Shift`, `Win`, `Enter`, `Backspace`, `Esc`, etc.) via `KBD_KEYS` or plain text children.

## API

### `Kbd` Props
Extends `HTMLAttributes<HTMLElement>` and renders `<kbd class="cs-kbd">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `KbdVariant` | Standalone | Inherited | Surface style: `"soft" \| "ghost" \| "keycap"`. Required outside `<KbdGroup />`. |
| `size` | `KbdSize` | Standalone | Inherited | T-shirt size: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. Required outside `<KbdGroup />`. |
| `symbol` | `KbdKey` | No | `undefined` | Shorthand key from `KBD_KEYS` (ignored when `children` is provided). Sets `aria-label` to `entry.title` unless overridden. |
| `display` | `KbdSymbolDisplay` | No | `"auto"` | Controls `symbol` rendering: `"auto" \| "icon" \| "text" \| "both"`. |
| `children` | `Snippet` | No | `undefined` | Custom key label or `<KbdSymbol />`. Overrides `symbol` shorthand. |
| `ref` | `HTMLElement \| null` | No | `null` | `$bindable` reference to the `<kbd>` element. |

### `KbdGroup` Props
Extends `HTMLAttributes<HTMLSpanElement>` and renders `<span class="cs-kbd-group">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `KbdVariant` | Yes | — | Surface treatment passed to child `<Kbd />` elements via context: `"soft" \| "ghost" \| "keycap"`. |
| `size` | `KbdSize` | Yes | — | T-shirt size passed to child `<Kbd />` elements via context: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the `<span>` element. |

### `KbdSeparator` Props
Extends `HTMLAttributes<HTMLSpanElement>` and renders `<span aria-hidden="true" class="cs-kbd-separator">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `children` | `Snippet` | No | Inline `+` SVG | Custom separator content (e.g. `/`). Defaults to an inline `+` SVG icon (`24×24`, `stroke-width="2.25"`). |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the `<span>` element. |

### `KbdSymbol` Props
Discriminated union for rendering typed `KBD_KEYS` entries or a custom Lucide icon inside `<Kbd />`.

| Mode | Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Built-in key | `symbol` | `KbdKey` | Yes | — | Key identifier from `KBD_KEYS`. (`icon` and `label` are `never`.) |
| Built-in key | `display` | `KbdSymbolDisplay` | No | `"auto"` | `"auto"` (icon if defined, else text), `"icon"`, `"text"`, or `"both"`. |
| Custom icon | `icon` | `Component<KbdIconComponentProps>` | Yes | — | Custom Lucide/SVG icon component rendered at `strokeWidth={2.25}`. (`symbol` and `display` are `never`.) |
| Custom icon | `label` | `string` | No | `undefined` | Accessible `.cs-kbd-sr-only` text for custom icon-only keys. |

### Constants & `KBD_KEYS`
- `KBD_VARIANTS = ["soft", "ghost", "keycap"] as const`
- `KBD_SIZES = ["xs", "sm", "md", "lg", "xl"] as const`
- `KBD_SYMBOL_DISPLAYS = ["auto", "icon", "text", "both"] as const`
- `KBD_KEYS`: Typed dictionary (`Record<string, KbdKeyDefinition>` where `KbdKeyDefinition = { text: string; title: string; icon?: Component<KbdIconComponentProps> }`):
  - **Modifiers:** `ctrl` / `control` (`Ctrl`), `alt` (`Alt`), `shift` (`Shift`, `ArrowBigUp`), `capslock` / `caps` (`Caps`, `ArrowBigUpDash`), `super` / `win` / `meta` (`Win`, `WinIcon`), `fn` (`Fn`)
  - **Navigation:** `arrowup` / `up` (`Up`, `ArrowUp`), `arrowdown` / `down` (`Down`, `ArrowDown`), `arrowleft` / `left` (`Left`, `ArrowLeft`), `arrowright` / `right` (`Right`, `ArrowRight`), `pageup` / `pgup` (`PgUp`, `ChevronsUp`), `pagedown` / `pgdn` (`PgDn`, `ChevronsDown`), `home` (`Home`), `end` (`End`)
  - **Editing & Actions:** `enter` (`Enter`, `CornerDownLeft`), `backspace` (`Backspace`, `Delete`), `delete` / `del` (`Del`), `tab` (`Tab`, `ArrowRightToLine`), `backtab` / `shifttab` (`Backtab`, `ArrowLeftToLine`), `space` / `spacebar` (`Space`), `escape` / `esc` (`Esc`), `insert` / `ins` (`Ins`)
  - **System & Media:** `printscreen` / `prtsc` / `prtscn` (`PrtSc`), `scrolllock` / `scrlk` (`ScrLk`), `break` / `pausebreak` (`Pause`), `numlock` / `num` (`Num`), `menu` / `contextmenu` / `apps` (`Menu`), `volup` / `volumeup` (`Vol+`), `voldown` / `volumedown` (`Vol−`), `mute` / `volumemute` (`Mute`), `play` (`Play`), `pause` (`Pause`), `brightnessup` / `sun` (`Bright+`), `brightnessdown` / `moon` (`Bright−`), `mic` / `microphone` (`Mic`), `power` (`Power`), `search` / `find` (`Search`), `undo` (`Undo`), `redo` (`Redo`)

### `data-*` Attributes
- `Kbd`: `data-variant={resolvedVariant}`, `data-size={resolvedSize}`, `data-icon-only` (present when rendering only an icon via `symbol`).
- `KbdGroup`: `data-variant={variant}`, `data-size={size}`.

### CSS Custom Properties
| Variable | Description |
| :--- | :--- |
| `--cs-kbd-height` | Resolved keycap / group height (`18px`, `20px`, `24px`, `28px`, `32px` across `xs`–`xl`). |
| `--cs-kbd-px` | Horizontal padding (`5px`, `6px`, `7px`, `9px`, `11px`). |
| `--cs-kbd-font-size` | Key label font size (`10px`, `11px`, `--cs-text-xs`, `13px`, `--cs-text-sm`). |
| `--cs-kbd-icon-size` | Symbol icon size (`11px`–`15px`). |
| `--cs-kbd-gap` | Gap between icon and text inside `<Kbd />` (`2px`–`5px`). |
| `--cs-kbd-group-gap` | Gap between items inside `<KbdGroup />` (`3px`–`5px`). |
| `--cs-kbd-separator-size` | Size of `<KbdSeparator />` icon/text (`12px`–`16px`). |
| `--cs-kbd-separator-height` | Height of `<KbdSeparator />` (`auto` by default; `100%` inside `soft` and `ghost` `<KbdGroup />` containers). |
| `--cs-kbd-bg` / `--cs-kbd-fg` / `--cs-kbd-shadow` | Surface background, foreground color, and shadow per variant. |
| `--cs-kbd-item-*` | Internal group overrides (`height`, `min-width`, `px`, `bg`, `shadow`, `margin-block-end`) used by `soft` / `ghost` `<KbdGroup />` containers. |
| `--cs-kbd-separator-offset` | Bottom margin offset on `<KbdSeparator />` (`2px` inside `keycap` groups to align with keycap's 2px lip). |

## Examples

```svelte
<script lang="ts">
    import { Terminal } from "@lucide/svelte";
    import { Kbd, KbdGroup, KbdSeparator, KbdSymbol } from "cs/svelte/kbd";
</script>

<!-- Recommended default: soft -->
<Kbd variant="soft" size="md">K</Kbd>

<KbdGroup variant="soft" size="md">
    <Kbd symbol="ctrl" />
    <KbdSeparator />
    <Kbd>K</Kbd>
</KbdGroup>

<!-- Keycap highlight & custom "/" separator -->
<KbdGroup variant="keycap" size="md">
    <Kbd symbol="ctrl" />
    <KbdSeparator />
    <Kbd symbol="shift" />
    <KbdSeparator />
    <Kbd>P</Kbd>
</KbdGroup>

<KbdGroup variant="soft" size="md">
    <Kbd symbol="alt" />
    <KbdSeparator>/</KbdSeparator>
    <Kbd symbol="tab" display="text" />
</KbdGroup>

<!-- Chained shortcuts: separate KbdGroup per shortcut -->
<div class="flex items-center gap-2">
    <KbdGroup variant="soft" size="md">
        <Kbd>Ctrl</Kbd>
        <KbdSeparator />
        <Kbd>C</Kbd>
    </KbdGroup>
    <KbdGroup variant="soft" size="md">
        <Kbd>Ctrl</Kbd>
        <KbdSeparator />
        <Kbd>V</Kbd>
    </KbdGroup>
</div>

<!-- KbdSymbol display modes & custom icon -->
<Kbd variant="soft" size="md">
    <KbdSymbol symbol="enter" display="both" />
</Kbd>

<Kbd variant="keycap" size="md">
    <KbdSymbol icon={Terminal} label="Terminal" />
</Kbd>
```

## Behavior & Quirks
- **Runtime context check:** Using `<Kbd />` outside `<KbdGroup />` without both `variant` and `size` throws an error in `$effect.pre`.
- **Single-character proportions:** `min-inline-size` defaults to `calc(var(--cs-kbd-height) + 4px)` so single-letter and icon-only keys stay soft squircle keycaps (`--cs-radius-full` + `--cs-squircle-smooth`) rather than collapsing into circles.
- **Keycap baseline compensation:** `keycap` adds `margin-block-end: 2px` to offset its 2px bottom lip shadow, keeping keycaps aligned with neighboring text and `<KbdSeparator />`.
- **Accessibility:** `Kbd` shorthand `symbol` automatically sets `aria-label` from `KBD_KEYS[symbol].title` (unless `aria-label` is passed explicitly) and hides decorative icons with `aria-hidden="true"`. `<KbdSymbol />` renders a visually hidden `.cs-kbd-sr-only` label when showing an icon without visible text.
