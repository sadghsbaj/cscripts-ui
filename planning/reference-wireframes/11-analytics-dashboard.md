# Analytics Dashboard

*Type: Large scenario*

## Layout Plan

Top-down reading: headline numbers, one main chart, supporting detail. Whitespace separates levels.

**Placement**
- Header: title left, date range segment and filter right
- Row of four KPI cards of equal size
- One wide primary chart, a narrower secondary chart beside it
- Table at the bottom

**Progressive disclosure / restraint**
- KPI deltas shown small; tooltips carry exact values
- Chart legends appear on hover
- Table limited to 5 rows with 'View all'
- Advanced filters in a dropdown

---

## Wireframe

```text
+--------------------------------------------------------+
| Overview             (7d|30d|90d)  [Filters v]         |
+--------------------------------------------------------+
| +--------+ +--------+ +--------+ +--------+            |
| | 12,480 | | 3.2%   | | $8.1k  | | 412    |            |
| | Users  | | Conv.  | | Rev.   | | Orders |            |
| +--------+ +--------+ +--------+ +--------+            |
| +------------------------------+ +-----------------+  |
| |  main chart                  | | secondary chart |  |
| |   /\  /\__/\                | |   ___           |  |
| +------------------------------+ +-----------------+  |
| Recent orders                                View all  |
| row ........................................           |
| row ........................................           |
+--------------------------------------------------------+
```
