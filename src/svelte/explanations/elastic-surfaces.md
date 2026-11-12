# Elastic Surfaces & Dynamic Surface Physics

This architectural guide explains how tactile press-in, spring-release interactions, and continuous surface morphing are implemented across interactive `cs` components.

---

## 1. Decoupled Visual Surface (`::before`)

Interactive controls and state-morphing containers (such as buttons, icon triggers, and `<ButtonMorph />`) decouple their visual background from child text, icons, and outer layout by placing backgrounds, borders, and shadows on a dedicated `::before` surface:

- **Distortion-Free Physics (Squash & Stretch):** Placing transforms on `::before` allows non-uniform squash-and-stretch scaling (`scale: X Y`) using `linear()` spring physics without warping, squishing, or distorting text glyphs or SVG icons.
- **Continuous Surface Morphing (State Interpolation):** In composite containers (such as `<ButtonMorph />`), placing the transitional shell on `::before` allows geometry (`width`, `height`), backgrounds, shadows, and superellipse corner exponents (`corner-shape: superellipse(--_morph-corner)`) to interpolate as a single cohesive physical body, avoiding ghosting or muddy double-layer translucency artifacts during handoff.
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
