<script module lang="ts">
    export const id = "focus-trap";
    export const label = "Focus-Trap";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { CloseButton } from "cs/svelte/close-button";
    import { focusTrap } from "cs/svelte/focus";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";

    let isStandardOpen = $state(false);
    let isTargetOpen = $state(false);
    let isParentOpen = $state(false);
    let isChildOpen = $state(false);
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- 1. Standard Dialog Trap -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Standard Modal</h2>
                <span class="description-sm whitespace-nowrap">Tab-Zyklus & Escape-Handler</span>
            </div>

            <div class="w-full flex-center min-h-100px">
                <Button variant="primary" size="md" onclick={() => (isStandardOpen = true)}>
                    <ButtonLabel>Modal öffnen</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 2. Targeted Initial Focus -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Targeted Initial Focus</h2>
                <span class="description-sm whitespace-nowrap">initialFocus: "#danger-confirm"</span>
            </div>

            <div class="w-full flex-center min-h-100px">
                <Button variant="secondary" danger size="md" onclick={() => (isTargetOpen = true)}>
                    <ButtonLabel>Löschen bestätigen</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 3. Nested Trap Stack -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Nested Traps</h2>
                <span class="description-sm whitespace-nowrap">Automatischer Trap-Stack</span>
            </div>

            <div class="w-full flex-center min-h-100px">
                <Button variant="tertiary" size="md" onclick={() => (isParentOpen = true)}>
                    <ButtonLabel>Multi-Level öffnen</ButtonLabel>
                </Button>
            </div>
        </div>
    </div>
</div>

<!-- 1. Standard Modal Overlay -->
{#if isStandardOpen}
    <Overlay variant="blur" onclick={() => (isStandardOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Einstellungen"
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-6 flex flex-col gap-6 w-full max-w-400px relative"
            {@attach focusTrap({
                initialFocus: "first-focusable",
                onEscape: () => (isStandardOpen = false),
                allowOutsideClick: true,
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl">Einstellungen</h3>
                <CloseButton
                    variant="soft"
                    size="sm"
                    onclick={() => (isStandardOpen = false)}
                    class="absolute top-6 right-6"
                >
                    <HitArea size="md" />
                </CloseButton>
            </div>

            <div class="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Benutzername"
                    class="bg-elevation-2 rounded-full squircle-smooth px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                />
                <input
                    type="password"
                    placeholder="Passwort"
                    class="bg-elevation-2 rounded-full squircle-smooth px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                />
            </div>

            <div class="flex justify-end gap-3 w-full">
                <Button variant="tertiary" size="md" onclick={() => (isStandardOpen = false)}>
                    <ButtonLabel>Abbrechen</ButtonLabel>
                </Button>
                <Button variant="primary" size="md" onclick={() => (isStandardOpen = false)}>
                    <ButtonLabel>Speichern</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}

<!-- 2. Targeted Initial Focus Overlay -->
{#if isTargetOpen}
    <Overlay variant="dim" onclick={() => (isTargetOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Löschen bestätigen"
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-6 flex flex-col gap-6 w-full max-w-380px relative"
            {@attach focusTrap({
                initialFocus: "#danger-confirm",
                onEscape: () => (isTargetOpen = false),
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl">Wirklich löschen?</h3>
                <CloseButton
                    variant="soft"
                    size="sm"
                    onclick={() => (isTargetOpen = false)}
                    class="absolute right-4 top-4"
                >
                    <HitArea size="md" />
                </CloseButton>
            </div>

            <p class="description-sm">
                Dieser Eintrag wird unwiderruflich gelöscht. Der Fokus liegt initial direkt auf dem roten Button.
            </p>

            <div class="flex justify-end gap-3 w-full">
                <Button variant="tertiary" size="md" onclick={() => (isTargetOpen = false)}>
                    <ButtonLabel>Abbrechen</ButtonLabel>
                </Button>
                <Button
                    id="danger-confirm"
                    variant="primary"
                    danger
                    size="md"
                    onclick={() => (isTargetOpen = false)}
                >
                    <ButtonLabel>Löschen</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}

<!-- 3. Nested Trap Overlays -->
{#if isParentOpen}
    <Overlay variant="dim" onclick={() => (isParentOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Ebene 1 Modal"
            class="bg-elevation-1 shadow-elevation-2 rounded-3xl squircle p-6 flex flex-col gap-6 w-full max-w-440px relative"
            {@attach focusTrap({
                initialFocus: "first-focusable",
                onEscape: () => (isParentOpen = false),
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl">Ebene 1: Haupt-Dialog</h3>
                <CloseButton
                    variant="soft"
                    size="sm"
                    onclick={() => (isParentOpen = false)}
                    class="absolute top-6 right-6"
                >
                    <HitArea size="md" />
                </CloseButton>
            </div>

            <p class="description-sm">
                Wenn du den Sub-Dialog öffnest, pausiert Ebene 1 automatisch und reaktiviert sich beim Schließen.
            </p>

            <div class="flex justify-between items-center w-full">
                <Button variant="secondary" size="sm" onclick={() => (isChildOpen = true)}>
                    <ButtonLabel>Ebene 2 öffnen</ButtonLabel>
                </Button>
                <Button variant="tertiary" size="md" onclick={() => (isParentOpen = false)}>
                    <ButtonLabel>Schließen</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}

{#if isChildOpen}
    <Overlay variant="blur" onclick={() => (isChildOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Ebene 2 Sub-Dialog"
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 flex flex-col gap-6 w-full max-w-360px relative"
            {@attach focusTrap({
                initialFocus: "first-focusable",
                onEscape: () => (isChildOpen = false),
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl">Ebene 2: Sub-Dialog</h3>
                <CloseButton
                    variant="ghost"
                    size="sm"
                    onclick={() => (isChildOpen = false)}
                    class="absolute top-6 right-6"
                >
                    <HitArea size="sm" />
                </CloseButton>
            </div>

            <p class="description-sm">Fokus ist jetzt hier gefangen. Escape schließt nur diesen Sub-Dialog.</p>

            <div class="flex justify-end gap-3 w-full">
                <Button variant="primary" size="sm" onclick={() => (isChildOpen = false)}>
                    <ButtonLabel>Fertig</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}
