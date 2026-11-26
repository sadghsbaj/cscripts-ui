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
    - **Borderless by Default:** Separate elements via surface contrast (`canvas` / `elevated` / `sunken`), whitespace, and `box-shadow`. Avoid CSS `border` on controls unless an explicit edge case demands it.
    - **Elevation Semantics:**
      - `--cs-shadow-elevated` / `shadow-elevated`: For **grounded** surfaces and controls (cards, headers, buttons, text inputs).
      - `--cs-shadow-floating` / `shadow-floating`: For **floating** layers (popovers, tooltips, overlay panels/dialogs), which need an outer ambient/contact shadow and a slightly stronger rim in dark mode so they do not merge into underlying `bg-elevated` surfaces.
      - `--cs-shadow-sunken` / `shadow-sunken`: For recessed wells and inset tracks.
    - **Solid Highlight:** Chromatic `-solid` interactive surfaces MUST use `--cs-shadow-solid` (1px top-lit inset highlight + subtle drop shadow) and `--cs-shadow-solid-active` on `:active`.
    - **Squircles (`corner-shape`):** Scale superellipse intensity with element size: `--cs-squircle-soft` (`1.2`) for compact controls, `--cs-squircle-smooth` (`1.6`) for medium elements, `--cs-squircle` (`2.0`) for large cards/islands.
  </surfaces_and_shapes>

  <sizing_and_layout>
    - **Units:** Use direct `px` values (no `rem`, no global component-height size tokens). Container max-widths live in `container.css`.
    - **`size` Scales:** Primary controls use `xs..xl`; effects/modifiers use `sm..lg`. `size` is semantic per component class (e.g. `md` on a compact control is smaller than `md` on an action control), calibrated so matching `size` levels look proportional together.
    - **Hit Area:**
      - **Container controls (`<button>`, `<a>`):** Controls below `1936px²` total surface area require a `<HitArea />` child unless tight layout constraints justify an explicit exception.
      - **Void HTML controls (e.g. `<input>` checks/toggles):** Intentionally omit expanded hit areas even when below `1936px²`. Never add wrapper DOM or `40px`–`48px` pseudo-element hit areas (which splits hit handling into a dual-track architecture and consumes pseudo-elements; tiny `:active` press-jitter guards remain acceptable). Pair void controls with descriptive text inside a clickable `<label>` for the full target surface.
    - **CSS Layers:** Library modules use plain CSS inside `@layer` (`foundation`, `attachments`, `components.primitive`, `components.composite`). UnoCSS is for layouting in previews and consuming apps, not inside library component stylesheets.
    - **Close-Button Positioning:** Place close buttons in cards, modals, and overlays near the outer corner/edge with a tighter edge offset—visually closer to the edge than the title's padding—rather than rigidly aligned inside the title row.
  </sizing_and_layout>

  <typography_and_icons>
    - **Fonts:** Sans-serif default (`Inter` via `cs/vite` font plugin or system sans). Use `monospace` strictly for code/terminal snippets.
    - **`text-trim` & Truncation:** Use `text-trim` / `text-trim-truncate` (clipping X-axis only, never Y-axis) ONLY on isolated single-line control labels paired with icons—never on headings, descriptions, or multi-line body copy.
    - **Icons:** Size `1–2px` larger than adjacent text; match `strokeWidth` to font-weight (`400 -> 2`, `500 -> 2.25`, `600+ -> 2.5`; custom vector controls may use heavier strokes when visually cleaner).
    - **Copy, Stability & Cursors:** Concise 1–2 word control labels (`whitespace-nowrap`), keep `<input>` and `<textarea>` placeholders as short as possible (brief 1–3 word hints; no long instructions or parenthetical hints), no parenthetical hints or technical jargon (`IndexedDB`, `JSON`) in UI copy, no hyphens/dashes as separators. Prevent layout shifts on dynamic switchers (e.g. day/date/mode switchers) via fixed width, `min-width`, or `tabular-nums`. Use `cursor: default` on controls; `cursor: pointer` only on `:any-link`.
    - **Subpixel Snapping & Compositor-Layer Hygiene:** Do NOT keep `will-change` permanently active on resting/open overlay containers or centered surfaces, as subpixel container offsets blur nested text and disable subpixel antialiasing. Reserve persistent `will-change: transform` (or `translate`) strictly for actively moving, dragging, or gliding elements. On actively animating/gliding layers, fractional computed `line-height` values (`--cs-text-sm` × `--cs-leading-tight` = `17.5px`, `--cs-text-xs` × `--cs-leading-snug` = `16.5px`) or fractional centering (`translate: -50%`) can land text on half-pixels and blur via bilinear filtering; keep `typography.css` tokens unchanged and snap locally with CSS `round()` (`line-height: round(up, calc(var(--cs-text-sm) * var(--cs-leading-tight)), 1px)`—keeping `1lh`-coupled icons in sync—and `round(down, 50% - var(--width) / 2, 1px)` instead of `translate: -50%`).
  </typography_and_icons>

  <motion>
    - **Semantic Tokens First:** Default to the predefined semantic duration (`--cs-dur-*`) and easing (`--cs-ease-*`) tokens in `src/css/foundation/motion.css` for animations and transitions so equivalent interactions feel consistent across modules.
    - **Extending vs. Local Timings:** If a new duration, curve, or spring is needed repeatedly across modules, add it to `motion.css`. For specialized, one-off requirements (e.g. custom morph curves, SVG draws, particle bursts), define custom timings or curves locally inside that module rather than adding single-use globals.
    - **Cadence:** High-frequency interactions stay fast and snappy; infrequent actions may be more expressive. Prefer GPU-friendly properties (`transform`, `scale`, `opacity`, `filter`).
    - **Compositor-Layer Policy (`will-change` & `filter`):**
      - Do NOT keep `will-change` permanently active on resting/open overlay containers or centered surfaces.
      - Use `filter: none` (not `filter: blur(0px)`) in resting open states so finished blur transitions do not retain a compositor filter pass.
      - For `:active` press-scale micro-interactions, scope `will-change: scale` to `:hover` / `:active` (or omit it) rather than keeping it permanently on idle items.
      - Reserve persistent `will-change: transform` strictly for actively moving, dragging, or gliding elements.
    - **Morphing:** Prefer morphing transitions in previews and multi-state controls (button state transitions, numeric readouts, and single-line text or mixed text-and-number labels) wherever it fits naturally without causing layout glitches or bugs.
  </motion>
</patterns>

<checklist>
  - No raw `border` used where `box-shadow` / surface elevation belongs.
  - Chromatic `-solid` interactive surfaces apply `--cs-shadow-solid` / `--cs-shadow-solid-active`.
  - Disabled states use semantic colorless `--cs-color-disabled-*` tokens rather than opacity-only dimming.
  - Transitions use `motion.css` semantic duration and easing tokens (or intentionally scoped local timings for one-off choreography) rather than arbitrary drift on standard states.
  - Compact container controls `< 1936px²` include `<HitArea />` expansion; void `<input>` controls omit wrapper/pseudo hit areas and pair with clickable `<label>`s.
  - Component styles live in plain CSS under the proper `@layer` (no UnoCSS classes inside library primitives).
</checklist>

<constraints>
  - MUST NOT add module-specific examples or cross-references to this file.
  - MUST NOT use `info` status tokens or add `positive`/`caution`/`negative` variants where semantically unwarranted.
  - MUST NOT duplicate global `:focus-visible`, `disabled`, or `prefers-reduced-motion` rules inside individual modules.
  - MUST NOT apply `text-trim` to headings, descriptions, or multi-line text.
  - MUST NOT wrap void `<input>` controls in extra container DOM or build expanded hit areas via pseudo-elements; rely on clickable `<label>` pairing instead.
</constraints>
