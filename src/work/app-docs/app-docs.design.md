# Work App Docs Design Spec (`src/work/app-docs/`)

## 1. Visual Philosophy & Editorial Cohesion

`WorkAppDocs` is a desktop-first product-manual and reference surface inside [`WorkAppFrame`](../app-layout/WorkAppFrame.svelte) and [`WorkAppMain`](../app-layout/WorkAppMain.svelte). Instead of looking like generic Markdown with dated pastel alert boxes and a heavy left sidebar, every element shares one unified editorial grammar: **calm monochrome depth, deliberate structural contrast, centered single-column focus, and restrained micro-accents**.

### Surface Grammar

1. **Canvas (`--cs-color-canvas`):** The open reading plane. Prose and chapter headings sit directly on `canvas`—never trapped inside a giant outer card—so the page breathes effortlessly.
2. **Segmented Chapter Bar (`SegmentedControl`, `size="md"`, `width="content"`):** Reuses the library's native sunken tray + elevated sliding pill indicator for chapter switching, eliminating custom sidebar chrome while keeping tactile spring physics and keyboard navigation consistent.
3. **Soft (`--cs-color-base-soft` & `--cs-color-accent-soft`):** Quiet inline and interactive micro-surfaces (`code` chips, ordered step badges, understated text marks) that organize information without adding elevation noise.
4. **Elevated (`--cs-color-elevated` + `--cs-shadow-elevated`):** Structured reference objects—**Callout strips**, **Summary cards**, and **Static tables**. Every elevated container shares identical `16px` (`--cs-radius-2xl`) `--cs-squircle` geometry, so all content blocks feel designed by one hand.

### Constraints & Token Discipline

- **Borderless by default:** Zero raw CSS `border`. Dividers and table hairlines use `box-shadow: inset ...` with `color-mix(in oklch, ...)` matching [`DataTable`](../../modules/data-table/data-table.css).
- **Direct `px` units** for layout, spacing, and type (`ch` allowed for prose `max-inline-size`); custom properties use `--cs-work-app-docs-*` (never `--_` prefixes).
- **Styles live in `@layer components.composite`** and rely on global `focus.css` and `motion.css` (`prefers-reduced-motion`).

---

## 2. Centered Single-Column Layout & Proportions

Calibrated for `WorkAppFrame` (`1280px` max width via `--cs-container-7xl`, `48px` horizontal gutters, `48px` [`WorkAppHeader`](../app-layout/WorkAppHeader.svelte) above, `32px` vertical gap).

```text
.cs-work-app-docs (flex column, gap: 24px, max-width: 760px, margin-inline: auto)
├── .cs-work-app-docs-header (eyebrow?, h1, lead, hairline divider)
├── .cs-work-app-docs-tabs (SegmentedControl size="md" width="content")
└── .cs-work-app-docs-content (article, width: 100%)
    └── .cs-work-app-docs-chapter[role="tabpanel"] (active chapter only)
        ├── .cs-work-app-docs-chapter-title (h2)
        ├── .cs-work-app-docs-chapter-lead (optional p)
        └── sections (h2/h3), prose, custom lists, marks, tables, callouts, cards
```

| Property | Value | Notes |
| :--- | :--- | :--- |
| `--cs-work-app-docs-max-width` | `760px` | Centered single-column measure (`margin-inline: auto`). |
| Vertical stack gap | `24px` | Clean editorial cadence between header, chapter tabs, and chapter body. |
| Prose measure (`p`, `ul`, `ol`) | `64ch` | Keeps reading line length comfortable inside the `760px` column. |

---

## 3. Chapter Tabs (`WorkAppDocsTabs` & `WorkAppDocsTab`)

- **Component:** Wraps [`SegmentedControl`](../../modules/segmented-control/SegmentedControl.svelte) with `size="md"` (`36px` height) and `width="content"`.
- **Auto-generated vs. explicit:** When `children` are omitted, `WorkAppDocsTabs` automatically renders one `SegmentedControlItem` per registered `WorkAppDocsChapter` (with optional `SegmentedControlIcon` and `SegmentedControlLabel`). Consumers can also pass explicit `<WorkAppDocsTab value="..." icon={...}>Label</WorkAppDocsTab>` children.
- **Overflow handling:** `.cs-work-app-docs-tabs` allows horizontal scrolling (`scrollbar-width: none`) with `2px` vertical padding compensation so `:focus-visible` rings are never clipped, while `SegmentedControl` provides horizontal fade masks and step buttons when tabs exceed the container width.

---

## 4. Typography, Prose Rhythm & Custom Lists

Designed to eliminate "wall of text" fatigue through deliberate vertical cadence, crisp contrast tiers, and custom-crafted lists.

### Page Header (`.cs-work-app-docs-header`)

- **Eyebrow (optional):** `11px`, `font-weight: 600`, `letter-spacing: var(--cs-tracking-wider)`, `text-transform: uppercase`, `color: var(--cs-color-text-weak)`, `margin-block-end: 8px`.
- **Title (`h1`):** `font-size: 32px`, `font-weight: 700`, `line-height: 1.15` (`37px`), `letter-spacing: var(--cs-tracking-tight)`, `color: var(--cs-color-text-strong)`.
- **Lead (`.cs-work-app-docs-lead`):** `font-size: 16px` (`--cs-text-base`), `font-weight: 400`, `line-height: 1.6` (`26px`), `color: var(--cs-color-text-weak)`, `margin-block-start: 10px`, `max-inline-size: 60ch`.
- **Divider:** `padding-block-end: 24px; margin-block-end: 32px; box-shadow: inset 0 -1px 0 0 var(--cs-work-app-docs-divider);` (`7%` light / `9%` dark).

### Chapter & Section Rhythm

- **Chapter title (`h2.cs-work-app-docs-chapter-title`):** `20px` (`--cs-text-xl`), `font-weight: 700`, `line-height: 1.3`, `margin-block: 0 12px`.
- **In-chapter sections (`WorkAppDocsSection`):**
  - `level={2}`: `18px` (`--cs-text-lg`), `font-weight: 600`, `line-height: 1.35`, separated from preceding content by a subtle top hairline (`margin-block-start: 32px; padding-block-start: 28px;`).
  - `level={3}`: `16px` (`--cs-text-base`), `font-weight: 600`, `line-height: 1.4`, `margin-block: 26px 8px;`.
- **Body (`p`):** `15px`, `font-weight: 400`, `line-height: 1.65`, `--cs-color-text-main`, `margin-block: 0 14px; max-inline-size: 64ch`.
- **Inline code (`code`):** `13px` (`--cs-font-mono`), `font-weight: 500`, `padding: 2px 6px`, `--cs-color-base-soft`, `border-radius: 5px`, `corner-shape: var(--cs-squircle-soft)`.
- **Inline keycap (`kbd`):** `12px` (`--cs-font-mono`), `font-weight: 500`, `line-height: 16px`, `padding: 1px 6px`, `--cs-color-elevated`, `--cs-shadow-2xs`, `border-radius: 5px`.
- **Editorial Links (`a`):** Calm monochrome at rest (`--cs-color-text-strong`, subtle underline), shifting to `--cs-color-accent-soft-fg` on hover.
- **Never apply `text-trim`** to headings, descriptions, or multi-line prose.

### Custom-Crafted Lists (Never Raw Browser Bullets)

- **Unordered (`ul`):** `list-style: none; padding-inline-start: 0; display: flex; flex-direction: column; gap: 8px; margin-block: 0 18px; max-inline-size: 64ch;` with `5px × 5px` rounded dot markers (`li::before`).
- **Ordered / Step Lists (`ol`):** `list-style: none; counter-reset: cs-docs-step; padding-inline-start: 0; display: flex; flex-direction: column; gap: 10px; margin-block: 0 20px; max-inline-size: 64ch;` with `20px × 20px` soft squircle step badges (`li::before`).

---

## 5. Content Elements

### A. Text Marks / Highlights (`<mark>` / `.cs-work-app-docs-mark`)

Understated, crisp typographic emphasis—**no soft-blue highlighter blobs** in prose:

- **Geometry:** `padding: 1px 5px; border-radius: 4px; corner-shape: var(--cs-squircle-soft); font-weight: 550; box-decoration-break: clone;`.
- **Tones:**
  - `accent` (default, rendered as refined monochrome vellum): soft neutral tint with subtle bottom hairline.
  - `caution`: whisper-soft warm paper tint with caution bottom hairline.

### B. Modern Editorial Callouts (`.cs-work-app-docs-callout`)

- **Surface:** `background-color: var(--cs-color-elevated); box-shadow: var(--cs-shadow-elevated); border-radius: var(--cs-radius-2xl)` (`16px`), `corner-shape: var(--cs-squircle); padding: 14px 16px; margin-block: 20px;`.
- **Icon Badge (`.cs-work-app-docs-callout-badge`):** `24px × 24px` squircle (`note` | `tip` | `caution`).

### C. Clean Small Static Tables (`.cs-work-app-docs-table`)

- **Outer shell (`.cs-work-app-docs-table-wrap`):** `background-color: var(--cs-color-elevated); box-shadow: var(--cs-shadow-elevated); border-radius: var(--cs-radius-2xl); corner-shape: var(--cs-squircle); overflow-x: auto; margin-block: 20px;`.
- **No row hover shading:** Keeps static reference tables visually distinct from interactive controls.

### D. Small Summary Cards (`.cs-work-app-docs-card-grid` / `.cs-work-app-docs-card`)

- **Grid:** `display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-block: 20px;`.
- **Card:** `padding: 16px; background-color: var(--cs-color-elevated); box-shadow: var(--cs-shadow-elevated); border-radius: var(--cs-radius-2xl); corner-shape: var(--cs-squircle);`.

---

## 6. Accessibility & Reduced Motion

- **Landmarks & Roles:** Chapter tabs use `SegmentedControl` (`role="radiogroup"` / `role="radio"` with `aria-checked`) and active chapters render `<section role="tabpanel" aria-labelledby={headingId}>`.
- **Focus & Motion:** Inherits global `src/css/foundation/focus.css` (`:focus-visible`) and `motion.css` (`prefers-reduced-motion: reduce`)—no duplicate component-level overrides.
