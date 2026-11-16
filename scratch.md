## UI & Polish

- [ ] Usage Guidance zu bestimmten Components noch anlegen
- [ ] Bestehende „1-Language-only“-Stellen auf DE/EN refactoren
- Sunken im Dark Mode noch mehr „sunken“ wirken lassen (Schatteneffekt / Lichtkante – noch offen)
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

## Modules

- [ ] Filesystem-Basis: Testabdeckung nochmal prüfen und ggf. erweitern
- [ ] Modal
- [ ] Select
- [ ] Combobox
- [ ] ContextMenu
- [ ] Toast
- [ ] NLP Parser
- [ ] Chips
- [ ] Kbd
- [ ] Badges
- [ ] Color Picker
- [ ] EML-Logik: Signaturen
- [ ] EML-Wizard
- [ ] Allgemeine EML-Logik (eigene Outlook-E-Mail-Logik für Work)
- [ ] Excel-Parsing evtl. zentraler/einfacher (Excel zu JSON, JSON zu Excel mit Formatierung etc.)
- [ ] Cards
- [ ] KI-Integrationen clean dargestellt
- [ ] Dokumentationsseite: flexible Bausteine (Factory Pattern)
- [ ] Filesystem-Chooser / Verwalter-Element
- [ ] PDF Viewer
- [ ] Verschlüsselte Seiten im Filesystem
- [ ] Auth-System im Filesystem
- [ ] Diff-Component
- [ ] Textarea (evtl.)
- [ ] ContentEditable-artiges Element für Platzhalter etc.
- [ ] Animierte Charts
- [ ] Text Morph (z. B. für ToggleButton, wenn sich nur der Text ändert, wie „Offen“ zu „Erledigt“)
- [ ] Zahlen-Animationen
- [x] Filesystem-Basis bauen
- [x] Switch (Anticipation Spring) + Group
- [x] RovingFocus
- [x] TextInput

## Checkbox

- [x] Group?
- [x] Invalid-Style
- [x] Logik erweitern wie bei ToggleButton
- [x] Headless CheckboxGroup nur für Verhalten?
- [x] Animationen in alle Richtungen geil machen
- [x] Doku anpassen
- [x] Dot in der Mitte der Checkbox bei Indeterminate
- [x] Indeterminate „Select All“-Bug
- [x] Hit Area
