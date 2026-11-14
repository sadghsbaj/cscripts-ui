# 02 – Architektur, APIs & Naming

Status: **Abgeschlossen** (Grundentscheidungen stehen; Detail-Ausarbeitung bei Umsetzung)

---

## 1. Vanilla / CSS-First vs. `data-hovered` / `data-pressed` — **Entschieden**
- Konsequent **CSS-First** (native Pseudo-Klassen `:hover`, `:active`, `:focus-visible`).
- Kein globales `interactive()`-Attachment und kein Mischmasch aus lokalem `data-hovered`/`data-pressed`.

---

## 2. `$bindable` (`ref`) & Attachments — **Entschieden**
- **UI-States (`checked`, `pressed`, `open`, `indeterminate`):** Nutzen **`$bindable()`**.
- **Verhalten & DOM-Logik (`clickOutside`, `focusTrap`, `scrollFade`, ...):** Nutzen **Attachments** (`{@attach ...}`).
- **Element-Referenz (`ref = $bindable()`):** Jede Root-Element-Component bietet standardmäßig **`ref = $bindable()`** (`bind:this={ref}`) nach außen an — zusätzlich zu Attachments via `{...rest}`.

---

## 3. Skalierbare Ordnung (Vertical Slices) — **Entschieden**
- **Alles bleibt vertikal:** Keine Trennung in `components/`, `attachments/`, `state/` oder `utils/` (auch `browser-storage` bleibt einfach ein eigener Modul-Ordner).
- **Überordner:** `src/svelte/modules/` (statt `primitives/`). App-Import `cs/svelte/<name>` bleibt unverändert.
- **Ordnung über feste Datei-Suffixe:**
  - `*.svelte` → UI-Component
  - `*.attach.ts` → DOM-Attachment
  - `*.svelte.ts` → Reaktiver State
  - `*.ts` → Types / pure Logik (`index.ts` = einzige öffentliche Tür)
  - `*.docs.md` (oder `DOCS.md`) → Co-located Dokumentation
  - `*.preview.svelte` → Co-located Playground-Preview
- **Interne Dateien:** **`.internal.`-Infix** (z. B. `sparkle.internal.svelte`, `helper.internal.attach.ts`) + nicht in `index.ts` exportiert (später per Lint-Regel absicherbar).

---

## 4. CSS-Variablen-Konzept — **Entschieden (Richtung)**
- **Weg vom `--_`-Prefix:** Statt `--_fg` / `--_height` werden Modul-Variablen sauber mit dem Modulnamen geprefixt (z. B. `--cs-button-fg`, `--cs-button-height`).
- Globale Foundation-Tokens bleiben `--cs-<kategorie>-*` (deren Namens-Logik beim Ausarbeiten von `NAMING.md` mit glattziehen).

---

## 5. Co-located Dokumentation & Previews — **Entschieden**
- **Doku:** Weg von `<!-- @component -->` in `.svelte`; stattdessen **1 co-located Doku-Datei pro Modul** (Single Source of Truth für Mensch, ESLint-Check & Docs-MCP). Im Code nur englische *Warum*-Kommentare an komplexen Stellen.
- **Previews:** `*.preview.svelte` co-located im jeweiligen Modul-Ordner (Playground sammelt per `import.meta.glob` automatisch ein).
- **GitHub-Workflow & `dist/`-Bundle:** Bei Umsetzung prüfen, ob komplett entfernbar.

---

## 6. Offene Detail-Prüfungen (für Umsetzung / `rules/`)
- **Attachment-Signaturen:** Alle bestehenden Attachments einzeln durchgehen (`enabled?: boolean | (() => boolean)` via `resolveGetter`, einheitliche Options).
- **Verbindlicher `rules/`-Ordner:** Ersetzt nach der Planung `planning/` und bündelt `NAMING.md`, Design/Tokens, Motion und Code/API-Regeln.
