# Accordion Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (compound disclosure group built directly on top of `<Collapsible>`)
- **Purpose:** A vertically stacked set of interactive headings and disclosure panels that lets users expand and collapse sections individually (`multiple={true}`) or mutually exclusively (`multiple={false}`). Composes `{ Collapsible }` from `src/modules/collapsible/index.ts` for all expand/collapse layout, `inert`, and motion mechanics.
- **Comparison with Sibling Modules:**
  - **`Collapsible`:** Lean single-panel structural primitive with no trigger, surface styling, or group state.
  - **`Card`:** Static surface container sharing the same `sm | md | lg` size scale and `elevated | soft | sunken | transparent` surface vocabulary.
  - **`SegmentedControl` / `CheckboxGroup`:** Value-driven selection groups using `value = $bindable()` + `onValueChange` and typed `createContext()` helpers.
- **Boundaries:**
  - Owns group selection state (single vs. multiple), trigger-to-panel ARIA wiring, WAI-ARIA keyboard navigation across triggers, surface/divider styling, and chevron indicator rotation.
  - **Does not** re-implement `0fr -> 1fr` grid transitions, `inert` toggling, `visibility: hidden` lifecycle, or initial-mount flicker suppression—all of these are delegated to `<Collapsible>`.
  - **Out of scope:** Horizontal accordions, drag-to-reorder items, and virtualized lists.

---

## 2. Public API

### Exports (`src/modules/accordion/index.ts`)

Flat `PascalCase` compound exports (no dot-notation, no `*.internal.*` exports):

- **Components:**
  - `Accordion` — Root container and state/context provider.
  - `AccordionItem` — Individual item wrapper binding an item `value` to root state.
  - `AccordionHeader` — Optional semantic heading wrapper (`h2`–`h6` or `div`) around `AccordionTrigger`.
  - `AccordionTrigger` — Native `<button type="button">` toggle with built-in chevron indicator.
  - `AccordionContent` — Panel wrapper composing `<Collapsible>` with an optional padded inner body.
- **Context Helpers:**
  - `getAccordionContext`, `setAccordionContext`, `hasAccordionContext`, `type AccordionContext`
  - `getAccordionItemContext`, `setAccordionItemContext`, `hasAccordionItemContext`, `type AccordionItemContext`
- **Option Arrays & Types:**
  - `ACCORDION_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const` -> `AccordionVariant`
  - `ACCORDION_SIZES = ["sm", "md", "lg"] as const` -> `AccordionSize`
  - `ACCORDION_HEADER_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "div"] as const` -> `AccordionHeaderElement`
  - `AccordionProps<T extends string = string>`
  - `AccordionItemProps<T extends string = string>`
  - `AccordionHeaderProps`
  - `AccordionTriggerProps`
  - `AccordionContentProps`

### Props

#### `AccordionProps<T extends string = string>` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`)

`variant` and `size` **MUST NOT** have default values—call sites must choose both explicitly.

Selection props form a discriminated union on `multiple`:

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to root `.cs-accordion`. |
| `variant` | `AccordionVariant` | *required* | `"elevated" \| "soft" \| "sunken" \| "transparent"`. |
| `size` | `AccordionSize` | *required* | `"sm" \| "md" \| "lg"`, calibrated proportionally to `Card`. |
| `multiple` | `boolean` | `false` | `false`: single open item (`value?: T`). `true`: multi-open (`value?: T[]`). |
| `value` | `T \| T[] \| undefined` | `undefined` | `$bindable()`, active item value (single) or array of values (multiple). |
| `onValueChange` | `(value: T \| undefined) => void` \| `(value: T[]) => void` | `undefined` | Fires when selection changes via user interaction. |
| `collapsible` | `boolean` | `true` | Single mode only: allows closing the currently open item when clicked again. |
| `separated` | `boolean` | `false` | Renders each `AccordionItem` as a distinct card separated by `--cs-accordion-gap` instead of one unified container. |
| `disabled` | `boolean` | `false` | Disables all items in the accordion. |
| `keepMounted` | `boolean` | `true` | Forwarded to `<Collapsible>` in `AccordionContent`. |
| `motion` | `CollapsibleMotion` | `"slide"` | Forwarded to `<Collapsible>` (`"slide" \| "swell" \| "fade" \| "none"`). |
| `animate` | `boolean` | `true` | Forwarded to `<Collapsible>`. |
| `loop` | `boolean` | `true` | Wraps `ArrowUp` / `ArrowDown` navigation at list boundaries. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-accordion", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted `AccordionItem` children. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to root `.cs-accordion`. |

#### `AccordionItemProps<T extends string = string>` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to `.cs-accordion-item`. |
| `value` | `T` | *required* | Unique item identifier within the parent `Accordion`. |
| `disabled` | `boolean` | `false` | Disables this item independently of root `disabled`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-accordion-item", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted `AccordionHeader` / `AccordionTrigger` and `AccordionContent`. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to `.cs-accordion-item`. |

#### `AccordionHeaderProps` (`extends HTMLAttributes<HTMLHeadingElement | HTMLDivElement>`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLHeadingElement \| HTMLDivElement \| null` | `null` | `$bindable()`, bound to heading element. |
| `as` | `AccordionHeaderElement` | `"h3"` | Semantic heading tag (`"h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "div"`). |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-accordion-header", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted `AccordionTrigger`. |
| `...rest` | `HTMLAttributes<HTMLHeadingElement \| HTMLDivElement>` | — | Forwarded to heading element. |

#### `AccordionTriggerProps` (`extends Omit<HTMLButtonAttributes, "type">`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` | `null` | `$bindable()`, bound to `<button class="cs-accordion-trigger">`. |
| `indicator` | `Snippet<[{ open: boolean }]> \| false` | `undefined` | Custom indicator snippet, or `false` to omit the default chevron. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-accordion-trigger", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Trigger label content. |
| `...rest` | `Omit<HTMLButtonAttributes, "type">` | — | Forwarded to `<button>`; `type="button"` is enforced *after* `{...rest}`. |

#### `AccordionContentProps` (`extends Omit<CollapsibleProps, "open">`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to `<Collapsible>` root `.cs-accordion-content`. |
| `region` | `boolean` | `true` | Applies `role="region"` and `aria-labelledby={triggerId}` when `true`. |
| `unpadded` | `boolean` | `false` | Omits default `.cs-accordion-body` padding for full-bleed content (tables, nested lists). |
| `keepMounted` | `boolean` | *(from root)* | Optional per-panel override of root `keepMounted`. |
| `motion` | `CollapsibleMotion` | *(from root)* | Optional per-panel override of root `motion`. |
| `animate` | `boolean` | *(from root)* | Optional per-panel override of root `animate`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-accordion-content", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Panel body content. |
| `...rest` | `Omit<CollapsibleProps, "open">` | — | Forwarded to `<Collapsible>`. |

### CSS Custom Properties (`--cs-accordion-*`)

| Variable | Purpose |
| :--- | :--- |
| `--cs-accordion-bg` | Container (or separated item) background color. |
| `--cs-accordion-fg` | Base text color. |
| `--cs-accordion-shadow` | Surface elevation shadow (`--cs-shadow-elevated` / `--cs-shadow-sunken` / `none`). |
| `--cs-accordion-radius` | Outer corner radius (size-scaled). |
| `--cs-accordion-squircle` | Superellipse `corner-shape` (`--cs-squircle`). |
| `--cs-accordion-gap` | Gap between items when `separated={true}`. |
| `--cs-accordion-divider` | Hairline divider color between items in unified mode. |
| `--cs-accordion-trigger-padding-x` | Horizontal padding of `AccordionTrigger`. |
| `--cs-accordion-trigger-padding-y` | Vertical padding of `AccordionTrigger`. |
| `--cs-accordion-trigger-size` | Trigger font size (`--cs-text-*`). |
| `--cs-accordion-trigger-bg-hover` | Trigger hover surface highlight. |
| `--cs-accordion-body-padding-x` | Horizontal padding of `.cs-accordion-body`. |
| `--cs-accordion-body-padding-bottom` | Bottom padding of `.cs-accordion-body` (top padding `0` by default for tight visual coupling to trigger). |
| `--cs-accordion-indicator-size` | Chevron icon size (`16px` / `18px` / `20px`). |
| `--cs-accordion-indicator-dur` | Chevron rotation duration (`var(--cs-dur-180)`). |

---

## 3. DOM, Semantics & Accessibility

### DOM Structure & Selectors

```html
<div class="cs-accordion" data-variant={variant} data-size={size} data-separated? data-disabled?>
  <div class="cs-accordion-item" data-open? data-disabled?>
    <!-- Optional <h3 class="cs-accordion-header"> -->
    <button type="button" class="cs-accordion-trigger" id={triggerId} aria-expanded={open} aria-controls={contentId} disabled={disabled} data-open? data-disabled?>
      <span class="cs-accordion-trigger-label">{children}</span>
      <span class="cs-accordion-indicator" aria-hidden="true">...</span>
    </button>
    <!-- </h3 class="cs-accordion-header"> -->
    <Collapsible class="cs-accordion-content" id={contentId} open={open} role={region ? "region" : undefined} aria-labelledby={region ? triggerId : undefined} data-unpadded?>
      <div class="cs-accordion-body">{children}</div>
    </Collapsible>
  </div>
</div>
```

- **Direct-child / scoped selectors:** Styles use `.cs-accordion > .cs-accordion-item` and direct-child combinators where appropriate so nested accordions inherit zero unintended surface, divider, or `[data-open]` styles from ancestors.
- **`AccordionHeader` is optional:** `AccordionTrigger` works both directly inside `AccordionItem` and wrapped inside `AccordionHeader`. `triggerId` and `contentId` are generated via `$props.id()` on `AccordionItem` and shared through `AccordionItemContext` so `aria-controls` and `aria-labelledby` remain valid regardless of mount order or `keepMounted={false}`.

### WAI-ARIA & Keyboard Navigation

- **Tab Sequence:** Unlike `SegmentedControl`, all non-disabled `AccordionTrigger` buttons remain in the natural `Tab` / `Shift+Tab` sequence (no roving `tabindex="-1"`), matching the WAI-ARIA Authoring Practices Guide (APG) Accordion pattern so users can tab directly into focusable controls inside expanded panels and onto subsequent headers.
- **Arrow & Boundary Keys (on `AccordionTrigger`):**
  - `ArrowDown`: Focuses the next non-disabled trigger in the same `Accordion` (wraps to first if `loop={true}`).
  - `ArrowUp`: Focuses the previous non-disabled trigger in the same `Accordion` (wraps to last if `loop={true}`).
  - `Home`: Focuses the first non-disabled trigger in the same `Accordion`.
  - `End`: Focuses the last non-disabled trigger in the same `Accordion`.
  - `Enter` / `Space`: Handled natively by `<button type="button">` `onclick` to toggle the item.
  - All handled navigation keys call `event.preventDefault()` (preventing viewport scroll) and `event.stopPropagation()` (isolating nested accordions).
- **Disabled Semantics:** Native `disabled` on `<button>` + `data-disabled=""` on root/item/trigger/content. Disabled triggers are skipped during `ArrowUp` / `ArrowDown` / `Home` / `End` navigation.

---

## 4. Visual & Motion Contract

- **CSS Layer:** Lives in `@layer components.composite`.
- **Surfaces & Elevation:**
  - Borderless by default (`design-and-tokens.md`), relying on surface contrast and `box-shadow`:
    - `elevated`: `--cs-color-bg-elevated` + `--cs-shadow-elevated`.
    - `soft`: `--cs-color-bg-soft`, no shadow.
    - `sunken`: `--cs-color-bg-sunken` + `--cs-shadow-sunken`.
    - `transparent`: `transparent` background, no shadow.
  - **Unified (`separated={false}`):** Root `.cs-accordion` owns the surface, `--cs-accordion-radius`, `--cs-accordion-squircle`, `overflow: clip`, and shadow; adjacent items are separated by a subtle `1px` `--cs-accordion-divider` (`box-shadow` or `border-block-start` between `.cs-accordion-item + .cs-accordion-item`).
  - **Separated (`separated={true}`):** Root `.cs-accordion` is transparent with `display: flex; flex-direction: column; gap: var(--cs-accordion-gap)`; each `.cs-accordion-item` owns the surface, radius, squircle, and shadow.
- **Proportional `size` Scale (`sm | md | lg`, matching `Card`):**
  - `sm`: Compact triggers (`--cs-text-sm`, ~`36px` min-block-size), `--cs-radius-2xl` outer radius, `16px` chevron.
  - `md`: Standard triggers (`--cs-text-base`, ~`44px` min-block-size), `--cs-radius-3xl` outer radius, `18px` chevron.
  - `lg`: Spacious triggers (`--cs-text-lg`, ~`52px` min-block-size), `28px` outer radius, `20px` chevron.
- **Composition with `<Collapsible>` & Phantom `gap` Avoidance:**
  - `.cs-accordion-item` uses `display: flex; flex-direction: column;` with **`gap: 0`** so a `0px`-tall collapsed `<Collapsible>` never incurs a phantom gap below the trigger.
  - Content spacing lives strictly inside `.cs-accordion-body` (inside `<Collapsible>`), never on `.cs-collapsible` or `.cs-collapsible-inner`. Passing `unpadded` removes `.cs-accordion-body` padding for full-bleed content.
- **Motion:**
  - Panel expand/collapse motion is delegated to `<Collapsible>` (`motion`, `animate`, `keepMounted`).
  - Indicator chevron rotates `0deg -> 180deg` over `--cs-dur-180` with `--cs-ease-cubic-out`.
  - `prefers-reduced-motion: reduce` is inherited globally from `src/css/foundation/motion.css`.

---

## 5. Edge Cases & Constraints

- **Dynamic Items Added / Removed:** `AccordionTrigger` registers its `<button>` element with `AccordionContext` on mount and unregisters on unmount. Navigation order is resolved by sorting registered triggers in DOM order (`Node.compareDocumentPosition`) rather than insertion order, ensuring `{#if}` or keyed `{#each}` insertions at any index navigate predictably.
- **Nested Accordions:** Each `Accordion` instance creates its own `AccordionContext`, and each `AccordionItem` creates its own `AccordionItemContext`. Trigger registration and keyboard `stopPropagation()` are strictly scoped to the nearest `AccordionContext`, and `<Collapsible>` already ignores bubbled `transitionend` events from descendants.
- **SSR & Initial Open Items Without Flicker:** `AccordionItem` derives `open` synchronously from `Accordion`'s initial `value` prop, so `<Collapsible>` receives `open={true}` on initial render/hydration and suppresses entrance transitions via its built-in `mountedInstant` guard.
- **Controlled `value` in Single Mode with `collapsible={false}`:** Clicking an already-open item is a no-op when `multiple={false}` and `collapsible={false}`, and `onValueChange` is not fired.
- **Explicit Non-Goals:** No `info` color variant, no horizontal accordion axis, no virtualized item recycling, and no built-in drag-and-drop reordering.
