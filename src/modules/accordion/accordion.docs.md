---
name: Accordion
kind: component
import: cs/svelte/accordion
exports:
  - Accordion
  - AccordionItem
  - AccordionHeader
  - AccordionTrigger
  - AccordionContent
  - ACCORDION_VARIANTS
  - ACCORDION_SIZES
  - ACCORDION_HEADER_ELEMENTS
  - AccordionVariant
  - AccordionSize
  - AccordionHeaderElement
  - AccordionBaseProps
  - AccordionSingleProps
  - AccordionMultipleProps
  - AccordionProps
  - AccordionItemProps
  - AccordionHeaderProps
  - AccordionTriggerProps
  - AccordionContentProps
---

# Accordion

## Overview
Compound disclosure list (`<Accordion>`, `<AccordionItem>`, `<AccordionHeader>`, `<AccordionTrigger>`, `<AccordionContent>`) built on `<Collapsible>`. Supports single- and multi-item expansion, three surface variants (`"flush"`, `"elevated"`, `"separated"`), three size scales (`"sm"`, `"md"`, `"lg"`), and WAI-ARIA keyboard navigation.

## API

### `Accordion` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Uses a discriminated union (`AccordionSingleProps<T> | AccordionMultipleProps<T>`) keyed on `multiple`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `AccordionVariant` | Yes | — | Surface variant: `"flush" \| "elevated" \| "separated"`. |
| `size` | `AccordionSize` | Yes | — | Size scale: `"sm" \| "md" \| "lg"`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |
| `multiple` | `boolean` | No | `false` | Allows multiple items open simultaneously; narrows `value` and `onValueChange` to `T[]`. |
| `value` | `T \| T[] \| undefined` | No | `undefined` | `$bindable` active item value (`T \| undefined` when `multiple={false}`, `T[]` when `multiple={true}`). |
| `onValueChange` | `(value: T \| undefined) => void \| (value: T[]) => void` | No | `undefined` | Callback fired when an item is toggled; parameter type narrows based on `multiple`. |
| `collapsible` | `boolean` | No | `false` | Allows closing the active item in single-select mode (`multiple={false}`). Disallowed (`never`) when `multiple={true}`. |
| `disabled` | `boolean` | No | `false` | Disables all items in the accordion. |
| `keepMounted` | `boolean` | No | `true` | Default `keepMounted` passed to `<AccordionContent>` (keeps closed panels in the DOM). |
| `motion` | `CollapsibleMotion` | No | `"slide"` | Default `<Collapsible>` motion preset for `<AccordionContent>`: `"slide" \| "swell" \| "fade" \| "none"`. |
| `animate` | `boolean` | No | `true` | Default animation flag for `<AccordionContent>` and trigger indicator rotation. |
| `loop` | `boolean` | No | `true` | Wraps `ArrowUp` / `ArrowDown` keyboard focus between the first and last enabled triggers. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-accordion`. |
| `children` | `Snippet` | No | `undefined` | `<AccordionItem>` elements. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, "children">` | No | — | Forwarded to the root `<div>`. |

### `AccordionItem` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `T` | Yes | — | Unique identifier matched against `Accordion`'s `value`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the item `<div>`. |
| `disabled` | `boolean` | No | `false` | Disables this item (also disabled when root `Accordion` has `disabled={true}`). |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-accordion-item`. |
| `children` | `Snippet` | No | `undefined` | Item children (`<AccordionHeader>` / `<AccordionTrigger>` and `<AccordionContent>`). |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, "children">` | No | — | Forwarded to the item `<div>`. |

### `AccordionHeader` Props
Extends `HTMLAttributes<HTMLHeadingElement | HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLHeadingElement \| HTMLDivElement \| null` | No | `null` | `$bindable` reference to the header element. |
| `as` | `AccordionHeaderElement` | No | `"h3"` | Rendered tag: `"h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "div"`. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-accordion-header`. |
| `children` | `Snippet` | No | `undefined` | Header content (typically `<AccordionTrigger>`). |
| `...rest` | `HTMLAttributes<HTMLHeadingElement \| HTMLDivElement>` | No | — | Forwarded to the rendered element. |

### `AccordionTrigger` Props
Extends `Omit<HTMLButtonAttributes, "type">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |
| `leading` | `Snippet` | No | `undefined` | Optional leading icon or visual slot rendered inside `.cs-accordion-trigger-leading` (`aria-hidden="true"`). |
| `subtitle` | `string` | No | `undefined` | Optional secondary description rendered below the title inside `.cs-accordion-trigger-subtitle`. |
| `indicator` | `Snippet<[{ open: boolean }]> \| false` | No | `undefined` | Custom indicator snippet receiving `{ open }`, or `false` to omit the default `ChevronDown` icon. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-accordion-trigger`. |
| `children` | `Snippet` | No | `undefined` | Primary trigger label rendered inside `.cs-accordion-trigger-title`. |
| `...rest` | `Omit<HTMLButtonAttributes, "type">` | No | — | Forwarded to the `<button>` (`onclick` and `onkeydown` run before internal handlers). |

### `AccordionContent` Props
Extends `Omit<CollapsibleProps, "open">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the underlying `<Collapsible>` root `<div>`. |
| `padded` | `boolean` | No | `true` | Applies size-scaled padding to `.cs-accordion-content-body`; when `false`, sets `data-flush` to zero out padding. |
| `region` | `boolean` | No | `true` | Sets `role="region"` and `aria-labelledby` on the underlying `<Collapsible>` when `true`. |
| `keepMounted` | `boolean` | No | Inherited (`true`) | Overrides root `Accordion` `keepMounted` for this panel. |
| `motion` | `CollapsibleMotion` | No | Inherited (`"slide"`) | Overrides root `Accordion` `motion` for this panel. |
| `animate` | `boolean` | No | Inherited (`true`) | Overrides root `Accordion` `animate` for this panel. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-accordion-content`. |
| `children` | `Snippet` | No | `undefined` | Panel content rendered inside `.cs-accordion-content-body`. |
| `...rest` | `Omit<CollapsibleProps, "open">` | No | — | Forwarded to `<Collapsible>` (e.g. `collapsedSize`, `fadeMask`, `style`, `ontransitionend`). |

### `data-*` Attributes
- **`Accordion` (`.cs-accordion`)**: `data-variant={variant}`, `data-size={size}`, `data-disabled` (present when `disabled` is `true`).
- **`AccordionItem` (`.cs-accordion-item`)**: `data-open` (present when open), `data-disabled` (present when item or root is disabled), `data-instant` (present on initial mount if starting open, cleared after one `requestAnimationFrame`).
- **`AccordionTrigger` (`.cs-accordion-trigger`)**: `data-open` (present when open), `data-disabled` (present when disabled), `data-instant` (present when `item.instant || !root.animate || root.motion === "none"`).
- **`AccordionContent`**: `.cs-accordion-content` exposes all `<Collapsible>` `data-*` attributes (`data-open`, `data-axis`, `data-motion`, `data-state`, `data-instant`, `data-disabled`, `data-collapsed-size`, `data-fade-mask`). Inner `.cs-accordion-content-body` sets `data-flush` when `padded={false}`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-accordion-bg` | `transparent` (`var(--cs-color-elevated)` on `elevated`) | Root container background. |
| `--cs-accordion-item-bg` | `transparent` (`var(--cs-color-elevated)` on `separated`) | Individual item background. |
| `--cs-accordion-shadow` | `none` (`var(--cs-shadow-elevated)` on `elevated`) | Root container box shadow. |
| `--cs-accordion-item-shadow` | `none` (`var(--cs-shadow-elevated)` on `separated`) | Individual item box shadow. |
| `--cs-accordion-item-shadow-hover` | `var(--cs-shadow-elevated-hover)` | Item hover box shadow in `separated` variant. |
| `--cs-accordion-divider-color` | `var(--cs-color-base-soft-hover)` | Divider color token on `.cs-accordion`. |
| `--cs-accordion-trigger-bg` | `transparent` | Trigger resting background. |
| `--cs-accordion-trigger-bg-hover` | `var(--cs-color-base-soft)` (`transparent` on `separated`) | Trigger hover background. |
| `--cs-accordion-trigger-fg` | `var(--cs-color-text-strong)` | Trigger title text color. |
| `--cs-accordion-subtitle-fg` | `var(--cs-color-text-weak)` | Trigger subtitle text color. |
| `--cs-accordion-indicator-fg` | `var(--cs-color-text-weak)` | Resting color for `leading` and `indicator` slots. |
| `--cs-accordion-indicator-fg-hover` | `var(--cs-color-text-strong)` | Hover/open color for `leading` and `indicator` slots. |
| `--cs-accordion-content-fg` | `var(--cs-color-text-main)` | Content body text color. |
| `--cs-accordion-focus-offset` | `2px` (`-2px` on `elevated` / `separated`) | `:focus-visible` outline offset on triggers. |
| `--cs-accordion-dur-enter` | `var(--cs-dur-200)` | Indicator rotation enter duration. |
| `--cs-accordion-dur-exit` | `var(--cs-dur-exit-md)` | Indicator rotation exit duration. |
| `--cs-accordion-ease-enter` | `var(--cs-ease-quart-out)` | Indicator rotation enter easing. |
| `--cs-accordion-ease-exit` | `var(--cs-ease-exit)` | Indicator rotation exit easing. |
| `--cs-accordion-px` | `12px` / `16px` / `24px` (`sm` / `md` / `lg`) | Horizontal padding for triggers, dividers, and content. |
| `--cs-accordion-trigger-min-height` | `40px` / `48px` / `56px` | Minimum trigger height. |
| `--cs-accordion-trigger-py` | `8px` / `12px` / `16px` | Vertical trigger padding. |
| `--cs-accordion-trigger-gap` | `8px` / `12px` / `14px` | Gap between `leading`, text, and `indicator`. |
| `--cs-accordion-title-size` | `var(--cs-text-sm)` / `var(--cs-text-base)` / `var(--cs-text-lg)` | Trigger title font size. |
| `--cs-accordion-title-lh` | `18px` / `20px` / `23px` | Trigger title line height. |
| `--cs-accordion-subtitle-size` | `var(--cs-text-xs)` / `var(--cs-text-sm)` / `var(--cs-text-sm)` | Trigger subtitle font size. |
| `--cs-accordion-content-size` | `var(--cs-text-sm)` / `var(--cs-text-sm)` / `var(--cs-text-base)` | Content body font size. |
| `--cs-accordion-indicator-size` | `16px` / `18px` / `20px` | Width and height of `leading` and `indicator` SVGs. |
| `--cs-accordion-content-px` | `var(--cs-accordion-px)` (`0px` when `padded={false}`) | Content body horizontal padding. |
| `--cs-accordion-content-pt` | `6px` / `8px` / `10px` (`0px` when `padded={false}`) | Content body top padding. |
| `--cs-accordion-content-pb` | `12px` / `16px` / `20px` (`0px` when `padded={false}`) | Content body bottom padding. |
| `--cs-accordion-gap` | `6px` / `8px` / `12px` | Gap between items in `separated` variant. |
| `--cs-accordion-radius` | `var(--cs-radius-xl)` / `var(--cs-radius-2xl)` / `var(--cs-radius-3xl)` | Container/item corner radius. |
| `--cs-accordion-trigger-radius` | `var(--cs-radius-lg)` / `var(--cs-radius-xl)` / `var(--cs-radius-2xl)` | Trigger corner radius in `flush` variant. |
| `--cs-accordion-squircle` | `var(--cs-squircle-smooth)` / `var(--cs-squircle)` / `var(--cs-squircle)` | `corner-shape` value for `elevated` and `separated`. |

## Examples

### Surface Variants (`flush`, `elevated`, `separated`)
```svelte
<script lang="ts">
    import {
        Accordion,
        AccordionContent,
        AccordionHeader,
        AccordionItem,
        AccordionTrigger,
    } from "cs/svelte/accordion";

    let active = $state<string | undefined>("shipping");
</script>

<Accordion variant="elevated" size="md" bind:value={active} collapsible>
    <AccordionItem value="shipping">
        <AccordionHeader>
            <AccordionTrigger>Shipping &amp; Delivery</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
            Standard orders ship within 2 business days with tracking included.
        </AccordionContent>
    </AccordionItem>

    <AccordionItem value="returns">
        <AccordionHeader>
            <AccordionTrigger>Returns &amp; Exchanges</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
            Unused items can be returned within 30 days of delivery.
        </AccordionContent>
    </AccordionItem>
</Accordion>
```
Swap `variant="elevated"` for `"flush"` (borderless list with rounded triggers) or `"separated"` (individual elevated cards).

### Multiple Expansion & Unpadded Content (`padded={false}`)
```svelte
<script lang="ts">
    import {
        Accordion,
        AccordionContent,
        AccordionHeader,
        AccordionItem,
        AccordionTrigger,
    } from "cs/svelte/accordion";

    let openItems = $state<string[]>(["permissions"]);
</script>

<Accordion variant="separated" size="md" multiple bind:value={openItems}>
    <AccordionItem value="permissions">
        <AccordionHeader>
            <AccordionTrigger>Workspace Permissions</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent padded={false}>
            <div class="border-t border-base-soft px-4 py-3 text-sm">
                Full-bleed custom layout inside the collapsible region.
            </div>
        </AccordionContent>
    </AccordionItem>

    <AccordionItem value="billing">
        <AccordionHeader>
            <AccordionTrigger>Billing History</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
            Invoices are emailed on the first of each month.
        </AccordionContent>
    </AccordionItem>
</Accordion>
```

### Rich Trigger with `leading` & `subtitle`
```svelte
<script lang="ts">
    import { ShieldCheck } from "@lucide/svelte";
    import {
        Accordion,
        AccordionContent,
        AccordionHeader,
        AccordionItem,
        AccordionTrigger,
    } from "cs/svelte/accordion";
</script>

<Accordion variant="flush" size="md" collapsible>
    <AccordionItem value="security">
        <AccordionHeader as="h2">
            <AccordionTrigger subtitle="Two-factor authentication and session limits">
                {#snippet leading()}
                    <ShieldCheck aria-hidden="true" />
                {/snippet}
                Security Settings
            </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
            Require hardware keys or authenticator apps for all workspace members.
        </AccordionContent>
    </AccordionItem>
</Accordion>
```

## Behavior & Quirks
- **Composition on `<Collapsible>`:** `AccordionContent` wraps `<Collapsible>` and places `.cs-accordion-content-body` inside it so padding and text styling live on the inner element (preserving `<Collapsible>`'s `0fr` collapse to `0px`). `AccordionItem` enforces `gap: 0` so collapsed panels add no phantom spacing.
- **Accessibility & `role="region"`:** `AccordionHeader` defaults to `<h3>`, `AccordionTrigger` renders `<button type="button">` with `aria-expanded` and `aria-controls`, and `AccordionContent` sets `role="region"` and `aria-labelledby` on `<Collapsible>` by default. Set `region={false}` on `AccordionContent` when many items are present or region landmarks are not wanted.
- **Keyboard navigation:** `ArrowDown` and `ArrowUp` move focus across enabled triggers in DOM order (wrapping when `loop={true}`), `Home` and `End` jump to the first and last enabled triggers, and `Tab` / `Shift+Tab` follow natural document tab order. Calling `event.preventDefault()` in a custom `onkeydown` or `onclick` handler cancels the built-in trigger behavior.
- **Required `variant` and `size`:** Both `variant` and `size` on `<Accordion>` are required and have no default values.
- **Initial-open instant mount:** Items open on initial mount receive `data-instant` for one animation frame to suppress initial `<Collapsible>` and chevron rotation transitions.
