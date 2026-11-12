# Scratch – To-Dos & Notizen

## 1. Theme-System (`data-color-scheme` & `data-color-tone`)

Ziel: Globales Umschalten zwischen **Farbig** (`colorful`) und **Neutral** (`neutral`) statt `color`-Prop an einzelnen Komponenten.

- **Struktur:** `theme/`-Ordner unter Primitives (`color-scheme`, `tone`, `theme`) + Inline-Script in `src/vite/theme.ts` gegen FOUC.
- **Attribute:** `data-color-scheme` (`light` | `dark`) und `data-color-tone` (`colorful` | `neutral`).
- **Umstellungs-Checkliste (alle bisherigen Theme-Stellen anpassen):**
  - UnoCSS (`src/uno/index.ts` → `dark` / `light` Selektoren)
  - CSS Foundation (`lightningcss.css`, `shapes.css`, `colors.css`)
  - Globale Akzent-Stellen prüfen: `selection.css`, Cursor-/Caret-Farbe, `focus.css` (Focus-Ring-Farbe)
  - Dokumentation (`src/svelte/explanations/`, `src/agents/`)

### Erkenntnisse aus dem Experiment
- **Checkbox:** Ohne `color`-Prop (nur `data-color-tone`) funktioniert hervorragend.
- **Button:** Neutraler `soft`/`ghost`-Hintergrund + Akzent-Textfarbe funktioniert sehr gut.
  - *Idee:* Auch bei `danger` (`soft`/`ghost`) den Hintergrund neutral lassen und nur den Text/Icon in Danger-Rot färben.
- **Clipboard (`CopyIcon` / `PasteIcon`):** Klären, ob Feedback-Icons im `neutral`-Modus farbig bleiben oder ebenfalls monoton werden.
- **ToggleButton (größte offene Baustelle):** Einen neutralen Pressed-State zu finden, der klar erkennbar, aber nicht zu aggressiv/hart ist, bleibt schwierig – Konzept überdenken oder hier ggf. bewusst Farbe zulassen.

---

## 2. Sunken-Background (Experiment / UI-Test)

Gegenstück zu `elevated`: leicht „eingesunkener“ Hintergrund über subtile Inset-Schatten statt flacher `base-soft`-Flächen.

- **Test-Kandidaten:**
  - **Segmented Control** (als Track-Hintergrund)
  - **Checkbox (`soft`, unchecked)** als leichte Einkerbung (prüfen, ob es bei der kleinen Größe wirkt)
