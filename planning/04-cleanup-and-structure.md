# 04 – Cleanup, Duplikate & Altlasten

Status: **In Abstimmung**

---

## A. Konkrete Bugs & API-Altlasten
1. **`Checkbox`: `hitAreaSize`-Prop leakt ins DOM**
   - `CheckboxProps` definiert `hitAreaSize`, `Checkbox.svelte` destructured es nicht → landet als `hitareasize="..."` auf `<input>`.
   - *Vorschlag:* Sauber entfernen (Checkbox hat bereits die `::before` Counter-Scale-Hit-Area) oder explizit abbilden.
2. **`ToggleButton`: `value` ohne `ToggleButtonGroup` unbrauchbar**
   - `ToggleButtonStateProps` verbietet `pressed`, sobald `value` gesetzt ist.
   - *Vorschlag:* Entweder `ToggleButtonGroupItem` als dünne Komponente trennen oder `pressed` außerhalb einer Group erlauben.
3. **`ToggleButton` / `CloseButton`: `type="button"`-Reihenfolge**
   - Steht nach `{...rest}` statt davor (wie bei `Button`).
   - *Vorschlag:* `type="button"` vor `{...rest}` setzen; `as`-Polymorphie nur ergänzen, wo wirklich nötig.
4. **`Popover.size` → `Popover.width`** (aus Thema 1).
5. **`README.md` veraltet:** Zeigt noch `cs/svelte/components` & `cs/svelte/attachments` → aktualisieren.

---

## B. Duplizierungen & Drift
1. **`ButtonIcon` / `ToggleButtonIcon` & `ButtonLabel` / `ToggleButtonLabel`**
   - Praktisch 1:1 kopiert.
   - *Vorschlag:* Gemeinsame CSS-Basis oder shared `.internal.`-Helper nutzen.
2. **`ButtonGroup` vs. `ToggleButtonGroup`**
   - Laufen auseinander (`ghost` `--_inner-radius: 4px` und `color-mix()`-Separator fehlen bei `ToggleButtonGroup`).
   - *Vorschlag:* Gemeinsame Group-CSS-Basis für Radius-, Separator- und HitArea-Logik.
3. **`CopyIcon` & `PasteIcon`**
   - Identisches Sparkle-Markup & CSS.
   - *Vorschlag:* In eine gemeinsame `sparkle.internal.svelte` (im `clipboard`-Modul) extrahieren.

---

## C. Strukturelle Umstellungen (aus Thema 1–3)
1. **Ordner & Suffixe:** `src/svelte/primitives/` → `src/svelte/modules/` (`package.json` anpassen); interne Dateien mit `.internal.` markieren.
2. **Doku & ESLint:** `<!-- @component -->` aus `.svelte` auslagern in `*.docs.md`; `src/eslint/rules/component-docs.ts` entsprechend umbauen.
3. **Previews & Docs-Bundle:** `playground/previews/` als `*.preview.svelte` co-located in die Module ziehen; prüfen, ob `dist/` + GitHub-Workflow entfallen können.
4. **Tokens & Vars:** Statusfarben auf `positive / caution / negative` (ohne `info`); `--_` schrittweise durch `--cs-<module>-*` ersetzen; `ref = $bindable()` bei Root-Components ergänzen.
5. **Attachments:** Signaturen einzeln durchgehen (`enabled?: boolean | (() => boolean)` via `resolveGetter`).
6. **Basis-Doku & Regeln:** `src/agents/` verschlanken, `.agents/rules/` + `AGENTS.md` + Sub-Agents anlegen, `Scratch.md` & `planning/` nach Umsetzung aufräumen.
