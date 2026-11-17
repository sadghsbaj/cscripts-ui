# Upload / Progress Item

*Type: Compound pattern*

## Layout Plan

One row per file. State is communicated by a single changing area, not by adding elements.

**Placement**
- File name and meta line on the left
- Progress bar spans the row under the name
- One action on the right that morphs: Cancel to Done

**Progressive disclosure / restraint**
- Percent and speed only in the meta line
- Errors replace the meta line and offer a single retry

---

## Wireframe

```text
+--------------------------------------------+
| report-q3.pdf                    [Cancel]  |
| 4.2 MB  -  62%                             |
| [############-------]                      |
+--------------------------------------------+
| photo.png                          Done    |
| 1.1 MB  -  complete                        |
+--------------------------------------------+
```
