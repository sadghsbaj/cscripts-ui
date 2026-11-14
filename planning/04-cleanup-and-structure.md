# 04 – Offene Refactor-Todos

Übersicht aller aktuell noch offenen Aufräum- und Refactoring-Aufgaben.

---

## A. Module-Standards, Tokens & Attachments

1. **Attachments:** Signaturen einzeln prüfen und auf `enabled?: boolean | (() => boolean)` via `resolveGetter` vereinheitlichen.

---

## B. Duplizierungen & Shared CSS

1. **`Button` & `ToggleButton` (`Icon`, `Label`, `Group`):**
   - Gemeinsame CSS-Basis in `src/css/shared/` anlegen (Group-Radius/Separator-Logik, Icon-/Label-Slots); kein gegenseitiges Importieren, kein Copy-Paste.
2. **`CopyIcon` & `PasteIcon` (`src/modules/clipboard/`):**
   - Gemeinsame Sparkle-/Animation-Logik co-located in `sparkle.internal.svelte` (oder shared CSS) auslagern.

---

## C. API-Fixes & Doku-Basis

1. **`ToggleButton` API & Logik:** State- und Group-API (`pressed`, `ToggleButtonGroup`) sauber neu durchdenken und vereinheitlichen.

---

## D. Co-located Docs & ESLint

1. **`*.docs.md`:** `<!-- @component -->`-Kommentare aus `.svelte` in co-located `*.docs.md` auslagern.
2. **ESLint-Regel:** `src/eslint/rules/component-docs.ts` (und zugehörige Tests) auf `*.docs.md` umstellen.

---

## E. `src/agents/` & MCP

1. **`src/agents/` verschlanken:** App-seitige Agent-Regeln auf das Nötigste reduzieren und an die aktuelle Modulstruktur anpassen.
2. **`README.md` aktualisieren:** Veraltete `cs/svelte/...`-Import-Beispiele auf `cs/modules/<module>` / `cs/work` anpassen.
3. **`src/mcp/` (optional):** MCP-Server für konsumierende Apps aufbauen.
