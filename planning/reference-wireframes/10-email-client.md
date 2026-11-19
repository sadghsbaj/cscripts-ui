# Email Client

*Type: Large scenario*

## Layout Plan

Three calm zones with clear hierarchy: navigate, scan, read. Only the reading pane carries rich content.

**Placement**
- Narrow sidebar: folders, a compose action on top
- Middle list: sender, subject, one-line preview, time
- Right pane: header, body, reply at the bottom
- Toasts bottom-right

**Progressive disclosure / restraint**
- Sidebar labels collapse to icons on narrow screens
- Message actions revealed on row hover
- Reply editor collapsed to one line until clicked
- Context menu for rarely used actions

---

## Wireframe

```text
+----------+--------------------+---------------------------+
| [Compose]| [ Search...      ] | Subject line        [...] |
|          |--------------------| Ana  -  10:42             |
| Inbox  3 | * Ana       10:42  |---------------------------|
| Sent     |   Subject...       | Body text, calm width     |
| Drafts   |   preview...       | ...                       |
| Archive  |--------------------| ...                       |
|          |   Ben       Mon    |                           |
| Labels v |   Subject...       |---------------------------|
|          |                    | [ Reply...              ] |
+----------+--------------------+---------------------------+
                                            [ toast       x ]
```
