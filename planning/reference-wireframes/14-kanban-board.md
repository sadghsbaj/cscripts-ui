# Kanban Project Board

*Type: Large scenario*

## Layout Plan

Equal columns scanned left to right. Cards stay minimal; detail lives in a side or modal view.

**Placement**
- Header with board name, filter dropdown, add action
- Three to four columns with title and count
- Cards: title, one badge, one avatar

**Progressive disclosure / restraint**
- Card details open in a panel, never inline
- Column menu hidden until hover
- Drag state shown by a placeholder slot only

---

## Wireframe

```text
+----------------------------------------------------------+
| Sprint 14                  [Filter v]            [+ Add] |
+----------------------------------------------------------+
| To do  4        | Doing  2        | Done  7              |
| +-------------+ | +-------------+ | +-------------+      |
| | Task title  | | | Task title  | | | Task title  |      |
| | (bug)   (o) | | | (feat)  (o) | | | (done)  (o) |      |
| +-------------+ | +-------------+ | +-------------+      |
| +-------------+ | +- - - - - - -+ |                      |
| | Task title  | | | drop here   | |                      |
| +-------------+ | +- - - - - - -+ |                      |
+----------------------------------------------------------+
```
