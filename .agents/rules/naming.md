---
trigger: always_on
---

# Rule: Naming Conventions & Dictionary

<meta>
  <scope>Files, folders, CSS variables, classes, DOM attributes, and TypeScript/Svelte APIs</scope>
  <applies_to>**/src/**, **/playground/**, **/template/**</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Names must reveal role and visibility at a glance without relying on folder splitting (`components/` vs `attachments/`).
  - One canonical term per concept across CSS, TypeScript, and documentation. Never mix abbreviations with full words for the same slot.
  - Internal implementation files must be visibly marked and never exported through a module's `index.ts`.
</principles>

<patterns>
  <files_and_folders>
    - Module folders (`src/modules/<name>/`): `kebab-case` (`button/`, `toggle-button/`, `click-outside/`).
    - Suffix order: `<name>[.internal][.<kind>].<ext>`.
    - UI Component: `PascalCase.svelte` (`Button.svelte`, `ToggleButtonIcon.svelte`).
    - Preview: `PascalCase.preview.svelte` (`Button.preview.svelte`).
    - Documentation: `kebab-case.docs.md` (`button.docs.md`).
    - Blueprint: `kebab-case.blueprint.md` (`switch.blueprint.md`).
    - Design spec: `kebab-case.design.md` (`button.design.md`).
    - Attachment: `kebab-case.attach.ts` (`click-outside.attach.ts`).
    - Reactive Svelte state/runes: `kebab-case.svelte.ts` (`theme.svelte.ts`, `button-morph.svelte.ts`).
    - Plain TypeScript / barrel: `kebab-case.ts` (`index.ts`, `utils.ts`).
    - CSS files: `kebab-case.css` (`color-semantics.css`).
    - Tests: `*.test.ts` or `*.svelte.test.ts`.
    - Internal files: `.internal.` infix before kind/extension (`Sparkle.internal.svelte`, `focus-helper.internal.attach.ts`).
  </files_and_folders>

  <css>
    - Foundation tokens: `--cs-<category>-<name>` (e.g. `--cs-color-negative-solid`, `--cs-radius-md`, `--cs-dur-hover`).
    - Module variables: `--cs-<module>-<property>[-<state>]` (e.g. `--cs-button-fg`, `--cs-button-bg-hover`).
    - Classes: `.cs-<module>` and subparts `.cs-<module>-<part>` (e.g. `.cs-button`, `.cs-button-icon`).
  </css>

<dom_attributes> - Boolean states: `data-<state>={value ? "" : undefined}` (`data-disabled`, `data-invalid`, `data-icon-only`). - Enum props: `data-<prop>={value}` (`data-variant`, `data-size`, `data-width`).
</dom_attributes>

<typescript_and_svelte> - Option arrays: `UPPER_SNAKE_CASE` (`BUTTON_VARIANTS`, `BUTTON_SIZES`). - Exported types/interfaces: `PascalCase` (`ButtonProps`, `ButtonVariant`, `ButtonSize`). - Props, attachment options, and functions: `camelCase`.
</typescript_and_svelte>
</patterns>

<dictionary>
| Domain | Canonical | Forbidden Aliases | Example |
| :--- | :--- | :--- | :--- |
| Surface fill | `bg` | `background`, `fill`, `surface` | `--cs-button-bg`, `--cs-color-disabled-bg` |
| Text / icon color | `fg` | `foreground`, `text`, `color` (for slot) | `--cs-button-fg`, `--cs-color-accent-solid-fg` |
| Shadow / elevation | `shadow` | `elevation`, `dropShadow`, `boxShadow` | `--cs-shadow-solid`, `--cs-button-shadow` |
| Corner rounding | `radius` | `rounded`, `corner`, `borderRadius` | `--cs-radius-md`, `--cs-button-radius` |
| Motion timing | `dur` / `ease` / `spring` | `duration`, `time`, `timing` | `--cs-dur-hover`, `--cs-ease-quad-out` |
| T-shirt scale | `size` | `sz`, `scale` | `size="md"`, `data-size="md"` |
| Layout / anchor width | `width` | `size` (when not T-shirt) | `Popover width="anchor"` |
| Semantic status | `positive`, `caution`, `negative` | `success`, `warning`, `danger`, `error`, `info` | `--cs-color-negative-solid` |
| Disabled state | `disabled` | `isDisabled`, `inactive` | `disabled?: boolean` |
| Validation error | `invalid` | `error`, `hasError`, `isInvalid` | `invalid?: boolean`, `data-invalid` |
| Toggle / check state | `checked`, `pressed`, `open` | `isChecked`, `active`, `isPressed`, `isOpen`, `visible` | `pressed = $bindable()` |
| DOM element binding | `ref` | `el`, `element`, `node` | `ref = $bindable()` |
| Secondary right-aligned text | `trailing` | `detail`, `meta`, `value` | `CommandPaletteItemTrailing`, `--cs-command-palette-trailing-fg` |
</dictionary>

<constraints>
  - MUST NOT use `--_` private CSS variable prefixes; use `--cs-<module>-*` instead.
  - MUST NOT re-export any `*.internal.*` file from a module's `index.ts`.
  - MUST NOT use `size` for non-T-shirt values (e.g. `anchor`, `content`); use `width` or a domain-specific prop.
  - MUST NOT introduce synonyms for terms already defined in `<dictionary>`.
</constraints>
