# 04 · Confirmation Dialog

## Intent

Focused `size="sm"` confirmation dialogs for two distinct stakes: a lightweight discard prompt (`DiscardDialog`) without body content, and a high-stakes destructive confirmation (`DeleteDialog`) gated by typed confirmation.

## Used Modules

- `cs/svelte/modal` (`Modal`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalClose`, `ModalBody`, `ModalFooter`, `ModalActions`)
- `cs/svelte/overlay` (`Overlay`)
- `cs/svelte/button` (`Button`, `ButtonLabel`)
- `cs/svelte/text-input` (`TextInput`, `TextInputField`)
- `cs/svelte/focus` (`autoFocus`)

## Key Patterns

- **Omitting `ModalBody` for Compact Prompts:** `DiscardDialog` omits `ModalBody` so `ModalHeader` flows directly into `ModalFooter` without an empty vertical gap.
- **Typed Confirmation & `autoFocus` Handoff:** `DeleteDialog` disables `Modal` `initialFocus={false}` when `confirmText` is present and attaches `{@attach autoFocus({ target: "self" })}` directly to `<TextInputField />` inside a `<form>` so `Enter` submits once `typedValue === confirmText`.
- **Submission Lock:** While `onconfirm` is pending, `isSubmitting` sets `dismissible={false}` on `Modal`, disables inputs and buttons, and marks the confirm action `aria-busy={true}`.

## States

- **Discard Prompt:** `Keep` (`tertiary`) and `Discard` (`primary`) actions with Escape, backdrop click, and close-button dismissal.
- **Typed Delete Gate:** `Delete` (`primary` + `negative`) remains disabled until `typedValue` matches `confirmText`, then resets `typedValue` whenever `open` becomes `false`.
- **Submitting:** Blocks dismissal (`nudge()` on backdrop/Escape attempts) until the async `onconfirm` resolves.
