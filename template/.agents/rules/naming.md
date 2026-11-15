---
trigger: always_on
---

# Rule: Naming Conventions & Dictionary

<meta>
  <scope>Files, folders, CSS variables, classes, DOM attributes, and TypeScript/Svelte APIs</scope>
  <applies_to>**/src/**</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Names must reveal role and visibility at a glance without relying on folder splitting (`components/` vs `attachments/`).
  - One canonical term per concept across CSS, TypeScript, and documentation. Never mix abbreviations with full words for the same slot.
  - Internal implementation files must be visibly marked and never re-exported through a feature's barrel `index.ts`.
</principles>

<patterns>
  <files_and_folders>
    - App source areas (`src/core/`, `src/features/`, `src/shared/`, `src/lab/`): feature folders use `kebab-case` (`user-profile/`, `click-outside/`).
    - Suffix order: `<name>[.internal][.<kind>].<ext>`.
    - UI Component: `PascalCase.svelte` (`AppHeader.svelte`, `FilterBar.svelte`).
    - Attachment: `kebab-case.attach.ts` (`click-outside.attach.ts`).
    - Reactive Svelte state/runes: `kebab-case.svelte.ts` (`session.svelte.ts`, `filters.svelte.ts`).
    - Plain TypeScript / barrel: `kebab-case.ts` (`index.ts`, `utils.ts`).
    - CSS files: `kebab-case.css` (`layout.css`).
    - Tests: `*.test.ts` or `*.svelte.test.ts`.
    - Internal files: `.internal.` infix before kind/extension (`RowActions.internal.svelte`, `focus-helper.internal.attach.ts`).
  </files_and_folders>

  <css>
    - Library namespace: `--cs-*` and `.cs-*` belong to `cs`. Apps may read foundation tokens (e.g. `--cs-color-text-main`, `--cs-radius-md`) or override module variables (e.g. `--cs-button-bg`), and should use app-local names (e.g. `--app-*` or unprefixed custom properties) rather than inventing new `--cs-*` globals.
  </css>

  <dom_attributes>
    - Boolean states: `data-<state>={value ? "" : undefined}` (`data-disabled`, `data-invalid`, `data-icon-only`).
    - Enum props: `data-<prop>={value}` (`data-variant`, `data-size`, `data-width`).
  </dom_attributes>

  <typescript_and_svelte>
    - Option arrays: `UPPER_SNAKE_CASE` (`FILTER_STATUSES`, `VIEW_MODES`).
    - Exported types/interfaces: `PascalCase` (`FilterOption`, `ViewMode`).
    - Props, attachment options, and functions: `camelCase`.
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
</dictionary>

<constraints>
  - MUST NOT use `--_` private CSS variable prefixes or invent new `--cs-*` globals in app code.
  - MUST NOT re-export any `*.internal.*` file from a feature's `index.ts`.
  - MUST NOT use `size` for non-T-shirt values (e.g. `anchor`, `content`); use `width` or a domain-specific prop.
  - MUST NOT introduce synonyms for terms already defined in `<dictionary>`.
</constraints>
