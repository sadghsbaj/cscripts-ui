# Settings / Admin Area

*Type: Large scenario*

## Layout Plan

Navigation on the left, one section at a time on the right. Each section is a short form with a shared rhythm.

**Placement**
- Sidebar lists sections only
- Content: section title, grouped rows, sticky save bar
- Modal reserved for dangerous or multi-step actions

**Progressive disclosure / restraint**
- Only one section visible at once
- Save bar appears only when something changed
- Advanced options in a collapsed block per section

---

## Wireframe

```text
+-----------+--------------------------------------------+
| Profile   | Profile                                    |
| Account   | +----------------------------------------+ |
| Billing   | | Name          [____________]           | |
| Team      | | Email         [____________]           | |
| Security  | +----------------------------------------+ |
|           | References                                |
|           | | Dark mode                      [ o--]  | |
|           | Advanced  v                                |
|           |--------------------------------------------|
|           |           Unsaved changes [Discard][Save]  |
+-----------+--------------------------------------------+
```
