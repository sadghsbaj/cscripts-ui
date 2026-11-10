# Anchor Context Auto-Establishment (`:has` & `contain: layout`)

This architectural guide explains why and how modular child components automatically establish a containing block on their parent element without requiring manual positioning classes or conflicting with existing host layout styles.

---

## 1. The Challenge: Anchoring Child Components to Parent Bounds

Several utility and decorative components need to be positioned absolutely relative to their immediate parent element:

- **`<HitArea />`:** Expands touch/click target geometry (`inset: 50% auto auto 50%`, `translate: -50% -50%`) dead-center over compact interactive controls.
- **`<BackgroundPattern />`:** Stretches decorative backdrops, grids, or accents across the full inner surface of a container (`inset: 0`).

Historically, achieving this required the parent element to declare `position: relative`. However, requiring this explicitly has critical flaws:

1. **Consumer Burden:** Developers must remember to add `relative` (e.g. UnoCSS `relative`) to every parent or host container using these components.
2. **Leaked Internal Mechanics:** Host components are forced to accommodate internal positioning details of child components.
3. **Fragile Layouts:** Omitting `position: relative` causes the child to escape its intended container and attach to the nearest positioned ancestor (or viewport root).

---

## 2. Why `contain: layout` is Strictly Preferred over `position: relative`

Rather than forcing `position: relative` on the host, `cs` utilizes `contain: layout`.

### A. Zero Positioning Conflicts

If the host element already has an explicit positioning context (such as `position: absolute` on badges, floating action buttons, pinned toolbars, or `position: sticky` on headers), overriding it with `position: relative` breaks the host element's positioning in the outer layout.

In contrast, `contain: layout` is **positioning-neutral**:

- It leaves the parent's `position` property intact (`static`, `relative`, `absolute`, `fixed`, or `sticky`).
- Per the CSS Containment specification (Level 1 / Level 2), any element with `contain: layout` automatically becomes a **containing block for absolutely positioned descendants**.

### B. Layout Isolation & Subtree Performance

`contain: layout` creates an independent layout boundary:

- Geometry calculations and reflows within the host or child component are contained within the subtree.
- They do not invalidate or trigger reflows in the parent document tree, optimizing frame rates during active interactions and animations.

---

## 3. Automated Parent Selection via `:has()`

Components declare host containment directly within their scoped `@layer components` block using `:global(:has(> .component-class))`:

```css
@layer components {
    /* =========================================================
     * ANCHOR CONTEXT AUTO-ESTABLISHMENT (:has)
     * ---------------------------------------------------------
     * Automatically establishes a containing block for host bounds.
     * See ../../explanations/anchor-context-auto-establishment.md
     * ========================================================= */
    :global(:has(> .cs-hit-area)) {
        contain: layout;
    }
}
```

### Key Principles:

- **Direct Child Combinator (`>`):** Always target direct children (`:has(> .cs-...)`) so containment is applied exclusively to the immediate host element, preventing unintended containment on higher-level ancestor wrappers.
- **Zero Host Setup:** Consumers simply nest `<HitArea />` or `<BackgroundPattern />` inside any HTML element or component without adding styling classes or wrapper configurations.
