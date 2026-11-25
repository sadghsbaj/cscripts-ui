---
name: CommandPaletteTheme
kind: utility
import: cs/svelte/command-palette-theme
exports:
  - createCommandPaletteThemePlugin
  - COMMAND_PALETTE_THEME_PLUGIN_ID
  - CommandPaletteThemePluginOptions
---

# CommandPaletteTheme

## Overview

Optional `CommandPalettePlugin` factory that adds a "Change Theme" command to any `CommandPalette`. Selecting it opens a sub-page listing System, Light, and Dark, with the active mode checked. Use it instead of hand-rolling a theme page.

## API

### `createCommandPaletteThemePlugin(options?)`

Returns a plain `CommandPalettePlugin`. Options are read once when the factory runs.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | `COMMAND_PALETTE_THEME_PLUGIN_ID` (`"cs-command-palette-theme"`) | Plugin id. Also used as the pushed page id and as the prefix of item values (`<id>:root`, `<id>:mode:<mode>`). Must be unique per registry. |
| `priority` | `number` | `0` | Plugin sort priority (higher first). |
| `placement` | `CommandPalettePluginPlacement` | `"end"` | Whether the plugin renders before (`"start"`) or after (`"end"`) declarative groups. |
| `group` | `string` | `"Appearance"` / `"Darstellung"` | Group label of the root item. |
| `closeOnSelect` | `boolean` | `true` | Whether picking a mode closes the palette. |
| `shortcut` | `readonly string[] \| string` | `undefined` | Display-only shortcut hint on the root item (does not bind a hotkey). |
| `keywords` | `readonly string[]` | `[]` | Extra search keywords appended to the built-in English and German ones. |
| `labels` | `{ root?: string; page?: string; modes?: Partial<Record<ThemeMode, string>> }` | `"Change Theme"` / `"Design ändern"`; `page` falls back to `root`; modes fall back to `THEME_LABELS` | Overrides for the root item, the scope-pill label, and individual mode labels. |
| `manager` | `ThemeManager` | `theme` singleton | Theme manager to read and write. Pass your own for isolated or SSR setups. |

### Exports

- `COMMAND_PALETTE_THEME_PLUGIN_ID` — default plugin id.
- `CommandPaletteThemePluginOptions` — options interface.

### Generated Items

- **Root item** (`<id>:root`): icon `THEME_ICONS[manager.mode]`, `trailing` set to the current mode label, de + en keywords. Selecting it pushes the plugin page and highlights the active mode.
- **Page items** (`<id>:mode:system | light | dark`): no group label, `checked` for the active mode, call `manager.set(mode)` on select.

## Examples

### Via `plugins`

```svelte
<script lang="ts">
    import { CommandPalette, CommandPaletteBar, CommandPaletteInput, CommandPaletteList, CommandPaletteEmpty } from "cs/svelte/command-palette";
    import { createCommandPaletteThemePlugin } from "cs/svelte/command-palette-theme";

    // Hoist: create once, not inside the markup.
    const themePlugin = createCommandPaletteThemePlugin();
    let open = $state(false);
</script>

<CommandPalette bind:open size="md" plugins={[themePlugin]}>
    <CommandPaletteBar>
        <CommandPaletteInput placeholder="Search commands…" />
    </CommandPaletteBar>
    <CommandPaletteList>
        <CommandPaletteEmpty />
    </CommandPaletteList>
</CommandPalette>
```

### Options

```ts
const themePlugin = createCommandPaletteThemePlugin({
    closeOnSelect: false,
    shortcut: "Ctrl+T",
    labels: { root: "Appearance", modes: { system: "Auto" } },
});
```

### Via a Registry

```ts
const registry = createCommandPaletteRegistry();
const unregister = registry.register(createCommandPaletteThemePlugin());
// later: unregister();
```

```svelte
<CommandPalette bind:open size="md" {registry}>…</CommandPalette>
```

### Building a Similar Plugin

Follow the same shape for future plugins (e.g. language):

1. One module folder `command-palette-<feature>/` with `index.ts`.
2. One factory `createCommandPalette<Feature>Plugin(options?)` returning a `CommandPalettePlugin`; options are read once.
3. `page: "*"` and an `items(ctx)` function: return a root item when `ctx.activePage === undefined`, and the page items when `ctx.activePage === id`; return `[]` otherwise.
4. Use `onSelect(event, palette)` with `palette.pushPage(id, { label })` to open the sub-page, `checked` to mark the active choice, `trailing` to show the current value.
5. Only `import type` from `command-palette`; keep logic in the feature's own module.

## Behavior & Quirks

- **Reactivity:** `items()` runs inside a `$derived`, so reading `manager.mode` there keeps the root icon, root `trailing`, and the checked mode in sync with external theme changes (other tabs, OS preference). No runes are needed in the factory.
- **i18n:** Default labels use the compile-time language (`CS_LANG`, `de` / `en`). Search keywords always include both languages. Mode labels come from `THEME_LABELS`.
- **Page scope:** The page id equals the plugin id, so the scope pill resolves to `labels.page` (or the root label).
- **Highlight:** After pushing the page, the highlight moves to the active mode once the page items mount.
- **Auto-keep-open:** Pushing the page does not close the palette; only picking a mode closes it (unless `closeOnSelect: false`).
- **Unique ids:** Registering two plugins with the same `id` in one registry replaces the first.
- **Coupling:** The module only imports types from `command-palette` and runtime values from `theme`.
