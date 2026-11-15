---
trigger: glob
globs: "**/src/**, **/playground/**"
---

# Rule: Design Philosophy & Tokens

<meta>
  <scope>Visual language, color semantics, sizing, typography, surfaces, and motion for library authoring</scope>
  <applies_to>**/src/**, **/playground/**</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Keep this rule strictly generic. NEVER reference specific modules (e.g. "see Button" or "like Checkbox") so the rule stays maintainable as the library grows.
  - Crafted minimalism: calm monochrome surfaces (`base`) paired with a single `accent` color, borderless depth, and tactile physics.
  - Style native semantic HTML (`<button>`, `<input>`, `<textarea>`) completely; never ship unstyled browser/OS widget defaults.
  - Rely on global foundation CSS (`src/css/foundation/`) for reset, `:focus-visible`, `disabled`, `selection`, and `prefers-reduced-motion`—never re-implement them inside modules.
</principles>

<patterns>
  <colors>
    - **Monochrome + Single Accent:** Surfaces use `base` (`canvas` -> `elevated` -> `sunken`) and 4 text levels (`text-strong`, `text-main`, `text-weak`, `text-weaker`). Interactive controls standardize on `accent` (no neutral-vs-accent dual scheme).
    - **Semantic Status (`positive`, `caution`, `negative`):** No `info` palette. Status colors are **intent-driven**: a module only exposes the status variants that make semantic sense for its role (never add all three blindly).
    - **Primitive Palettes:** `color-primitives.css` palettes are reserved for data visualization/charts, never random UI decoration.
    - **Calibration & Hover:** Solid tokens use `550` mix in light mode and `500` in dark mode. Hover uses **brightening** (`-hover` tokens); `elevated` surfaces in light mode indicate hover via text/shadow/physics instead of darkening.
    - **Disabled States:** Prefer dedicated colorless/desaturated `--cs-color-disabled-*` tokens (`--cs-disabled-opacity: 1`) over lazy global opacity fading.
    - **Soft vs. Solid:** Chromatic `-solid` surfaces are for primary emphasis; chromatic `-soft` fills suit toggled/selected states and badges rather than standard action buttons.
  </colors>

  <surfaces_and_shapes>
    - **Borderless by Default:** Separate elements via surface contrast (`canvas` / `elevated` / `sunken`), whitespace, and `box-shadow` (`--cs-shadow-elevated`, `--cs-shadow-sunken`). Avoid CSS `border` on controls unless an explicit edge case demands it.
    - **Solid Highlight:** Chromatic `-solid` interactive surfaces MUST use `--cs-shadow-solid` (1px top-lit inset highlight + subtle drop shadow) and `--cs-shadow-solid-active` on `:active`.
    - **Squircles (`corner-shape`):** Scale superellipse intensity with element size: `--cs-squircle-soft` (`1.2`) for compact controls, `--cs-squircle-smooth` (`1.6`) for medium elements, `--cs-squircle` (`2.0`) for large cards/islands.
  </surfaces_and_shapes>

  <sizing_and_layout>
    - **Units:** Use direct `px` values (no `rem`, no global component-height size tokens). Container max-widths live in `container.css`.
    - **`size` Scales:** Primary controls use `xs..xl`; effects/modifiers use `sm..lg`. `size` is semantic per component class (e.g. `md` on a compact control is smaller than `md` on an action control), calibrated so matching `size` levels look proportional together.
    - **Hit Area:** Interactive controls below `1936px²` total surface area require a `<HitArea />` unless tight layout constraints justify an explicit exception.
    - **CSS Layers:** Library modules use plain CSS inside `@layer` (`foundation`, `attachments`, `components.primitive`, `components.composite`). UnoCSS is for layouting in previews and consuming apps, not inside library component stylesheets.
  </sizing_and_layout>

  <typography_and_icons>
    - **Fonts:** Sans-serif default (`Inter` via `cs/vite` font plugin or system sans). Use `monospace` strictly for code/terminal snippets.
    - **`text-trim` & Truncation:** Use `text-trim` / `text-trim-truncate` (clipping X-axis only, never Y-axis) ONLY on isolated single-line control labels paired with icons—never on headings, descriptions, or multi-line body copy.
    - **Icons:** Size `1–2px` larger than adjacent text; match `strokeWidth` to font-weight (`400 -> 2`, `500 -> 2.25`, `600+ -> 2.5`; custom vector controls may use heavier strokes when visually cleaner).
    - **Copy & Cursors:** Concise 1–2 word control labels (`whitespace-nowrap`), no parenthetical hints or technical jargon (`IndexedDB`, `JSON`) in UI copy, no hyphens/dashes as separators. Use `cursor: default` on controls; `cursor: pointer` only on `:any-link`.
  </typography_and_icons>

  <motion>
    - **Curves & Springs:** Always use easing curves and `linear()` springs from `src/css/foundation/motion.css`.
    - **Role-Based Durations:** Recurring control transitions (e.g. surface hover/press, overlay enter/exit) MUST share role-based duration tokens so equivalent interactions feel identical across modules. Choreographed micro-animations (SVG draws, particle bursts, morph sequences) may use local timings.
    - **Cadence:** High-frequency interactions stay fast and snappy; infrequent actions may be more expressive. Prefer GPU-friendly properties (`transform`, `scale`, `opacity`, `filter`).
  </motion>
</patterns>

<checklist>
  - No raw `border` used where `box-shadow` / surface elevation belongs.
  - Chromatic `-solid` interactive surfaces apply `--cs-shadow-solid` / `--cs-shadow-solid-active`.
  - Disabled states use semantic colorless `--cs-color-disabled-*` tokens rather than opacity-only dimming.
  - Transitions use `motion.css` curves and consistent role durations (no arbitrary `180ms` vs `200ms` drift on standard states).
  - Compact controls `< 1936px²` include hit-area expansion.
  - Component styles live in plain CSS under the proper `@layer` (no UnoCSS classes inside library primitives).
</checklist>

<constraints>
  - MUST NOT add module-specific examples or cross-references to this file.
  - MUST NOT use `info` status tokens or add `positive`/`caution`/`negative` variants where semantically unwarranted.
  - MUST NOT duplicate global `:focus-visible`, `disabled`, or `prefers-reduced-motion` rules inside individual modules.
  - MUST NOT apply `text-trim` to headings, descriptions, or multi-line text.
</constraints>
