# 02 · Settings Row

## Intent

Grouped notification preferences card pairing an `elevated` surface container with native `Switch` rows and a collapsible dependent `Select` sub-row for quiet hours.

## Used Modules

- `cs/svelte/card` (`Card`, `CardBody`)
- `cs/svelte/switch` (`Switch`)
- `cs/svelte/select` (`Select`, `SelectTrigger`, `SelectContent`, `SelectItem`)

## Key Patterns

- **Section & Surface:** An outside `title-sm` heading sits above `Card variant="elevated" size="lg"` on `bg-canvas`, with `divide-y divide-base-soft` and `py-3.5 first:pt-0 last:pb-0` preserving the `24px` outer card padding.
- **Clickable Row `<label>`:** Each `Switch` row wraps its label, optional `description-sm` hint, and `<Switch size="md">` inside a `<label>` for full-row hit targeting without wrapper hit-area DOM.
- **Dependent Sub-Row Disclosure:** Toggling `Push alerts` animates the `Quiet hours` sub-row via CSS Grid `0fr -> 1fr` (`inert={!pushAlerts}`, `overflow-x: visible; overflow-y: clip; min-height: 0;`) using `--cs-dur-enter-sm` / `--cs-ease-enter` and `--cs-dur-exit-sm` / `--cs-ease-exit`.
- **Focus Ring Clearance:** `pb-1` on the sub-row inner container prevents `:focus-visible` outlines on `<SelectTrigger>` from being clipped at the bottom edge.
- **Label & Select Wiring:** A unique `$props.id()` connects `<label for={quietHoursId}>` to `<SelectTrigger id={quietHoursId} class="w-32" />` with `SelectContent width="min-anchor"`.

## States

- **Normal:** Interactive `Switch` rows and `Quiet hours` `Select` (collapsing and becoming `inert` when `Push alerts` is off).
- **Disabled:** All switches, `Select`, and row labels switch to `--cs-color-disabled-fg` / disabled control styling while preserving layout.
