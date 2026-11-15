# ToggleButtonGroup `:active` Press Design

## 1. Problem with Surface Squash/Scale Inside Groups

On a standalone `ToggleButton`, squashing `::before` / `::after` (or scaling the host on `:focus-visible:active`) feels organic because the pill stands alone.

Inside `ToggleButtonGroup`, adjacent buttons meet seamlessly with `0px` inner radii and `1px` `ToggleButtonGroupSeparator` lines. Scaling or squashing the button surface breaks that flush alignment and creates an uneven gap against neighboring segments on press.

---

## 2. New Pattern: Stationary Surface, Inner-Content Press

Keep the outer surface (`::before`, `::after`, and host) completely stationary (`scale: 1`) for **all** items in the group, and apply a subtle inward scale to the **inner content only** (`.cs-toggle-button-icon`, `.cs-toggle-button-label`):

1. **Neutralize surface scale on all group items** in [ToggleButtonGroup.svelte](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/toggle-button-group/ToggleButtonGroup.svelte):
   - Set `--cs-toggle-button-squash-active: 1;` and `--cs-toggle-button-focus-scale-active: 1;` on `.cs-toggle-button-group > :global(.cs-toggle-button)` (previously this was only applied to `[data-fixed-selection] > [aria-pressed="true"]`).
   - Note: `ToggleButton` already bridges `--cs-toggle-button-squash-active` and `--cs-toggle-button-focus-scale-active` into `--cs-button-control-*`.
2. **Press-scale inner content only:**
   - Resting state on `.cs-toggle-button-group > :global(.cs-toggle-button) > :global(:is(.cs-toggle-button-icon, .cs-toggle-button-label))`:
     - `scale: 1;`
     - `transition: scale var(--cs-dur-effect) var(--cs-ease-effect);`
   - Active press (`.cs-toggle-button:active:not(:disabled)`):
     - `scale: 0.94;`
     - `transition: scale var(--cs-dur-press) var(--cs-ease-press);`
3. **Keep fixed-selection no-op guard:**
   - On `&[data-fixed-selection] > :global(.cs-toggle-button[aria-pressed="true"]:active)`, do **not** scale inner content (`scale: 1`), because clicking an already-active item in a fixed single-selection group is a no-op.
4. **Why this pairs cleanly with the `::after` pop:**
   - Holding pointer down gives immediate tactile feedback (content sinks slightly inward while group edges stay flush).
   - Releasing pointer rebounds the content (`--cs-dur-effect` / `--cs-ease-effect`) in sync with `ToggleButton`'s `::after` pop-in.
