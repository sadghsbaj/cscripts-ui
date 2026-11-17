# Modal — Technical Architecture & API Blueprint

## 1. Overview & Scope

`Modal` is a high-focus, top-layer dialog compound component (`kind: component`) designed to be rendered inside `Overlay`. It provides W3C APG Modal Dialog accessibility, built-in focus trapping, choreographed enter/exit transitions, dismissibility & blocking feedback, and a `Card`-aligned compound layout (`ModalHeader`, `ModalSubtitle`, `ModalTitle`, `ModalDescription`, `ModalBody`, `ModalFooter`, `ModalActions`, `ModalClose`).

### Architectural Boundaries

- **Owns:** Dialog semantics (`role="dialog"`, `aria-modal="true"`, automatic `aria-labelledby` / `aria-describedby` registration), open/close state coordination (`open = $bindable(true)`), `focusTrap` integration, `Escape` & `onBeforeClose` handling, blocking feedback (`data-blocked` + `nudge()`), `ModalContext`, compound subcomponents, and dialog surface styling/motion aligned with [modal.design.md](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/modal/modal.design.md).
- **Composed Externally by Consumer:**
  - `Overlay` wraps `<Modal>` at the call site (`{#if open}<Overlay variant="blur" ...><Modal ... /></Overlay>{/if}`), owning Top Layer promotion (`popover="manual"` + `topLayer()`), backdrop styling (`variant`), `lockScroll`, backdrop `onclick`, and exit unmount delay (`out:overlayExit`).
  - `ScrollArea` / `ScrollAreaContent` and `scrollFade` are composed explicitly inside `ModalBody` by the consumer when scrollable content is needed.
- **Delegates Internally:**
  - Focus trapping, `Escape` interception, initial focus, and focus restoration to `focusTrap`.
  - Corner dismiss button + hit-area expansion to `CloseButton` and `HitArea`.
- **Non-Goals:** Owning or wrapping `Overlay`, baking `ScrollArea` into `ModalBody`, non-modal drawers/sheets, inline cards (use `Card`), or anchor-tethered menus (use `Popover`).

---

## 2. Public API

All public symbols are exported flatly from `src/modules/modal/index.ts` (no dot-notation namespaces, no `*.internal.*` exports).

### 2.1 Component Exports

- `Modal`
- `ModalHeader`
- `ModalSubtitle`
- `ModalTitle`
- `ModalDescription`
- `ModalBody`
- `ModalFooter`
- `ModalActions`
- `ModalClose`

### 2.2 Option Arrays & Types

```ts
export const MODAL_SIZES = ["sm", "md", "lg", "xl", "full"] as const;
export const MODAL_TITLE_ELEMENTS = ["h1", "h2", "h3", "h4", "h5", "h6", "div"] as const;
export const MODAL_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const;
export const MODAL_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const MODAL_CLOSE_REASONS = ["escape", "outside-click", "close-button", "programmatic"] as const;

export type ModalSize = (typeof MODAL_SIZES)[number];
export type ModalTitleElement = (typeof MODAL_TITLE_ELEMENTS)[number];
export type ModalActionsAlign = (typeof MODAL_ACTIONS_ALIGNS)[number];
export type ModalActionsOrientation = (typeof MODAL_ACTIONS_ORIENTATIONS)[number];
export type ModalCloseReason = (typeof MODAL_CLOSE_REASONS)[number];
```

### 2.3 Component Props

Per `.agents/rules/architecture-and-apis.md`:
- `size` on `Modal` has **no default value** and must be chosen explicitly at every call site.
- Every DOM-rendering component exposes `ref = $bindable(null)` and forwards `{...rest}` to its root DOM element.

```ts
export type ModalProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    /**
     * Controls active dialog state (e.g. `focusTrap` activation) and syncs with
     * `{#if open}` around the external `<Overlay>`.
     * @default true
     */
    open?: boolean; // $bindable(true)
    /** Explicit T-shirt size mapped to container width tokens. Required. */
    size: ModalSize;

    /** Master dismissibility flag for Escape key dismissal. @default true */
    dismissible?: boolean;
    /** Granular override for Escape key dismissal. Defaults to `dismissible`. */
    closeOnEscape?: boolean;

    /** Enables built-in focusTrap attachment. @default true */
    focusTrap?: boolean;
    /** Initial focus target when opened. @default "first-focusable" */
    initialFocus?: FocusTrapTarget | false;
    /** Element or resolver to restore focus to on close. @default true */
    restoreFocus?: boolean | HTMLElement | (() => HTMLElement | null);

    /**
     * Intercepts close requests before `open` becomes `false`.
     * Returning `false` cancels the close.
     */
    onBeforeClose?: (reason: ModalCloseReason) => boolean | void | Promise<boolean | void>;
    /** Called after a close request succeeds and `open` transitions to `false`. */
    onClose?: (reason: ModalCloseReason) => void;
    /** Called whenever `open` changes. */
    onOpenChange?: (open: boolean) => void;
};

export type ModalHeaderProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ModalSubtitleProps = HTMLAttributes<HTMLParagraphElement> & {
    ref?: HTMLParagraphElement | null;
};

export type ModalTitleProps = HTMLAttributes<HTMLHeadingElement | HTMLDivElement> & {
    ref?: HTMLHeadingElement | HTMLDivElement | null;
    /** Heading level or element tag. @default "h2" */
    as?: ModalTitleElement;
};

export type ModalDescriptionProps = HTMLAttributes<HTMLParagraphElement> & {
    ref?: HTMLParagraphElement | null;
};

export type ModalBodyProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ModalFooterProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ModalActionsProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    /** @default "end" */
    align?: ModalActionsAlign;
    /** @default "horizontal" */
    orientation?: ModalActionsOrientation;
};

export type ModalCloseProps = Omit<CloseButtonProps, "variant" | "size"> & {
    /** @default "soft" */
    variant?: CloseButtonVariant;
    /** Defaults proportionally to Modal `size` ("sm" -> "sm", "md"+ -> "md"). */
    size?: CloseButtonSize;
};
```

### 2.4 Exported Component Methods (`Modal`)

`Modal` exports imperative helpers (accessible via `bind:this={modalRef}` on `<Modal>`, distinct from `bind:ref` which binds the root `HTMLDivElement`):

- `requestClose(reason?: ModalCloseReason): Promise<boolean>` — Runs dismissibility / `onBeforeClose` checks; closes if allowed, or triggers `nudge()` if blocked.
- `nudge(): void` — Triggers the `data-blocked` attention pulse on `.cs-modal` (useful when `Overlay`'s `onclick` fires on a blocking modal).

### 2.5 Context API (`ModalContext`)

```ts
export interface ModalContext {
    readonly size: ModalSize;
    readonly dismissible: boolean;
    readonly titleId: string | undefined;
    readonly descriptionId: string | undefined;
    registerTitle: (id: string) => () => void;
    registerDescription: (id: string) => () => void;
    close: (reason?: ModalCloseReason) => void;
}

export const [getModalContext, setModalContext, hasModalContext] = createContext<ModalContext>();
```

### 2.6 CSS Custom Properties (`--cs-modal-*`)

All custom properties follow `.agents/rules/naming.md` (no `--_` private prefixes):

- Surface & shape: `--cs-modal-bg`, `--cs-modal-fg`, `--cs-modal-shadow`, `--cs-modal-radius`, `--cs-modal-squircle`
- Layout & typography: `--cs-modal-max-width`, `--cs-modal-padding`, `--cs-modal-gap`, `--cs-modal-header-gap`, `--cs-modal-title-size`, `--cs-modal-close-offset`, `--cs-modal-close-size`
- Motion: `--cs-modal-dur-in`, `--cs-modal-dur-fade-in`, `--cs-modal-dur-out`, `--cs-modal-ease-in`, `--cs-modal-ease-out`, `--cs-modal-scale-start`, `--cs-modal-scale-exit`, `--cs-modal-translate-y`

---

## 3. Architectural Decisions & Lifecycle

### 3.1 External `<Overlay>` Composition & Open/Close Lifecycle

Consumers compose `Modal` directly inside `Overlay`:

```svelte
{#if open}
    <Overlay variant="blur" onclick={() => modal?.requestClose("outside-click")}>
        <Modal bind:this={modal} bind:open size="md">
            ...
        </Modal>
    </Overlay>
{/if}
```

- **Why `open = $bindable(true)`:** Because `<Modal>` is mounted inside `{#if open}<Overlay>...</Overlay>{/if}`, `open` is `true` on mount. When the user presses `Escape` or clicks `ModalClose`, `Modal` sets `open = false` and fires `onOpenChange?.(false)` and `onClose?.(reason)`. Consumers using `bind:open` automatically tear down `{#if open}`, and consumers without `bind:open` can close via `onClose`.
- **Staggered Exit Sync (`out:overlayExit`):** When `open` transitions to `false`, `{#if open}` triggers `Overlay`'s `out:overlayExit`, which calls `node.hidePopover()` immediately and delays unmounting for `180ms` (`--cs-dur-exit-lg`). Removing `:popover-open` from `.cs-overlay` simultaneously triggers `.cs-modal`'s `120ms` exit transition (`--cs-dur-exit-md`) and `.cs-overlay`'s `180ms` dissolve, so the dialog vanishes `60ms` before the backdrop finishes fading.
- **`Overlay` Backdrop Click vs. `focusTrap` (`allowOutsideClick`):**
  - `Overlay` tracks `isBackdropPointerDown` (`pointerdown` + `click` on `event.target === event.currentTarget`) and only fires `onclick` for genuine backdrop clicks.
  - `focusTrap` registers a capture-phase `document` `pointerdown` listener that calls `event.preventDefault(); event.stopImmediatePropagation();` whenever `allowOutsideClick` returns `false`. Without coordination, `focusTrap` would swallow `pointerdown` on `.cs-overlay` and prevent `Overlay`'s `onclick` from ever firing!
  - **Solution:** `Modal` configures `focusTrap` with:
    `allowOutsideClick: (event) => event.target instanceof Element && event.target === ref?.closest(".cs-overlay")`
    This lets `pointerdown` reach the enclosing `.cs-overlay` backdrop so `Overlay.onclick` works normally, while still blocking clicks on arbitrary outside elements. Because `.cs-overlay` is not focusable and `allowOutsideClick` is a function (not `true`), `focusTrap`'s `focusin` guard still pulls focus back into `.cs-modal` if focus ever leaves.

### 3.2 Focus Management (`focusTrap` & `autoFocus`)

**Architectural Question:** *Should `focusTrap` be wired into `Modal` by default, or attached externally by the consumer?*

**Decision: Built-in `focusTrap` by default** (with `focusTrap?: boolean`, `initialFocus`, and `restoreFocus` props).

- **Trade-off analysis:**
  - *External attachment* forces every consumer to wire `focusTrap`, `onEscape`, `restoreFocus`, and the `.cs-overlay` `allowOutsideClick` exception manually; omitting it silently ships an inaccessible dialog.
  - *Built-in `focusTrap`* guarantees W3C APG compliance (`Tab`/`Shift+Tab` loop, `Escape` handling, outside-click protection, nested `trapStack` pause/resume, and trigger focus restoration) out of the box, while `focusTrap={false}` remains available as an escape hatch.
- **Immediate deactivation on close:** `Modal` passes `enabled: () => open && focusTrap` to `focusTrap`. As soon as `open` becomes `false`, `focusTrap` deactivates and restores focus to the trigger immediately rather than waiting `180ms` for `out:overlayExit` to finish unmounting.
- **Coexisting with child `autoFocus()`:** Both `focusTrap` and `autoFocus` default to `timing: "raf"`. If a consumer attaches `{@attach autoFocus({ select: "all" })}` to an `<input>` inside `ModalBody` while `Modal` has `initialFocus="first-focusable"`, `focusTrap` could steal focus back to `ModalClose` if its `rAF` runs second.
  - **Pattern:** Consumers delegating initial focus to a child `{@attach autoFocus()}` pass `initialFocus={false}` (or a matching CSS selector) on `Modal`. `focusTrap` continues to trap `Tab` navigation and restore focus on close without competing for initial focus.

### 3.3 Dismissibility & Blocking Modals

- **Close paths:**
  - `"escape"`: triggered by `focusTrap`'s `onEscape`. Allowed when `closeOnEscape ?? dismissible` is `true`.
  - `"close-button"`: triggered by `ModalClose` via `ModalContext.close("close-button")`.
  - `"outside-click"` / `"programmatic"`: triggered by the consumer via `Overlay`'s `onclick` calling `modal?.requestClose("outside-click")` (or directly setting `open = false` for simple dismissible modals).
- **Blocking feedback (`data-blocked` & `nudge()`):**
  - When `"escape"` is pressed while `!(closeOnEscape ?? dismissible)`, or when `requestClose("outside-click")` is called while `!dismissible`, or when `modal.nudge()` is called directly (e.g. `<Overlay onclick={() => modal?.nudge()}>`), `Modal` sets `data-blocked=""` on `.cs-modal` to play the `280ms` `cs-modal-blocked` scale pulse (`1 → 1.016 → 0.996 → 1`), clearing `data-blocked` on `animationend` (with a timeout fallback so repeated attempts re-trigger cleanly).
- **`onBeforeClose`:** Awaited if it returns a `Promise`. Returning `false` aborts the close without mutating `open`.

---

## 4. DOM, Semantics & Accessibility

- **Dialog Element:** `.cs-modal` renders as `<div role="dialog" aria-modal="true" ...>` inside the consumer's `<Overlay>`.
- **Automatic ARIA Labelling:**
  - `ModalTitle` generates a stable ID via `$props.id()` (unless `id` is passed in `...rest`) and registers it via `ModalContext.registerTitle(id)`.
  - `ModalDescription` similarly registers its ID via `ModalContext.registerDescription(id)`.
  - `Modal` sets `aria-labelledby={rest["aria-labelledby"] ?? titleId}` and `aria-describedby={rest["aria-describedby"] ?? descriptionId}` (omitted when `undefined`).
- **`data-*` Attributes:**
  - `.cs-modal`: `data-size={size}`, `data-blocked={isBlocked ? "" : undefined}` (plus `data-focus-trapped`, `data-focus-trap-paused` managed by `focusTrap`).
  - `.cs-modal-actions`: `data-align={align}`, `data-orientation={orientation}`.
- **Keyboard & Focus:**
  - `Tab` / `Shift+Tab`: cyclically trapped within `.cs-modal` via `focusTrap`.
  - `Escape`: intercepted in capture phase by `focusTrap`'s `onEscape` (only when `.cs-modal` is the topmost trap in `trapStack`).
  - No-focusable-children fallback: `focusTrap` (`fallbackFocus: "self"`) temporarily assigns `tabindex="-1"` to `.cs-modal` and cleans it up on teardown.

---

## 5. Visual & Motion Contract

Aligned strictly with [modal.design.md](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/modal/modal.design.md):

- **Surface & Elevation:** `background-color: var(--cs-modal-bg)` (`--cs-color-elevated`), `box-shadow: var(--cs-modal-shadow)` (`--cs-shadow-floating`), borderless depth, `corner-shape: var(--cs-modal-squircle)` (`squircle`), and `overflow: clip`.
- **Size Scale:**
  - `sm`: `max-inline-size: var(--cs-container-sm)` (`384px`), `padding: 20px`, `gap: 12px`, `radius: 24px`, `CloseButton` `sm` (`24px`).
  - `md`: `max-inline-size: var(--cs-container-lg)` (`512px`), `padding: 24px`, `gap: 16px`, `radius: 28px`, `CloseButton` `md` (`32px`).
  - `lg`: `max-inline-size: var(--cs-container-2xl)` (`672px`), `padding: 24px`, `gap: 16px`, `radius: 28px`.
  - `xl`: `max-inline-size: var(--cs-container-4xl)` (`896px`), `padding: 24px`, `gap: 16px`, `radius: 28px`.
  - `full`: `max-inline-size: 100%`, `block-size: 100%`, `padding: 24px`, `gap: 16px`, `radius: 28px`.
- **Header & CloseButton Clearance:** `ModalClose` is positioned `absolute` at `inset-block-start: 12px; inset-inline-end: 12px;`. When `:has(> .cs-modal-close)` matches, `.cs-modal-header` (or `.cs-modal-body:first-of-type` if header is omitted) receives `padding-inline-end` clearance so titles and copy never collide with the close button.
- **Plain `ModalBody` & Scroll Composition:**
  - `ModalBody` is a clean flex container (`flex: 1 1 auto; min-block-size: 0; display: flex; flex-direction: column; gap: var(--cs-modal-gap); min-inline-size: 0;`) so `ModalHeader` and `ModalFooter` remain pinned while `ModalBody` absorbs vertical space.
  - When scrolling is needed, consumers explicitly compose `<ScrollArea size="sm" direction="vertical">` + `<ScrollAreaContent {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}>` inside `ModalBody` (optionally using negative-margin horizontal bleed `margin-inline: calc(var(--cs-modal-padding) * -1); padding-inline: var(--cs-modal-padding);` to keep inner focus rings unclipped and the scrollbar track near the outer edge).
- **Choreographed Motion:**
  - Enter: `.cs-overlay:popover-open .cs-modal` with `@starting-style` animates `opacity` (`0 → 1` over `160ms` `quad-out`), `scale` (`0.94 → 1` over `380ms` `--cs-spring-snappy`), and `translate` (`0 8px → 0 0`). No `filter: blur()` on `.cs-modal`.
  - Exit: `.cs-modal` exits in `120ms` (`--cs-dur-exit-md`), `60ms` before `Overlay` finishes its `180ms` (`--cs-dur-exit-lg`) dissolve.
  - Reduced motion is handled globally by `motion.css`.

---

## 6. Edge Cases & Constraints

- **Stacked Modals:** Each `Modal` sits inside its own `Overlay` (`popover="manual"` + `topLayer()`), pushing onto the browser Top Layer in open order. `focusTrap`'s module-level `trapStack` automatically pauses the underlying modal's trap and resumes it (restoring focus to the inner trigger) when the top modal closes.
- **Popovers, Selects & Tooltips inside `Modal`:** `Popover` (`popover="auto"`) opened from inside a `Modal` promotes above `Overlay` in the Top Layer. Rendering `Popover` *inside* `.cs-modal` in the DOM ensures `container.contains(target)` is `true` for `focusTrap` (and `Escape` closes the `Popover` first before bubbling to `Modal`).
- **SSR & Testing:** Closed modals (`{#if open}` false) render zero DOM during SSR. All browser-only APIs (`showPopover`, `focus`) are guarded inside attachments/effects. Tests should query dialogs via `getByRole("dialog")`.
