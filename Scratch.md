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


---

## 3. Primitives-Audit & Lösungsvorschläge

### A. Konkrete Bugs / unfertige Stellen
1. **`Checkbox`: `hitAreaSize`-Prop ist tot & leakt ins DOM**
   - *Problem:* `CheckboxProps` (`src/svelte/primitives/checkbox/index.ts`) definiert `hitAreaSize?: CheckboxHitAreaSize`, `Checkbox.svelte` destructured es aber nicht → landet über `{...rest}` als `hitareasize="..."` auf `<input>`.
   - *Lösung:* Entweder `hitAreaSize` sauber entfernen (und `<HitArea>` bei Bedarf im Wrapper/Label setzen, da `<input>` ein Void-Element ist und keine Kinder haben kann) oder in `Checkbox.svelte` `hitAreaSize` destructuren und über ein Wrapper-Element / `::before` abbilden.
2. **`ToggleButton`: `value` ohne `ToggleButtonGroup` unbrauchbar**
   - *Problem:* `ToggleButtonStateProps` verbietet `pressed`, sobald `value` gesetzt ist. Außerhalb einer `ToggleButtonGroup` lässt sich der Zustand dann nicht binden/lesen.
   - *Lösung:* Entweder `value` + `pressed` entkoppeln (wenn kein Group-Context vorhanden ist, Warnung/Dev-Assert oder `pressed` trotzdem erlauben) oder `ToggleButtonGroupItem` als eigene dünne Komponente trennen.
3. **`README.md` veraltet**
   - *Problem:* Beispiel-Imports zeigen noch `cs/svelte/components` und `cs/svelte/attachments`, obwohl `package.json` `./svelte/*` direkt auf `./src/svelte/primitives/*/index.ts` mappt.
   - *Lösung:* `README.md` auf die aktuellen `cs/svelte/<primitive>`-Imports aktualisieren.

### B. Inkonsistente Design-System-Skalen & Props
1. **Farben (`color`) driften auseinander**
   - *Problem:* `Button` (`accent | base | danger`), `ToggleButton` (`accent | success | warning | danger` – ohne `base` & `elevated`), `Checkbox` (`accent | base`), `CloseButton` (nur `base`).
   - *Lösung:* Falls `data-color-tone` (`colorful` | `neutral`, siehe Abschnitt 1) eingeführt wird, `color` auf echte **semantische Intents** reduzieren (z. B. `danger` / `success` / `warning`) und Standard-Neutralität vs. Akzent über das Theme-System regeln. Bis dahin: `ToggleButton` mindestens um `base` (oder `neutral`) und `elevated` ergänzen.
2. **Größenskalen (`size`) sind nicht kompatibel**
   - *Problem:* `Button` / `ToggleButton` (`xs=28px .. xl=44px`), `CloseButton` (`xs=16px .. xl=48px`). Ein `CloseButton size="md"` (32px) ist so groß wie `Button size="sm"`.
   - *Lösung:* Entweder `CloseButton` an die Button-Skala angleichen (und kompakte Größen über `2xs`/`xs` abbilden) oder die Abweichung bewusst dokumentieren, wenn Icon-Only-Dismiss-Buttons kleiner skalieren sollen.
3. **Polymorphes `as` & `type="button"`**
   - *Problem:* `Button` unterstützt `as="button" | "a" | "label"` und erlaubt `type="submit"` via `{...rest}`. `ToggleButton` und `CloseButton` erzwingen `<button {...rest} type="button">`.
   - *Lösung:* Bei `ToggleButton` / `CloseButton` `type="button"` *vor* `{...rest}` setzen (Konsistenz), `as` nur bei Bedarf ergänzen.

### C. Duplizierung & Drift (`Button*` vs. `ToggleButton*`, `Clipboard`)
1. **`ButtonIcon` / `ToggleButtonIcon` & `ButtonLabel` / `ToggleButtonLabel` identisch**
   - *Problem:* Praktisch 1:1 kopiert, nur Klassennamen unterscheiden sich.
   - *Lösung:* Entweder über gemeinsame CSS-Basis-Klassen / Shared-Styles (z. B. in `src/css` oder ein gemeinsames internal Helper-Primitive) abbilden oder `Button` + `ToggleButton` über ein gemeinsames Button-Core-Stylesheet teilen.
2. **`ButtonGroup` vs. `ToggleButtonGroup` laufen auseinander**
   - *Problem:* `ButtonGroup` setzt bei `ghost` `--_inner-radius: 4px`, `ToggleButtonGroup` vergisst das. `ButtonGroupSeparator` färbt sich per `color-mix()` passend zum Button, `ToggleButtonGroupSeparator` bleibt immer neutral.
   - *Lösung:* Gemeinsames Group-CSS/Mixin oder eine gemeinsame `Group`-Basis für Radius-, Separator- und HitArea-Logik verwenden, damit Änderungen nur an einer Stelle passieren.
3. **`CopyIcon` & `PasteIcon` Sparkle-Duplizierung**
   - *Problem:* Identisches Particle-Markup (Sterne/Dots) und CSS in beiden Komponenten.
   - *Lösung:* Kleines internes `<SparkleParticles />` (oder CSS-Klasse) extrahieren, das beide Icons nutzen.

### D. Attachment-APIs & Ordnerstruktur
1. **Mischmasch unter `src/svelte/primitives/`**
   - *Problem:* UI-Komponenten, DOM-Attachments (`click-outside`, `focus`, `fade-mask`, `scroll-fade`, `scroll-lock`) und reine JS-Utilities (`browser-storage`) liegen alle im selben Ordner.
   - *Lösung:* Optional trennen in `primitives/` (UI-Komponenten), `attachments/` (DOM-Direktiven) und `utils/` (oder `storage/`), mit passenden `package.json`-Exports (falls gewünscht).
2. **`enabled`-Signatur bei Attachments uneinheitlich**
   - *Problem:* `scrollLock` akzeptiert `boolean | (() => boolean)`, während `fadeMask`, `scrollFade` und `clickOutside` nur `boolean` akzeptieren.
   - *Lösung:* Kleinen Helper `resolveGetter(val)` einführen und alle Attachments einheitlich `boolean | (() => boolean)` unterstützen lassen.

### E. A11y / i18n
1. **Hardcodiertes Deutsch in `CloseButton`**
   - *Problem:* `aria-label="Schließen"` in `CloseButton.svelte` widerspricht der englischen Codebase/API.
   - *Lösung:* Auf `"Close"` ändern (weiterhin via `{...rest}` überschreibbar).
