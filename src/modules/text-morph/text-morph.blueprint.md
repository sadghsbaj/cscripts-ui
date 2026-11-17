# TextMorph — Architecture & Module Blueprint

## 1. Overview & Scope

- **Module:** `src/modules/text-morph/` (`cs/svelte/text-morph`)
- **Kind:** `component` (thin Svelte 5 wrapper around `torph`'s `MorphController`)
- **Exports:** `TextMorph`, timing/easing constants (`CS_TEXT_MORPH_DURATION`, `CS_TEXT_MORPH_EASE`), and TypeScript types (`TextMorphValue`, `TextMorphEase`, `TextMorphSpringParams`, `TextMorphProps`)
- **Purpose:** Provide a unified `cscripts-ui` entry point for animated text and inline mixed text/number transitions (status labels, headings, button/badge text, dynamic counters in sentences, live readouts) with `cscripts-ui` motion defaults, polymorphism (`as`), `ref` binding, and `tabular-nums` opt-in, while keeping `torph` strictly optional for consuming apps.

### Goal & Rationale

1. **Unified Internal Import Path:** Consuming apps import `TextMorph` from `cs/svelte/text-morph` just like any other `cscripts-ui` module, without direct coupling to third-party package paths.
2. **Out-of-the-Box `cscripts-ui` Ergonomics:** Aligns duration (`380ms`) and easing (`cubic-bezier(0.22, 1, 0.36, 1)`) with `src/css/foundation/motion.css` and `NumberMorph`, unifies `locales` (`Intl.LocalesArgument`) with `NumberMorph`, adds opt-in `tabular` (`tabular-nums`), and exposes Svelte 5 callback props (`onanimationsstart`, `onanimationsfinish`, `onanimationscancel`) and `ref = $bindable(null)`.
3. **Clean Isolation of `torph` DOM Mutations:** Wraps an inner `MorphController` host element inside an outer `.cs-text-morph` element so `torph`'s unlayered `[torph-root]` styles and direct child DOM mutations never collide with `@layer components.primitive` or Svelte's template reconciler.
4. **Zero-Overhead Optionality:** Apps that never import `cs/svelte/text-morph` pay zero bundle size or dependency cost.

### Dependency & Packaging Strategy (`package.json`)

Place `torph` (`^0.1.4`) in **both** `devDependencies` and optional `peerDependencies` (identical to `@number-flow/svelte`):

```json
"devDependencies": {
  "torph": "^0.1.4"
},
"peerDependencies": {
  "torph": "^0.1.4"
},
"peerDependenciesMeta": {
  "torph": {
    "optional": true
  }
}
```

- **Apps that do NOT import `cs/svelte/text-morph`:** Never resolve or bundle `torph` (`./svelte/*` resolves directly to `./src/modules/*/index.ts`) and receive no peer-dependency warnings.
- **Apps that DO import `cs/svelte/text-morph` without `torph` installed:** Vite/Rollup fails only on `cs/svelte/text-morph` imports with a clear bundler resolution error (`Failed to resolve import "torph"`).
- **Inside `cs`:** Having `torph` in `devDependencies` lets `bun run typecheck`, `bun run lint`, `bun run test`, and `TextMorph.preview.svelte` resolve types and run cleanly. No cross-module imports are introduced inside `src/modules/`.

### Boundaries & Non-Goals

- **In Scope:** Wrapping `torph`'s `MorphController` in `TextMorph.svelte`, `.cs-text-morph` / `.cs-text-morph-host` layout and `data-*` hooks, timing constants, TypeScript types, `TextMorph.preview.svelte`, and `TextMorph.svelte.test.ts`.
- **Out of Scope:** Re-implementing `torph`'s segment diffing or WAAPI engine, supporting `children` snippets (incompatible with `torph`'s direct child DOM management), adding `variant`/`size` pill surfaces (compose inside `<Badge>` or `<Button>` instead), multi-line wrapping morphs (`torph` enforces `white-space: nowrap`), or bundling `torph` as a required dependency of `cs`.
- **Deferred in This Phase:** `text-morph.docs.md` is intentionally deferred per user request; preview, unit tests, and this blueprint are in scope for the initial phase.

---

## 2. Public API

### File Layout (`src/modules/text-morph/`)

- `index.ts` — Sole public barrel (exports `TextMorph`, constants, and types).
- `TextMorph.svelte` — Svelte 5 wrapper instantiating `MorphController` on the inner host element.
- `TextMorph.preview.svelte` — Interactive playground preview (word/phrase morphs, numeric word morphs & `decimals`, `cursorIndex`, `tabular`, `as` polymorphism, `animated` / `respectMotionPreference` / `debug` toggles, spring vs. cubic-bezier `ease`).
- `TextMorph.svelte.test.ts` — Vitest + `happy-dom` unit tests.
- `text-morph.blueprint.md` — This module blueprint.
- _(Deferred)_ `text-morph.docs.md` — Deferred for a follow-up phase.

### `index.ts` Exports

```ts
import type { HTMLAttributes } from "svelte/elements";
import type { SpringParams } from "torph";

export { default as TextMorph } from "./TextMorph.svelte";

export const CS_TEXT_MORPH_DURATION = 380;
export const CS_TEXT_MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export type TextMorphValue = string | number;
export type TextMorphSpringParams = SpringParams;
export type TextMorphEase = string | TextMorphSpringParams;
```

### `TextMorphProps`

Extends `Omit<HTMLAttributes<HTMLElement>, "children">` (forwarded to the outer `<svelte:element this={as}>` root) and exposes curated `torph` + `cscripts-ui` props:

| Prop                      | Type                                  | Required | Default                                                   | Notes                                                                                                                   |
| :------------------------ | :------------------------------------ | :------- | :-------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `ref`                     | `HTMLElement \| null`                 | No       | `null`                                                    | `$bindable` reference to the outer root element (`as`).                                                                 |
| `as`                      | `keyof HTMLElementTagNameMap`         | No       | `"span"`                                                  | Polymorphic HTML tag for the outer root element (e.g. `"span"`, `"h2"`, `"p"`, `"strong"`).                             |
| `text`                    | `TextMorphValue` (`string \| number`) | Yes      | —                                                         | Text or numeric value to morph; passed to `controller.update(text, cursorIndex)`.                                       |
| `locales`                 | `Intl.LocalesArgument`                | No       | `undefined`                                               | Unified with `NumberMorph.locales`; maps to `torph`'s `locale` option for `Intl.Segmenter` and `number.toLocaleString`. |
| `decimals`                | `number`                              | No       | `undefined`                                               | Passed to `torph` (`minimumFractionDigits` / `maximumFractionDigits`) when `text` is a `number`; ignored for strings.   |
| `cursorIndex`             | `number`                              | No       | `undefined`                                               | Passed as the second argument to `controller.update(text, cursorIndex)` for caret-aligned single-number editing.        |
| `numbers`                 | `boolean`                             | No       | `true`                                                    | Enables place-value morphing for numeric words inside text; `false` falls back to character-level morphing.             |
| `scale`                   | `boolean`                             | No       | `true`                                                    | Enables subtle scale (`0.95`) on entering/exiting non-numeric segments.                                                 |
| `tabular`                 | `boolean`                             | No       | `false`                                                   | Opt-in `font-variant-numeric: tabular-nums` via `[data-tabular]` on `.cs-text-morph`.                                   |
| `animated`                | `boolean`                             | No       | `true`                                                    | Enables or disables morph transitions; maps to `torph`'s `disabled: !animated` and sets `data-animated`.                |
| `respectMotionPreference` | `boolean`                             | No       | `true`                                                    | Maps 1:1 to `torph`'s `respectReducedMotion` (`prefers-reduced-motion: reduce`).                                        |
| `duration`                | `number`                              | No       | `CS_TEXT_MORPH_DURATION` (`380`)                          | Transition duration in ms (ignored by `torph` when `ease` is a `TextMorphSpringParams` object).                         |
| `ease`                    | `TextMorphEase`                       | No       | `CS_TEXT_MORPH_EASE` (`"cubic-bezier(0.22, 1, 0.36, 1)"`) | CSS easing string or `TextMorphSpringParams` object (`{ stiffness, damping, mass, precision }`).                        |
| `debug`                   | `boolean`                             | No       | `false`                                                   | Enables `torph`'s `[torph-debug]` outlines and sets `data-debug` on the outer root.                                     |
| `onanimationsstart`       | `() => void`                          | No       | `undefined`                                               | Maps to `torph`'s `onAnimationStart` (fires on transitions after initial render).                                       |
| `onanimationsfinish`      | `() => void`                          | No       | `undefined`                                               | Maps to `torph`'s `onAnimationComplete`.                                                                                |
| `onanimationscancel`      | `() => void`                          | No       | `undefined`                                               | Maps to `torph`'s `onAnimationCancel`.                                                                                  |

#### Deliberate Exception to `variant` / `size` Rule

Per `.agents/rules/architecture-and-apis.md`, `variant` and `size` must not have default values when present. Like `NumberMorph`, `TextMorph` is a **pure typographic inline primitive** rather than a surfaced control: it inherits `font-size`, `font-weight`, `line-height`, `letter-spacing`, and `color` directly from its surrounding element (`<h1>`, `<p>`, `<Badge>`, `<Button>`). Therefore, `TextMorph` intentionally omits `variant` and `size` props.

### CSS Custom Properties (`--cs-text-morph-*`)

No `--cs-text-morph-*` CSS custom properties are defined initially. Unlike `NumberMorph` (which crosses a Shadow DOM boundary and needs CSS variables for `::part(prefix)`/`::part(suffix)` and shadow masks), `TextMorph` renders in light DOM so typography, `color`, `letter-spacing`, and inherited CSS properties flow naturally from parent elements or classes on `.cs-text-morph`.

---

## 3. DOM, Semantics & Accessibility

### DOM Structure

`TextMorph.svelte` renders an outer polymorphic container wrapping an empty inner `<span>` dedicated to `MorphController`:

```svelte
<svelte:element
    this={as}
    bind:this={ref}
    {...rest}
    class={["cs-text-morph", className]}
    data-animated={animated ? "" : undefined}
    data-tabular={tabular ? "" : undefined}
    data-debug={debug ? "" : undefined}
>
    <span class="cs-text-morph-host" bind:this={morphEl}></span>
</svelte:element>
```

**Why outer wrapper + inner `.cs-text-morph-host`?**

1. **CSS Layer Isolation:** `torph` injects an unlayered `<style data-torph="true">` targeting `[torph-root]`. Keeping `[torph-root]` on the inner `.cs-text-morph-host` prevents unlayered `torph` rules (`display: inline-block; vertical-align: top; will-change: width, height;`) from colliding with `@layer components.primitive` styles or consumer utility classes on `.cs-text-morph`.
2. **Clean `ref`, `as`, and `{...rest}` Ownership:** Consumers bind `ref` to the outer `<svelte:element this={as}>` and pass `id`, `class`, `style`, `data-*`, ARIA attributes, or `{@attach ...}` without `torph` mutating or clearing attributes/children on the root element.
3. **Svelte Reconciler Safety:** Leaving `.cs-text-morph-host` completely empty of Svelte template children ensures `torph` owns 100% of its child DOM nodes (`[torph-sr]`, `[torph-item]`, `[torph-exiting]`, `textContent` when disabled) without conflicting with Svelte's keyed/text-node tracking.

### `data-*` Attributes & Selectors

- `.cs-text-morph` — Outer polymorphic root element.
- `.cs-text-morph-host` — Inner `MorphController` target element (`[torph-root]` is added/removed by `torph` when animations are active).
- `data-animated` — Present (`""`) when `animated` is `true`, omitted when `false`.
- `data-tabular` — Present (`""`) when `tabular` is `true`, omitted when `false`.
- `data-debug` — Present (`""`) when `debug` is `true`, omitted when `false`.

### Accessibility

- **No Duplicate Screen-Reader Node:** Verified in `torph@0.1.4` (`TextMorph.syncAccessibleText`): when animations are enabled, `torph` prepends and maintains `<span torph-sr>` inside the `MorphController` host with visually-hidden CSS (`position: absolute; width: 1px; height: 1px; clip-path: inset(50%); ...`) holding the plain text string, and sets `aria-hidden="true"` on every split `[torph-item]` segment. When `animated={false}` or reduced motion is active, `torph` sets `element.textContent` directly as plain text.
- **Constraint:** `TextMorph.svelte` MUST NOT render an additional `.sr-only` span, which would cause assistive technologies to announce every label twice.
- **Live Regions & Semantics:** Consumers opt into live announcements (`aria-live="polite"`, `role="status"`, `aria-atomic="true"`) or heading/paragraph semantics (`as="h2"`, `as="p"`) via props and `{...rest}` on the outer root; live-region attributes are not forced by default so frequent updates do not spam screen readers.

### Keyboard Navigation & Focus Behavior

`TextMorph` is a non-interactive display primitive (`<span>` by default) and is not focusable by default. When composed inside interactive controls (`<Button>`, `<a>`, `<summary>`), keyboard and focus behavior remain entirely owned by the outer interactive element.

---

## 4. Visual & Motion Contract

### CSS Architecture & Layering

Styles live in `@layer components.primitive`:

```css
@layer components.primitive {
    .cs-text-morph {
        display: inline-flex;
        align-items: baseline;

        &[data-tabular] {
            font-variant-numeric: tabular-nums;
        }
    }

    .cs-text-morph-host {
        text-align: inherit;
        white-space: nowrap;
    }
}
```

- **No `overflow: hidden`:** `.cs-text-morph` MUST NOT clip overflow; `torph` positions exiting characters (`[torph-exiting]`) absolutely and uses `clip-path` / vertical fade masks on numeric slot columns (`[torph-slot]`). Adding `overflow: hidden` on `.cs-text-morph` would clip character motion and ascenders/descenders.
- **Baseline Alignment:** `display: inline-flex; align-items: baseline;` keeps `.cs-text-morph` aligned with adjacent text and icons inside buttons, badges, and headings while cleanly containing `.cs-text-morph-host` even as `torph` animates its `width` and `height`. Because `.cs-text-morph-host` is a flex item, `torph`'s `vertical-align: top` on `[torph-root]` does not disrupt baseline alignment.
- **`tabular` Opt-In:** Unlike `NumberMorph` (where `tabular-nums` is always on for numeric columns), `TextMorph` defaults `tabular = false` so proportional prose/labels retain natural kerning (`1` and `i` don't gain awkward spacing). Consumers enable `tabular` when rendering tabular counters or mixed numeric readouts.
- **Surface, Elevation & Squircle Usage:** None—`TextMorph` is surface-less and borderless, inheriting `color` and typography from its host surface (whether `canvas`, `elevated`, `sunken`, or chromatic `-solid`/`-soft` surfaces). No `--cs-shadow-solid` or `corner-shape` applies.
- **Proportional `size` Expectations:** Because `TextMorph` inherits `font-size` and `line-height` directly from its parent context, it scales proportionally with any sibling `cscripts-ui` control (`xs..xl` buttons, badges, headings) without maintaining a separate `size` scale.

### Motion Contract (`motion.css` Alignment)

`torph` drives transitions via WAAPI (`element.animate(...)`) using JS `duration` (number) and `ease` (CSS easing string or `SpringParams`) options rather than CSS custom properties. `TextMorph` replaces `torph`'s built-in defaults (`400ms`, `"cubic-bezier(0.19, 1, 0.22, 1)"`) with `cscripts-ui` tokens from `src/css/foundation/motion.css`:

| Parameter  | `torph` Default                    | `cscripts-ui` Default (`motion.css` mapping)                                    | Rationale                                                                                                  |
| :--------- | :--------------------------------- | :------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------- |
| `duration` | `400` (`400ms`)                    | `CS_TEXT_MORPH_DURATION = 380` (`--cs-dur-380` / `--cs-dur-enter-md`)           | Matches `NumberMorph`'s `380ms` spatial transform timing so text and numbers settle in sync.               |
| `ease`     | `"cubic-bezier(0.19, 1, 0.22, 1)"` | `CS_TEXT_MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"` (`--cs-ease-quint-out`) | Matches `NumberMorph` and `motion.css` (`--cs-ease-quint-out`) for crisp deceleration with zero overshoot. |

- **Spring Physics Support:** Passing `ease={{ stiffness, damping, mass, precision }}` (`TextMorphSpringParams`) delegates to `torph`'s `linear(...)` spring solver (which derives its own settling duration and ignores `duration`, matching `torph`'s contract).
- **`prefers-reduced-motion`:** `motion.css`'s global `@media (prefers-reduced-motion: reduce)` rule neutralizes CSS transitions/animations, not WAAPI `element.animate()` calls. Keeping `respectMotionPreference = true` delegates reduced-motion detection to `torph`'s internal `matchMedia("(prefers-reduced-motion: reduce)")` listener (`respectReducedMotion`).

---

## 5. Edge Cases & Constraints

### Single-Line Constraint & Layout Considerations

- `[torph-root]` enforces `white-space: nowrap;`, and `.cs-text-morph-host` preserves `white-space: nowrap; text-align: inherit;` even when `animated={false}` (when `torph` skips `setup()` and omits `[torph-root]`). `TextMorph` is designed strictly for single-line labels, headings, and inline phrases—do not use it for wrapping multi-line paragraphs.
- `torph` supports explicit `\n` newlines via `<br>` segments when passed in `text`, though typical `cscripts-ui` usage is single-line inline text.
- Because `TextMorph` is a non-interactive inline text primitive, `<HitArea />` does not apply.

### Unlayered `<style data-torph="true">` Injection

- On `setup()` (skipped when `disabled` or reduced motion is active), `torph` appends a reference-counted `<style data-torph="true">` element to `document.head` containing `[torph-root]`, `[torph-item]`, `[torph-sr]`, `[torph-slot]`, and `[torph-debug]` rules, and removes it when the last active `TextMorph` instance is destroyed.
- Placing `[torph-root]` on the inner `.cs-text-morph-host` keeps these unlayered styles isolated from `.cs-text-morph` in `@layer components.primitive`.

### `MorphController` Lifecycle & Effect Stability

- **Declaration Order of `$effect`s:** Declare the `controller.attach(...)` `$effect` _before_ the `controller.update(text, cursorIndex)` `$effect` so initial mount attaches the controller before updating `text`.
- **Callback Identity Stability:** `torph`'s `MorphController.serializeConfig` hashes `{ ease, duration, locale, scale, numbers, decimals, debug, disabled, respectReducedMotion }` and excludes callbacks (`onAnimationStart`, `onAnimationComplete`, `onAnimationCancel`). Wrapping callbacks (`() => onanimationsstart?.()`, etc.) and tracking `configKey` (plus `morphEl`) inside the attach `$effect` avoids tearing down and recreating `TextMorph` when consumers pass inline arrow functions, while still always invoking the latest callback prop.
- **`locales` Serialization Note:** `MorphController.serializeConfig` uses `JSON.stringify`. Standard BCP 47 strings/arrays (e.g. `"de-DE"`, `["de-DE", "en-US"]`) serialize deterministically; passing `Intl.Locale` instances directly serializes as `"{}"` via `JSON.stringify`, so consumers should pass string/string-array `Intl.LocalesArgument` values when changing locales dynamically.
- **Empty String (`""`) & Zero (`0`):** `MorphController.attach` replays `lastText` when `lastText !== ""` (so `0` replays correctly because `0 !== ""`). Transitioning from non-empty text to `""` renders a zero-width space (`"\u200B"`) placeholder in `torph` to preserve vertical line height during exit.

### SSR & Hydration

- Like `torph`'s own Svelte wrapper, `MorphController` attaches inside client-side `$effect`. SSR renders `<span class="cs-text-morph"><span class="cs-text-morph-host"></span></span>` without reading `window`, `document`, or `getComputedStyle` at module top-level or during server render, and hydrates cleanly on mount.

### Vitest & `happy-dom` Caveats

`vitest.config.ts` runs with `environment: "happy-dom"`:

1. **WAAPI & `getAnimations` Stubs:** `torph` calls both `element.animate(...)` (reading/writing `anim.currentTime`, assigning `anim.onfinish`, and calling `anim.cancel()`) and `element.getAnimations()`. Unit tests in `TextMorph.svelte.test.ts` must stub both `Element.prototype.animate` (returning `{ currentTime: 0, onfinish: null, cancel() {}, finish() {}, finished: Promise.resolve() }`) and `Element.prototype.getAnimations` (returning `[]`) if missing/incomplete in `happy-dom`.
2. **Zero-Dimension `getBoundingClientRect` / `getComputedStyle`:** Because `happy-dom` reports `0` layout dimensions, `torph`'s root width/height transition helper treats `prevWidth === 0 || prevHeight === 0` as immediate cancellation (`onAnimationCancel`) rather than running `onfinish`. Unit tests asserting DOM text, `[torph-sr]` accessible text, `[torph-item]` segments, `data-*` attributes, and `ref`/`as` polymorphism work directly; testing `onanimationsfinish` in `happy-dom` requires mocking non-zero `getBoundingClientRect` / `getComputedStyle` dimensions, while visual morphing is verified in the playground / Playwright.
3. **Asserting Rendered Text:** When `animated` is `true`, `morphEl.textContent` includes **both** the `[torph-sr]` plain text node and split `[torph-item]` nodes (doubling `element.textContent`). Unit tests should assert against `[torph-sr]` (for accessible text) or non-exiting `[torph-item]` children rather than raw `host.textContent` when `animated` is enabled; when `animated={false}`, `morphEl.textContent` holds the plain text directly.

### Browser Support Notes

- Targets modern Chromium-first (`1lh`, `round(up, ..., 1px)`, `mask-clip: no-clip`, `linear()` springs, `Intl.Segmenter`) with graceful progressive enhancement built into `torph` (falls back cleanly when `1lh`, `round()`, `mask-clip`, or `Intl.Segmenter` are absent).

### Concrete Implementation Plan

1. **Step 1 — `package.json`:**
    - Add `"torph": "^0.1.4"` to `devDependencies`, `peerDependencies`, and `peerDependenciesMeta` (`optional: true`), and run `bun install` if needed.
2. **Step 2 — Core Module (`src/modules/text-morph/`):**
    - Create `index.ts` exporting `TextMorph`, `CS_TEXT_MORPH_DURATION`, `CS_TEXT_MORPH_EASE`, and types (`TextMorphValue`, `TextMorphEase`, `TextMorphSpringParams`, `TextMorphProps`).
    - Create `TextMorph.svelte` with `<svelte:element this={as} bind:this={ref} ...>`, `<span class="cs-text-morph-host" bind:this={morphEl}></span>`, `MorphController` attach/update `$effect`s, `locales -> locale` / `animated -> !disabled` / `respectMotionPreference -> respectReducedMotion` / `onanimations* -> onAnimation*` mappings, and `@layer components.primitive` styles.
3. **Step 3 — Unit Tests (`TextMorph.svelte.test.ts`):**
    - Stub `Element.prototype.animate` and `Element.prototype.getAnimations` in `beforeEach`.
    - Test rendering, `ref` binding, `as` polymorphism, `{...rest}` forwarding, `data-animated` / `data-tabular` / `data-debug` attributes, `text` updates (strings & numbers with `decimals` / `locales`), `animated={false}` plain-text mode, single `[torph-sr]` (no duplicate SR text), and controller cleanup on unmount.
4. **Step 4 — Playground Preview (`TextMorph.preview.svelte`):**
    - Demonstrate phrase morphing, mixed text + numeric word morphing (`decimals`, `locales`), `cursorIndex` caret-aligned updates, `tabular` toggle, `as` heading/inline polymorphism, `animated` / `respectMotionPreference` / `debug` toggles, and cubic-bezier vs. spring `ease`.
    - Verify with `bun run typecheck`, `bun run lint`, and `bun run test`.
