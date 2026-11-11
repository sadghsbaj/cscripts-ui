<script module lang="ts">
    export const id = "button-morph";
    export const label = "Button-Morph";
</script>

<script lang="ts">
    import { Check, Filter, Send, Sparkles, Trash2, TriangleAlert } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { ButtonMorph, ButtonMorphItem } from "cs/svelte/button-morph";
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
    import { ToggleButton, ToggleButtonIcon, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";

    let deleteMode = $state("idle");
    let iconMorphMode = $state("icon");
    let sizeMorphMode = $state("elevated");
    let publishStep = $state("idle");
    let closeMorphMode = $state("close");
    let toggleMorphMode = $state("draft");
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- 1. Inline Delete Confirm (Soft -> Solid + Auto-Reset) -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-220px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Inline Delete</h2>
                <span class="description-sm whitespace-nowrap">3s timeout, outside click & Escape</span>
            </div>

            <div class="w-full flex-center min-h-80px">
                <ButtonMorph bind:value={deleteMode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
                    <ButtonMorphItem value="idle">
                        <Button variant="soft" color="danger" size="md" onclick={() => (deleteMode = "confirm")}>
                            <ButtonIcon icon={Trash2} />
                            <ButtonLabel>Löschen</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>

                    <ButtonMorphItem value="confirm">
                        <Button variant="solid" color="danger" size="md" onclick={() => (deleteMode = "idle")}>
                            <ButtonIcon icon={TriangleAlert} />
                            <ButtonLabel>Wirklich löschen?</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>
                </ButtonMorph>
            </div>
        </div>

        <!-- 2. Icon-Only to Text Pill + Layout Sibling Glide -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-220px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Icon to Pill</h2>
                <span class="description-sm whitespace-nowrap">Pushes sibling smoothly on morph</span>
            </div>

            <div class="w-full flex-center gap-2 min-h-80px">
                <Button variant="soft" color="base" size="sm">
                    <ButtonLabel>Bearbeiten</ButtonLabel>
                </Button>

                <ButtonMorph bind:value={iconMorphMode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
                    <ButtonMorphItem value="icon">
                        <Button
                            variant="ghost"
                            color="base"
                            size="sm"
                            iconOnly
                            aria-label="Eintrag löschen"
                            onclick={() => (iconMorphMode = "confirm")}
                            {@attach tooltip("Löschen")}
                        >
                            <ButtonIcon icon={Trash2} />
                            <HitArea size="md" />
                        </Button>
                    </ButtonMorphItem>

                    <ButtonMorphItem value="confirm">
                        <Button variant="solid" color="danger" size="sm" onclick={() => (iconMorphMode = "icon")}>
                            <ButtonIcon icon={Trash2} />
                            <ButtonLabel>Löschen?</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>
                </ButtonMorph>
            </div>
        </div>

        <!-- 3. Cross-Size & Variant Morph (Elevated lg <-> Soft Accent sm) -->
        <div class="bg-elevation-0 p-8 min-h-220px flex flex-col justify-between items-start gap-6">
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Size & Surface</h2>
                <span class="description-sm whitespace-nowrap">Elevated lg to Soft Accent sm</span>
            </div>

            <div class="w-full flex-center min-h-80px">
                <ButtonMorph bind:value={sizeMorphMode} guardDelay={180}>
                    <ButtonMorphItem value="elevated">
                        <Button variant="elevated" size="lg" onclick={() => (sizeMorphMode = "active")}>
                            <ButtonIcon icon={Filter} />
                            <ButtonLabel>Filter</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>

                    <ButtonMorphItem value="active">
                        <Button variant="soft" color="accent" size="sm" onclick={() => (sizeMorphMode = "elevated")}>
                            <ButtonIcon icon={Check} />
                            <ButtonLabel>3 Filter aktiv</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>
                </ButtonMorph>
            </div>
        </div>

        <!-- 4. Multi-Step Flow (3 States: Idle -> Confirm -> Done) -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-220px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Multi-Step Flow</h2>
                <span class="description-sm whitespace-nowrap">3 states with directional roll</span>
            </div>

            <div class="w-full flex-center min-h-80px">
                <ButtonMorph bind:value={publishStep} resetTimeout={3500} resetOnOutsideClick resetOnEscape>
                    <ButtonMorphItem value="idle">
                        <Button variant="soft" color="base" size="md" onclick={() => (publishStep = "confirm")}>
                            <ButtonIcon icon={Send} />
                            <ButtonLabel>Veröffentlichen</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>

                    <ButtonMorphItem value="confirm">
                        <Button variant="solid" color="accent" size="md" onclick={() => (publishStep = "done")}>
                            <ButtonIcon icon={Sparkles} />
                            <ButtonLabel>Jetzt freigeben?</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>

                    <ButtonMorphItem value="done">
                        <Button variant="soft" color="accent" size="md" onclick={() => (publishStep = "idle")}>
                            <ButtonIcon icon={Check} />
                            <ButtonLabel>Veröffentlicht</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>
                </ButtonMorph>
            </div>
        </div>

        <!-- 5. CloseButton to Discard Confirmation -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-220px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Close to Discard</h2>
                <span class="description-sm whitespace-nowrap">CloseButton to Danger Button</span>
            </div>

            <div class="w-full flex-center min-h-80px">
                <ButtonMorph bind:value={closeMorphMode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
                    <ButtonMorphItem value="close">
                        <CloseButton variant="soft" size="md" onclick={() => (closeMorphMode = "discard")}>
                            <HitArea size="md" />
                        </CloseButton>
                    </ButtonMorphItem>

                    <ButtonMorphItem value="discard">
                        <Button variant="solid" color="danger" size="sm" onclick={() => (closeMorphMode = "close")}>
                            <ButtonLabel>Verwerfen?</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>
                </ButtonMorph>
            </div>
        </div>

        <!-- 6. ToggleButton to Action Button -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-220px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Toggle to Action</h2>
                <span class="description-sm whitespace-nowrap">ToggleButton to Solid Button</span>
            </div>

            <div class="w-full flex-center min-h-80px">
                <ButtonMorph bind:value={toggleMorphMode}>
                    <ButtonMorphItem value="draft">
                        <ToggleButton
                            variant="soft"
                            color="accent"
                            size="md"
                            pressed={false}
                            onclick={() => (toggleMorphMode = "ready")}
                        >
                            <ToggleButtonIcon icon={Sparkles} />
                            <ToggleButtonLabel>Entwurf aktivieren</ToggleButtonLabel>
                        </ToggleButton>
                    </ButtonMorphItem>

                    <ButtonMorphItem value="ready">
                        <Button variant="solid" color="accent" size="md" onclick={() => (toggleMorphMode = "draft")}>
                            <ButtonIcon icon={Check} />
                            <ButtonLabel>Aktiv</ButtonLabel>
                        </Button>
                    </ButtonMorphItem>
                </ButtonMorph>
            </div>
        </div>
    </div>
</div>
