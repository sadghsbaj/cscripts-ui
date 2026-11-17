## UI & Polish

- [ x] Kbd: Enter-Symbol rutscht in zwei Zeilen
- [x ] ToggleButtonGroup: Separatoren und ESLint-Regel refactoren
- [x ] Toast: Swipe-to-Dismiss noch minimal hakelig und nicht optimal smooth
- [x ] Toast-Animation beim Verschwinden nochmal gucken und optimieren
- [x] Stepper (vertical): Unteres Element bekommt zuerst Fokus – fixen
- [x] Stepper: Immer morphen außer im Input
- [x] Separatoren sind nicht richtig positioniert, sondern immer am Ende des Elements statt genau zentriert zwischen zwei
- [x] Input-Zahl springt ein Pixel hoch beim Fokussieren (Alignment prüfen)
- [x] Sticky Hover auf Mobile lässt Separatoren durch Hover-Auslösung sticky verschwinden (darf auf Mobile nicht passieren); dafür fehlt Interaktionsdarstellung bei `:active` auf Mobile (wie bei Button den Hover-Effekt auf `:active` spiegeln)
- [x] Umspringen teils bei Ziffernanzahl-Wechsel (kann man das von außen sauber steuern?)

## Modules

- [ ] Modal
- [ ] Select
- [ ] Dropdown
- [ ] Combobox
- [ ] ContextMenu
- [ ] Chips
- [ ] Sidebar
- [ ] Color Picker
- [ ] Animierte Charts
- [ ] NLP Parser
- [ ] Text Morph (z. B. für ToggleButton, wenn sich nur der Text ändert, wie „Offen“ zu „Erledigt“)
- [ ] Number Stepper (`-` / `+` Control für Zooming und Größenstufen)
- [x] Toasts ESLint?
- [x] Autoresize Attachment ESLint?
- [x] Textarea (evtl.)
- [x] Scrollbar nicht nutzbar in Textarea?
- [x] Toast
- [x] Autoresize Attachment
- [x] Middle Click Attachment
- [x] Zahlen-Animationen
- [x] Progress

## Work

- KPI Cards
- [ ] Filesystem-Basis: Testabdeckung nochmal prüfen und ggf. erweitern
- [ ] EML-Logik: Signaturen
- [ ] EML-Wizard
- [ ] Allgemeine EML-Logik (eigene Outlook-E-Mail-Logik für Work)
- [ ] Excel-Parsing evtl. zentraler/einfacher (Excel zu JSON, JSON zu Excel mit Formatierung etc.)
- [ ] KI-Integrationen clean dargestellt
- [ ] Dokumentationsseite: flexible Bausteine (Factory Pattern)
- [ ] Filesystem-Chooser / Verwalter-Element
- [ ] PDF Viewer
- [ ] Verschlüsselte Seiten im Filesystem
- [ ] Auth-System im Filesystem
- [ ] Diff-Component
- [ ] ContentEditable-artiges Element für Platzhalter etc.

## Done

- [x] Debugger-Agent löschen
- [x] ESLint-Regeln für `Card`, `Badge`, `Progress`?
- [x] Usage Guidance zu bestimmten Components noch anlegen
- [x] Bestehende „1-Language-only“-Stellen auf DE/EN refactoren
- [x] Zentriert-Bug bei `Kbd` fixen (Text-Trim)
- [x] Sunken im Dark Mode noch mehr „sunken“ wirken lassen (Schatteneffekt / Lichtkante)
- [x] Switch: `rounded-full` (Height / 2)
- [x] Switch mit Spring testen?
- [x] `Kbd`-ESLint-Regeln anlegen
- [x] Designer fragen bei Switch: schneller Klick direkt ohne Antizipations-Animation (damit snappier); bei Gedrückthalten nach gewisser Zeit (egal ob danach ausgelöst wird oder nicht) Antizipations-Animation starten
- [x] Englisch/Deutsch-Support integrieren (kein fertiges System, sondern damit Components wie `aria-label` beim Close-Button oder `Kbd` bestimmte Texte je nach App-Einstellung sauber in der passenden Sprache rendern)
- [x] Keycap in Tooltip integrieren
- [x] 1px-Kbd-Tooltip-Bug horizontal fixen
- [x] Benennung von `internal` CSS bei `Kbd` prüfen (eher Shared CSS, z. B. `.shared.css` oder einfach `kbd.css`?)
- [x] Prüfen, ob `variant` auf `KbdGroup` inkonsistent ist, da wir das z. B. bei `ToggleButtonGroup` oder `CheckboxGroup` nicht machen
- [x] Prüfen, ob eine Art `compactHeight`-Prop beim `Kbd` Sinn macht (z. B. `default | compact` für enge Stellen)
- [x] Kbd
- [x] Switch (Anticipation Spring) + Group
- [x] RovingFocus
- [x] TextInput
- [x] Filesystem-Basis bauen
- [x] Checkbox: Group?
- [x] Checkbox: Invalid-Style
- [x] Checkbox: Logik erweitern wie bei ToggleButton
- [x] Checkbox: Headless CheckboxGroup nur für Verhalten?
- [x] Checkbox: Animationen in alle Richtungen geil machen
- [x] Checkbox: Doku anpassen
- [x] Checkbox: Dot in der Mitte der Checkbox bei Indeterminate
- [x] Checkbox: Indeterminate „Select All“-Bug
- [x] Checkbox: Hit Area
- [x] Badges
- [x] Cards
- [x] Tab-Reihenfolge in `Card` bei Close-Button prüfen/korrigieren
- [x] Close-Button über Grafik in `Card`: prüfen, ob nötig, ggf. `elevated` oder `soft` nutzen bzw. leicht mit solidem `bg` überschreiben
- [x] Cleane References nebenan in `Card`-Docs verlinken
- [x] `ButtonMorph`: Toggling lässt sich nicht mehr abbrechen (geht auf `pointerdown`) – fixen
- [x] `Kbd` Keycap im Dark Mode: minimalen schwarzen Schatten entfernen (das Gräuliche passt)
