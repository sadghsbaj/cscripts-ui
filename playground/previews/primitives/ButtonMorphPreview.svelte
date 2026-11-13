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
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../components/index.ts";

    let deleteMode = $state("idle");
    let iconMorphMode = $state("icon");
    let sizeMorphMode = $state("elevated");
    let publishStep = $state("idle");
    let closeMorphMode = $state("close");
    let toggleMorphMode = $state("draft");

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Trash2, TriangleAlert } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { ButtonMorph, ButtonMorphItem } from "cs/svelte/button-morph";

    let mode = $state("idle");
${closeScript}

<ButtonMorph bind:value={mode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
    <ButtonMorphItem value="idle">
        <Button variant="secondary" danger size="md" onclick={() => (mode = "confirm")}>
            <ButtonIcon icon={Trash2} />
            <ButtonLabel>Delete</ButtonLabel>
        </Button>
    </ButtonMorphItem>

    <ButtonMorphItem value="confirm">
        <Button variant="primary" danger size="md" onclick={() => (mode = "idle")}>
            <ButtonIcon icon={TriangleAlert} />
            <ButtonLabel>Confirm delete?</ButtonLabel>
        </Button>
    </ButtonMorphItem>
</ButtonMorph>`;

    const siblingCode = `<Button variant="tertiary" size="sm">
    <ButtonLabel>Edit</ButtonLabel>
</Button>

<ButtonMorph bind:value={mode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
    <ButtonMorphItem value="icon">
        <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Delete item"
            onclick={() => (mode = "confirm")}
            {@attach tooltip("Delete")}
        >
            <ButtonIcon icon={Trash2} />
            <HitArea size="md" />
        </Button>
    </ButtonMorphItem>

    <ButtonMorphItem value="confirm">
        <Button variant="primary" danger size="sm" onclick={() => (mode = "icon")}>
            <ButtonIcon icon={Trash2} />
            <ButtonLabel>Delete?</ButtonLabel>
        </Button>
    </ButtonMorphItem>
</ButtonMorph>`;

    const surfaceCode = `<ButtonMorph bind:value={mode} guardDelay={180}>
    <ButtonMorphItem value="elevated">
        <Button variant="elevated" size="lg" onclick={() => (mode = "active")}>
            <ButtonIcon icon={Filter} />
            <ButtonLabel>Filter</ButtonLabel>
        </Button>
    </ButtonMorphItem>

    <ButtonMorphItem value="active">
        <Button variant="secondary" size="sm" onclick={() => (mode = "elevated")}>
            <ButtonIcon icon={Check} />
            <ButtonLabel>3 filters active</ButtonLabel>
        </Button>
    </ButtonMorphItem>
</ButtonMorph>`;

    const multiStepCode = `<ButtonMorph bind:value={step} resetTimeout={3500} resetOnOutsideClick resetOnEscape>
    <ButtonMorphItem value="idle">
        <Button variant="tertiary" size="md" onclick={() => (step = "confirm")}>
            <ButtonIcon icon={Send} />
            <ButtonLabel>Publish</ButtonLabel>
        </Button>
    </ButtonMorphItem>
    <ButtonMorphItem value="confirm">
        <Button variant="primary" size="md" onclick={() => (step = "done")}>
            <ButtonIcon icon={Sparkles} />
            <ButtonLabel>Publish now?</ButtonLabel>
        </Button>
    </ButtonMorphItem>
    <ButtonMorphItem value="done">
        <Button variant="secondary" size="md" onclick={() => (step = "idle")}>
            <ButtonIcon icon={Check} />
            <ButtonLabel>Published</ButtonLabel>
        </Button>
    </ButtonMorphItem>
</ButtonMorph>`;

    const mixedCode = `<ButtonMorph bind:value={mode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
    <ButtonMorphItem value="close">
        <CloseButton variant="soft" size="md" onclick={() => (mode = "discard")}>
            <HitArea size="md" />
        </CloseButton>
    </ButtonMorphItem>

    <ButtonMorphItem value="discard">
        <Button variant="primary" danger size="sm" onclick={() => (mode = "close")}>
            <ButtonLabel>Discard?</ButtonLabel>
        </Button>
    </ButtonMorphItem>
</ButtonMorph>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="ButtonMorph"
        description="Spring-interpolated surface morphing between button states, sizes, and primitives."
    />

    <PreviewSection
        title="Inline Delete Confirmation"
        description="Automatically resets after 3s, on outside click, or on Escape."
        code={basicCode}
    >
        <ButtonMorph bind:value={deleteMode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
            <ButtonMorphItem value="idle">
                <Button variant="secondary" danger size="md" onclick={() => (deleteMode = "confirm")}>
                    <ButtonIcon icon={Trash2} />
                    <ButtonLabel>Delete</ButtonLabel>
                </Button>
            </ButtonMorphItem>

            <ButtonMorphItem value="confirm">
                <Button variant="primary" danger size="md" onclick={() => (deleteMode = "idle")}>
                    <ButtonIcon icon={TriangleAlert} />
                    <ButtonLabel>Confirm delete?</ButtonLabel>
                </Button>
            </ButtonMorphItem>
        </ButtonMorph>
    </PreviewSection>

    <PreviewSection
        title="Icon to Pill & Sibling Glide"
        description="Smoothly pushes adjacent controls as an icon-only button expands into a confirmation pill."
        code={siblingCode}
    >
        <div class="flex items-center gap-2">
            <Button variant="tertiary" size="sm">
                <ButtonLabel>Edit</ButtonLabel>
            </Button>

            <ButtonMorph bind:value={iconMorphMode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
                <ButtonMorphItem value="icon">
                    <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Delete item"
                        onclick={() => (iconMorphMode = "confirm")}
                        {@attach tooltip("Delete")}
                    >
                        <ButtonIcon icon={Trash2} />
                        <HitArea size="md" />
                    </Button>
                </ButtonMorphItem>

                <ButtonMorphItem value="confirm">
                    <Button variant="primary" danger size="sm" onclick={() => (iconMorphMode = "icon")}>
                        <ButtonIcon icon={Trash2} />
                        <ButtonLabel>Delete?</ButtonLabel>
                    </Button>
                </ButtonMorphItem>
            </ButtonMorph>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Cross-Size & Surface Morph"
        description="Interpolates dimensions, radii, and elevation between elevated lg and secondary sm."
        code={surfaceCode}
    >
        <SunkenWell>
            <ButtonMorph bind:value={sizeMorphMode} guardDelay={180}>
                <ButtonMorphItem value="elevated">
                    <Button variant="elevated" size="lg" onclick={() => (sizeMorphMode = "active")}>
                        <ButtonIcon icon={Filter} />
                        <ButtonLabel>Filter</ButtonLabel>
                    </Button>
                </ButtonMorphItem>

                <ButtonMorphItem value="active">
                    <Button variant="secondary" size="sm" onclick={() => (sizeMorphMode = "elevated")}>
                        <ButtonIcon icon={Check} />
                        <ButtonLabel>3 filters active</ButtonLabel>
                    </Button>
                </ButtonMorphItem>
            </ButtonMorph>
        </SunkenWell>
    </PreviewSection>

    <PreviewSection
        title="Multi-Step Flow"
        description="Transitions sequentially across three distinct states with directional roll."
        code={multiStepCode}
    >
        <ButtonMorph bind:value={publishStep} resetTimeout={3500} resetOnOutsideClick resetOnEscape>
            <ButtonMorphItem value="idle">
                <Button variant="tertiary" size="md" onclick={() => (publishStep = "confirm")}>
                    <ButtonIcon icon={Send} />
                    <ButtonLabel>Publish</ButtonLabel>
                </Button>
            </ButtonMorphItem>

            <ButtonMorphItem value="confirm">
                <Button variant="primary" size="md" onclick={() => (publishStep = "done")}>
                    <ButtonIcon icon={Sparkles} />
                    <ButtonLabel>Publish now?</ButtonLabel>
                </Button>
            </ButtonMorphItem>

            <ButtonMorphItem value="done">
                <Button variant="secondary" size="md" onclick={() => (publishStep = "idle")}>
                    <ButtonIcon icon={Check} />
                    <ButtonLabel>Published</ButtonLabel>
                </Button>
            </ButtonMorphItem>
        </ButtonMorph>
    </PreviewSection>

    <PreviewSection
        title="Mixed Primitives"
        description="Morph seamlessly between CloseButton, ToggleButton, and standard Button controls."
        code={mixedCode}
    >
        <div class="flex flex-wrap items-center gap-8">
            <ButtonMorph bind:value={closeMorphMode} resetTimeout={3000} resetOnOutsideClick resetOnEscape>
                <ButtonMorphItem value="close">
                    <CloseButton variant="soft" size="md" onclick={() => (closeMorphMode = "discard")}>
                        <HitArea size="md" />
                    </CloseButton>
                </ButtonMorphItem>

                <ButtonMorphItem value="discard">
                    <Button variant="primary" danger size="sm" onclick={() => (closeMorphMode = "close")}>
                        <ButtonLabel>Discard?</ButtonLabel>
                    </Button>
                </ButtonMorphItem>
            </ButtonMorph>

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
                        <ToggleButtonLabel>Enable draft</ToggleButtonLabel>
                    </ToggleButton>
                </ButtonMorphItem>

                <ButtonMorphItem value="ready">
                    <Button variant="primary" size="md" onclick={() => (toggleMorphMode = "draft")}>
                        <ButtonIcon icon={Check} />
                        <ButtonLabel>Active</ButtonLabel>
                    </Button>
                </ButtonMorphItem>
            </ButtonMorph>
        </div>
    </PreviewSection>
</div>
