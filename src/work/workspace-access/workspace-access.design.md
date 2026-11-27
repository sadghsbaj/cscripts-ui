# Workspace Access Design Spec (`src/work/workspace-access/`)

## 1. Visual Direction & Desktop-First Work Proportions

`WorkWorkspaceGate` and `WorkWorkspaceMenu` govern local folder access across `cscripts-ui` Work applications. Both surfaces follow the repo's crafted minimalism: borderless monochrome depth (`canvas` → `elevated` → `sunken` / `base-soft`), a single `accent` color for primary actions, semantic status restraint (`positive`, `caution`, `negative`), and tactile spring physics.

### Proportions & Alignment with Work App Chrome

- **Desktop-first scale:** Tuned to [`WorkAppFrame`](../app-layout/WorkAppFrame.svelte) (`1280px` max content width, `48px` horizontal gutters) and [`WorkAppHeader`](../app-layout/WorkAppHeader.svelte) (`48px` chrome height, `48px × 48px` `xl` controls). Controls are comfortable for mouse and trackpad precision without mobile-sized cramping.
- **Graceful laptop responsiveness:** On narrower laptop viewports (`< 640px`), the Gate scales fluidly within [`Overlay`](../../modules/overlay/Overlay.svelte)'s `--cs-overlay-padding` (`clamp(16px, 8px + 2dvmin, 32px)`) while keeping `40px` (`lg`) primary hit targets intact.
- **Borderless separation:** Zero raw CSS `border`. Surfaces separate via `--cs-color-elevated`, `--cs-color-sunken`, `--cs-color-base-soft`, and `--cs-shadow-floating`.
- **Token discipline:** Direct `px` units everywhere; component custom properties use `--cs-work-workspace-gate-*` and `--cs-work-workspace-menu-*` (never `--_` prefixes).

---

## 2. `WorkWorkspaceGate` — Blocking Stage & Backdrop

`WorkWorkspaceGate` renders inside an external `<Overlay variant="blur">` when workspace access is required (`unlinked`, `needs-permission`, `stale`, `unsupported`).

### Shell Anatomy & Dimensions

```text
.cs-overlay[data-variant="blur"]
└── .cs-work-workspace-gate (div, data-state, data-blocked?)
    ├── .cs-work-workspace-gate-info-trigger (Button variant="ghost" size="xs" iconOnly + HitArea)
    │   └── Popover (read-only explanation)
    ├── .cs-work-workspace-gate-stage (120px × 88px morphing vector centerpiece)
    ├── .cs-work-workspace-gate-header
    │   ├── .cs-work-workspace-gate-title
    │   ├── [optional] .cs-work-workspace-folder-pill (needs-permission | stale)
    │   └── .cs-work-workspace-gate-description
    └── [optional] .cs-work-workspace-gate-actions (Button size="lg" row)
```

| Property | Desktop (`≥ 640px`) | Compact Laptop (`< 640px`) | Notes |
| :--- | :--- | :--- | :--- |
| `--cs-work-workspace-gate-max-width` | `460px` | `100%` | Sits cleanly between `--cs-container-md` (`448px`) and `--cs-container-lg` (`512px`). |
| `--cs-work-workspace-gate-padding` | `32px` | `24px` | Generous desktop breathing room. |
| `--cs-work-workspace-gate-radius` | `28px` | `24px` | Matches `Modal` large-island geometry. |
| `--cs-work-workspace-gate-squircle` | `var(--cs-squircle)` | `var(--cs-squircle)` | Superellipse `2.0` for large floating islands. |
| `--cs-work-workspace-gate-bg` | `var(--cs-color-elevated)` | `var(--cs-color-elevated)` | — |
| `--cs-work-workspace-gate-shadow` | `var(--cs-shadow-floating)` | `var(--cs-shadow-floating)` | Crisp dark-mode rim + ambient depth over blurred backdrop. |

### External `<Overlay variant="blur">` & Backdrop Attention Feedback

- **Backdrop:** Hosted inside `<Overlay variant="blur">`, which applies `backdrop-filter: blur(16px) saturate(160%)`, scroll locking, and top-layer promotion.
- **Entry & Exit Physics:** Matches `Modal.svelte` so all blocking dialogs share identical weight:
  - **Enter:** `opacity: 0 → 1` (`--cs-dur-effect` `160ms` `--cs-ease-effect`), `scale: 0.94 → 1` and `translate: 0 8px → 0` (`--cs-dur-enter-md` `380ms` `--cs-ease-enter` via `--cs-spring-snappy`), initialized in `@starting-style`.
  - **Exit:** `opacity: 1 → 0`, `scale: 1 → 0.96`, `translate: 0 → 4px` (`--cs-dur-exit-md` `120ms` `--cs-ease-exit`).
  - **Compositor layer hygiene:** `:popover-open` omits permanent `will-change` so centered dialog text retains subpixel antialiasing without compositor-layer blurring.
- **Backdrop Click Attention (`[data-blocked]`):** Clicking the `<Overlay>` backdrop (`event.target === event.currentTarget`) does not dismiss the Gate. Instead, it sets `data-blocked` for `280ms` (using a `requestAnimationFrame` reset guard on rapid clicks, matching `Modal.nudge()`):
  - Keyframe `cs-work-workspace-gate-blocked` (`var(--cs-dur-280)` `var(--cs-ease-quad-out)`):
    - Subtle horizontal micro-shake (`translateX(0 → -5px → 5px → -3px → 2px → 0)`) paired with a gentle `scale(1 → 1.008 → 1)` lift.
    - Never violent or bouncy; communicates "action required here" calmly.

---

## 3. Gate Stage & Morph Visualization

Avoid a generic `15px` icon box. The centerpiece `.cs-work-workspace-gate-stage` (`120px × 88px`, centered above the title) is a custom layered vector composition that morphs continuously across all four gate states without unmounting DOM nodes.

### Visual Architecture

1. **Ambient Halo Plate (`.cs-work-workspace-gate-stage-halo`):**
   - `88px × 72px` soft squircle (`border-radius: 22px`, `corner-shape: var(--cs-squircle)`), centered behind the folder.
   - Smoothly transitions `background-color` (`--cs-dur-effect` `160ms` `--cs-ease-effect`) to anchor the state's semantic mood without heavy borders.
2. **Layered Folder Motif (`.cs-work-workspace-gate-folder`):**
   - Two-part custom SVG/CSS folder (`56px × 44px`, `stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`):
     - **Back plate + tab:** Stable anchor silhouette.
     - **Front flap:** `transform-origin: bottom center`, capable of subtle tilt/compression (`scaleY` / `translateY`) to feel physical when opening (`unlinked`) vs. locked (`needs-permission`).
3. **Satellite State Badge (`.cs-work-workspace-gate-badge`):**
   - `26px × 26px` circular/squircle badge (`border-radius: var(--cs-radius-full)`, `box-shadow: 0 0 0 3px var(--cs-color-elevated)` cutout ring so it separates cleanly from the folder corner at bottom-right).
   - Houses the state-specific `14px` glyph (`Plus`/link dot, `Lock`, `RotateCcw`, or `Ban`) that crossfades and scales (`scale: 0.72 → 1`) with `--cs-dur-320` `--cs-ease-enter`.

### State Morph Matrix

| `data-state` | Halo Fill | Folder Stroke / Fill | Front Flap Transform | Satellite Badge |
| :--- | :--- | :--- | :--- | :--- |
| `unlinked` | `--cs-color-accent-soft` | `--cs-color-accent-soft-fg` / subtle accent tint | Slightly ajar (`translateY(1.5px) scaleY(0.94)`) | `--cs-color-accent-solid` bg, white `+` / folder-open cue |
| `needs-permission` | `--cs-color-caution-soft` | `--cs-color-caution-soft-fg` / subtle caution tint | Closed & seated (`translateY(0) scaleY(1)`) | `--cs-color-caution-solid` bg, white `Lock` glyph |
| `stale` | `--cs-color-negative-soft` | `--cs-color-negative-soft-fg` / muted tint | Subtle `-2deg` tilt (`rotate(-2deg)`) | `--cs-color-negative-solid` bg, white `RotateCcw` / alert cue |
| `unsupported` | `--cs-color-base-soft` | `--cs-color-disabled-fg` | Flat (`scaleY(0.96)`, desaturated) | `--cs-color-negative-solid` bg, white `Ban` glyph |

- **Morph Timing:** Geometry transforms (`transform`, `scale`, `rotate`) use `--cs-dur-320` (`320ms`) with `--cs-ease-enter` (`--cs-spring-snappy`). Color and opacity transitions use `--cs-dur-effect` (`160ms`) with `--cs-ease-effect`.

---

## 4. Typography, Copy, Folder Pill & Button Craft

All Gate copy is ultra-concise, plain German without technical jargon (`IndexedDB`, `File System API`, `Handle`), parenthetical hints, or hyphen separators.

### Optical Hierarchy & Spacing

- **Alignment:** Centered vertical stack (`display: flex; flex-direction: column; align-items: center; text-align: center;`).
- **Rhythm:** Stage → `16px` → Title → `8px` → (Optional Folder Pill → `8px`) → Description → `24px` → Actions.
- **Title (`.cs-work-workspace-gate-title`):** `font-size: var(--cs-text-xl)` (`20px`), `font-weight: 700`, `line-height: var(--cs-leading-tight)` (`1.25`), `letter-spacing: var(--cs-tracking-tight)`, `color: var(--cs-color-text-strong)`.
- **Description (`.cs-work-workspace-gate-description`):** `font-size: var(--cs-text-sm)` (`14px`), `line-height: var(--cs-leading-normal)` (`1.5`), `color: var(--cs-color-text-weak)`, `max-inline-size: 34ch` (prevents wide, ragged 3-line blocks).

### Folder-Name Pill (`.cs-work-workspace-folder-pill`)

Shown in `needs-permission` and `stale` states to ground the user in *which* folder is affected:

- **Dimensions:** `height: 28px`, `padding-inline: 10px`, `gap: 6px`, `max-inline-size: 280px`.
- **Surface:** `background-color: var(--cs-color-sunken)`, `box-shadow: var(--cs-shadow-sunken)` (or `--cs-color-base-soft` flat), `border-radius: var(--cs-radius-full)`, `corner-shape: var(--cs-squircle-soft)`.
- **Content:** `14px` `Folder` icon (`strokeWidth: 2`, `--cs-color-text-weak`; `--cs-color-negative-soft-fg` in `stale`) + folder name (`--cs-text-xs`, `font-weight: 600`, `--cs-color-text-strong` in `needs-permission`, `--cs-color-text-weak` in `stale`), single-line truncated via `.text-trim-truncate`.

### Copy & Action Matrix

| State | Title | Description | Actions (`Button size="lg"`, `40px` height) |
| :--- | :--- | :--- | :--- |
| `unlinked` | `Arbeitsordner wählen` | `Wähle einen lokalen Ordner, in dem deine Daten sicher gespeichert werden.` | **Primary:** `Ordner wählen` *(no icon — keeps width compact)* |
| `needs-permission` | `Ordner freigeben` | `Bestätige den Zugriff für diesen Ordner, um weiterzuarbeiten.` | **Primary:** `Freigeben` *(no icon)* + **Secondary:** `Wechseln` |
| `stale` | `Ordner nicht gefunden` | `Der zuletzt verwendete Ordner ist nicht mehr verfügbar.` | **Primary:** `Neu wählen` *(no icon)* |
| `unsupported` | `Browser nicht unterstützt` *(UNC `file://`: `Netzwerkpfad nicht unterstützt`)* | `Dieser Browser unterstützt keinen direkten Ordnerzugriff. Bitte nutze Chrome oder Edge.` *(UNC `file://`: Hinweis auf verbundenes Laufwerk statt `\\server\…`)* | *None* |

- **Action Row:** `display: flex; align-items: center; justify-content: center; gap: 10px;`.
- **No-icon primary CTA:** Keeping icons out of `"Ordner wählen"`, `"Freigeben"`, and `"Neu wählen"` maintains crisp typographic balance and compact button proportions.

---

## 5. Info Trigger & Read-Only Popover

An unobtrusive `?` trigger sits in the Gate's top-right corner, respecting the repo's tighter corner-offset rule (`16px` offset vs. `32px` card padding).

- **Trigger:** `<Button variant="ghost" size="xs" iconOnly>` (`28px × 28px`, `position: absolute; inset-block-start: 16px; inset-inline-end: 16px;`), `HelpCircle` (`16px`, `--cs-color-text-weak` → `--cs-color-text-strong` on hover), with `<HitArea size="md" />` (`784px² < 1936px²` requires hit expansion).
- **Popover:** `<Popover placement="bottom-end" offset="8px" width="content">`
  - **Surface:** `inline-size: 272px`, `padding: 14px 16px`, `background-color: var(--cs-color-elevated)`, `border-radius: var(--cs-radius-2xl)` (`16px`), `corner-shape: var(--cs-squircle)`, `box-shadow: var(--cs-shadow-floating)`.
  - **Typography:** Left-aligned. Heading `"Warum ist das nötig?"` (`--cs-text-xs`, `font-weight: 600`, `--cs-color-text-strong`, `margin-block-end: 4px`) + body `"Deine Dateien bleiben direkt auf deinem Gerät. Aus Sicherheitsgründen fragt der Browser nach jedem Neustart kurz um Erlaubnis."` (`--cs-text-xs`, `line-height: 1.5`, `--cs-color-text-weak`).
  - **Motion:** Uses `Popover`'s built-in `[data-animate]` spring (`--cs-dur-enter-md` / `--cs-dur-exit-md`).

---

## 6. `WorkWorkspaceMenu` — Status-Dot Popover

`WorkWorkspaceMenu` is a compact, calm `<Popover>` anchored directly below [`WorkAppStatusDot`](../app-controls/WorkAppStatusDot.svelte) inside `WorkAppHeader`. It uses **no `<Overlay>` blur**.

### Anchor & Shell Proportions

- **Placement & Offset:** `placement="bottom-end"` (or `"bottom"` depending on header slot alignment), `offset="16px"`. The `16px` offset clears `WorkAppStatusDot`'s `12px` core and `2.6×` sonar pulse rings so the menu sits cleanly below the `48px` header bar.
- **Dimensions:** `inline-size: 264px` (`min-inline-size: 240px`, `max-inline-size: 300px`), `padding: 12px`.
- **Surface:** `background-color: var(--cs-color-elevated)`, `border-radius: 20px`, `corner-shape: var(--cs-squircle)`, `box-shadow: var(--cs-shadow-floating)`.
- **Concentricity:** `20px` outer radius minus `12px` padding yields an `8px` (`--cs-radius-lg`) inner radius for nested pills and action buttons.

### Connected State (`positive`)

```text
.cs-work-workspace-menu (Popover, data-state="connected")
├── .cs-work-workspace-menu-status (8px positive dot + "Ausgewählt")
├── .cs-work-workspace-menu-folder (recessed pill: 14px Folder icon + truncated folder name)
└── .cs-work-workspace-menu-actions (2-up row, gap: 8px)
    ├── Button (variant="secondary", size="sm") → "Wechseln"
    └── Button (variant="ghost", negative, size="sm") → "Trennen"
```

- **Status Row:** `display: flex; align-items: center; gap: 8px; padding-inline: 4px;`.
  - `8px × 8px` static dot (`border-radius: var(--cs-radius-full)`, `background-color: var(--cs-color-positive-solid)`).
  - Label `"Ausgewählt"` (`--cs-text-xs`, `font-weight: 600`, `--cs-color-positive-soft-fg`).
- **Folder Box:** `display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-block: 8px 12px;`.
  - `background-color: var(--cs-color-sunken)`, `box-shadow: var(--cs-shadow-sunken)`, `border-radius: var(--cs-radius-lg)` (`8px`), `corner-shape: var(--cs-squircle-soft)`.
  - `14px` `Folder` icon (`--cs-color-text-weak`) + folder name (`--cs-text-sm`, `font-weight: 600`, `--cs-color-text-strong`, `.text-trim-truncate`).
- **Actions:** `display: flex; gap: 8px;`.
  - `"Wechseln"`: `Button` `variant="secondary"`, `size="sm"` (`32px` height), `flex: 1`.
  - `"Trennen"`: `Button` `variant="ghost"`, `negative`, `size="sm"` (`32px` height) — stays calm monochrome at rest and reveals `--cs-color-negative-soft-fg` on hover/focus/active.

### Disconnected & Warning Fallback States

Status dot color inside the menu header mirrors `WorkAppStatusDot`'s `status` prop (`positive`, `caution`, `negative`, `base`):

| State | Dot Color | Status Label | Folder / Hint | Actions (`Button size="sm"`) |
| :--- | :--- | :--- | :--- | :--- |
| `unlinked` | `var(--cs-color-base-400)` (`base`) | `Kein Ordner` | Short 1-line hint (`--cs-text-xs`, `--cs-color-text-weak`): `"Bitte wähle einen Arbeitsordner."` | Full-width **Primary:** `Ordner wählen` |
| `needs-permission` | `var(--cs-color-caution-solid)` (`caution`) | `Freigabe nötig` | Recessed folder box with known folder name | **Primary:** `Freigeben` (`flex: 1`) + **Secondary:** `Wechseln` |
| `stale` | `var(--cs-color-negative-solid)` (`negative`) | `Ordner fehlt` | Recessed folder box (muted `--cs-color-text-weak` + negative folder icon) | Full-width **Primary:** `Neu wählen` |
| `unsupported` | `var(--cs-color-negative-solid)` (`negative`) | `Nicht unterstützt` | Short 1-line hint (`--cs-text-xs`, `--cs-color-text-weak`): `"Bitte Chrome oder Edge nutzen."` *(UNC `file://`: `"Bitte über Laufwerksbuchstaben öffnen."`)* | *None* |

---

## 7. Accessibility & Reduced Motion

- **Focus & Keyboard:** `WorkWorkspaceGate` relies on global `focus.css` `:focus-visible` rings; primary action receives logical tab order right after the `?` info trigger (or first focusable element). `WorkWorkspaceMenu` uses native `popover="auto"` light-dismiss on `Escape` and outside click.
- **Reduced Motion:** Both components rely on global `motion.css` `@media (prefers-reduced-motion: reduce)` neutralization—no duplicate component-level media queries.
- **Hit Areas:** Every compact control below `1936px²` (the `28px × 28px` `?` info button and `12px × 12px` `WorkAppStatusDot`) includes `<HitArea />` expansion.
