Referenz-Implementierung: [`src/lib/Toaster.svelte`](src/lib/Toaster.svelte)

---

## 1. Grundprinzip

Alle Toasts liegen `position: absolute; bottom: 0; right: 0;` innerhalb eines fixierten `<ol>`-Containers (`position: fixed; bottom: 24px; right: 24px; width: 356px;`).

Statt `top`/`bottom`-Werte zu animieren, wird **alles** über `transform`, `opacity` und `height` animiert und über CSS Custom Properties gesteuert:

```css
transition:
    transform 350ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 350ms cubic-bezier(0.16, 1, 0.3, 1),
    height 350ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 200ms;
```

- **Kurve:** `cubic-bezier(0.16, 1, 0.3, 1)` (schneller Antritt, weiches Auslaufen – deutlich knackiger als Standard-`ease`).
- **Dauer:** `350ms` (auch als `setTimeout`-Dauer vor dem endgültigen Entfernen aus dem DOM).

---

## 2. Die 4 Animationsphasen & Berechnungen

Konstanten:

- `GAP = 14` (`--gap: 14px`)
- `VISIBLE_TOASTS = 3` (ältere Toasts bekommen `data-visible="false"` → `opacity: 0; pointer-events: none;`)

### A) Enter (Reinkommen)

1. Ausgangszustand (`data-mounted="false"`): `--y: translateY(100%); opacity: 0;`
2. Nach dem ersten gerenderten Frame (`data-mounted="true"`): `--y: translateY(0); opacity: 1;`

### B) Stacking (Eingeklappt, `data-expanded="false"`)

Der neueste Toast hat `index = 0` (`data-front="true"`). Alle dahinter (`data-front="false"`) werden gestapelt:

- **Skalierung:** `scale = 1 - index * 0.05` (pro Stufe 5 % kleiner)
- **Versatz nach oben:** `y = -1 * gap * index` (`--lift: -1`, `--lift-amount: calc(var(--lift) * var(--gap))`)
- **Höhe:** Alle hinteren Toasts übernehmen `height: var(--front-toast-height)`, damit der Stapel bündig abschließt.
- **Inhalt:** Innerer Content der hinteren Toasts wird ausgeblendet (`opacity: 0`, `transition: opacity 400ms`).

```css
.sonner-toast[data-expanded="false"][data-front="false"] {
    --scale: calc(1 - var(--toasts-before) * 0.05);
    --y: translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(var(--scale));
    height: var(--front-toast-height);
}
```

### C) Hover-Expansion (`data-expanded="true"`)

Beim `mouseenter` auf den `<ol>`-Container:

- Jeder Toast bekommt seine eigene gemessene Höhe zurück: `height: var(--initial-height)`.
- Der vertikale Versatz ist die Summe aller Höhen + Gaps der Toasts davor:

```ts
function getOffset(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
        offset += (heights[toasts[i].id] ?? 0) + GAP;
    }
    return offset;
}
```

```css
.sonner-toast[data-mounted="true"][data-expanded="true"] {
    --y: translateY(calc(var(--lift) * var(--offset)));
    height: var(--initial-height);
}
```

### D) Exit & Swipe-to-Dismiss

- **Normaler Exit (`data-removed="true"`):** Toast fährt nach unten/oben weg (`opacity: 0`), nach `350ms` wird er aus dem State-Array entfernt.
- **Swipe-to-Dismiss:** Beim `pointerdown` / `pointermove` wird `transition: none` gesetzt und `translateY(var(--swipe-amount-y))` direkt per Pointer-Delta gesteuert. Ab `> 45px` nach unten greift die `swipe-out-down`-Keyframe-Animation (`200ms ease-out forwards`).

---

## 3. Kritische / Gefährliche Punkte (Fallstricke)

### 1. `frontToastHeight` darf beim neuen Toast nie auf `0` fallen

**Problem:** Wenn ein neuer Toast (`toasts[0]`) eingefügt wird, ist seine DOM-Höhe `heights[toasts[0].id]` im ersten Render-Frame noch `undefined`. Fällt `frontToastHeight` dadurch kurz auf `0px`, wird der bisherige vordere Toast (jetzt `data-front="false"`) für einen Frame auf `height: 0px` gestaucht und springt sichtbar nach unten.

**Lösung:** Immer auf die Höhe des vorherigen Front-Toasts zurückfallen:

```ts
let frontToastHeight = $derived(toasts.length > 0 ? (heights[toasts[0].id] ?? heights[toasts[1]?.id] ?? 0) : 0);
```

### 2. Doppeltes `requestAnimationFrame` beim Mounten

**Problem:** Ein einzelnes `requestAnimationFrame` kann feuern, bevor der Browser den Ausgangszustand (`translateY(100%)`, `opacity: 0`) tatsächlich gepaintet hat – dann wird die Enter-Transition übersprungen oder ruckelt.

**Lösung:** Doppeltes `requestAnimationFrame` in der Mount-Action:

```ts
const rect = node.getBoundingClientRect();
heights[id] = rect.height;

requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        toasts = toasts.map((t) => (t.id === id ? { ...t, mounted: true } : t));
    });
});
```

### 3. Unsichtbare Hover-Brücke zwischen ausgeklappten Toasts

**Problem:** Im ausgeklappten Zustand liegt zwischen zwei Toasts eine `14px`-Lücke (`--gap`). Bewegt man die Maus langsam von einem Toast zum nächsten, verlässt der Cursor kurz das Element und der Toaster klappt sofort wieder ein.

**Lösung:** Ein unsichtbares `::after`-Pseudo-Element füllt die Lücke:

```css
.sonner-toast[data-expanded="true"]::after {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 0;
    width: 100%;
    height: calc(var(--gap) + 1px);
}
```

### 4. Auto-Dismiss-Timer beim Hovern & Draggen pausieren

**Problem:** Läuft der `4000ms`-Timer weiter, während der Nutzer über den Stapel hovert oder zieht, verschwinden Toasts unter dem Mauszeiger.

**Lösung:** Pro Toast `remaining` und `start` speichern. Bei `expanded || interacting` alle aktiven Timeouts clearen und `remaining -= Date.now() - start` aktualisieren; danach mit `remaining` neu starten.
colin@fedora:~/Main/01_programming/99_temporary/sonner-svelte-self$
