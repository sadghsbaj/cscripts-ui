# Scratch – Struktur, Architektur & Roadmap

> Bestandsaufnahme der aktuellen Schmerzpunkte in `cscripts-ui`, konkrete Optionen mit Pro/Contra, Empfehlungen und ein Mini-Plan für die nächsten Schritte.

---

## 1. Dokumentation & `src/agents/`-Struktur

### Problem
- Component-Kommentare (`<!-- @component ... -->`) sind teilweise uneinheitlich oder unvollständig.
- `src/agents/` vermischt generische Grundlagen (CSS, UnoCSS, Code-Style) mit Detailwissen, was schwer zu pflegen ist und leicht veraltet.
- `README.md` ist veraltet (zeigt z. B. noch `cs/svelte/components` statt `cs/svelte/<primitive>`).
- Langfristig soll die Library sowohl für dich als auch für Agents (ggf. über einen eigenen Docs-MCP) zuverlässig und ohne Halluzinationen nutzbar sein.

### Optionen
1. **Alles in `src/agents/` zentral pflegen**
   - *Pro:* Eine zentrale Stelle.
   - *Contra:* Hoher Pflegeaufwand, doppelte Wahrheit zwischen Code und Markdown, skaliert schlecht bei vielen Primitives.
2. **`src/agents/` radikal auf Basisregeln kürzen + strukturiertes Doku-System direkt an jedem Primitive**
   - *Pro:* Single Source of Truth direkt beim Code; `src/agents/` bleibt klein und stabil (Design-System, CSS-Foundation, UnoCSS, Code-Style, Svelte-Basics); maschinenlesbare Struktur pro Primitive ermöglicht später problemlos einen Docs-MCP.
   - *Contra:* Erfordert einmalig ein festes Doku-Schema (z. B. einheitliche `@component`-Sektionen oder `DOCS.md` pro Primitive + optionales `#`-Tagging/Git-Hash-Abgleich für Aktualität).

### Empfehlung
**Option 2.** `src/agents/` auf generische Basisregeln verschlanken. Jedes Primitive/Attachment bekommt ein knappes, einheitliches Doku-Format direkt im Ordner (oder im `@component`-Header mit festen `#`-Sektionen wie `# API`, `# Tokens`, `# Notes`), das per ESLint/Script prüfbar ist und später direkt von einem MCP ausgeliefert werden kann.

---

## 2. Sub-Agents & Workflow (Antigravity CLI / `.agents/` + MCPs)

### Problem
- Allein auf Konsistenz, fehlende Doku, Animation-Timings oder kleine optische Details (z. B. `1px` Top-Highlight / Lichtkante bei Solid-Accent) zu achten, bremst aus und führt zwangsläufig zu Drift.
- Gleichzeitig soll **nicht** alles blind von Agents gecodet werden – Optik, Motion und Design-Entscheidungen bleiben bei dir.

### Optionen
1. **Nur mit einem allgemeinen Agent arbeiten + manuell gegenlesen**
   - *Pro:* Kein Setup-Aufwand.
   - *Contra:* Kontext bläht sich auf, Review-Checklisten werden vergessen.
2. **Spezialisierte lokale Sub-Agents (`.agents/` in `cscripts-ui` und `template/`) + gezielte ESLint-Regeln**
   - *Pro:* Du baust/designst mit dem Haupt-Agent (Orchestrator); spezialisierte Sub-Agents übernehmen die „Bürokratie“:
     - **Consistency-Reviewer:** Prüft neue/geänderte Components gegen bestehende Patterns (Lichtkanten, Schatten, Größenverhältnisse, Transition-Dauern, Prop-Naming).
     - **Docs-Agent:** Aktualisiert Doku-Header / `README.md` nach API-Änderungen.
     - **Template-Sync / Consumer-Agent (im `template/`):** Kennt nur die öffentliche API + Basis-Agents.
   - *Contra:* Initiales Prompt-Tuning nötig; Agents müssen auf das Naming-Dictionary und feste Checklisten verweisen können.

### Empfehlung
**Option 2**, aber schlank starten: Erst **2 Sub-Agents** (`consistency-reviewer` und `docs-maintainer`) plus harte Invarianten weiter in `src/eslint/rules/` abbilden (was ein Linter deterministisch prüfen kann, braucht keinen Agent).

---

## 3. Design-System: Skalen, Statusfarben & visuelle Abstimmung

### 3a. Größenskalen (`size`)
- **Problem:** Aktuell zwei konkurrierende Skalen + Bedeutungen:
  - `xs..xl`: `Button`, `ToggleButton`, `Checkbox`, `CloseButton` (wobei `CloseButton md` = `32px` so groß ist wie `Button sm` = `32px`).
  - `sm..lg`: `ScrollFade`, `ScrollArea`, `BackgroundPattern`, `HitArea`.
  - `content | anchor | min-anchor`: `Popover` (belegt ebenfalls den Prop-Namen `size`, meint aber Breite statt T-Shirt-Größe).
- **Optionen:**
  1. Alle UI-Controls strikt auf `xs..xl` angleichen (auch `CloseButton`-Pixelwerte anpassen, kleinere Varianten ggf. über `2xs`).
  2. Bewusst zwei getrennte Konzepte definieren: **Control-Sizes (`xs..xl`)** mit einheitlicher Höhenmatrix vs. **Modifier/Effect-Sizes (`sm..lg`)** – und bei `Popover` `size` eher in `width` umbenennen.
- **Empfehlung:** **Option 2.** Einmal eine verbindliche Größen-Tabelle festlegen (welche Pixelhöhe hat `xs..xl` bei Buttons vs. kompakten Controls wie Checkbox/CloseButton) und `Popover.size` von T-Shirt-Größen entkoppeln (`width`).

### 3b. Color-Scheme (bereits geklärt)
- **Entscheidung festhalten:** Kein Dual-System (Neutral vs. Accent). Bewusst nur auf **Accent** standardisieren (wie in `Checkbox` und `Button` bereits umgesetzt).

### 3c. Statusfarben-Benennung
- **Problem:** `src/css/foundation/color-semantics.css` nutzt `success`, `warning`, `danger`, `info`. Bei `Checkbox invalid` auf `--cs-color-danger-*` zu mappen fühlt sich semantisch schief an. `info` wird praktisch nicht gebraucht.
- **Optionen:**
  1. Alles bei `success / warning / danger / info` belassen.
  2. Umbenennen auf neutrale Polaritäten: **`positive`**, **`caution`**, **`negative`** und **`info` komplett entfernen**.
- **Empfehlung:** **Option 2.** `positive / caution / negative` passt sauber sowohl auf Actions (`Button`) als auch auf States (`Checkbox invalid`, Badges, Alerts) und reduziert den Token-Ballast.

### 3d. Visuelle & Motion-Konsistenz
- **Problem:** Kleine Abweichungen bei Lichtkanten (`--cs-shadow-solid`), Rahmen, Größenverhältnissen und Transition-Dauern (z. B. 180ms vs. 200ms) schleichen sich über Zeit ein.
- **Empfehlung:** Gemeinsame CSS-Tokens für Transition-Dauern/Easings (`--cs-duration-*` in `motion.css`) konsequent nutzen und in der Consistency-Agent-Checkliste verankern.

---

## 4. Architektur: Vanilla/CSS-First + Attachments vs. React-Aria-Abstraktion (`$bindable`, `data-*`)

### Problem
- Der aktuelle Vanilla-Approach (native Elemente, CSS `:hover`/`:active`, Attachments statt `$bindable` für DOM-Refs) ist schnell, klein und funktioniert sehr gut.
- Unklarheit vor komplexeren Components (z. B. `Switch`, `Select`, `Tabs`):
  1. Soll man jetzt schon States als `data-hovered`, `data-pressed`, `data-focus-visible` abstrahieren (wie React Aria), um später einheitlicher zu sein?
  2. Wann `$bindable` vs. Attachment?

### Optionen
1. **Voll auf React-Aria-Muster umbauen (`data-hovered`, `data-pressed`, Interaction-Hooks überall)**
   - *Pro:* Einheitliches Styling unabhängig vom nativen Element; löst Touch-Sticky-Hover und Compound-Trigger.
   - *Contra:* Viel JS-Boilerplate und Event-Listener-Overhead für simple Components; genau das „Over-Engineering“, das du vermeiden willst.
2. **Reiner Vanilla-Ansatz bleibt Standard; Abstraktion nur gezielt bei Bedarf**
   - *Pro:* Minimaler Code, native Browser-Semantik, maximale Geschwindigkeit beim Bauen.
   - *Contra:* Wenn später ein komplexes Primitive doch JS-Interaction-State braucht, nutzt es lokal `data-pressed`/`data-hovered`.
- **Zum Thema `$bindable` vs. Attachments:**
  - *DOM-Referenzen:* Weiterhin **Attachments** (`{@attach ...}`) statt `bind:this`/$bindable-Ref-Durchreichung – passt perfekt zu Svelte 5.
  - *Component-State (`checked`, `pressed`, `open`):* **`$bindable()`** gezielt für kontrollierbaren UI-State nutzen (wie bei `Checkbox`).

### Empfehlung
**Option 2.** Kein präventiver React-Aria-Refactor. Native CSS-Pseudo-Klassen (`:hover`, `:active`, `:focus-visible`) bleiben Standard. `data-hovered` / `data-pressed` nur dann lokal einführen, wenn CSS allein nicht reicht (z. B. Custom-Pointer-Logik oder verschachtelte Trigger).

---

## 5. Naming-Dictionary & Konventionen

### Problem
- Ohne verbindliche Benennungsregeln entstehen schleichend Inkonsistenzen bei CSS-Variablen, Klassen, `data-*`-Attributen, Props, Datei- und Ordnernamen.

### Optionen
1. Implizit aus bestehendem Code ableiten.
2. Ein kurzes, verbindliches **`NAMING.md`** (max. 1–2 Seiten) als Referenz für dich und alle Agents anlegen:
   - CSS-Tokens (`--cs-<kategorie>-<name>`) vs. lokale Component-Vars (`--_name`)
   - Klassen (`.cs-<primitive>`, Subparts `.cs-<primitive>-<part>`)
   - `data-*`-Attribute (Boolean als `data-foo={foo ? "" : undefined}`, Enums als `data-size={size}`)
   - Prop-Namen (`size`, `variant`, `invalid`, `disabled`, `as`)
   - Datei-/Ordner-Konventionen (`kebab-case` Ordner, `PascalCase.svelte`, `*.attach.ts`)

### Empfehlung
**Option 2.** Ein knappes Dictionary spart bei jeder neuen Component und jedem Agent-Prompt Diskussionen.

---

## 6. Konkrete Duplizierungen, API-Drift & Altlasten

1. **`ButtonIcon` / `ToggleButtonIcon` & `ButtonLabel` / `ToggleButtonLabel`**
   - *Problem:* Praktisch 1:1 dupliziert.
   - *Optionen:* (a) Gemeinsame CSS-Klassen in `src/css` oder shared internal Helper; (b) `ToggleButton` nutzt intern die `Button`-Subcomponents mit.
   - *Empfehlung:* Shared Styles/Helper extrahieren, öffentliche Exports aber nur zusammenlegen, wenn es sich in der Nutzung sauber anfühlt.
2. **`ButtonGroup` vs. `ToggleButtonGroup`**
   - *Problem:* Laufen auseinander (`ghost` `--_inner-radius: 4px` und `color-mix()`-Separator fehlen bei `ToggleButtonGroup`).
   - *Empfehlung:* Gemeinsame Group-CSS-Basis für Radius-, Separator- und HitArea-Logik.
3. **`CopyIcon` & `PasteIcon`**
   - *Problem:* Identisches Sparkle-Markup & CSS in beiden Icons.
   - *Empfehlung:* Kleines internes `<SparkleParticles />` (oder shared CSS) extrahieren.
4. **`ToggleButton`: `value` ohne `ToggleButtonGroup`**
   - *Problem:* `ToggleButtonStateProps` verbietet `pressed`, sobald `value` gesetzt ist.
   - *Empfehlung:* Entweder `ToggleButtonGroupItem` trennen oder `pressed` nur bei aktivem Group-Context verbieten/warnen.
5. **`Checkbox`: `hitAreaSize`-Prop leakt ins DOM**
   - *Problem:* In `CheckboxProps` definiert, in `Checkbox.svelte` nicht destructured → landet als `hitareasize="..."` auf `<input>`.
   - *Empfehlung:* Sauber entfernen (Checkbox hat bereits die `::before` Counter-Scale-Hit-Area) oder explizit unterstützen.
6. **Polymorphes `as` & `type="button"`**
   - *Problem:* `Button` erlaubt `as` + `type="submit"` via `{...rest}`, `ToggleButton`/`CloseButton` erzwingen `type="button"` nach `{...rest}`.
   - *Empfehlung:* `type="button"` bei `ToggleButton`/`CloseButton` *vor* `{...rest}` setzen; `as` nur ergänzen, wo wirklich nötig.

---

## 7. Attachment-Signaturen & Ordner-Mischmasch (`src/svelte/primitives/`)

### Problem
- **Signaturen:** `scrollLock` akzeptiert `boolean | (() => boolean)`, während `fadeMask`, `scrollFade` und `clickOutside` nur `boolean` akzeptieren (oder teils inkonsistente Options-Objekte haben).
- **Ordnerstruktur:** UI-Components, reine DOM-Attachments (`click-outside`, `focus`, `fade-mask`, `scroll-fade`, `scroll-lock`) und JS-Utilities (`browser-storage`) liegen alle unter `src/svelte/primitives/`. Manche Dinge (z. B. `hit-area` oder `overlay`) sind aber Hybride aus Component + CSS/Attachment.

### Optionen
1. **Hart trennen** in `primitives/`, `attachments/`, `utils/`.
   - *Pro:* Aufgeräumte Ordner.
   - *Contra:* Unflexibel bei Hybriden; bricht `cs/svelte/*`-Imports (oder erfordert komplexere `package.json`-Exports).
2. **`src/svelte/primitives/` als flachen Export-Namespace behalten, aber intern/konzeptionell sauber klassifizieren + Signaturen vereinheitlichen**
   - *Pro:* Maximale Flexibilität für Hybride, keine Breaking Changes bei Imports (`cs/svelte/<name>`).
   - *Contra:* Ordnerliste wächst weiter (lässt sich aber durch Namenskonventionen / Doku-Typ `type: component | attachment | hybrid | util` abfedern).

### Empfehlung
**Option 2** (oder maximal reine JS-Utils wie `browser-storage` auslagern). Wichtiger als die Ordner-Trennung ist die **einheitliche Attachment-Signatur**: kleiner Helper `resolveGetter(val)` für `boolean | (() => boolean)` und einheitliche Parameter-Struktur (z. B. immer `(options?: ...)` oder `(target, options)` nach festem Muster).

---

## 8. Mini-Plan: Wie wir jetzt vorgehen

### Phase 0 – Offene Fragen klären (vor jeder Code-Änderung)
1. **Statusfarben:** `positive / caution / negative` (ohne `info`) final absegnen?
2. **Größenskala:** Darf `CloseButton` in seinen Pixelwerten an `Button` angepasst werden (oder eigene dokumentierte Compact-Skala)? Und `Popover.size` → `Popover.width`?
3. **Doku-Format:** Einheitlicher `@component`-Header mit festen `#`-Sektionen direkt in den Dateien oder jeweils eine kleine `README.md`/`DOCS.md` pro Primitive?
4. **Sub-Agents:** Welche Rollen willst du direkt in `.agents/` haben (Vorschlag: `consistency-reviewer` + `docs-maintainer`)?

### Phase 1 – Fundament & Dictionary festlegen (kein Refactor, nur Regeln)
1. Kurzes **`NAMING.md`** erstellen (Tokens, Klassen, `data-*`, Props, Attachments, Dateien).
2. **`src/agents/`** auf generische Basisregeln kürzen (keine Primitive-Details mehr dort).
3. Doku-Template für Primitives & Attachments definieren.

### Phase 2 – Bestehendes glattziehen (kleine, sichere Schritte)
1. **Quick-Fixes / Altlasten:** `Checkbox` (`hitAreaSize`), `README.md` Imports, `ToggleButton`/`CloseButton` `type="button"` Reihenfolge.
2. **Design-Tokens:** Statusfarben auf `positive / caution / negative` umstellen (`info` raus); `motion.css` Timings prüfen.
3. **Duplizierungen & Signaturen:** `ButtonGroup`/`ToggleButtonGroup`, `CopyIcon`/`PasteIcon`, `resolveGetter` für alle Attachments.
4. **Doku-Sync:** Alle bestehenden Primitives/Attachments auf das neue Doku-Format bringen.

### Phase 3 – Agent-Tooling & Skalierung
1. `.agents/` Sub-Agents in `cscripts-ui` (und `template/`) anlegen und am nächsten neuen Primitive (z. B. `Switch`) testen.
2. Wiederkehrende Checks, die deterministisch sind, als ESLint-Regeln in `src/eslint/rules/` ergänzen.
3. *Optional später:* Kleinen Docs-MCP auf Basis des strukturierten Doku-Formats bauen.
