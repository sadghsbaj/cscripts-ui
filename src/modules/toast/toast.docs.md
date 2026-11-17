---
name: Toast
kind: hybrid
import: cs/svelte/toast
exports:
  - Toaster
  - Toast
  - ToastIcon
  - ToastTitle
  - ToastDescription
  - ToastAction
  - ToastClose
  - toast
  - toastState
  - TOAST_COLORS
  - TOAST_PLACEMENTS
  - ToastColor
  - ToastPlacement
  - ToastIconComponentProps
  - ToastIconComponent
  - ToastActionConfig
  - ToastOptions
  - ToastShorthandOptions
  - ToastShorthandConfig
  - ToastCustomOptions
  - ToastSnippetProps
  - ToastPromiseMessage
  - ToastPromiseOptions
  - ToastRecord
  - ToastApi
  - ToasterProps
  - ToastProps
  - ToastIconProps
  - ToastTitleProps
  - ToastDescriptionProps
  - ToastActionProps
  - ToastCloseProps
---

# Toast

## Overview
Transient, non-blocking notification system combining a Svelte 5 runes singleton store (`toast`, `toastState`), a Top-Layer viewport host (`<Toaster />`), and compound presentation components (`<Toast>`, `<ToastIcon>`, `<ToastTitle>`, `<ToastDescription>`, `<ToastAction>`, `<ToastClose>`).

## Usage Guidance
- **Mount `<Toaster />` once at app/layout level:** Render `<Toaster />` a single time in your root application or layout component—never inside individual pages or feature components.
- **Choose `color` intentionally (explicitly required on `toast()`, `toast.custom()`, and `<Toast>`):**
  - **`base`**: Calm, low-priority informational updates.
  - **`accent`**: Informational updates that need to catch the eye faster because the information is more important.
  - **`positive` / `caution` / `negative`**: Strictly semantic (success/completion, warning/attention, error/failure)—never for decorative variety.
- **When to use toasts—and when not to:**
  - Not every minor interaction needs a toast. Use toasts only when you need to give explicit feedback about an executed action (e.g., background save, export, async job), warn the user, or provide an immediate follow-up action (`Undo`, `Retry`).
  - **Do not confirm obvious UI transitions:** Clicking a navigation button such as "Go to Settings" should **not** trigger a toast like "Settings opened successfully"—the visible UI/route change is already feedback enough.
  - **Toasts vs. inline banners & modal dialogs:** Toasts are ephemeral and non-blocking. Use inline error/alert banners for persistent contextual warnings or form-validation summaries, and modal dialogs when an error or decision requires blocking user input.
- **Action button restraint:** Keep toast actions secondary (`variant="secondary"`, default) or tertiary (`variant="tertiary"`). Never use solid primary buttons inside a toast.

## API

### Imperative API (`toast`)
`toast` is a callable function with semantic shorthand and lifecycle helpers:

| Method | Signature | Description |
| :--- | :--- | :--- |
| `toast(options)` | `(options: ToastOptions) => string` | Enqueues a toast (or updates an existing toast in-place when `options.id` matches) and returns its `id`. |
| `toast.base` / `.accent` / `.positive` / `.caution` / `.negative` | `(titleOrOptions: string \| ToastShorthandOptions, options?: ToastShorthandConfig) => string` | Semantic shorthands that set `color` automatically. Accepts either `(title, config?)` or a full options object without `color`. |
| `toast.custom` | `(render: Snippet<[ToastSnippetProps]>, options: ToastCustomOptions) => string` | Enqueues a custom Svelte snippet on the shared `<Toaster />` stack. |
| `toast.promise` | `<T>(promise: Promise<T> \| (() => Promise<T>), messages: ToastPromiseOptions<T>) => Promise<T>` | Shows a persistent (`duration: Infinity`) `"base"` loading toast and updates the same `id` in-place to `"positive"` or `"negative"` upon settlement. Re-throws rejected errors. |
| `toast.dismiss` | `(id?: string) => void` | Dismisses the toast with `id` (triggering exit animation), or dismisses all active toasts when `id` is omitted. |

### `ToastOptions` & Related Types
| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | Yes | — | Primary notification heading. |
| `color` | `ToastColor` | Yes | — | Explicit semantic color: `"base" \| "accent" \| "positive" \| "caution" \| "negative"`. |
| `id` | `string` | No | `crypto.randomUUID()` | Unique identifier; passing an existing `id` updates that toast in-place and resets its timer. |
| `description` | `string` | No | `undefined` | Supporting body copy (clamped to `--cs-toast-description-lines`). |
| `icon` | `ToastIconComponent \| false` | No | `undefined` | `undefined` renders the default Lucide icon for `color`; `false` omits `<ToastIcon />`; a component overrides it. |
| `action` | `ToastActionConfig` | No | `undefined` | `{ label: string; onClick: (event: MouseEvent) => void; variant?: "secondary" \| "tertiary" }`. |
| `duration` | `number` | No | Inherits `<Toaster duration />` | Auto-dismiss duration in ms. Pass `Infinity` (or `<= 0`) for a persistent toast. |
| `dismissible` | `boolean` | No | `true` | Enables `<ToastClose />`, swipe-to-dismiss, middle-click dismiss, and `Escape` dismissal. |
| `onDismiss` | `(toast: ToastRecord) => void` | No | `undefined` | Called when dismissed manually (button, swipe, middle-click, `Escape`, or `toast.dismiss()`). |
| `onAutoClose` | `(toast: ToastRecord) => void` | No | `undefined` | Called when dismissed automatically by timer expiration. |

- **`ToastCustomOptions`:** `Omit<ToastOptions, "title" | "description" | "icon" | "action">` (`color` remains required).
- **`ToastSnippetProps`:** `{ id: string; color: ToastColor; dismissible: boolean; dismiss: () => void }` passed to `toast.custom` snippets.
- **`ToastPromiseOptions<T>`:** `{ loading: ToastPromiseMessage; success: ToastPromiseMessage \| ((data: T) => ToastPromiseMessage); error: ToastPromiseMessage \| ((error: unknown) => ToastPromiseMessage) }`, where `ToastPromiseMessage` is `string \| (Omit<ToastOptions, "color"> & { color?: ToastColor })`. `loading` defaults to `color: "base"` and `duration: Infinity`; `success` defaults to `"positive"`; `error` defaults to `"negative"`.
- **`toastState`:** Singleton store instance (`toasts: ToastRecord[]`, `heights: Record<string, number>`, plus `upsert`, `upsertCustom`, `markMounted`, `setHeight`, `dismiss`, `autoClose`, `remove`).

### `Toaster` Props
Extends `Omit<HTMLAttributes<HTMLElement>, "popover">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `placement` | `ToastPlacement` | No | `"bottom-right"` | Viewport anchor: `"bottom-right" \| "bottom-center" \| "bottom-left" \| "top-right" \| "top-center" \| "top-left"`. |
| `duration` | `number` | No | `4000` | Default auto-dismiss duration in milliseconds. |
| `maxVisible` | `number` | No | `3` | Maximum number of visible stacked toasts when collapsed. |
| `gap` | `number` | No | `12` | Vertical gap between stacked toasts in pixels (`--cs-toast-gap`). |
| `offset` | `string \| number` | No | `undefined` | Overrides `--cs-toast-viewport-offset` (numbers are formatted as `px`). |
| `ariaLabel` | `string` | No | Localized (`"Notifications"` / `"Benachrichtigungen"`) | Accessible label for the `<section>` notifications landmark region. |
| `ref` | `HTMLElement \| null` | No | `null` | `$bindable` reference to the root `<section>`. |

### `Toast` & Compound Subcomponents
- **`<Toast />`** (`Omit<HTMLAttributes<HTMLDivElement>, "color">`):
  - `color: ToastColor` (**required**)
  - `dismissible?: boolean` (`true`) — controls `data-dismissible` and context for subcomponents
  - `onDismiss?: () => void` — invoked by `<ToastClose />` via context
  - `ref?: HTMLDivElement | null` (`$bindable(null)`)
  - `children?: Snippet`
- **`<ToastIcon />`** (`Omit<HTMLAttributes<HTMLSpanElement>, "color">`):
  - `icon?: ToastIconComponent` — defaults per `color`: `Info` (`base`), `Bell` (`accent`), `CircleCheck` (`positive`), `TriangleAlert` (`caution`), `CircleAlert` (`negative`)
  - `color?: string` — forwarded to the SVG icon
  - `strokeWidth?: number | string` (`2.25`)
  - `ref?: HTMLSpanElement | null` (`$bindable(null)`)
- **`<ToastTitle />`** (`HTMLAttributes<HTMLDivElement>`): `ref?: HTMLDivElement | null` (`$bindable(null)`).
- **`<ToastDescription />`** (`HTMLAttributes<HTMLDivElement>`): `ref?: HTMLDivElement | null` (`$bindable(null)`).
- **`<ToastAction />`** (`Omit<HTMLButtonAttributes, "color" | "size">`): wraps `<Button size="xs">` with `<ButtonLabel>`.
  - `variant?: "secondary" | "tertiary"` (`"secondary"`)
  - `negative?: boolean`
  - `ref?: HTMLButtonElement | null` (`$bindable(null)`)
  - `children?: Snippet`
- **`<ToastClose />`** (`Omit<CloseButtonProps, "variant" | "size">`): wraps `<CloseButton>` with `<HitArea size="md" />` (`44px × 44px` hit target) and invokes `Toast` context `onDismiss` before `onclick`.
  - `variant?: CloseButtonVariant` (`"soft"`)
  - `size?: CloseButtonSize` (`"sm"`)

### Exported Constants & Types
- `TOAST_COLORS`: `readonly ["base", "accent", "positive", "caution", "negative"]` (`ToastColor`)
- `TOAST_PLACEMENTS`: `readonly ["bottom-right", "bottom-center", "bottom-left", "top-right", "top-center", "top-left"]` (`ToastPlacement`)
- Types: `ToastIconComponentProps`, `ToastIconComponent`, `ToastActionConfig`, `ToastOptions`, `ToastShorthandOptions`, `ToastShorthandConfig`, `ToastCustomOptions`, `ToastSnippetProps`, `ToastPromiseMessage`, `ToastPromiseOptions`, `ToastRecord`, `ToastApi`, `ToasterProps`, `ToastProps`, `ToastIconProps`, `ToastTitleProps`, `ToastDescriptionProps`, `ToastActionProps`, `ToastCloseProps`.

### `data-*` Attributes
- `.cs-toaster`: `data-placement={placement}`, `data-expanded` (when hovered or focus-within).
- `.cs-toaster-list`: `data-expanded` (when expanded and active toasts exist).
- `.cs-toast-item`: `data-mounted`, `data-front`, `data-visible` (`index < maxVisible`), `data-expanded`, `data-removed`, `data-exit-in-place` (present on exiting middle/rear toasts in expanded mode), `data-swiping`, `data-swipe-out`.
- `.cs-toast`: `data-color={color}`, `data-dismissible` (when `dismissible`).

### CSS Custom Properties
Overridable on `.cs-toaster` / `.cs-toast`:

| Variable | Default | Scope | Description |
| :--- | :--- | :--- | :--- |
| `--cs-toast-width` | `356px` | `.cs-toaster` | Toast stack width (`calc(100vw - 2 * var(--cs-toast-viewport-offset))` below `640px`). |
| `--cs-toast-viewport-offset` | `24px` (`16px` `< 640px`) | `.cs-toaster` | Distance from viewport edges. |
| `--cs-toast-gap` | `12px` | `.cs-toaster` | Gap between stacked toasts. |
| `--cs-toast-dur` | `var(--cs-dur-320)` | `.cs-toaster` | Enter, stack, and exit transition duration. |
| `--cs-toast-ease` | `var(--cs-ease-expo-out)` | `.cs-toaster` | Transition easing curve. |
| `--cs-toast-bg` | `var(--cs-color-elevated)` | `.cs-toast` | Toast card background. |
| `--cs-toast-shadow` | `var(--cs-shadow-floating)` | `.cs-toast` | Toast card shadow. |
| `--cs-toast-radius` | `var(--cs-radius-2xl)` | `.cs-toast` | Card corner radius (`corner-shape: var(--cs-squircle-smooth)`). |
| `--cs-toast-px` / `--cs-toast-py` | `14px` / `12px` | `.cs-toast` | Horizontal and vertical card padding. |
| `--cs-toast-description-lines` | `4` | `.cs-toast` | Maximum visible lines for `.cs-toast-description` (`line-clamp`). |
| `--cs-toast-icon-fg` | Semantic token per `data-color` | `.cs-toast` | Leading icon color (`--cs-color-text-main` for `base`, `--cs-color-<color>-soft-fg` otherwise). |

## Examples

### Root Setup & Basic Toasts
```svelte
<!-- +layout.svelte -->
<script lang="ts">
    import { Toaster } from "cs/svelte/toast";

    let { children } = $props();
</script>

{@render children()}
<Toaster placement="bottom-right" />
```

```ts
import { toast } from "cs/svelte/toast";

toast({ title: "Draft saved", color: "base" });
toast.accent("New comment on your review");
toast.positive("Changes published", { description: "Your workspace is now live." });
toast.caution("Storage almost full");
toast.negative("Upload failed", {
    description: "The file exceeds the 25 MB limit.",
    action: { label: "Retry", onClick: () => retryUpload() },
});
```

### Action (`Undo`), Persistent & In-Place Update
```ts
import { toast } from "cs/svelte/toast";

// Single-line Undo toast
toast.base("Message archived", {
    action: { label: "Undo", onClick: () => restoreMessage() },
});

// Persistent toast updated in-place by id
const id = toast.base("Syncing workspace…", { id: "sync", duration: Infinity, dismissible: false });
// Later:
toast.positive("Workspace synced", { id, duration: 3000, dismissible: true });
```

### Promise Lifecycle
```ts
import { toast } from "cs/svelte/toast";

await toast.promise(() => exportReport(), {
    loading: "Generating PDF…",
    success: (file) => ({ title: "Report ready", description: file.name }),
    error: "Could not generate report",
});
```

### Custom Compound Toast (`toast.custom`)
```svelte
<script lang="ts">
    import { Toast, ToastAction, ToastClose, ToastDescription, ToastIcon, ToastTitle, toast } from "cs/svelte/toast";
</script>

{#snippet customNotice({ dismiss, color })}
    <Toast {color} onDismiss={dismiss}>
        <ToastIcon />
        <ToastTitle>Deployment queued</ToastTitle>
        <ToastDescription>Build #418 is waiting for an available runner.</ToastDescription>
        <ToastAction variant="tertiary" onclick={dismiss}>Dismiss</ToastAction>
        <ToastClose />
    </Toast>
{/snippet}

<button onclick={() => toast.custom(customNotice, { color: "accent", duration: 6000 })}>
    Notify
</button>
```

## Behavior & Quirks
- **Top-Layer promotion (`popover="manual"`):** `<Toaster />` uses `topLayer({ enabled: () => toastState.toasts.length > 0 })` on `<section popover="manual">`. It renders above open `<Overlay />` modals and `<Popover />` surfaces without stealing focus, making the background `inert`, or light-dismissing on outside clicks. `.cs-toaster` and `.cs-toaster-list` default to `pointer-events: none` so clicks pass through to underlying content; `.cs-toaster-list[data-expanded]` restores `pointer-events: auto` so dismissing a toast while hovered does not create a dead zone that collapses the stack.
- **Auto-dismiss timers & `duration: Infinity`:** Default duration is `4000ms`; passing `Infinity` (or `<= 0`) disables auto-dismiss. Timers pause whenever the stack is hovered, swiped, or has keyboard focus (`expanded || interacting || focusWithin`) and resume with the remaining time preserved. Updating an existing `id` resets its timer.
- **Middle-click power-user dismiss:** Each dismissible toast attaches `middleClick`, ignoring interactive elements (`a[href], button:not(.cs-toast-close), input, textarea, select, [role='button']:not(.cs-toast-close)`). Middle-clicking a link inside a toast opens the link normally, while middle-clicking the toast surface or close button dismisses it.
- **Swipe-to-dismiss:** Dragging with the primary pointer (`button === 0`, outside interactive controls) toward the anchored viewport edge (`deltaY * -lift > 0`) tracks pointer movement with progressive opacity fade while dragging; releasing at `>= 28px` (or a quick flick `>= 12px` at `>= 0.3 px/ms`) dismisses the toast (`200ms` swipe-out), while shorter/slower drags snap back.
- **Accessibility (`role="alert"` vs `role="status"`, `Escape`):** `color="negative"` sets `role="alert"` and `aria-live="assertive"`; all other colors set `role="status"` and `aria-live="polite"` (all with `aria-atomic="true"`). Pressing `Escape` while focus is inside a dismissible toast stops propagation and dismisses that toast.
- **Stacking, double-`rAF` & reduced motion:** New toasts measure height synchronously and flip `data-mounted` inside a double `requestAnimationFrame` so the off-screen start frame paints first; `frontToastHeight` falls back to the second toast's height on frame 0 so rear toasts never collapse. An invisible `::after` hover bridge (`calc(gap + 2px)`) prevents accidental collapse between expanded toasts. Under `prefers-reduced-motion: reduce`, dismissed toasts unmount immediately via `queueMicrotask` without waiting for exit timers.
- **Adaptive grid layout:** Without `<ToastDescription />`, `<ToastAction />` sits inline in row 1 before `<ToastClose />`. When `<ToastDescription />` is present, `<ToastAction />` moves to row 3 below the description so text retains full width.
