# 04 – Cleanup, Duplikate & Altlasten

Status: **Abgeschlossen** (Prioritäten & Richtung stehen)

---

## A. Konkrete Bugs & API-Altlasten
1. ~~`Checkbox`: `hitAreaSize`-Prop~~ — **Erledigt** (vom User bereits entfernt).
2. ~~`ToggleButton` / `CloseButton`: `type="button"` nach `{...rest}`~~ — **Kein Bug, sondern gewollt** (`type` ist in Props omitted; `{...rest}` davor verhindert versehentliches Überschreiben auf `"submit"`).
3. **`ToggleButton` API & Logik:** Eigenes Detail-Thema bei der Umsetzung (Optik passt, aber State-/Group-API komplett sauber neu durchdenken).
4. **`Popover.size` → `Popover.width`** (aus Thema 1).
5. **`README.md` veraltet:** Import-Beispiele auf `cs/svelte/<module>` aktualisieren.

---

## B. Duplizierungen & Drift (saubere Architektur-Lösung)
1. **`ButtonIcon` / `ToggleButtonIcon`, `ButtonLabel` / `ToggleButtonLabel` & `ButtonGroup` / `ToggleButtonGroup`:**
   - **Kein** gegenseitiges Importieren zwischen `button/` und `toggle-button/`, **kein** Copy-Paste.
   - **Lösung:** Gemeinsame CSS-Basis in **`src/css/shared/`** (z. B. für Group-Radius/Separator-Logik und Icon-/Label-Slots), die beide Module nutzen, während modul-spezifisches CSS co-located bleibt.
2. **`CopyIcon` & `PasteIcon`:**
   - Liegen im selben Modul (`clipboard/`) → direkt co-located in **`sparkle.internal.svelte`** (oder shared CSS) auslagern.

---

## C. `/docs`-Route, `dist/` & Git-Workflow
- **`/docs` in konsumierenden Apps behalten:** `./dist/` (gebaut über `bun run build:docs` / `vite.docs.config.ts`) bleibt als Feature erhalten.
- **GitHub-Actions-Workflow & `.gitattributes` (`merge=ours`) entfernen:** Keine automatischen `chore: rebuild docs bundle`-Commits mehr in der Git-History; stattdessen baut der `docs-maintainer` (oder manuelles `bun run build:docs`) `dist/` bei Bedarf lokal neu.

---

## D. Strukturelle Umstellungen (aus Thema 1–3)
1. **Ordner & Suffixe:** `src/svelte/primitives/` → `src/svelte/modules/` (`package.json` anpassen); interne Dateien mit `.internal.` markieren.
2. **Doku & ESLint:** `<!-- @component -->` aus `.svelte` auslagern in `*.docs.md`; `src/eslint/rules/component-docs.ts` entsprechend umbauen.
3. **Previews:** `playground/previews/` als `*.preview.svelte` co-located in die Module ziehen (`import.meta.glob`).
4. **Tokens & Vars:** Statusfarben auf `positive / caution / negative` (ohne `info`); `--_` durch `--cs-<module>-*` ersetzen; `ref = $bindable()` bei Root-Components ergänzen.
5. **Attachments:** Signaturen einzeln durchgehen (`enabled?: boolean | (() => boolean)` via `resolveGetter`).
6. **Agents & MCP:** `src/agents/` verschlanken, `.agents/rules/` + `AGENTS.md` + Sub-Agents (`docs-maintainer`, `consistency-reviewer`, `preview-builder`, optional `mcp-maintainer`) + `src/mcp/` aufbauen.
