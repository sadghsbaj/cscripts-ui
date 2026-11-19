---
name: WorkAppDocs
kind: component
import: cs/svelte/work
exports:
  - WorkAppDocs
  - WorkAppDocsHeader
  - WorkAppDocsTabs
  - WorkAppDocsTab
  - WorkAppDocsContent
  - WorkAppDocsChapter
  - WorkAppDocsSection
  - WorkAppDocsCallout
  - WorkAppDocsCardGrid
  - WorkAppDocsCard
  - WorkAppDocsMark
  - WorkAppDocsKbd
  - WorkAppDocsCode
  - WorkAppDocsTable
  - WorkAppDocsTableHead
  - WorkAppDocsTableBody
  - WorkAppDocsTableRow
  - WorkAppDocsTableHeaderCell
  - WorkAppDocsTableCell
  - WORK_APP_DOCS_CALLOUT_VARIANTS
  - WORK_APP_DOCS_MARK_TONES
  - WORK_APP_DOCS_SECTION_LEVELS
  - WORK_APP_DOCS_TABLE_ALIGNS
  - WorkAppDocsCalloutVariant
  - WorkAppDocsMarkTone
  - WorkAppDocsSectionLevel
  - WorkAppDocsTableAlign
  - WorkAppDocsProps
  - WorkAppDocsHeaderProps
  - WorkAppDocsTabsProps
  - WorkAppDocsTabProps
  - WorkAppDocsContentProps
  - WorkAppDocsChapterProps
  - WorkAppDocsSectionProps
  - WorkAppDocsCalloutProps
  - WorkAppDocsCardGridProps
  - WorkAppDocsCardProps
  - WorkAppDocsMarkProps
  - WorkAppDocsKbdProps
  - WorkAppDocsCodeProps
  - WorkAppDocsTableProps
  - WorkAppDocsTableHeadProps
  - WorkAppDocsTableBodyProps
  - WorkAppDocsTableRowProps
  - WorkAppDocsTableHeaderCellProps
  - WorkAppDocsTableCellProps
---

# WorkAppDocs

## Overview

Centered `760px` chapter-based documentation surface for Pfleiderer Work applications, designed to live inside `<WorkAppMain />`. Combines a `SegmentedControl` chapter switcher (`WorkAppDocsTabs`), context-driven chapter panels (`WorkAppDocsChapter`), and structured prose, callout, card, keyboard, code, and table primitives.

## Copy & Tone Guidelines

When authoring German documentation with `WorkAppDocs`, follow these rules:

- **Nie siezen:** In Work-App-Dokumentationen wird niemals gesiezt. Wenn eine direkte Ansprache nötig ist, immer **duzen** – direkt, freundlich und unaufdringlich.
- **Standardmäßig sachlich ohne Personenansprache:** Funktionen, Abläufe und Hinweise bevorzugt sachlich-neutral formulieren (ohne ständiges „du/dein“); nur an Stellen duzen, an denen eine persönliche Ansprache echten Mehrwert bietet.
- **Auf den Punkt & unaufgeregt:** Klare, gut lesbare deutsche Sätze ohne Füllwörter, ohne „um den heißen Brei“ und ohne hochtrabende Formulierungen.

## API

### `WorkAppDocs`
Root container (`<div class="cs-work-app-docs">`) extending `HTMLAttributes<HTMLDivElement>`. Provides shared chapter state and context to `WorkAppDocsTabs` and `WorkAppDocsChapter`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | No | `null` | Root `<div>` element reference. |
| `activeChapter` | `string` (`$bindable`) | No | `undefined` | Bindable active chapter ID. Falls back to `defaultChapter` or the first registered chapter. |
| `defaultChapter` | `string` | No | `undefined` | Initial chapter ID when `activeChapter` is uncontrolled. |
| `onChapterChange` | `(id: string) => void` | No | `undefined` | Callback invoked when the active chapter changes. |

### `WorkAppDocsHeader`
Page header (`<header class="cs-work-app-docs-header">`) extending `HTMLAttributes<HTMLElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<header>` element reference. |
| `title` | `string` | Yes | — | Main `<h1>` documentation title. |
| `lead` | `string` | No | `undefined` | Optional lead paragraph below the title. |
| `eyebrow` | `string` | No | `undefined` | Optional uppercase eyebrow label above the title. |

### `WorkAppDocsTabs`
Chapter switcher (`<div class="cs-work-app-docs-tabs">`) wrapping `<SegmentedControl size="md" width="content">`, extending `HTMLAttributes<HTMLDivElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | No | `null` | Root `<div>` element reference. |
| `aria-label` | `string` | No | `"Kapitel"` / `"Chapters"` | Accessible label for the underlying `SegmentedControl` (localized via `t()`). |
| `children` | `Snippet` | No | `undefined` | Optional explicit `<WorkAppDocsTab>` items. When omitted, tabs are auto-generated from registered `<WorkAppDocsChapter>` components. |

### `WorkAppDocsTab`
Explicit tab item wrapping `<SegmentedControlItem>`, extending `Omit<SegmentedControlItemProps<string>, "value">`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` (`$bindable`) | No | `null` | Underlying button element reference. |
| `value` | `string` | Yes | — | Chapter ID matched against `activeChapter`. |
| `icon` | `Component<SegmentedControlIconComponentProps>` | No | `undefined` | Optional icon component rendered via `<SegmentedControlIcon>`. |
| `children` | `Snippet` | No | `undefined` | Tab label content rendered inside `<SegmentedControlLabel>`. |

### `WorkAppDocsContent`
Prose container (`<article class="cs-work-app-docs-content">`) extending `HTMLAttributes<HTMLElement>`. Styles both `WorkAppDocs*` primitives and native `<p>`, `<strong>`, `<a>`, `<ul>`, `<ol>`, `<code>`, `<kbd>`, and `<mark>` descendants.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<article>` element reference. |

### `WorkAppDocsChapter`
Tab panel (`<section role="tabpanel" class="cs-work-app-docs-chapter">`) extending `HTMLAttributes<HTMLElement>`. Registers itself in `WorkAppDocs` context and renders only when active.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<section>` element reference (bound while active). |
| `id` | `string` | Yes | — | Unique chapter identifier used for tab selection and `data-chapter-id`. |
| `title` | `string` | Yes | — | Chapter `<h2>` heading and auto-generated tab label. |
| `icon` | `Component<SegmentedControlIconComponentProps>` | No | `undefined` | Optional icon passed to auto-generated `<WorkAppDocsTabs />` items. |
| `lead` | `string` | No | `undefined` | Optional lead paragraph below the chapter heading. |

- **DOM Attributes:** `role="tabpanel"`, `data-chapter-id={id}`.

### `WorkAppDocsSection`
Sub-section (`<section class="cs-work-app-docs-section">`) extending `HTMLAttributes<HTMLElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<section>` element reference. |
| `id` | `string` | No | `undefined` | Optional `id` attribute on the `<section>`. |
| `title` | `string` | Yes | — | Section heading text (`<h2>` or `<h3>` depending on `level`). |
| `lead` | `string` | No | `undefined` | Optional lead paragraph below the heading. |
| `level` | `WorkAppDocsSectionLevel` (`2 \| 3`) | No | `2` | Heading level (`2` adds a top divider except immediately after a chapter title/lead). |

- **DOM Attributes:** `data-level={level}`.

### `WorkAppDocsCallout`
Elevated callout block (`<aside class="cs-work-app-docs-callout">`) extending `HTMLAttributes<HTMLElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<aside>` element reference. |
| `variant` | `WorkAppDocsCalloutVariant` (`"note" \| "tip" \| "caution"`) | Yes | — | Visual tone and default icon (`Info`, `Lightbulb`, or `TriangleAlert`). |
| `title` | `string` | No | `undefined` | Optional bold callout heading. |
| `icon` | `Component \| null` | No | `undefined` | Custom icon component; pass `null` to suppress the icon badge. |

- **DOM Attributes:** `data-variant={variant}`, `data-has-icon` (present when an icon is rendered).

### `WorkAppDocsCardGrid`
Responsive grid (`<div class="cs-work-app-docs-card-grid">`) using `repeat(auto-fit, minmax(220px, 1fr))`, extending `HTMLAttributes<HTMLDivElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | No | `null` | Root `<div>` element reference. |

### `WorkAppDocsCard`
Elevated feature/summary card (`<div class="cs-work-app-docs-card">`) extending `HTMLAttributes<HTMLDivElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | No | `null` | Root `<div>` element reference. |
| `title` | `string` | Yes | — | Card heading text. |
| `description` | `string` | No | `undefined` | Optional short description below the title. |
| `icon` | `Component` | No | `undefined` | Optional icon rendered in a `26px` badge above the title. |

### `WorkAppDocsMark`
Inline highlight (`<mark class="cs-work-app-docs-mark">`) extending `HTMLAttributes<HTMLElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<mark>` element reference. |
| `tone` | `WorkAppDocsMarkTone` (`"accent" \| "caution"`) | No | `"accent"` | Highlight color tone. |

- **DOM Attributes:** `data-tone={tone}`.

### `WorkAppDocsKbd`
Inline keycap wrapper around `<Kbd variant="keycap" size="xs" class="cs-work-app-docs-kbd">`, extending `HTMLAttributes<HTMLElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<kbd>` element reference. |

### `WorkAppDocsCode`
Inline code pill (`<code class="cs-work-app-docs-code">`) extending `HTMLAttributes<HTMLElement>`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<code>` element reference. |

### `WorkAppDocsTable*`
Structured table primitives for tabular reference data:

| Component | Element | Props (`ref` + `...rest`) |
| :--- | :--- | :--- |
| `WorkAppDocsTable` | `<div class="cs-work-app-docs-table-wrap"><table>` | `ref?: HTMLDivElement \| null` (`$bindable`), `caption?: string` |
| `WorkAppDocsTableHead` | `<thead class="cs-work-app-docs-table-head">` | `ref?: HTMLTableSectionElement \| null` (`$bindable`) |
| `WorkAppDocsTableBody` | `<tbody class="cs-work-app-docs-table-body">` | `ref?: HTMLTableSectionElement \| null` (`$bindable`) |
| `WorkAppDocsTableRow` | `<tr class="cs-work-app-docs-table-row">` | `ref?: HTMLTableRowElement \| null` (`$bindable`) |
| `WorkAppDocsTableHeaderCell` | `<th class="cs-work-app-docs-table-header-cell">` | `ref?: HTMLTableCellElement \| null` (`$bindable`), `align?: WorkAppDocsTableAlign` (`"start"`, `"center"`, `"end"`, default `"start"`), `scope` (default `"col"`) |
| `WorkAppDocsTableCell` | `<td class="cs-work-app-docs-table-cell">` | `ref?: HTMLTableCellElement \| null` (`$bindable`), `align?: WorkAppDocsTableAlign` (`"start"`, `"center"`, `"end"`, default `"start"`) |

- `WorkAppDocsTableHeaderCell` and `WorkAppDocsTableCell` set `data-align={align}`.

### Constants & Types
- `WORK_APP_DOCS_CALLOUT_VARIANTS`: `["note", "tip", "caution"] as const`
- `WORK_APP_DOCS_MARK_TONES`: `["accent", "caution"] as const`
- `WORK_APP_DOCS_SECTION_LEVELS`: `[2, 3] as const`
- `WORK_APP_DOCS_TABLE_ALIGNS`: `["start", "center", "end"] as const`

### CSS Custom Properties
| Variable | Default | Scope |
| :--- | :--- | :--- |
| `--cs-work-app-docs-max-width` | `760px` | `.cs-work-app-docs` |
| `--cs-work-app-docs-divider` | `light-dark(color-mix(in oklch, var(--cs-color-base-900) 7%, transparent), color-mix(in oklch, var(--cs-color-base-100) 9%, transparent))` | `.cs-work-app-docs` (used by `WorkAppDocsHeader` and `WorkAppDocsSection`) |
| `--cs-work-app-docs-table-header-divider` | `light-dark(color-mix(in oklch, var(--cs-color-base-900) 8.5%, transparent), color-mix(in oklch, var(--cs-color-base-100) 11%, transparent))` | `.cs-work-app-docs-table-wrap` |
| `--cs-work-app-docs-table-divider` | `light-dark(color-mix(in oklch, var(--cs-color-base-900) 5.5%, transparent), color-mix(in oklch, var(--cs-color-base-100) 7%, transparent))` | `.cs-work-app-docs-table-wrap` |

## Examples

### Auto-generated Chapters Inside `WorkAppMain`

```svelte
<script lang="ts">
    import { BookOpen, FolderOpen, Table2 } from "@lucide/svelte";
    import {
        WorkAppDocs,
        WorkAppDocsCallout,
        WorkAppDocsCard,
        WorkAppDocsCardGrid,
        WorkAppDocsChapter,
        WorkAppDocsCode,
        WorkAppDocsContent,
        WorkAppDocsHeader,
        WorkAppDocsKbd,
        WorkAppDocsMark,
        WorkAppDocsSection,
        WorkAppDocsTable,
        WorkAppDocsTableBody,
        WorkAppDocsTableCell,
        WorkAppDocsTableHead,
        WorkAppDocsTableHeaderCell,
        WorkAppDocsTableRow,
        WorkAppDocsTabs,
        WorkAppFrame,
        WorkAppHeader,
        WorkAppMain,
    } from "cs/svelte/work";
</script>

<WorkAppFrame>
    <WorkAppHeader toolName="Holzanalysen" />
    <WorkAppMain>
        <WorkAppDocs defaultChapter="einstieg">
            <WorkAppDocsHeader
                title="Holzanalysen"
                lead="Labor- und Eingangsproben erfassen, prüfen und exportieren."
            />

            <WorkAppDocsTabs />

            <WorkAppDocsContent>
                <WorkAppDocsChapter
                    id="einstieg"
                    title="Einstieg"
                    icon={BookOpen}
                    lead="Die Anwendung arbeitet direkt im lokalen Arbeitsverzeichnis."
                >
                    <p>
                        Die Anwendung mit dem lokalen <WorkAppDocsMark>Arbeitsordner</WorkAppDocsMark>
                        verknüpfen und Messreihen in <WorkAppDocsCode>proben-2026.csv</WorkAppDocsCode>
                        speichern.
                    </p>

                    <WorkAppDocsCallout variant="note" title="Automatische Sicherung">
                        <p>Änderungen werden unmittelbar nach jeder Eingabe fortgeschrieben.</p>
                    </WorkAppDocsCallout>
                </WorkAppDocsChapter>

                <WorkAppDocsChapter id="arbeitsweise" title="Arbeitsweise" icon={FolderOpen}>
                    <WorkAppDocsCardGrid>
                        <WorkAppDocsCard
                            title="Schnelle Erfassung"
                            description="Durchgängige Tastatursteuerung für Wiegescheine."
                        />
                    </WorkAppDocsCardGrid>

                    <WorkAppDocsSection title="Tastenkürzel" level={3}>
                        <p>
                            Mit <WorkAppDocsKbd>Alt</WorkAppDocsKbd> + <WorkAppDocsKbd>N</WorkAppDocsKbd>
                            wird eine neue Probe angelegt.
                        </p>
                    </WorkAppDocsSection>
                </WorkAppDocsChapter>

                <WorkAppDocsChapter id="referenz" title="Referenz" icon={Table2}>
                    <WorkAppDocsTable caption="Grenzwerte">
                        <WorkAppDocsTableHead>
                            <WorkAppDocsTableRow>
                                <WorkAppDocsTableHeaderCell>Parameter</WorkAppDocsTableHeaderCell>
                                <WorkAppDocsTableHeaderCell align="end">Max</WorkAppDocsTableHeaderCell>
                            </WorkAppDocsTableRow>
                        </WorkAppDocsTableHead>
                        <WorkAppDocsTableBody>
                            <WorkAppDocsTableRow>
                                <WorkAppDocsTableCell>Eingangsfeuchte</WorkAppDocsTableCell>
                                <WorkAppDocsTableCell align="end">18 %</WorkAppDocsTableCell>
                            </WorkAppDocsTableRow>
                        </WorkAppDocsTableBody>
                    </WorkAppDocsTable>
                </WorkAppDocsChapter>
            </WorkAppDocsContent>
        </WorkAppDocs>
    </WorkAppMain>
</WorkAppFrame>
```

### Explicit `WorkAppDocsTab`s & Controlled State

```svelte
<script lang="ts">
    import { BookOpen, Table2 } from "@lucide/svelte";
    import {
        WorkAppDocs,
        WorkAppDocsChapter,
        WorkAppDocsContent,
        WorkAppDocsTab,
        WorkAppDocsTabs,
    } from "cs/svelte/work";

    let activeChapter = $state("einstieg");
</script>

<WorkAppDocs bind:activeChapter onChapterChange={(id) => console.log("Chapter:", id)}>
    <WorkAppDocsTabs aria-label="Dokumentationskapitel">
        <WorkAppDocsTab value="einstieg" icon={BookOpen}>Einstieg</WorkAppDocsTab>
        <WorkAppDocsTab value="referenz" icon={Table2}>Referenz</WorkAppDocsTab>
    </WorkAppDocsTabs>

    <WorkAppDocsContent>
        <WorkAppDocsChapter id="einstieg" title="Einstieg">
            <p>Erste Schritte in der Anwendung.</p>
        </WorkAppDocsChapter>
        <WorkAppDocsChapter id="referenz" title="Referenz">
            <p>Felddefinitionen und Grenzwerte.</p>
        </WorkAppDocsChapter>
    </WorkAppDocsContent>
</WorkAppDocs>
```

## Behavior & Quirks

- **Auto-generated vs. explicit tabs:** Leaving `<WorkAppDocsTabs />` empty renders a `SegmentedControlItem` for each mounted `<WorkAppDocsChapter>` in registration order. Pass `<WorkAppDocsTab>` children when you need custom tab order, labels, or disabled items.
- **Unmounted inactive chapters:** `<WorkAppDocsChapter>` conditionally renders its `<section role="tabpanel">` only when `activeChapter === id`, keeping chapter registration active via `$effect` even while inactive.
- **Horizontal tab overflow:** `<WorkAppDocsTabs>` scrolls horizontally with hidden scrollbars and `padding-block: 2px; margin-block: -2px` so focus rings on `SegmentedControlItem` are not clipped.
- **Native HTML styling in `WorkAppDocsContent`:** Plain `<p>`, `<strong>`, `<a>`, `<ul>`, `<ol>`, `<code>`, `<kbd>`, and `<mark>` elements inside `<WorkAppDocsContent>` receive matching typography, spacing, and step-counter styling without requiring wrapper components.
