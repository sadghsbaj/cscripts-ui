---
trigger: glob
globs: "**/src/**, **/playground/**"
---

# Rule: Architecture & Module APIs

<meta>
  <scope>Module structure, component/attachment APIs, state binding, and documentation placement</scope>
  <applies_to>**/src/**, **/playground/**</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Keep this rule strictly generic. NEVER reference specific modules so the rule remains valid as modules evolve.
  - Organize by vertical slices (`src/modules/<name>/`), never by horizontal technical buckets (`components/` vs `attachments/` vs `utils/`).
  - CSS-First interaction: rely on native browser pseudo-classes (`:hover`, `:active`, `:focus-visible`) rather than JS interaction state abstractions.
  - Simplicity over matrices: avoid generic `variant × color` matrices; default to `accent`/`base` and add targeted semantic flags only where warranted.
</principles>

<patterns>
  <module_boundaries>
    - Each module lives in `src/modules/<name>/` with `index.ts` as its sole public entry point.
    - Modules MUST NOT import from other modules' internals (no cross-module coupling).
    - Truly cross-module CSS mechanics belong in `src/css/shared/`; module-specific internal helpers use `.internal.` in the same module folder.
  </module_boundaries>

  <components>
    - **Compound Pattern:** Export flat `PascalCase` subcomponents (`<Module><Part>`) rather than dot-notation (`Module.Part`) to preserve tree-shaking and clean IDE typing.
    - **Required Visual Props:** `variant` and `size` MUST NOT have default values—force explicit choices at every call site.
    - **Element Reference (`ref`):** Every DOM-rendering component (including subparts) exposes `ref = $bindable()` bound to its root element unless technically impossible.
    - **Control State:** Controllable UI states (`checked`, `pressed`, `open`, `indeterminate`) use `$bindable()`.
    - **Rest Props & Attributes:** Forward `{...rest}` to the root DOM element (`class={["cs-<module>", className]}`). On non-polymorphic button controls that omit `type`, enforce `type="button"` *after* `{...rest}`.
    - **Polymorphism (`as`):** Use sparingly and only where semantically essential, to avoid type complexity.
  </components>

  <attachments>
    - Every attachment MUST accept a single uniform options object (`(options?: <Name>Options) => Attachment`), never a dual positional-vs-object signature.
    - Support `enabled?: boolean | (() => boolean)` consistently via a shared getter-resolver helper.
  </attachments>

  <docs_and_previews>
    - Do NOT place `<!-- @component -->` documentation blocks inside `.svelte` files; keep only concise English *why*-comments on non-obvious logic or CSS.
    - Co-locate one `<name>.docs.md` and (for visual/interactive modules) `<Name>.preview.svelte` inside the module folder.
  </docs_and_previews>
</patterns>

<checklist>
  - Module has `index.ts` as sole public export; no `*.internal.*` files exported.
  - No cross-module imports; shared mechanics placed in `src/css/shared/`.
  - `variant` and `size` have no default values; no redundant `color` matrix props.
  - `ref = $bindable()` and `{...rest}` forwarded on DOM-rendering components.
  - Attachments take a single options object with consistent `enabled` support.
  - `<name>.docs.md` (and `<Name>.preview.svelte` if visual) co-located; no `<!-- @component -->` block in `.svelte`.
</checklist>

<constraints>
  - MUST NOT add module-specific examples or cross-references to this file.
  - MUST NOT introduce global `data-hovered` / `data-pressed` JS wrappers where native CSS states suffice.
  - MUST NOT split modules into separate `components/` and `attachments/` root folders.
</constraints>
