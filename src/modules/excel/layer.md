## 8. Architektur-Bauplan: Eigene Low-Level OpenXML-Engine statt schwerer `exceljs`-Dependency

Da eine `.xlsx`-Datei (Office Open XML) technisch lediglich ein `.zip`-Archiv mit klar strukturierten XML-Dateien ist, lässt sich die gesamte Excel-Verarbeitung (Lesen, Berechnen, Schreiben) komplett ohne `exceljs` und ohne Node.js-Polyfills (`stream`, `buffer`, `events`) direkt auf Basis von **`fflate` (`zipSync` / `unzipSync`)** und modernem TypeScript aufbauen.

### 8.1 Warum Low-Level OpenXML + `fflate` im Frontend überlegen ist

1. **100 % Synchron & Deterministisch:** Sowohl `writeXlsxBytes()` als auch `readXlsxBytes()` laufen synchron im selben Tick (keine unnötigen `async/await`-Stream-Wrapper).
2. **Kein Bundler-/Node-Ballast:** Volle Kompatibilität mit Vite, Svelte/React, Web-Workern, Vitest/Bun und Single-File-HTML-Builds (`file://`).
3. **Volle XML-Kontrolle:** Keine veralteten OpenXML-Fragmente, die beim Öffnen in Excel Reparatur-Warnungen auslösen.

---

### 8.2 Performance, Speicherbedarf & Skalierbarkeit ohne Streaming

Auf einem normalen Windows-Arbeitslaptop mit Microsoft Edge (Standard-Tab-Limit ~4 GB RAM in V8) ist Streaming für 99,9 % aller Business-Anwendungen überflüssig:

| Zeilenanzahl (~18 Spalten) | Unkomprimiertes XML im RAM | `.xlsx`-Dateigröße (ZIP) | Generierungsdauer (`zipSync`) | Verhalten im Browser                          |
| :------------------------- | :------------------------- | :----------------------- | :---------------------------- | :-------------------------------------------- |
| **1.000 Zeilen**           | ~1 MB                      | ~40–80 KB                | **~5–15 ms**                  | Unmittelbar im selben Klick-Frame             |
| **10.000 Zeilen**          | ~10 MB                     | ~350–600 KB              | **~40–90 ms**                 | Verzögerungsfrei im Main-Thread               |
| **50.000 Zeilen**          | ~50 MB                     | ~1,8–3 MB                | **~250–450 ms**               | Problemlos im Main-Thread (< 0,5 Sek.)        |
| **100.000 Zeilen**         | ~100 MB                    | ~3,5–6 MB                | **~0,7–1,2 Sek.**             | Sehr schnell (optional kurzer Lade-Indikator) |
| **250.000+ Zeilen**        | ~250+ MB                   | ~10–15 MB                | **~2,5–4 Sek.**               | Mit Chunking / Web-Worker problemlos machbar  |

**Zwei Architektur-Kniffe für sehr große Dateien (> 50.000 Zeilen) ohne Streaming:**

1. **Chunked `Uint8Array`-Encoding statt eines einzelnen Riesen-Strings:** Um das V8-String-Limit (~512 MB für einen einzelnen String) nie zu berühren, werden die XML-Zeilen blockweise (z. B. alle 5.000 Zeilen) per `TextEncoder` in `Uint8Array`-Chunks encodiert und am Ende in ein Ziel-`Uint8Array` kopiert.
2. **`SharedStrings` für wiederholte Texte nutzen:** Wiederkehrende Strings (Kategorien, Standorte, Lieferanten, Statuswerte) werden nur einmalig in `xl/sharedStrings.xml` abgelegt und in der Zelle nur noch per Index (`<c r="D12" t="s"><v>3</v></c>`) referenziert.

---

### 8.3 Die 4-Schichten-Architektur (Empfohlene Umsetzungs-Roadmap)

Um eine saubere Trennung zwischen dem universellen OpenXML-Kern und den Komfort-Schnittstellen für Apps zu erreichen, wird die Library von unten nach oben in **4 isoliert getesteten Schichten** aufgebaut:

```text
+-----------------------------------------------------------------------------------+
| Schicht 4: App-Data-Adapters & Browser-IO                                         |
| (In-Memory Filtering, Grouping/Pivot, < Schwellenwert-Logik, Blob/FS-Download)    |
+-----------------------------------------------------------------------------------+
| Schicht 3: Deklarativer High-Level Report- & Table-Builder                        |
| (Themes, Multi-Zone Layout: Title + 2-Row Header + Freeze + Data + Totals-Footer) |
+-----------------------------------------------------------------------------------+
| Schicht 2: Mini-Formula & Calculation Engine (In-Memory Evaluator)                |
| (Tokenizer, AST, Dependency-Graph, Top-25 Excel-Formeln DE/EN inkl. Cache-Value)  |
+-----------------------------------------------------------------------------------+
| Schicht 1: „Dumb“ OpenXML Core (WorkbookModel <-> ZIP/XML via fflate)             |
| (Coords, 1900-Date-Math, Dynamic StyleRegistry, SharedStrings, Reader & Writer)   |
+-----------------------------------------------------------------------------------+
```

#### Schicht 1: Der „Dumb“ OpenXML Core (`core/`)

Kennt keinerlei Business- oder Report-Logik, sondern übersetzt ein neutrales TypeScript-Datenmodell (`WorkbookModel`) verlustfrei in `.xlsx`-Bytes und zurück.

- **`coords.ts` & `dates.ts`:**
    - Konvertierung `0 <-> "A"`, `"AB12" <-> { col: 27, row: 11 }`, Zellbereiche `"A1:G50"`.
    - Konvertierung `JS Date <-> Excel Serial Number` (Tage seit `1900-01-01` inkl. Korrektur des historischen Lotus-1-2-3-Schaltjahr-Bugs für das Jahr 1900).
    - XML-Escaping & Unescaping (`&`, `<`, `>`, `"`, `'`).
- **`styleRegistry.ts` (Dynamischer `xl/styles.xml` Builder & Parser):**
    - Nimmt deklarative TS-Style-Objekte (`{ font, fill, border, alignment, numFmt }`) entgegen, berechnet einen deterministischen Hash-Key, dedupliziert Fonts, Fills, Borders, NumberFormats (`numFmts`) sowie `cellXfs` und gibt die `styleId` (`s="0..N"`) zurück.
    - Erkennt beim Einlesen anhand von `numFmtId` (`14..22` sowie Custom-Format-Strings mit `y`, `m`, `d`), ob eine numerische Excel-Zelle ein Datum repräsentiert.
- **`sharedStrings.ts` (`xl/sharedStrings.xml`):**
    - Verwaltet die String-Deduplizierung beim Schreiben (`t="s"`) sowie Inline-Strings (`t="inlineStr"`) und liest beim Import sowohl einfache Strings (`<si><t>...</t></si>`) als auch formatierte Rich-Text-Blöcke (`<si><r><t>...</t></r></si>`) aus.
- **`writer.ts` & `reader.ts`:**
    - Erzeugt und liest Multi-Sheet-Workbooks (`xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/worksheets/sheet1..N.xml`).
    - Unterstützt auf Sheet-Ebene: Spaltenbreiten (`<cols>`), Zeilenhöhen (`ht`), Freeze Panes (`<pane ySplit="..." xSplit="..."/>`), AutoFilter (`<autoFilter ref="..."/>`), verbundene Zellen (`<mergeCells>`) sowie alle Zelltypen (Number `t="n"`, String `t="s"`/`t="inlineStr"`, Boolean `t="b"`, Error `t="e"`, Formula `<f>...</f><v>...</v>`).
    - **Qualitätssicherung Schicht 1:** 100 % Round-Trip-Unit-Tests (`model -> writeXlsxBytes -> readXlsxBytes -> deepEqual(model)`).

#### Schicht 2: Die Mini-Formula & Calculation Engine (`formula/`)

Ermöglicht es, Formeln direkt im Frontend in JavaScript auszuwerten, ohne dass die Datei zuerst in Excel geöffnet werden muss.

- **Lexer & AST-Parser:** Parst Ausdrücke wie `=ROUND(AVERAGE(G6:G99), 1)` oder `=IF(G6>G$5, "Abweichung", "OK")`.
- **Dependency-Graph & Topologische Sortierung:** Löst Zellabhängigkeiten in der richtigen Reihenfolge auf und erkennt Zirkelbezüge (`#REF!` / `#CYCLE!`).
- **Erweiterbare Funktions-Registry (Top-25 Business-Funktionen):**
    - Mathe & Aggregation: `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `ROUND`, `ROUNDUP`, `ROUNDDOWN`, `ABS`
    - Logik & Bedingte Aggregation: `IF`, `AND`, `OR`, `NOT`, `IFERROR`, `COUNTIF`, `SUMIF`, `AVERAGEIF`
    - Lookup & Text: `VLOOKUP`, `INDEX`, `MATCH`, `CONCAT`
    - **DE/EN-Übersetzung:** Automatische Normalisierung deutscher Funktionsnamen (`SUMME` $\rightarrow$ `SUM`, `MITTELWERT` $\rightarrow$ `AVERAGE`, `WENN` $\rightarrow$ `IF`, Semikolon `;` $\rightarrow$ Komma `,`), da OpenXML intern ausschließlich englische Formelnamen speichert.
- **Dual-Write (`<f>` + `<v>`):** Schreibt sowohl den Formeltext (`<f>`) als auch das in JS berechnete Ergebnis (`<v>`) in die Zelle, sodass andere Reader sofort den gecachten Wert sehen.

#### Schicht 3: Der High-Level Report- & Table-Builder (`builder/`)

Bietet eine deklarative API für strukturierte Business-Exporte, damit Anwendungen keine manuellen Zellkoordinaten zählen müssen:

- **Theme-Engine:** Austauschbare Design-Themes (z. B. _Light-Zinc + Amber-Alert_) mit semantischen Style-Rollen (`title`, `subtitle`, `header`, `subHeader`, `data`, `alert`, `footer`).
- **Zonen-Builder pro Sheet:**
    - `sheet.addHeaderBlock({ title, subtitle, emptyRowsAfter: 1 })`
    - `sheet.addTable({ columns, referenceRow, data, totalsRow, freezeHeader: true, autoFilter: true })`
- **Automatische Spaltenbreiten (`autoFit`):** Berechnet auf Wunsch aus Header-Länge, Datenwerten und Schriftgröße automatisch die optimale Spaltenbreite in Zeichen (`width`), damit in Excel keine `###`-Werte entstehen.

#### Schicht 4: In-Memory Data-/Pivot-Adapter & Browser-IO (`adapters/`)

Optionale Komfort-Schicht für typische Frontend-Datenpipelines:

- **Hybride Messwert- & Schwellenwert-Verarbeitung:** Eingebaute Unterstützung für Zellen mit `<`-Präfixen (Nachweisgrenzen), fehlenden Werten (`–`), Grenzwert-Prüfungen (`isExceeded`) und `Missing Last`-Sortierung.
- **Deklarative Pivot- & Zeitreihen-Gruppierung:** Gruppiert Datensätze nach Entitäten oder Zeitintervallen (Tag / Monat / Quartal) und berechnet `avg`, `max`, `countIf` sowie Abweichungsquoten (`%`).
- **Browser-IO-Helfer:** Fertige Helfer für Blob-Downloads, `<input type="file">`-Importe und direktes Speichern über die File System Access API (`FileSystemDirectoryHandle`).
