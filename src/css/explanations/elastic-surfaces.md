# Elastic Surfaces & Active State Physics

This architectural guide explains how tactile press-in and spring-release interactions are implemented across interactive `cs` components.

---

## 1. Decoupled Visual Surface (`::before`)

Interactive controls (such as buttons and icon triggers) decouple their visual background from child text and icons by placing background, border, and shadow on `::before`:

- **Distortion-Free Physics:** Placing transforms on `::before` allows non-uniform squash-and-stretch scaling (`scale: X Y`) using `linear()` spring physics without warping, squishing, or distorting text glyphs or SVG icons.
- **Inherited Geometry:** The pseudo-element inherits `border-radius: inherit` and `corner-shape: inherit` directly from the host element, ensuring the visual surface remains perfectly aligned with the host's geometry and focus rings.

---

## 2. Interaction Modality Split (Pointer vs. Keyboard)

Component `:active` states split feedback depending on whether the user interacts via a pointer (mouse/touch) or keyboard:

### A. Shared Feedback
- Active color shifts (background and foreground changes) apply uniformly regardless of input device.

### B. Pointer Interaction (`:not(:focus-visible)`)
- Triggers tactile squash-and-stretch on `::before` (using `--cs-squash-*` variables like `--cs-squash-default` or `--cs-squash-subtle`).
- Uses a fast press-in transition and a spring-driven release transition (`--cs-spring-release`) for a physical, tactile feel.

### C. Keyboard Interaction (`:focus-visible`)
- Avoids non-uniform scaling to prevent clipping the browser focus ring.
- Applies a uniform, subtle scale down on the entire host element so the focus ring and surface shrink synchronously without visual detachment.
