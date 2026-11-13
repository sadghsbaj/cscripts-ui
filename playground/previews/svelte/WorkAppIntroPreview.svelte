<script module>
    export const id = "work-app-intro";
    export const label = "Work-App-Intro";
</script>

<script lang="ts">
    import { Check, Truck } from "@lucide/svelte";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { WorkAppIntro } from "cs/svelte/work";

    const sampleShipments = [
        {
            id: "FR-8492",
            plant: "Neumarkt",
            carrier: "Spedition Holzner GmbH",
            assortment: "Fichte Industrieholz IS N",
            volume: "42,5 Fm",
            status: "Freigegeben",
        },
        {
            id: "FR-8495",
            plant: "Baruth",
            carrier: "Forstlogistik Brandenburg",
            assortment: "Kiefer Industrieholz",
            volume: "38,0 Fm",
            status: "Geprüft",
        },
        {
            id: "FR-8501",
            plant: "Arnsberg",
            carrier: "Sauerland Agrar & Forst",
            assortment: "Buche Industrieholz",
            volume: "29,8 Fm",
            status: "Freigegeben",
        },
        {
            id: "FR-8508",
            plant: "Gütersloh",
            carrier: "Westfalen Timber Transit",
            assortment: "Recyclingholz A1-A2",
            volume: "51,2 t",
            status: "In Prüfung",
        },
        {
            id: "FR-8514",
            plant: "Leutkirch",
            carrier: "Allgäu Forsttransporte",
            assortment: "Tanne / Fichte Frischholz",
            volume: "44,0 Fm",
            status: "Freigegeben",
        },
    ] as const;
</script>

<WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen" persist={false}>
    <div class="relative w-full max-w-6xl mx-auto flex flex-col gap-6">
        <!-- Island 1: Intro-Steuerung & Test-Kontrollen -->
        <section class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-6 lg:p-8 flex flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <h2 class="title-2xl">Intro-Choreografie Simulator</h2>
            </div>
        </section>

        <!-- Island 2: Simulierte Arbeitsoberfläche (Fracht-Automatisierung) -->
        <section class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-6 lg:p-8 flex flex-col gap-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-col gap-1">
                    <h3 class="title-xl">Aktive Werkszufuhren & Frachtbelege</h3>
                </div>

                <div class="bg-elevation-2 rounded-full squircle-smooth p-1 flex flex-wrap items-center gap-1">
                    {#each ["Alle Werke", "Neumarkt", "Baruth", "Gütersloh", "Arnsberg", "Leutkirch"] as filterOption (filterOption)}
                        <Button size="xs" variant="tertiary">
                            <ButtonLabel>{filterOption}</ButtonLabel>
                        </Button>
                    {/each}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-elevation-2 rounded-2xl squircle-smooth p-5 flex flex-col gap-1">
                    <span class="description-xs">Heutiges Frachtvolumen</span>
                    <span class="title-2xl">205,5 Fm</span>
                </div>
                <div class="bg-elevation-2 rounded-2xl squircle-smooth p-5 flex flex-col gap-1">
                    <span class="description-xs">Verbundene Werke</span>
                    <span class="title-2xl">5 Standorte aktiv</span>
                </div>
                <div class="bg-elevation-2 rounded-2xl squircle-smooth p-5 flex flex-col gap-1">
                    <span class="description-xs">Automatisierungs-Status</span>
                    <div class="flex items-center gap-2">
                        <Check class="size-18px text-success-soft-fg" strokeWidth={2.5} />
                        <span class="title-lg">SAP-Abgleich synchron</span>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                {#each sampleShipments as item (item.id)}
                    <div
                        class="bg-elevation-2 rounded-2xl squircle-smooth px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
                    >
                        <div class="flex items-center gap-3.5">
                            <Truck class="size-18px text-weak shrink-0" strokeWidth={2} />
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="label-sm">{item.plant}</span>
                                    <span class="dot-sm"></span>
                                    <span class="description-xs">{item.id}</span>
                                </div>
                                <span class="description-sm">{item.assortment}</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-4">
                            <span class="description-sm">{item.carrier}</span>
                            <span class="label-sm">{item.volume}</span>
                            <span
                                class="px-3 py-1 rounded-full squircle-smooth text-xs font-500 {item.status ===
                                'Freigegeben'
                                    ? 'bg-success-soft text-success-soft-fg'
                                    : 'bg-base-soft text-base-soft-fg'}"
                            >
                                {item.status}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    </div>
</WorkAppIntro>
