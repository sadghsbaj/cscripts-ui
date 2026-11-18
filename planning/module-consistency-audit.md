# Modul- & API-Konsistenz-Audit (`src/modules/`)

**Stand:** 2026-11-18  
**Scope:** Alle 39 Module unter `src/modules/` — **exklusive** `color`, `select`, `chip` und `chips` (noch in Arbeit).  
**Geprüft gegen:** `.agents/rules/` (`naming.md`, `architecture-and-apis.md`, `code-style.md`, `design-and-tokens.md`, `file-system-invariants.md`) sowie modulübergreifende API-Konsistenz.  
**Hinweis:** Es wurde **kein Code geändert**.

---

## Tooling-Status (Baseline)

- **`bun run typecheck` (`svelte-check`):** `0 errors` (9 Warnungen außerhalb von `src/modules/`, in `playground/PreviewView.svelte` und `src/shared/control-group/ControlGroupTestHost.internal.svelte`).
- **`bun run lint` (`eslint .`):** `1 error`, `0 warnings` (in `src/modules/focus/roving-focus.attach.ts:303`).

---

## 1. Hohe Schwere (Lint-, Struktur- & Boundary-Verstöße)

| #   | Modul                                     | Stelle                                                                                                                                                                                                                                                                                                                                                                  | Verstoß / Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Regel                                   |
| :-- | :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------- |
| 1   | `focus`                                   | [roving-focus.attach.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/focus/roving-focus.attach.ts#L303)                                                                                                                                                                                                                                            | **ESLint-Fehler (`unicorn/prefer-math-min-max`):** `currentIndex >= 0 ? currentIndex : 0` statt `Math.max(0, currentIndex)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `code-style.md`                         |
| 3   | `scroll-area`                             | [index.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/scroll-area/index.ts#L4-L28)                                                                                                                                                                                                                                                                | **Interner Typ in öffentlicher Barrel-API:** `index.ts` importiert `ScrollAreaManager` aus `./scroll-area-state.internal.svelte.ts` und exportiert `createContext<ScrollAreaManager>()`. Damit leakt ein `.internal.`-Typ in die öffentliche Signatur.                                                                                                                                                                                                                                                                                                                                     | `naming.md`, `architecture-and-apis.md` |
| 4   | `checkbox`, `switch`, `segmented-control` | [Checkbox.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/checkbox/Checkbox.svelte#L3), [Switch.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/switch/Switch.svelte#L3), [SegmentedControl.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/segmented-control/SegmentedControl.svelte#L5-L6) | **Cross-Module-Interna-Imports (Umgehung von `index.ts`):**<br>• `Checkbox.svelte` importiert aus `../checkbox-group/checkbox-group.context.ts` statt `../checkbox-group/index.ts`.<br>• `Switch.svelte` importiert aus `../switch-group/switch-group.context.ts` statt `../switch-group/index.ts`.<br>• `SegmentedControl.svelte` importiert direkt `../focus/roving-focus.attach.ts` und `../scroll-fade/scroll-fade.attach.ts` statt `../focus/index.ts` / `../scroll-fade/index.ts`.<br>Zum Vergleich: `ToggleButton.svelte` importiert sauber über `../toggle-button-group/index.ts`. | `architecture-and-apis.md`              |
| 5   | `theme`                                   | [theme.svelte.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/theme/theme.svelte.ts#L54-L58), [index.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/theme/index.ts#L2)                                                                                                                                                       | **Hartcodierte deutsche UI-Labels öffentlich exportiert:** `GERMAN_THEME_LABELS` (`"System"`, `"Hell"`, `"Dunkel"`) ist fest auf Deutsch und öffentlich exportiert, obwohl `THEME_LABELS` direkt darüber bereits `t({ de, en })` nutzt.                                                                                                                                                                                                                                                                                                                                                    | `code-style.md` (Localization)          |

---

## 2. Mittlere Schwere (Regelverstöße & API-Inkonsistenzen)

### 2.1 Inkonsistente `variant`/`size`-Defaults bei `*Close`- und Composite-Komponenten

- **Regel (`architecture-and-apis.md`):** `variant` und `size` dürfen keine Default-Werte haben.
- **Befund & Vergleich:**
    - [CardClose.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/card/CardClose.svelte#L12-L15): `variant` ist **Pflicht** (kein Default), `size` wird optional über `CardContext` abgeleitet.
    - [ModalClose.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/modal/ModalClose.svelte#L16): `variant = "soft"` (Default!), `size` wird über `ModalContext` abgeleitet.
- **Kontext:** Bei `ModalClose` und `ToastClose` ist ein Default ergonomisch nachvollziehbar (Voreinstellung in einem Overlay/Toast), aber die Inkonsistenz zu `CardClose` (wo `variant` Pflicht ist) sowie der direkte Verstoß gegen das Verbot von `variant`/`size`-Defaults fällt auf.

### 2.2 `rem` statt direkter `px`-Werte

- **Regel (`design-and-tokens.md`):** Direkte `px`-Werte verwenden, kein `rem`.
- **Befund:** [Overlay.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/overlay/Overlay.svelte#L156):
  `--cs-overlay-padding: clamp(1rem, 0.5rem + 2dvmin, 2rem);` → sollte `clamp(16px, 8px + 2dvmin, 32px)` sein.

### 2.4 Dictionary-Verstöße (`naming.md`)

- **`button-morph`:**
    - [button-morph-state.internal.svelte.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/button-morph/button-morph-state.internal.svelte.ts#L34) & [ButtonMorph.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/button-morph/ButtonMorph.svelte#L61-L63): Interface `ButtonMorphSurface` nutzt `background: string` statt `bg: string` (`background` ist im Dictionary verboten).
    - [button-morph-state.internal.svelte.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/button-morph/button-morph-state.internal.svelte.ts#L21): `INTERACTIVE_CHILD_Selector` mischt `UPPER_SNAKE_CASE` und `PascalCase`.
- **`segmented-control`:**
    - [SegmentedControlItem.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/segmented-control/SegmentedControlItem.svelte#L38): `data-state={isActive ? "active" : "inactive"}` nutzt `active` (im Dictionary verbotener Alias; z. B. `data-selected` oder `aria-checked`/`data-checked` wäre kanonischer).
- **`clipboard`:**
    - [index.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/clipboard/index.ts#L9-L52), [CopyIcon.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/clipboard/CopyIcon.svelte#L28), [PasteIcon.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/clipboard/PasteIcon.svelte#L31): Status `"error"`, Prop `error?: boolean` und DOM-Attribute `data-copy-error` / `data-paste-error` verstoßen gegen `naming.md` (`negative` statt `error`), während die CSS-Variablen intern bereits korrekt `--cs-copy-icon-fg-positive` / `--cs-copy-icon-fg-negative` heißen. (`onSuccess`/`onError` auf JS-Callbacks sind als Standard-Event-API hingegen vertretbar.)
- **`text-morph`:**
    - [index.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/text-morph/index.ts#L6): `CS_TEXT_MORPH_DURATION` nutzt `DURATION` statt `DUR` (`duration` in `TextMorphProps` ist hingegen durch das gewrappte `torph`-API begründet).

### 2.5 Hartcodierte Farbe & Disabled-Opacity in `checkbox`

- [Checkbox.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/checkbox/Checkbox.svelte#L371): `.cs-checkbox-icon { color: white; }` statt eines semantischen Tokens (z. B. `var(--cs-color-accent-solid-fg)`).
- [Checkbox.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/checkbox/Checkbox.svelte#L458-L460): `.cs-checkbox:disabled:is(:checked, :indeterminate) + .cs-checkbox-icon { opacity: 0.5; }` nutzt Opacity-Dimming statt `--cs-color-disabled-fg` (weil `disabled.css` nur das `<input>` trifft, nicht das Sibling-SVG).

### 2.6 Exportierte Arrow-Funktion statt `function`-Deklaration

- [theme.svelte.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/theme/theme.svelte.ts#L65): `export const isValidMode = (v: unknown): v is ThemeMode => ...` statt `export function isValidMode(v: unknown): v is ThemeMode` (`code-style.md`).

### 2.7 Duplizierte `:focus-visible`-Regeln in Modulen

- **Regel (`design-and-tokens.md`):** Globales `:focus-visible` aus `foundation/focus.css` nicht in Modulen duplizieren.
- **Befund:**
    - [SegmentedControlItem.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/segmented-control/SegmentedControlItem.svelte#L79-L82): `&:focus-visible { outline: 2px solid var(--cs-color-accent-solid); outline-offset: -1px; }` — obwohl `SegmentedControl.svelte` den vertikalen Clip-Bereich extra für den globalen Focus-Ring um `4px` erweitert.
    - [TextInputAction.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/text-input/TextInputAction.svelte#L121-L124): `&:focus-visible { outline: 2px solid var(--cs-color-accent-solid); outline-offset: 0; }` (mit `outline-offset: 0` vermutlich wegen des engen Action-Buttons im Input-Container motiviert).

### 2.8 Fehlende referenzierte Blueprint-Datei

- [.agents/rules/file-system-invariants.md](file:///home/Schaefer/Projects/03_others/cscripts-ui/.agents/rules/file-system-invariants.md#L15) verlangt vor Änderungen das Lesen von `src/modules/file-system/file-system.blueprint.md`, die Datei existiert in `src/modules/file-system/` jedoch nicht.

---

## 3. Niedrige Schwere (Kleinere Inkonsistenzen & Feinschliff)

| Modul                                                                                          | Stelle                                                                                                                                                                                                                                                                                                                                | Hinweis                                                                                                                                                                                                                                                                             |
| :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Context-Dateien** (`badge`, `toast`, `checkbox-group`, `switch-group`, `button-morph`, etc.) | `*.context.internal.ts` vs. `*.context.ts`                                                                                                                                                                                                                                                                                            | `badge` und `toast` markieren Context als `.internal.ts` und exportieren ihn nicht; `checkbox-group`, `switch-group`, `button-morph`, `card`, `modal`, `segmented-control`, `text-input` exportieren ihre Context-Helper öffentlich in `index.ts`. Einheitliche Linie würde helfen. |
| **Import-Endungen** (`clipboard`, `focus`, `tooltip`)                                          | [index.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/tooltip/index.ts#L7), [index.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/focus/index.ts#L1-L3), [copy-on-click.attach.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/clipboard/copy-on-click.attach.ts#L4) | Relative Imports/Exports ohne `.ts`-Endung (fast alle anderen Module nutzen explizit `.ts`).                                                                                                                                                                                        |
| `card`                                                                                         | [Card.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/card/Card.svelte#L108-L140), [CardOrnament.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/card/CardOrnament.svelte#L56)                                                                                                      | `--cs-card-close-size` nutzt `size` für eine `px`-Länge (`16px`/`24px`/`32px`); `--cs-card-ornament-color` nutzt `color` als Tint-Token.                                                                                                                                            |
| `checkbox`, `popover`                                                                          | [Checkbox.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/checkbox/Checkbox.svelte#L468), [Popover.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/popover/Popover.svelte#L252)                                                                                                     | `transition: none !important;` — funktioniert, könnte ggf. über Spezifität sauberer gelöst werden.                                                                                                                                                                                  |
| `scroll-area`                                                                                  | [ScrollArea.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/scroll-area/ScrollArea.svelte#L140-L251)                                                                                                                                                                                                         | Nutzt für Scrollbar-Transitionen teils rohe `ms`-Werte (`140ms`, `180ms`, `200ms`, `240ms`, `260ms`), obwohl exakt diese Tokens in `motion.css` (`--cs-dur-140` etc. / `--cs-dur-effect`) existieren.                                                                               |
| `switch`                                                                                       | [Switch.svelte](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/switch/Switch.svelte#L183-L191)                                                                                                                                                                                                                      | Checked-Track nutzt `--cs-shadow-solid`, setzt auf `:checked:active:not(:disabled)` aber kein `--cs-shadow-solid-active` (minor, da beim Switch der Thumb gleitet statt der Track einsinkt).                                                                                        |
| `theme`                                                                                        | [theme.svelte.ts](file:///home/Schaefer/Projects/03_others/cscripts-ui/src/modules/theme/theme.svelte.ts#L36)                                                                                                                                                                                                                         | JSDoc erwähnt noch veraltetes `setContext` / `getContext`.                                                                                                                                                                                                                          |

---

## 4. Kontextuell begründete Unterschiede (Kein Handlungsbedarf)

Diese Abweichungen von starren Checklisten sind technisch oder durch das Komponenten-Design sinnvoll begründet:

- **Fehlendes `ref = $bindable()` auf `*Icon`-Subkomponenten** (`BadgeIcon`, `ButtonIcon`, `SegmentedControlIcon`, `TextInputIcon`, `ToggleButtonIcon`, `TooltipIcon`): Rendern direkt `<Icon {...rest} />` (z. B. Lucide-Icons), die selbst kein `ref`-Prop anbieten.
- **`KbdSymbol.svelte` ohne `ref` / `{...rest}`:** Rendert ein Fragment aus mehreren Geschwister-Elementen; ein einzelnes Root-DOM-Element existiert nicht.
- **`Kbd` optionale `variant`/`size`:** Werden über `KbdGroup`-Context geerbt; fehlt der Context, wirft `Kbd.svelte` zur Laufzeit im `$effect.pre`.
- **`Button.svelte` `type` vor `{...rest}`:** `Button` ist polymorph (`as = "button" | "a" | "label"`) und erlaubt bewusst `type="submit"` über `{...rest}`.
- **`NumberStepperInput.svelte` Forwarding auf `<input>`:** Root ist `<label class="cs-number-stepper-input-shell">`, `ref`/`class`/`{...rest}` gehen auf `<input>`, da `NumberStepperInputProps extends HTMLInputAttributes`.
- **Cross-Module-CSS-Kopplung in `Modal.svelte` (`.cs-overlay`) und `CopyIcon`/`PasteIcon` (`.cs-button`, `.cs-toggle-button`):** Bewusste Integration für `@starting-style`-Popover-Transitions bzw. optisches Icon-Scaling in `iconOnly`-Buttons.
- **`TextArea` Größen `sm..lg` statt `xs..xl`:** Für mehrzeilige Textfelder ist `xs` nicht sinnvoll; `sm..lg` passt semantisch.
- **`Badge` & `ToggleButton` `variant × color` Matrix:** Status-Badges (`base`, `accent`, `positive`, `caution`, `negative`) und semantische Toggle-Buttons brauchen diese Kombination; keine willkürliche Matrix.
- **Lokale Motion-Timings in `button-morph`, `clipboard`, `progress`, `text-morph`:** Einmalige Choreografien (Particle-Bursts, SVG-Morphing, `torph`-JS-Controller) sind in `design-and-tokens.md` ausdrücklich erlaubt.
- **`tooltip.attach.svelte.ts` Dateiname:** Benötigt `.svelte.ts` wegen `$state(...)` im Attachment-Modul.
- **`toast.promise` (`success`/`error`) & `file-system` Log-Levels (`info`/`error`):** Standard-JS-APIs bzw. technisches Logging, keine UI-Farb-Tokens.

---

## 5. Komplett saubere Module (Ohne Regelverstoß)

Folgende **14 Module** erfüllen alle geprüften Regeln ohne Befund:

`auto-resize` · `background-pattern` · `browser-storage` · `checkbox-group` · `click-outside` · `fade-mask` · `hit-area` · `middle-click` · `number-morph` · `scroll-fade` · `scroll-lock` · `switch-group` · `text-area` · `toggle-button-group`
