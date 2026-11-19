# 03 · Filter Bar

## Intent

Single-row `36px` toolbar on `bg-canvas` combining live search, primary status segmentation, and a secondary filter/sort `Dropdown`, paired with a collapsible active-filters chip row and a minimal `elevated` results card.

## Used Modules

- `cs/svelte/text-input` (`TextInput`, `TextInputIcon`, `TextInputField`, `TextInputAction`)
- `cs/svelte/segmented-control` (`SegmentedControl`, `SegmentedControlItem`, `SegmentedControlLabel`)
- `cs/svelte/dropdown` (`Dropdown`, `DropdownContent`, `DropdownCheckboxItem`, `DropdownSeparator`, `DropdownGroupLabel`, `DropdownRadioGroup`, `DropdownRadioItem`, `dropdownTrigger`)
- `cs/svelte/button` (`Button`, `ButtonIcon`, `ButtonLabel`)
- `cs/svelte/chip` (`ChipGroup`, `Chip`, `ChipLabel`, `ChipRemove`)
- `cs/svelte/card` (`Card`, `CardBody`)

## Key Patterns

- **Proportional `36px` Toolbar:** `TextInput size="md"`, `SegmentedControl size="md" width="content"`, and `Button size="md"` share an exact `36px` height directly on `bg-canvas` without an outer toolbar card.
- **Secondary Facets & Sort:** `Dropdown placement="bottom-end"` groups secondary `DropdownCheckboxItem` facets (`Owner: Me`, `Priority: High`) above a `DropdownRadioGroup` for sort order (`Recently updated`, `Title`).
- **Collapsible Active Filters Row:** A CSS Grid `0fr -> 1fr` disclosure (`inert={!hasActiveFilters}`, `overflow-x: visible; overflow-y: clip; min-height: 0;`) reveals monochrome `ChipGroup size="sm" variant="soft"` chips only for secondary dropdown facets (`ownerOnly`, `highPriority`), never duplicating search or status state.
- **Minimal Results Context:** `Card variant="elevated" size="md"` renders live-filtered rows with `divide-y divide-base-soft` and plain typography, switching to a centered empty state with `Reset filters` when zero items match.

## States

- **Default:** Empty search, `All` status selected, no secondary filters active (chip row collapsed and `inert`).
- **Filtered:** Secondary facet active (`ownerOnly` or `highPriority`), expanding the active-filters chip row with individual `<ChipRemove>` buttons and a `Clear` action.
- **Disabled:** Disables toolbar inputs, segmented control, dropdown trigger, chips, and reset action while preserving layout.
