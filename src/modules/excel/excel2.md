# Anforderungen & Spezifikation: Excel-Verarbeitung, Tabellarische Datenaufbereitung & `.xlsx`-Generierung

Dieses Dokument beschreibt sachlich und domänenunabhängig sämtliche Anforderungen, Datenstrukturen, Berechnungsregeln und Formatierungslogiken, die für die tabellarische Auswertung und den Export nach Microsoft Excel (`.xlsx`) erforderlich sind. Es dient als technische Referenz, welche Fähigkeiten ein universeller, Business-Logik-agnostischer Excel-/Tabellen-Adapter im Frontend bereitstellen oder unterstützen muss.

---

## 1. Datenmodell & Gemischte Zellwerte (Hybride Datentypen)

In vielen technischen, laborbezogenen oder kaufmännischen Tabellen bestehen Messwert- oder Kennzahlenspalten nicht aus rein homogenen Zahlen, sondern aus **hybriden Zellwerten**, die gleichzeitig einen Anzeige-, einen Berechnungs-, einen Sortier- und einen Statuswert besitzen.

Ein generischer Adapter muss pro Datenfeld / Zelle folgende Zustände verarbeiten können:

1. **Echte numerische Werte (`number`):**
    - Werden in Excel zwingend als nativer numerischer Zelltyp (`t="n"`, `<v>720</v>`) geschrieben – **nicht** als Text –, damit der Nutzer in Excel sofort eigene Formeln (`=SUMME()`, `=MITTELWERT()`) darauf anwenden kann.
2. **String-Präfix-Werte / Schwellenwerte (z. B. `< 20`, `< 0,2`):**
    - Repräsentieren Werte unterhalb einer Nachweis- oder Bestimmungsgrenze.
    - **In der Excel-Zelle:** Müssen als Text (`inlineStr` / `string`, z. B. `"<0,2"`) erhalten bleiben, da eine reine Zahl `0.2` die Aussage verfälschen würde.
    - **In Berechnungen (Durchschnitt / Pivot):** Müssen nach konfigurierbarer Strategie in Aggregationen einfließen können (z. B. als `0`, als Faktor `x * 0.5`, oder falls _alle_ Werte einer Gruppe unter der Grenze liegen, als Rückfall auf den Text `"<0,2"`).
    - **In der Sortierung:** Benötigen einen eigenen numerischen `sortValue` (z. B. `Grenzwert * 0.25`), damit `"<0,2"` beim Sortieren logisch zwischen `0` und `0,2` eingereiht wird.
3. **Fehlende Werte / Platzhalter (`null`, `"na"`, `"–"`):**
    - Werden als definierter Platzhalter-String (z. B. `"–"`) im Sheet ausgegeben.
    - Dürfen bei Durchschnitts- oder Maximalwert-Berechnungen den Nenner (Anzahl gültiger Werte) **nicht** verfälschen.
    - Müssen bei der Sortierung (sowohl aufsteigend `ASC` als auch absteigend `DESC`) immer am Ende der Liste (`Missing Last`) einsortiert werden (`sortValue = -1`).
4. **Numerisch aussehende Identifikatoren (z. B. `Proben-Nr.`, `Artikel-Nr.`):**
    - Können als Zahl geparst (`parseInt(val, 10) || val`) oder als String belassen werden, benötigen bei der Sortierung jedoch eine natürliche / numerische Kollationierung (`localeCompare(..., { numeric: true })`).
5. **Bedingter Zellstatus (`isExceeded` / `status: "ok" | "warn" | "danger"`):**
    - Jede Zelle trägt Metadaten darüber, ob ihr Wert einen hinterlegten Referenz- oder Grenzwert überschreitet. Dieser Status steuert direkt die bedingte Formatierung (Style-Zuweisung) beim Excel-Export.

---

## 2. Mehrstufiger Blattaufbau (Multi-Row Layout & Struktur eines Worksheets)

Ein exportiertes Tabellenblatt besteht nicht nur aus einer flachen CSV-artigen Header-plus-Daten-Struktur, sondern folgt einem **5-Zonen-Layout**:

```text
+-----------------------------------------------------------------------------------+
| Zeile 1: Dokumenttitel (Groß, Fett, zusammenfassender Kontext & Modus)            |
| Zeile 2: Untertitel / Meta-KPI-Zeile (Zeitraum, Datensatzanzahl, Quoten)          |
| Zeile 3: Leerzeile (Visueller Weißraum zur Trennung von Kopf und Tabelle)         |
+-----------------------------------------------------------------------------------+
| Zeile 4: Primäre Spaltenköpfe (Bezeichnungen der Dimensionen & Messparameter)     |
| Zeile 5: Sekundäre Kopfzeile / Referenzzeile (Einheiten [mg/kg], Grenzwerte)      |
+===================================================================================+  <-- Freeze Pane (ySplit = 5)
| Zeile 6..N: Datenzeilen (Einzeldatensätze oder aggregierte Pivot-Gruppenzeilen)   |
+-----------------------------------------------------------------------------------+
| Zeile N+1: Zusammenfassende Fußzeile / Totals-Row (Gesamtsummen, Ø, Quoten)       |
+-----------------------------------------------------------------------------------+
```

### Anforderungen an den Adapter für das Sheet-Layout:

- **Freie Kopf- und Metazeilen vor der eigentlichen Tabelle:** Beliebig viele Titel-, Untertitel- und Leerzeilen oberhalb des Tabellenheaders, ohne dass diese die Spaltenbreiten der Datenspalten sprengen.
- **Mehrzeilige Tabellenköpfe (Multi-Row Table Header):**
    - **Haupt-Header (Zeile 4):** Spaltennamen (linksbündig für Text-/Dimensionsspalten, rechtsbündig für Messwert-/Kennzahlenspalten).
    - **Sub-Header / Referenz-Zeile (Zeile 5):** Optionale zweite Kopfzeile für Einheiten (`[mg/kgTM]`, `[%]`) und statische Soll-/Grenzwerte je Spalte (z. B. `600`, `100`, `na`).
- **Fixierte Fensterbereiche (Freeze Panes):**
    - Konfigurierbarer `ySplit` (hier `freezeTopRows = 5`), sodass beim vertikalen Scrollen in Excel sowohl der Dokumenttitel als auch der zweizeilige Tabellenkopf (`Haupt-Header + Grenzwert-Zeile`) dauerhaft sichtbar oben fixiert bleiben (`<pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/>`).
- **Aggregierte Fußzeile (Sticky Footer / Totals Row):**
    - Abgeschlossene Ergebniszeile am Ende der Tabelle mit eigenem oberen Trennrahmen (`medium` Top-Border), die spaltenspezifisch entweder Text-Zusammenfassungen (`"124 Proben"`, `"18 Lieferanten"`, `"12 Abw. (9,7 %)"`) oder berechnete Spalten-Aggregate (Gesamtdurchschnitt, Gesamtmaximum, Summe der Überschreitungen) ausgibt.

---

## 3. Dynamische Spalten-Projektion & Perspektiven (View Modes)

Der Excel-Generator darf nicht auf ein starres Spaltenschema festgelegt sein, sondern muss die Tabelle dynamisch aus der aktuellen Konfiguration projizieren:

1. **Dynamische Spaltenauswahl (Column Toggling):**
    - Aus einem Katalog möglicher Messwert-Spalten (z. B. 12+ Parameter) wählt der Nutzer eine beliebige Teilmenge (z. B. _Alle_, _Nur Spalten mit Grenzwert_, oder _Individuelle Auswahl_).
    - Sowohl Header, Sub-Header (Grenzwerte), Datenzeilen, Fußzeile als auch das Spaltenbreiten-Array (`colWidths`) passen sich dynamisch an die aktiven Spalten an.
2. **Drei strukturell unterschiedliche Tabellen-Perspektiven (Single-View oder Multi-Sheet):**
    - **Perspektive A – Einzeldatensätze (`Flat / Samples`):**
        - Feste Dimensionsspalten links (z. B. _Datum, Standort/Werk, ID, Entität/Lieferant, Zusatzort, Erfassungsdatum_) + dynamische Messwertspalten rechts.
    - **Perspektive B – Entitäten-Aggregation (`Pivot nach Gruppe/Lieferant`):**
        - Gruppiert Datensätze nach einer normalisierten Entität.
        - Feste Aggregat-Spalten links (_Gruppenname, zugeordnete Standorte, Anzahl Ereignistage, Anzahl Datensätze, Anzahl Überschreitungen, Überschreitungsquote in %_) + aggregierte Messwertspalten rechts.
    - **Perspektive C – Zeitreihen-Aggregation (`Pivot nach Zeitintervall`):**
        - Gruppiert Datensätze chronologisch nach wählbarer Granularität (**Monat** `YYYY-MM`, **Quartal** `YYYY-Q#` oder **Einzeltag** `YYYY-MM-DD`).
        - Gleiche Kennzahlenspalten wie Perspektive B, jedoch zeitlich sortiert.
3. **Umschaltbare Aggregations-Metrik für Pivot-Spalten (`avg` | `max` | `exceedances`):**
    - Dieselbe Pivot-Struktur muss ihre Wertspalten wahlweise mit dem **arithmetischen Mittel (`Ø`)**, dem **Spitzenwert (`Max`)** oder der **Anzahl der Grenzwertüberschreitungen (`Count`)** befüllen können.
    - Auch das Aggregat selbst wird wieder gegen das Spaltenlimit geprüft: Überschreitet der Durchschnitt oder das Maximum einer Gruppe den Grenzwert, erhält auch die Pivot-Zelle im Excel-Export die Hervorhebungs-Formatierung.

---

## 4. Vorbereitende Daten-Pipeline (In-Memory Query, Normalisierung & Aggregation)

Bevor Daten in den Excel-Adapter fließen (oder als Teil einer integrierten Daten-Engine des Adapters), werden folgende Transformationen synchron im Arbeitsspeicher durchgeführt:

### 4.1 Entitäten-Kanonisierung (Rule-Based Entity Resolution)

- Rohdaten enthalten oft unterschiedliche Schreibweisen für dieselbe Entität (z. B. Abkürzungen, Standortzusätze).
- Über ein Regelwerk (Matching-Modi wie `contains`, `equals`, `startsWith` + Standort-Scope) werden Rohdatensätze vor der Gruppierung in Echtzeit auf einen **kanonischen Hauptnamen** abgebildet, sodass zusammengehörige Einträge im Excel-Pivot unter einer gemeinsamen Zeile aggregiert werden.

### 4.2 Mehrdimensionale Filterung & Abweichungs-Scoping

- **Zeitraum-Filterung:** Unterstützt Gesamtzeitraum, Einzeljahr, Mehrfachauswahl von Quartalen (`2026-Q2`, `2026-Q4`), Mehrfachauswahl von Monaten (`2026-09`, `2026-10`), gezielte Einzeltag-Auswahl sowie freie Datumsbereiche (`YYYY-MM-DD` von/bis).
- **Spaltenabhängige vs. globale Abweichungsfilterung (`exceedanceScope`):**
    - Wird nach „Nur Datensätze mit Grenzwertüberschreitung“ gefiltert, muss unterschieden werden können zwischen:
        1. `selected`: Ein Datensatz gilt nur dann als abweichend, wenn die Überschreitung in einer der **aktuell eingeblendeten** Spalten vorliegt.
        2. `all`: Ein Datensatz wird einbezogen, wenn **irgendein** Parameter (auch ein ausgeblendeter) überschritten wurde.

### 4.3 Lokalisierte Zahlenformatierung & Rundungslogik

- Für Textausgaben (z. B. in Untertiteln oder kombinierten Footer-Zellen) werden Dezimalzahlen im deutschen Format (`de-DE`, Komma als Dezimaltrennzeichen) formatiert.
- **Werteabhängige Rundungspräzision bei Aggregationen:**
    - Werte `>= 50` werden auf ganze Zahlen gerundet (`maxDecimals = 0`).
    - Kleinere Werte `< 50` werden auf eine Nachkommastelle gerundet (`maxDecimals = 1`), um bei niedrigen Grenzwerten (z. B. `2,0` oder `0,4`) die nötige Signifikanz zu erhalten.

### 4.4 Synchronisierte Sortierung (UI <-> Excel)

- Der Excel-Export übernimmt exakt die aktuell vom Nutzer gewählte Sortierreihenfolge der Zeilen (`sortedSampleRows` / `sortedPivotRows`).
- Unterstützt werden muss eine **3-Stufen-Sortierlogik** (Primärrichtung $\rightarrow$ Gegenrichtung $\rightarrow$ Reset auf Standard) mit:
    - Deutscher String-Sortierung (`localeCompare(..., "de", { numeric: true })`),
    - Chronologischer Datumssortierung (Normalisierung deutscher Datumsstrings `DD.MM.YYYY` bzw. `D.M.YY` nach `YYYY-MM-DD`),
    - Numerischer Messwertsortierung unter Berücksichtigung von `<`-Schwellenwerten und strikter Platzierung fehlender Werte (`"–"`) am Tabellenende (`compareSortNumbersWithMissingLast`).

---

## 5. Styling-, Design- & Formatierungs-Anforderungen (OpenXML / ExcelJS)

Damit die erzeugten `.xlsx`-Dateien ohne manuelle Nachbearbeitung druck- und präsentationsreif sind, wendet die aktuelle Implementierung ein präzises Design-System (**Light-Zinc-Theme mit Amber-Warnfarben**) an. Ein Excel-Adapter sollte ein solches deklaratives Styling-System unterstützen:

### 5.1 Typografie & Farbpalette

- **Schriftart:** Einheitlich `Segoe UI` (oder konfigurierbare System-Sans-Serif).
- **Schriftgrößen & Schnitte:**
    - Dokumenttitel: `13 pt`, **Fett**, Farbe `Zinc-900` (`#18181B`)
    - Untertitel & Grenzwert-Zeile: `9.5 pt`, Normal, Farbe `Zinc-500` (`#71717A`)
    - Tabellenkopf (Header): `10 pt`, **Fett**, Farbe `Zinc-800` (`#27272A`)
    - Standard-Datenzellen: `10 pt`, Normal, Farbe `Zinc-900` (`#18181B`)
    - Hervorgehobene Zellen (Grenzwertüberschreitung): `10 pt`, **Fett**, Farbe `Amber-900` (`#78350F`)
    - Fußzeile (Totals): `10 pt`, **Fett**, Farbe `Zinc-900` (`#18181B`)

### 5.2 Hintergrundfüllungen (Fills)

- **Standard-Zellen:** Keine Füllung / Transparent.
- **Tabellenkopf & Fußzeile:** Dezentes Hellgrau `Zinc-100` (`#F4F4F5`).
- **Sub-Header / Grenzwert-Zeile:** Sehr helles Grau `Zinc-50` (`#FAFAFA`).
- **Grenzwertüberschreitung (Alert/Warning Cell):** Warmes Hellgelb/Amber `Amber-100` (`#FEF3C7`) – hebt Abweichungen sofort sichtbar hervor, bleibt aber auch im Schwarz-Weiß-Druck gut lesbar.

### 5.3 Rahmenlinien (Borders)

- **Verzicht auf vertikale Gitterlinien:** Für ein modernes, ruhiges Tabellenbild werden **keine** linken oder rechten Zellrahmen gesetzt.
- **Horizontale Trennlinien:**
    - Datenzeilen: Dünner unterer Rahmen (`thin`) in `Zinc-200` (`#E4E4E7`).
    - Header & Sub-Header: Dünner oberer und unterer Rahmen (`thin`) in `Zinc-300` (`#D4D4D8`).
    - Fußzeile (Totals): Kräftiger oberer Rahmen (`medium`) in `Zinc-400` (`#A1A1AA`) und dünner unterer Rahmen (`thin`) in `Zinc-300` (`#D4D4D8`).

### 5.4 Ausrichtung, Zeilenhöhen & Spaltenbreiten

- **Ausrichtung (`alignment`):**
    - Vertikal: Alle Zellen mittig zentriert (`vertical="center"`).
    - Horizontal: Text- und Dimensionsspalten linksbündig (`horizontal="left"`), sämtliche Messwert-, Anzahl-, Quoten- und Grenzwertspalten rechtsbündig (`horizontal="right"`), jeweils synchron zwischen Header, Sub-Header, Datenzeile und Footer.
- **Zeilenhöhen (`customHeight`):**
    - Zeile 1 (Titel): `26 pt`
    - Zeile 4 (Tabellenkopf): `24 pt`
    - Alle übrigen Zeilen (Untertitel, Sub-Header, Datenzeilen, Footer): `20 pt`
- **Spaltenbreiten (`customWidth`):**
    - Explizite Vorgabe pro Spaltentyp (z. B. `28–30` für lange Namen/Zeiträume, `13–16` für Datum/Standort/Kennzahlen, `11` für kompakte Messwertspalten), damit beim Öffnen in Excel keine `###`-Abschnitte entstehen.

---

## 6. Technische Architektur & Laufzeit-Anforderungen im Frontend

Aus der Art und Weise, wie die Anwendung gebaut und ausgeliefert wird, ergeben sich wichtige nicht-funktionale Anforderungen an den künftigen Excel-Adapter:

1. **Zero-Server / Reine Browser-In-Memory-Erzeugung:**
    - Die komplette `.xlsx`-Generierung muss synchron oder asynchron direkt im Browser im Arbeitsspeicher erfolgen und ein `Uint8Array` bzw. `ArrayBuffer` / `Blob` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) liefern.
    - Es dürfen keine Node.js-spezifischen Streams (`fs`, `stream`, `buffer` ohne Browser-Äquivalent) vorausgesetzt werden.
2. **Kompatibilität mit Single-File-Builds & Offline-Betrieb:**
    - Die Anwendung wird als einzelnes, autarkes HTML-Bundle (`vite-plugin-singlefile`) gebaut und läuft lokal (auch über `file://` oder von Netzlaufwerken).
    - _Hinweis zum aktuellen Code:_ Obwohl `exceljs` in der `package.json` als Abhängigkeit hinterlegt ist, nutzt die produktive Export-Engine in `archiveAnalytics.ts` aktuell einen **schlanken, nativen OpenXML-Builder** auf Basis von `fflate` (`zipSync`), der `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/styles.xml` und `xl/worksheets/sheet1.xml` direkt als XML-Strings zusammensetzt.
    - **Implikation für den geplanten ExcelJS-Adapter:**
        - Wenn der künftige Adapter auf `exceljs` aufbaut, sollte er **Lazy Loading (`await import(...)`)** oder Tree-Shaking unterstützen, damit das Initial-Bundle bei Single-File- oder Web-Apps schlank bleibt.
        - Zudem sollte die Adapter-API so abstrahiert sein (z. B. über deklarative Sheet-/Row-/Cell-/Style-Definitionen), dass unter der Haube wahlweise `exceljs` (für komplexe Features wie Lesen, Formeln, Bilder, Multi-Sheet-Manipulation) oder ein schneller Light-Writer zum Einsatz kommen kann.
3. **Sichere XML-/String-Kodierung & Dateinamen-Generierung:**
    - Alle Textwerte und Sheet-Namen müssen sauber gegen XML-Sonderzeichen (`&`, `<`, `>`, `"`, `'`) escaped werden, insbesondere weil Messwerte häufig das Zeichen `<` (z. B. `<0,2`) enthalten.
    - Automatische Erzeugung sprechender, dateisystemsicherer Dateinamen (Slugifying von Umlauten/Leerzeichen + aktuelles ISO-Datum, z. B. `{Praefix}_{Modus}_{Scope}_{YYYY-MM-DD}.xlsx`).
4. **Testbarkeit ohne Browser-DOM:**
    - Die Export-Funktion gibt `{ fileName: string, bytes: Uint8Array }` zurück, bevor der Browser-Download (`URL.createObjectURL`) ausgelöst wird.
    - Dadurch lässt sich die generierte `.xlsx`-Datei in automatisierten Unit-Tests (Vitest) direkt im Speicher entpacken (`unzipSync`) und auf strukturelle Korrektheit (Freeze Panes, numerische Zelltypen `t="n"`, korrekte Style-IDs bei Grenzwertüberschreitungen, Escaping von `<`-Werten) prüfen.

---

## 7. Checkliste: Was der generische Excel-Adapter als API anbieten sollte

Zusammengefasst sollte der Business-Logik-agnostische Adapter folgende Bausteine bereitstellen:

- [ ] **Deklaratives Style-Registry-System:** Definition wiederverwendbarer Zell-Styles (Font, Fill, Border, Alignment, NumberFormat) über semantische Namen (z. B. `title`, `subtitle`, `headerLeft`, `headerRight`, `subHeader`, `dataNumeric`, `dataAlert`, `footer`).
- [ ] **Multi-Zone Worksheet Builder:** Einfaches Hinzufügen von:
    - Titel- & Metadaten-Blöcken (mit eigener Zeilenhöhe),
    - Mehrzeiligen Tabellenköpfen (Header + Einheiten-/Referenzzeile),
    - Konfigurierbaren Freeze Panes (`freezeRows`, `freezeCols`),
    - Datenzeilen mit automatischer Typ-Unterscheidung (`number` vs. `string`/`inlineStr` vs. `empty`),
    - Bedingtem Styling pro Zelle auf Basis eines Prädikats oder Status-Flags (`isExceeded -> alertStyle`),
    - Aggregierten Fußzeilen (Totals / Summary Row) mit abweichender Rahmen- und Hintergrundgestaltung.
- [ ] **Hybride Wert-Helfer (Value Resolvers):** Unterstützung für Zellen, die einen Roh-String (`"<0,2"`), einen optionalen numerischen Wert (`null` oder `number`), einen Sortierwert (`sortValue`) und ein Warn-Flag kapseln.
- [ ] **In-Memory Grouping & Pivot-Helfer (optional als Daten-Layer vor dem Export):** Gruppierung flacher Datensätze nach Dimensionen oder Zeitintervallen (Tag/Monat/Quartal) mit wählbaren Aggregationsfunktionen (`avg`, `max`, `countIf`, `ratePercent`) und konfigurierbarer Behandlung von `<`-Schwellenwerten sowie fehlenden Werten.
- [ ] **Reine Byte-Ausgabe (`Uint8Array`) + separater Browser-Download-Trigger:** Saubere Trennung zwischen binärer Workbook-Erzeugung (für Tests, File System Access API oder Web-Worker) und dem DOM-Download via `Blob`.
