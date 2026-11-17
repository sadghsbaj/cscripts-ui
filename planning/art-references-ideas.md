# Art References – Idea List

Goal: (a) check by eye whether components harmonize in a layout, (b) provide reference compositions for future coding agents. Static/visual only, no real functionality. Ideas only, no prescriptions on look or which components to use.

Existing: Badge, Button, ButtonMorph, Card, Checkbox(Group), CloseButton, Kbd, Overlay, Popover, Progress, ScrollArea, SegmentedControl, Switch(Group), TextArea, TextInput, Toast, ToggleButton(Group), Tooltip.
Planned: Chip (removable badge, for multi-select, combobox, filter bar, tag input), Modal, Select, Dropdown, Combobox, ContextMenu, Sidebar, Color Picker, Autoresize, Animated Charts, NLP Parser, Number Animations, Text Morph, Number Stepper.

## A) Small compound patterns (10)

1. **Login form**: inputs, "Remember me", primary/secondary action, error state.
2. **Settings row**: label + description + switch; stacked as a settings group.
3. **Filter bar**: search, segment toggle, select, active filters as badges.
4. **Confirmation dialog**: destructive and neutral variants side by side.
5. **Number stepper toolbar**: zoom −/+, size steps, reset, animated percentage readout.
6. **Upload / progress item**: file name, progress, cancel, done state (text morph).
7. **Tag / recipient input**: combobox with suggestions and selected entries.
8. **Task list**: checkbox rows, "Open → Done" toggle via text morph, counter.
9. **Pricing / plan picker**: billing-period segmented control, plan options, feature list with badges, call-to-action.
10. **Comment composer**: auto-resizing textarea, attachment/emoji actions, keyboard hint (Kbd), send button with loading state.

## B) Large scenarios (3 + bonus)

1. **Email client**: sidebar (folders), message list, reading pane, reply editor with autoresize, context menu, toasts.
2. **Analytics dashboard**: KPI cards with number animation, animated charts, date-range segment, filter dropdowns, table.
3. **Settings / admin area**: sidebar navigation, many form sections, switch groups, save bar, modal.
4. Bonus: **Kanban project board** with cards, badges, dropdowns, drag state.
5. Bonus: **Chat / assistant with NLP parser**: input is parsed live into recognized date/place tokens.
6. Bonus: **Design / editor tool**: color picker, stepper, layer sidebar, properties panel.

## Notes for building the references

- Show each composition in several states: empty, normal, full, error, disabled, light/dark.
- Show density variants (sm/md/lg) side by side to check rhythm and spacing.
- Use placeholder data so each scenario works as a reference for agents.
