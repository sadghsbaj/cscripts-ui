# `cs` Design System, Visual Philosophy & UX Rules

All paths below are relative to `./node_modules/cs/src/agents/`.
This guide defines the visual identity, spatial architecture, and interaction philosophy of `cs` applications.

---

## 1. Aesthetic Direction: Crafted Minimalism, Not Generic "AI Slop"

Aim for an ultra-clean, Apple-inspired monochrome aesthetic with intentional spatial layout, tactile physics, and obsessive edge alignment—never sterile, generic, or cluttered boilerplate.

### Strict Anti-Patterns (BANNED)

- **Restraint with Borders & Hairlines:** In Light Mode, keep the UI strictly borderless—visual separation is achieved purely through surface elevation (`shadow-sm`), background contrast, and whitespace. In Dark Mode, where drop shadows are physically invisible against dark backgrounds, primary floating cards/islands (`elevation-1`) should use `border border-elevation-1` for edge definition. Do NOT overuse borders or put borders on everything on cramp: nested elements (`elevation-2`), inner wells, or segmented controls should still rely purely on surface background contrast (`bg-elevation-2`) without borders. NEVER use `divide-*` or `<hr>` dividing lines.
- **No Hyphens or Text Dashes as Separators:** Never use `-`, `—`, or unicode dots in UI labels/metadata. Use layout gaps or `<span class="dot-md"></span>`.
- **No Fake "AI App Headers":** Do NOT invent a top navbar with a random Lucide icon and a made-up app title unless explicitly requested. Start directly with functional workspace islands.
- **No Cliché "AI Feature Cards":** NEVER build cards with a tinted square/circle icon in the top-left corner followed by a title and description underneath.
- **No Information Overload:** Do not cram every conceivable metric, filter, and action onto a single screen. Prioritize ruthlessly.

---

## 2. Surfaces, Depth & Island Architecture

Instead of monolithic full-screen panels divided by borders, structure layouts as **floating modular islands** over the canvas.

### Surface Stacking (`0 -> 1 -> 2`)

- **Canvas (`bg-elevation-0`):** The app background.
- **Primary Islands (`bg-elevation-1` + `shadow-sm` + `border border-elevation-1`):** Group distinct functional areas into separate floating cards/islands rather than one giant toolbar. Pair `bg-elevation-1` with `shadow-sm` and `border border-elevation-1`. Because `border-elevation-1` uses `light-dark(transparent, ...)`, cards stay 100% borderless in Light Mode while gaining a precise, subtle hairline in Dark Mode to compensate for invisible drop shadows.
- **Nested Elements (`bg-elevation-2`, Flat):** Elements inside an `elevation-1` island (inputs, inner wells, secondary blocks, segmented control tracks) use `bg-elevation-2` **without shadows or borders**—relying purely on background contrast, even in Dark Mode. Avoid cluttering nested layouts with redundant borders; only use `border-elevation-2` when an inner container directly demands edge clarity.

---

## 3. Radii & Squircles (`corner-shape`)

Everything rounded must look organically smooth. Combine generous border radii with CSS `corner-shape` squircles (progressive enhancement: renders true superellipses in Chromium and gracefully falls back to standard border-radius elsewhere).

- **Rule of Thumb:** Higher superellipse values (`squircle` = `2`) pull corners inward more strongly; on small elements, this can look overly boxy. Scale the squircle intensity with element size:
    - **`squircle-soft` (`superellipse(1.2)`):** Small elements, icon-only buttons, compact chips, checkboxes.
    - **`squircle-smooth` (`superellipse(1.6)`):** The default workhorse. Use on standard buttons, inputs, tooltips, badges, dropdown menus, and medium elements (often paired with `rounded-full`, `rounded-lg`, or `rounded-xl`).
    - **`squircle` (`superellipse(2)`):** Large containers, floating islands, cards, and modals (paired with `rounded-2xl` or `rounded-3xl`).

---

## 4. Color Restraint & Semantic Discipline

Maintain a calm, monochrome-first UI hierarchy using the `base` (Zinc) palette and `text-(strong|main|weak|weaker)`.

- **Single High-Emphasis Call-to-Action:** At most **ONE** `accent-solid` element (e.g., primary submit/create button) should be visible in a view at a time.
- **Prefer `-soft` for Active/Toggled States:** Never place multiple `-solid` colored elements side by side (avoid "color vomiting"). For active toggles, selected filters, tags, or highlighted states, use `accent-soft` (or `base-soft`) instead of `accent-solid`.
- **Semantic Status Colors (`danger`, `warning`, `success`, `info`):** Reserve strictly for their true semantic meaning in UI controls and feedback (e.g., `danger` for destructive delete actions/errors, `warning` for alerts, `success` for confirmations). Never use them for decorative variety.
- **Data Visualization & Charts (Use Primitive Palettes):** Do NOT force charts or multi-series graphs into a monochrome palette, and do not limit them to the 4 semantic status colors. For data visualization (e.g., a chart with 6 distinct lines or categories), freely use the full range of primitive palettes (`emerald`, `indigo`, `violet`, `amber`, `cyan`, `rose`, etc. via `--cs-color-<name>-<shade>` or UnoCSS utilities) so series are visually distinct and vibrant.
- **Hover Brightening (with Light-Mode Surface Exception):** Interactive `-solid` and `-soft` surfaces should subtly **brighten** on hover (already handled by `--cs-color-*-hover` tokens and `button.css`) rather than darkening.
    - **Exception for `bg-elevation-1` Interactive Surfaces:** When an interactive element or card uses `bg-elevation-1` (which is pure `white` in Light Mode sitting on a `base-100` canvas), it cannot brighten further in Light Mode—and darkening it to `base-50` or `base-100` on hover looks muddy and makes it blend into the `elevation-0` background. Instead, keep the surface color pure `bg-elevation-1` and indicate hover through **text/icon color brightening** (e.g., `text-weak` -> `text-strong`), subtle shadow elevation (`shadow-sm` -> `shadow-md`), or micro-scale physics.

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

### Interactive Surfaces & The `< 1936px²` Hit Area Rule

Touch ergonomics depend primarily on **total interactive surface area**, not individual dimension limits:

- **The `< 1936px²` Baseline:** A standard 44px × 44px touch target provides an area of `1936px²`. Because rounded corners (`border-radius: full` or `squircle`) clip corners, actual surface area often drops even lower (~1200px²).
- **Rule of Thumb:** Any interactive control with a **total surface area below `1936px²`** MUST include an invisible `<span class="cs-hit-area" data-size="md" aria-hidden="true">` (or `data-size="lg"`) touch expander (e.g., all compact icon-only buttons, close triggers, checkboxes).
- **Total Area vs. Single Dimensions:** This rule evaluates **total surface area**, not single narrow sides. A control with one compact dimension (e.g., 36px height) that is elongated (e.g., a 36px × 120px text button = 4320px²) provides more than double the required landing area and does NOT require a hit area by default.
- **Contextual Opt-In:** Developers can still contextually add a `.cs-hit-area` to larger elongated controls whenever a specific dense toolbar layout or mobile view benefits from it, but the `< 1936px²` threshold serves as the standard floor.
- **Rare Exceptions Require User Alignment:** In rare layout edge cases (e.g., extremely tight, dense constraints where expanding target bounds might overlap adjacent interactive elements—usually indicating a layout flaw), omitting a hit area on an element `< 1936px²` is only permissible as an explicit exception. Agents MUST explicitly consult and align with the user before deciding to omit a hit area or bypass lint warnings on sub-`1936px²` controls.

---

## 6. UX Patterns: Inline-First & Progressive Disclosure

- **Inline UI over Modals (Anti-Modal Rule):** NEVER spawn a modal dialog for confirmations, renaming, quick edits, or simple creations.
    - _Delete confirmation:_ Morph the delete button inline into a "Confirm Delete?" state.
    - _Renaming / Editing:_ Swap or morph the label inline into an input field.
    - _Exception:_ Only use modals/overlays when displaying heavy full-viewport media (e.g., a fullscreen PDF viewer or image lightbox).
- **Whitespace & Progressive Disclosure:** Leave generous breathing room. Keep primary, high-frequency actions directly accessible (using clean patterns like **Segmented Controls** for view/mode switching), and tuck infrequent or secondary actions inside `...` overflow menus or dedicated subviews.
- **Edge Alignment:** Align the outer edges of islands, text columns, and controls on clean vertical and horizontal grid lines.
- **Responsive by Default:** Unless building a specialized desktop-only tool, design layouts and islands to adapt cleanly across both desktop and mobile viewports.

---

## 7. Motion, Physics & Micro-Interactions

Animations must feel responsive, physical, and completely free of layout jank:

- **Color, Shadow & Background Transitions:** Use `200ms var(--cs-ease-quad-out)`.
- **Tactile Press & Release Physics (`--cs-spring-release`):** Has a strong ~28% overshoot. Use strictly for small `transform` scale deltas (e.g., button squash-and-stretch `0.95 -> 1.0` as in `../css/components/button.css`, or checkbox pops). NEVER use `--cs-spring-release` on large spatial movements or `opacity`/`color`.
- **UI Morphing, Switches & Segmented Controls (`--cs-spring-snappy`):** Has a subtle ~4% micro-overshoot. Ideal for sliding segmented-control pills, toggle switch thumbs, inline button morphs, and popovers where a physical, tactile settle feels premium without bouncing excessively.
- **Large Spatial Movements (Sidebars, Drawers, Panels):** Use clean deceleration curves without overshoot like `--cs-ease-expo-out` or `--cs-ease-cubic-out`.
- **Zero-Jank Collapse/Slide Animations:** When animating height/width (e.g., Svelte `slide` transition or accordion reveals), NEVER put `margin` or parent `gap` directly on the collapsing element, as it causes a visual jump at the start/end of the transition. Wrap the inner content and apply padding inside the animated container instead.
- **Crafted Polish:** Include high-craft UX details where appropriate: scroll-fade masks on scrollable lists, keyboard roving `tabindex` / arrow-key navigation in toolbars and menus, and intelligent menu positioning fallbacks.
