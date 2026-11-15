# Checkbox Motion Blueprint

Verbindliche Spezifikation für alle 6 Zustandsübergänge von `<Checkbox />` (`unchecked`, `indeterminate`, `checked`).

## Zustands-Matrix (Alle 6 Übergänge)

| Von | Nach | Animationstyp | Exaktes Verhalten |
| :--- | :--- | :--- | :--- |
| **`unchecked`** | **`checked`** | **Draw (kein Morph)** | Checkmark wird wie gewohnt eingezeichnet (`140ms quart-out`, nach `40ms` Box-Lead-In). |
| **`checked`** | **`unchecked`** | **Exit (kein Morph)** | Icon-Container skaliert/blendet aus (`80ms effect`), Checkmark zieht zurück. |
| **`unchecked`** | **`indeterminate`** | **Center-Out Draw (kein Morph)** | **Niemals** vom Check-Icon aus morphen. Das `-` zeichnet sich sauber **aus der Mitte gleichzeitig nach links und rechts** heraus (`M12 12H5` und `M12 12H19`, `140ms quart-out`). |
| **`indeterminate`** | **`unchecked`** | **Outside-In Retract (kein Morph)** | Das `-` zieht sich sauber **von außen (links & rechts) zurück in die Mitte** (`stroke-dashoffset: 0 -> 1` auf `M12 12H5` und `M12 12H19`), während der Container ausblendet/skaliert. |
| **`indeterminate`** | **`checked`** | **Single-Path Morph** | Kontinuierlicher Morph der einen Linie von `(5,12)-(12,12)-(19,12)` zu `(4,12)-(9,17)-(20,6)` (`160ms quart-out`). Kein Opacity-Fade, kein Flash. |
| **`checked`** | **`indeterminate`** | **Single-Path Morph** | Kontinuierlicher Morph in Gegenrichtung von `(4,12)-(9,17)-(20,6)` zu `(5,12)-(12,12)-(19,12)` (`160ms quart-out`). Kein Opacity-Fade, kein Flash. |

## Wichtige Invarianten

1. **Strikte Trennung von Draw vs. Morph:**
   - Morphing findet **ausschließlich** zwischen `indeterminate <-> checked` statt.
   - Kommt man aus `unchecked`, darf **unter keinen Umständen** ein Zwischenzustand `checked` durchlaufen oder sichtbar werden (auch nicht für einen Tick/Microtask beim Klicken auf eine native Checkbox).
2. **Kein Crossfade bei `indeterminate <-> checked`:**
   - Beide Richtungen (`indeterminate -> checked` und `checked -> indeterminate`) nutzen denselben 3-Punkt-Morph-Pfad ohne Opacity-Überblendung.
3. **Outside-In Retract bei `indeterminate -> unchecked`:**
   - Weil `indeterminate <-> checked` komplett über den Morph-Pfad läuft, braucht der Basis-Dash keinen `40ms` Opacity-Cut mehr — beim Zurückgehen auf `unchecked` kann er sichtbar von außen nach innen in die Mitte zurücklaufen.
4. **Reduced Motion:**
   - Unter `prefers-reduced-motion: reduce` entfallen Morphing und Übergänge zugunsten eines sofortigen Snaps.
