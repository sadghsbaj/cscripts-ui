# `/lab` — Isolated UI & Feature Sandbox

Du arbeitest ausschließlich in `src/lab/` (im Dev-Server erreichbar unter `/lab`).

## 1. Harte Regeln (Zero Side-Effects)
- **Strict Scope:** Ändere oder erstelle **nur** Dateien innerhalb von `src/lab/`.
- **Tabu:** Fasse **niemals** `src/App.svelte`, `src/main.ts`, `src/core/`, `src/features/`, `src/shared/`, `package.json` oder Config-Dateien außerhalb von `src/lab/` an.
- **Kein Export in die App:** Nichts aus `src/lab/` darf von der restlichen Anwendung importiert werden. Umgekehrt darf `src/lab/` bestehende App-Module (`$core/*`, `$features/*`, `$shared/*`) und `cs/svelte/*` zum Testen importieren.
- **Saubere Isolation:** Lege größere Experimente als eigene `.svelte`- oder `.ts`-Datei in `src/lab/` an und binde sie in `LabView.svelte` ein. So lässt sich jedes Experiment rückstandslos wieder entfernen.
- **Dev-Only:** `/lab` existiert ausschließlich im Dev-Server (`import.meta.env.DEV`); im Production-Build wird `src/lab/` komplett entfernt.

## 2. Design & Technik (Konsistent mit `cs`)
- **Primitives & Tokens nutzen:** Verwende bestehende `cs/svelte/*`-Komponenten (`Button`, `ToggleButton`, `ToggleButtonGroup`, `Checkbox`, `ScrollArea`, `HitArea`, `tooltip`, etc.), UnoCSS-Utilities (`bg-canvas`, `bg-elevated`, `shadow-elevated`, `squircle`, `title-*`, `text-*`) und CSS-Tokens (`--cs-color-*`, `--cs-ease-*`, `--cs-spring-*`) statt fremder Styles.
- **Light & Dark Mode:** Alle eigenen Styles müssen mit `light-dark()` / `--cs-color-*` in beiden Modi sauber funktionieren.
- **Kein UI-Ballast:**
  - Keine überladenen Dashboards, keine Marketing-Texte, keine langen Erklärungen im UI.
  - Alles ruhig, zentriert und auf das eigentliche Experiment fokussiert – kurze, präzise Labels genügen.

## 3. Varianten & Vergleiche
- Wenn mehrere Varianten (z. B. A vs. B vs. C) gefragt sind, baue ein schlichtes Split- oder Switch-Pattern direkt in `src/lab/`, damit man Varianten direkt **nebeneinander** oder per **Umschalter** vergleichen kann.
- Behalte bestehende `cs`- und Projekt-APIs bei und prüfe Typen nach Änderungen.
