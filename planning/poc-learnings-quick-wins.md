# PoC-Learnings: Quick Wins (Umsetzungs-Checkliste)

> **Basis:** Extrakt aus [poc-learnings-refactoring-plan.md](./poc-learnings-refactoring-plan.md)  
> **Ziel:** Überschaubare, risikoarme Verbesserungen an Template, Library-Details, Doku und Agent-Rules, die wir Schritt für Schritt einzeln abarbeiten können.  
> **Status:** Zur schnellen, schrittweisen Umsetzung vorgesehen — noch nicht umgesetzt.

---

## Gruppe A: Template & Kleine Library-Fixes (Code / Tokens)

- [ ] **#3 `tsconfig.app.json` (Template):** `"ESNext"` standardmäßig in `compilerOptions.lib` aufnehmen (`["ESNext", "DOM", "DOM.Iterable"]`), damit `cs/svelte/file-system` (`Promise.withResolvers`, `Iterator.prototype.toArray`) bei `svelte-check` out-of-the-box typsicher prüft.
- [ ] **#1 (Teil) `WorkAppStatusDot` Tooltip-Fix:** In `WorkAppStatusDot.svelte` `displayLabel` statt `WORK_APP_STATUS_DEFAULTS[status]` an `tooltip(...)` übergeben, damit benutzerdefinierte `label`-Texte im Tooltip erscheinen.
- [ ] **#15 `WorkAppSignature` Info-Icon:** Clicks auf dem Info-Icon abfangen/blockieren, während Hover-Events für den Tooltip weiterhin sauber durchkommen (verhindert störendes Wegklicken des Tooltips).
- [ ] **#7 Dark Mode `--cs-shadow-elevated` (schneller Token-Tweak):** Lichtkante im Dark Mode leicht anheben (Opazität von `0.02` auf `~0.04`), damit sich `elevated`-Flächen klarer vom Untergrund abheben. *(Eine größere Aufteilung in Surface- vs. Control-Stufen bleibt optional im Hauptplan.)*
- [ ] **#10 `SegmentedControl` (& `ToggleButtonGroup`) `scale`-1px-Sprung testen:** Im Playground mit `will-change: scale` / `will-change: transform` gegenprüfen (1x DPI vs. HiDPI sowie Übergang `[data-state="inactive"]:active` → `[data-state="active"]`) und bei sauberem Ergebnis in Chromium direkt fixen.

---

## Gruppe B: Schnelle Doku-Updates (`*.docs.md`)

- [ ] **#5 `overlay.docs.md`:** Hinweis ergänzen, dass `<Overlay>` bewusst als reines Top-Layer-Overlay ohne Focus-Trap konzipiert ist und bis zur Verfügbarkeit von `Modal` für Dialoge mit `cs/svelte/focus` (`focusTrap` / `autoFocus`) kombiniert werden soll.
- [ ] **#1 `app-layout.docs.md`:** `48px` Höhe (`size="xl"` bzw. `--cs-button-height: 48px`) für benutzerdefinierte Header-Buttons sowie die strikte Trennung *Global (Header) vs. App-spezifisch (Content)* festhalten.
- [ ] **#4 `toggle-button-group.docs.md` (+ analoge Input-Docs):** Prominent auf `bind:value={getter, setter}` vs. `onValueChange` hinweisen, um Laufzeitfehler durch `$bindable()`-Übergaben ohne `bind:` (z. B. `value={fn()}`) zu vermeiden.
- [ ] **#2 `popover.docs.md`:** Klare Entscheidungshilfe ergänzen, wann `"click"` vs. `"pointerdown"` bei `triggerOn` sinnvoll ist *(unabhängig davon, ob `triggerOn` später Pflicht wird)*.

---

## Gruppe C: Gezielte `.agents/rules/`-Ergänzungen

- [ ] **#1 `.agents/rules/cs-work.md`:** Header-Button-Höhe (`48px` / `size="xl"`) sowie striktes Verbot von app-spezifischem Business-Kontext (z. B. Filter, `Werk · Linie`) im `WorkAppHeader` festhalten.
- [ ] **#4 `.agents/rules/cs-svelte.md`:** Warnung zur `$bindable()`-Falle (`value={fn()}` ohne `bind:` passiert `svelte-check`, crasht aber zur Laufzeit bei Mutation) + `bind:value={getter, setter}`-Pattern dokumentieren.
- [ ] **#11, #13, #16 Design-Leitplanken (kleine Regel-Zusätze):**
  - **#11 Close-Button-Positionierung:** Close-Button in Cards, Modals und Overlays mit eigenem, knapperem Randabstand oben/außen platzieren — optisch sichtbar näher am Rand als das Titel-Padding.
  - **#13 Zustandswechselnde Buttons:** Bei Zustandswechseln (`tertiary` → `secondary`) für echte Toggles `ToggleButton` nutzen oder den Variantenwechsel über `ButtonMorph` animieren.
  - **#16 Kurze Labels & stabile Switcher:** Kurze, prägnante Button-Labels vorgeben und bei dynamischen Switchern per `min-width`, fester Breite oder `tabular-nums` gegen Layout-Shifts absichern.

---

## Abgrenzung: Bewusst *keine* Quick Wins (bleiben im Hauptplan)

Die folgenden größeren Themen bleiben bewusst im [Hauptplan](./poc-learnings-refactoring-plan.md), da sie API-Breaking-Changes, größere Library-Umbauten oder neue Agent-Workflows erfordern:

- **#2 (API-Breaking-Change):** `triggerOn` als Pflichtoption in `popoverTrigger` verlangen (statt stillem `"pointerdown"`-Default).
- **#4 (API-Umbau):** `$bindable()`-Komponenten sauber ohne `bind:` (kontrollierte Props + Callback) nutzbar machen.
- **#6 `cs/svelte/file-system`:** `health` vs. `activity` trennen (kein `"caution"`-Blitzen bei `isBusy`) & expliziten `"restoring"`-Status gegen den initialen `WorkspaceGate`-Flash einführen.
- **#8 Architektur-Regeln:** Colocation im Feature vs. `core/`-Abspaltung für kleine vs. größere Apps sauber ausarbeiten.
- **#9, #12, #14, #17, #18 (Große Design-/Agent-/Library-Umbauten):** Schärfung/Erweiterung der Design-Agenten (`architect`, `design-critic`, 3-stufiger Design-Workflow + `lab/`-Wireframes), Layout-Archetypen, `src/references/` (Golden Templates), ruhigere `negative`-Button-Variante (erst bei Hover/Focus rot) sowie grundlegende Desktop-Proportionen & Typografie-Skala.
