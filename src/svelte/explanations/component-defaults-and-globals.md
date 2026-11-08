# Component Defaults & Global Foundation Behaviors

This architectural guide explains the baseline conventions and automated foundation behaviors shared across all `cs` Svelte components.

---

## 1. Explicit Configuration Philosophy (No Fallback Defaults)

Components in `cs` deliberately **require explicit configuration** via required props mapped to data attributes (such as `variant` -> `[data-variant]`, `size` -> `[data-size]`, and `color` -> `[data-color]` where applicable):

- **Preventing Accidental Defaults:** There are no implicit fallback sizes or variants in component props or CSS. Omitting a required prop is caught immediately rather than guessing an unintended look.
- **Type-Enforced:** Strict TypeScript prop definitions on each Svelte component validate required props, allowed value unions, and variant constraints (such as omitting `color` on `elevated` variants) directly in your IDE.

---

## 2. Automated Foundation Behaviors (DO NOT Re-Implement)

The foundation cascade layer (`src/css/foundation/`) globally manages common interactive behaviors. Component stylesheets should never re-implement these properties:

### A. Cursor Styles
- Interactive elements (`button`, `[role="button"]`) deliberately retain the native `default` cursor following OS design specifications (Apple & Windows HIG) rather than forcing `cursor: pointer`.
- Only actual navigation links (`:any-link`) receive `cursor: pointer`.
- Pseudo-elements (`::before`) and hit-areas inherit the host's cursor via `cursor: inherit`.

### B. Focus Rings & Outlines (`focus.css`)
- Outlines for keyboard navigation (`:focus-visible`) are handled globally across all elements.
- Never write custom `:focus-visible` outlines or remove focus indicators with `outline: none`.

### C. Text Decoration
- Links and interactive components have `text-decoration: none` applied globally by reset rules.

### D. Disabled States (`disabled.css`)
- Any element with `:disabled`, `[aria-disabled="true"]`, or `[data-disabled]` automatically receives:
  - `opacity: 0.5`
  - `user-select: none`
  - `pointer-events: none`
- Never add manual `disabled:opacity-50` or `disabled:pointer-events-none` rules to component styles.
