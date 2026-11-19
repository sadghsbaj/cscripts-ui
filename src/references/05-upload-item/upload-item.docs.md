# 05 · Upload Item

## Intent

Grouped file upload queue card pairing live progress bars, tabular morphing status text, and row-level cancel/retry actions with a smooth collapsible completion transition.

## Used Modules

- `cs/svelte/card` (`Card`, `CardBody`)
- `cs/svelte/progress` (`Progress`)
- `cs/svelte/text-morph` (`TextMorph`)
- `cs/svelte/button` (`Button`, `ButtonLabel`)
- `cs/svelte/hit-area` (`HitArea`)

## Key Patterns

- **Section & Surface:** An outside `title-sm` heading sits above `Card variant="elevated" size="lg"` on `bg-canvas`, with `divide-y divide-base-soft` and `py-3.5 first:pt-0 last:pb-0` preserving outer card padding.
- **Stable Header & Action Swap:** A `min-h-6` header row pairs a truncating filename (`min-w-0 truncate`) with a `shrink-0` action slot (`Cancel` ghost `xs` button while uploading, `Retry` tertiary `xs` button on error, `Done` label when complete), each compact button paired with `<HitArea size="md" />`.
- **Morphing Tabular Metadata:** `<TextMorph text={metaText} tabular />` smoothly animates percentage updates and status copy transitions (`4.2 MB, 62%` -> `4.2 MB, Complete` / `Upload failed`) without `overflow: hidden` clipping.
- **Collapsible Progress Bar:** `<Progress appearance="bar" variant="soft" size="sm" />` reveals and collapses via CSS Grid `0fr -> 1fr` (`inert={item.status === "done"}`) using `--cs-dur-enter-sm` / `--cs-ease-enter` and `--cs-dur-exit-sm` / `--cs-ease-exit`.

## States

- **Active:** Live uploading row (`accent` progress bar, `Cancel` action, tabular percentage morphing) alongside completed items.
- **Error:** Failed row switches the progress bar to `color="negative"`, metadata to `--cs-color-negative-soft-fg` (`Upload failed`), and action to `Retry`.
- **Complete:** Progress bar collapses cleanly via `0fr` grid transition, metadata morphs to `<size>, Complete`, and the action slot settles to `Done`.
