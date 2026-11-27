---
name: WorkConflictModal
kind: component
import: cs/svelte/work
exports:
  - WorkConflictModal
  - WORK_CONFLICT_KINDS
  - WorkConflictKind
  - WorkConflictPathSegment
  - WorkConflictField
  - WorkConflictSide
  - WorkConflictChoice
  - WorkConflictChoices
  - WorkConflictQueuePosition
  - WorkConflictValueRenderContext
  - WorkConflictFieldRenderContext
  - WorkConflictModalProps
---

# WorkConflictModal

## Overview

Blocking, non-dismissible conflict resolution dialog (`role="dialog" aria-modal="true"`) designed to render inside `<Overlay variant="blur">` when local edits collide with changes on disk. It switches automatically between two layouts:

- **Compact mode (`data-mode="simple"`):** Used when `fields` is omitted, `null`, or empty—handles whole-file conflicts and remote deletions (`remoteDeleted={true}`) with stacked full-width CTAs.
- **Field mode (`data-mode="fields"`):** Used when `fields` contains one or more `WorkConflictField` entries—presents per-field `local` vs. `remote` selection cards inside a `<ScrollArea>` with `scrollFade`, a `<SegmentedControl size="sm" width="equal">` quick-select control (`"Alle: Dein Stand"` / `"Alle: Aktueller Stand"`, shown when `fields.length >= 3`), and a gated apply CTA.

### Architectural Decoupling

`src/work/conflict-modal/` has zero runtime or type imports from `src/modules/file-system/`. Its `WorkConflictField` and `WorkConflictChoices` shapes are structurally compatible with `JsonFieldConflict` and `Record<string, ConflictChoice>` from `cs/svelte/file-system`, so `workspace.unresolvedConflicts` can be wired directly without adapter code.

## API

### `WorkConflictModal`

Root dialog container (`<div role="dialog" aria-modal="true" class="cs-work-conflict-modal">`) extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | No | `null` | Root `.cs-work-conflict-modal` element reference. |
| `conflictKey` | `string \| number \| null` | No | `undefined` | Identity key for the active conflict; changing it resets per-field selections and list scroll position. |
| `resourceLabel` | `string \| null` | No | `undefined` | File path or record label rendered inside the resource pill. |
| `title` | `string` | No | Mode-dependent localized default | Overrides the default heading (`"Änderungskonflikt"`, `"Eintrag gelöscht"`, or `"Änderungen abgleichen"`). |
| `description` | `string` | No | Mode-dependent localized default | Overrides the default subtitle copy. |
| `localLabel` | `string` | No | `"Dein Stand"` / `"Your version"` | Source label shown on the local option card in field mode. |
| `remoteLabel` | `string` | No | `"Aktueller Stand"` / `"Current version"` | Source label shown on the remote option card in field mode. |
| `remoteDeleted` | `boolean` | No | `false` | Switches compact mode to the negative deletion motif and replaces the secondary CTA with **"Löschung übernehmen"**. |
| `fields` | `readonly WorkConflictField[] \| null` | No | `undefined` | Conflicting fields. Non-empty arrays activate field mode (`data-mode="fields"`). |
| `defaultChoice` | `WorkConflictSide \| null` | No | `null` | Optional initial side (`"local"` or `"remote"`) pre-selected for all fields whenever a conflict loads. |
| `showBaseValue` | `boolean` | No | `false` | Displays a `"Vorher:"` / `"Before:"` line above each field's options when `field.baseValue !== undefined`. |
| `queuePosition` | `WorkConflictQueuePosition \| null` | No | `null` | Shows a `{current} von {total}` pill when `total > 1`. |
| `busy` | `boolean` | No | `false` | Disables all option cards and action buttons and sets `data-busy`. |
| `errorMessage` | `string \| null` | No | `undefined` | Optional inline error banner (`role="alert"`), e.g. after a failed save or re-conflict. |
| `onKeepLocal` | `() => void \| Promise<void>` | No | `undefined` | Triggered by **"Eigenen Stand behalten"** in compact mode (and in field mode only if `onApplyChoices` is omitted and all fields are `"local"`). |
| `onKeepRemote` | `() => void \| Promise<void>` | No | `undefined` | Triggered by **"Aktuellen Stand übernehmen"** / **"Löschung übernehmen"** in compact mode (and in field mode only if `onApplyChoices` is omitted and all fields are `"remote"`). |
| `onApplyChoices` | `(choices: WorkConflictChoices) => void \| Promise<void>` | No | `undefined` | Triggered by the primary apply CTA in field mode once every field has a choice. |
| `renderValue` | `Snippet<[WorkConflictValueRenderContext]>` | No | `undefined` | Custom renderer for option card values (`{ field, side, value, selected }`). |
| `renderField` | `Snippet<[WorkConflictFieldRenderContext]>` | No | `undefined` | Full custom renderer for an entire field row (`{ field, label, choice, choose, disabled }`). |

- **Exported Method:** `nudge(): void` — Applies `data-blocked` for `320ms` to play the attention shake animation on blocked dismiss attempts or in-place re-conflicts.
- **DOM Attributes:** `data-mode="simple" | "fields"`, `data-remote-deleted` (compact mode when `remoteDeleted` is truthy), `data-busy` (when `busy` is truthy), `data-blocked` (during `nudge()`).

### Supporting Types & Constants

- `WORK_CONFLICT_KINDS`: `["value-mismatch", "delete-edit", "type-mismatch", "duplicate-array-key"] as const`
- `WorkConflictKind`: `(typeof WORK_CONFLICT_KINDS)[number]`
- `WorkConflictPathSegment`: `{ kind: "prop"; key: string } | { kind: "index"; index: number } | { kind: "array-item"; keyField: string; keyValue: string | number }`
- `WorkConflictField`: `{ id: string; label?: string; path?: readonly (string | number)[]; segments?: readonly WorkConflictPathSegment[]; pointer?: string; conflictKind?: WorkConflictKind; baseValue?: unknown; localValue?: unknown; remoteValue?: unknown }`
- `WorkConflictSide`: `"local" | "remote"`
- `WorkConflictChoice`: `WorkConflictSide | { custom: unknown }`
- `WorkConflictChoices`: `Record<string, WorkConflictChoice>`
- `WorkConflictQueuePosition`: `{ current: number; total: number }`
- `WorkConflictValueRenderContext`: `{ field: WorkConflictField; side: WorkConflictSide; value: unknown; selected: boolean }`
- `WorkConflictFieldRenderContext`: `{ field: WorkConflictField; label: string; choice: WorkConflictChoice | undefined; choose: (choice: WorkConflictChoice) => void; disabled: boolean }`

### CSS Custom Properties

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `--cs-work-conflict-modal-bg` | `var(--cs-color-elevated)` | Surface background and badge cutout ring. |
| `--cs-work-conflict-modal-fg` | `var(--cs-color-text-main)` | Base text color. |
| `--cs-work-conflict-modal-shadow` | `var(--cs-shadow-floating)` | Floating shadow. |
| `--cs-work-conflict-modal-radius` | `28px` | `24px` below `640px`. |
| `--cs-work-conflict-modal-squircle` | `var(--cs-squircle)` | `corner-shape` superellipse. |
| `--cs-work-conflict-modal-padding` | `32px` | `28px` in `fields` mode; `20px` below `640px`. |
| `--cs-work-conflict-modal-max-width` | `460px` / `560px` | Defaults to `460px` (`simple`) or `560px` (`fields`); `100%` below `640px`. |
| `--cs-work-conflict-halo-bg` | `var(--cs-color-caution-soft)` | Compact hero halo fill (`--cs-color-negative-soft` on `data-remote-deleted`). |
| `--cs-work-conflict-sheet-stroke` | `var(--cs-color-caution-soft-fg)` | Compact SVG sheet stroke (`--cs-color-negative-soft-fg` on `data-remote-deleted`). |
| `--cs-work-conflict-sheet-bg` | `color-mix(in oklab, var(--cs-color-caution-solid) 12%, var(--cs-color-elevated))` | Compact front-sheet fill (`10%` negative solid on `data-remote-deleted`). |
| `--cs-work-conflict-badge-bg` | `var(--cs-color-caution-solid)` | Compact satellite badge fill (`--cs-color-negative-solid` on `data-remote-deleted`). |
| `--cs-work-conflict-badge-fg` | `var(--cs-color-caution-solid-fg)` | Compact satellite badge glyph color (`--cs-color-negative-solid-fg` on `data-remote-deleted`). |

## Examples

### Wiring with `cs/svelte/file-system`

```svelte
<script lang="ts">
    import { applyConflictChoices, createFileSystemWorkspace } from "cs/svelte/file-system";
    import { Overlay } from "cs/svelte/overlay";
    import { WorkConflictModal, type WorkConflictChoices } from "cs/svelte/work";

    const workspace = createFileSystemWorkspace({ namespace: "holzanalysen" });

    let modalRef = $state<{ nudge: () => void } | null>(null);
    let resolving = $state(false);
    let errorMessage = $state<string | null>(null);

    const activeConflict = $derived(workspace.unresolvedConflicts[0] ?? null);
    const queuePosition = $derived(
        workspace.unresolvedConflictCount > 1
            ? { current: 1, total: workspace.unresolvedConflictCount }
            : null,
    );

    async function runResolution(action: () => Promise<unknown>): Promise<void> {
        resolving = true;
        errorMessage = null;
        try {
            await action();
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Konflikt konnte nicht gespeichert werden.";
            modalRef?.nudge();
        } finally {
            resolving = false;
        }
    }

    function handleKeepLocal(): Promise<void> {
        if (!activeConflict) return Promise.resolve();
        const conflictId = activeConflict.id;
        return runResolution(() => workspace.resolveConflict(conflictId, "keep-local"));
    }

    function handleKeepRemote(): Promise<void> {
        if (!activeConflict) return Promise.resolve();
        const conflictId = activeConflict.id;
        return runResolution(() => workspace.resolveConflict(conflictId, "keep-remote"));
    }

    function handleApplyChoices(choices: WorkConflictChoices): Promise<void> {
        if (!activeConflict?.threeWay) return Promise.resolve();
        const conflict = activeConflict;
        const merged = applyConflictChoices(conflict.threeWay, choices);
        return runResolution(() => workspace.resolveConflict(conflict.id, "apply-custom", merged));
    }
</script>

{#if activeConflict}
    <Overlay
        variant="blur"
        onclick={(event) => {
            if (event.target === event.currentTarget) {
                modalRef?.nudge();
            }
        }}
    >
        <WorkConflictModal
            bind:this={modalRef}
            conflictKey={activeConflict.id}
            resourceLabel={activeConflict.path}
            remoteDeleted={activeConflict.remote === undefined}
            fields={activeConflict.threeWay?.conflicts}
            {queuePosition}
            busy={resolving || workspace.isBusy}
            {errorMessage}
            onKeepLocal={handleKeepLocal}
            onKeepRemote={handleKeepRemote}
            onApplyChoices={handleApplyChoices}
        />
    </Overlay>
{/if}
```

### Custom Value Rendering

```svelte
<script lang="ts">
    import { WorkConflictModal, type WorkConflictValueRenderContext } from "cs/svelte/work";

    const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
</script>

{#snippet renderCurrency({ value }: WorkConflictValueRenderContext)}
    {typeof value === "number" ? eur.format(value) : String(value)}
{/snippet}

<WorkConflictModal
    resourceLabel="kalkulation-2026.xlsx"
    fields={[{ id: "total", label: "Zelle D14 – Gesamtpreis", localValue: 14_850, remoteValue: 15_200 }]}
    renderValue={renderCurrency}
    onApplyChoices={(choices) => console.log(choices)}
/>
```

## Behavior & Quirks

- **Focus trap & `Escape` handling:** `<WorkConflictModal />` attaches `focusTrap` whenever it is rendered inside `.cs-overlay`. Backdrop `pointerdown` events on the enclosing `.cs-overlay` are allowed through so `Overlay.onclick` can call `modalRef?.nudge()`; pressing `Escape` also calls `nudge()` instead of dismissing.
- **Per-field keyboard navigation:** Each field renders as `role="radiogroup"` containing two `role="radio"` buttons with roving `tabindex`. Pressing `ArrowRight` or `ArrowDown` selects `"remote"` and moves focus; `ArrowLeft` or `ArrowUp` selects `"local"` and moves focus.
- **Label & value fallbacks:** Field labels resolve in order: `field.label` → `field.segments` → `field.path` → `field.pointer` → humanized `field.id`. Built-in formatting renders `undefined` as `"Gelöscht"` / `"Removed"` (`data-state="deleted"`), `null` or empty strings/collections as `"Leer"` / `"Empty"` (`data-state="empty"`), booleans as `"Ja"` / `"Nein"` (`"Yes"` / `"No"`), and compact inline summaries for short arrays and flat objects.
- **Preserving auto-merged sibling fields:** In field mode, when `onApplyChoices` is provided, the primary CTA always invokes `onApplyChoices(choices)`—even when every field is set to `"local"` or `"remote"`—so non-conflicting sibling fields already merged in `threeWay.merged` are kept intact. `onKeepLocal` / `onKeepRemote` are only used as fallbacks in field mode if `onApplyChoices` is omitted.
- **Re-conflict recovery & queue transitions:** Updating `conflictKey` or `fields` resets internal selections back to `defaultChoice` and resets the field list scroll position to `0`. If saving a resolution encounters a newer remote revision, update `conflictKey` and `fields` in place, pass an inline `errorMessage`, and call `modalRef?.nudge()`.
- **Overlay transitions:** Entry and exit transitions (`opacity`, `scale`, `translate`) are scoped to `.cs-overlay:popover-open`.
