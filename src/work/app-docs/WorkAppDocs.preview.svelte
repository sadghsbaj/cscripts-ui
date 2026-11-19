<script module lang="ts">
    import { BookOpen, FolderCheck, FolderOpen, Keyboard, ShieldAlert, ShieldCheck, Table2 } from "@lucide/svelte";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import {
        WorkAppDocs,
        WorkAppDocsCallout,
        WorkAppDocsCard,
        WorkAppDocsCardGrid,
        WorkAppDocsChapter,
        WorkAppDocsCode,
        WorkAppDocsContent,
        WorkAppDocsHeader,
        WorkAppDocsKbd,
        WorkAppDocsMark,
        WorkAppDocsSection,
        WorkAppDocsTable,
        WorkAppDocsTableBody,
        WorkAppDocsTableCell,
        WorkAppDocsTableHead,
        WorkAppDocsTableHeaderCell,
        WorkAppDocsTableRow,
        WorkAppDocsTabs,
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppIntro,
        WorkAppMain,
        WorkAppStatusDot,
        WorkAppThemeButton,
    } from "cs/svelte/work";

    export const id = "work-app-docs";
    export const label = "App-Docs";
</script>

<div class="fixed inset-0">
    <WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen" persist={false}>
        <ScrollArea size="lg" direction="vertical" class="size-full">
            <ScrollAreaContent {@attach scrollFade({ size: "lg", direction: "vertical", edges: "both" })}>
                <WorkAppFrame>
                    <WorkAppHeader>
                        <WorkAppHeaderSegment align="before" renderIsland>
                            <WorkAppStatusDot status="positive" />
                        </WorkAppHeaderSegment>

                        <WorkAppHeaderSegment align="end">
                            <WorkAppHelpButton aria-pressed="true" />
                            <WorkAppThemeButton />
                        </WorkAppHeaderSegment>
                    </WorkAppHeader>

                    <WorkAppMain>
                        <WorkAppDocs>
                            <WorkAppDocsHeader
                                title="Holzanalysen"
                                lead="Labor- und Eingangsproben erfassen, prüfen und zuverlässig im lokalen Arbeitsordner exportieren."
                            />

                            <WorkAppDocsTabs />

                            <WorkAppDocsContent>
                                <WorkAppDocsChapter
                                    id="einstieg"
                                    title="Einstieg"
                                    icon={BookOpen}
                                    lead="Die Anwendung arbeitet direkt im lokalen Arbeitsverzeichnis – ohne Zwischenspeicherung auf externen Servern."
                                >
                                    <p>
                                        Beim ersten Start wird die Anwendung einmalig mit dem lokalen
                                        <WorkAppDocsMark>Arbeitsordner</WorkAppDocsMark> verknüpft. Alle Messreihen,
                                        Freigaben und Berichte landen dort direkt als strukturierte Dateien.
                                    </p>

                                    <ol>
                                        <li>
                                            Ordnermenü über den Statuspunkt in der Kopfleiste öffnen und auf
                                            <WorkAppDocsMark>Ordner wählen</WorkAppDocsMark> klicken.
                                        </li>
                                        <li>
                                            Das freigegebene Netzlaufwerk oder einen lokalen Projektordner wie
                                            <WorkAppDocsCode>Holzanalysen-Daten</WorkAppDocsCode> auswählen.
                                        </li>
                                        <li>
                                            Schreibberechtigung im Browserdialog bestätigen. Danach steht die Erfassung
                                            sofort bereit.
                                        </li>
                                    </ol>

                                    <WorkAppDocsCallout variant="note" title="Automatische Sicherung">
                                        <p>
                                            Änderungen an offenen Proben werden unmittelbar nach jeder Eingabe in
                                            <WorkAppDocsCode>proben-2026.csv</WorkAppDocsCode> fortgeschrieben.
                                        </p>
                                    </WorkAppDocsCallout>
                                </WorkAppDocsChapter>

                                <WorkAppDocsChapter id="arbeitsweise" title="Arbeitsweise" icon={FolderOpen}>
                                    <p>
                                        Für den täglichen Betrieb stehen drei geprüfte Kernfunktionen bereit, die auch
                                        ohne aktive Internetverbindung stabil funktionieren:
                                    </p>

                                    <WorkAppDocsCardGrid>
                                        <WorkAppDocsCard
                                            icon={FolderCheck}
                                            title="Direkter Dateizugriff"
                                            description="Alle Eingangsproben liegen lesbar im gewählten Ordner und lassen sich jederzeit extern sichern."
                                        />
                                        <WorkAppDocsCard
                                            icon={ShieldCheck}
                                            title="Plausibilitätsprüfung"
                                            description="Grenzwerte für Feuchte und Rohdichte werden bereits bei der Erfassung markiert."
                                        />
                                        <WorkAppDocsCard
                                            icon={Keyboard}
                                            title="Schnelle Erfassung"
                                            description="Durchgängige Tastatursteuerung ermöglicht das zügige Abtippen von Wiegescheinen."
                                        />
                                    </WorkAppDocsCardGrid>

                                    <WorkAppDocsSection id="erfassung" title="Proben erfassen & prüfen" level={3}>
                                        <p>
                                            Jede Anlieferung wird mit Lieferscheinnummer, Holzart und gemessener
                                            Eingangsfeuchte erfasst. Über die
                                            <WorkAppDocsMark>Tastenkürzel</WorkAppDocsMark> wechselst du ohne Maus
                                            zwischen Tabellenzeilen und Prüfnotizen.
                                        </p>

                                        <WorkAppDocsCallout variant="tip" title="Schneller Chargenwechsel">
                                            <p>
                                                Mit <WorkAppDocsKbd>Alt</WorkAppDocsKbd> +
                                                <WorkAppDocsKbd>N</WorkAppDocsKbd> legst du direkt eine neue Probe mit
                                                übernommenem Lieferanten an.
                                            </p>
                                        </WorkAppDocsCallout>
                                    </WorkAppDocsSection>
                                </WorkAppDocsChapter>

                                <WorkAppDocsChapter id="referenz" title="Referenz" icon={Table2}>
                                    <p>
                                        Vor dem Export prüft das System jede Charge anhand der hinterlegten
                                        Werksvorgaben. Abweichende Werte werden mit
                                        <WorkAppDocsMark tone="caution">Nachprüfung erforderlich</WorkAppDocsMark>
                                        gekennzeichnet.
                                    </p>

                                    <ul>
                                        <li>
                                            <strong>Eingangsfeuchte:</strong> Werte über 65 % werden gelb hervorgehoben
                                            und erfordern eine Zweitmessung.
                                        </li>
                                        <li>
                                            <strong>Probennummer:</strong> Muss eindeutig je Liefertag und Werk vergeben
                                            sein.
                                        </li>
                                        <li>
                                            <strong>Sperrvermerk:</strong> Bei überschrittenem Rinden- oder
                                            Fremdstoffanteil wird die Charge für den Export gesperrt, bis eine
                                            Laborfreigabe vorliegt.
                                        </li>
                                    </ul>

                                    <WorkAppDocsTable caption="Hinterlegte Werksvorgaben für Eingangsproben">
                                        <WorkAppDocsTableHead>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableHeaderCell>Prüfmerkmal</WorkAppDocsTableHeaderCell>
                                                <WorkAppDocsTableHeaderCell>Regelbereich</WorkAppDocsTableHeaderCell>
                                                <WorkAppDocsTableHeaderCell align="end">Warngrenze</WorkAppDocsTableHeaderCell>
                                            </WorkAppDocsTableRow>
                                        </WorkAppDocsTableHead>
                                        <WorkAppDocsTableBody>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableCell>Eingangsfeuchte</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell>35 – 60 %</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell align="end">&gt; 65 %</WorkAppDocsTableCell>
                                            </WorkAppDocsTableRow>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableCell>Rohdichte (atro)</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell>380 – 520 kg/m³</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell align="end">&lt; 360 kg/m³</WorkAppDocsTableCell>
                                            </WorkAppDocsTableRow>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableCell>Rindenanteil</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell>0,0 – 4,0 %</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell align="end">&gt; 5,0 %</WorkAppDocsTableCell>
                                            </WorkAppDocsTableRow>
                                        </WorkAppDocsTableBody>
                                    </WorkAppDocsTable>

                                    <WorkAppDocsSection id="tagesbericht" title="Tagesbericht erzeugen" level={3}>
                                        <p>
                                            Beim Export schreibt die Anwendung eine bereinigte Arbeitsmappe nach
                                            <WorkAppDocsCode>/export/tagesbericht.xlsx</WorkAppDocsCode> und legt eine
                                            unveränderte Rohdaten-Kopie im Unterordner
                                            <WorkAppDocsCode>/archiv</WorkAppDocsCode> ab.
                                        </p>
                                    </WorkAppDocsSection>
                                </WorkAppDocsChapter>

                                <WorkAppDocsChapter id="tastenkuerzel" title="Tastenkürzel" icon={Keyboard}>
                                    <p>
                                        Alle häufigen Arbeitsschritte lassen sich ohne Maus bedienen. Weitere Hinweise
                                        stehen im Kapitel <WorkAppDocsMark>Browser-Freigabe</WorkAppDocsMark>.
                                    </p>

                                    <WorkAppDocsTable caption="Übersicht der Tastenkürzel im Erfassungsmodus">
                                        <WorkAppDocsTableHead>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableHeaderCell>Aktion</WorkAppDocsTableHeaderCell>
                                                <WorkAppDocsTableHeaderCell>Bereich</WorkAppDocsTableHeaderCell>
                                                <WorkAppDocsTableHeaderCell align="end">Kürzel</WorkAppDocsTableHeaderCell>
                                            </WorkAppDocsTableRow>
                                        </WorkAppDocsTableHead>
                                        <WorkAppDocsTableBody>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableCell>Änderungen speichern</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell>Erfassung</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell align="end">
                                                    <WorkAppDocsKbd>Strg</WorkAppDocsKbd> + <WorkAppDocsKbd>S</WorkAppDocsKbd>
                                                </WorkAppDocsTableCell>
                                            </WorkAppDocsTableRow>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableCell>Neue Probe anlegen</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell>Liste</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell align="end">
                                                    <WorkAppDocsKbd>Alt</WorkAppDocsKbd> + <WorkAppDocsKbd>N</WorkAppDocsKbd>
                                                </WorkAppDocsTableCell>
                                            </WorkAppDocsTableRow>
                                            <WorkAppDocsTableRow>
                                                <WorkAppDocsTableCell>Hilfe ein- oder ausblenden</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell>Global</WorkAppDocsTableCell>
                                                <WorkAppDocsTableCell align="end">
                                                    <WorkAppDocsKbd>F1</WorkAppDocsKbd>
                                                </WorkAppDocsTableCell>
                                            </WorkAppDocsTableRow>
                                        </WorkAppDocsTableBody>
                                    </WorkAppDocsTable>
                                </WorkAppDocsChapter>

                                <WorkAppDocsChapter id="freigabe" title="Browser-Freigabe" icon={ShieldAlert}>
                                    <p>
                                        Aus Sicherheitsgründen verwaltet der Browser den Zugriff auf lokale Verzeichnisse
                                        pro Sitzung. Nach einem vollständigen Neustart bleibt die Ordnerverknüpfung
                                        zwar sichtbar, muss aber einmalig bestätigt werden.
                                    </p>

                                    <WorkAppDocsCallout variant="caution" title="Berechtigung nach Neustart">
                                        <p>
                                            Falls der Statuspunkt in der Kopfleiste gelb pulsiert, auf
                                            <WorkAppDocsMark tone="caution">Freigabe erneuern</WorkAppDocsMark> klicken,
                                            um den Schreibzugriff wiederherzustellen.
                                        </p>
                                    </WorkAppDocsCallout>
                                </WorkAppDocsChapter>
                            </WorkAppDocsContent>
                        </WorkAppDocs>
                    </WorkAppMain>
                </WorkAppFrame>
            </ScrollAreaContent>
        </ScrollArea>
    </WorkAppIntro>
</div>
