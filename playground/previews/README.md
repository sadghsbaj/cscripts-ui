# Playground Previews

Guidelines and structure for component previews under `playground/previews/svelte/`.

---

## 1. Shared Building Blocks (`playground/components/`)

Every standard preview should compose the shared UI helpers from `../../components/index.ts`:

- **`PreviewHeader`:** Compact page header (`title` + optional one-sentence `description`). Omit `PreviewHeader` for full-bleed layout/app previews (e.g. `WorkAppIntroPreview`) where a title header would look out of place.
- **`PreviewSection`:** Vertical showcase block (`title`, optional `description`, `bg-elevated` stage, and an optional embedded `CodeBlock` below).
- **`CodeBlock`:** Standalone or embedded Shiki-highlighted code block with one-click copy (`CopyIcon` + `copyOnClick`).

---

## 2. Module Exports & Categories

Each preview file exports metadata in `<script module>`:

```svelte
<script module>
    export const id = "button";
    export const label = "Button";
    export const category = "primitives" as const;
</script>
```

Supported categories (`PreviewCategory`):
- `"primitives"` — Core UI primitives (`Button`, `Checkbox`, `Tooltip`, ...)
- `"attachments"` — Svelte attachments & behaviors (`clickOutside`, `focusTrap`, `scrollFade`, ...)
- `"work"` — Work-specific application components (`WorkAppIntro`, ...)

---

## 3. Layout & Authoring Rules

- **Vertical flow:** Stack `PreviewSection` blocks vertically (`<div class="flex flex-col gap-10">`) instead of multi-column card grids.
- **Start simple:** Lead with a minimal `"Basic"` section (single default instance + `import` snippet), followed by focused sections for variants, sizes, states, and edge cases.
- **Keep code snippets exact:** Ensure the rendered demo markup and the `code` string passed to `PreviewSection` match 1:1.

---

## 4. Language Policy

- **English by default:** All playground chrome (sidebar, theme/sidebar toggles, copy tooltips) and all preview headings, descriptions, button labels, tooltips, and `aria-label` attributes **MUST be in English**.
  - Example `PreviewHeader` description: `"A clickable button primitive with semantic variants, sizes, and icon support."` (max 1 concise sentence).
- **Work-component exception:** Components built specifically for internal work apps (`src/svelte/work/*`, `category = "work"`) keep their **German** internal UI copy, labels, and tooltips (e.g. German help/status tooltips inside work app frames). Any surrounding preview metadata/headings remain English.
