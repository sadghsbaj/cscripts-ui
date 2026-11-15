# 03 – Dokumentation, `src/agents/`, Sub-Agents & MCPs

Status: **Abgeschlossen** (bereit für Umsetzung nach Thema 4)

---

## 1. Co-located Doku-Format (`*.docs.md`) — **Entschieden**
- **Sprache:** Englisch, präzise, ohne Fülltext – aber **vollständig** (lieber länger als eine fehlende Info).
- **Pflicht-Schema pro Modul (`src/svelte/modules/<name>/<name>.docs.md`):**
  1. **Header / Metadaten:** `name`, `kind` (`component | attachment | hybrid | utility`), `import` (`cs/svelte/<name>`), `exports`
  2. **`# Overview`:** 1–2 Sätze (Zweck & Abgrenzung)
  3. **`# API`:** Alle Props (inkl. `$bindable`, Pflicht vs. Optional, Defaults), Attachment-Parameter, State-Klassen/Methoden, exportierte Types, überschreibbare CSS-Variablen (`--cs-<module>-*`)
  4. **`# Examples`:** Minimal-Beispiel, Varianten/Größen, Compound-Pattern-Zusammenspiel, State-Steuerung
  5. **`# Behavior & Quirks`:** Besondere Mechaniken (z. B. Tooltip über Popover-Hint, CSS Anchor Positioning, Keyboard/A11y, bekannte Grenzen)

---

## 2. `src/agents/`-Ordner (für konsumierende Apps / `template/`) — **Entschieden**
- Bleibt als **schlanke Basis-Referenz** erhalten (`design-system.md`, `css.md`, `uno.md`, `code-style.md`, `svelte.md`, `work.md`).
- Enthält **keine** modul-spezifischen API-Details mehr (die liegen in `*.docs.md` und kommen über den lokalen `cs`-MCP).

---

## 3. Antigravity Setup (`.agents/` + `AGENTS.md`) — **Entschieden**
- **Orchestrator-Anweisung (`AGENTS.md` im Repo-Root):** Wird in jedem neuen Chat automatisch geladen; definiert Orchestrator-Rolle + Sub-Agents mit `Model: "inherit"`.
- **Verbindliche Regeln (`.agents/rules/*.md`):** Naming (`NAMING.md`), Design/Tokens, Motion und Code/API-Regeln nativ in Antigravities Rules-Ordner.
- **Die Sub-Agents:**
  1. **`docs-maintainer`:** Vorbeugend bei neuen Modulen *oder* rückwirkend per `git diff`; hält `*.docs.md` synchron zum echten Code (kein externer MCP nötig).
  2. **`consistency-reviewer`:** Prüft neue/geänderte Module gegen `.agents/rules/` (Farben, Radien, `box-shadow`/Lichtkante, `size`-Skala & Verhältnisse, Motion, Props, CSS-Vars).
  3. **`preview-builder`:** Baut/aktualisiert `*.preview.svelte` nach festem Top-Down-Schema (oder meldet, falls kein Update nötig ist).
  4. **`mcp-maintainer` (optional / strukturell):** Nur bei strukturellen Änderungen am Doku-Format oder neuen MCP-Tools nötig (siehe Abschnitt 4).

---

## 4. MCPs (Svelte-MCP + eigener lokaler `cs`-MCP) — **Entschieden**
- **Svelte MCP:** Für Orchestrator, `consistency-reviewer` und `preview-builder` (Svelte-5-Runes/Attachments gegen echte Doku prüfen).
- **Eigener lokaler `cs`-MCP (`src/mcp/` via `stdio` + Bun):**
  - **Kein Hosting nötig:** Läuft lokal als `stdio`-Prozess über Bun (`bun ./node_modules/cs/src/mcp/index.ts` bzw. in `cscripts-ui` direkt `bun ./src/mcp/index.ts`).
  - **Funktioniert auf beiden PCs & in jeder neuen App:** Weil er Teil des `cs`-Pakets ist, hat jedes Projekt (`template/` oder neue Apps) automatisch die exakt passende MCP-Version an Bord.
  - **Dynamisch statt statisch:** Scannt zur Laufzeit automatisch `src/svelte/modules/*/*.docs.md`, `src/agents/*.md` und Tokens. Dadurch muss der MCP bei neuen Modulen oder Doku-Updates **nicht** jedes Mal angepasst werden – ein `mcp-maintainer` greift nur bei strukturellen Änderungen ein.
  - **Vorgemerkt für Umsetzung:** Sauber durchdenken, welche zusätzlichen Schnittstellen/Tools der MCP neben `*.docs.md` braucht (z. B. CSS-Tokens, Reset, UnoCSS-Rules/Shortcuts, ESLint-Regeln, globale Eigenheiten) und dies direkt in die Basisanleitung des `mcp-maintainer` aufnehmen.
