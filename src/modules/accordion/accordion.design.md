# Accordion Design Spec (`src/modules/accordion/`)

## 1. Role & Visual Direction

`Accordion` is a **composite disclosure stack** built on top of `Collapsible` (`src/modules/collapsible/`). It pairs a calm, scannable trigger row with a flexible content region—without heavy borders, noisy chrome, or rigid card-only layouts.

It is designed around three principles:
1. **Uncluttered hierarchy:** Clear typographic contrast between trigger titles, optional subtitles, and expanded body copy, using `base` monochrome surfaces and subtle `1px` hairlines only where items touch.
2. **Zero phantom spacing:** `Collapsible` owns the `0fr ↔ 1fr` track with zero outer padding, while `AccordionContent` owns inner padding—guaranteeing a true `0px` collapsed footprint.
3. **Synchronized physics:** Trigger chevron rotation and state transitions mirror `Collapsible`'s asymmetric enter/exit cadence (`240ms` open / `160ms` close).

---

## 2. Variants (`variant`, required — no default)

`Accordion` exposes **three purposeful variants** via `data-variant` (`"flush" | "elevated" | "separated"`). No redundant `bordered`, `outlined`, or `soft` matrices.

| Variant | Container Surface | Item Separation | Best For |
| :--- | :--- | :--- | :--- |
| **`flush`** | `transparent` (no outer shadow or radius) | `1px` hairline divider between items (`--cs-accordion-divider-color`) | FAQs, sidebars, editorial disclosures, and embedding inside an existing `Card` |
| **`elevated`** | Single unified `--cs-color-elevated` surface + `--cs-shadow-elevated` + squircle radius | `1px` hairline divider between items | Standalone settings groups, structured forms, primary page sections on `canvas` |
| **`separated`** | `transparent` group; each `AccordionItem` is its own `--cs-color-elevated` + `--cs-shadow-elevated` squircle | Vertical `--cs-accordion-gap` whitespace (no hairlines) | Independent rich items, multi-step modules, or items containing dense controls/tables |

### Variant Surface & Divider Details

- **Hairline Dividers (`flush` and `elevated`):**
  - Rendered between adjacent items (`+ .cs-accordion-item`) using a `1px` inset-neutral hairline (`--cs-accordion-divider-color: var(--cs-color-base-soft-hover)`), never a heavy `border` box around the whole component.
  - `flush` omits outer top/bottom hairlines by default so it sits cleanly inside `CardBody` or page sections without double-bordering.
- **Squircle Clipping (`elevated` and `separated`):**
  - `elevated` applies `overflow: clip`, `border-radius: var(--cs-accordion-radius)`, and `corner-shape: var(--cs-accordion-squircle)` on `.cs-accordion` so the first/last trigger hover washes clip cleanly to the container squircle.
  - `separated` applies `overflow: clip`, `border-radius`, and `corner-shape` to each `.cs-accordion-item`.

---

## 3. Sizes (`size`, required — no default)

`size` (`"sm" | "md" | "lg"`) scales trigger height, padding, typography, indicator size, corner radius, and `separated` gap proportionally with `Card` and `Button`:

| Token / Property | `sm` | `md` | `lg` |
| :--- | :--- | :--- | :--- |
| Trigger `min-height` | `40px` | `48px` | `56px` |
| Horizontal padding (`--cs-accordion-px`) | `12px` | `16px` | `24px` |
| Trigger vertical padding (`--cs-accordion-trigger-py`) | `8px` | `12px` | `16px` |
| Trigger internal gap (`--cs-accordion-trigger-gap`) | `8px` | `12px` | `14px` |
| Title font size (`--cs-accordion-title-size`) | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-base)` (`16px`) | `var(--cs-text-lg)` (`18px`) |
| Subtitle font size (`--cs-accordion-subtitle-size`) | `var(--cs-text-xs)` (`12px`) | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-sm)` (`14px`) |
| Body font size (`--cs-accordion-content-size`) | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-base)` (`16px`) |
| Leading icon / chevron size | `16px` | `18px` | `20px` |
| Content top padding (`--cs-accordion-content-pt`) | `0px` | `0px` | `0px` |
| Content bottom padding (`--cs-accordion-content-pb`) | `12px` | `16px` | `20px` |
| `separated` item gap (`--cs-accordion-gap`) | `6px` | `8px` | `12px` |
| Container / item radius (`--cs-accordion-radius`) | `var(--cs-radius-xl)` (`12px`) | `var(--cs-radius-2xl)` (`16px`) | `var(--cs-radius-3xl)` (`24px`) |
| Squircle (`--cs-accordion-squircle`) | `var(--cs-squircle-smooth)` (`1.6`) | `var(--cs-squircle)` (`2.0`) | `var(--cs-squircle)` (`2.0`) |

- **Optical note on `flush` horizontal padding:** `flush` uses the same `--cs-accordion-px` by default so its hover wash has breathing room around the title. Consumers embedding `flush` inside a narrow column can override `--cs-accordion-px: 0px` for edge-aligned text.

---

## 4. Trigger & Indicator Craft

### Trigger Layout

`.cs-accordion-trigger` is a native `<button type="button">` spanning `100%` width:

```text
.cs-accordion-trigger (button)
├── [optional leading slot: icon / badge, flex-shrink: 0]
├── .cs-accordion-trigger-text (flex: 1 1 auto; min-width: 0; column; gap: 2px)
│   ├── title (font-weight: 500; line-height: var(--cs-leading-tight))
│   └── [optional subtitle] (font-weight: 400; color: var(--cs-color-text-weak))
└── .cs-accordion-indicator (chevron, flex-shrink: 0; margin-inline-start: auto)
```

- **Typography & Alignment:** `text-align: start`, `cursor: default`, `user-select: none`. Titles wrap naturally if long (never `text-trim-truncate`, per `design-and-tokens.md`).
- **Icon Stroke Calibration:** Leading icons and the trailing chevron use `strokeWidth: 2.25` to balance the `500` weight title.

### Interactive States (Native CSS Only)

All interactive states use native CSS pseudo-classes (`:hover`, `:active`, `:focus-visible`)—zero JS hover wrappers:

- **Rest:**
  - Title: `--cs-color-text-strong` (or `--cs-color-text-main` when closed in dense `flush` lists if desired; default `--cs-color-text-strong` for crisp scannability).
  - Indicator & leading icon: `--cs-color-text-weak`.
- **Hover (`:hover`):**
  - `flush` & `elevated`: Trigger background gently washes with `--cs-color-base-soft`; indicator brightens to `--cs-color-text-strong`.
  - `separated`: Item elevates from `--cs-shadow-elevated` to `--cs-shadow-elevated-hover` (light mode) and brightens indicator to `--cs-color-text-strong`, preserving `elevated` surface purity without darkening.
- **Active (`:active`):**
  - Subtle tactile nudge on the indicator (`translate: 0 1px`) over `--cs-dur-press` (`140ms`) `--cs-ease-press`, giving immediate press feedback without distorting full-width row geometry.
- **Focus (`:focus-visible`):**
  - Relies on global `focus.css` (`2px solid var(--cs-color-accent-solid)`), using `outline-offset: -2px` inside `overflow: clip` containers (`elevated`, `separated`) so the focus ring is never shaved by the rounded squircle clip.
- **Disabled (`:disabled`, `[data-disabled]`):**
  - Sets `--cs-disabled-opacity: 1` and applies `--cs-color-disabled-fg` (`--cs-color-text-weaker`) to title, subtitle, and indicator. Global `disabled.css` suppresses `:hover` and `:active` via `pointer-events: none`.

### Synchronized Chevron Motion

The trailing chevron rotates `0deg` (closed, pointing down) ↔ `180deg` (open, pointing up), using the exact same asymmetric timing as `Collapsible`:

- **Open (`[data-open]`):** `transition: transform var(--cs-accordion-dur-enter) var(--cs-accordion-ease-enter), color var(--cs-dur-effect) var(--cs-ease-effect);` (`240ms`, `--cs-ease-quart-out`).
- **Close (`:not([data-open])`):** `transition: transform var(--cs-accordion-dur-exit) var(--cs-accordion-ease-exit), color var(--cs-dur-effect) var(--cs-ease-effect);` (`160ms`, `--cs-ease-exit`).
- **Instant Mount (`[data-instant]`):** Suppresses chevron transition (`transition: none !important`) when initialized open.

---

## 5. Content Area Flexibility & `Collapsible` Integration

1. **Zero-Padding Outer Track:**
   - `AccordionContent` wraps `Collapsible` (`.cs-collapsible`). No `padding`, `margin`, or `border` is ever placed on `.cs-collapsible` itself.
   - `.cs-accordion-item` uses `display: flex; flex-direction: column;` with **no `gap`** so a closed item's `Collapsible` occupies exactly `0px` with zero phantom spacing.
2. **Inner Content Wrapper (`.cs-accordion-content-body`):**
   - Placed inside `Collapsible`'s `.cs-collapsible-inner`.
   - Owns `padding: var(--cs-accordion-content-pt) var(--cs-accordion-content-px) var(--cs-accordion-content-pb)` (defaulting `--cs-accordion-content-px` to `--cs-accordion-px`), `color: var(--cs-accordion-content-fg)` (`--cs-color-text-main`), and `font-size: var(--cs-accordion-content-size)`.
   - Because `pt` defaults to `0px` (relying on the trigger's bottom padding for visual rhythm), the first line of content sits naturally close to its heading.
3. **Edge-to-Edge Content Override (`data-flush` / CSS tokens):**
   - For tables, nested accordions, or full-bleed code blocks, `AccordionContent` supports `data-flush` (or `padded={false}`), which sets `--cs-accordion-content-px: 0px; --cs-accordion-content-pb: 0px;` cleanly without `!important`.
4. **Motion Preset Forwarding:**
   - `Accordion` forwards `motion` (`"slide" | "swell" | "fade" | "none"`, default `"slide"`) to `Collapsible`. `"slide"` is the default so stacked items expand cleanly without vertical fade flicker; `"swell"` works well for spacious `separated` items.

---

## 6. CSS Token Contract (`--cs-accordion-*`) & Attributes

All styles live in `@layer components.composite` using plain CSS.

### DOM & `data-*` Anatomy

```text
.cs-accordion (div, data-variant="flush"|"elevated"|"separated", data-size="sm"|"md"|"lg", data-disabled?)
└── .cs-accordion-item (div, data-open?, data-disabled?, data-instant?)
    ├── .cs-accordion-trigger (button[type="button"], aria-expanded, data-open?, data-disabled?)
    │   ├── [leading icon/badge slot]
    │   ├── .cs-accordion-trigger-text
    │   └── .cs-accordion-indicator (svg / chevron)
    └── .cs-collapsible (Collapsible, data-open?, data-motion, data-state, data-instant?)
        └── .cs-collapsible-inner
            └── .cs-accordion-content-body (div, data-flush?)
                └── {children}
```

### Module Custom Properties (`--cs-accordion-*`)

| Token | Default / Source | Role |
| :--- | :--- | :--- |
| `--cs-accordion-bg` | `transparent` (`flush`/`separated`) / `var(--cs-color-elevated)` (`elevated`) | Group container background |
| `--cs-accordion-item-bg` | `transparent` (`flush`/`elevated`) / `var(--cs-color-elevated)` (`separated`) | Item background |
| `--cs-accordion-shadow` | `none` (`flush`/`separated`) / `var(--cs-shadow-elevated)` (`elevated`) | Group container shadow |
| `--cs-accordion-item-shadow` | `none` (`flush`/`elevated`) / `var(--cs-shadow-elevated)` (`separated`) | Item shadow |
| `--cs-accordion-item-shadow-hover` | `var(--cs-shadow-elevated-hover)` (`separated`) | Item hover shadow |
| `--cs-accordion-divider-color` | `var(--cs-color-base-soft-hover)` | `1px` hairline between items (`flush`/`elevated`) |
| `--cs-accordion-gap` | Size-scaled (`6px` / `8px` / `12px`) | Vertical gap between `separated` items |
| `--cs-accordion-radius` | Size-scaled (`xl` / `2xl` / `3xl`) | Outer squircle radius |
| `--cs-accordion-squircle` | Size-scaled (`--cs-squircle-smooth` / `--cs-squircle`) | Superellipse `corner-shape` |
| `--cs-accordion-px` | Size-scaled (`12px` / `16px` / `24px`) | Shared horizontal padding |
| `--cs-accordion-trigger-min-height` | Size-scaled (`40px` / `48px` / `56px`) | Trigger minimum block size |
| `--cs-accordion-trigger-py` | Size-scaled (`8px` / `12px` / `16px`) | Trigger vertical padding |
| `--cs-accordion-trigger-gap` | Size-scaled (`8px` / `12px` / `14px`) | Gap between trigger slots |
| `--cs-accordion-trigger-bg` | `transparent` | Trigger resting background |
| `--cs-accordion-trigger-bg-hover` | `var(--cs-color-base-soft)` (`flush`/`elevated`) / `transparent` (`separated`) | Trigger hover background |
| `--cs-accordion-trigger-fg` | `var(--cs-color-text-strong)` | Trigger title color |
| `--cs-accordion-indicator-fg` | `var(--cs-color-text-weak)` | Resting chevron / leading icon color |
| `--cs-accordion-indicator-fg-hover` | `var(--cs-color-text-strong)` | Hover/open chevron color |
| `--cs-accordion-indicator-size` | Size-scaled (`16px` / `18px` / `20px`) | Chevron / leading icon size |
| `--cs-accordion-content-px` | `var(--cs-accordion-px)` | Content inner horizontal padding |
| `--cs-accordion-content-pt` | `0px` | Content inner top padding |
| `--cs-accordion-content-pb` | Size-scaled (`12px` / `16px` / `20px`) | Content inner bottom padding |
| `--cs-accordion-content-fg` | `var(--cs-color-text-main)` | Content body text color |
| `--cs-accordion-dur-enter` | `var(--cs-dur-240)` | Chevron open duration (synced with `Collapsible`) |
| `--cs-accordion-dur-exit` | `var(--cs-dur-160)` | Chevron close duration (synced with `Collapsible`) |
| `--cs-accordion-ease-enter` | `var(--cs-ease-quart-out)` | Chevron open easing |
| `--cs-accordion-ease-exit` | `var(--cs-ease-exit)` | Chevron close easing |
