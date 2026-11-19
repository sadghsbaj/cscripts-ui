# 06 · Task List

## Intent

Compact daily task checklist card pairing an `elevated` surface container with clickable `<label>` rows, `soft` checkboxes, a live morphing completion counter, and smooth inline status transitions.

## Used Modules

- `cs/svelte/card` (`Card`, `CardBody`)
- `cs/svelte/checkbox` (`Checkbox`)
- `cs/svelte/number-morph` (`NumberMorph`)
- `cs/svelte/text-morph` (`TextMorph`)

## Key Patterns

- **Outside Header & Live Counter:** A `title-sm` heading sits outside `Card variant="elevated" size="lg"` opposite a `tabular-nums` completion readout (`<NumberMorph value={doneCount} willChange /> of {tasks.length} done`).
- **Full-Row `<label>` Hit Target:** Each `divide-y divide-base-soft` row wraps `<Checkbox variant="soft" size="sm" />`, the task title, and the right-aligned status inside a `<label>` so clicking anywhere on the row toggles completion without extra wrapper hit-area DOM.
- **Calm Completion Styling:** Completed titles step down from `text-strong` to `text-weak` via `--cs-dur-effect-fast` / `--cs-ease-effect` rather than using `line-through` or `truncate` (preserving `text-trim` descenders).
- **Morphing Status Label:** `<TextMorph text={task.done ? "Done" : "Open"} />` transitions inline between `"Open"` and `"Done"` without `overflow: hidden` clipping.

## States

- **Active:** Interactive task rows with a live `NumberMorph` done counter and `TextMorph` row status updates.
- **All done:** Every task checked, demonstrating the `5 of 5 done` counter and calm `text-weak` row hierarchy.
- **Disabled:** All checkboxes, titles, and status labels switch to `--cs-color-disabled-fg` / disabled control styling while preserving layout.
