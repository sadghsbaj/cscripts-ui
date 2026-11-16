# `cs` Library-, Template- & Agent-Learnings (PoC: Schicht- & Anlagen-Übergabe-Board)

> **Kontext:** Konkrete Erkenntnisse und umsetzbare Checkliste aus der Umsetzung unseres ersten PoCs (**Schicht- & Anlagen-Übergabe-Board**) auf Basis von `cs` (`cs/svelte/work`, `cs/svelte/file-system`, `cs` UI-Primitives, UnoCSS & Svelte 5 Runes).  
> **Zielgruppe:** Weiterentwicklung von `cs`, Projekt-Template, Moduldokumentation (`*.docs.md`) und Agent-Prompts/Rules (`.agents/`).  
> **Status:** 12 Punkte umgesetzt (**#1–#7**, **#10–#11**, **#13**, **#15–#16**), **#8** gestrichen — offen/zurückgestellt: **#9**, **#12**, **#14**, **#17**, **#18**.

---

## Noch offen (zurückgestellt / später)

- [ ] **9. Design- & Agent-Prompts (`architect` / `design-critic` / dedizierter Design-Agent) *(Zurückgestellt (später))*:** Harte Leitplanken für Toolbar-Dichte-Budget, Progressive Disclosure, Button-Hierarchie, `SegmentedControl` vs. `ToggleButtonGroup` und Header-Abgrenzung schärfen
- [ ] **12. Desktop-first Proportionen, Typografie-Skala & Layout-Klarheit *(Zurückgestellt (später))*:** Großzügigere Text-/Label-Größen und weniger verschachtelte, klar strukturierte vertikale Layouts einfordern
- [ ] **14. Übermäßige rote `ghost`-Trash-Buttons & ruhigere `negative`-Button-Variante *(Zurückgestellt (später))*:** Lösch-Aktionen häufiger in Unter-/Kontextmenüs kapseln und ruhigere `negative`-Variante (erst bei Hover/Focus rot) prüfen
- [ ] **17. Template-Design-Workflow (mehrstufige Design-Agenten, `lab/`-Wireframes, strenge Archetypen) *(Zurückgestellt (später))*:** Trennung von UX/IA-Planung, visuellem Layout-Blueprint (Wireframe-Route z. B. unter `lab/` mit Mock-Blueprint-Komponenten zur Vorab-Freigabe) und Detail-Review (`design-critic`) prüfen
- [ ] **18. Golden Templates / Referenzen (`src/references/`) *(Zurückgestellt (später))*:** Wenige, qualitativ hochwertige Referenz-Ansichten (Makro-Layouts + reduzierter Code) in `cs` pflegen und ggf. per Agent aus bestehenden Lieblings-Apps in Layout-Sprache extrahieren

---

### 9. Design-, Layout- & `ToggleButtonGroup`-Überladung (Agent-Schärfung) *(Zurückgestellt (später))*

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

### 12. Desktop-first Proportionen, Typografie-Skala & Layout-Klarheit (Design-Agenten) *(Zurückgestellt (später))*

- **Beobachtete Probleme:**
    1. Obwohl `cs/svelte/work` für Desktop- und Laptop-Apps ausgelegt ist (wie z. B. der präsente `48px` hohe `WorkAppHeader`), generiert die KI UIs, Texte und Labels oft viel zu klein und zu gedrängt.
    2. Layouts wirken häufig zu überfüllt und verschachtelt.
- **Maßnahmen für Design-Rules / Agent-Prompts:**
    - [ ] Großzügigere Desktop-Proportionen sowie größere, angenehmere Text- und Label-Größen einfordern.
    - [ ] Weniger verschachtelte, überladene Layouts — stattdessen klare vertikale Struktur (von oben nach unten), Unterviews, saubere Menüs sowie konsistente Abstände und Alignments.

---

### 14. Übermäßige rote `ghost`-Trash-Buttons (`negative`) *(Zurückgestellt (später))*

- **Beobachtetes Problem:**  
  Viele kleine icon-only Trash-Buttons als `ghost` wirken im UI wie leuchtend rote Flecken und erzeugen visuelle Unruhe.
- **Maßnahmen für `cs` / Design-Rules:**
    - [ ] Weniger direkte Lösch-Aktionen offen im Layout platzieren; destruktive Aktionen häufiger in Unter-/Kontextmenüs kapseln.
    - [ ] Prüfen, ob eine ruhigere `negative`-Button-Variante (im Ruhezustand neutral, erst bei `:hover` / `:focus-visible` rot/`negative`) sinnvoll ist.

---

### 17. Template-Design-Workflow: Mehrstufige Design-Agenten & Visueller Layout-Blueprint (`lab/` / Wireframe-Phase) *(Zurückgestellt (später))*

- **Beobachtetes Problem:**  
  `design-critic` funktioniert gut für fokussierte Einzelkomponenten, hat aber beim gesamten **App-Layout** alleine nicht ausgereicht (Überladung, fehlende Makro-Struktur und Proportionen).
- **Zu prüfendes Konzept für `template/` (Abwägung gegen Agent-Bloat):**
  Statt einem einzelnen Design-Agenten eine klar getrennte **3-stufige Design-Pipeline** evaluieren:
    1. **UX- & Info-Architektur-Agent:** Plant konzeptionell, was direkt sichtbar sein muss, was hinter Menüs/Popovers verschwindet (Progressive Disclosure), welche Subviews nötig sind, wie die Top-Down-Anordnung aussieht, welche konsistenten Größenstufen gelten und welche `cs`-Komponenten passen (vs. welche optisch „off“ wären).
    2. **Layout-Blueprint / Wireframe-Agent (visuelle Vorab-Prüfung):** Baut auf Basis des Konzepts ein reines **Layout-Gerüst** in einem eigenen Bereich (z. B. `lab/`-Subroute mit dedizierten, leichtgewichtigen Mock-/Blueprint-Komponenten für Container, Flächen und Maße) — ohne Business-Logik, höchstens mit minimalem Subview-Wechsel. Ziel: Das Grundlayout, die Proportionen und Abstände visuell im Browser beurteilen und freigeben können, _bevor_ echte Komponenten und Logik verdrahtet werden.
    3. **Component- & Detail-Critic (`design-critic`):** Verfeinert nach Layout-Freigabe die konkreten Komponenten, Hierarchien, Abstände und Details.
- **Strenge Archetypen-Vorgabe (Idee):** Fest definierte **Layout-Archetypen** vorgeben (z. B. Master-Detail, Workbench, Fokus-Board, Listen-/Tabellen-Ansicht etc.), auf die der Blueprint-/Wireframe-Agent zwingend beschränkt wird — statt jedes App-Layout frei „von Null auf“ neu zu erfinden.

---

### 18. Golden Templates / Referenzen in `cs` (`src/references/`) *(Zurückgestellt (später))*

- **Idee:**  
  Direkt in der `cs`-Library (z. B. unter `src/references/`) eine kleine, streng kuratierte Sammlung an **Golden Templates / Referenz-Ansichten** ablegen — nicht zu viele und nicht zu kleinteilig, sondern qualitativ optimierte, größere Layout-/Ansichts-Kompositionen inklusive reduziertem Referenz-Code.
- **Extraktion aus bestehenden Apps (Workflow-Idee):**  
  Ein Agent kann gezielt bestehende Anwendungen analysieren, bei denen einzelne Ansichten oder Muster besonders gut gelungen sind, diese in strukturierte Layout-Sprache („was macht das Layout gut?“) + sauberen `cs`-Referenzcode übersetzen und als Referenz in `src/references/` ablegen, sodass Design-/Blueprint-Agenten darauf aufbauen können.

---

## Erledigt / Gestrichen

- [x] **1. `WorkAppHeader` & `WorkAppStatusDot`:** Doku, `cs-work.md`, Tooltip-Fix
- [x] **2. `popoverTrigger`:** `triggerOn` als Pflichtoption + `popover.docs.md`
- [x] **3. `tsconfig.app.json`:** `"ESNext"` im Template
- [x] **4. Svelte 5 `$bindable()`:** Beibehalten + Doku, `cs-svelte.md`, `*Props`-JSDoc
- [x] **5. `Overlay` & `Modal`:** `overlay.docs.md` Hinweis auf `cs/svelte/focus`
- [x] **6. `cs/svelte/file-system`:** `health` vs. `activity` & `"restoring"` in `mountStatus`
- [x] **7. Dark Mode `--cs-shadow-floating` Split:** Eigener Token-Split statt `--cs-shadow-elevated` zu ändern
- [x] ~~**8. Architektur-Regeln (Colocation vs. `core/`)**~~ — *Gestrichen — passt wie sie ist*
- [x] **10. `SegmentedControl` `scale`-1px-Sprung:** `height: 100%` auf `.cs-segmented-control-item-content`
- [x] **11. Close-Button-Positionierung:** `cs-design-and-tokens.md` & `design-and-tokens.md`
- [x] **13. Zustandswechselnde Buttons:** `ToggleButton` / `ButtonMorph` in `cs-design-and-tokens.md`
- [x] **15. `WorkAppSignature`:** Info-Icon Click-Block (`WorkAppSignature.svelte`)
- [x] **16. Kurze Button-Labels & stabile Switcher:** `cs-design-and-tokens.md` & `design-and-tokens.md`

---

### 1. `WorkAppHeader` & `WorkAppStatusDot`: Höhe, Rolle & Tooltip

> **Hinweis vorab:** Das Hochformat (`40px × 48px`) beim `<WorkAppHeaderSegment align="before" renderIsland><WorkAppStatusDot /></WorkAppHeaderSegment>` ist **genau so gewollt** und wirkt im Header sauber — hier besteht kein Layout-Bug.

- **Beobachtete Probleme:**
    1. Benutzerdefinierte Header-Buttons mit Standardgröße (`<Button size="md">`) sind im Vergleich zu den `48px` hohen Work-Header-Elementen (`WorkAppToolIdentity`, `WorkAppBrand`, `WorkAppHelpButton`, `WorkAppThemeButton` mit `size="xl"`) deutlich zu niedrig.
    2. App-spezifische Business-Logik (z. B. `Werk · Linie`) wurde fälschlich in den `WorkAppHeader` platziert statt in den App-Inhaltsbereich.
    3. `WorkAppStatusDot` übergibt im Tooltip `WORK_APP_STATUS_DEFAULTS[status]` statt des übergebenen `label`-Props.
- **Umgesetzte Maßnahmen (`cs` / Doku / Rules):**
    - [x] In `app-layout.docs.md` und `.agents/rules/cs-work.md` klar dokumentiert, dass Header-Buttons `48px` Höhe (`size="xl"` bzw. `--cs-button-height: 48px`) benötigen.
    - [x] In `.agents/rules/cs-work.md` schärfer abgegrenzt: `WorkAppHeader` ist **ausschließlich für globale App-Elemente** gedacht (App-Name, Status, Hilfe, Theme, Brand). App-spezifische Navigation, Filter oder Kontexte (`Werk · Linie`) gehören in den Content-Bereich.
    - [x] In `WorkAppStatusDot.svelte` `displayLabel` an `tooltip(...)` übergeben, damit benutzerdefinierte `label`-Texte im Tooltip erscheinen.

---

### 2. `popoverTrigger`: `triggerOn` explizit machen

- **Beobachtetes Problem:**  
  `popoverTrigger` nutzte stillschweigend `triggerOn: "pointerdown"` als Default. Dadurch öffneten Standard-Button-Popovers in Header und Toolbar bereits beim Drücken, noch bevor der Klick abgeschlossen ist.
- **Umgesetzte Maßnahmen (`cs` / Doku):**
    - [x] Stillen `"pointerdown"`-Default entfernt — `triggerOn` als **pflichtige Option** verlangt.
    - [x] In `popover.docs.md` eine klare Entscheidungshilfe ergänzt, wann `"click"` vs. `"pointerdown"` sinnvoll ist.

---

### 3. `tsconfig.app.json`: `"ESNext"` im Template-Standard

- **Beobachtetes Problem:**  
  `svelte-check` brach bei Nutzung von `cs/svelte/file-system` mit Typfehlern in den Library-Interna ab (`Promise.withResolvers`, `Iterator.prototype.toArray`), wenn `"ESNext"` in `compilerOptions.lib` fehlte.
- **Umgesetzte Maßnahmen (Template):**
    - [x] In der Template-`tsconfig.app.json` standardmäßig `"lib": ["ESNext", "DOM", "DOM.Iterable"]` hinterlegt, damit `cs/svelte/file-system` out-of-the-box typsicher prüft.

---

### 4. Svelte 5 `$bindable()`-Falle (`ToggleButtonGroup`, `ToggleButton` etc.)

- **Beobachtetes Problem:**  
  Wird ein `$bindable()`-Prop ohne `bind:` als Ausdruck übergeben (z. B. `value={fn()}`), läuft `svelte-check` ohne Warnung durch. Beim Klick im Browser wirft Svelte 5 jedoch einen Laufzeitfehler, sobald die Komponente `value = next` mutiert.
- **Entscheidung & umgesetzte Maßnahmen:**
    - `$bindable()` wird bewusst beibehalten (keine Umstellung auf eine kontrollierte Non-`bind:`-API).
    - [x] In `.agents/rules/cs-svelte.md` sowie `*.docs.md` (`toggle-button-group.docs.md` und analoge Input-Docs) prominent auf `bind:value={getter, setter}` vs. `onValueChange` hingewiesen.
    - [x] `*Props`-JSDoc in den Komponenten entsprechend ergänzt.

---

### 5. `Overlay` vs. zukünftige `Modal`-Komponente

- **Beobachtetes Problem:**  
  `<Overlay>` nutzt `popover="manual"` für den Top Layer, setzt dabei aber weder automatisch den Fokus in den Dialog noch trappt es `Tab`.
- **Einordnung & umgesetzte Maßnahmen (Doku):**
    - `<Overlay>` ist bewusst als reines Top-Layer-Overlay ohne Focus-Trap konzipiert; eine eigene `Modal`-Komponente (die Focus-Trap und AutoFocus übernimmt) ist für später geplant.
    - [x] In `overlay.docs.md` ergänzt, dass `<Overlay>` bis zur Verfügbarkeit von `Modal` für Dialoge mit `cs/svelte/focus` (`focusTrap` / `autoFocus`) kombiniert werden soll.

---

### 6. `cs/svelte/file-system`: Nervöses `StatusDot`- & `WorkspaceGate`-Verhalten

- **Beobachtete Probleme:**
    1. `workspace.health` mappte jedes normale `isBusy` (Lesen, Schreiben, Restore) auf `"caution"` (Orange). Dadurch blitzte der `WorkAppStatusDot` bei jeder regulären Dateioperation nervös orange auf.
    2. `mountStatus` startete synchron mit `"unlinked"`, während `restore()` asynchron aus der IndexedDB lud. Beim Reload blitzte dadurch kurz das `WorkspaceGate` auf.
- **Umgesetzte Maßnahmen (`cs/svelte/file-system` / Doku):**
    - [x] `health` und `activity` sauber getrennt: `health` bildet nur echte Warnungen/Fehler ab, `activity` den regulären Lade-/Speicherzustand.
    - [x] Expliziten `"restoring"`-Zustand in `mountStatus` eingeführt, um den initialen `WorkspaceGate`-Flash beim Reload zu vermeiden.

---

### 7. Dark Mode Lichtkante (`--cs-shadow-floating` Split)

- **Beobachtetes Problem:**  
  Die Lichtkante von `elevated`-Flächen im Dark Mode war zu schwach ausgeprägt, sodass sich schwebende Elemente visuell zu wenig vom Untergrund abhoben.
- **Umgesetzte Maßnahmen (`cs` Tokens):**
    - [x] Statt `--cs-shadow-elevated` zu ändern, einen sauberen `--cs-shadow-floating`-Split eingeführt.

---

### ~~8. Architektur-Regeln (Colocation vs. `core/`)~~ *(Gestrichen)*

- **Status:** *Gestrichen — aktuelle Colocation-Regelung passt wie sie ist.*
- **Maßnahmen für Template / `.agents/rules/`:**
    - [x] ~~Colocation im Feature vs. `core/`-Abspaltung für kleine vs. größere Apps klarer abgrenzen.~~

---

### 10. `SegmentedControl`: 1px-Sprung am Ende der `scale`-Transition (Chromium)

- **Beobachtetes Problem:**  
  Beim Zurückwachsen von `.cs-segmented-control-item-content` (`scale: 0.95` → `1`) entstand am Ende der Transition in Chromium ein harter ~1px-Sprung.
- **Umgesetzte Maßnahmen:**
    - [x] `height: 100%` auf `.cs-segmented-control-item-content` gesetzt, um den 1px-Sprung zu beheben.

---

### 11. Close-Button-Positionierung in Cards, Modals & Overlays

- **Beobachtetes Problem:**  
  Design-Agenten alignen den Close-Button oft bündig mit dem Titel bzw. dem Titel-Padding, wodurch er optisch zu weit innen sitzt.
- **Umgesetzte Maßnahmen (Design-Rules):**
    - [x] In `cs-design-and-tokens.md` und `design-and-tokens.md` dokumentiert, dass ein Close-Button nicht starr in die Titel-Zeile gehört, sondern sauber am Rand (z. B. oben rechts) mit eigenem, knapperem Randabstand sitzt.

---

### 13. Zustandswechselnde Buttons (`tertiary` → `secondary`)

- **Beobachtetes Problem:**  
  Buttons wechselten beim Klick hart von `variant="tertiary"` auf `variant="secondary"`.
- **Umgesetzte Maßnahmen (Rules):**
    - [x] In `cs-design-and-tokens.md` festgehalten: Für echte Toggle-Zustände `ToggleButton` nutzen — oder, falls `ToggleButton` optisch nicht passt, den Variantenwechsel mindestens über `ButtonMorph` animieren.

---

### 15. `WorkAppSignature`: Clicks auf dem Info-Icon blockieren

- **Beobachtetes Problem:**  
  Das Info-Icon öffnet die Signatur per Hover-Tooltip und hat keine Click-Aktion; ein Klick darauf ließ den Tooltip verschwinden / wirkte störend.
- **Umgesetzte Maßnahmen (`cs/svelte/work`):**
    - [x] In `WorkAppSignature.svelte` Clicks auf dem Info-Icon abgefangen/blockiert, während Hover-Events für den Tooltip weiterhin sauber durchkommen.

---

### 16. Kurze Button-Labels & keine Layout-Shifts bei dynamischen Switchern

- **Beobachtete Probleme:**
    1. Überlange Button-Labels (z. B. Location-Icon + `"Neumarkt · Presse 1"` + Chevron) sehen in Buttons unruhig/schlecht aus.
    2. Dynamische Switcher (z. B. Tag-Switcher) verändern je nach Text-/Buchstabenbreite ihre Breite und verursachen Layout-Shifts.
- **Umgesetzte Maßnahmen (Design-Rules):**
    - [x] In `cs-design-and-tokens.md` und `design-and-tokens.md` kurze, prägnante Button-Labels verbindlich vorgegeben und bei dynamischen Switchern feste Breiten, `min-width` oder `tabular-nums` gegen Layout-Shifts vorgeschrieben.
