# NumberMorph — Architecture & Module Blueprint

## 1. Overview & Scope

- **Module:** `src/modules/number-morph/` (`cs/svelte/number-morph`)
- **Kind:** `component` (thin Svelte 5 wrapper around `@number-flow/svelte`)
- **Exports:** `NumberMorph`, `NumberMorphGroup`, timing constants, and TypeScript types (`NumberMorphProps`, `NumberMorphGroupProps`, `NumberMorphDigits`, `NumberMorphValue`, `NumberMorphFormat`, `NumberMorphTrend`)
- **Purpose:** Provide a unified `cscripts-ui` entry point for animated numeric transitions (counts, currency, percentages, KPI readouts, timers) with `cscripts-ui` typographic/motion defaults and token hooks, while keeping `@number-flow/svelte` strictly optional for consuming apps.

### Goal & Rationale

1. **Unified Internal Import Path:** Consuming apps import `NumberMorph` and `NumberMorphGroup` from `cs/svelte/number-morph` just like any other `cscripts-ui` module, avoiding direct coupling to third-party package paths across app codebases.
2. **Out-of-the-Box Ergonomics:** Applies `cscripts-ui` defaults automatically—`font-variant-numeric: tabular-nums` (preventing horizontal jitter during digit spins), `--cs-number-morph-*` CSS custom property hooks, `currentColor` affix inheritance, ergonomic `continuous?: boolean` mapping to `@number-flow/svelte`'s `continuous` plugin, and JS `EffectTiming` defaults aligned with `src/css/foundation/motion.css`.
3. **Zero-Overhead Optionality:** Apps that never import `cs/svelte/number-morph` pay zero bundle size, custom-element registration, or dependency cost.

### Boundaries & Non-Goals

- **In Scope:** Wrapping `@number-flow/svelte` (`NumberFlow` and `NumberFlowGroup`) with `cscripts-ui` props, `ref` binding, `.cs-number-morph` / `.cs-number-morph-group` styling hooks, docs, preview, and unit tests.
- **Out of Scope:** Re-implementing NumberFlow's digit-column diffing/animation engine, adding `variant`/`color`/`size` pill surfaces (compose inside `<Badge>` or `<Button>` instead), or bundling `@number-flow/svelte` as a required runtime dependency of `cs`.

---

## 2. Dependency & Packaging Strategy

### `package.json` Placement

Place `@number-flow/svelte` (`^0.4.2`) in **both** `devDependencies` and optional `peerDependencies` (mirroring the existing `eslint` pattern in `package.json`):

```json
"devDependencies": {
  "@number-flow/svelte": "^0.4.2"
},
"peerDependencies": {
  "@number-flow/svelte": "^0.4.2",
  "eslint": ">=10"
},
"peerDependenciesMeta": {
  "@number-flow/svelte": {
    "optional": true
  },
  "eslint": {
    "optional": true
  }
}
```

### Behavior in Consuming Apps

- **Apps that do NOT import `cs/svelte/number-morph`:**
  - Never resolve or bundle `@number-flow/svelte` (since `./svelte/*` resolves directly to `./src/modules/*/index.ts`).
  - No peer-dependency install warnings (due to `peerDependenciesMeta.optional: true`).
- **Apps that DO import `cs/svelte/number-morph` without installing `@number-flow/svelte`:**
  - Vite/Rollup attempts to resolve `@number-flow/svelte` only when `cs/svelte/number-morph` is imported, producing a clear bundler resolution error (`Failed to resolve import "@number-flow/svelte"`).
- **Documentation Prerequisite:**
  - `number-morph.docs.md` must clearly document `bun add @number-flow/svelte` as a required installation step before importing `cs/svelte/number-morph`.

### Tooling Considerations (`vite`, `vitest`, `svelte-check`)

- **Vite (`optimizeDeps` / SSR):** `@number-flow/svelte` ships Svelte component source (`.svelte`) and registers a browser custom element (`<number-flow-svelte>`). `@sveltejs/vite-plugin-svelte` processes Svelte dependencies automatically; if a consuming app encounters pre-bundling issues with `number-flow`, `optimizeDeps.exclude: ["@number-flow/svelte"]` is the standard escape hatch.
- **`svelte-check` / `tsc`:** Having `@number-flow/svelte` in `devDependencies` ensures `bun run typecheck`, `bun run lint`, `bun run test`, and `NumberMorph.preview.svelte` in the playground all resolve types and run cleanly inside `cs`.

---

## 3. Public API

### File Layout (`src/modules/number-morph/`)

- `index.ts` — Sole public barrel (exports `NumberMorph`, `NumberMorphGroup`, timing constants, and TypeScript types).
- `NumberMorph.svelte` — Main wrapper around `NumberFlow`.
- `NumberMorphGroup.svelte` — Wrapper around `NumberFlowGroup` for synchronized layout transitions across sibling `NumberMorph` instances.
- `number-morph.docs.md` — Module documentation including `bun add @number-flow/svelte` prerequisite.
- `NumberMorph.preview.svelte` — Interactive playground preview (counters, currency/locale formatting, compact notation, `continuous` mode, `NumberMorphGroup` layout sync, trend direction, reduced motion).
- `NumberMorph.svelte.test.ts` — Vitest + `happy-dom` unit tests.

### `index.ts` Exports

```ts
import type { Format, Trend, Value } from "@number-flow/svelte";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as NumberMorph } from "./NumberMorph.svelte";
export { default as NumberMorphGroup } from "./NumberMorphGroup.svelte";

export type NumberMorphValue = Value;
export type NumberMorphFormat = Format;
export type NumberMorphTrend = Trend;
export type NumberMorphDigits = Record<number, { max?: number }>;

export const CS_NUMBER_MORPH_TRANSFORM_TIMING: EffectTiming = {
    duration: 380,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export const CS_NUMBER_MORPH_SPIN_TIMING: EffectTiming = {
    duration: 380,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export const CS_NUMBER_MORPH_OPACITY_TIMING: EffectTiming = {
    duration: 160,
    easing: "cubic-bezier(0.5, 1, 0.89, 1)",
};
```

### `NumberMorphProps`

Extends `HTMLAttributes<HTMLSpanElement>` (forwarded to the root `<span class="cs-number-morph">`) and exposes curated `@number-flow/svelte` props:

| Prop | Type | Required | Default | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the root `<span>` wrapper. |
| `value` | `NumberMorphValue` (`number \| string`) | Yes | — | Numeric value to format and animate. |
| `locales` | `Intl.LocalesArgument` | No | `undefined` | Passed to `Intl.NumberFormat`. |
| `format` | `NumberMorphFormat` | No | `undefined` | `Intl.NumberFormatOptions` (excluding unsupported `scientific` / `engineering` notations). |
| `prefix` | `string` | No | `undefined` | Static prefix rendered before the number. |
| `suffix` | `string` | No | `undefined` | Static suffix rendered after the number. |
| `trend` | `NumberMorphTrend` (`number \| ((oldValue: number, value: number) => number)`) | No | `undefined` | Controls digit roll direction (`1` = up, `-1` = down, `0` = auto/shortest; defaults to `Math.sign(value - oldValue)` in NumberFlow). |
| `animated` | `boolean` | No | `true` | Enables or disables digit transitions. |
| `digits` | `NumberMorphDigits` | No | `undefined` | Per-place digit constraints (e.g., `{ 1: { max: 5 } }` for `mm:ss` clocks). |
| `continuous` | `boolean` | No | `false` | Ergonomic boolean mapped internally to `plugins={continuous ? [continuousPlugin] : undefined}` so digits roll through intermediate values. |
| `willChange` | `boolean` | No | `false` | Hints `will-change` on animated layers for heavy updates. |
| `respectMotionPreference` | `boolean` | No | `true` | Respects `prefers-reduced-motion: reduce` inside WAAPI animations. |
| `transformTiming` | `EffectTiming` | No | `CS_NUMBER_MORPH_TRANSFORM_TIMING` | WAAPI timing for horizontal/width layout shifts. |
| `spinTiming` | `EffectTiming` | No | `CS_NUMBER_MORPH_SPIN_TIMING` | WAAPI timing for vertical digit column spins. |
| `opacityTiming` | `EffectTiming` | No | `CS_NUMBER_MORPH_OPACITY_TIMING` | WAAPI timing for entering/exiting digit/symbol fade. |
| `onanimationsstart` | `() => void` | No | `undefined` | Callback when NumberFlow animations start. |
| `onanimationsfinish` | `() => void` | No | `undefined` | Callback when NumberFlow animations finish. |

#### `continuous` Plugin Mapping

In `@number-flow/svelte@0.4.2`, `continuous` is exported as a `Plugin` (`import { continuous as continuousPlugin } from "@number-flow/svelte"`), **not** as a boolean prop on `<NumberFlow>`. `NumberMorph` abstracts this away so consumers pass a simple `continuous?: boolean` prop, and `NumberMorph.svelte` derives:

```ts
const plugins = $derived(continuous ? [continuousPlugin] : undefined);
```

#### Event Wiring (`onanimationsstart` / `onanimationsfinish`)

`@number-flow/svelte@0.4.2` is authored as a Svelte 4 component that forwards `animationsstart` and `animationsfinish` DOM events from `<number-flow-svelte>` (and exposes `bind:el` for the custom element instance). `NumberMorph.svelte` wires `onanimationsstart` and `onanimationsfinish` cleanly onto the `<number-flow-svelte>` element (via `el` `addEventListener` inside `$effect` with cleanup, or Svelte event forwarding) so consumers use standard Svelte 5 lowercase callback props without needing `on:animationsstart`.

#### Deliberate Exception to `variant` / `size` Rule

Per `.agents/rules/architecture-and-apis.md`, `variant` and `size` must not have default values when present. `NumberMorph` is a **pure typographic inline primitive** (not a surfaced control like `Button` or `Badge`): it inherits `font-size`, `font-weight`, `line-height`, and `color` from whatever heading, KPI card, `<Badge>`, or `<Button>` hosts it. Therefore, `NumberMorph` intentionally omits `variant` and `size` props.

### `NumberMorphGroupProps`

Extends `HTMLAttributes<HTMLSpanElement>` for `<span class="cs-number-morph-group">`:

| Prop | Type | Required | Default | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the root `<span>` wrapper. |
| `children` | `Snippet` | No | `undefined` | Descendant `NumberMorph` instances and sibling inline content. |

### CSS Custom Properties (`--cs-number-morph-*`)

`NumberMorph` exposes `cscripts-ui` module variables on `.cs-number-morph`:

- `--cs-number-morph-char-height` (default `1em`) → `--number-flow-char-height`
- `--cs-number-morph-mask-height` (default `0.25em`) → `--number-flow-mask-height`
- `--cs-number-morph-mask-width` (default `0.5em`) → `--number-flow-mask-width`
- `--cs-number-morph-affix-fg` (default `currentColor`) → applied to `:global(::part(prefix))` and `:global(::part(suffix))`

---

## 4. DOM, Semantics & Accessibility

### `NumberMorph` DOM Structure

```svelte
<span
    bind:this={ref}
    {...rest}
    class={["cs-number-morph", className]}
    data-animated={animated ? "" : undefined}
    data-continuous={continuous ? "" : undefined}
>
    <NumberFlow ... />
</span>
```

**Why wrap `<NumberFlow>` in `<span class="cs-number-morph">`?**
1. Guarantees `ref = $bindable<HTMLSpanElement | null>()` works reliably with `bind:this={ref}` without depending on `@number-flow/svelte`'s internal `el` prop.
2. Guarantees `{...rest}` (custom classes, `id`, `data-*`, inline styles, `{@attach ...}`) forwards cleanly to a standard HTML element.
3. Provides a scoped `.cs-number-morph` anchor for `tabular-nums`, CSS custom properties, and `:global(::part(...))` styling.

### `NumberMorphGroup` Architecture

`@number-flow/svelte`'s `NumberFlowGroup` renders **no DOM element**—it creates a Svelte context (`setGroupContext`) that registers descendant `NumberFlow` instances, calls `willUpdate()` before DOM updates and `didUpdate()` after `tick()` so sibling numbers and adjacent text shift smoothly in lockstep.

`NumberMorphGroup.svelte` wraps `<NumberFlowGroup>` in a real `<span>` container:

```svelte
<span bind:this={ref} {...rest} class={["cs-number-morph-group", className]}>
    <NumberFlowGroup>
        {@render children?.()}
    </NumberFlowGroup>
</span>
```

**Why `display: inline-flex; align-items: baseline;` on `.cs-number-morph-group` (instead of `display: contents`)?**
- `display: contents` removes the element's CSS box, which breaks `ref.getBoundingClientRect()` / `offsetWidth`, ignores `gap` / `padding` / `border`, and can introduce accessibility-tree quirks.
- `display: inline-flex; align-items: baseline;` preserves a real layout box so `ref`, `{...rest}`, `gap`, and baseline alignment across sibling `NumberMorph` instances and labels work predictably out of the box. Consumers who need transparent grid-cell participation can override with `class="contents"` or `style="display: contents"`.

### Accessibility

- `@number-flow/svelte` sets `role="img"` and `aria-label={valueAsString}` via `ElementInternals` on `<number-flow-svelte>` while hiding internal rolling digit columns from assistive technologies, preventing screen readers from announcing intermediate spinning digits.
- Consumers can pass `aria-label`, `aria-live="polite"`, or `role="status"` via `{...rest}` on `NumberMorph` when live-region announcements are desired (not forced by default, so high-frequency counters/timers do not spam screen readers).

---

## 5. Shadow DOM, Visual & Motion Contract

### Shadow DOM Boundary & CSS

`@number-flow/svelte` renders a `<number-flow-svelte>` Web Component backed by an open Shadow Root:

- **Crosses Shadow DOM naturally (inherited CSS):** `color`, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `font-variant-numeric` (`tabular-nums`), `text-align`, `user-select`, and CSS custom properties.
- **Affix Color (`::part(prefix)` / `::part(suffix)`):** Inherits `currentColor` by default so `NumberMorph` remains legible inside `<Badge variant="solid">`, `<Button>`, and colored headings, while exposing `--cs-number-morph-affix-fg` for optional dimming (e.g. `--cs-number-morph-affix-fg: var(--cs-color-text-weak)`).

```css
@layer components.primitive {
    .cs-number-morph {
        display: inline-flex;
        align-items: baseline;
        font-variant-numeric: tabular-nums;
        --number-flow-char-height: var(--cs-number-morph-char-height, 1em);
        --number-flow-mask-height: var(--cs-number-morph-mask-height, 0.25em);
        --number-flow-mask-width: var(--cs-number-morph-mask-width, 0.5em);

        & :global(::part(prefix)),
        & :global(::part(suffix)) {
            color: var(--cs-number-morph-affix-fg, currentColor);
        }
    }

    .cs-number-morph-group {
        display: inline-flex;
        align-items: baseline;
    }
}
```

### Motion Contract: `motion.css` Alignment vs. NumberFlow Defaults

`src/css/foundation/motion.css` defines motion tokens as CSS custom properties, whereas NumberFlow drives animations via the **Web Animations API (`element.animate(...)`)** using JS `EffectTiming` objects (`transformTiming`, `spinTiming`, `opacityTiming`). Because CSS variables cannot be passed directly into `element.animate()`, `NumberMorph` exports JS `EffectTiming` defaults mapped directly from `motion.css`:

| Timing | NumberFlow Built-in Default | `cscripts-ui` Default (`motion.css` mapping) | Rationale |
| :--- | :--- | :--- | :--- |
| `transformTiming` | `900ms`, critically-damped `linear(...)` | `380ms` (`--cs-dur-380` / `--cs-dur-enter-md`), `cubic-bezier(0.22, 1, 0.36, 1)` (`--cs-ease-quint-out`) | NumberFlow's `900ms` default feels overly sluggish next to `cscripts-ui`'s snappy UI transitions. `380ms` + `--cs-ease-quint-out` settles horizontal width/position shifts briskly with zero overshoot. |
| `spinTiming` | Falls back to `transformTiming` (`900ms`) | `380ms` (`--cs-dur-380`), `cubic-bezier(0.22, 1, 0.36, 1)` (`--cs-ease-quint-out`) | Keeps vertical digit wheel rolls synchronized with horizontal layout shifts and avoids spring overshoot peeking into adjacent digits. |
| `opacityTiming` | `450ms`, `ease-out` | `160ms` (`--cs-dur-160` / `--cs-dur-effect`), `cubic-bezier(0.5, 1, 0.89, 1)` (`--cs-ease-effect` / `--cs-ease-quad-out`) | Matches `motion.css`'s non-spatial effect role so entering/exiting symbols and digits fade crisply without lingering. |

- **`prefers-reduced-motion`:** `motion.css`'s global `@media (prefers-reduced-motion: reduce)` rule only neutralizes CSS transitions and `@keyframes`—it does **not** affect WAAPI `element.animate()` calls. Keeping `respectMotionPreference = true` by default delegates reduced-motion handling to NumberFlow's internal `matchMedia('(prefers-reduced-motion: reduce)')` check.

---

## 6. SSR, Testing & Edge Cases

### SSR & Hydration

- `@number-flow/svelte` supports SSR via Declarative Shadow DOM (`renderInnerHTML`) and hydrates into `<number-flow-svelte>` on the client.
- Wrapping in `<span class="cs-number-morph">` does not interfere with Declarative Shadow DOM inside `<NumberFlow>`.
- Avoid reading `window` or `getComputedStyle` at module top-level or during SSR render.

### Vitest & `happy-dom` Caveats

`vitest.config.ts` uses `environment: "happy-dom"`:
1. **WAAPI (`Element.prototype.animate`):** Stub `Element.prototype.animate` in `beforeEach` returning `{ finished: Promise.resolve(), cancel() {}, finish() {} }` so NumberFlow updates never throw if `happy-dom` lacks full WAAPI support.
2. **Layout Measurements (`getBoundingClientRect`):** `happy-dom` returns `0` for bounding rects; unit tests verify props, attributes, and DOM/Shadow DOM output, while visual spin/clipping is verified in Playwright or the playground.
3. **Shadow DOM Assertions:** Query `<number-flow-svelte>` internals via `el.shadowRoot?.textContent` or `ElementInternals` rather than `container.textContent` alone.

### Resolved Design Decisions

1. **Expose `NumberMorphGroup`:** Yes—exported alongside `NumberMorph` with `<span class="cs-number-morph-group">` (`display: inline-flex; align-items: baseline;`) for synchronized sibling layout transitions and reliable `ref`/`{...rest}` forwarding.
2. **Ergonomic `continuous` Prop:** Expose `continuous?: boolean` (default `false`) on `NumberMorph` and map it internally to `@number-flow/svelte`'s `continuous` plugin.
3. **Default Affix Color:** Inherit `currentColor` by default on `::part(prefix)` and `::part(suffix)` via `--cs-number-morph-affix-fg` (safe inside `<Badge>` and `<Button>`), rather than forcing `--cs-color-text-weak`.
4. **Motion Defaults:** Override NumberFlow's `900ms`/`450ms` defaults with `CS_NUMBER_MORPH_TRANSFORM_TIMING` (`380ms`, `--cs-ease-quint-out`), `CS_NUMBER_MORPH_SPIN_TIMING` (`380ms`, `--cs-ease-quint-out`), and `CS_NUMBER_MORPH_OPACITY_TIMING` (`160ms`, `--cs-ease-effect`).

---

## 7. Concrete Implementation Plan

1. **Step 1 — `package.json`:**
   - Add `"@number-flow/svelte": "^0.4.2"` to `devDependencies`, `peerDependencies`, and `peerDependenciesMeta` (`optional: true`), then run `bun install`.
2. **Step 2 — Core Module (`src/modules/number-morph/`):**
   - Create `index.ts` with exports (`NumberMorph`, `NumberMorphGroup`, `CS_NUMBER_MORPH_*_TIMING`, and types).
   - Create `NumberMorph.svelte` with `<span class="cs-number-morph">`, `continuous` → `plugins` mapping, `onanimationsstart`/`onanimationsfinish` event wiring, `--cs-number-morph-*` CSS variable mapping, and `@layer components.primitive` styles.
   - Create `NumberMorphGroup.svelte` with `<span class="cs-number-morph-group">` wrapping `<NumberFlowGroup>`.
3. **Step 3 — Unit Tests (`NumberMorph.svelte.test.ts`):**
   - Add `Element.prototype.animate` stub in `beforeEach`.
   - Test rendering, `ref` binding, `{...rest}` forwarding, `data-animated` / `data-continuous` attributes, `prefix`/`suffix`, `format`/`locales`, `NumberMorphGroup` rendering, and Shadow DOM value updates.
4. **Step 4 — Docs & Playground Preview:**
   - Create `number-morph.docs.md` with `bun add @number-flow/svelte` install prerequisite, API reference, CSS variables, and `NumberMorphGroup` usage.
   - Create `NumberMorph.preview.svelte` demonstrating counters, currency/compact formatting, `continuous` mode, `NumberMorphGroup`, and `Badge` composition.
   - Verify with `bun run typecheck`, `bun run lint`, and `bun run test`.
