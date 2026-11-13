<script module>
    export const id = "tooltip";
    export const label = "Tooltip";
</script>

<script lang="ts">
    import { Bold, Info, Italic, Plus, Settings, Share2, Trash2, Underline } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { ToggleButton, ToggleButtonIcon } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";
    import { Tooltip, tooltip, TooltipIcon, TooltipKbd, TooltipText } from "cs/svelte/tooltip";

    let activeFormatting = $state<string[]>(["bold"]);
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- Icon Buttons (Default Top Tooltips) -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Icon Buttons</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button
                    variant="tertiary"
                    size="md"
                    iconOnly
                    aria-label="Hinzufügen"
                    {@attach tooltip("Hinzufügen")}
                >
                    <ButtonIcon icon={Plus} />
                    <HitArea size="md" />
                </Button>

                <Button
                    variant="tertiary"
                    size="md"
                    iconOnly
                    aria-label="Löschen"
                    {@attach tooltip("Löschen")}
                >
                    <ButtonIcon icon={Trash2} />
                    <HitArea size="md" />
                </Button>

                <Button
                    variant="tertiary"
                    size="md"
                    iconOnly
                    aria-label="Einstellungen"
                    {@attach tooltip("Einstellungen")}
                >
                    <ButtonIcon icon={Settings} />
                    <HitArea size="md" />
                </Button>

                <Button variant="tertiary" size="md" iconOnly aria-label="Teilen" {@attach tooltip("Teilen")}>
                    <ButtonIcon icon={Share2} />
                    <HitArea size="md" />
                </Button>
            </div>
        </div>

        <!-- ToggleButtonGroup with Placements -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Toggle Group</h2>
            <div class="flex items-center">
                <ToggleButtonGroup type="multiple" orientation="horizontal" bind:value={activeFormatting}>
                    <ToggleButton
                        variant="soft"
                        color="accent"
                        size="md"
                        value="bold"
                        iconOnly
                        aria-label="Fett"
                        {@attach tooltip({ text: "Fett", shortcut: "Ctrl + B", placement: "top" })}
                    >
                        <ToggleButtonIcon icon={Bold} />
                        <HitArea size="md" />
                    </ToggleButton>

                    <ToggleButtonGroupSeparator />

                    <ToggleButton
                        variant="soft"
                        color="accent"
                        size="md"
                        value="italic"
                        iconOnly
                        aria-label="Kursiv"
                        {@attach tooltip({ text: "Kursiv", shortcut: "Ctrl + I", placement: "top" })}
                    >
                        <ToggleButtonIcon icon={Italic} />
                        <HitArea size="md" />
                    </ToggleButton>

                    <ToggleButtonGroupSeparator />

                    <ToggleButton
                        variant="soft"
                        color="accent"
                        size="md"
                        value="underline"
                        iconOnly
                        aria-label="Unterstrichen"
                        {@attach tooltip({ text: "Unterstrichen", shortcut: "Ctrl + U", placement: "top" })}
                    >
                        <ToggleButtonIcon icon={Underline} />
                        <HitArea size="md" />
                    </ToggleButton>
                </ToggleButtonGroup>
            </div>
        </div>

        <!-- Custom / Compound Tooltip -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Compound Tooltip</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button
                    variant="tertiary"
                    size="md"
                    {@attach tooltip({ target: "preview-rich-tooltip", placement: "top" })}
                >
                    <ButtonLabel>Props</ButtonLabel>
                </Button>
                <Tooltip id="preview-rich-tooltip" text="Speichern" icon={Info} shortcut="Ctrl + S" />

                <Button
                    variant="tertiary"
                    size="md"
                    {@attach tooltip({ target: "preview-compound-tooltip", placement: "top" })}
                >
                    <ButtonLabel>Compound</ButtonLabel>
                </Button>
                <Tooltip id="preview-compound-tooltip">
                    <TooltipIcon icon={Info} />
                    <TooltipText>Speichern</TooltipText>
                    <span class="cs-tooltip-shortcuts">
                        <TooltipKbd>Ctrl + S</TooltipKbd>
                    </span>
                </Tooltip>
            </div>
        </div>
    </div>
</div>
