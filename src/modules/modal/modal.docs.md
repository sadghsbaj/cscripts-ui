---
name: Modal
kind: component
import: cs/svelte/modal
exports:
  - Modal
  - ModalHeader
  - ModalSubtitle
  - ModalTitle
  - ModalDescription
  - ModalBody
  - ModalFooter
  - ModalActions
  - ModalClose
  - MODAL_SIZES
  - MODAL_TITLE_ELEMENTS
  - MODAL_ACTIONS_ALIGNS
  - MODAL_ACTIONS_ORIENTATIONS
  - MODAL_CLOSE_REASONS
  - ModalSize
  - ModalTitleElement
  - ModalActionsAlign
  - ModalActionsOrientation
  - ModalCloseReason
  - ModalProps
  - ModalHeaderProps
  - ModalSubtitleProps
  - ModalTitleProps
  - ModalDescriptionProps
  - ModalBodyProps
  - ModalFooterProps
  - ModalActionsProps
  - ModalCloseProps
  - ModalContext
  - getModalContext
  - setModalContext
  - hasModalContext
---

# Modal

## Overview

Top-layer dialog surface (`<Modal />`) designed to be composed inside `<Overlay />`. Provides W3C APG dialog semantics, built-in `focusTrap` management, `Card`-aligned compound anatomy (`ModalHeader`, `ModalSubtitle`, `ModalTitle`, `ModalDescription`, `ModalBody`, `ModalFooter`, `ModalActions`, `ModalClose`), choreographed enter/exit motion, and dismissibility/blocking feedback.

## Usage Guidance

### When to Use
- **Avoid modals for trivial inline interactions:** If an edit, toggle, or quick action belongs naturally in the current view, keep it inline rather than interrupting the user.
- **Pull out or isolate secondary tasks intentionally:** Use a modal when it is genuinely helpful to pull the user out of the current flow (e.g., focused confirmation or required decision) or to isolate a dense/multi-step secondary task that would clutter the inline layout.

### Destructive Actions (`ButtonMorph` vs. `Modal`)
- **Use `ButtonMorph`** for lightweight, inline, lower-stakes delete confirmations (e.g., removing a single list item or row).
- **Use `Modal`** for high-stakes, irreversible destructive actions (e.g., deleting an account, critical data, or an entire project) where explicit confirmation and clear consequences are warranted.

### Size & Layout
- **`size` (required):** Choose explicitly from `"sm"` (`384px`, confirmations/prompts), `"md"` (`512px`, standard forms/settings), `"lg"` (`672px`, multi-section editors/previews), `"xl"` (`896px`, wide/split workflows), or `"full"` (`100%` of the inset overlay viewport).
- **Header & DOM order:** Keep `ModalSubtitle` → `ModalTitle` → `ModalDescription` inside `ModalHeader`, followed by `ModalClose` (right after `ModalHeader` for natural `Tab` order), `ModalBody`, and `ModalFooter`.

### Footer Action Layouts
Choose `ModalActions` `align` and `orientation` based on dialog size, copy length, and viewport:
- **`align="end"` + `orientation="horizontal"` (default):** Best for standard `md`–`xl` dialogs and forms (especially when paired with a left-aligned helper/status in `ModalFooter`), keeping actions compact at the bottom-right.
- **`align="stretch"` + `orientation="horizontal"`:** Best for compact `sm` confirmations and mobile-friendly binary choices (e.g., `Cancel` / `Delete`), giving both buttons equal visual weight and generous touch targets.
- **`align="stretch"` + `orientation="vertical"`:** Best for narrow mobile viewports, longer button labels that would wrap or crowd side-by-side, or 3+ stacked actions where each option needs full width.

## API

### `Modal` Props
Extends `HTMLAttributes<HTMLDivElement>` and renders `<div role="dialog" aria-modal="true" class="cs-modal">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `ModalSize` | Yes | — | Container width scale: `"sm" \| "md" \| "lg" \| "xl" \| "full"`. |
| `open` | `boolean` | No | `true` | `$bindable` active state; controls `focusTrap` activation and syncs with `{#if open}` around `<Overlay>`. |
| `dismissible` | `boolean` | No | `true` | Master dismissibility flag for `outside-click`, `close-button`, and `escape` (unless overridden by `closeOnEscape`). |
| `closeOnEscape` | `boolean` | No | `dismissible` | Granular override for `Escape` key dismissal. |
| `focusTrap` | `boolean` | No | `true` | Enables built-in `focusTrap` attachment. |
| `initialFocus` | `FocusTrapTarget \| false` | No | `"first-focusable"` | Initial focus target when opened (`"first-focusable"`, `"self"`, CSS selector, element/resolver, or `false`). |
| `restoreFocus` | `boolean \| HTMLElement \| (() => HTMLElement \| null)` | No | `true` | Restores focus to the trigger element (or resolved target) when closed. |
| `onBeforeClose` | `(reason: ModalCloseReason) => boolean \| void \| Promise<boolean \| void>` | No | `undefined` | Intercepts close requests before `open` becomes `false`. Returning `false` cancels the close and triggers `nudge()`. |
| `onClose` | `(reason: ModalCloseReason) => void` | No | `undefined` | Called after a close request succeeds and `open` transitions to `false`. |
| `onOpenChange` | `(open: boolean) => void` | No | `undefined` | Called whenever `open` changes to `false` via `requestClose`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

### `Modal` Instance Methods
Accessible via `bind:this={modal}` on `<Modal>`:
- `requestClose(reason?: ModalCloseReason): Promise<boolean>` — Runs `dismissible`, `closeOnEscape`, and `onBeforeClose` checks (`reason` defaults to `"programmatic"`). Closes `open = false` if allowed, or triggers `nudge()` and returns `false` if blocked.
- `nudge(): void` — Triggers the `280ms` `data-blocked` attention scale pulse on `.cs-modal` (useful when `<Overlay onclick={() => modal?.nudge()}>` is clicked on a blocking modal).

### Structural Subcomponents
- **`ModalHeader`**: Extends `HTMLAttributes<HTMLDivElement>` (`ref = $bindable(null)`). Non-shrinking flex column (`gap: var(--cs-modal-header-gap)`).
- **`ModalSubtitle`**: Extends `HTMLAttributes<HTMLParagraphElement>` (`ref = $bindable(null)`). Optional eyebrow/kicker above `ModalTitle`.
- **`ModalTitle`**: Extends `HTMLAttributes<HTMLHeadingElement | HTMLDivElement>` with `{ as?: ModalTitleElement }` (`@default "h2"`, `"h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "div"`), `ref = $bindable(null)`. Automatically generates an ID and registers it for `aria-labelledby`.
- **`ModalDescription`**: Extends `HTMLParagraphElement` attributes (`ref = $bindable(null)`). Automatically generates an ID and registers it for `aria-describedby`.
- **`ModalBody`**: Extends `HTMLAttributes<HTMLDivElement>` (`ref = $bindable(null)`). Flex-growing container (`flex: 1 1 auto; min-block-size: 0`) that absorbs vertical space while keeping header and footer pinned.
- **`ModalFooter`**: Extends `HTMLAttributes<HTMLDivElement>` (`ref = $bindable(null)`). Non-shrinking horizontal wrapping row (`justify-content: space-between; align-items: center`).

### `ModalActions` Props
Extends `HTMLAttributes<HTMLDivElement>` (`ref = $bindable(null)`).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `align` | `ModalActionsAlign` | No | `"end"` | Alignment of action controls: `"start" \| "end" \| "stretch"`. |
| `orientation` | `ModalActionsOrientation` | No | `"horizontal"` | Direction of action controls: `"horizontal" \| "vertical"`. |

### `ModalClose` Props
Extends `Omit<CloseButtonProps, "variant" | "size">` and renders `<CloseButton class="cs-modal-close">` with an embedded `<HitArea size="md" />`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `CloseButtonVariant` | No | `"soft"` | Close button surface: `"soft" \| "ghost" \| "elevated"`. |
| `size` | `CloseButtonSize` | No | Contextual | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. Defaults from parent `Modal` `size` (`sm`/`md`/`lg` → `"sm"`, `xl`/`full` → `"md"`), or `"md"` outside `Modal`. |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |

### Constants & Context Helpers
- `MODAL_SIZES = ["sm", "md", "lg", "xl", "full"] as const`
- `MODAL_TITLE_ELEMENTS = ["h1", "h2", "h3", "h4", "h5", "h6", "div"] as const`
- `MODAL_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const`
- `MODAL_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const`
- `MODAL_CLOSE_REASONS = ["escape", "outside-click", "close-button", "programmatic"] as const`
- `getModalContext(): ModalContext`, `setModalContext(value: ModalContext): ModalContext`, `hasModalContext(): boolean`

### `data-*` Attributes
- **On `Modal`**: `data-size={size}`, `data-blocked` (present during the blocked nudge animation), plus `data-focus-trapped` and `data-focus-trap-paused` from `focusTrap`.
- **On `ModalActions`**: `data-align={align}`, `data-orientation={orientation}`.
- **On `ModalClose`**: Inherits `data-variant` and `data-size` from `CloseButton`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-modal-bg` | `var(--cs-color-elevated)` | Dialog surface background. |
| `--cs-modal-fg` | `var(--cs-color-text-main)` | Base text color. |
| `--cs-modal-shadow` | `var(--cs-shadow-floating)` | Floating surface shadow. |
| `--cs-modal-radius` | `28px` (`var(--cs-radius-3xl)` on `sm`) | Outer corner radius. |
| `--cs-modal-squircle` | `var(--cs-squircle)` | `corner-shape` superellipse value. |
| `--cs-modal-max-width` | Size-dependent (`384px` to `100%`) | Maximum inline width mapped from `data-size`. |
| `--cs-modal-padding` | `24px` (`20px` on `sm`) | Inner dialog padding. |
| `--cs-modal-gap` | `16px` (`12px` on `sm`) | Vertical gap between regions and inside `ModalBody`/`ModalFooter`/`ModalActions`. |
| `--cs-modal-header-gap` | `4px` | Vertical gap inside `ModalHeader`. |
| `--cs-modal-close-offset` | `16px` (`12px` on `sm`, `xl`, `full`) | Top/end inset for `ModalClose`. |
| `--cs-modal-close-size` | `24px` (`32px` on `xl`, `full`) | Close button footprint used for header clearance calculation. |
| `--cs-modal-title-size` | `var(--cs-text-lg)` (`var(--cs-text-base)` on `sm`) | Font size for `ModalTitle`. |
| `--cs-modal-dur-in` / `--cs-modal-dur-fade-in` / `--cs-modal-dur-out` | `--cs-dur-enter-md` / `--cs-dur-effect` / `--cs-dur-exit-md` | Enter transform, enter opacity, and exit durations. |
| `--cs-modal-ease-in` / `--cs-modal-ease-out` | `--cs-ease-enter` / `--cs-ease-exit` | Enter and exit easing curves. |
| `--cs-modal-scale-start` / `--cs-modal-scale-exit` / `--cs-modal-translate-y` | `0.94` / `0.96` / `8px` | Starting enter scale, exit scale, and enter vertical offset. |

## Examples

### Standard Dialog with `<Overlay>` & `autoFocus`
```svelte
<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { autoFocus } from "cs/svelte/focus";
    import {
        Modal,
        ModalActions,
        ModalBody,
        ModalClose,
        ModalDescription,
        ModalFooter,
        ModalHeader,
        ModalSubtitle,
        ModalTitle,
    } from "cs/svelte/modal";
    import { Overlay } from "cs/svelte/overlay";
    import { TextInput, TextInputField } from "cs/svelte/text-input";

    let open = $state(false);
    let modal = $state<Modal | undefined>();
    let projectName = $state("Acme App");
</script>

<Button variant="primary" size="md" onclick={() => (open = true)}>
    <ButtonLabel>Rename project</ButtonLabel>
</Button>

{#if open}
    <Overlay variant="blur" onclick={() => modal?.requestClose("outside-click")}>
        <Modal bind:this={modal} bind:open size="md" initialFocus={false}>
            <ModalHeader>
                <ModalSubtitle>Workspace</ModalSubtitle>
                <ModalTitle>Rename Project</ModalTitle>
                <ModalDescription>Update the project name.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalBody>
                <TextInput variant="soft" size="md">
                    <TextInputField
                        bind:value={projectName}
                        {@attach autoFocus({ target: "self", select: "all" })}
                    />
                </TextInput>
            </ModalBody>
            <ModalFooter>
                <ModalActions>
                    <Button variant="tertiary" size="md" onclick={() => modal?.requestClose("programmatic")}>
                        <ButtonLabel>Cancel</ButtonLabel>
                    </Button>
                    <Button variant="primary" size="md" onclick={() => modal?.requestClose("programmatic")}>
                        <ButtonLabel>Save</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}
```

### Scrollable Body (`ScrollArea` + `scrollFade`)
```svelte
<ModalBody>
    <ScrollArea size="sm" direction="vertical" class="h-72 max-h-full min-h-0">
        <ScrollAreaContent
            class="flex flex-col gap-3 py-1"
            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
        >
            <!-- Long scrollable items; ModalHeader and ModalFooter stay pinned -->
        </ScrollAreaContent>
    </ScrollArea>
</ModalBody>
```

### Blocking & Guarded Modals
```svelte
<!-- Static blocking modal -->
{#if blockingOpen}
    <Overlay variant="blur" onclick={() => blockingModal?.nudge()}>
        <Modal bind:this={blockingModal} bind:open={blockingOpen} size="sm" dismissible={false}>
            <ModalHeader>
                <ModalTitle>Confirm Action</ModalTitle>
                <ModalDescription>Complete this step to continue.</ModalDescription>
            </ModalHeader>
            <ModalFooter>
                <ModalActions align="stretch" class="w-full">
                    <Button variant="primary" size="md" onclick={() => (blockingOpen = false)}>
                        <ButtonLabel>Continue</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}

<!-- Dynamic unsaved-changes guard -->
{#if guardedOpen}
    <Overlay variant="blur" onclick={() => guardedModal?.requestClose("outside-click")}>
        <Modal
            bind:this={guardedModal}
            bind:open={guardedOpen}
            size="sm"
            onBeforeClose={() => !hasUnsavedChanges}
        >
            <!-- ... -->
        </Modal>
    </Overlay>
{/if}
```

## Behavior & Quirks

- **Composing with `<Overlay>`:** `Modal` intentionally does not own `<Overlay>`. Wrap `<Modal bind:open>` inside `{#if open}<Overlay variant="blur" ...>{/if}` so `Overlay` handles Top Layer promotion (`popover="manual"` + `topLayer()`), scroll locking, and staggered exit timing. When `open` flips to `false`, `Overlay`'s `out:overlayExit` transition calls `hidePopover()` immediately and waits for the `180ms` backdrop transition while `.cs-modal` exits in `120ms` (`60ms` earlier, preventing the un-blurred background from showing through a half-faded dialog).
- **Backdrop click vs. `focusTrap` coordination:** `Modal` configures `focusTrap`'s `allowOutsideClick` to permit `pointerdown` events targeting the enclosing `.cs-overlay` element. This allows `Overlay`'s safe backdrop `onclick` to fire for `requestClose("outside-click")` or `nudge()` while still blocking clicks outside the overlay and keeping keyboard focus trapped.
- **Built-in `focusTrap` & `autoFocus()`:** `focusTrap` is active whenever `open && focusTrap` is `true`, and deactivates immediately when `open` becomes `false` (restoring focus without waiting for `out:overlayExit` to finish unmounting). If you attach `{@attach autoFocus()}` to an input inside `ModalBody`, pass `initialFocus={false}` on `<Modal>` so `focusTrap`'s default `"first-focusable"` `rAF` does not compete with `autoFocus()`.
- **Explicit scroll composition:** `ModalBody` does not embed `ScrollArea` or `scrollFade` internally. Its `flex: 1 1 auto; min-block-size: 0` layout pins `ModalHeader` and `ModalFooter` so an inner `<ScrollArea>` + `scrollFade` absorbs vertical overflow cleanly.
- **Blocking & guarded feedback:** Attempting to close a modal when `dismissible={false}`, when `closeOnEscape={false}` on `Escape`, or when `onBeforeClose` returns `false` cancels the close and sets `data-blocked` on `.cs-modal` for a `280ms` damped scale pulse (`cs-modal-blocked`), which can also be triggered imperatively via `modal.nudge()`.
- **Automatic ARIA & `ModalClose` clearance:** `ModalTitle` and `ModalDescription` automatically register their generated (or custom) `id`s onto `aria-labelledby` and `aria-describedby`. When `<ModalClose />` is present, `.cs-modal` automatically adds `padding-inline-end` clearance to `ModalHeader` (or the first `ModalBody` if `ModalHeader` is omitted) so text never collides with the corner close button.
