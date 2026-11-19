# Blueprint: `app-docs` (`src/work/app-docs/`)

## 1. Overview & Scope

- **Kind:** `component` (composable compound documentation system for Work apps)
- **Import surface:** `src/work/app-docs/index.ts`, re-exported via `src/work/index.ts` (`cs/svelte/work`)
- **Purpose:** Provides a unified, calm, centered single-column documentation view rendered inside `<WorkAppMain>` (within `<WorkAppFrame>`, which lives inside `<ScrollArea>` -> `<ScrollAreaContent>` with `scrollFade`). When a Work app's `<WorkAppHelpButton>` toggles the help/docs view, the app renders `<WorkAppDocs>` inside `<WorkAppMain>` while `<WorkAppHeader>` remains anchored above.

### Architectural Boundaries
- **Pure presentation & chapter-tab switching:** `app-docs` owns layout, typography, chapter tabs (`SegmentedControl`), callouts, inline highlights, and static reference tables. It does **not** manage app routing, `WorkAppHelpButton` toggle state, or view-transition animations between app mode and docs mode.
- **No `DataTable` dependency:** `app-docs` does **not** wrap `src/modules/data-table/`. Documentation tables are small, static, prose-embedded reference tables; wrapping `DataTable` would pull in sorting, filtering, column popovers, selection state, and ~50 KB of interactive table CSS. Instead, `WorkAppDocsTable` uses native semantic `<table>` markup styled with `DataTable`-aligned surface, divider, and typography tokens.
- **Focused Work-App API:** Follows `src/work/` conventions—no generic `size` or `variant × color` matrices on layout/prose primitives. Semantic `variant` is exposed only where intent-driven (`WorkAppDocsCallout`).
- **Explicit Non-Goals:**
  - Full-text search, client-side Markdown/MDX parsing, or multi-level sidebar trees.
  - Interactive code playgrounds or copy-to-clipboard toolbars.
  - View-switch choreography when toggling `<WorkAppHelpButton>`.

---

## 2. Public API

### Exports (`src/work/app-docs/index.ts`)

```ts
// Layout & Chapter Tabs
export { default as WorkAppDocs } from "./WorkAppDocs.svelte";
export { default as WorkAppDocsHeader } from "./WorkAppDocsHeader.svelte";
export { default as WorkAppDocsTabs } from "./WorkAppDocsTabs.svelte";
export { default as WorkAppDocsTab } from "./WorkAppDocsTab.svelte";
export { default as WorkAppDocsContent } from "./WorkAppDocsContent.svelte";

// Chapters, Sections & Inline Primitives
export { default as WorkAppDocsChapter } from "./WorkAppDocsChapter.svelte";
export { default as WorkAppDocsSection } from "./WorkAppDocsSection.svelte";
export { default as WorkAppDocsCallout } from "./WorkAppDocsCallout.svelte";
export { default as WorkAppDocsCardGrid } from "./WorkAppDocsCardGrid.svelte";
export { default as WorkAppDocsCard } from "./WorkAppDocsCard.svelte";
export { default as WorkAppDocsMark } from "./WorkAppDocsMark.svelte";
export { default as WorkAppDocsKbd } from "./WorkAppDocsKbd.svelte";
export { default as WorkAppDocsCode } from "./WorkAppDocsCode.svelte";

// Static Reference Table
export { default as WorkAppDocsTable } from "./WorkAppDocsTable.svelte";
export { default as WorkAppDocsTableHead } from "./WorkAppDocsTableHead.svelte";
export { default as WorkAppDocsTableBody } from "./WorkAppDocsTableBody.svelte";
export { default as WorkAppDocsTableRow } from "./WorkAppDocsTableRow.svelte";
export { default as WorkAppDocsTableHeaderCell } from "./WorkAppDocsTableHeaderCell.svelte";
export { default as WorkAppDocsTableCell } from "./WorkAppDocsTableCell.svelte";

// Constants & Types
export const WORK_APP_DOCS_CALLOUT_VARIANTS = ["note", "tip", "caution"] as const;
export type WorkAppDocsCalloutVariant = (typeof WORK_APP_DOCS_CALLOUT_VARIANTS)[number];

export const WORK_APP_DOCS_MARK_TONES = ["accent", "caution"] as const;
export type WorkAppDocsMarkTone = (typeof WORK_APP_DOCS_MARK_TONES)[number];

export const WORK_APP_DOCS_SECTION_LEVELS = [2, 3] as const;
export type WorkAppDocsSectionLevel = (typeof WORK_APP_DOCS_SECTION_LEVELS)[number];

export const WORK_APP_DOCS_TABLE_ALIGNS = ["start", "center", "end"] as const;
export type WorkAppDocsTableAlign = (typeof WORK_APP_DOCS_TABLE_ALIGNS)[number];
```

*(Plus exported `*Props` interfaces for every component, extending the corresponding `HTMLAttributes<...>`.)*

### Component Props

All DOM-rendering components expose `ref = $bindable(null)` and forward `{...rest}` (including `class` via Svelte 5 array syntax `["cs-work-app-docs-...", className]`).

| Component | Key Props | Defaults / Notes |
| :--- | :--- | :--- |
| `WorkAppDocs` | `ref` (`HTMLDivElement \| null`), `activeChapter?: string` (`$bindable()`), `defaultChapter?: string`, `onChapterChange?: (id: string) => void`, `children` | Centered single-column container (`max-inline-size: var(--cs-work-app-docs-max-width, 760px)`); provides chapter registry & selection context via `createContext`. Defaults `activeChapter` to `defaultChapter` or the first registered chapter. |
| `WorkAppDocsHeader` | `ref` (`HTMLElement \| null`), `title: string`, `lead?: string`, `eyebrow?: string`, `children` | Renders `<h1>` + optional eyebrow and lead paragraph at top of docs stack. |
| `WorkAppDocsTabs` | `ref` (`HTMLDivElement \| null`), `aria-label?: string`, `children` | Wraps `SegmentedControl` (`size="md"`, `width="content"`, `bind:value` synced to `activeChapter`). When `children` are omitted, auto-renders a `SegmentedControlItem` (with optional `SegmentedControlIcon` + `SegmentedControlLabel`) for each registered `WorkAppDocsChapter`. |
| `WorkAppDocsTab` | `ref` (`HTMLButtonElement \| null`), `value: string`, `icon?: Component`, `children` | Explicit chapter tab item wrapping `SegmentedControlItem` + optional `SegmentedControlIcon` + `SegmentedControlLabel`. |
| `WorkAppDocsContent` | `ref` (`HTMLElement \| null`), `children` | Full-width prose container inside the centered `760px` column; styles descendant `<p>`, `<ul>`, `<ol>`, `<strong>`, `<a>`, `<code>`, `<kbd>`, `<mark>` via `:where(...)`. |
| `WorkAppDocsChapter` | `ref` (`HTMLElement \| null`), `id: string`, `title: string`, `icon?: Component`, `lead?: string`, `children` | Registers chapter with `WorkAppDocs` context on mount (and unregisters on cleanup); renders `<section role="tabpanel" data-chapter-id={id}>` with `<h2>` and optional `lead` only when `ctx.activeChapter === id`. |
| `WorkAppDocsSection` | `ref` (`HTMLElement \| null`), `id?: string`, `title: string`, `lead?: string`, `level?: 2 \| 3`, `children` | Clean in-chapter heading + prose section; `level` defaults to `2`. |
| `WorkAppDocsCallout` | `ref` (`HTMLElement \| null`), `variant: WorkAppDocsCalloutVariant` *(required)*, `title?: string`, `icon?: Component \| null`, `children` | `variant` has **no default** (`"note" \| "tip" \| "caution"`), forcing explicit intent at every call site. |
| `WorkAppDocsCardGrid` | `ref` (`HTMLDivElement \| null`), `children` | Responsive `auto-fit` summary card grid. |
| `WorkAppDocsCard` | `ref` (`HTMLDivElement \| null`), `title: string`, `description?: string`, `icon?: Component`, `children` | Elevated summary card. |
| `WorkAppDocsMark` | `ref` (`HTMLElement \| null`), `tone?: "accent" \| "caution"`, `children` | Inline `<mark>` highlight for key terms or UI labels (`accent` renders as monochrome vellum). |
| `WorkAppDocsKbd` | `ref` (`HTMLElement \| null`), `children` | Inline `<kbd>` keycap for shortcuts (e.g. `Strg`, `S`). |
| `WorkAppDocsCode` | `ref` (`HTMLElement \| null`), `children` | Inline `<code>` for filenames, paths, or literal values. |
| `WorkAppDocsTable` | `ref` (`HTMLDivElement \| null`), `caption?: string`, `children` | Scrollable card wrapper around semantic `<table>`. |
| `WorkAppDocsTableHead` | `ref` (`HTMLTableSectionElement \| null`), `children` | `<thead>`. |
| `WorkAppDocsTableBody` | `ref` (`HTMLTableSectionElement \| null`), `children` | `<tbody>`. |
| `WorkAppDocsTableRow` | `ref` (`HTMLTableRowElement \| null`), `children` | `<tr>`. |
| `WorkAppDocsTableHeaderCell` | `ref` (`HTMLTableCellElement \| null`), `align?: "start" \| "center" \| "end"`, `children` | `<th>` (`scope="col"` default). |
| `WorkAppDocsTableCell` | `ref` (`HTMLTableCellElement \| null`), `align?: "start" \| "center" \| "end"`, `children` | `<td>`. |

### CSS Custom Properties (`--cs-work-app-docs-*`)

Following `.agents/rules/naming.md` (no `--_` private prefixes):

- `--cs-work-app-docs-max-width` (default: `760px` — centered single-column container width)
- `--cs-work-app-docs-divider` (subtle hairline divider via `color-mix(in oklch, ...)`)
- `--cs-work-app-docs-callout-radius` (default: `var(--cs-radius-2xl)`)
- `--cs-work-app-docs-table-bg` (default: `var(--cs-color-elevated)`)
- `--cs-work-app-docs-table-shadow` (default: `var(--cs-shadow-elevated)`)
- `--cs-work-app-docs-table-radius` (default: `var(--cs-radius-2xl)`)

### Consumer Integration Snippet

```svelte
<WorkAppMain>
    <WorkAppDocs>
        <WorkAppDocsHeader
            eyebrow="Handbuch"
            title="Holzanalysen"
            lead="So erfassen, prüfen und exportieren Sie Messdaten im Werk."
        />

        <WorkAppDocsTabs />

        <WorkAppDocsContent>
            <WorkAppDocsChapter id="einstieg" title="Einstieg">
                <p>
                    Wählen Sie zuerst über <WorkAppDocsMark>Ordner wählen</WorkAppDocsMark> Ihr
                    lokales Arbeitsverzeichnis.
                </p>

                <WorkAppDocsCallout variant="caution" title="Hinweis zur Freigabe">
                    <p>Nach einem Browser-Neustart fragt der Browser einmalig nach erneuter Lesefreigabe.</p>
                </WorkAppDocsCallout>
            </WorkAppDocsChapter>

            <WorkAppDocsChapter id="tastenkuerzel" title="Tastenkürzel">
                <WorkAppDocsSection title="Erfassungsmodus" level={3}>
                    <WorkAppDocsTable>
                        <WorkAppDocsTableHead>
                            <WorkAppDocsTableRow>
                                <WorkAppDocsTableHeaderCell>Aktion</WorkAppDocsTableHeaderCell>
                                <WorkAppDocsTableHeaderCell align="end">Kürzel</WorkAppDocsTableHeaderCell>
                            </WorkAppDocsTableRow>
                        </WorkAppDocsTableHead>
                        <WorkAppDocsTableBody>
                            <WorkAppDocsTableRow>
                                <WorkAppDocsTableCell>Speichern</WorkAppDocsTableCell>
                                <WorkAppDocsTableCell align="end">
                                    <WorkAppDocsKbd>Strg</WorkAppDocsKbd> + <WorkAppDocsKbd>S</WorkAppDocsKbd>
                                </WorkAppDocsTableCell>
                            </WorkAppDocsTableRow>
                        </WorkAppDocsTableBody>
                    </WorkAppDocsTable>
                </WorkAppDocsSection>
            </WorkAppDocsChapter>
        </WorkAppDocsContent>
    </WorkAppDocs>
</WorkAppMain>
```

---

## 3. DOM, Semantics & Accessibility

- **Root & Landmarks:**
  - `WorkAppDocs`: `<div class="cs-work-app-docs">` (centered vertical flex stack, `max-inline-size: var(--cs-work-app-docs-max-width, 760px)`).
  - `WorkAppDocsTabs`: `<div class="cs-work-app-docs-tabs">` wrapping `SegmentedControl` (`role="radiogroup"`, `aria-label` defaulting to `t({ de: "Kapitel", en: "Chapters" })`).
  - `WorkAppDocsChapter`: `<section id={id} role="tabpanel" aria-labelledby={headingId} class="cs-work-app-docs-chapter" data-chapter-id={id}>` rendered only when active.
  - `WorkAppDocsSection`: `<section id={id} aria-labelledby={headingId} class="cs-work-app-docs-section" data-level={level}>` with `<h2>` (`level={2}`) or `<h3>` (`level={3}`).
  - `WorkAppDocsCallout`: `<aside class="cs-work-app-docs-callout" data-variant={variant}>`.
  - `WorkAppDocsTable`: `<div class="cs-work-app-docs-table-wrap"><table>...</table></div>` (`caption` rendered as `<caption>` when provided).
- **Keyboard & Focus:**
  - `SegmentedControl` provides horizontal roving focus (`ArrowLeft` / `ArrowRight` / `Home` / `End`) and `Tab` navigation out of the chapter bar.
  - Rely on global `:focus-visible` from `src/css/foundation/` (never re-implemented locally).

---

## 4. Visual & Motion Contract

### Centered Single-Column Stack
- `display: flex; flex-direction: column; gap: 24px; width: 100%; max-inline-size: var(--cs-work-app-docs-max-width, 760px); margin-inline: auto;`.
- `WorkAppDocsTabs` uses `SegmentedControl` (`size="md"`, `width="content"`), which provides the sunken tray, elevated sliding pill indicator, and horizontal overflow scroll-fade + step buttons on narrow viewports.

### Surfaces, Typography & Semantic Elements
- **Prose Measure & Rhythm:** `WorkAppDocsContent` fills the centered `760px` column; prose `<p>`, `<ul>`, and `<ol>` cap at `64ch`. Base body copy uses `15px` with `line-height: 1.65` and `--cs-color-text-main`, headings use `--cs-color-text-strong` with `--cs-tracking-tight`, and `<strong>` uses `--cs-color-text-strong` (`font-weight: 600`).
- **Callouts (`WorkAppDocsCallout`):** Borderless elevated surface (`--cs-color-elevated`, `--cs-shadow-elevated`, `border-radius: var(--cs-radius-2xl)`, `corner-shape: var(--cs-squircle)`) with a `24px × 24px` squircle icon badge (`note` / `tip` / `caution`).
- **Inline Primitives:**
  - `WorkAppDocsMark`: Monochrome vellum (`accent`) or soft warm paper (`caution`) with subtle bottom hairline, `padding: 1px 5px`, `border-radius: 4px`, `corner-shape: var(--cs-squircle-soft)`.
  - `WorkAppDocsKbd`: `--cs-color-elevated` keycap, `--cs-shadow-2xs`, `font-family: var(--cs-font-mono)`, `font-size: 12px`, `border-radius: 5px`.
  - `WorkAppDocsCode`: `--cs-color-base-soft` fill, `font-family: var(--cs-font-mono)`, `font-size: 13px`, `border-radius: 5px`.
- **Static Table (`WorkAppDocsTable`):** `--cs-color-elevated` card, `--cs-shadow-elevated`, `border-radius: var(--cs-radius-2xl)`, `corner-shape: var(--cs-squircle)`, subtle horizontal row dividers (`light-dark(color-mix(in oklch, var(--cs-color-base-900) 5.5%, transparent), color-mix(in oklch, var(--cs-color-base-100) 7%, transparent))`), `font-variant-numeric: tabular-nums` on cells, and `overflow-x: auto` on the wrapper for narrow viewports.

---

## 5. Edge Cases & Constraints

1. **Dynamic Chapter Mounting:** If an app conditionally mounts or unmounts a `WorkAppDocsChapter`, `WorkAppDocsChapter` registers on mount and unregisters on cleanup, keeping `WorkAppDocsTabs` automatically synchronized.
2. **Uncontrolled vs Controlled `activeChapter`:** When `activeChapter` is omitted, `WorkAppDocs` resolves to `defaultChapter` if provided, otherwise the first registered chapter.
3. **No `*.internal.*` Exports:** Context (`app-docs.context.internal.ts`) remains module-private and is never re-exported from `src/work/app-docs/index.ts`.
4. **Browser Support:** Targets modern Chromium-first (`corner-shape: squircle`, CSS nesting, `:where()`, `light-dark()`, `color-mix()`), matching the rest of `cscripts-ui`.
