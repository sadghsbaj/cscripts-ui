# Technische Anforderungsanalyse: Generischer Excel-Adapter (`excel.md`)

Dieses Dokument extrahiert sämtliche im Projekt vorhandenen Anforderungen, Parsing-Mechanismen, Normalisierungsregeln, Strukturmuster und Schreib-/Roundtrip-Konzepte im Umgang mit Excel-Dateien (`.xlsx`). Alle Punkte sind **vollständig domänen- und geschäftslogik-agnostisch** formuliert, sodass sie direkt als Spezifikation für einen universellen Frontend-Excel-Adapter (z. B. auf Basis von ExcelJS) dienen können.

---

## 1. Datei-Einlesen & Arbeitsmappen-Auflösung (Workbook Level)

### 1.1 Binärer In-Memory-Import
- **Eingabeformate:** Einlesen von `.xlsx`-Dateien direkt im Browser aus einem `ArrayBuffer` oder `File`-Objekt.
- **Filterung auf Dateisystem-Ebene:** Automatisches Ignorieren von temporären Office-Sperrdateien (Dateinamen mit Präfix `~$`).
- **Metadaten-Extraktion beim Laden:** Auslesen von Zellwerten, gecachten Formelergebnissen sowie Zeilen-Metadaten (insbesondere Sichtbarkeitsstatus `hidden`), ohne unnötigen Overhead durch HTML-Rendering.

### 1.2 Tolerante Tabellenblatt-Auflösung (Sheet Resolution)
- **Priorisierte Kandidatenlisten (Alias-Auflösung):** Ein logisches Tabellenblatt wird nicht über einen einzelnen hartcodierten Namen gesucht, sondern über eine geordnete Liste möglicher Namen (z. B. englische/deutsche Varianten, Kurz-/Langformen).
- **Normalisierter Fallback-Vergleich:** Wird kein exakter Treffer gefunden, erfolgt ein zweiter Durchlauf über alle vorhandenen Blattnamen mit `trim()` und `toLowerCase()`.
- **Optionale Blätter (Graceful Degradation):** Fehlt ein Tabellenblatt komplett, wirft der Adapter keinen Fehler, sondern liefert eine typisierte, leere Standardstruktur zurück.

### 1.3 Transformation in ein 2D-Raster (`GridRow[]`)
- Umwandlung eines Arbeitsblatts in ein zeilenbasiertes 2D-Array mit expliziten Zeilen-Metadaten:
  - `rowIndex`: 1-basierter Original-Zeilenindex aus Excel.
  - `hidden`: `boolean` (aus den Zeilen-Metadaten des Blatts extrahiert).
  - `cells`: Array der Rohwerte (`unknown[]`) pro Spalte.
- **Erhalt der physischen Topologie:** Leere Zeilen (`blankRows: true`) und leere Zellen (`defval: null`) müssen im Raster zwingend erhalten bleiben, damit relative Zeilenabstände (Lookahead / Lookbehind) stabil funktionieren.

---

## 2. Zell-Normalisierung, Typ-Konvertierung & Fehlerfilterung (Cell Level)

### 2.1 Behandlung von Excel-Formelfehlern
- Zellen, deren String-Repräsentation mit `#` beginnt (wie `#REF!`, `#DIV/0!`, `#VALUE!`, `#N/A`, `#NAME?`, `#NUM!`), werden zentral abgefangen:
  - Bei Text-Extraktion (`cellToString`) werden sie zu `""` (leerer String) aufgelöst.
  - Bei Zahlen-Extraktion (`cellToNumber`) werden sie zu `null` aufgelöst.

### 2.2 Robuste Zahlen-Konvertierung (`cellToNumber` & Währungs-Parser)
- **Native Zahlen:** Akzeptiert nur endliche Zahlen (`Number.isFinite`), verwirft `NaN` und `±Infinity` als `null`.
- **String-basierte Zahlen:**
  - Unterstützt deutsche Dezimalkommas (`"106,89"` $\rightarrow$ `106.89`) sowie wissenschaftliche Notation (`"9.6643E-2"` $\rightarrow$ `0.096643`).
  - Behandelt Platzhalter-Strings wie `"-"`, `"—"` oder `""` als `null`.
- **Formatierte Währungs- und Buchhaltungs-Strings:**
  - Entfernt Währungssymbole (`€`, `$`, `EUR`) und Leerzeichen.
  - Erkennt Buchhaltungsklammern für negative Werte (`"(70.000,00 €)"` $\rightarrow$ `-70000`).
  - Unterscheidet kombinierte Tausenderpunkte und Dezimalkommas (`"70.000,00"` $\rightarrow$ `70000.00`) sowie reine deutsche Tausendertrennzeichen bei Ganzzahlen (`"631.000"` via Regex `/^[+-]?\d{1,3}(\.\d{3})+$/` $\rightarrow$ `631000`).

### 2.3 Hybride Datums- & Perioden-Konvertierung
- **Excel-Seriendatum zu ISO-Datum (`YYYY-MM-DD`):**
  - Konvertiert numerische Excel-Seriendaten (innerhalb plausibler Schranken, z. B. `30000..70000`) auf Basis der Excel-UTC-Epoche `1899-12-30` (`Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000`) fehlerfrei ohne lokale Zeitzonen-Verschiebung.
- **Polymorphe Monats-/Perioden-Erkennung (`YYYY-MM`):**
  - Eine Header-Zelle kann in unterschiedlichen Arbeitsmappen als Excel-Seriendatum (`46023`), als englischer Monatsname (`"January"`), als deutscher Monatsname inkl. Umlautvarianten (`"März"`, `"Maerz"`), oder bereits als ISO-String (`"2026-01"`) vorliegen.
  - Der Adapter normalisiert alle diese Varianten (unter Nutzung eines Basisjahrs als Fallback für reine Monatsnamen) in das kanonische Format `"YYYY-MM"`.

---

## 3. Semantische Anker-Suche & Kontrolliertes Fuzzy-Matching

Da Nutzer in realen Excel-Vorlagen häufig Leerzeilen einfügen, Zeilen ausblenden oder Beschriftungen leicht abändern, darf der Adapter **keine festen Zellkoordinaten (wie `B4` oder `L168`)** voraussetzen, sondern muss über semantische Anker navigieren.

### 3.1 Text-Vorbereinigung (Token Cleaning)
- Vor jedem Anker-Vergleich werden führende mathematische und statistische Symbole (`∑`, `Ø`, `ø`, `%`), nachgestellte Satzzeichen (`:`, `.`) sowie mehrfache Leerzeichen entfernt und der Text kleingeschrieben.

### 3.2 Tippfehler-tolerantes Fuzzy-Matching mit False-Positive-Schutz
- **Problem:** Tippfehler in Summen- oder Strukturankern (z. B. `"Simme"` statt `"Summe"`, `"Bestnd"` statt `"Bestand"`) müssen erkannt werden, dürfen aber **niemals** dazu führen, dass reguläre Datensätze mit ähnlichem Wortstamm (z. B. Eigennamen wie `"Simmerath"`, `"Sommer"`, `"Sammler"`) fälschlich als Strukturanker interpretiert werden.
- **Mehrstufige Levenshtein-Regeln:**
  1. **Exakter Treffer:** Immer gültig.
  2. **Kurze Zielbegriffe ($< 5$ Zeichen):** Kein Fuzzy-Matching (nur exakter Treffer).
  3. **Mittlere Zielbegriffe ($5..9$ Zeichen):**
     - Maximale Längendifferenz $\le 1$.
     - Maximale Levenshtein-Distanz $\le 1$.
     - **Strukturelle Anker-Bedingung:** Das letzte Zeichen muss exakt übereinstimmen **und** entweder das erste oder das zweite Zeichen muss übereinstimmen.
  4. **Lange Zielbegriffe ($\ge 10$ Zeichen):**
     - Maximale Längendifferenz $\le 2$.
     - Maximale Levenshtein-Distanz $\le 2$.
- **Vergleichsmodi (`equals` | `startsWith` | `includes`):**
  - Unterstützt wortgrenzen-bewusstes Präfix-Slicing bei `startsWith` und ein gleitendes Wortfenster (Sliding Window) bei `includes`, um mehrwortige Anker auch innerhalb längerer Zelltexte fehlertolerant zu finden.

### 3.3 Kanonische Schlüssel-Normalisierung (Alias-Mapping)
- Ein Mapping-Layer führt synonyme Bezeichnungen (Deutsch/Englisch, Abkürzungen, Präfix-Varianten wie `"% ..."`, `"∑ ..."`, `"Ø ..."`) sowie deren Fuzzy-Treffer auf einen eindeutigen kanonischen Schlüssel (Slug) zusammen.

---

## 4. Layout- & Navigationsmuster zum Auslesen komplexer Blätter

Der Adapter muss 6 unterschiedliche strukturelle Tabellenmuster innerhalb von Arbeitsblättern verarbeiten können:

### Muster A: Schlüssel-Wert-Metadatenblock (Key-Value Scanning)
- Vertikales Scannen einer definierten Spalte (z. B. Spalte A) nach semantischen Ankern und Auslesen des zugehörigen Wertes aus der Nachbarspalte (Spalte B).
- **Blattübergreifender Fallback:** Fehlt ein Metadatenwert auf dem Hauptblatt, wird er automatisch aus den Header-/Statusbereichen anderer Blätter abgeleitet.

### Muster B: Dynamische Zeitachsen- & Spalten-Erkennung
- **Schwellenwert-Scan für Header-Zeilen:** Scannen der ersten $N$ Zeilen nach einer Zeile, die mindestens $M$ (z. B. $\ge 6$ oder $\ge 10$) valide Perioden-/Datumswerte enthält.
- **Relativer Lookbehind über Ankerzeilen:** Falls das Datum nicht direkt verankert ist, wird zunächst eine Einheiten-Zeile gesucht (z. B. $\ge 3$ Zellen mit derselben Einheit) und anschließend $1..3$ Zeilen **oberhalb** nach der Datumszeile gesucht.
- **Mehrjahres-Filterung & Spalten-Deduplizierung:**
  - Ignoriert kaputte Spalten (`#REF!`) am linken Rand.
  - Wenn Spalten aus Vorjahren und dem Zieljahr koexistieren, wird auf das Zieljahr gefiltert (sofern genügend Spalten vorhanden sind).
  - Kommt dieselbe Periode mehrfach in einer Zeile vor (z. B. links alte Text-Header, rechts aktuelle Datums-Serienwerte), gewinnt das letzte Vorkommen (Deduplizierung per `Map`).
- **Status- & Zusatzzeilen-Kopplung:** Auslesen der direkt darunterliegenden Zeile (`monthRowIdx + 1`), um pro Spalte Metadaten wie den Periodenstatus (`Ist` vs. `Plan/Forecast`) oder Faktoren (z. B. Arbeitstage) an die Spaltendefinition zu hängen.

### Muster C: Vertikal gestapelte Blöcke mit Cursor-Navigation & Hard Cut-Off
- Mehrere fachlich getrennte Tabellenblöcke (z. B. 1. Prozentanteile $\rightarrow$ 2. Mengen $\rightarrow$ 3. Preise) liegen untereinander im selben Blatt und teilen sich dieselbe horizontale Spaltenachse.
- **Sequenzieller Zeilen-Cursor:** Ein Cursor läuft von oben nach unten durch das Raster und wechselt den Zustand jeweils beim Erreichen des Summen-Ankers eines Blocks.
- **Horizontale Prüfzeilen (Validation Rows):** Zwischen zwei Blöcken liegende Kontrollzeilen (erkennbar an $\ge 3$ Zellen mit `"o.k."`, `"ok"`, `"fehler"`) werden erkannt und als `boolean[]`-Vektor extrahiert.
- **Unterscheidung von Einzelposition, Zwischensumme (`isSubtotal`) und Gesamtsumme (`isSummary`):**
  - Zwischensummen werden erkannt an Präfix-Symbolen (`∑`, `Ø`), einer Liste bekannter Zwischensummen-Schlüssel oder daran, dass derselbe kanonische Schlüssel innerhalb desselben Blocks ein zweites Mal auftritt.
  - **Mehrstufige Summenzeilen (Lookahead):** Wenn auf eine Zwischensummenzeile innerhalb von 1–2 sichtbaren Zeilen noch eine finale Gesamtsummenzeile folgt, wird die erste als `isSubtotal: true` und erst die letzte als `isSummary: true` markiert.
- **In-Block-Filterung & Hard Cut-Off (Schutz vor Nebenrechnungen):**
  - Eingebettete Referenz-, Plan- oder Quoten-Zeilen innerhalb eines Blocks werden übersprungen.
  - Sobald der finale Summen-Anker (oder ein definierter Stop-Anker) erreicht ist, bricht der Parser **sofort hart ab**, damit manuelle Nebenrechnungen, Differenzzeilen oder Notizen unterhalb der Tabelle niemals eingelesen werden.

### Muster D: Wiederholte mehrzeilige Entitäts-Gruppen (Multi-Row Entity Blocks)
- Eine Entität besteht nicht aus einer einzelnen Zeile, sondern aus einem vertikalen Block von $3..5$ Zeilen (z. B. Anfangsbestand, Zugang, Abgang, Endbestand).
- **Anker + begrenzter Lookahead:** Der Parser sucht in Spalte B nach dem Start-Anker des Blocks (während Spalte A den Namen der Entität trägt) und durchsucht dann bis zu $K$ Folgezeilen (`i + 1` bis `i + 5`) nach den zugehörigen Teilmetriken, bricht den Lookahead aber sofort ab, falls zuvor ein neuer Start-Anker in Spalte A/B beginnt.
- **Zustandsabhängige Sektions-Zuordnung:** Wiederholen sich dieselben Entitätsschlüssel nach einer Gesamtsumme ein zweites Mal im selben Blatt, ordnet der Parser den ersten Durchlauf der Mengen-Sektion und den zweiten Durchlauf automatisch der Bewertungs-/Währungs-Sektion zu.

### Muster E: Horizontale Mehrspalten-Strides (Repeating Column Groups per Period)
- Jede Periode belegt nicht nur eine Spalte, sondern einen **festen Block von $K$ aufeinanderfolgenden Spalten** (Stride, z. B. 8 Spalten pro Monat: `startCol + 0` bis `startCol + 7` für verschiedene Attribute derselben Position).
- **Kategorie-Header-Erkennung über Offset:** Eine Zeile wird als Start einer neuen Kategorie erkannt, wenn in Spalte A ein Name steht und an einem definierten Spalten-Offset (z. B. `startCol + 3`) das erwartete Spaltenüberschrift-Schlüsselwort steht; die Einheit wird dynamisch aus dem Nachbar-Offset (`startCol + 4`) abgeleitet.
- **Zwischenüberschriften & Automatische Namens-Disambiguierung:**
  - Kurze Gruppen-Header innerhalb einer Kategorie setzen einen internen `subSection`-Kontext.
  - Kommt derselbe Entitätsname innerhalb einer Kategorie mehrfach vor, wird er automatisch eindeutig gemacht: zuerst durch Anhängen der Untergruppe (`"Name (SubSection)"`) und bei weiterer Dopplung durch Nummerierung (`"Name (#2)"`).
- **Zeilen-Bereinigung:** Kontroll-/Gegenbuchungszeilen (z. B. negative Mengen ohne Kosten) sowie komplett leere Vorlagenzeilen werden herausgefiltert; unbenannte Zeilen mit echten Kosten bleiben als `"<Kategorie> (Direkt)"` erhalten.

### Muster F: Vorbefüllte Formular-Tabellen mit Aktivitäts-Erkennung
- **Dynamisches Spalten-Binding:** Scannen der ersten $N$ Zeilen nach den Spaltenüberschriften, um die Spaltenindizes dynamisch zu ermitteln.
- **Unterscheidung von Leer-Vorlage und Nutzereingabe:** Zeilen, in denen zwar die Kategorie oder ein Standard-Platzhaltertext aus der Vorlage vorausgefüllt ist, aber weder ein individueller Text noch ein numerischer Wert vom Nutzer eingetragen wurde, werden ignoriert.
- **Footer-Stop:** Automatisches Beenden des Lesevorgangs bei Erreichen von Hinweistexten am Tabellenende.

---

## 5. Umgang mit ausgeblendeten Zeilen (`hidden` Metadata)

Der Adapter muss zwei Strategien für ausgeblendete Excel-Zeilen (`row.hidden === true`) unterstützen:
1. **Striktes Überspringen (`skipHidden`):** In Berechnungs-, Positions- und Textblättern werden ausgeblendete Zeilen komplett ignoriert, damit veraltete oder deaktivierte Vorlagenzeilen keine Summen oder Schlüssel-Deduplizierungen verfälschen.
2. **Bedingtes Überspringen (`skipHiddenIfEmpty`):** In Parameter- oder Bestandsblättern werden ausgeblendete Zeilen nur dann übersprungen, wenn alle extrahierten Werte der Zeile `null` sind (sodass eingeklappte Zeilen mit echten Werten erhalten bleiben).

---

## 6. Zusammenführen getrennter Arbeitsmappen (Multi-Workbook Merging)

Wenn zusammengehörige Daten auf zwei getrennte `.xlsx`-Dateien (z. B. zwei Teilbereiche derselben Einheit) aufgeteilt sind, muss ein Merge-Layer beide geparsten Strukturen zu einem konsistenten Gesamtobjekt zusammenführen:
- **Zeitachsen-Synchronisation (Month Alignment):** Wert-Arrays der zweiten Arbeitsmappe werden über den Periodenschlüssel (`YYYY-MM`) exakt auf die Zeitachse der ersten Arbeitsmappe projiziert (fehlende Perioden werden mit `null` aufgefüllt).
- **Partitioniertes Zusammenführen:** Disjunkte Kategorien und Blöcke beider Dateien werden ohne gegenseitiges Überschreiben kombiniert.
- **Deduplizierung von Freitext-Einträgen:** Textuelle Anmerkungen aus beiden Dateien werden über einen zusammengesetzten Hash-Schlüssel dedupliziert, nach regulären Einträgen und Summenzeilen sortiert und neu durchnummeriert.

---

## 7. Blattübergreifende Plausibilisierung & Formel-Integritätschecks

Der Adapter bzw. die darauf aufbauende Validierungsschicht prüft die mathematische und strukturelle Integrität einer Arbeitsmappe unabhängig von Excel:
1. **Spaltenweise Anteils-Prüfung:** Prüft, ob die Summenzeile eines prozentualen Mix-Blocks in jeder Spalte $100\,\%$ ($1.0 \pm 0.005$) ergibt.
2. **Spaltenweise Mengen-Abstimmung:** Prüft, ob die Summe der Einzelpositionen innerhalb einer Toleranz ($\pm 1.0$) mit einer übergeordneten Gesamt-Referenzzeile übereinstimmt.
3. **Cut-Off-Verifikation:** Prüft, ob jeder Block sauber an seinem definierten Summen-Anker abgeschlossen wurde.
4. **Blattübergreifender Bestands-Rollforward & Formel-Check:**
   - Prüft, ob der Anfangsbestand einer Periode $M$ in Blatt B mit dem Referenzbestand der Periode $M-1$ (bzw. $M$) in Blatt A übereinstimmt (sowohl für Mengen als auch für Währungsbeträge).
   - **Erkennung verschobener Zellreferenzen:** Schlägt Alarm, wenn in einer Periode ein physischer Bestand $> 1.0$ vorliegt, der zugehörige Währungs-Anfangsbestand im Blatt jedoch `0` ist (typischer Fehler, wenn eine Formel in der Vorlage auf eine leere Spalte zeigt).

---

## 8. Vergleichs-, Kaskaden- & Berechnungs-Anforderungen

Wenn Arbeitsmappen verglichen oder Werte im Frontend editiert werden, sind folgende Berechnungs-Mechanismen erforderlich:
- **Status-gefilterter Periodenvergleich:** Vergleiche zwischen zwei Ständen werden ausschließlich über Spalten berechnet, deren Status in der Zieldatei noch offen (nicht als abgeschlossen/`act` markiert) ist.
- **Exakte additive Effekt-Zerlegung (Decomposition):**
  - Zerlegung von Mengenänderungen in Volumen- und Struktur-/Mix-Anteil ($\Delta Q = \Delta Q_{\text{Vol}} + \Delta Q_{\text{Mix}}$).
  - Zerlegung von Kostenänderungen in Mengen-, Preis- und Nebenkosten-Hebel, wobei über eine Residual-Berechnung garantiert wird, dass die Summe der Teileffekte exakt der Gesamtkostendifferenz entspricht ($\sum \text{Hebel} \equiv \Delta \text{Kosten}$).
  - **Behandlung neu hinzukommender oder wegfallender Positionen:** Wechselt eine Position von Menge `0` (ohne Preis) auf Menge `> 0` (mit Preis) oder umgekehrt, wird der Effekt vollständig als Mengeneffekt klassifiziert, um künstliche Preissprünge (`0 € -> Preis`) zu verhindern.
  - **Synthetischer Ausgleichs-Treiber (Bridge Item):** Differenzen zwischen Einkaufs-/Zugangsvolumen und Verbrauchsvolumen werden automatisch als bestandsbezogener Ausgleichsposten modelliert, damit die Summe aller Einzel-Treiber exakt mit dem Gesamteffekt der Kategorie übereinstimmt.
- **Mehrstufige Live-Rechenkaskade (bei In-Memory-Bearbeitung):**
  - Stufe 1: Neuberechnung von Positionskosten und Kategoriesummen aus Mengen, Preisen, Rabatten und Nebenkosten.
  - Stufe 2: Chronologischer Rollforward über alle offenen Perioden ($M \rightarrow M+1$) zur Berechnung gleitender Durchschnittspreise sowie neuer Monatsend- und Monatsanfangsbestände.
  - Stufe 3: Übertragung der neu berechneten Durchschnittspreise in abhängige Tabellen und Aktualisierung aller Summen- und Differenzwerte.

---

## 9. Verlustfreies Zurückschreiben & Roundtrip-Export (Write / Patching Level)

Wenn Änderungen aus der Anwendung wieder als `.xlsx`-Datei exportiert werden, damit nachgelagerte Drittsysteme (z. B. BI-/Controlling-Importer) diese automatisiert einlesen können, gelten strikte Anforderungen:

### 9.1 Chirurgisches In-Place-Update statt Neu-Generierung
- Die ursprüngliche Vorlagen-Datei (`.xlsx`) dient als binäre Ausgangsbasis.
- **Vollständiger Struktur- & Style-Erhalt:** Spaltenbreiten, Zahlenformate, Farben, Rahmen, ausgeblendete Zeilen/Spalten, Blattnamen sowie unveränderte Zellen und Formeln (`<f>`) müssen zu 100 % unangetastet bleiben.

### 9.2 Duales Schreiben von Eingabewerten UND gecachten Formelergebnissen (`<v>`)
- **Hintergrund:** Automatisierte Backend-/BI-Importer werten beim Einlesen einer `.xlsx`-Datei keine Excel-Formeln neu aus, sondern lesen den zuletzt im XML gespeicherten Ergebniswert (`<v>`-Tag bzw. `cell.result`).
- **Anforderung an den Adapter:**
  1. Geänderte Eingabezellen werden mit ihrem neuen Rohwert beschrieben.
  2. Für sämtliche davon abhängigen Formelzellen entlang der Berechnungskaskade bleibt die Formel (`<f>`) unverändert bestehen, aber **der gecachte Ergebniswert (`<v>`) wird vom Adapter mit dem in JavaScript neu berechneten Wert aktualisiert**.
  3. Dadurch ist die exportierte `.xlsx`-Datei sofort für externe Importer konsistent lesbar, ohne dass sie zuvor manuell in Microsoft Excel geöffnet und gespeichert werden muss, und bleibt gleichzeitig in Excel voll formel-interaktiv.
