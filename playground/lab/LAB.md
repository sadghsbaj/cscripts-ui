# `/lab` — Isolated UI & Experiment Sandbox

Du arbeitest ausschließlich in `playground/lab/` (erreichbar unter `/lab`).

## 1. Harte Regeln (Zero Side-Effects)
- **Strict Scope:** Ändere oder erstelle **nur** Dateien innerhalb von `playground/lab/`.
- **Tabu:** Fasse **niemals** `src/`, `template/`, `package.json`, `playground/previews/` oder Config-Dateien außerhalb von `playground/lab/` an.
- **Kein Export:** Nichts aus `playground/lab/` wird von der Library exportiert.
- **Saubere Isolation:** Lege größere Experimente als eigene `.svelte`- oder `.ts`-Datei in `playground/lab/` an und binde sie in `LabView.svelte` ein. So lässt sich jedes Experiment rückstandslos wieder entfernen.

## 2. Design & Technik (Konsistent mit `cs`)
- **Primitives & Tokens nutzen:** Verwende bestehende `cs/svelte/*`-Komponenten (`Button`, `ToggleButton`, `ToggleButtonGroup`, `Checkbox`, `ScrollArea`, `HitArea`, `tooltip`, etc.), UnoCSS-Utilities (`bg-canvas`, `bg-elevated`, `shadow-elevated`, `squircle`, `title-*`, `text-*`) und CSS-Tokens (`--cs-color-*`, `--cs-ease-*`, `--cs-spring-*`) statt fremder Styles.
- **Light & Dark Mode:** Alle eigenen Styles müssen mit `light-dark()` / `--cs-color-*` in beiden Modi sauber funktionieren.
- **Kein UI-Ballast:**
  - Keine überladenen Dashboards, keine Marketing-Texte, keine langen Erklärungen im UI.
  - Alles ruhig, zentriert und auf das eigentliche Experiment fokussiert – kurze, präzise Labels genügen.

## 3. Varianten & Vergleiche
- Wenn mehrere Varianten (z. B. A vs. B vs. C) gefragt sind, nutze `LabCompare.svelte` (oder ein gleichwertig schlichtes Split-/Switch-Pattern), damit man direkt **nebeneinander** oder per **Umschalter** vergleichen kann.
- Behalte die aktuelle `cs`-Komponenten-API bei (prüfe Typen via `bun typecheck`).
