# 01 – Design-Tokens, Skalen & visuelle Regeln

Status: **In Abstimmung** (Farben & Popover geklärt; `CloseButton`-Skala & Motion-Tokens noch kurz finalisieren)

---

## 1. Statusfarben (`color-semantics.css`) — **Entschieden**
- Umstellung von `success / warning / danger` auf neutrale Polaritäten:
  - **`positive`** (ehemals `success`)
  - **`caution`** (ehemals `warning`)
  - **`negative`** (ehemals `danger`)
- **`info`** wird komplett entfernt.
- **Konsequenz für Props:** `Button` (`danger`), `ToggleButton` (`color`) und `Checkbox` (`invalid` → nutzt `--cs-color-negative-*`) werden im Zuge der Umsetzung darauf ausgerichtet.

---

## 2. Größenskalen (`size`) — **Fast geklärt**
- **Prinzip:** Es ist **bewusst erlaubt**, dass nicht jedes Primitive alle 5 Stufen hat:
  - **Interaktive Controls:** `xs | sm | md | lg | xl` (`Button`, `ToggleButton`, `Checkbox`, `CloseButton`, künftige `Switch`/`Input`).
  - **Effekt-/Modifier-Primitives:** `sm | md | lg` (`ScrollFade`, `ScrollArea`, `BackgroundPattern`, `HitArea`).
- **`Popover.size` → `Popover.width`:** **Entschieden.** `content | anchor | min-anchor` beschreibt Breite, nicht T-Shirt-Größe, und wird zu `width` umbenannt.
- **Offen (kurz festlegen): `CloseButton`-Skala**
  - Aktuell: `Button` = `28 / 32 / 36 / 40 / 44px`, `CloseButton` = `16 / 24 / 32 / 40 / 48px`.
  - *Option A:* `CloseButton` behält bewusst eine eigene kompakte Skala (z. B. `16 / 20 / 24 / 32 / 36px`), weil `md` bei einem Dismiss-Icon etwas anderes bedeutet als bei einem Text-Button.
  - *Option B:* `CloseButton` übernimmt `28 / 32 / 36 / 40 / 44px` für `xs..xl` (damit es 1:1 zu `Button` passt) + optional `2xs` (`20px`) für Mini-Dismiss.

---

## 3. Motion & Duration Tokens (`motion.css`) — **Vorschlag zur Abnahme**
- **Prinzip:** 4 semantische Geschwindigkeits-Anker nach *Art der Bewegung* (nicht nach Pixelgröße), damit Standard-Transitions nicht zwischen `180ms` und `200ms` driften:
  - `--cs-duration-instant` (`~90ms`): reine Farb-/Opacity-Micro-States (Hover-Tint, Background-Color)
  - `--cs-duration-fast` (`~160ms`): kleine UI-Controls & Press-Feedback (Button-Squash, Checkbox, Switch)
  - `--cs-duration-normal` (`~240ms`): mittlere räumliche Bewegungen (Popover, Tooltip, Overlay-Content)
  - `--cs-duration-slow` (`~320ms`): große Flächen / View Transitions (wie bereits `320ms` in `motion.css`)
- **Ausnahme-Regel:** Komplexe SVG-Path- oder Physik-Animationen dürfen begründet abweichen, Standard-UI-Transitions nutzen zwingend die Tokens.

---

## 4. Visuelle Regeln (Optik & Oberflächen) — **Vorschlag zur Abnahme**
- **Borderless by Default:** Keine CSS-`border` für Control-Konturen/Outlines – Hairlines, Lichtkanten und Error-Ringe werden konsequent über `box-shadow` realisiert (Bestandsaufnahme: `CloseButton.svelte` hat aktuell noch `border: var(--_border, none)` → bereinigen).
- **Lichtkante (`--cs-shadow-solid`):** Solid-Accent-Elemente nutzen einheitlich das Top-Highlight + Drop-Shadow-Pattern.
- **Color-Scheme:** Kein Neutral-vs.-Accent-Dualsystem; interaktive Solid/Soft-Controls standardisieren auf Accent (wie in `Button` und `Checkbox` bereits umgesetzt).
