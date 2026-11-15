---
name: Theme
kind: utility
import: cs/svelte/theme
exports:
  - theme
  - ThemeManager
  - THEME_MODES
  - THEME_ICONS
  - GERMAN_THEME_LABELS
  - isValidMode
  - ThemeMode
---

# Theme

## Overview
Reactive Svelte 5 theme manager (`theme` singleton and `ThemeManager` class) coordinating `"system" | "light" | "dark"` preferences with `data-theme`, `color-scheme`, `<meta name="theme-color">`, OS `prefers-color-scheme`, cross-tab `localStorage` sync (`"cs-theme"`), and native View Transitions.

## API

### `ThemeManager` & `theme` Singleton
`theme` is a pre-instantiated `ThemeManager` singleton. Instantiate `new ThemeManager(initialMode?, initialResolved?)` inside Svelte context if strict per-request SSR isolation is needed.

| Member | Type / Signature | Description |
| :--- | :--- | :--- |
| `mode` (getter) | `ThemeMode` | Reactive user preference (`"system" \| "light" \| "dark"`). |
| `resolved` (getter) | `"light" \| "dark"` | Reactive currently applied theme. |
| `icon` (getter) | `Component` | Lucide icon component for `mode` (`Monitor`, `Sun`, `Moon`). |
| `resolvedIcon` (getter) | `Component` | Lucide icon component for `resolved` (`Sun` or `Moon`). |
| `set(newMode)` | `(newMode: ThemeMode) => void` | Updates `mode`, persists to `localStorage` (`"cs-theme"`, `{ prefix: false }`), and applies to DOM. |
| `toggle()` | `() => void` | Toggles between `"light"` and `"dark"` based on `resolved`. |
| `cycle(modes?)` | `(modes?: readonly ThemeMode[]) => void` | Cycles through `modes` (defaults to `THEME_MODES`: `["system", "light", "dark"]`). |
| `apply()` | `() => void` | Synchronizes `data-theme`, `colorScheme`, and `<meta name="theme-color">` on `<html>`. |
| `destroy()` | `() => void` | Unregisters `matchMedia` and `storage` listeners. |

### Constants & Helpers
- `THEME_MODES`: `["system", "light", "dark"] as const`
- `THEME_ICONS`: `{ system: Monitor, light: Sun, dark: Moon }`
- `GERMAN_THEME_LABELS`: `{ system: "System", light: "Hell", dark: "Dunkel" }`
- `isValidMode(v: unknown): v is ThemeMode`

## Examples

```svelte
<script lang="ts">
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { GERMAN_THEME_LABELS, theme } from "cs/svelte/theme";
</script>

<Button variant="secondary" size="md" onclick={() => theme.cycle()}>
    <ButtonIcon icon={theme.icon} />
    <ButtonLabel>{GERMAN_THEME_LABELS[theme.mode]}</ButtonLabel>
</Button>
```

## Behavior & Quirks
- **FOUC prevention:** Cooperates with the inline boot script injected by `cs/vite`, reading `document.documentElement.dataset.theme` on hydration.
- **View Transitions:** Uses `document.startViewTransition` when supported and `prefers-reduced-motion` / `data-reduce-motion` is not set, temporarily setting `data-theme-switching` on `<html>` to pause element CSS transitions during the snapshot.
- **SSR safety:** Mutative methods no-op when `typeof window === "undefined"`.
