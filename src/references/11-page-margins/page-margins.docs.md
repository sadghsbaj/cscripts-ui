# 11 · Page Margins

## Intent

Compact page-margin popover panel on `bg-canvas` pairing an `elevated` floating card, a preset `Select`, a live A4 paper preview with active-side coupling, and a 2×2 `cm` numeric input grid.

## Used Modules

- `cs/svelte/button` (`Button`, `ButtonIcon`)
- `cs/svelte/card` (`Card`)
- `cs/svelte/hit-area` (`HitArea`)
- `cs/svelte/select` (`Select`, `SelectContent`, `SelectItem`, `SelectItemText`, `SelectTrigger`, `SelectValue`)
- `cs/svelte/text-input` (`TextInput`, `TextInputField`, `TextInputIcon`)
- `cs/svelte/tooltip` (`tooltip`)

## Key Patterns

- **3-Zone Floating Card:** `Card variant="elevated" size="md"` (`w-[288px]`) overrides `--cs-card-shadow` (`--cs-shadow-floating`), `--cs-card-radius` (`24px`), `--cs-card-padding` (`16px`), `--cs-card-gap` (`14px`), and `--cs-card-squircle` (`--cs-squircle`) to stack: (1) a header row with a `Select variant="soft" size="sm"` preset picker, (2) a `168px`-tall `.cs-page-margins-well` paper stage (`aria-hidden="true"`), and (3) a `grid-cols-2` margin input grid.
- **Proportional A4 Paper Stage & Active-Side Coupling:** The `100px × 141px` `.cs-page-margins-sheet` (`bg-elevated`) converts bindable `top`, `bottom`, `left`, and `right` values (clamped `0–6 cm`) into CSS percentages over `29.7 cm` (vertical) and `21 cm` (horizontal). Those percentages drive the `.cs-page-margins-content` skeleton block, four `1px` `.cs-page-margins-guide` hairlines, and four `.cs-page-margins-strip` overlays with `--cs-dur-240` / `--cs-spring-snappy` transitions. `activeSide` (`hoveredSide ?? focusedSide`) sets `data-active` on the matching strip (`--cs-color-accent-soft`) and guide (`--cs-color-accent-solid`).
- **Preset Sync & Validation:** `activePreset` is derived from `{ top, bottom, left, right }` against `PRESETS` (`normal`: `2.5 cm`, `narrow`: `1.27 cm`, `wide`: `2.5 / 3.5 cm`) within `1e-6`, falling back to disabled `"custom"` when values diverge or any side is invalid. `parseMarginInput` accepts `,` or `.` decimal separators and `isMarginInRange` enforces `0–6 cm`; out-of-range numeric drafts clamp the bound value for the paper preview while flagging `invalidSides[side]`, and valid drafts format to at most 2 decimals on blur.
- **Conditional Reset Action:** A `Button variant="ghost" size="xs" iconOnly` (`RotateCcw` + `HitArea size="sm"`) fades and scales in via `[data-visible]` when `isModified` (`activePreset !== "normal"`), with `tabindex` and the `"Reset to Normal"` `tooltip` gated on `isModified`.

## States

- **Normal (Default):** Initializes with `Normal` preset (`2.5 cm` on all four sides), reset button hidden (`aria-hidden="true"`, `tabindex={-1}`), and neutral hairline guides.
- **Modified / Custom:** Editing any side away from `Normal` reveals the reset button; non-preset combinations display `"Custom"` in the `Select` trigger.
- **Active Side:** Hovering a `TextInput` or focusing a `TextInputField` highlights the corresponding margin strip and guide in accent tokens (hover takes precedence over focus).
- **Invalid:** Non-numeric, empty, or out-of-range (`< 0` or `> 6`) input sets `invalid` on that side's `TextInput` and forces `activePreset` to `"custom"`.
