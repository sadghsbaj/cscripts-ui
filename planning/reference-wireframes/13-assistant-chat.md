# Chat / Assistant with NLP Parser

*Type: Large scenario*

## Layout Plan

A narrow conversation column centered on the screen. Recognized tokens are shown as light inline highlights.

**Placement**
- Message stream in the center, input pinned to the bottom
- Parsed tokens (date, place) highlighted inside the input
- A single confirmation chip row above the input when parsing finds something

**Progressive disclosure / restraint**
- Parsed result shown only when recognized, with one confirm action
- Message tools revealed on hover
- Empty state: one prompt line and two suggestions

---

## Wireframe

```text
+--------------------------------------------+
|              Assistant                     |
|                                            |
|        You: Lunch with Ana [Fri 12:30]    |
|  Assistant: Added to your calendar.        |
|                                            |
|--------------------------------------------|
| Detected: Fri 12:30 - Cafe Nord  [Confirm] |
| [ Lunch with Ana friday 12:30 at Cafe... ] |
|                               [Send]       |
+--------------------------------------------+
```
