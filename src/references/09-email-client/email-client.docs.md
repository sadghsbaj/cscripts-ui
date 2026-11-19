# 09 - Email Client

## Intent

Full-viewport three-zone floating-island email client with a borderless folder sidebar, localized message list filter header, independent scrollable regions with edge fade masks, collapsible thread history, attachment downloads, contextual actions with undoable toast feedback, an inline expanding reply composer, and an inline compose/forward view.

## Used Modules

- `cs/svelte/button` (`Button`, `ButtonIcon`, `ButtonLabel`)
- `cs/svelte/hit-area` (`HitArea`)
- `cs/svelte/text-input` (`TextInput`, `TextInputIcon`, `TextInputField`, `TextInputAction`)
- `cs/svelte/kbd` (`Kbd`, `KbdGroup`, `KbdSeparator`)
- `cs/svelte/segmented-control` (`SegmentedControl`, `SegmentedControlItem`, `SegmentedControlLabel`)
- `cs/svelte/scroll-area` (`ScrollArea`, `ScrollAreaContent`)
- `cs/svelte/scroll-fade` (`scrollFade`)
- `cs/svelte/tooltip` (`tooltip`)
- `cs/svelte/dropdown` (`Dropdown`, `DropdownContent`, `DropdownItem`, `DropdownSeparator`, `dropdownTrigger`)
- `cs/svelte/text-area` (`TextArea`)
- `cs/svelte/auto-resize` (`autoResize`)
- `cs/svelte/toast` (`toast`, `Toaster`)

## Key Patterns

- **Floating-Island Three-Zone Split:** `p-3 gap-3` on `bg-canvas` without a full-width top bar or `1px` grid-cage borders, pairing a `210px` folder sidebar directly on `bg-canvas` with two `bg-elevated shadow-elevated rounded-3xl squircle` islands (`340px` message list and `flex-1` reading/compose pane) constrained with `min-h-0`.
- **Localized List Filter Header:** Houses a full-width `TextInput` (`variant="soft" size="md"`) with `/` focus shortcut hint above an equal-width `SegmentedControl` (`All` / `Unread`) inside the message list island.
- **ScrollArea + ScrollFade Pairing:** Both the message list and reading pane body attach `{@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}` to `<ScrollAreaContent>` rather than `<ScrollArea>` so overlay scrollbars remain unmasked.
- **Borderless Inline Reply & Compose:** Overrides `--cs-text-area-bg` and `--cs-text-area-shadow` to `transparent`/`none` inside a `bg-base-soft` squircle shell, delegating the `2px` accent focus ring to `:has(.cs-text-area:focus:not(:disabled))`, growing automatically via `autoResize`, and pairing `KbdGroup` (`Ctrl + Enter`) with `Cancel` / `Send` for both inline replies and the inline compose/forward view.
- **Undoable Destructive & Archive Actions:** Archiving or deleting a message updates the list and selection immediately while firing a `toast.base` notification with an `Undo` action that restores the original folder and selection.

## Interactive Flows

- **Search, Filter & Keyboard Shortcut:** Filter messages by folder, `All` / `Unread` `SegmentedControl`, and search query; press `/` outside form fields (when not composing) to focus search.
- **Thread History & Attachments:** Expand earlier messages inline via the collapsible thread toggle and trigger `toast.base` download feedback from attachment chips.
- **Read / Unread State:** Selecting an unread message marks it read automatically; the `Dropdown` menu allows toggling read/unread state, archiving, or deleting.
- **Inline Reply, Compose & Forward:** Clicking `Reply` expands and focuses the inline reply `TextArea` (`Ctrl/Cmd + Enter` to send, `Escape` to cancel); clicking `Compose` or `Forward` switches Zone 3 into inline compose mode (`To`, `Subject`, `autoResize` body, `Ctrl/Cmd + Enter` to send, `Escape` to discard, `toast.positive("Message sent")` on submit), while clicking any folder or message exits compose mode cleanly.
