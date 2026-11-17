---
name: MiddleClick
kind: attachment
import: cs/svelte/middle-click
exports:
    - middleClick
    - MiddleClickDetail
    - MiddleClickHandler
    - MiddleClickIgnore
    - MiddleClickOptions
---

# MiddleClick

## Overview

Svelte 5 attachment (`middleClick`) that reacts to a middle mouse button (wheel) click on an element, e.g. to close a tab, remove a chip, or open an item in the background.

## API

### `middleClick(options: MiddleClickOptions): Attachment<T>`

`T extends HTMLElement | SVGElement = HTMLElement`.

| Option           | Type                                   | Required | Default     | Description                                                                                                      |
| :--------------- | :------------------------------------- | :------- | :---------- | :--------------------------------------------------------------------------------------------------------------- |
| `onMiddleClick`  | `(detail: MiddleClickDetail) => void`  | Yes      | —           | Fired with `{ target, event, element }` after a complete middle click.                                           |
| `enabled`        | `boolean \| (() => boolean)`           | No       | `true`      | Toggles handling; evaluated on every event, so a getter stays live without re-attaching.                         |
| `preventDefault` | `boolean`                              | No       | `true`      | Suppresses autoscroll (`mousedown`) and the default action (`auxclick`, e.g. opening a link) for handled clicks. |
| `ignore`         | `string \| (target, event) => boolean` | No       | `undefined` | Selector or predicate for descendants that keep native behavior (nothing is handled or prevented).               |
| `allowModifiers` | `boolean`                              | No       | `false`     | Also handle clicks while Ctrl, Meta, Shift, or Alt is held.                                                      |

### `data-*` Attributes

- Sets `data-middle-click=""` on the attached element (removed on cleanup).

## Examples

```svelte
<script lang="ts">
    import { middleClick } from "cs/svelte/middle-click";
</script>

<div role="tab" tabindex="0" {@attach middleClick({ onMiddleClick: () => closeTab(id), ignore: "button" })}>
    {title}
    <button onclick={() => closeTab(id)}>×</button>
</div>
```

Disable conditionally and keep native behavior for links:

```svelte
<div {@attach middleClick({ onMiddleClick: remove, enabled: () => removable, ignore: "a[href]" })}>
    <a href="/item">Item</a>
</div>
```

## Behavior & Quirks

- **Other buttons:** Primary and secondary (`contextmenu`) clicks and their `mousedown`/`auxclick` events are never handled or prevented.
- **`ignore` scope:** Selectors only match inside the attached element, never its ancestors. Elements and arrays are intentionally not supported; use the predicate for custom logic.

- **Auxclick based:** Browsers fire `auxclick`, not `click`, for the middle button.
- **Press must start inside:** A matching `mousedown` on the element is required, so releasing over the element after pressing elsewhere is ignored. One press yields at most one callback.
- **Chorded buttons:** Pressing another button between press and release cancels the click.
- **Autoscroll:** Only cancelled on `mousedown`; `preventDefault: false` restores it.
- **Accessibility:** A middle click has no keyboard equivalent. Always provide a keyboard/visible alternative (e.g. a close button) for the same action.
