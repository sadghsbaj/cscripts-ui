# Modal — Visual, Spatial & Motion Design Specification

## 1. Visual Philosophy & Role

`Modal` is a high-focus, top-layer dialog island designed to be composed inside `Overlay` (`<Overlay variant="blur"><Modal ...>...</Modal></Overlay>`). It follows `cscripts-ui`'s crafted minimalism: calm monochrome `elevated` surfaces, borderless depth, `squircle` geometry, and crisp, physical motion that feels grounded rather than theatrical.

Unlike `Card` (which rests inline on `canvas` or `sunken` regions) or `Popover` (which is a compact, anchor-tethered menu), `Modal` commands full viewport attention over a dimmed or blurred backdrop. Its proportions, typography, and entrance physics are tuned for **large floating surfaces** where text legibility and zero layout jitter are paramount.

---

## 2. Choreographed Entrance & Exit with `Overlay`

`Modal` is composed externally as the centered flex child of `Overlay` (`popover="manual"` + `topLayer()`). Because `Overlay` owns the Top Layer lifecycle and `out:overlayExit` unmount delay, `Modal` and `Overlay` share a single mount/unmount timeline driven purely by CSS (`.cs-overlay:popover-open .cs-modal` + `@starting-style`), with zero JS frame synchronization.

### 2.1 Asymmetric Enter / Exit Choreography

| Phase | Element | Property | From → To | Duration | Easing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Enter** | `Overlay` (Backdrop) | `opacity` | `0 → 1` | `--cs-dur-enter-sm` (`260ms`) | `--cs-ease-effect` (`quad-out`) |
| **Enter** | `Overlay` (`variant="blur"`) | `backdrop-filter` | `blur(0px) saturate(100%) → blur(16px) saturate(160%)` | `--cs-dur-enter-lg` (`440ms`) | `--cs-ease-quart-out` |
| **Enter** | `Modal` (Panel) | `opacity` | `0 → 1` | `--cs-dur-effect` (`160ms`) | `--cs-ease-effect` (`quad-out`) |
| **Enter** | `Modal` (Panel) | `scale` | `0.94 → 1` | `--cs-dur-enter-md` (`380ms`) | `--cs-ease-enter` (`--cs-spring-snappy`) |
| **Enter** | `Modal` (Panel) | `translate` | `0 8px → 0 0` | `--cs-dur-enter-md` (`380ms`) | `--cs-ease-enter` (`--cs-spring-snappy`) |
| **Exit** | `Modal` (Panel) | `opacity`, `scale`, `translate` | `1 → 0`, `1 → 0.96`, `0 0 → 0 4px` | `--cs-dur-exit-md` (`120ms`) | `--cs-ease-exit` (`quad-in`) |
| **Exit** | `Overlay` (Backdrop) | `opacity`, `backdrop-filter` | `1 → 0`, `blur(16px) → blur(0px)` | `--cs-dur-exit-lg` (`180ms`) | `--cs-ease-exit` (`quad-in`) |

**Why these exact values:**
- **Tighter scale delta (`0.94 → 1` vs. Popover's `0.9 → 1`):** On a `512px–896px` dialog, `0.9` reads as an exaggerated zoom. Starting at `0.94` with `--cs-spring-snappy` (~4% overshoot) produces a crisp, tactile settle without feeling bouncy.
- **Subtle vertical lift (`8px → 0`):** Adds gentle directional gravity with `transform-origin: center center`, avoiding the cheap "bottom-sheet slide" feel.
- **Fast opacity arrival (`160ms`):** Content reaches full contrast well before the `380ms` spring finishes settling, so the modal never looks ghostly.
- **Staggered exit (`120ms` panel vs. `180ms` backdrop):** `Overlay`'s `overlayExit` transition reads `getComputedStyle(overlayNode).transitionDuration` (`180ms`). Exiting the modal panel in `120ms` ensures the dialog vanishes cleanly `60ms` *before* the backdrop finishes dissolving, preventing an un-blurred background from showing through a half-faded dialog.

### 2.2 Evaluation of `filter: blur(...)` on the Modal Panel

**Decision: Do NOT apply `filter: blur(...)` to `.cs-modal`.** Keep blur strictly on `Overlay` (`backdrop-filter`).

- **Text crispness & subpixel pop:** During a `380ms` spring settle (`--cs-spring-snappy`), animating `filter: blur()` forces rasterized text anti-aliasing until `filter` snaps to `0px` at `transitionend`, causing a visible sharpness pop on modal headings and body copy.
- **Double-blur GPU cost:** `Overlay` already composites `backdrop-filter: blur(16px) saturate(160%)` across `100dvw × 100dvh`. Adding a second animated `filter: blur()` pass on a large surface with rich form/scroll children risks frame drops on integrated GPUs and mobile devices.
- **Shadow & layer artifacts:** `filter` creates an isolated stacking/compositing boundary that can clip or rasterize `--cs-shadow-floating` around large squircle corners.

### 2.3 Blocking / Guarded Close Micro-Feedback (`dismissible={false}` & `onBeforeClose`)

When a user attempts to close a modal—via backdrop click, `Escape`, or `ModalClose`—and the close is prevented either statically (`dismissible={false}`) or dynamically (`onBeforeClose` returning `false`, e.g., an unsaved-changes guard), total silence feels broken or frozen. Triggering the restrained **attention pulse** (`data-blocked` animation) in both cases gives immediate tactile acknowledgment that the interaction was received and intentionally prevented:

- **Animation:** `@keyframes cs-modal-blocked` over `var(--cs-dur-280)` (`280ms`) with `var(--cs-ease-quad-out)`:
  - `0%`: `scale: 1`
  - `35%`: `scale: 1.016`
  - `70%`: `scale: 0.996`
  - `100%`: `scale: 1`
- **Why scale pulse over horizontal shake:** A damped scale pulse communicates "this surface is locked and needs your attention" in `cscripts-ui`'s calm, physical language—without looking like a form validation error shake and without risking edge clipping near the viewport.

---

## 3. Size Scale & Responsive Bounds

`Modal` uses the T-shirt `size` scale (`sm`, `md`, `lg`, `xl`, `full`), mapped directly to `container.css` width tokens.

| `size` | `--cs-modal-max-width` | `--cs-modal-padding` | `--cs-modal-gap` | `--cs-modal-radius` | Typical Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sm` | `var(--cs-container-sm)` (`384px`) | `20px` | `12px` | `var(--cs-radius-3xl)` (`24px`) | Confirmations, destructive prompts, single-input dialogs |
| `md` *(default)* | `var(--cs-container-lg)` (`512px`) | `24px` | `16px` | `28px` | Standard forms, settings, detail views |
| `lg` | `var(--cs-container-2xl)` (`672px`) | `24px` | `16px` | `28px` | Multi-section editors, tables, rich previews |
| `xl` | `var(--cs-container-4xl)` (`896px`) | `24px` | `16px` | `28px` | Complex workflows, split layouts, wide data views |
| `full` | `100%` | `24px` | `16px` | `28px` | Immersive editors, media/document viewers |

### Viewport Margins, `dvh` Height & Mobile Responsiveness

- **Viewport edge margins:** `Overlay` already enforces `padding: var(--cs-overlay-padding)` (`clamp(1rem, 0.5rem + 2dvmin, 2rem)`, i.e. `16px` on small mobile viewports up to `32px` on desktop) inside a `100dvw × 100dvh` flex container.
- **Modal dimensions:**
  - `inline-size: 100%;`
  - `max-inline-size: var(--cs-modal-max-width);`
  - `max-block-size: 100%;` (resolves cleanly to `calc(100dvh - 2 * var(--cs-overlay-padding))` without duplicating `dvh` math).
  - For `size="full"`, additionally set `block-size: 100%;` so it fills the inset viewport area even when content is sparse.
- **Mobile (`< 640px`):** `--cs-overlay-padding` naturally contracts to `16px`, and `inline-size: 100%` fluidly constrains any modal size to `calc(100dvw - 32px)` with zero horizontal overflow.

---

## 4. Compound Anatomy & Optical Balance

Aligned with `Card`'s compound pattern, using `display: flex; flex-direction: column;` on `.cs-modal` so Header and Footer remain pinned while Body absorbs vertical overflow.

### 4.1 Subcomponents

- `Modal` (`.cs-modal`, `role="dialog"`, `aria-modal="true"`)
- `ModalHeader` (`.cs-modal-header`)
- `ModalSubtitle` (`.cs-modal-subtitle`, optional eyebrow/kicker placed above `ModalTitle`)
- `ModalTitle` (`.cs-modal-title`, default `as = "h2"`)
- `ModalDescription` (`.cs-modal-description`)
- `ModalBody` (`.cs-modal-body`)
- `ModalFooter` (`.cs-modal-footer`)
- `ModalActions` (`.cs-modal-actions`, mirrors `CardActions`)
- `ModalClose` (`.cs-modal-close`, wraps `CloseButton` + `<HitArea size="md" />`, mirrors `CardClose`)

### 4.2 Header & `CloseButton` Optical Alignment

Per `design-and-tokens.md`, the close button sits closer to the outer corner than the title's padding, rather than inside the title row:

- **Placement:** `position: absolute; inset-block-start: var(--cs-modal-close-offset); inset-inline-end: var(--cs-modal-close-offset); z-index: 2;`
- **Size & Concentricity:**
  - `sm` modal (`padding: 20px`, `radius: 24px`): `CloseButton` `size="sm"` (`24px`), `variant="soft"`, `--cs-modal-close-offset: 12px` → button center at `(24px, 24px)`, matching the `24px` outer corner radius.
  - `md` / `lg` modal (`padding: 24px`, `radius: 28px`): `CloseButton` `size="sm"` (`24px`), `variant="soft"`, `--cs-modal-close-offset: 16px` → button center at `(28px, 28px)`, matching the `28px` outer corner radius.
  - `xl` / `full` modal (`padding: 24px`, `radius: 28px`): `CloseButton` `size="md"` (`32px`), `variant="soft"`, `--cs-modal-close-offset: 12px` → button center at `(28px, 28px)`, matching the `28px` outer corner radius.
- **Title clearance (no collision):**
  - When `.cs-modal-close` is present, `.cs-modal-header` (or `.cs-modal-title:first-of-type` if used standalone) receives:
    `padding-inline-end: calc(var(--cs-modal-close-size) + var(--cs-modal-close-offset) - var(--cs-modal-padding) + 12px);`
    On `md`/`lg` (`24 + 16 - 24 + 12 = 28px`) and `xl`/`full` (`32 + 12 - 24 + 12 = 32px`), this leaves a clean `12px` optical gap between the longest wrapping title line and the `CloseButton` without wasting horizontal space.
- **Header typography & `ModalSubtitle` placement:**
  - `ModalHeader`: `flex: 0 0 auto; display: flex; flex-direction: column; gap: var(--cs-modal-header-gap);` (`4px`). It respects DOM order, with the canonical pattern being `ModalSubtitle` → `ModalTitle` → `ModalDescription`.
  - `ModalSubtitle` (eyebrow/kicker above `ModalTitle`): `var(--cs-text-xs)`, `font-weight: 500`, `color: var(--cs-color-text-weak)`, `line-height: var(--cs-leading-tight)`. Placing it *above* `ModalTitle` establishes a crisp 3-tier hierarchy (context/category → primary heading → explanatory description) instead of competing with `ModalDescription` below the title.
  - `ModalTitle`: `var(--cs-modal-title-size)` (`var(--cs-text-base)` on `sm`, `var(--cs-text-lg)` on `md+`), `font-weight: 600`, `color: var(--cs-color-text-strong)`, `line-height: var(--cs-leading-tight)`, `letter-spacing: var(--cs-tracking-tight)`.
  - `ModalDescription`: `var(--cs-text-sm)`, `color: var(--cs-color-text-weak)`, `line-height: var(--cs-leading-normal)`.

### 4.3 `ModalBody` & Overflow Composition (`ScrollArea` / `ScrollFade`)

`ModalBody` is a clean, overflow-ready layout slot—it does **not** embed `ScrollArea` or `scrollFade` internally, keeping it lightweight and composable when consumers choose to wrap or attach them.

- **Flexbox pinning:** `.cs-modal-body` uses `flex: 1 1 auto; min-block-size: 0; display: flex; flex-direction: column; gap: var(--cs-modal-gap);`. This keeps `ModalHeader` and `ModalFooter` pinned while allowing `ModalBody` (or a `ScrollArea` placed inside it) to absorb vertical overflow cleanly.
- **Composing `ScrollArea` + `ScrollFade`:** When tall content needs custom scrollbars or edge fades, consumers compose `<ScrollArea>` and/or `{@attach scrollFade({ direction: "vertical", size: "sm" })}` inside `ModalBody`.
- **Focus Ring & Scrollbar Bleed:** When `ModalBody` (or an inner `ScrollArea` viewport) scrolls, using negative inline margin + matching inline padding (`margin-inline: calc(var(--cs-modal-padding) * -1); padding-inline: var(--cs-modal-padding);`) ensures inner `:focus-visible` outlines (`2px` + `2px` offset) are never clipped and overlay scrollbar tracks sit cleanly near the modal's outer edge.

### 4.4 `ModalFooter` & `ModalActions`

Directly mirrors `CardFooter` and `CardActions`:
- `ModalFooter`: `flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: var(--cs-modal-gap); align-items: center; justify-content: space-between; min-inline-size: 0;`
- `ModalActions`: Supports `align` (`"start" | "end" | "stretch"`, default `"end"`) and `orientation` (`"horizontal" | "vertical"`, default `"horizontal"`):
  - **Right-aligned row (default):** `align="end"`, `orientation="horizontal"` (classic Cancel + Primary CTA).
  - **Split footer:** Helper link/checkbox on the left + `ModalActions` on the right (`justify-content: space-between` on `ModalFooter`).
  - **Full-width side-by-side:** `align="stretch"`, `orientation="horizontal"` (`flex: 1 1 0%` on each action).
  - **Stacked full-width:** `align="stretch"`, `orientation="vertical"` (ideal for `sm` mobile/destructive confirmations).

---

## 5. Surface, Radii, Shadows & Tokens

### 5.1 CSS Custom Properties (`--cs-modal-*`)

All tokens follow `.agents/rules/naming.md` (no `--_` prefixes; canonical `bg`, `fg`, `shadow`, `radius`, `dur`, `ease`):

```css
.cs-modal {
    --cs-modal-bg: var(--cs-color-elevated);
    --cs-modal-fg: var(--cs-color-text-main);
    --cs-modal-shadow: var(--cs-shadow-floating);
    --cs-modal-radius: 28px;
    --cs-modal-squircle: var(--cs-squircle);
    --cs-modal-padding: 24px;
    --cs-modal-gap: 16px;
    --cs-modal-header-gap: 4px;
    --cs-modal-close-offset: 16px;
    --cs-modal-close-size: 24px;
    --cs-modal-title-size: var(--cs-text-lg);

    /* Motion */
    --cs-modal-dur-in: var(--cs-dur-enter-md);
    --cs-modal-dur-fade-in: var(--cs-dur-effect);
    --cs-modal-dur-out: var(--cs-dur-exit-md);
    --cs-modal-ease-in: var(--cs-ease-enter);
    --cs-modal-ease-out: var(--cs-ease-exit);
    --cs-modal-scale-start: 0.94;
    --cs-modal-scale-exit: 0.96;
    --cs-modal-translate-y: 8px;
}
```

### 5.2 Surface, Shadow & Layering Parity

- **Surface & Borderless Depth:** `background-color: var(--cs-modal-bg)` (`--cs-color-elevated`), `box-shadow: var(--cs-modal-shadow)` (`--cs-shadow-floating`), `corner-shape: var(--cs-modal-squircle)` (`squircle`), and `overflow: clip`.
- **Concentric Inner Radii:** Any inset card or well placed inside `ModalBody` should use `border-radius: calc(var(--cs-modal-radius) - var(--cs-modal-padding))` (minimum `10px–12px`, e.g., `--cs-radius-lg` / `--cs-radius-xl`) with `corner-shape: var(--cs-squircle-smooth)`.
- **Top-Layer Stacking (`Overlay`, `Popover`, `Toast`):**
  - `Overlay` promotes `Modal` to the browser Top Layer via `popover="manual"` + `topLayer()`.
  - Nested `Popover`s (Select, Combobox, Tooltip) opened *from within* an open `Modal` use `popover="auto"` and are pushed onto the Top Layer *above* the `Overlay`/`Modal` naturally—zero `z-index` hacks needed.
  - `Toaster` also uses `popover="manual"` + `topLayer()`. If a toast is emitted while a modal is open, `Toaster` should ensure it remains above or re-promotes if needed, without `Modal` hardcoding arbitrary `z-index` values.

---

## 6. Visual Edge Cases & Accessibility

- **`prefers-reduced-motion`:** Handled globally by `src/css/foundation/motion.css` (`transition-duration: 0.01ms !important; animation-duration: 0.01ms !important;`). Do NOT add redundant `@media (prefers-reduced-motion: reduce)` blocks inside `Modal.svelte`.
- **Focus Ring Visibility:**
  - Global `focus.css` handles `:focus-visible` (`outline: 2px solid var(--cs-color-accent-solid); outline-offset: 2px;`).
  - If `.cs-modal` itself receives programmatic focus (`tabindex="-1"` fallback when no focusable children exist), `:focus:not(:focus-visible)` suppresses mouse-click outlines, while keyboard focus remains cleanly visible outside the `overflow: clip` squircle boundary.
- **Empty Header / Footer:**
  - Because `.cs-modal` uses `display: flex; flex-direction: column; gap: var(--cs-modal-gap);`, omitting `ModalHeader` or `ModalFooter` leaves zero ghost spacing.
  - If `ModalClose` is rendered *without* `ModalHeader`, apply the same `padding-inline-end` clearance to `.cs-modal-body:first-of-type` so the first paragraph never collides with the close button.
- **No Close Button (Blocking Modal):**
  - Omit `ModalClose` when `dismissible={false}`; the header title expands to use the full width (`padding-inline-end: 0`), and backdrop/Escape attempts trigger the `cs-modal-blocked` scale pulse.
