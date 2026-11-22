# Sidebar (`sidebar`) Design Spec (`src/modules/sidebar/`)

## 1. Visual Direction & Core Philosophy

`Sidebar` is a **quiet, monochrome architectural frame for persistent navigation**. An application sidebar sits beside primary content for hours at a time; loud accent washes, cramped micro-gaps, misaligned icons, or choppy collapse snaps immediately degrade the perceived craft of the entire workspace.

Every visual, spatial, and motion decision in `sidebar` follows five principles:
1. **Crafted Monochrome Navigation:** Selected items (`[data-current]`) use calibrated neutral contrast—never a large light-blue `--cs-color-accent-soft` slab. `--cs-color-accent-*` is reserved strictly for `:focus-visible` outlines, primary CTA buttons, and explicit opt-in badges.
2. **Borderless Separation Over Wireframe Chrome:** Surfaces separate through elevation, directional edge light, and generous whitespace—never raw `1px solid` CSS borders or `<hr>` section dividers.
3. **Single Vertical Axis Invariant:** Brand logos (`SidebarHeader`), leading navigation icons (`SidebarItem`), and footer avatars (`SidebarFooter`) all share the **exact same vertical center axis** (`x = railWidth / 2`) in both expanded and `rail` modes—guaranteeing zero horizontal jump.
4. **Razor-Sharp Interactive Physics:** Every clickable surface that scales on `:active` declares `will-change: scale;` paired with exact integer `line-height`s, eliminating Chromium's subpixel text-shift and blur on click release.
5. **Choreographed, Zero-Snap Motion:** Rail and hidden collapse animate as one unified physical object—text dissolves inward cleanly before width contracts so labels never get chopped mid-fade, section labels fold vertically without jumping, and `SidebarViews` / `Overlay` retain their crisp directional choreography.

---

## 2. Shell Variants (`elevated` | `floating` | `transparent`)

`Sidebar` exposes three intentional shell treatments via `variant` (required, no default). All styles live in `@layer components.composite`.

### Variant Matrix & Token Mapping

| Property / Token | `elevated` | `floating` | `transparent` |
| :--- | :--- | :--- | :--- |
| **Role** | Edge-docked full-height application shell | Elevated squircle island floating inside a padded inset | Flush navigation directly over `--cs-color-canvas` |
| **`--cs-sidebar-bg`** | `var(--cs-color-elevated)` | `var(--cs-color-elevated)` | `transparent` |
| **`--cs-sidebar-fg`** | `var(--cs-color-text-main)` | `var(--cs-color-text-main)` | `var(--cs-color-text-main)` |
| **`--cs-sidebar-inset`** | `0px` | `var(--cs-sidebar-floating-inset)` (`8px` / `10px` / `12px`) | `0px` |
| **`--cs-sidebar-radius`** | `0px` | `16px` (`sm`) / `20px` (`md`) / `24px` (`lg`) | `0px` |
| **Corner Shape** | — | `corner-shape: var(--cs-squircle)` | — |
| **`--cs-sidebar-shadow`** | Directional inner-edge shadow/rim *(see below)* | `var(--cs-shadow-floating)` | `none` |
| **`--cs-sidebar-item-bg-current`** | `var(--cs-color-base-soft-hover)` | `var(--cs-color-base-soft-hover)` | `var(--cs-color-elevated)` |
| **`--cs-sidebar-item-shadow-current`** | `none` | `none` | `var(--cs-shadow-elevated)` |
| **`--cs-avatar-ring-color`** | `var(--cs-color-elevated)` | `var(--cs-color-elevated)` | `var(--cs-color-canvas)` |

> **Avatar Status Ring Hygiene:** Overriding `--cs-avatar-ring-color: var(--cs-sidebar-bg)` on `elevated` and `floating` ensures an `<Avatar status="online" />` inside `SidebarFooter` cuts out cleanly against the white/`zinc-900` sidebar surface rather than showing a grey `canvas` halo.

### 1. `elevated` — Edge-Docked Directional Depth

- Computes a physical horizontal sign `--cs-sidebar-edge-dir` (`1` for `[data-side="start"]:dir(ltr)` and `[data-side="end"]:dir(rtl)`, `-1` otherwise):
  ```css
  --cs-sidebar-shadow:
      light-dark(
          calc(1px * var(--cs-sidebar-edge-dir)) 0 0 0 rgb(0 0 0 / 0.045),
          inset calc(-1px * var(--cs-sidebar-edge-dir)) 0 0 0 rgb(255 255 255 / 0.06)
      ),
      light-dark(
          calc(4px * var(--cs-sidebar-edge-dir)) 0 16px -4px rgb(0 0 0 / 0.05),
          calc(4px * var(--cs-sidebar-edge-dir)) 0 16px -4px rgb(0 0 0 / 0.35)
      );
  ```
- Sets `position: relative; z-index: 1;` when `inline` so the whisper-soft directional wash paints above the adjacent `canvas` workspace. When `collapseMode="hidden"` settles to `closed`, `.cs-sidebar-surface` becomes `opacity: 0; visibility: hidden;` so zero ghost edge remains.

### 2. `floating` — The Tactile Island

- `.cs-sidebar[data-variant="floating"]` is transparent and applies `padding: var(--cs-sidebar-inset)` (`8px` / `10px` / `12px`) around `.cs-sidebar-surface`.
- **Width Invariant:** `--cs-sidebar-width` and `--cs-sidebar-rail-width` size `.cs-sidebar-surface`, while the outer `.cs-sidebar` adds `calc(... + var(--cs-sidebar-inset) * 2)`.
- **Concentric Squircle Radii (`outerRadius - paddingX === itemRadius`):**
  - `sm`: `16px` (`--cs-radius-2xl`) outer, `8px` `padding-x` -> `8px` (`--cs-radius-lg`) item pills
  - `md`: `20px` outer, `10px` `padding-x` -> `10px` item pills
  - `lg`: `24px` (`--cs-radius-3xl`) outer, `12px` `padding-x` -> `12px` (`--cs-radius-xl`) item pills

### 3. `transparent` — Quiet Canvas Integration

- Sets `background-color: transparent; box-shadow: none; border-radius: 0;`.
- Because `transparent` sits directly over `--cs-color-canvas` (`zinc-100` light / `zinc-950` dark), its selected `[data-current]` item uses a **tactile elevated monochrome pill** (`--cs-color-elevated` + `--cs-shadow-elevated`), mirroring `SegmentedControl`'s active thumb so the active route reads with razor-sharp clarity over `canvas`.

---

## 3. Monochrome `current` State & Complete Item State Matrix

### Killing the Light-Blue Selected Row

Large `--cs-color-accent-soft` rows wash a calm workspace in baby-blue tint and visually overwhelm dense navigation lists. `SidebarItem[data-current]` is strictly **monochrome**:

- **On `elevated` & `floating` (`--cs-color-elevated` background):**
  - **Rest:** `transparent`, `--cs-color-text-main`, icon `--cs-color-text-weak` (`stroke-width: 2`).
  - **Hover / `[data-open]`:** `--cs-color-base-soft` (`5%` light / `11%` dark), `--cs-color-text-strong`, icon `--cs-color-text-main`.
  - **`[data-current]`:** `--cs-color-base-soft-hover` (`9%` light / `17%` dark), `--cs-color-text-strong`, `font-weight: 500`, icon `--cs-color-text-strong` (`stroke-width: 2.25`).
  - **`[data-current]:hover`:** Subtle `+2–3%` reinforcement (`--cs-sidebar-item-bg-current-hover`: `light-dark(color-mix(in oklch, var(--cs-color-base-900) 11%, transparent), color-mix(in oklch, var(--cs-color-base-100) 20%, transparent))`) so hovering the active item stays steady and tactile without flashing.
- **On `transparent` (over `--cs-color-canvas`):**
  - **Hover / `[data-open]`:** `--cs-color-base-soft` (`5%` / `11%`).
  - **`[data-current]`:** `background-color: var(--cs-color-elevated); box-shadow: var(--cs-shadow-elevated); color: var(--cs-color-text-strong); font-weight: 500;`.
  - **`[data-current]:hover`:** `background-color: var(--cs-color-elevated-hover); box-shadow: var(--cs-shadow-elevated);`.

### Mandatory `will-change: scale` & Subpixel Stability

To eliminate Chromium's text-shift and blur artifact at `:active` scale `transitionend` (matching `SegmentedControlItem`, `ToggleButtonGroup`, `Chip`, and `Popover`):

- **MUST apply `scale: 1; will-change: scale;`** to:
  1. `.cs-sidebar-item` (all nav links, buttons, group triggers, and footer profile rows)
  2. `.cs-sidebar-section-label[data-collapsible]` (collapsible section header buttons)
  3. `.cs-sidebar-toggle` (collapse/expand toggle button)
- Pair with **exact integer `line-height`s** (`16px`, `18px`, `20px`, `22px`) and even integer row heights (`32px`, `36px`, `40px`, `44px`) so GPU-promoted layers always land on whole physical pixels.

### Complete `SidebarItem` State Matrix

All item pills use `border-radius: var(--cs-sidebar-item-radius); corner-shape: var(--cs-squircle-smooth); scale: 1; will-change: scale;`.

| State | Background (`elevated` / `floating`) | Background (`transparent`) | Foreground & Icon | Physics & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Rest** | `transparent` | `transparent` | `--cs-color-text-main` / `--cs-color-text-weak` icon (`stroke-width: 2`) | Nested items step down to `--cs-color-text-weak` text. |
| **`:hover` / `[data-open]`** | `--cs-color-base-soft` | `--cs-color-base-soft` | `--cs-color-text-strong` / `--cs-color-text-main` icon | `[data-open]` holds highlight while `ContextMenu` or row `Dropdown` is open. |
| **`:active` (Press)** | `--cs-color-base-soft-hover` | `--cs-color-base-soft-hover` | `--cs-color-text-strong` | `scale: 0.985` (expanded) / `0.96` (rail tiles) over `--cs-dur-press` (`140ms`) `--cs-ease-press`. |
| **`[data-current]`** | `--cs-color-base-soft-hover` | `--cs-color-elevated` + `--cs-shadow-elevated` | `--cs-color-text-strong` (`font-weight: 500`) / `stroke-width: 2.25` | Zero blue wash. Hover steps softly to `--cs-sidebar-item-bg-current-hover` / `--cs-color-elevated-hover`. |
| **`[data-negative]` (Rest)** | `transparent` | `transparent` | `--cs-color-text-main` / `--cs-color-text-weak` icon | Strictly calm monochrome at rest. |
| **`[data-negative]` (Hover / Focus / Open)** | `--cs-color-negative-soft` | `--cs-color-negative-soft` | `--cs-color-negative-soft-fg` | `:active` deepens to `--cs-color-negative-soft-hover` + `scale: 0.985`. |
| **`[data-disabled]`** | `transparent` | `transparent` | `--cs-color-disabled-fg` | `--cs-disabled-opacity: 1`; `pointer-events: none`. |

### Badge vs. Hover 3-Dot (`SidebarItemActions`) Choreography

- **In-Place Badge-to-Actions Cross-Swap:** When `.cs-sidebar-item-row` contains a trailing `<Badge>` (`:has(.cs-badge, .cs-sidebar-item-badge)`), hovering/focusing/opening the row cross-swaps the badge out (`opacity: 0; scale: 0.9;` over `100ms`) in the exact same footprint as `.cs-sidebar-item-actions` fades in (`opacity: 1; scale: 1;`). Zero label reflow, zero badge collision.
- **Badge-less / Touch / `alwaysVisible` Fallback:** `.cs-sidebar-item` smoothly reserves `padding-inline-end: var(--cs-sidebar-actions-reserve)` (`30px` / `32px` / `36px`).

---

## 4. Spacing, Proportions, Region Rhythm & Typography

### Master Scale Table (`sm` | `md` | `lg`)

| Token | `sm` *(Compact / Tool)* | `md` *(Default App Shell)* | `lg` *(Touch / Spacious)* |
| :--- | :--- | :--- | :--- |
| `--cs-sidebar-width` | `228px` | `264px` | `300px` |
| `--cs-sidebar-rail-width` | `52px` | `60px` | `68px` |
| `--cs-sidebar-floating-inset` | `8px` | `10px` | `12px` |
| `--cs-sidebar-padding-x` | `8px` | `10px` | `12px` |
| `--cs-sidebar-padding-y` | `12px` | `14px` | `16px` |
| `--cs-sidebar-region-gap` | `10px` | `12px` | `14px` |
| `--cs-sidebar-section-gap` | `18px` | `22px` | `26px` |
| `--cs-sidebar-rail-section-gap` | `8px` | `8px` | `10px` |
| `--cs-sidebar-rail-tile` *(derived)* | `36px` | `40px` | `44px` |
| `--cs-sidebar-floating-radius` | `16px` (`--cs-radius-2xl`) | `20px` | `24px` (`--cs-radius-3xl`) |
| `--cs-sidebar-item-height` | `32px` | `36px` | `40px` |
| `--cs-sidebar-rail-item-height` | `36px` | `40px` | `44px` |
| `--cs-sidebar-item-padding-x` | `8px` | `10px` | `11px` |
| `--cs-sidebar-item-gap` | `8px` | `10px` | `12px` |
| `--cs-sidebar-item-list-gap` | `2px` | `2px` | `2px` |
| `--cs-sidebar-rail-gap` | `4px` | `4px` | `4px` |
| `--cs-sidebar-item-radius` | `8px` (`--cs-radius-lg`) | `10px` | `12px` (`--cs-radius-xl`) |
| `--cs-sidebar-icon-box` | `20px` | `20px` | `22px` |
| `--cs-sidebar-icon-size` | `16px` | `18px` | `20px` |
| `--cs-sidebar-indent` | `16px` | `20px` | `22px` |
| `--cs-sidebar-actions-reserve` | `30px` | `32px` | `36px` |
| `SidebarToggle` `size` (auto) | `"xs"` (`28px`) | `"sm"` (`32px`) | `"md"` (`36px`) |
| `ScrollArea` `size` (auto) | `"sm"` (`6px`) | `"sm"` (`6px`) | `"md"` (`8px`) |

### Vertical Region Rhythm (Eliminating Cramped Micro-Gaps)

Previously, `4px` seam padding caused `SidebarHeader` -> `SegmentedControl` (`SidebarSubheader`) -> first `SidebarSectionLabel` to collide visually. Regions now follow an intentional top-down cadence governed by `--cs-sidebar-padding-y` (`12 / 14 / 16px`) and `--cs-sidebar-region-gap` (`10 / 12 / 14px`):

1. **`.cs-sidebar-header`:** `padding-inline: var(--cs-sidebar-padding-x); padding-block: var(--cs-sidebar-padding-y) var(--cs-sidebar-region-gap);` (`14px` top, `12px` bottom at `md`).
2. **`.cs-sidebar-subheader-inner`:** `padding-inline: var(--cs-sidebar-padding-x); padding-block: 0 var(--cs-sidebar-region-gap);` (`12px` clean breathing room above from header, `12px` below before body!). When `SidebarSubheader` is `:first-child`, `padding-block-start: var(--cs-sidebar-padding-y);`.
3. **`.cs-sidebar-pinned`:** `padding-inline: var(--cs-sidebar-padding-x); padding-block: 0 var(--cs-sidebar-region-gap);` (top `padding-y` if `:first-child`, bottom `padding-y` if `:last-child`).
4. **`.cs-sidebar-scroll-content` (inside `SidebarBody`):** `padding-inline: var(--cs-sidebar-padding-x); padding-block: 4px var(--cs-sidebar-region-gap);` — preserves `4px` `:focus-visible` clearance at the scrollport top edge while combining with the subheader's bottom gap for `16px` total breathing room before the first section.
5. **`.cs-sidebar-section` & Labels:**
   - **Horizontal Alignment Fix:** Both `.cs-sidebar-section-header` AND standalone `.cs-sidebar-section-label` (when not inside `.cs-sidebar-section-header`) MUST apply `padding-inline: var(--cs-sidebar-item-padding-x);` so section headings align flush with `.cs-sidebar-item` icons below!
   - **Gestalt Proximity:** Section labels apply `padding-block: 2px 6px;` so each label hugs its own items (`6px`) while staying clearly separated from the preceding section (`--cs-sidebar-section-gap`: `18 / 22 / 26px`).
   - Collapsible `.cs-sidebar-section-label[data-collapsible]` uses `padding-inline: var(--cs-sidebar-item-padding-x); padding-block: 4px;` with `border-radius: var(--cs-radius-md);`, `scale: 1; will-change: scale;`, subtle hover color shift (`text-weak -> text-main`), and `:active { scale: 0.99; }`.
6. **`.cs-sidebar-footer`:** `margin-block-start: auto; padding-inline: var(--cs-sidebar-padding-x); padding-block: var(--cs-sidebar-region-gap) var(--cs-sidebar-padding-y);` — anchors the profile row cleanly at the bottom with generous separation from scrollable navigation.

### Typographic Scale (`sm` | `md` | `lg`)

| Slot | Role & Styling | `sm` | `md` | `lg` | Color Token |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Header Brand / Title** | Workspace title (`font-weight: 600`, `text-box: normal`) | `14px` / `20px` (`-0.01em`) | `15px` / `20px` (`-0.01em`) | `16px` / `22px` (`-0.015em`) | `--cs-color-text-strong` |
| **`SidebarSectionLabel`** | Quiet sentence-case heading (`font-weight: 500`) | `11px` / `16px` (`0.01em`) | `12px` / `16px` (`0.005em`) | `12px` / `18px` (`0.005em`, `600`) | `--cs-color-text-weak` *(hover: `text-main`)* |
| **`SidebarItemLabel` (Rest)** | Top-level nav label (`font-weight: 400`, `text-trim-truncate`) | `13px` / `18px` | `14px` / `20px` | `15px` / `20px` | `--cs-color-text-main` |
| **`SidebarItemLabel` (Nested)** | Child inside `SidebarGroupContent` (`font-weight: 400`) | `13px` / `18px` | `14px` / `20px` | `15px` / `20px` | `--cs-color-text-weak` *(hover: `text-strong`)* |
| **`SidebarItemLabel` (`current`)** | Selected route (`font-weight: 500`) | `13px` / `18px` | `14px` / `20px` | `15px` / `20px` | `--cs-color-text-strong` |
| **Badges & Counts** | `<Badge variant="soft" color="base">` (`tabular-nums`) | `size="xs"` (`10px`) | `size="sm"` (`11px`) | `size="md"` (`12px`) | `--cs-color-base-soft-fg` |
| **`SidebarFooter` Primary** | Profile name (`font-weight: 500`, `text-box: normal`) | `13px` / `18px` | `14px` / `18px` | `14px` / `20px` | `--cs-color-text-strong` |
| **`SidebarFooter` Meta** | Secondary email / plan (`font-weight: 400`, `text-box: normal`) | `11px` / `16px` | `12px` / `16px` | `12px` / `16px` | `--cs-color-text-weak` |

- **`text-trim-truncate` Rule:** Applied **strictly** to `.cs-sidebar-item-label` (`overflow-x: clip; overflow-y: visible; text-overflow: ellipsis; white-space: nowrap; text-box: trim-both cap alphabetic;`). Never applied to headers, section labels, or stacked footer text.

---

## 5. Single Vertical Axis & Connected Header / Footer Patterns

### Solving Rail Centering Once and For All

Why were the `28px` logo and `24px` avatar previously off-center in the `60px` rail? Because `padding-inline: 10px` pinned their left edges at `x = 10px` (centers at `24px` and `22px`), while the rail center is `30px`!

**The Solution — `--cs-sidebar-rail-tile` Leading Anchor Slot:**
Define `--cs-sidebar-rail-tile: calc(var(--cs-sidebar-rail-width) - var(--cs-sidebar-padding-x) * 2)`:
- **`sm`:** `36px` (`center = 8 + 18 = 26px === 52px / 2`)
- **`md`:** `40px` (`center = 10 + 20 = 30px === 60px / 2`)
- **`lg`:** `44px` (`center = 12 + 22 = 34px === 68px / 2`)

Every leading visual element in the sidebar locks to this exact center coordinate:

1. **Navigation Icons (`.cs-sidebar-item`):**
   $$\text{paddingX} + \text{itemPaddingX} + \frac{\text{iconBox}}{2} = \frac{\text{railWidth}}{2}$$
   - `sm`: `8 + 8 + 10 = 26px` | `md`: `10 + 10 + 10 = 30px` | `lg`: `12 + 11 + 11 = 34px`.
   - Always `justify-content: flex-start`; never flip `justify-content: center` in rail mode.

2. **Brand Header Slot (`[data-sidebar-rail="anchor"]` or `.cs-sidebar-rail-slot`):**
   - Wrap the `28px` (`sm`/`md`) or `32px` (`lg`) brand mark in a `inline-size: var(--cs-sidebar-rail-tile); block-size: var(--cs-sidebar-rail-tile); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;` slot.
   - **Expanded:** Slot starts at `x = paddingX`, so the brand mark's optical center is `paddingX + railTile / 2 = railWidth / 2` (`26 / 30 / 34px`)—aligned on the exact same vertical line as every nav icon below!
   - **Rail:** Sidebar contracts to `railWidth` (`paddingX + railTile + paddingX`). The brand mark **does not move a single subpixel** and sits 100% centered inside the rail!
   - Pair the brand slot with a small gap (`4px`–`6px`, since the `40px` slot already provides `6px` optical margin around a `28px` mark = `10px–12px` perceived spacing to the title!) and tag the title & trailing action button with `data-sidebar-rail="hide"`.

3. **Connected Footer Profile Row Pattern:**
   - Never float a raw disconnected `<Avatar>` + text + settings button in `SidebarFooter`.
   - Compose the footer profile as a **connected interactive row** using `<SidebarItemRow>` + `<SidebarItem>` (with `tooltip="Clara Vance"` so rail mode shows the user's name automatically!) + optional trailing `<SidebarItemActions>` (account menu `<Dropdown>`):
     - Inside `.cs-sidebar-footer .cs-sidebar-item` (or when a `.cs-sidebar-item` directly contains `.cs-avatar` / `[data-sidebar-rail="anchor"]`):
       - **Avatar sizing:** `<Avatar size="sm" />` (`24px`) for `sm`, `<Avatar size="md" />` (`32px`) for `md` and `lg`.
       - **Exact Rail-Centered Padding:** When a `.cs-sidebar-item` starts with an `<Avatar>` (or `[data-sidebar-rail="anchor"]`), set `padding-inline-start: 0;` on the item and wrap the `<Avatar>` inside a `inline-size: var(--cs-sidebar-rail-tile); block-size: var(--cs-sidebar-rail-tile); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;` anchor slot (or set `padding-inline: calc((var(--cs-sidebar-rail-tile) - var(--cs-avatar-size, 32px)) / 2)` = `4px` on `md`!).
       - **Expanded Geometry (`md`):** `4px` left/right/top/bottom padding around the `32px` Avatar (`40px` square footprint) + `10px` gap + stacked Name (`14px/18px`, `font-weight: 500`, `text-strong`) & Email (`12px/16px`, `text-weak`) wrapped in `data-sidebar-rail="hide"`, yielding a sleek `44px`–`48px` unified hoverable/pressable pill (`will-change: scale`, `scale: 0.985` press, `--cs-color-base-soft` hover).
       - **Rail Geometry (`md`):** Text and trailing actions dissolve smoothly away, leaving a **perfectly centered `40×40px` square interactive tile** framing the `32px` Avatar (`4px` concentric margin all around, center at `x = 30px`, matching the Brand Logo and every Nav Icon!).

### Rail-Mode Square Tiles & `<HitArea />` Pitch

In rail-collapsed mode, `.cs-sidebar-item` transitions `min-block-size` to `--cs-sidebar-rail-item-height` (`36px` / `40px` / `44px`, matching `--cs-sidebar-rail-tile` 1:1) and item gap transitions to `--cs-sidebar-rail-gap` (`4px`):
- **`sm` (`36×36 = 1296px²`):** Mounts `<HitArea size="sm" />` (`40×40`). Pitch = `36 + 4 = 40px` (**0px overlap**).
- **`md` (`40×40 = 1600px²`):** Mounts `<HitArea size="md" />` (`44×44`). Pitch = `40 + 4 = 44px` (**0px overlap**).
- **`lg` (`44×44 = 1936px²`):** Meets threshold natively—no `<HitArea />` needed.
- **Expanded `SidebarItem`:** Always `>= 6784px²`; `<HitArea />` only mounts in rail mode.

---

## 6. Motion Choreography & Rail / Collapse Fixes

All transitions respect `data-animate` (suppressed on initial mount) and inherit `prefers-reduced-motion: reduce` globally from `src/css/foundation/motion.css`.

### Fixing the `SidebarSectionLabel` Rail-Collapse Bug & End-of-Collapse `16px` Jump

**Root Causes:**
1. **`interpolate-size: allow-keywords` + `block-size: auto -> 0px` Clamping (`16px` Snap at `t = 240ms`):**
   - `SidebarSectionLabel` (`.cs-sidebar-section > .cs-sidebar-section-label`) and `.cs-sidebar-section-header` previously relied on `interpolate-size: allow-keywords` with `block-size: auto -> 0px` and `padding-block: 2px 6px -> 0px` directly on a flex item.
   - In Chromium, `padding-block` (`8px -> 0px`) interpolated smoothly, while `block-size: auto -> 0px` remained clamped at `16px` (`line-height: 16px` min-content) until the transition completed at `t = 240ms`—causing **every icon below (`Inbox`, `Tasks`, etc.) to snap `16px` upward without animation** at the very end of collapsing.
   - Additionally, `interpolate-size: allow-keywords` is unsupported in Firefox and Safari.
2. **`.cs-collapsible` CSS Variable Shadowing (`160ms` vs `240ms` Exit):**
   - `Collapsible.svelte` declares `--cs-collapsible-dur-enter: var(--cs-dur-240);`, `--cs-collapsible-dur-exit: var(--cs-dur-160);`, `--cs-collapsible-ease-enter`, and `--cs-collapsible-ease-exit` directly on `.cs-collapsible` in `@layer components.primitive`.
   - Setting `--cs-collapsible-*` on the ancestor `.cs-sidebar[data-collapse-mode="rail"]` was shadowed and ignored, so `SidebarSubheader` (`<Collapsible>`) finished collapsing at `160ms` instead of `240ms`.

**Required Fix (Grid `1fr -> 0fr` Fold + Direct `.cs-collapsible` Override):**
1. **Target `.cs-collapsible` Directly in `sidebar.css` (`@layer components.composite`):**
   - Move the `--cs-collapsible-*` overrides off `.cs-sidebar` onto `.cs-sidebar[data-behavior="inline"][data-collapse-mode="rail"] .cs-collapsible` so `SidebarSubheader` and `SidebarGroupContent` actually inherit `--cs-sidebar-dur-enter` (`280ms`), `--cs-sidebar-dur-rail-exit` (`240ms`), and `--cs-ease-quart-out`.
2. **Use a `grid-template-rows: 1fr -> 0fr` Fold Wrapper for Section Headings:**
   - Wrap standalone `SidebarSectionLabel` (when not inside `SidebarSectionHeader`) and `SidebarSectionHeader` in a zero-padding CSS Grid fold (`.cs-sidebar-section-fold` > `.cs-sidebar-section-fold-inner` with `min-block-size: 0`).
   - `.cs-sidebar-section-fold` transitions `grid-template-rows: 1fr` (expanded, `280ms --cs-ease-quart-out`) <-> `0fr` (rail-collapsed, `240ms --cs-ease-quart-out`).
   - Keep `padding-block` (`2px 6px` / `4px`) constant on `.cs-sidebar-section-header` / `.cs-sidebar-section-label` inside `.cs-sidebar-section-fold-inner`—never animate `block-size: auto -> 0px` or `padding-block` on the heading itself.
   - Keep `.cs-sidebar-section-fold-inner` at `overflow: visible` in steady `[data-open][data-state="open"]` (preserving `:focus-visible` clearance on collapsible section buttons) and `overflow: clip` during `[data-state="opening"]`, `[data-state="closing"]`, and `:not([data-open])`.
   - Fade/dissolve the inner label/header with `opacity: 0`, `translate: calc(-6px * var(--cs-sidebar-dir)) 0`, `filter: blur(2px)` over `100ms` (`--cs-ease-cubic-out`, `0ms` delay) on collapse, and `180ms` (`--cs-ease-quart-out`, `70ms` delay) on expand.
   - Between adjacent `.cs-sidebar-section`s, `margin-block-start` transitions smoothly from `var(--cs-sidebar-section-gap)` (`18 / 22 / 26px`) to `var(--cs-sidebar-rail-section-gap)` (`8 / 8 / 10px`).

### Silky, Zero-Snap Rail Choreography (Replacing Abrupt Snaps & Late Icon Jumps)

Previously, `rail` mode suffered from end-of-animation icon jumps caused by three desynchronized mechanisms:
1. **Compounded vertical clocks:** `SidebarSubheader` and `SidebarGroupContent` wrap `<Collapsible>` (`240ms --cs-ease-quart-out` enter / `160ms --cs-ease-exit` exit), while `.cs-sidebar` `inline-size`, section headings, item `min-block-size`, and gaps ran on `280ms --cs-ease-expo-out` / `240ms --cs-ease-quart-out`—causing icons below to hitch when `<Collapsible>` finished `80ms` early.
2. **Delayed `0s` layout snaps:** `[data-sidebar-rail="hide"]`, `.cs-sidebar-item-badge`, and `.cs-sidebar-group-chevron` snapped `max-inline-size: 0; max-block-size: 0; margin: 0; padding: 0;` at `100ms` on collapse and `0ms` on expand, while `.cs-sidebar-item-actions` snapped `inline-size: 0` immediately—forcing flex-line reflow and height shifts mid-transition.
3. **Un-transitioned anchor padding:** `.cs-sidebar-item:has(> [data-sidebar-rail="anchor"]:first-child)` snapped `padding-inline: 0; padding-block: 0;` instantaneously on Frame 1, shifting the footer avatar row vertically.

**Upgraded Unified Rail Physics (Zero Jumps):**
1. **Single Clock & Curve Across All Tracks:**
   - **Expand:** `280ms` (`--cs-sidebar-dur-enter: var(--cs-dur-280)`) with `--cs-sidebar-ease-enter: var(--cs-ease-quart-out)`.
   - **Collapse:** `240ms` (`--cs-sidebar-dur-rail-exit: var(--cs-dur-240)`) with `--cs-sidebar-ease-exit: var(--cs-ease-quart-out)`.
   - Override `--cs-collapsible-dur-enter`, `--cs-collapsible-dur-exit`, `--cs-collapsible-ease-enter`, and `--cs-collapsible-ease-exit` on `.cs-sidebar[data-collapse-mode="rail"]` so `SidebarSubheader` (`<Collapsible motion="fade">`) and `SidebarGroupContent` (`<Collapsible motion="slide">`) move on the **exact same duration and curve** as `.cs-sidebar` `inline-size`, section headings, item `min-block-size`, item `padding`, list `gap`, and section `margin-block-start`.
2. **Surface Clipping During Transition + Locked Row Heights (No `max-*-size: 0` Snaps):**
   - Apply `overflow: clip` to `.cs-sidebar-surface` while `data-state="opening" | "closing"` (restoring `overflow: visible` at steady `"open"` / `"closed"` for non-floating variants so `:focus-visible` outlines are never clipped).
   - Remove all `max-inline-size: 0`, `max-block-size: 0`, `margin: 0`, and `padding: 0` snaps from `[data-sidebar-rail="hide"]`, `.cs-sidebar-item-badge`, `.cs-sidebar-group-chevron`, and `.cs-sidebar-item-actions`.
   - Keep `SidebarHeader` and `SidebarFooter` row heights locked (`min-block-size: var(--cs-sidebar-rail-tile)`) with `white-space: nowrap` on single-line labels, and include `padding-inline` / `padding-block` in `.cs-sidebar-item`'s transition list.
3. **Inward Text Dissolve (Labels, Badges, Chevrons, `[data-sidebar-rail="hide"]`):**
   - **On Rail Collapse (`0ms` delay):** `opacity: 0`, `translate: calc(-6px * var(--cs-sidebar-dir)) 0`, `filter: blur(2px)` over **`100ms` (`--cs-dur-effect-fast` `--cs-ease-cubic-out`)**, dissolving cleanly *before* the clipping surface edge reaches the text.
   - **On Rail Expand (`70ms` delay — `--cs-sidebar-dur-rail-delay: 70ms`):** Materializes smoothly over **`180ms` (`--cs-dur-180` `--cs-ease-quart-out`)** once the rail has opened enough room.
4. **`[data-sidebar-rail="only"]` Cross-Fade:**
   - Fades in with subtle `scale: 0.92 -> 1` + `opacity: 0 -> 1` over `160ms` (`80ms` delay) when entering rail mode; exits in `90ms` (`0ms` delay) when expanding.

### Crafted `collapseMode="hidden"` Motion (Curtain Reveal)

Previously, `collapseMode="hidden"` removed `overflow: clip` on `"opening"` Frame 1—causing the full `264px` `.cs-sidebar-surface` to bleed over the workspace—while `--cs-ease-expo-out`, `scale: 0.985`, and a `50ms` `opacity` delay created a blank push followed by a jarring pop.

**Refined Curtain Physics:**
- **Outer `.cs-sidebar`:** Keeps `overflow: clip` across `"opening"`, `"closing"`, and `"closed"` (only `overflow: visible` at steady `"open"`). Animates `inline-size` and `padding-inline` over **`280ms` `--cs-ease-quart-out`** (enter) / **`200ms` `--cs-ease-quart-out`** (exit) so the workspace glides smoothly without a Frame-1 jolt.
- **Inner `.cs-sidebar-surface`:** Locked at `inline-size: var(--cs-sidebar-width)` and `scale: 1` (zero scale distortion or text reflow):
  - **Closed state:** `opacity: 0; translate: calc(-16px * var(--cs-sidebar-edge-dir)) 0;`.
  - **Enter:** `translate` over `280ms` `--cs-ease-quart-out`; `opacity` over `200ms` `--cs-ease-quart-out` (**`0ms` delay**) inside the expanding clip frame.
  - **Exit:** `translate` over `200ms` `--cs-ease-quart-out`; `opacity` over `110ms` `--cs-ease-exit` (`0ms` delay); `visibility: hidden` after `200ms`.

### Master Motion Table

| Interaction | Target | Enter (Open / Expand) | Exit (Close / Collapse) | Curve & Physics |
| :--- | :--- | :--- | :--- | :--- |
| **`collapseMode="hidden"` (Outer)** | `.cs-sidebar` (`inline-size`, `padding-inline`, `overflow: clip` while transitioning) | `280ms` (`--cs-dur-280`) | `200ms` (`--cs-dur-200`) | `--cs-ease-quart-out` (enter & exit); calm curtain reveal with zero bleed-over. |
| **`collapseMode="hidden"` (Inner)** | `.cs-sidebar-surface` (`translate`, `opacity`, `scale: 1`) | `translate`: `280ms` `--cs-ease-quart-out`<br>`opacity`: `200ms` (`0ms` delay) | `translate`: `200ms` `--cs-ease-quart-out`<br>`opacity`: `110ms` (`0ms` delay) | `translate: ±16px 0 ↔ 0`, `scale: 1` (no distortion). |
| **`collapseMode="rail"` (Outer, Pitch & Collapsibles)** | `.cs-sidebar` (`inline-size`), `SidebarSubheader`, `SidebarGroupContent`, section headings, item `min-block-size`/`padding`, `gap` | `280ms` (`--cs-dur-280`) `--cs-ease-quart-out` | `240ms` (`--cs-dur-240`) `--cs-ease-quart-out` | 100% synchronized horizontal + vertical tracks; zero late icon jumps. |
| **`collapseMode="rail"` (Labels / Badges / Chevrons / Hide)** | Text, badges, chevrons, `[data-sidebar-rail="hide"]` | `180ms` `--cs-ease-quart-out` (`70ms` delay) | `100ms` `--cs-ease-cubic-out` (`0ms` delay) | `opacity: 0 ↔ 1`, `translate: -6px 0 ↔ 0`, `filter: blur(2px) ↔ blur(0)`; clipped by `.cs-sidebar-surface` during transition. |
| **`behavior="overlay"` Drawer** | `.cs-sidebar-surface` (`translate`) | `320ms` (`--cs-dur-320`) `--cs-ease-expo-out` | `180ms` (`--cs-dur-exit-lg`) `--cs-ease-cubic-in` | Preserved; synced 1:1 with `Overlay` backdrop fade-out. |
| **`SidebarViews` Drill-Down** | `.cs-sidebar-view` (`translate`, `opacity`) | `translate`: `240ms` `--cs-ease-quart-out`<br>`opacity`: `180ms` (`20ms` delay) | `translate`: `160ms` `--cs-ease-cubic-out`<br>`opacity`: `120ms` `--cs-ease-exit` | Preserved (`20px` directional slide + Ghost Back button). |
| **`SidebarItem` Micro-Press** | `.cs-sidebar-item` (`scale`, `bg`) | `140ms` `--cs-ease-press` (`:active`) | `100ms` `--cs-ease-effect` | `scale: 0.985` (expanded) / `0.96` (rail); `will-change: scale`. |

---

## 7. `:focus-visible` Clearance Audit

Global `src/css/foundation/focus.css` draws `outline: 2px solid var(--cs-color-accent-solid); outline-offset: 2px;` (**`4px` outside element bounds**).

| Container / Element | Overflow Behavior | Minimum Clearance | Audit |
| :--- | :--- | :--- | :--- |
| **Outer `.cs-sidebar`** | `overflow: visible` at rest, expanded, and `rail` mode. `overflow: clip` **only** when `collapseMode="hidden"` and `data-state` is `"closing"` or `"closed"`. | Unbounded when interactive | **Pass** |
| **`.cs-sidebar-surface` (`floating`)** | `overflow: clip` to mask squircle corners. | `8–12px` inline, `12–16px` outer block | **Pass** |
| **`SidebarBody` (`<ScrollArea>`)** | `<ScrollArea>` spans full bleed; `--cs-sidebar-padding-x` (`8–12px`) and `4px` top clearance live inside `.cs-sidebar-scroll-content`. | `8–12px` inline, `4px` block | **Pass** |
| **`SidebarHeader` / `SidebarFooter`** | `overflow: visible`; `padding-inline: var(--cs-sidebar-padding-x)`; `padding-block >= 10px`. | `8–12px` inline, `10–16px` block | **Pass** |
| **`.cs-sidebar-item`** | `overflow: visible` (ellipsis clipping lives exclusively on `.cs-sidebar-item-label`). | Full perimeter outside pill | **Pass** |
| **`SidebarViews`** | `overflow-x: clip; overflow-y: visible;` with `padding-inline: 4px; margin-inline: -4px;`. | `>= 4px` all sides | **Pass** |

---

## 8. Preview Redesign Blueprint (`Sidebar.preview.svelte`)

The preview MUST showcase `Sidebar` as an authentic, calm, high-contrast application shell—never as a cramped box with a top bar cutting across the sidebar.

### 1. Full-Height App-Shell Layout (ZERO Top Bar Above Sidebar)

- **Outer Preview Viewport Frame:**
  - `w-full h-540px rounded-2xl squircle bg-canvas shadow-sunken overflow-hidden flex` (adding `flex-row-reverse` when `shellSide === "end"`).
  - **High-Contrast Framing:** Combining `bg-canvas` (`zinc-100` light / `zinc-950` dark) with `shadow-sunken` recesses the entire preview window cleanly below the surrounding preview page surface—so a pure-white `elevated` sidebar NEVER melts into a white playground background, and `floating` / `transparent` read with immediate architectural clarity in both light and dark modes!
- **Full-Height `<Sidebar>`:**
  - Stretches **100% from top edge to bottom edge** of the `540px` frame—no global header bar sits above it.
- **Workspace Column (to the right of `<Sidebar>`, or left when `side="end"`):**
  - `flex-1 min-w-0 flex flex-col`:
    - **Workspace Header Bar (`shrink-0 h-14 px-5 flex items-center justify-between`):** Houses the external `<SidebarToggle bind:open={shellOpen} sidebarId={shellSidebarId} />` on the leading edge paired with the active page title (`{SHELL_TITLES[shellNav]}`) and a quiet monochrome scope badge (`<Badge variant="soft" color="base" size="sm">`).
    - **Workspace Main Area (`flex-1 min-h-0 px-5 pb-5 pt-1 flex flex-col gap-3.5`):** 2–3 calm, minimal workspace cards (`rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated`) with realistic minimal metadata.

### 2. Calm, Aligned Sidebar Composition in the Preview

- **Brand Header (`SidebarHeader`):**
  - Uses the rail-aligned `--cs-sidebar-rail-tile` (`36 / 40 / 44px`) leading slot holding a crisp `28px` monochrome brand mark (`bg-base-solid text-base-solid-fg rounded-lg squircle-soft`) + `Acme Studio` title (`data-sidebar-rail="hide"`) + trailing Ghost `+` button (`data-sidebar-rail="hide"`).
  - In `rail` mode, the brand mark stays locked dead-center on the exact vertical axis of the nav icons below.
- **Subheader (`SidebarSubheader`):**
  - Houses `<SegmentedControl size="sm" width="equal">` (`Personal` / `Team`) with generous `12px` breathing room above and `16px` total breathing room before the `"Workspace"` section label.
- **Navigation Body (`SidebarBody fade`):**
  - **Neutral Badges by Default:** Use `<Badge variant="soft" color="base" size={BADGE_SIZE_BY_SIDEBAR[shellSize]}>` for Inbox (`12`)—keeping the entire navigation calm and monochrome!
  - Demonstrates both a static section (`Workspace`) and a collapsible section (`Projects`) with nested `SidebarGroup` folders (`Design System`, `Marketing`).
- **Connected Footer Profile (`SidebarFooter`):**
  - Renders `<SidebarItemRow>` + `<SidebarItem tooltip="Clara Vance">` containing `<Avatar variant="soft" size={shellSize === "sm" ? "sm" : "md"} name="Clara Vance" status="online" />` inside the rail-aligned anchor slot + stacked `Clara Vance` / `clara@acme.co` (`data-sidebar-rail="hide"`) + `<SidebarItemActions>` with a quiet `MoreHorizontal` / `Settings` dropdown trigger.
  - Collapses smoothly into a centered square Avatar tile with hover tooltip in `rail` mode.

### 3. Preview Sections Overview (Clean, Top-Down)

1. **App Shell:** Compact 4-column control bar (`Variant`, `Size`, `Collapse`, `Side`) above the recessed `540px` full-height app-shell viewport frame.
2. **Actions & States:** Recessed `380px` `bg-canvas shadow-sunken` frame demonstrating hover 3-dot `Dropdown` (with in-place badge cross-swap), `ContextMenu`, `SidebarGroup`, `disabled`, and `negative` states.
3. **Multi-View Drill-Down:** Recessed `360px` `bg-canvas shadow-sunken` frame with `variant="floating"` `SidebarViews`, Ghost Back button, and directional horizontal slide.
4. **Overlay & Minimal:** `Open Drawer` button launching full-height `behavior="overlay"` drawer + a compact recessed `bg-canvas shadow-sunken` minimal `variant="transparent"` sidebar showcasing the tactile elevated monochrome `current` pill directly on `canvas`.
