<script module lang="ts">
    export const id = "auto-focus";
    export const label = "Auto-Focus";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { autoFocus } from "cs/svelte/focus";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";

    let showSelectAll = $state(true);
    let showContainerForm = $state(false);
    let showCursorEnd = $state(false);
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- 1. Select All on Mount -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Select All</h2>
                <span class="description-sm whitespace-nowrap">Text direkt vollständig markiert</span>
            </div>

            <div class="w-full flex flex-col gap-3 min-h-100px justify-center">
                {#if showSelectAll}
                    <input
                        type="text"
                        value="https://cscripts.dev/components"
                        class="bg-sunken rounded-xl squircle px-3.5 h-36px w-full text-sm outline-none text-main focus-visible:ring-2 focus-visible:ring-accent-500"
                        {@attach autoFocus({ select: "all" })}
                    />
                {:else}
                    <div class="h-36px flex items-center text-weak text-sm">Unmounted</div>
                {/if}

                <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => {
                        showSelectAll = false;
                        setTimeout(() => (showSelectAll = true), 50);
                    }}
                >
                    <ButtonLabel>Remount</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 2. Container Target (First Interactive Child) -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Container Target</h2>
                <span class="description-sm whitespace-nowrap">Fokussiert erstes Kind im Formular</span>
            </div>

            <div class="w-full flex flex-col gap-3 min-h-100px justify-center">
                <ToggleButton
                    variant="soft"
                    color="accent"
                    size="sm"
                    bind:pressed={showContainerForm}
                >
                    <ToggleButtonLabel>{showContainerForm ? "Formular schließen" : "Formular öffnen"}</ToggleButtonLabel>
                </ToggleButton>

                {#if showContainerForm}
                    <div
                        class="bg-sunken rounded-2xl squircle p-4 flex flex-col gap-3 w-full"
                        {@attach autoFocus("first-focusable")}
                    >
                        <input
                            type="text"
                            placeholder="Vorname (fokussiert)"
                            class="bg-elevated rounded-xl squircle px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                        />
                        <input
                            type="text"
                            placeholder="Nachname"
                            class="bg-elevated rounded-xl squircle px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                        />
                    </div>
                {/if}
            </div>
        </div>

        <!-- 3. Cursor End & Restore Focus -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Cursor at End</h2>
                <span class="description-sm whitespace-nowrap">Cursor am Ende & Restore Fokus</span>
            </div>

            <div class="w-full flex flex-col gap-3 min-h-100px justify-center">
                <ToggleButton
                    variant="soft"
                    color="accent"
                    size="sm"
                    bind:pressed={showCursorEnd}
                >
                    <ToggleButtonLabel>{showCursorEnd ? "Notiz schließen" : "Notiz öffnen"}</ToggleButtonLabel>
                </ToggleButton>

                {#if showCursorEnd}
                    <input
                        type="text"
                        value="#todo: "
                        class="bg-sunken rounded-xl squircle px-3.5 h-36px w-full text-sm outline-none text-main focus-visible:ring-2 focus-visible:ring-accent-500"
                        {@attach autoFocus({ select: "end", restoreFocus: true })}
                    />
                {/if}
            </div>
        </div>
    </div>
</div>
