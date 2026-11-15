# 01 – Design-Tokens, Skalen & visuelle Regeln

Status: **Abgeschlossen** (Grundentscheidungen stehen; Detail-Ausarbeitung der Duration-Werte bewusst vertagt)

---

## 1. Statusfarben (`color-semantics.css`) — **Entschieden**
- Umstellung von `success / warning / danger` auf neutrale Polaritäten:
  - **`positive`** (ehemals `success`)
  - **`caution`** (ehemals `warning`)
  - **`negative`** (ehemals `danger`)
- **`info`** wird komplett entfernt.
- **Konsequenz:** `Button` (`danger`), `ToggleButton` (`color`) und `Checkbox` (`invalid` → `--cs-color-negative-*`) werden bei der Umsetzung entsprechend angepasst.

---

## 2. Größenskalen (`size`) — **Entschieden**
- **Regel:** `size` steht im gesamten Projekt **immer** für T-Shirt-Größen (keine Breite/Modi wie `content`/`anchor`).
- **Haupt-Controls (`xs | sm | md | lg | xl`):** `Button`, `ToggleButton`, `Checkbox`, `CloseButton` (und künftige `Switch`, `Input`, ...).
- **Effekte & Modifier (`sm | md | lg`):** `ScrollFade`, `ScrollArea`, `BackgroundPattern`, `HitArea`.
- **`CloseButton` (Option A):** Behält bewusst seine eigene kompakte Skala (wird *nicht* auf Krampf an `Button`-Höhen angeglichen), weil Dismiss-Icons eigene Anforderungen haben. Das Verhältnis zwischen Controls (z. B. `Button` vs. `Checkbox` vs. `CloseButton`) wird sauber dokumentiert und später vom Consistency-Agent geprüft.
- **`Popover.size` → `Popover.width`:** Umbenennung auf `width` (`content | anchor | min-anchor`).

---

## 3. Visuelle Regeln — **Entschieden**
- **Borderless by default:** Keine CSS-`border` für Control-Konturen/Outlines; Konturen, Hairlines, Lichtkanten und Error-Ringe laufen konsequent über `box-shadow`. (`CloseButton` wurde bereits bereinigt; restliche Primitives bei Bedarf prüfen.)
- **Lichtkante (`--cs-shadow-solid`):** Solid-Accent-Elemente nutzen einheitlich das Top-Highlight + Drop-Shadow-Pattern.
- **Color-Scheme:** Kein Neutral-vs.-Accent-Dualsystem; interaktive Solid/Soft-Controls standardisieren auf Accent.

---

## 4. Motion & Duration Tokens (`motion.css`) — **Richtung entschieden, Details offen**
- **Entschieden:** Wir verfolgen ein **rollenbasiertes Konzept** (orientiert an Interaktions-Rolle / Property-Typ, damit z. B. Background-Hover bei `Checkbox` und `Switch` identisch bleiben). Komplexe Choreographien (SVG-Draws, Particle-Bursts, `ButtonMorph`) bleiben bewusst lokal frei.
- **Bewusst noch offen (bei Umsetzung sauber ausarbeiten):** Welche exakten Rollen-Tokens wir definieren, wie sie benannt werden und welche konkreten `ms`-Werte sie bekommen.
