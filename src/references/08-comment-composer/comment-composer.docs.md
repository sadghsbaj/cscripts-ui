# 08 · Comment Composer

## Intent

Inline comment composer pairing an external avatar, a unified elevated `<Card>` surface, an auto-resizing borderless `<TextArea>`, icon toolbar actions with expanded hit areas and tooltips, a revealable keyboard shortcut hint, and a morphing submit button.

## Used Modules

- `cs/svelte/card` (`Card`, `CardBody`, `CardFooter`)
- `cs/svelte/text-area` (`TextArea`)
- `cs/svelte/auto-resize` (`autoResize`)
- `cs/svelte/button` (`Button`, `ButtonIcon`, `ButtonLabel`)
- `cs/svelte/hit-area` (`HitArea`)
- `cs/svelte/tooltip` (`tooltip`)
- `cs/svelte/kbd` (`KbdGroup`, `Kbd`, `KbdSeparator`)
- `cs/svelte/text-morph` (`TextMorph`)

## Key Patterns

- **Unified Elevated Surface:** Overrides `--cs-text-area-bg`, `--cs-text-area-shadow`, and `--cs-text-area-ring-shadow` to `transparent`/`none` so `<TextArea>` blends seamlessly inside `<Card variant="elevated" size="md">`, while `:has(.cs-text-area:focus:not(:disabled))` transfers the `2px` accent focus ring to the outer card.
- **Content-Driven Growth:** `{@attach autoResize({ minRows: 2, maxRows: 7 })}` paired with `resize="none"` expands the composer cleanly as multi-line comments grow without JavaScript measurement.
- **Revealable Shortcut Hint:** The `Ctrl + Enter` `<KbdGroup variant="soft" size="sm">` hint fades and slides in only when the composer is focused or contains non-whitespace text.
- **Morphing Submit State:** `<TextMorph text={isSubmitting ? "Sending..." : "Send"} />` smoothly transitions the primary `<Button>` label during async submission while locking inputs via `disabled`.

## States

- **Empty:** Placeholder visible, shortcut hint hidden, and `Send` button disabled.
- **Draft:** Multi-line text expands the textarea via `autoResize`, reveals the `Ctrl + Enter` hint, and enables `Send`.
- **Submitting:** Locks the textarea and toolbar buttons, sets `aria-busy`, and morphs the button label to `"Sending..."`.
- **Disabled:** Applies `--cs-color-disabled-bg-elevated` and `--cs-color-disabled-border` to the outer `<Card>` and disables all controls.
