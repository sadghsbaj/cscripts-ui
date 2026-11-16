# `cs` Library-, Template- & Agent-Learnings (PoC: Schicht- & Anlagen-Übergabe-Board)

> **Kontext:** Konkrete Erkenntnisse und umsetzbare Checkliste aus der Umsetzung unseres ersten PoCs (**Schicht- & Anlagen-Übergabe-Board**) auf Basis von `cs` (`cs/svelte/work`, `cs/svelte/file-system`, `cs` UI-Primitives, UnoCSS & Svelte 5 Runes).  
> **Zielgruppe:** Weiterentwicklung von `cs`, Projekt-Template, Moduldokumentation (`*.docs.md`) und Agent-Prompts/Rules (`.agents/`).  
> **Status:** Festgehalten zur späteren Planung & Umsetzung (noch nicht umgesetzt).

---

## Umsetzungs-Checkliste (Übersicht)

- [ ] **1. `WorkAppHeader`:** Header-Button-Höhe (`48px` / `size="xl"`) & strikte Trennung _Global vs. App-spezifisch_ dokumentieren (+ optional `WorkAppStatusDot`-Tooltip-Fix)
- [ ] **2. `popoverTrigger`:** `triggerOn` als explizite Entscheidung statt stillem `"pointerdown"`-Default verlangen
- [ ] **3. `tsconfig.app.json`:** `"ESNext"` standardmäßig in `compilerOptions.lib` aufnehmen
- [ ] **4. Svelte 5 `$bindable()`:** `bind:value={getter, setter}` vs. `onValueChange` prominent dokumentieren (oder ohne `bind:` nutzbar machen)
- [ ] **5. `Overlay` & `Modal`:** In `overlay.docs.md` auf `cs/svelte/focus` (`focusTrap` / `autoFocus`) verweisen, bis die geplante `Modal`-Komponente existiert
- [ ] **6. `cs/svelte/file-system`:** `health` vs. `activity` trennen (kein `"caution"`-Blitzen bei `isBusy`) & `"restoring"`-Status gegen `WorkspaceGate`-Flash einführen
- [ ] **7. Dark Mode `--cs-shadow-elevated`:** Lichtkante leicht anheben (`0.02` → `~0.04`) oder in Surface- vs. Control-Stufen aufteilen
- [ ] **8. Architektur-Regeln:** Colocation im Feature vs. `core/`-Abspaltung für kleine vs. größere Apps klarer abgrenzen
- [ ] **9. Design- & Agent-Prompts (`architect` / `design-critic` / dedizierter Design-Agent):** Harte Leitplanken für Toolbar-Dichte-Budget, Progressive Disclosure, Button-Hierarchie, `SegmentedControl` vs. `ToggleButtonGroup` und Header-Abgrenzung schärfen
- [ ] **10. `SegmentedControl` (& `ToggleButtonGroup`):** ~1px-Sprung am Ende der `scale`-Transition in Chromium prüfen (`will-change`, Layer-Promotion/Demotion, `inactive` → `active`)
- [ ] **11. Close-Button-Positionierung:** In Cards, Modals & Overlays am Rand mit eigenem, knapperem Randabstand platzieren statt bündig mit dem Titel-Padding
- [ ] **12. Desktop-first Proportionen & Layout-Klarheit:** Großzügigere Text-/Label-Größen und weniger verschachtelte, klar strukturierte vertikale Layouts einfordern
- [ ] **13. Zustandswechselnde Buttons (`tertiary` → `secondary`):** Für echte Toggle-Zustände `ToggleButton` nutzen oder Variantenwechsel über `ButtonMorph` animieren
- [ ] **14. Übermäßige rote `ghost`-Trash-Buttons (`negative`):** Lösch-Aktionen häufiger in Unter-/Kontextmenüs kapseln und ruhigere `negative`-Variante (erst bei Hover/Focus rot) prüfen
- [ ] **15. `WorkAppSignature`:** Clicks auf dem Info-Icon abfangen/blockieren, während Hover-Events für den Tooltip durchkommen
- [ ] **16. Kurze Button-Labels & stabile Switcher:** Prägnante Labels vorgeben und Layout-Shifts bei dynamischen Switchern per fester Breite, `min-width` oder `tabular-nums` verhindern
- [ ] **17. Template-Design-Workflow (3-stufig + Wireframe-/Blueprint-Sandbox):** Trennung von UX/IA-Planung, visuellem Layout-Blueprint (Wireframe-Route z. B. unter `lab/` mit Mock-Blueprint-Komponenten zur Vorab-Freigabe) und Detail-Review (`design-critic`) prüfen
- [ ] **18. Golden Templates / Referenzen (`src/references/`):** Wenige, qualitativ hochwertige Referenz-Ansichten (Makro-Layouts + reduzierter Code) in `cs` pflegen und ggf. per Agent aus bestehenden Lieblings-Apps in Layout-Sprache extrahieren

---

## 1. `WorkAppHeader` & `WorkAppStatusDot`: Höhe, Rolle & Tooltip

> **Hinweis vorab:** Das Hochformat (`40px × 48px`) beim `<WorkAppHeaderSegment align="before" renderIsland><WorkAppStatusDot /></WorkAppHeaderSegment>` ist **genau so gewollt** und wirkt im Header sauber — hier besteht kein Layout-Bug.

- **Beobachtete Probleme:**
    1. Benutzerdefinierte Header-Buttons mit Standardgröße (`<Button size="md">`) sind im Vergleich zu den `48px` hohen Work-Header-Elementen (`WorkAppToolIdentity`, `WorkAppBrand`, `WorkAppHelpButton`, `WorkAppThemeButton` mit `size="xl"`) deutlich zu niedrig.
    2. App-spezifische Business-Logik (z. B. `Werk · Linie`) wurde fälschlich in den `WorkAppHeader` platziert statt in den App-Inhaltsbereich.
    3. _(Optional)_ `WorkAppStatusDot` übergibt im Tooltip `WORK_APP_STATUS_DEFAULTS[status]` statt des übergebenen `label`-Props.
- **Maßnahmen für `cs` / Doku / Agent-Prompts:**
    - [ ] In `app-layout.docs.md` und `.agents/rules/cs-work.md` klar dokumentieren, dass Header-Buttons `48px` Höhe (`size="xl"` bzw. `--cs-button-height: 48px`) benötigen.
    - [ ] In `.agents/rules/cs-work.md` und den Agent-Prompts schärfer abgrenzen: `WorkAppHeader` ist **ausschließlich für globale App-Elemente** gedacht (App-Name, Status, Hilfe, Theme, Brand). App-spezifische Navigation, Filter oder Kontexte (`Werk · Linie`) gehören in den Content-Bereich.
    - [ ] _(Optional)_ In `WorkAppStatusDot.svelte` `displayLabel` an `tooltip(...)` übergeben, damit benutzerdefinierte `label`-Texte im Tooltip erscheinen.

---

## 2. `popoverTrigger`: `triggerOn` explizit machen

- **Beobachtetes Problem:**  
  `popoverTrigger` nutzt stillschweigend `triggerOn: "pointerdown"` als Default. Dadurch öffnen Standard-Button-Popovers in Header und Toolbar bereits beim Drücken, noch bevor der Klick abgeschlossen ist.
- **Maßnahmen für `cs` / Doku:**
    - [ ] Keinen stillen `"pointerdown"`-Default setzen — `triggerOn` als **explizite/pflichtige Option** verlangen (oder deutlich hervorheben).
    - [ ] In `popover.docs.md` eine klare Entscheidungshilfe ergänzen, wann `"click"` vs. `"pointerdown"` sinnvoll ist. (Bei Menüs ist `"pointerdown"` oft gewollt, um später mit `pointerup` arbeiten zu können und Menüs schnell zu öffnen; bei bestimmten Elementen kann `"pointerdown"` aber komisch wirken — sauber abgrenzen und dokumentieren, wo `"click"` besser ist.)

---

## 3. `tsconfig.app.json`: `"ESNext"` im Template-Standard

- **Beobachtetes Problem:**  
  `svelte-check` bricht bei Nutzung von `cs/svelte/file-system` mit Typfehlern in den Library-Interna ab (`Promise.withResolvers`, `Iterator.prototype.toArray`), wenn `"ESNext"` in `compilerOptions.lib` fehlt.
- **Maßnahmen für Template:**
    - [ ] In der Template-`tsconfig.app.json` standardmäßig `"lib": ["ESNext", "DOM", "DOM.Iterable"]` hinterlegen, damit `cs/svelte/file-system` out-of-the-box typsicher prüft.

---

## 4. Svelte 5 `$bindable()`-Falle (`ToggleButtonGroup`, `ToggleButton` etc.)

- **Beobachtetes Problem:**  
  Wird ein `$bindable()`-Prop ohne `bind:` als Ausdruck übergeben (z. B. `value={fn()}`), läuft `svelte-check` ohne Warnung durch. Beim Klick im Browser wirft Svelte 5 jedoch einen Laufzeitfehler, sobald die Komponente `value = next` mutiert.
- **Maßnahmen für `cs` / Doku / Rules:**
    - [ ] Prüfen, ob Komponenten in der Lib sauber ohne `bind:` (z. B. über kontrollierte Props + Callback) nutzbar gemacht werden können.
    - [ ] In `.agents/rules/cs-svelte.md` sowie `toggle-button-group.docs.md` (und analogen Input-Docs) prominent auf `bind:value={getter, setter}` vs. `onValueChange` hinweisen.

---

## 5. `Overlay` vs. zukünftige `Modal`-Komponente

- **Beobachtetes Problem:**  
  `<Overlay>` nutzt `popover="manual"` für den Top Layer, setzt dabei aber weder automatisch den Fokus in den Dialog noch trappt es `Tab`.
- **Einordnung & Maßnahmen für Doku:**
    - `<Overlay>` ist bewusst als reines Top-Layer-Overlay ohne Focus-Trap konzipiert; eine eigene `Modal`-Komponente (die Focus-Trap und AutoFocus übernimmt) ist für später geplant.
    - [ ] In `overlay.docs.md` ergänzen, dass `<Overlay>` bis zur Verfügbarkeit von `Modal` für Dialoge mit `cs/svelte/focus` (`focusTrap` / `autoFocus`) kombiniert werden soll.

---

## 6. `cs/svelte/file-system`: Nervöses `StatusDot`- & `WorkspaceGate`-Verhalten

- **Beobachtete Probleme:**
    1. `workspace.health` mappt jedes normale `isBusy` (Lesen, Schreiben, Restore) auf `"caution"` (Orange). Dadurch blitzt der `WorkAppStatusDot` bei jeder regulären Dateioperation nervös orange auf.
    2. `mountStatus` startet synchron mit `"unlinked"`, während `restore()` asynchron aus der IndexedDB lädt. Beim Reload blitzt dadurch kurz das `WorkspaceGate` auf.
- **Maßnahmen für `cs/svelte/file-system` / Doku:**
    - [ ] `health` und `activity` sauber trennen: `health` bildet nur echte Warnungen/Fehler ab, `activity` den regulären Lade-/Speicherzustand.
    - [ ] Einen expliziten `"restoring"`-Zustand in `mountStatus` einführen (oder als Best-Practice-Pattern dokumentieren), um den initialen `WorkspaceGate`-Flash beim Reload zu vermeiden.

---

## 7. Dark Mode Lichtkante (`--cs-shadow-elevated`)

- **Beobachtetes Problem:**  
  Die Lichtkante von `elevated`-Flächen (`--cs-shadow-elevated`) ist im Dark Mode aktuell etwas zu schwach ausgeprägt, sodass sich Ebenen visuell zu wenig vom Untergrund abheben.
- **Maßnahmen für `cs` Tokens:**
    - [ ] Lichtkante im Dark Mode leicht anheben (z. B. Opazität von `0.02` auf `~0.04`) oder sauber in **Surface- vs. Control-Stufen** aufteilen.

---

## 8. Architektur-Regeln (Colocation vs. `core/`)

- **Maßnahmen für Template / `.agents/rules/`:**
    - [ ] Colocation im Feature vs. `core/`-Abspaltung für kleine vs. größere Apps klarer abgrenzen.

---

## 9. Design-, Layout- & `ToggleButtonGroup`-Überladung (Agent-Schärfung)

- **Beobachtete Probleme:**
    1. **Toolbar- / Cockpit-Überladung:** Trotz Vorgaben wurde die obere Leiste massiv überfrachtet (Datum + Schichten + Linie + Schichtleiter + Übergabe an + Auto-Save + Speichern + Export alles in einer Reihe).
    2. **Fehlende Button-Hierarchie:** Fast alle Aktionen wurden als `secondary` gerendert, ohne klare semantische und visuelle Abstufung (Primär vs. Sekundär vs. Ghost/Subtle).
    3. **`ToggleButtonGroup` vs. `SegmentedControl`:** `ToggleButtonGroup` wirkt in vielen Kontexten optisch unruhig und wird von der KI schnell zweckentfremdet.
- **Maßnahmen für Doku & Agent-Prompts (`architect` / `design-critic`):**
    - [ ] `ToggleButtonGroup` in der Doku enger fassen (nur für ganz spezifische Mehrfach-/Tool-Auswahl-Zwecke) und für Modus- sowie Filter-Umschaltungen klar `SegmentedControl` bevorzugen.
    - [ ] `architect`- und `design-critic`-Prompts schärfen: konsequenter auf **Reduktion**, **Progressive Disclosure** (z. B. Metadaten in Popover/Drawer statt alles inline in der Toolbar) und eine **klare Button-Hierarchie** prüfen.
- **Fazit aus dem Design-Review (Leitplanken für neue App-Builds):**
  Die Design-Agenten (`design-critic` bzw. Rules für neue App-Builds) müssen deutlich nachgeschärft werden — bis hin zu einem **eigenen dedizierten Design-Agenten** für neue App-Builds mit harten Leitplanken:
    - [ ] **Konkretes Toolbar-Dichte-Budget & Pflicht zu Progressive Disclosure:** Sekundäre Metadaten und Einstellungen gehören konsequent in Popovers/Drawer statt alles inline in eine überladene Leiste zu pressen.
    - [ ] **Verbindliche Button-Hierarchie:** Klare Abstufung zwischen `primary`, `secondary` und `ghost` erzwingen — kein pauschales `secondary`-Einerlei.
    - [ ] **Klare Abgrenzung `SegmentedControl` vs. `ToggleButtonGroup`:** `SegmentedControl` als Standard für kompakte 1-aus-N-Modus-/Filter-Umschaltungen, `ToggleButtonGroup` nur eng umrissen für echte Multi-Toggle-/Tool-Gruppen.
    - [ ] **Striktes Verbot von app-spezifischem Business-Kontext im `WorkAppHeader`:** Der Shell-Header bleibt rein globalen App-Elementen vorbehalten.

---

## 10. `SegmentedControl` (& `ToggleButtonGroup`): 1px-Sprung am Ende der `scale`-Transition (Chromium)

- **Beobachtetes Problem:**  
  Beim Zurückwachsen von `.cs-segmented-control-item-content` (`scale: 0.95` → `1`) entsteht am Ende der Transition in Chromium ein harter ~1px-Sprung (bei `ToggleButtonGroup` mit `scale: 0.94` analog zu prüfen).
- **Theorien & Prüfpunkte (noch zu testen):**
    - [ ] **Compositor-Layer-Promotion/Demotion:** Chromium hebt das Element während der `scale`-Transition auf einen GPU-Compositor-Layer und droppt es bei `scale: 1` zurück auf den Main-Thread (Wechsel von bilinearer Compositor-Rasterung auf Subpixel-/Integer-Pixel-Alignment).
    - [ ] **`will-change: scale` / `will-change: transform` prüfen:** Kann den Layer-Drop-Snap verhindern. Zu prüfen sind mögliche Trade-offs: leichte Text-Unschärfe auf 1x-Displays bei Subpixel-Zentrierung (Grayscale-AA statt Subpixel-AA); Stacking-Context ist innerhalb von `.cs-segmented-control-item-content` unkritisch.
    - [ ] **Zustandswechsel `[data-state="inactive"]:active` → `[data-state="active"]`:** Ebenfalls prüfen, ob beim Klick-Übergang zwischen `inactive` und `active` (und bei `ToggleButtonGroup`) derselbe Effekt auftritt und wie er sich in Chromium/Playwright sauber reproduzieren und testen lässt.

---

## 11. Close-Button-Positionierung in Cards, Modals & Overlays (Design-Agenten)

- **Beobachtetes Problem:**  
  Design-Agenten alignen den Close-Button oft bündig mit dem Titel bzw. dem Titel-Padding, wodurch er optisch zu weit innen sitzt.
- **Maßnahmen für Design-Rules / Agent-Prompts:**
    - [ ] Klar formulieren, dass ein Close-Button nicht starr in die Titel-Zeile gehört, sondern sauber am Rand (z. B. oben rechts) mit eigenem, knapperem Randabstand sitzt — nicht zu nah an der Kante, aber sichtbar näher am Rand als das Titel-Padding.

---

## 12. Desktop-first Proportionen, Typografie-Skala & Layout-Klarheit (Design-Agenten)

- **Beobachtete Probleme:**
    1. Obwohl `cs/svelte/work` für Desktop- und Laptop-Apps ausgelegt ist (wie z. B. der präsente `48px` hohe `WorkAppHeader`), generiert die KI UIs, Texte und Labels oft viel zu klein und zu gedrängt.
    2. Layouts wirken häufig zu überfüllt und verschachtelt.
- **Maßnahmen für Design-Rules / Agent-Prompts:**
    - [ ] Großzügigere Desktop-Proportionen sowie größere, angenehmere Text- und Label-Größen einfordern.
    - [ ] Weniger verschachtelte, überladene Layouts — stattdessen klare vertikale Struktur (von oben nach unten), Unterviews, saubere Menüs sowie konsistente Abstände und Alignments.

---

## 13. Zustandswechselnde Buttons (`tertiary` → `secondary`)

- **Beobachtetes Problem:**  
  Buttons wechseln beim Klick hart von `variant="tertiary"` auf `variant="secondary"`.
- **Maßnahmen für Rules / Agent-Prompts:**
    - [ ] Für echte Toggle-Zustände `ToggleButton` nutzen — oder, falls `ToggleButton` optisch nicht passt, den Variantenwechsel mindestens über `ButtonMorph` animieren.

---

## 14. Übermäßige rote `ghost`-Trash-Buttons (`negative`)

- **Beobachtetes Problem:**  
  Viele kleine icon-only Trash-Buttons als `ghost` wirken im UI wie leuchtend rote Flecken und erzeugen visuelle Unruhe.
- **Maßnahmen für `cs` / Design-Rules:**
    - [ ] Weniger direkte Lösch-Aktionen offen im Layout platzieren; destruktive Aktionen häufiger in Unter-/Kontextmenüs kapseln.
    - [ ] Prüfen, ob eine ruhigere `negative`-Button-Variante (im Ruhezustand neutral, erst bei `:hover` / `:focus-visible` rot/`negative`) sinnvoll ist.

---

## 15. `WorkAppSignature`: Clicks auf dem Info-Icon blockieren

- **Beobachtetes Problem:**  
  Das Info-Icon öffnet die Signatur per Hover-Tooltip und hat keine Click-Aktion; ein Klick darauf lässt den Tooltip verschwinden / wirkt störend.
- **Maßnahmen für `cs/svelte/work`:**
    - [ ] Clicks auf dem Info-Icon abfangen/blockieren, während Hover-Events für den Tooltip weiterhin sauber durchkommen.

---

## 16. Kurze Button-Labels & keine Layout-Shifts bei dynamischen Switchern

- **Beobachtete Probleme:**
    1. Überlange Button-Labels (z. B. Location-Icon + `"Neumarkt · Presse 1"` + Chevron) sehen in Buttons unruhig/schlecht aus.
    2. Dynamische Switcher (z. B. Tag-Switcher) verändern je nach Text-/Buchstabenbreite ihre Breite und verursachen Layout-Shifts.
- **Maßnahmen für Design-Rules / Agent-Prompts:**
    - [ ] Kurze, prägnante Button-Labels verbindlich vorgeben.
    - [ ] Bei dynamischen Switchern feste Breiten, `min-width` oder `tabular-nums` vorschreiben, um Layout-Shifts zu vermeiden.

---

## 17. Template-Design-Workflow: Mehrstufige Design-Agenten & Visueller Layout-Blueprint (`lab/` / Wireframe-Phase)

- **Beobachtetes Problem:**  
  `design-critic` funktioniert gut für fokussierte Einzelkomponenten, hat aber beim gesamten **App-Layout** alleine nicht ausgereicht (Überladung, fehlende Makro-Struktur und Proportionen).
- **Zu prüfendes Konzept für `template/` (Abwägung gegen Agent-Bloat):**
  Statt einem einzelnen Design-Agenten eine klar getrennte **3-stufige Design-Pipeline** evaluieren:
    1. **UX- & Info-Architektur-Agent:** Plant konzeptionell, was direkt sichtbar sein muss, was hinter Menüs/Popovers verschwindet (Progressive Disclosure), welche Subviews nötig sind, wie die Top-Down-Anordnung aussieht, welche konsistenten Größenstufen gelten und welche `cs`-Komponenten passen (vs. welche optisch „off“ wären).
    2. **Layout-Blueprint / Wireframe-Agent (visuelle Vorab-Prüfung):** Baut auf Basis des Konzepts ein reines **Layout-Gerüst** in einem eigenen Bereich (z. B. `lab/`-Subroute mit dedizierten, leichtgewichtigen Mock-/Blueprint-Komponenten für Container, Flächen und Maße) — ohne Business-Logik, höchstens mit minimalem Subview-Wechsel. Ziel: Das Grundlayout, die Proportionen und Abstände visuell im Browser beurteilen und freigeben können, _bevor_ echte Komponenten und Logik verdrahtet werden.
    3. **Component- & Detail-Critic (`design-critic`):** Verfeinert nach Layout-Freigabe die konkreten Komponenten, Hierarchien, Abstände und Details.
- **Strenge Archetypen-Vorgabe (Idee):** Fest definierte **Layout-Archetypen** vorgeben (z. B. Master-Detail, Workbench, Fokus-Board, Listen-/Tabellen-Ansicht etc.), auf die der Blueprint-/Wireframe-Agent zwingend beschränkt wird — statt jedes App-Layout frei „von Null auf“ neu zu erfinden.

---

## 18. Golden Templates / Referenzen in `cs` (`src/references/`)

- **Idee:**  
  Direkt in der `cs`-Library (z. B. unter `src/references/`) eine kleine, streng kuratierte Sammlung an **Golden Templates / Referenz-Ansichten** ablegen — nicht zu viele und nicht zu kleinteilig, sondern qualitativ optimierte, größere Layout-/Ansichts-Kompositionen inklusive reduziertem Referenz-Code.
- **Extraktion aus bestehenden Apps (Workflow-Idee):**  
  Ein Agent kann gezielt bestehende Anwendungen analysieren, bei denen einzelne Ansichten oder Muster besonders gut gelungen sind, diese in strukturierte Layout-Sprache („was macht das Layout gut?“) + sauberen `cs`-Referenzcode übersetzen und als Referenz in `src/references/` ablegen, sodass Design-/Blueprint-Agenten darauf aufbauen können.
