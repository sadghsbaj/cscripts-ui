# command-palette-theme — Blueprint

## 1. Overview & Scope

- **Kind:** `utility` (plugin factory, no own DOM; may later ship a tiny internal snippet if needed).
- **Purpose:** First optional *built-in palette plugin*. `createCommandPaletteThemePlugin(options?)` returns a plain `CommandPalettePlugin` that adds a root item **"Change Theme" / "Design ändern"** (icon = `THEME_ICONS[theme.mode]`, right-aligned current mode label) and a sub-page listing **System / Light / Dark** with the active mode marked.
- **Pattern for future plugins** (`command-palette-language`, …): one module folder `command-palette-<feature>/`, one factory `createCommandPalette<Feature>Plugin(options?)` returning `CommandPalettePlugin`, opt-in via `plugins={[...]}` or `registry.register(...)`.
- **Non-goals:** no theme/language logic in `command-palette`; no new base plugin concepts; no global hotkey binding (display-only `shortcut`); no custom theme registration; no persistence logic (delegated to `theme`).

### Placement decision

`package.json` exports only `./svelte/*` → `src/modules/*/index.ts`. A subpath such as `cs/svelte/command-palette/theme` would require a new `exports` entry and break the "one folder = one index.ts" invariant. Therefore: **new vertical-slice module `src/modules/command-palette-theme/`**, import path `cs/svelte/command-palette-theme`.

Import direction (strict, acyclic):
```
command-palette-theme ──type-only──► command-palette   (CommandPalettePlugin, CommandPaletteCommand, …)
command-palette-theme ──────────────► theme            (theme, THEME_MODES, THEME_ICONS, THEME_LABELS)
command-palette-theme ──────────────► shared/lang.internal.ts (t)
command-palette  ✗ never imports theme or command-palette-theme
theme            ✗ never imports command-palette*
```
Only `import type` from `../command-palette/index.ts` (zero runtime coupling).

### Files

| File | Purpose |
| :--- | :--- |
| `index.ts` | Exports `createCommandPaletteThemePlugin`, `type CommandPaletteThemePluginOptions`, `COMMAND_PALETTE_THEME_PLUGIN_ID`. |
| `command-palette-theme.ts` | Factory (plain TS; no runes needed — reactivity comes from reading `theme.mode` inside `items()`). |
| `command-palette-theme.test.ts` | Vitest unit tests (see §5). |
| `command-palette-theme.docs.md` | Consumer docs. |
| `command-palette-theme.blueprint.md` | This file. |
| `CommandPaletteTheme.preview.svelte` | Preview (replaces hand-rolled page in `CommandPalette.preview.svelte`). |

No `*.internal.*` files initially; labels live as a `t()` constant in the factory file.

## 2. Public API

```ts
export interface CommandPaletteThemePluginOptions {
    id?: string;                       // default "cs-command-palette-theme"; also the pushed page id
    priority?: number;                 // default 0 (same default as base plugins)
    group?: string;                    // root group label; default t({de:"Darstellung", en:"Appearance"})
    closeOnSelect?: boolean;           // default true — closes after a mode is picked
    shortcut?: readonly string[] | string; // display-only hint on the root item
    keywords?: readonly string[];      // extra keywords appended to the built-in de+en ones
    labels?: Partial<{
        root: string;                  // "Change Theme" / "Design ändern"
        page: string;                  // scope-pill / page label; default = root
        modes: Partial<Record<ThemeMode, string>>; // overrides THEME_LABELS
    }>;
    manager?: ThemeManager;            // default singleton `theme` (SSR-isolated apps pass their own)
}
export function createCommandPaletteThemePlugin(options?: CommandPaletteThemePluginOptions): CommandPalettePlugin;
```

Rules: options are read once at factory time (no `$bindable`, no CSS variables, no `ref`). Internal names follow naming rules (`closeOnSelect`, `shortcut`, `keywords`).

### Plugin shape

- `id`, `label` = group label, `priority`, `page: "*"` (single plugin serves root and sub-page; `items(ctx)` branches on `ctx.activePage`).
- `items(ctx)`:
  - `ctx.activePage === undefined` → `[rootCommand]`
  - `ctx.activePage === id` → three mode commands
  - otherwise `[]`
- Page id = plugin `id`. This is deliberate: the base resolves the scope-pill label via `allPlugins.find(p => p.page === activePage || p.id === activePage)` (`CommandPalette.svelte` ~L141); with `page: "*"` only the `id` match works. Also pass `{ label }` to `pushPage` as belt and braces.
- Root command: `value: "<id>:root"`, `label`, `icon: THEME_ICONS[manager.mode]`, `trailing: THEME_LABELS[manager.mode]` (see §2.1), `keywords` (en+de: theme, design, dark, light, dunkel, hell, modus, appearance, darstellung), `shortcut` passthrough, `onSelect` → push page.
- Mode commands: `value: "<id>:mode:<mode>"`, `label`, `icon: THEME_ICONS[mode]`, `checked: manager.mode === mode`, `onSelect` → `manager.set(mode)`, `closeOnSelect` from options. `group: ""` (suppress group label inside the page — **verify** `""` is not treated as nullish by `cmd.group ?? plugin.label`; it is not, and the falsy label skips `CommandPaletteGroupLabel`).
- Reactivity: `items()` is invoked inside a `$derived` in `CommandPaletteList`; reading `manager.mode` there makes icon, trailing text and `checked` update automatically (including cross-tab changes). Confirm `ThemeManager.mode` is `$state`-backed getter (it is a `.svelte.ts` class; add a test).
- `theme.set(mode)` starts a View Transition; closing the palette in the same tick is fine (palette is outside the snapshot concern), but the preview should confirm no flicker.

### 2.1 Showing the current value — base API recommendation

Findings:
- `CommandPaletteCommand` only has `shortcut?: readonly string[] | string`. A **string** shortcut renders as plain text inside `CommandPaletteItemShortcut` (`CommandPaletteList.svelte` ~L217). So `shortcut: "Dunkel"` technically works with **zero base change**.
- Downsides: semantic misuse (the slot is styled/named as a key hint, collides with a real `shortcut` option, and any future "hide shortcuts on touch" rule would hide the value); no way to express the active/checked state in the sub-page. `aria-selected` on `role="option"` is already taken by highlight, so "active mode" cannot reuse it.

**Recommendation (minimal, additive, backwards-compatible):** add two optional fields to `CommandPaletteCommand` **and** `CommandPaletteItemProps`:

| Field | Type | Behavior |
| :--- | :--- | :--- |
| `trailing` | `string` | Plain right-aligned secondary text, rendered in a new public part `CommandPaletteItemTrailing` (`.cs-command-palette-item-trailing`, `--cs-command-palette-trailing-fg`, defaults to same token as shortcut fg). If both `trailing` and `shortcut` are set, trailing renders first. |
| `checked` | `boolean` | Renders a trailing check icon, sets `aria-checked="true"|"false"` on the `role="option"` item and `data-checked`. `undefined` → no attribute (non-checkable item). |

Naming per dictionary: `checked` is canonical. `trailing` is not in the dictionary — **open question**: add `trailing` to the naming dictionary (alternative: `value` is taken by item id; `detail`/`meta` are non-canonical). `aria-checked` is valid on `option` (ARIA 1.2).

Fallback if the base must stay untouched: root uses `shortcut: modeLabel`; sub-page uses plugin `pageView` snippet with hand-built `CommandPaletteItem`s and a check icon (requires a `.svelte` file `CommandPaletteThemePage.internal.svelte` in this module, and `aria-checked` set via rest props). Works but duplicates item rendering → not recommended.

### 2.2 Opening a page from a plugin item — base check

Verified against code:
- `CommandPaletteCommand.onSelect?: (event: MouseEvent | KeyboardEvent) => void` — **no palette/context argument**.
- `CommandPalettePlugin.items(ctx)` receives `CommandPaletteQueryContext` (query, activePage, pages, prefix) — **no `palette`** either. Only `widget`/`pageView` (`CommandPalettePluginRenderContext.palette`) and `onOpen(palette)` get `CommandPaletteContext`.
- `CommandPaletteItem.activate` already suppresses auto-close when `onSelect` mutated the page stack (`pageMutationVersion`), so `pushPage` from `onSelect` does not close the palette — good.

Options:
1. **No base change:** plugin captures `palette` in `onOpen(palette)` (closure variable `let palette`), clears it in the returned cleanup. `onSelect` calls `palette?.pushPage(id, { label })`. `onOpen` runs per plugin while `open` is true (`CommandPalette.svelte` ~L567-587), before any user can select. Caveat: factory instance holds one closure → if the same plugin object is shared by two simultaneously open palettes the last-opened wins (practically never; document it).
2. **Small additive base change (recommended long-term, optional for v1):** `onSelect?: (event, palette: CommandPaletteContext) => void` on `CommandPaletteCommand` (list passes `palette.publicContext`). Backwards-compatible (extra arg). Removes the stateful closure and makes all future plugins (language, navigation) stateless.

**Decision:** ship v1 with option 1 if the base must not change; since §2.1 already requires a base touch (`trailing`/`checked`), bundle option 2 in the same change and implement the factory against option 2 (stateless). Coder must flag which was chosen in the docs. **Required base changes (exact list):** (a) `trailing` + `checked` on `CommandPaletteCommand`/`CommandPaletteItemProps` + new `CommandPaletteItemTrailing` part + CSS + `CommandPaletteList` forwarding; (b) optional `palette` second arg to `CommandPaletteCommand.onSelect`. Both purely additive; update base docs/blueprint/design/tests accordingly.

## 3. DOM, Semantics & Accessibility

- No own DOM; uses base `role="option"` items inside the existing listbox.
- Root item: `data-value="<id>:root"`; trailing text in `.cs-command-palette-item-trailing` (`aria-hidden` **not** set — the screen-reader name should read "Change Theme, Dark"; trailing is part of the option's accessible text).
- Mode items: `role="option"` + `aria-checked` (via `checked`), `data-checked`; exactly one checked at a time. Highlight (`aria-selected` / `data-highlighted`) remains independent.
- Keyboard: unchanged base behavior. Enter on root → page push, input cleared and focus retained; Escape/Backspace-on-empty pops (`popPageOnEscape`/`popPageOnBackspace`); Enter on a mode → `set(mode)` then close (default).
- On entering the sub-page, highlight should land on the **active** mode: call `palette.setHighlightedValue("<id>:mode:<active>")` after push (requires the item to be mounted; verify timing — otherwise leave default first-item highlight; **risk**).
- Live announcement of the change is not added (theme change is visually evident; non-goal).

## 4. Visual & Motion Contract

- No own CSS. Root icon swaps with the current mode (Monitor/Sun/Moon) — no motion.
- Trailing text uses base trailing/shortcut token (`--cs-command-palette-trailing-fg`, weaker text), same font-size as shortcut for each palette `size`; check icon uses `currentColor`, size equals item icon size, positioned in the trailing slot. Highlight/press states match base instant (0 ms) rules.
- Theme swap motion is owned by `theme` (View Transition); the plugin adds none.

## 5. Edge Cases, i18n, Docs, Preview, Tests

### i18n
- All built-in strings via `t({de,en})` at module load (compile-time `CS_LANG`): root "Change Theme"/"Design ändern", group "Appearance"/"Darstellung". Mode labels reuse `THEME_LABELS` (already localized). `labels` option overrides win. Keywords always include both languages so search works regardless of `CS_LANG`.
- `t` is internal: import via relative `../../shared/lang.internal.ts`; never re-exported.

### Edge cases
- `plugins` array is rebuilt per render in consumers → factory result must be created once (docs: hoist or `$derived`-free). Plugin identity change re-runs `onOpen`.
- SSR: `theme` is immutable on server; plugin only reads `manager.mode` lazily inside `items()`, no module-level side effects.
- Query filter on sub-page: base filtering applies (typing "dark" narrows). Root item discoverable by keywords.
- Duplicate registration with the same `id` replaces (base behavior); custom `id` allows two differently configured instances.
- `page: "*"` plugin runs `items()` on every page; must return `[]` fast for unrelated pages. Prefix mode hides it (base behavior).

### Docs
- `command-palette-theme.docs.md`: usage (`plugins={[createCommandPaletteThemePlugin()]}` and `registry.register(...)`), options table, i18n note, a11y, import-direction note, "how to author a built-in plugin" section (reused by language later). Add a short cross-link + "built-in plugins" section in `command-palette.docs.md`; document `trailing`, `checked`, `onSelect(event, palette)` there.

### Preview
- Replace the hand-rolled "Change theme" page and `applyTheme` handler in `CommandPalette.preview.svelte` (~L520-640) with `plugins={[createCommandPaletteThemePlugin(...)]}`; keep the rest of the demo. Optionally add `CommandPaletteTheme.preview.svelte` showing defaults vs `closeOnSelect: false` and custom labels.

### Tests (`command-palette-theme.test.ts`, plus base additions in `command-palette.svelte.test.ts`)
- Factory: default id/priority/page, option overrides, bilingual keywords, `labels` override.
- `items({activePage: undefined})` → one root item with icon/trailing equal to `manager.mode`; `items({activePage: id})` → 3 items, exactly one `checked`; other pages → `[]`.
- Reactivity: `manager.set("dark")` changes derived output (use own `ThemeManager` instance via `manager` option).
- `onSelect` on root calls `pushPage(id)` (with mocked palette arg or `onOpen` capture); on mode calls `manager.set` and respects `closeOnSelect`.
- Integration (render `CommandPalette` with plugin): root visible, Enter opens page, scope pill shows page label, `aria-checked` correct, Escape pops, selecting closes.
- Base: `trailing` renders, `checked` → `aria-checked`/`data-checked`, `onSelect` receives palette arg, existing shortcut tests unchanged.

## 6. Open Questions & Risks
1. Approve additive base changes (`trailing`, `checked`, `onSelect` palette arg)? Else fallback = `shortcut` string + `pageView` (less clean).
2. Add `trailing` to the naming dictionary (or pick another canonical term)?
3. Initial highlight on the active mode after `pushPage` — timing unverified.
4. Close vs. return after selection: default close; `closeOnSelect: false` keeps palette open on the page (no auto-pop).
5. `ThemeManager.mode` reactivity assumed `$state`-backed — verify in test.
6. Language plugin: `CS_LANG` is compile-time, so a future language plugin is likely a navigation/info item rather than a runtime switcher — decide scope before building it.
