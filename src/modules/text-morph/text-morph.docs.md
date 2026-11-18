---
name: TextMorph
kind: component
import: cs/svelte/text-morph
exports:
    - TextMorph
    - CS_TEXT_MORPH_DUR
    - CS_TEXT_MORPH_EASE
    - TextMorphValue
    - TextMorphSpringParams
    - TextMorphEase
    - TextMorphProps
---

# TextMorph

## Overview

Animated single-line text and inline numeric readout (`<TextMorph />`) built around `torph`'s `MorphController`. Provides `cscripts-ui` motion defaults, polymorphic tag rendering (`as`), locale-aware number formatting, caret-aligned editing (`cursorIndex`), and opt-in `tabular-nums` alignment for buttons, badges, headings, and live status labels.

> **Prerequisite (Optional Peer Dependency):** Consuming apps that import `cs/svelte/text-morph` must install `torph` (`bun add torph`). Apps that do not import `cs/svelte/text-morph` are completely unaffected and incur zero dependency, peer-warning, or bundle cost.

## API

### `TextMorph` Props

Extends `Omit<HTMLAttributes<HTMLElement>, "children">` (forwarded to the outer `<svelte:element this={as}>` root) and renders `.cs-text-morph` wrapping `<span class="cs-text-morph-host">`.

| Prop                      | Type                                                | Required | Default                          | Description                                                                                                  |
| :------------------------ | :-------------------------------------------------- | :------- | :------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `text`                    | `TextMorphValue` (`string \| number`)               | Yes      | —                                | Text or numeric value to format and morph.                                                                   |
| `as`                      | `keyof HTMLElementTagNameMap`                       | No       | `"span"`                         | HTML tag name for the outer `.cs-text-morph` root element (e.g. `"span"`, `"h2"`, `"p"`).                    |
| `locales`                 | `Intl.LocalesArgument`                              | No       | `undefined`                      | Locale(s) mapped to `torph`'s `locale` option for `Intl.Segmenter` and numeric `toLocaleString`.             |
| `decimals`                | `number`                                            | No       | `undefined`                      | Minimum and maximum fraction digits when `text` is a `number`; ignored for strings.                          |
| `cursorIndex`             | `number`                                            | No       | `undefined`                      | Caret index passed to `controller.update(text, cursorIndex)` to align single-number edits around the cursor. |
| `numbers`                 | `boolean`                                           | No       | `true`                           | Enables place-value morphing for numeric words inside text; `false` falls back to character-level morphing.  |
| `scale`                   | `boolean`                                           | No       | `true`                           | Applies subtle `scale(0.95)` transitions to entering/exiting non-numeric segments.                           |
| `tabular`                 | `boolean`                                           | No       | `false`                          | Opt-in `font-variant-numeric: tabular-nums` via `[data-tabular]` on `.cs-text-morph`.                        |
| `animated`                | `boolean`                                           | No       | `true`                           | Enables or disables morph transitions (maps to `torph`'s `disabled: !animated`).                             |
| `respectMotionPreference` | `boolean`                                           | No       | `true`                           | Maps to `torph`'s `respectReducedMotion` to honor `prefers-reduced-motion: reduce` in WAAPI animations.      |
| `duration`                | `number`                                            | No       | `CS_TEXT_MORPH_DUR` (`380`)      | Transition duration in ms (ignored by `torph` when `ease` is a `TextMorphSpringParams` object).              |
| `ease`                    | `TextMorphEase` (`string \| TextMorphSpringParams`) | No       | `CS_TEXT_MORPH_EASE`             | CSS easing string or spring physics config (`{ stiffness, damping, mass, precision }`).                      |
| `debug`                   | `boolean`                                           | No       | `false`                          | Enables `torph` segment debug outlines (`[torph-debug]`) and sets `data-debug`.                              |
| `onanimationsstart`       | `() => void`                                        | No       | `undefined`                      | Callback fired when `torph` transitions start (after initial mount).                                         |
| `onanimationsfinish`      | `() => void`                                        | No       | `undefined`                      | Callback fired when `torph` transitions complete.                                                            |
| `onanimationscancel`      | `() => void`                                        | No       | `undefined`                      | Callback fired when an in-flight `torph` transition is canceled or superseded.                               |
| `ref`                     | `HTMLElement \| null`                               | No       | `null`                           | `$bindable` reference to the outer polymorphic root element.                                                 |

### Timing & Easing Constants

Aligned with `motion.css` (`--cs-dur-380`, `--cs-ease-quint-out`) and `NumberMorph`:

- `CS_TEXT_MORPH_DUR = 380`
- `CS_TEXT_MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"`

### Exported Types

- `TextMorphValue` (`string | number`)
- `TextMorphSpringParams` (`{ stiffness?: number; damping?: number; mass?: number; precision?: number }`)
- `TextMorphEase` (`string | TextMorphSpringParams`)
- `TextMorphProps`

### DOM & Styling Contract

- **Outer root (`.cs-text-morph`):** Polymorphic `<svelte:element this={as}>` carrying `display: inline-flex; align-items: baseline;`, consumer `{...rest}` attributes, `ref`, and `data-*` state attributes:
    - `data-animated` — present (`""`) when `animated` is `true`, omitted when `false`.
    - `data-tabular` — present (`""`) when `tabular` is `true`, omitted when `false`.
    - `data-debug` — present (`""`) when `debug` is `true`, omitted when `false`.
- **Inner host (`.cs-text-morph-host`):** Empty `<span>` owned by `MorphController` (`[torph-root]` is attached here when active). Isolates `torph`'s unlayered `<style data-torph="true">` rules and child DOM mutations from `@layer components.primitive` and Svelte's template reconciler.
- **Direct light-DOM inheritance:** No `--cs-text-morph-*` CSS custom properties are defined; `color`, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, and `text-align` inherit directly from the parent element or classes on `.cs-text-morph`.
- **No `overflow: hidden`:** Do not set `overflow: hidden` on `.cs-text-morph` or `.cs-text-morph-host`; `torph` animates exiting segments (`[torph-exiting]`) absolutely and clipping would cut off motion and ascenders/descenders.
- **Single-line constraint:** `.cs-text-morph-host` enforces `white-space: nowrap; text-align: inherit;` even when `animated={false}` (when `torph` omits `[torph-root]`). Use `TextMorph` for single-line labels, headings, and inline readouts rather than wrapping paragraphs.

## Examples

```svelte
<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { TextInput, TextInputField } from "cs/svelte/text-input";
    import { TextMorph } from "cs/svelte/text-morph";

    let saveLabel = $state("Save changes");
    let status = $state<"Draft" | "In review" | "Published">("Draft");
    let countText = $state("3 of 12 files");
    let metric = $state(1240.5);
    let headline = $state("Ship faster together");

    let editedValue = $state("48290.50");
    let cursorIndex = $state<number | undefined>();

    function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        cursorIndex = event.currentTarget.selectionStart ?? undefined;
        editedValue = event.currentTarget.value;
    }
</script>

<!-- Buttons & Badges (inherits color and baseline alignment) -->
<Button variant="primary" size="md" onclick={() => (saveLabel = "Saved")}>
    <ButtonLabel><TextMorph text={saveLabel} /></ButtonLabel>
</Button>

<Badge variant="dot" color="positive" size="md">
    <BadgeLabel><TextMorph text={status} /></BadgeLabel>
</Badge>

<!-- Mixed text + numeric word morphing and locale formatting -->
<TextMorph text={countText} tabular />

<TextMorph text={metric} decimals={2} locales="de-DE" tabular />

<!-- Caret-aligned editing (update cursorIndex and value together in oninput) -->
<TextMorph text={editedValue} {cursorIndex} tabular class="text-2xl font-semibold" />
<TextInput variant="soft" size="md">
    <TextInputField value={editedValue} oninput={handleInput} aria-label="Amount" />
</TextInput>

<!-- Polymorphic heading & spring easing -->
<TextMorph as="h2" text={headline} class="title-xl" />

<TextMorph as="h2" text={headline} ease={{ stiffness: 220, damping: 22 }} class="title-xl" />
```

## Behavior & Quirks

- **Update `cursorIndex` and `value` together in `oninput`:** When binding an input to `TextMorph`'s `cursorIndex`, use a controlled `value={editedValue}` prop paired with an `oninput` handler that assigns both `cursorIndex` (`event.currentTarget.selectionStart ?? undefined`) and `editedValue` (`event.currentTarget.value`) together. Mixing `bind:value` with `oninput` can let Svelte's `bind:value` listener update `text` first and flush `controller.update(text, cursorIndex)` with the previous, stale `cursorIndex` before your `oninput` handler runs.
- **Accessibility (no duplicate `.sr-only`):** When animations are active, `torph` automatically creates and maintains a single visually-hidden `[torph-sr]` element holding the plain text and marks split `[torph-item]` segments `aria-hidden="true"`. When `animated={false}` or reduced motion is active, `torph` writes plain `textContent` directly. Do not wrap `TextMorph` content in an extra `.sr-only` node, and pass `aria-live="polite"` / `role="status"` via `{...rest}` only when live announcements are desired.
- **Motion & `prefers-reduced-motion`:** Because `torph` animates via WAAPI (`element.animate()`), `motion.css`'s CSS reduced-motion rules do not apply automatically; keep `respectMotionPreference={true}` (default) so `torph` honors `prefers-reduced-motion: reduce`. When `ease` is a `TextMorphSpringParams` object, `torph` solves a `linear(...)` curve from the spring parameters and ignores `duration`.
- **Pure typographic inline primitive:** `TextMorph` intentionally omits `variant` and `size` props and has no surface or border; compose it inside `<Button>` or `<Badge>` or style `.cs-text-morph` directly with typography utilities.
- **`locales` reactivity & empty/zero values:** Pass string or string-array `Intl.LocalesArgument` values (e.g. `"en-US"`, `"de-DE"`) rather than `Intl.Locale` instances so `MorphController.serializeConfig` (`JSON.stringify`) detects dynamic locale changes. Numeric `0` renders `"0"`, while transitioning from non-empty text to `""` inserts `torph`'s zero-width space (`"\u200B"`) placeholder to preserve line height.
