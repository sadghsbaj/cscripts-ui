# Design Spec: ScrollArea Overshoot (Floating Tension Bumper)

## 1. Ziel & Visuelle Leitidee

Der Overshoot-Indikator soll dem User sofort und unmissverständlich signalisieren: *„Hier ist das Ende des Scrollbereichs“* — ohne dabei wie ein Fehlerzustand, ein Schmutzschleier oder eine hart abgeschnittene Grafik zu wirken.

Statt eines flächigen Radial-Glows an der Clip-Kante (der auf rahmenlosen Containern abgeschnitten wird und im Light Mode grau/schmutzig wirkt) nutzt `ScrollAreaOvershoot` einen **Floating Tension Bumper**: eine schmale, schwebende Spannungs-Kapsel leicht *innerhalb* der Kante, die bei Aufprall nach innen federt und beim Loslassen elastisch zurückschwingt.

### Design-Prinzipien
- **Keine Berührung der Clip-Kante:** Der Indikator schwebt eingerückt im Container (`5px` Abstand zur Außenkante) und berührt `overflow: hidden` niemals. Dadurch sieht er am Bildschirmrand exakt genauso sauber aus wie in einer frei schwebenden Box mitten im Layout.
- **Klar von der Scrollbar unterscheidbar:** Die Scrollbar ist ein flacher, solider Pill-Thumb; der Tension Bumper ist ein **leicht leuchtender, an den Enden weich auslaufender Impuls** mit zartem Halo.
- **Größenunabhängige Proportionen:** Über `container-type: size` auf dem Overshoot-Overlay skaliert der Bumper proportional zur tatsächlichen Container-Größe — egal ob `44px`-Horizontal-Strip oder `900px`-Panel.
- **Unveränderte Logik:** `ScrollAreaManager` (`overshootValues[edge]` von `0..1` in `scroll-area-state.internal.svelte.ts`) bleibt technisch identisch.

---

## 2. Geometrie & Container-Skalierung

Der Overlay-Wrapper `.cs-scroll-area-overshoot` erhält `container-type: size;` (bei `position: absolute; inset: 0; pointer-events: none;`). Da er absolut positioniert ist, beeinflusst `container-type: size` das Layout von `.cs-scroll-area` und `.cs-scroll-area-content` nicht.

### Abmessungen & Einrückung
| Achse | Dicke | Länge (proportional via `cqw` / `cqh`) | Abstand zur Kante (`inset`) |
| :--- | :--- | :--- | :--- |
| `top` / `bottom` | `3px` | `clamp(min(18px, 55cqw), 26cqw, 112px)` | `5px` |
| `left` / `right` | `3px` | `clamp(min(16px, 55cqh), 30cqh, 96px)` | `5px` |

**Warum das in jedem Container funktioniert:**
- **Großer Container (`1000px` breit):** `26cqw` wird bei `112px` gedeckelt — der Bumper wird nie zu einem riesigen Balken.
- **Schmale Sidebar (`160px` breit):** `26cqw` ergibt `~42px` — harmonisch zentriert, nicht überladen.
- **Sehr niedriger Horizontal-Container (`48px` hoch):** `30cqh` greift auf das Minimum (`16px` bzw. `min(16px, 55cqh)` für Extremfälle unter `30px`) — es entsteht eine präzise, kleine vertikale Kapsel statt eines gequetschten Flecks.

### Form & Auslauf
- `border-radius: var(--cs-radius-full);`
- `corner-shape: var(--cs-squircle-soft);`
- Zentrierung entlang der Kante (`left: 50%; translate: -50% ...` bzw. `top: 50%; translate: ... -50%`, oder via `margin: auto` + `inset` für saubere Trennung von Zentrierung und Animations-`translate`).
- **Tapered Look:** Statt einer harten, gleichförmigen Balken-Füllung läuft der Kern an den beiden Enden über einen `linear-gradient` weich aus (`transparent -> core 18%..82% -> transparent`). Das nimmt dem Element die „zweite Scrollbar“-Optik und lässt es wie gebündelte Spannung wirken.

---

## 3. Farb- & Kontrastkonzept (Light Mode vs. Dark Mode)

Die Farbe muss auf allen drei Flächen-Ebenen von `cscripts-ui` (`--cs-color-canvas`, `--cs-color-elevated`, `--cs-color-sunken`) sauber funktionieren, ohne im Light Mode dreckig zu werden.

### Dark Mode (Leuchtend & Kühl)
Knüpft an das bereits cleane „hell-weiße Leuchten“ an, bekommt aber durch den schmaleren Kern mehr Definition:
- **Kern (`--cs-scroll-area-overshoot-bg`):**
  `color-mix(in oklch, var(--cs-color-base-100) 72%, var(--cs-color-accent-400))`
- **Halo (`--cs-scroll-area-overshoot-halo`, via `filter: drop-shadow(...)` damit die Aura dem Tapered-Alpha-Verlauf folgt):**
  `drop-shadow(0 0 6px color-mix(in oklch, var(--cs-color-accent-400) 38%, transparent))`

### Light Mode (Sauberer Akzent statt Grauschleier)
Kein `base-800` (Dunkelgrau) mehr — stattdessen ein klarer, leicht abgedämpfter Accent-Ton mit zarter Licht-Aura:
- **Kern (`--cs-scroll-area-overshoot-bg`):**
  `color-mix(in oklch, var(--cs-color-accent-500) 76%, var(--cs-color-base-900) 6%)`
- **Halo (`--cs-scroll-area-overshoot-halo`, via `filter: drop-shadow(...)`):**
  `drop-shadow(0 0 5px color-mix(in oklch, var(--cs-color-accent-500) 28%, transparent))`

**Warum das im Light Mode sauber bleibt:**
Eine definierte `3px`-Linie in gedämpftem `accent` mit zartem Halo wird vom Auge als bewusstes UI-Feedback gelesen (ähnlich einem Fokus-/Aktions-Indikator) — niemals als grauer Schattenfleck auf weißem Papier.

---

## 4. Zusammenspiel mit Scrollbar & `scrollFade`

- **Z-Index-Hierarchie:** `.cs-scroll-area-overshoot` bleibt auf `z-index: 20`, die Scrollbar-Tracks liegen auf `z-index: 30`.
- **Überlappungs-Schutz:** Da der Bumper zentriert an der Kante sitzt und bei `overshoot` der Scrollbar-Thumb bereits ganz am Ende (unten/rechts) steht, begegnen sich Thumb und Bumper in der Regel nicht. Falls ein Container sehr klein ist und der Thumb bis in die Mitte reicht, bleibt der Thumb durch `z-index: 30` sauber im Vordergrund.
- **`scrollFade`-Kompatibilität:** Da `scrollFade` den *Inhalt* sanft ausblendet und der Bumper *über* dem ausgeblendeten Randbereich schwebt, entsteht sogar ein natürlicher Tiefeneffekt: Der Text/Inhalt taucht weich ab, und der Tension Bumper markiert präzise die elastische Grenze.

---

## 5. Motion & Taktile Physik

Aktuell sind Ein- und Ausblenden symmetrisch getimed. Für echtes „Aufprall“-Gefühl braucht der Bumper eine **asymmetrische Physik** (gesteuert über ein einfaches `data-active={value > 0 ? "" : undefined}` Attribut am `.cs-scroll-area-overshoot-edge`):

1. **Aufprall / Aktiv (`[data-active]`):**
   - **Timing:** Sehr direkt (`opacity 110ms var(--cs-ease-expo-out)`, `transform 150ms var(--cs-ease-expo-out)`).
   - **Bewegung:**
     - Entlang der Kante dehnt sich der Bumper von `0.5` auf `1.0` (`scale`).
     - Senkrecht zur Kante rückt er um bis zu `2.5px` nach innen (`translate`), sodass man den mechanischen Rückstoß spürt.
2. **Loslassen / Rebound (Rückkehr zu `0`):**
   - **Timing:** Weiches Ausfaden (`opacity 220ms var(--cs-ease-quad-out)`), kombiniert mit leicht federndem Zurückschwingen (`transform 280ms var(--cs-spring-snappy)`).
   - Dadurch schnappt der Bumper nicht einfach linear weg, sondern federt minimal und sehr edel in die Kante zurück.

### Beispiel-Mapping der CSS-Properties pro Edge

```css
/* Basis-Berechnung über --cs-scroll-area-overshoot (0..1) */
opacity: min(1, calc(var(--cs-scroll-area-overshoot, 0) * 1.15));

/* Beispiel top-Edge (zentriert via inset + margin: auto) */
/* Aufprall drückt 2.5px nach unten (+Y) und skaliert X von 0.5 -> 1 */
transform:
    translateY(calc(var(--cs-scroll-area-overshoot, 0) * 2.5px))
    scaleX(calc(0.5 + var(--cs-scroll-area-overshoot, 0) * 0.5))
    scaleY(calc(0.75 + var(--cs-scroll-area-overshoot, 0) * 0.25));
```

---

## 6. Checkliste für die Umsetzung

- [ ] `ScrollAreaOvershoot.internal.svelte`: `container-type: size` auf `.cs-scroll-area-overshoot` ergänzen.
- [ ] `data-active={value > 0 ? "" : undefined}` auf `.cs-scroll-area-overshoot-edge` setzen, um Enter- vs. Release-Transitions zu trennen.
- [ ] `inset` + `margin: auto` für die Kantenzentrierung nutzen, damit `transform` sauber für `translate` + `scale` frei bleibt.
- [ ] `prefers-reduced-motion`: Wird global über Foundation CSS abgedeckt (im Modul nicht duplizieren).
- [ ] In `ScrollArea.preview.svelte` in beiden Modes (Light & Dark) an allen 4 Varianten testen: Vertikal (`sm`/`md`/`lg`), flacher Horizontal-Strip, 2D-Grid (`both`) und eingebettet auf `canvas` vs. `elevated`.
