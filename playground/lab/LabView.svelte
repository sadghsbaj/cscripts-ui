<script lang="ts">
    import { Trash2 } from "@lucide/svelte";
    import { SvelteSet } from "svelte/reactivity";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { CopyIcon, copyOnClick } from "cs/svelte/clipboard";
    import { HitArea } from "cs/svelte/hit-area";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { theme } from "cs/svelte/theme";
    import { ToggleButton, ToggleButtonIcon } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";
    import NumberStepperLab from "./NumberStepperLab.svelte";

    let selectMode = $state(false);
    const rejectedIds = new SvelteSet<string>();

    function toggleReject(id: string): void {
        if (rejectedIds.has(id)) {
            rejectedIds.delete(id);
        } else {
            rejectedIds.add(id);
        }
    }

    function getRejectedJson(): string {
        return JSON.stringify(
            {
                count: rejectedIds.size,
                remove: [...rejectedIds],
            },
            null,
            2
        );
    }
</script>

<div class="size-full relative bg-canvas">
    <div class="fixed right-8 top-8 z-100 flex items-center gap-2">
        <ToggleButton
            size="md"
            variant="soft"
            color="negative"
            iconOnly
            bind:pressed={selectMode}
            aria-label="Aussortier-Layer umschalten"
            {@attach tooltip({
                text: selectMode ? "Aussortier-Modus aktiv (Klick markiert)" : "Aussortier-Modus einschalten",
            })}
        >
            <ToggleButtonIcon icon={Trash2} />
            <HitArea size="md" />
        </ToggleButton>

        <Button
            size="md"
            variant="elevated"
            iconOnly
            aria-label="Ausgewählte Varianten als JSON kopieren"
            {@attach copyOnClick({ text: getRejectedJson })}
            {@attach tooltip({ text: `Auswahl als JSON kopieren (${rejectedIds.size})` })}
        >
            <CopyIcon />
            <HitArea size="md" />
        </Button>

        <Button
            size="md"
            variant="elevated"
            iconOnly
            aria-label="Theme wechseln"
            onclick={() => theme.toggle()}
            {@attach tooltip({ text: `Theme: ${theme.resolved}` })}
        >
            <ButtonIcon icon={theme.resolvedIcon} />
            <HitArea size="md" />
        </Button>
    </div>

    <ScrollArea size="lg" direction="vertical" class="size-full">
        <ScrollAreaContent class="p-8 lg:p-16">
            <div class="min-h-full w-full flex-center flex-col gap-8">
                <NumberStepperLab {selectMode} {rejectedIds} onToggleReject={toggleReject} />
            </div>
        </ScrollAreaContent>
    </ScrollArea>
</div>
