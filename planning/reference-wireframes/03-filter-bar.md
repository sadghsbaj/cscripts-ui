# Filter Bar

*Type: Compound pattern*

## Layout Plan

One horizontal line of tools; the results own the space below. Filters never wrap into a wall of controls.

**Placement**
- Search takes flexible width on the left
- Segment toggle and one select on the right
- Active filters shown as a slim badge row beneath, only when present

**Progressive disclosure / restraint**
- Rare filters hidden behind a single 'More filters' trigger
- Badge row and 'Clear all' appear only with active filters

---

## Wireframe

```text
+-----------------------------------------------------------+
| [ Search...            ]  (All|Open|Done)  [Sort  v] [+]  |
+-----------------------------------------------------------+
|  Status: Open (x)   Owner: Me (x)        Clear all        |
+-----------------------------------------------------------+
|  results ...                                              |
```
