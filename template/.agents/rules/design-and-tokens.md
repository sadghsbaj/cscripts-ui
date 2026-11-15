---
trigger: glob
globs: "**/*.svelte, **/*.css, **/*.html"
---

# Rule: Design System, Tokens & Styling

<meta>
  <scope>Visual hierarchy, surfaces, color restraint, typography, UnoCSS vs. vanilla CSS, and motion</scope>
  <applies_to>**/*.svelte, **/*.css, **/*.html</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Crafted minimalism: borderless floating islands, intentional whitespace, edge alignment, and tactile physics.
  - Monochrome-first (`base` palette + semantic text tokens) with `accent` reserved for interactive states and primary actions.
  - Inline-first UX: prefer inline state transitions and progressive disclosure over modals, dense tables, or cluttered cards.
  - Use UnoCSS utilities for layout, spacing, flex/grid containers, and positioning; use vanilla CSS with `--cs-*` tokens for complex, stateful, or multi-part components.
  - Inspect `./node_modules/cs/src/css/foundation/` and `./node_modules/cs/src/uno/` for exact token names and utilities rather than guessing or re-implementing automated foundation behaviors.
</principles>

<patterns>
  <surfaces_and_shapes>
    - **Surface Hierarchy (`canvas -> elevated -> sunken`):**
      - `bg-canvas`: App root background.
      - `bg-elevated` + `shadow-elevated`: Primary floating islands/cards (borderless in light mode; automatic top-lit inset hairline in dark mode via `light-dark()`).
      - `bg-sunken` (optional `shadow-sunken`) or `bg-base-soft`: Recessed wells, inputs, and segmented tracks inside islands.
    - **Squircles (`corner-shape`):** Scale superellipse intensity with element size:
      - `squircle-soft` (`1.2`): Interactive controls, compact chips, checkboxes (`4px–8px` radii).
      - `squircle-smooth` (`1.6`): Inputs, badges, dropdown menus (`rounded-lg` / `rounded-xl`).
      - `squircle` (`2`): Large containers, cards, floating islands, modals (`rounded-2xl` / `rounded-3xl`).
  </surfaces_and_shapes>

  <colors_and_states>
    - **Semantic Palettes:** Use `base`, `accent`, `positive`, `caution`, `negative` (auto `light-dark()`). Reserve `positive`/`caution`/`negative` strictly for true semantic status—never decorative variety.
    - **Hierarchy:** At most **one** primary `accent-solid` CTA visible per view. Use `-soft` tokens for non-button active states, filters, and badges; never place multiple `-solid` elements side by side.
    - **Solid Surface Highlight:** Interactive `-solid` surfaces apply `--cs-shadow-solid` (and `--cs-shadow-solid-active` on press); keep `-soft` and ghost surfaces shadowless.
    - **Hover Physics:** `-solid` and `-soft` surfaces brighten on hover. Exception: `bg-elevated` interactive cards in light mode cannot brighten white—indicate hover via text/icon brightening (`text-weak` -> `text-strong`), `shadow-elevated-hover`, or micro-scale.
    - **Data Visualization:** Multi-series charts may freely use primitive palettes (`emerald`, `indigo`, `violet`, `amber`, `cyan`, `rose`, etc.) for clear series distinction.
  </colors_and_states>

  <cascade_and_tokens>
    - **Cascade Layers:** `cs/css` declares `@layer foundation, attachments, components.primitive, components.composite;`. Unlayered UnoCSS utilities cleanly override library layers without `!important`.
    - **Foundation Token Sources (`./node_modules/cs/src/css/foundation/`):**
      - `color-semantics.css` & `color-primitives.css`: Surface (`canvas`, `elevated`, `sunken`), text (`text-strong|main|weak|weaker`), and semantic palettes.
      - `shapes.css`: `--cs-radius-*`, `--cs-shadow-*`, and `--cs-squircle*`.
      - `easings.css`, `container.css`, `typography.css`: Motion curves/springs, container widths, and type scale.
    - **UnoCSS Sources (`./node_modules/cs/src/uno/`):** `rules/` (`colors.ts`, `shapes.ts`, `scrollbar.ts`, `typography.ts`), `shortcuts/` (`typography.ts`, `layout.ts`, `dots.ts`), and `variants/interaction.ts`.
    - **Automated Foundation Behaviors:** `reset.css` sets `16px`, `font-400`, `1.5` line-height, and `--cs-color-text-main`; `disabled.css` handles `:disabled`, `[aria-disabled="true"]`, and `[data-disabled]`; `focus.css` handles `:focus-visible` rings; `presetCS` `hover:` and `active:` exclude disabled/busy states and guard `hover:` with `@media (hover: hover) and (pointer: fine)`. Scrollbars are styled globally (`scrollbar-sm|md|lg`, `no-scrollbar`, `scrollbar-none`).
  </cascade_and_tokens>

  <typography_and_shortcuts>
    - **Role Shortcuts:** Always use `title-(xs..9xl)`, `subtitle-(xs..xl)`, `label-(xs..lg)`, `description-(xs..lg)`, or `body-(xs..lg)` instead of combining manual font-size/weight/color classes.
    - **Sizing & Fonts:** Standard UI text is `14px–18px` (`12px–13px` sparingly for secondary metadata; never below `12px`). Use `font-sans` everywhere; reserve `font-mono` strictly for code or terminal output.
    - **Optical Alignment:** Use `text-trim` / `text-trim-truncate` only on single-line icon+label controls (never on headings, descriptions, or body copy). Size Lucide icons `1–2px` larger than adjacent text and match `strokeWidth` to weight (`400 -> 2`, `500 -> 2.25`, `600+ -> 2.5`).
    - **Layout & Separator Shortcuts (ESLint-enforced):** Use `flex-center` (not `flex justify-center items-center`), `absolute-center` (not manual 50%/translate centering), and `<span class="dot-sm|dot-md|dot-lg"></span>` instead of unicode dots (`·`, `•`) or hyphens/dashes.
    - **Microcopy:** Keep button/tab labels to 1–2 concise words (`whitespace-nowrap`). Avoid parenthetical hints `(xyz)`, technical jargon (`JSON`, `LocalStorage`), and redundant view headers.
  </typography_and_shortcuts>

  <ux_and_motion>
    - **Inline-First:** Use inline morphing or inline editing for confirmations and renames. Reserve fullscreen modals for heavy media or wide-table focus views.
    - **Cards & Tables:** Make entire entity cards clickable rather than adding redundant "Open" buttons; show 1–2 essential values and disclose secondary details via hover/popovers. Separate table rows with whitespace/elevated islands rather than borders; allow horizontal scroll + expand view on wide tables.
    - **Touch Targets (`< 1936px²`):** Interactive controls under `1936px²` (e.g., compact icon buttons, checkboxes) require a `<HitArea />` child (see `./node_modules/cs/src/modules/hit-area/hit-area.docs.md`).
    - **Motion:** Use `200ms var(--cs-ease-quad-out)` for color/shadow/bg; `--cs-spring-release` only for small press scale deltas; `--cs-spring-snappy` for morphs, switches, and popovers; `--cs-ease-expo-out` / `--cs-ease-cubic-out` for drawers/panels. Never put `margin` or parent `gap` on collapsing elements.
  </ux_and_motion>
</patterns>

<constraints>
  - MUST NOT define new `--cs-*` CSS variables in app code (reserve `--cs-*` for library tokens; use app-local names).
  - MUST NOT use `divide-*`, `<hr>`, or manual dark-mode borders for surface separation, or write redundant `dark:` overrides for semantic `light-dark()` tokens.
  - MUST NOT use raw gray/zinc shades for text colors or manual `disabled:opacity-50` / `enabled:hover:` / `:focus-visible` overrides.
  - MUST NOT leave native `<select>` or unstyled browser form widgets in the UI.
  - MUST NOT invent fake app headers or cliché icon-top-left feature cards unless requested.
</constraints>
