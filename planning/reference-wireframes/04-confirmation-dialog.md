# Confirmation Dialog

*Type: Compound pattern*

## Layout Plan

Small, centered, one question. Destructive and neutral variants share the structure; only the emphasis moves.

**Placement**
- Title as a question, one sentence of consequence
- Actions right-aligned; safe action first, risky action last
- Close affordance in the corner

**Progressive disclosure / restraint**
- No extra explanation; details only via a link
- Destructive variant may require typing a name, shown only then

---

## Wireframe

```text
Neutral                          Destructive
+----------------------------+   +----------------------------+
| Discard changes?       [x] |   | Delete project?        [x] |
| Unsaved edits are lost.    |   | This cannot be undone.     |
|                            |   | Type NAME to confirm       |
|      [Keep]  [Discard]     |   | [____________]             |
+----------------------------+   |      [Cancel]  [Delete]    |
                                 +----------------------------+
```
