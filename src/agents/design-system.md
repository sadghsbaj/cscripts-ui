# `cs` Design System, Visual Philosophy & UX Rules

All paths below are relative to `./node_modules/cs/src/agents/`.
This guide defines the visual identity, spatial architecture, and interaction philosophy of `cs` applications.

---

## 1. Aesthetic Direction: Crafted Minimalism, Not Generic "AI Slop"

Aim for an ultra-clean, Apple-inspired monochrome aesthetic with intentional spatial layout, tactile physics, and obsessive edge alignment—never sterile, generic, or cluttered boilerplate.

### Strict Anti-Patterns (BANNED)

- **Restraint with Borders & Hairlines:** Keep the UI strictly borderless—visual separation is achieved purely through surface elevation (`shadow-elevated`), background contrast, and whitespace. In Dark Mode, where drop shadows are physically invisible, edge definition is achieved via an Apple-style top-lit inset hairline inside `shadow-elevated` instead of CSS borders. Nested elements (`sunken`), inner wells, or segmented controls rely purely on surface background contrast (`bg-sunken` or `bg-base-soft`) without borders. NEVER use `divide-*` or `<hr>` dividing lines.
- **No Hyphens or Text Dashes as Separators:** Never use `-`, `—`, or unicode dots in UI labels/metadata. Use layout gaps or `<span class="dot-md"></span>`.
- **No Fake "AI App Headers":** Do NOT invent a top navbar with a random Lucide icon and a made-up app title unless explicitly requested. Start directly with functional workspace islands.
- **No Cliché "AI Feature Cards":** NEVER build cards with a tinted square/circle icon in the top-left corner followed by a title and description underneath.
- **No Native Browser / OS Widget Styles (Zero `<select>`):** While semantic HTML elements (`<input>`, `<button>`, `<textarea>`) are encouraged when fully custom-styled to match the `cs` surface and typography system, NEVER leave any control with default browser styling or native OS popup menus. Specifically, native `<select><option>` dropdowns, native date/color pickers, and unstyled native checkboxes, radios, or range sliders are strictly forbidden—always build custom-styled `cs` popover menus, segmented controls, or `appearance-none` tactile controls instead.
- **No Information Overload:** Do not cram every conceivable metric, filter, and action onto a single screen. Prioritize ruthlessly.

---

## 2. Surfaces, Depth & Island Architecture

Instead of monolithic full-screen panels divided by borders, structure layouts as **floating modular islands** over the canvas.

### Surface Stacking (`canvas` -> `elevated` -> `sunken`)

- **Canvas (`bg-canvas`):** The app background.
- **Primary Islands (`bg-elevated` + `shadow-elevated`):** Group distinct functional areas into separate floating cards/islands rather than one giant toolbar. Pair `bg-elevated` with `shadow-elevated`. Through `light-dark()`, cards stay 100% borderless in Light Mode with a soft drop shadow, while automatically gaining a physical top-lit inset hairline in Dark Mode without manual `border` classes.
- **Nested / Recessed Elements (`bg-sunken`, optional `shadow-sunken`):** Elements inside an `elevated` island (inputs, inner wells, secondary blocks) use `bg-sunken` (optionally paired with `shadow-sunken` for subtle recessed inputs/wells). For segmented controls and tracks that may sit on any surface, prefer `bg-base-soft` translucency. Avoid cluttering nested layouts with redundant borders.

---

## 3. Radii & Squircles (`corner-shape`)

Everything rounded must look organically smooth. Combine generous border radii with CSS `corner-shape` squircles (progressive enhancement: renders true superellipses in Chromium and gracefully falls back to standard border-radius elsewhere).

- **Rule of Thumb:** Higher superellipse values (`squircle` = `2`) pull corners inward more strongly; on small elements, this can look overly boxy. Scale the squircle intensity with element size:
    - **`squircle-soft` (`superellipse(1.2)`):** Interactive controls (`Button`, `ToggleButton`, `ToggleButtonGroup`, `CloseButton`, `Tooltip`), compact chips, and `Checkbox` (with `4px–8px` pixel radii).
    - **`squircle-smooth` (`superellipse(1.6)`):** Inputs, badges, dropdown menus, and medium elements (often paired with `rounded-lg` or `rounded-xl`).
    - **`squircle` (`superellipse(2)`):** Large containers, floating islands, cards, and modals (paired with `rounded-2xl` or `rounded-3xl`).

---

## 4. Color Restraint & Semantic Discipline

Maintain a calm, monochrome-first UI hierarchy using the `base` (Zinc) palette and `text-(strong|main|weak|weaker)` for surfaces and typography, paired with a consistent `accent` color for interactive states and primary actions:

- **Accent-First Interactive Controls (No Neutral-Only Controls):** Interactive state controls (`<Checkbox>`, `<ToggleButton>`, switches) and primary/secondary actions consistently use the `accent` palette rather than offering a neutral `base` color toggle—do not mix neutral and chromatic controls in the same UI.
- **Light/Dark Solid Calibration (`550` Light / `500` Dark):** Semantic `--cs-color-*-solid` tokens (`accent`, `success`, `warning`, `danger`, `info`) use a richer `550` mix (`50% 500 + 50% 600` in `oklch`) in Light Mode and `500` in Dark Mode, automatically shared across buttons, checkboxes, and future solid controls.
- **Solid Surface Highlight (`--cs-shadow-solid`):** Interactive chromatic `-solid` surfaces (such as `<Button variant="primary">`, checked/indeterminate `<Checkbox>`, and future switches/radios) MUST apply `--cs-shadow-solid` (top-lit inset highlight + soft micro-drop-shadow) and `--cs-shadow-solid-active` on active press—never duplicate raw `inset 0 1px 0 0 ...` shadows inline, and keep flat `-soft` / `tertiary` / `ghost` surfaces shadowless.
- **Single High-Emphasis Call-to-Action:** At most **ONE** `<Button variant="primary">` (i.e. `accent-solid`) element should be visible in a view at a time.
- **No Chromatic Soft Backgrounds on `<Button>`:** Buttons intentionally NEVER use tinted `-soft` backgrounds (chromatic soft fills on buttons look playful/childish). Instead:
    - `variant="secondary"` pairs a neutral `base-soft` pill with chromatic `accent` (or `danger`) text.
    - `variant="tertiary"` pairs a neutral `base-soft` pill with neutral `base-soft-fg` text (for secondary neutral actions like *Cancel* inside cards).
    - `variant="ghost"` uses a transparent resting surface, neutral `base-soft` on hover, and chromatic `accent` (or `danger`) text.
    - `variant="elevated"` provides a neutral floating surface on `canvas`.
- **Prefer `-soft` for Non-Button Active/Toggled States & Badges:** Never place multiple `-solid` colored elements side by side (avoid "color vomiting"). Chromatic `-soft` backgrounds (`accent-soft`, `success-soft`, etc.) remain appropriate for non-button elements such as active `<ToggleButton>` states, selected filters, badges, or tags.
- **Semantic Status Colors (`danger`, `warning`, `success`, `info`):** Reserve strictly for their true semantic meaning in UI controls and feedback (e.g., `danger` boolean on `<Button variant="primary" | "secondary" | "ghost">` for destructive delete actions, `warning` for alerts, `success` for confirmations). Never use them for decorative variety.
- **Data Visualization & Charts (Use Primitive Palettes):** Do NOT force charts or multi-series graphs into a monochrome palette, and do not limit them to the 4 semantic status colors. For data visualization (e.g., a chart with 6 distinct lines or categories), freely use the full range of primitive palettes (`emerald`, `indigo`, `violet`, `amber`, `cyan`, `rose`, etc. via `--cs-color-<name>-<shade>` or UnoCSS utilities) so series are visually distinct and vibrant.
- **Hover Brightening (with Light-Mode Surface Exception):** Interactive `-solid` and `-soft` surfaces should subtly **brighten** on hover (already handled by `--cs-color-*-hover` tokens and `cs/svelte/<primitive>`) rather than darkening.
    - **Exception for `bg-elevated` Interactive Surfaces:** When an interactive element or card uses `bg-elevated` (which is pure `white` in Light Mode sitting on a `base-100` canvas), it cannot brighten further in Light Mode—and darkening it to `base-50` or `base-100` on hover looks muddy and makes it blend into the `canvas` background. Instead, keep the surface color pure `bg-elevated` and indicate hover through **text/icon color brightening** (e.g., `text-weak` -> `text-strong`), subtle shadow elevation (`shadow-sm` -> `shadow-md`), or micro-scale physics.

---

## 5. Typography, Sizing & Icon Pairing

### Sizing Floor (No Micro-Text)

AI models frequently make UIs too cramped and tiny. Prefer fewer elements rendered at comfortable, confident sizes:

- **Standard UI Range:** `14px` (`text-sm`) to `18px` (`text-lg`) is the sweet spot for almost all UI controls, labels, and body copy.
- **Absolute Minimum:** Use `12px–13px` (`text-xs`) **sparingly** for secondary metadata or badges. Never go below `12px` (`10px`/`11px` is banned).
- **Font Family:** Stick strictly to the default sans-serif font (`font-sans`). **NEVER** use `font-mono` for numbers, badges, IDs, or aesthetics—only use `font-mono` when displaying actual source code or terminal snippets.

### Optical Text Trimming & Lucide Icons

- **Targeted Use of `text-trim` & `text-trim-truncate` (DO NOT OVERUSE):** Use `text-trim` (or `text-trim-truncate` for single-line ellipsis without vertical clipping) **ONLY** on isolated single-line UI control labels paired directly with an adjacent icon (e.g., inside buttons, segmented control options, badges, or compact nav items) where vertical icon-to-text optical alignment is critical.
    - **Strictly Banned On:** NEVER apply `text-trim` to headings (`title-*`), subtitles (`subtitle-*`), descriptions (`description-*`), body copy (`body-*`), stacked text blocks, or standalone text without an adjacent icon, as stripping line-box metrics destroys natural vertical rhythm and collapses layout spacing.
- **Icon-to-Text Sizing:** Size Lucide icons **`1px–2px` larger** than the adjacent `font-size` (e.g., `14px` `text-sm` -> `16px` icon; `16px` `text-base` -> `18px` icon).
- **Icon Stroke Width Matching:** Match the icon's `stroke-width` to the adjacent text's `font-weight`:
    - `font-400` (Regular) -> `strokeWidth={2}`
    - `font-500` (Medium) -> `strokeWidth={2.25}`
    - `font-600`+ (Semibold/Bold) -> `strokeWidth={2.5}`

### Microcopy & Labeling Discipline

- **Concise 1-Word Controls (`whitespace-nowrap`):** Buttons, tabs, and segmented-control options should ideally consist of **a single concise word** (or at most **2 short words** when a single word would be ambiguous—never a wide 300px button with 4–5 words, and never bureaucratic `X & Y` double labels like _"Recipients & Data"_ or _"Open & Edit"_). Always enforce `whitespace-nowrap` on interactive control labels so they never wrap onto multiple lines.
- **Visual Self-Evidence over Parenthetical Text `(xyz)`:** Never explain the UI through parenthetical hints, units, or examples in labels, subtitles, table headers, or input placeholders (e.g., use `Search…` instead of `Search (Name, Email, Company)…`). Make the interface self-explanatory through visual hierarchy, spatial grouping, and iconography rather than explanatory text.
- **Zero Technical Jargon in UI Copy:** Never expose underlying implementation details (`IndexedDB`, `LocalStorage`, `JSON`, `Blob`, `Client-Side`, etc.) in user-facing titles, subtitles, or descriptions.
- **No Redundant View Headers:** When an active tab or segmented control already indicates the current view, do not repeat that same title with an explanatory subtitle as a large heading right below it. Let the workspace content speak for itself.

### Interactive Surfaces & The `< 1936px²` Hit Area Rule

Touch ergonomics depend primarily on **total interactive surface area**, not individual dimension limits:

- **The `< 1936px²` Baseline:** A standard 44px × 44px touch target provides an area of `1936px²`. Because rounded corners (`border-radius: full` or `squircle`) clip corners, actual surface area often drops even lower (~1200px²).
- **Rule of Thumb:** Any interactive control with a **total surface area below `1936px²`** MUST include an invisible `<HitArea size="md" />` (or `size="lg"`) child touch expander (e.g., all compact icon-only buttons, close triggers, checkboxes).
- **Total Area vs. Single Dimensions:** This rule evaluates **total surface area**, not single narrow sides. A control with one compact dimension (e.g., 36px height) that is elongated (e.g., a 36px × 120px text button = 4320px²) provides more than double the required landing area and does NOT require a hit area by default.
- **Contextual Opt-In:** Developers can still contextually add a `<HitArea />` to larger elongated controls whenever a specific dense toolbar layout or mobile view benefits from it, but the `< 1936px²` threshold serves as the standard floor.
- **Rare Exceptions Require User Alignment:** In rare layout edge cases (e.g., extremely tight, dense constraints where expanding target bounds might overlap adjacent interactive elements—usually indicating a layout flaw), omitting a hit area on an element `< 1936px²` is only permissible as an explicit exception. Agents MUST explicitly consult and align with the user before deciding to omit a hit area or bypass lint warnings on sub-`1936px²` controls.

---

## 6. UX Patterns: Inline-First & Progressive Disclosure

- **Inline UI over Modals (Anti-Modal Rule):** NEVER spawn a modal dialog for confirmations, renaming, quick edits, or simple creations.
    - _Delete confirmation & Action States:_ Always use `<ButtonMorph>` (`cs/svelte/button-morph`) to morph the delete button inline into a "Confirm Delete?" state (e.g. `variant="secondary" danger` -> `variant="primary" danger` with `resetTimeout={3000}`, `resetOnOutsideClick`, and `resetOnEscape`). Never implement inline button morphs with ad-hoc `{#if}` swaps.
    - _Do NOT use `<ButtonMorph>` for Standard Toggles:_ `<ButtonMorph>` is strictly for transitioning between distinct functional states/buttons (Button, ToggleButton, CloseButton). NEVER use `<ButtonMorph>` for normal binary toggles (e.g. bold, italic, underline, tool active/inactive)—always use `<ToggleButton>` or `<ToggleButtonGroup>` with `pressed={...}` instead.
    - _Renaming / Editing:_ Swap or morph the label inline into an input field.
    - _Exception (Media & Complex Fullscreen Workspaces):_ Only use fullscreen modals/overlays when displaying heavy full-viewport media (e.g., PDF viewers, image lightboxes) or when providing a dedicated, distraction-free **Fullscreen Focus View** for wide, complex multi-column data tables/spreadsheets triggered via an explicit expand button.
- **Whole-Surface Clickability & Card Anatomy:** When a card or list item represents an entity that can be opened or selected, make the **entire card** the primary interactive surface rather than rendering a static box with a redundant _"Open"_ or _"Select"_ button inside it. Avoid stacking rows of action buttons at the bottom of cards unless a specific workflow genuinely requires immediate multi-action triggers; instead, tuck secondary or destructive actions behind hover-revealed compact icon triggers or a discrete `...` overflow menu.
- **Ruthless Metadata Restraint & Hover Popovers:** Never dump every available data point onto a card or row at once in competing font sizes. Display only the **1–2 essential values** needed for immediate scanning, and tuck secondary details behind high-craft progressive disclosure—such as a subtle info icon or hover trigger that opens a clean custom popover on demand.
- **Scannable Multi-Column Data & Tables:** Optimize tables for effortless visual scanning through strict column alignment, single-line headers (`whitespace-nowrap`), intentional typography hierarchy, and restrained color accents—without overwhelming the user with dense text or rows of permanent delete icons. Avoid harsh dividing lines (`border-b` / `divide-y`); instead, separate rows using floating row islands (`bg-elevated shadow-elevated` with vertical gaps) or borderless surfaces with subtle hover states. When a table has more columns than fit comfortably in its container, never cram or clip columns: allow clean horizontal scrolling (`overflow-x: auto`) and offer an elevated expand icon button (e.g., top-right on hover) to open the table in a smooth **Fullscreen Modal**.
- **Intentional Whitespace & Progressive Disclosure:** Use generous whitespace actively as a structural grouping tool rather than filling every pixel with controls. Keep primary, high-frequency actions directly accessible (using clean patterns like **Segmented Controls** for view/mode switching), and tuck infrequent or secondary actions inside `...` overflow menus or dedicated subviews.
- **Edge Alignment:** Align the outer edges of islands, text columns, and controls on clean vertical and horizontal grid lines.
- **Responsive by Default:** Unless building a specialized desktop-only tool, design layouts and islands to adapt cleanly across both desktop and mobile viewports.

---

## 7. Motion, Physics & Micro-Interactions

Animations must feel responsive, physical, and completely free of layout jank:

- **Color, Shadow & Background Transitions:** Use `200ms var(--cs-ease-quad-out)`.
- **Tactile Press & Release Physics (`--cs-spring-release`):** Has a strong ~28% overshoot. Use strictly for small `transform` scale deltas (e.g., button squash-and-stretch `0.95 -> 1.0` as in `../svelte/primitives/button/Button.svelte`, or checkbox pops). NEVER use `--cs-spring-release` on large spatial movements or `opacity`/`color`.
- **UI Morphing, Switches & Popovers (`--cs-spring-snappy`):** Has a subtle ~4% micro-overshoot. Ideal for sliding segmented-control pills, toggle switch thumbs, inline button morphs, and floating `<Popover>` surfaces where a physical, tactile settle feels premium without bouncing excessively. `<Popover>` uses this spring by default alongside `@starting-style` and directional drift towards its anchor.
- **Large Spatial Movements (Sidebars, Drawers, Panels):** Use clean deceleration curves without overshoot like `--cs-ease-expo-out` or `--cs-ease-cubic-out`.
- **Zero-Jank Collapse/Slide Animations:** When animating height/width (e.g., Svelte `slide` transition or accordion reveals), NEVER put `margin` or parent `gap` directly on the collapsing element, as it causes a visual jump at the start/end of the transition. Wrap the inner content and apply padding inside the animated container instead.
- **Crafted Polish:** Include high-craft UX details where appropriate: scroll-fade masks on scrollable lists, keyboard roving `tabindex` / arrow-key navigation in toolbars and menus, and intelligent menu positioning fallbacks.
