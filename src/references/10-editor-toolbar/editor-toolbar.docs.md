# 10 · Editor Toolbar

## Intent

Rich-text editor formatting toolbar on `bg-canvas` combining standalone `elevated` `40px` action buttons, a matching `40px` font `Select`, elevated `ToggleButtonGroup` pills, and anchored `Popover` panels for color picking and link insertion—backed by snapshot-based undo/redo history.

## Used Modules

- `cs/svelte/button` (`Button`, `ButtonIcon`, `ButtonLabel`)
- `cs/svelte/clipboard` (`CopyIcon`, `copyOnClick`, `copyToClipboard`)
- `cs/svelte/color` (`ColorArea`, `ColorEyeDropper`, `ColorInput`, `ColorPicker`, `ColorSlider`, `ColorSwatch`, `ColorSwatchGroup`)
- `cs/svelte/context-menu` (`ContextMenu`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuItemIcon`, `ContextMenuItemText`, `contextMenuTrigger`)
- `cs/svelte/popover` (`Popover`, `popoverTrigger`)
- `cs/svelte/hit-area` (`HitArea`)
- `cs/svelte/select` (`Select`, `SelectContent`, `SelectItem`, `SelectItemText`, `SelectTrigger`, `SelectValue`)
- `cs/svelte/text-input` (`TextInput`, `TextInputAction`, `TextInputField`, `TextInputIcon`)
- `cs/svelte/toggle-button` (`ToggleButton`, `ToggleButtonGroup`, `ToggleButtonIcon`)
- `cs/svelte/tooltip` (`tooltip`)

## Key Patterns

- **Unified `40px` Elevated Silhouette:** Every toolbar control is natively `variant="elevated"` at `size="lg"` (`40px`) directly on `bg-canvas`—standalone `Button variant="elevated" size="lg" iconOnly`, `Select variant="elevated" size="lg"` (`--cs-select-trigger-radius: 20px`, `--cs-select-trigger-px: 14px`, `min-width: 148px`), and `ToggleButton variant="elevated" color="accent" size="lg" iconOnly`—with no `.cs-editor-toolbar-island` wrapper needed.
- **Native Elevated Toggle Groups:** Three `ToggleButtonGroup` capsules—each automatically consolidating the elevated shadow onto the group—separate `type="multiple"` for inline formatting (`bold`, `italic`, `underline`, `strikethrough`) from `type="single" allowDeselect` for alignment (`left`, `center`, `right`, `justify`) and lists (`bullet`, `ordered`).
- **Color Picker Popovers:** Text color and highlight color buttons render live color indicator bars below their icons and open anchored `Popover placement="bottom-start" width="content"` panels via `popoverTrigger`, each hosting a `244px` `ColorPicker` (`--cs-color-picker-width: 244px; --cs-color-picker-gap: 12px`) with `ColorArea`, hue `ColorSlider`, `ColorInput` (`copyOnClick` + `CopyIcon`), `ColorEyeDropper`, a reset `Button`, and a `Swatches` section header with an `Add` button above a 7-column `ColorSwatchGroup` wrapped in a `ContextMenu` (`Copy color`, `Replace with current`, and `Remove`).
- **Link Popover Form:** The link button opens a 2-row `Popover placement="bottom-end" width="content"` form (`w-72`) with an `Insert link` header row (plus a conditional `Remove` button when `linkUrl` is non-empty) and an input row pairing an autofocused `TextInput type="url"` (`variant="soft" size="sm"`) with a primary `iconOnly` `Check` submit button (`tooltip` `"Apply"`).
- **Snapshot Undo/Redo & Expanded Hit Areas:** Toolbar mutations (`onValueChange`, `ColorPicker` `onCommit`, link apply/remove, color reset, clear formatting) push `ToolbarSnapshot` entries onto `history`. Every `iconOnly` control pairs `<HitArea size="md" />` with a `tooltip` attachment gated on `!disabled` (and `canUndo` / `canRedo` for history actions).

## States

- **Default:** Initialized with `font = "inter"`, `formats = ["bold", "italic"]`, `alignment = "left"`, `list = undefined`, `textColor = "#18181b"`, `highlightColor = "#fef08a"`, `linkUrl = ""`, and one seeded prior snapshot so `Undo` starts enabled and `Redo` starts disabled.
- **Disabled:** Sets `aria-disabled="true"` on the `role="toolbar"` container, passes `disabled` to all controls and `ToggleButtonGroup` capsules (`--cs-color-disabled-bg` with `shadow: none`, plus `--cs-color-disabled-bg-active` / `--cs-color-disabled-fg-active` on pressed toggle items), disables tooltips, and hides any open popovers via `$effect`.
