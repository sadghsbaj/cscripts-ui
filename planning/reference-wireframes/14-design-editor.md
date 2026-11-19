# Design / Editor Tool

*Type: Large scenario*

## Layout Plan

Canvas-first: the work area is dominant, tool panels frame it quietly on both sides.

**Placement**
- Left: layer sidebar, narrow
- Center: canvas with a floating zoom stepper at the bottom
- Right: properties panel in grouped sections
- Top: slim bar with title and primary action

**Progressive disclosure / restraint**
- Properties grouped in collapsible sections, only relevant ones shown for the selection
- Color picker opens in a popover, not as a permanent panel
- Tooltips with Kbd hints on tool icons

---

## Wireframe

```text
+---------------------------------------------------------+
| Untitled                                     [Share]    |
+--------+---------------------------------+--------------+
| Layers |                                 | Fill         |
| > Page |      +-----------+              | (o) #______  |
|   Box  |      |  canvas   |              | Size         |
|   Text |      +-----------+              | W[__] H[__]  |
|        |                                 | Effects  v   |
|        |        [ - 100% + ]             |              |
+--------+---------------------------------+--------------+
```
