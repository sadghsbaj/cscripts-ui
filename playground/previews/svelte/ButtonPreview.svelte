<script module>
    export const id = "button";
    export const label = "Button";
    export const category = "primitives" as const;
</script>

<script lang="ts">
    import { ArrowRight, Plus, Settings } from "@lucide/svelte";
    import { Button, BUTTON_SIZES, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
${closeScript}

<Button variant="primary" size="md">
    <ButtonLabel>Save changes</ButtonLabel>
</Button>`;

    const variantsCode = `<Button variant="primary" size="md">
    <ButtonLabel>Primary</ButtonLabel>
</Button>
<Button variant="secondary" size="md">
    <ButtonLabel>Secondary</ButtonLabel>
</Button>
<Button variant="tertiary" size="md">
    <ButtonLabel>Tertiary</ButtonLabel>
</Button>
<Button variant="ghost" size="md">
    <ButtonLabel>Ghost</ButtonLabel>
</Button>
<Button variant="elevated" size="md">
    <ButtonLabel>Elevated</ButtonLabel>
</Button>`;

    const dangerCode = `<Button variant="primary" size="md" danger>
    <ButtonLabel>Delete item</ButtonLabel>
</Button>
<Button variant="secondary" size="md" danger>
    <ButtonLabel>Delete item</ButtonLabel>
</Button>
<Button variant="ghost" size="md" danger>
    <ButtonLabel>Delete item</ButtonLabel>
</Button>`;

    const sizeLabels = {
        xs: "xSmall",
        sm: "Small",
        md: "Medium",
        lg: "Large",
        xl: "xLarge",
    } as const;

    const sizesCode = `<Button variant="primary" size="xs"><ButtonLabel>xSmall</ButtonLabel></Button>
<Button variant="primary" size="sm"><ButtonLabel>Small</ButtonLabel></Button>
<Button variant="primary" size="md"><ButtonLabel>Medium</ButtonLabel></Button>
<Button variant="primary" size="lg"><ButtonLabel>Large</ButtonLabel></Button>
<Button variant="primary" size="xl"><ButtonLabel>xLarge</ButtonLabel></Button>`;

    const iconsCode = `<Button variant="primary" size="md">
    <ButtonIcon icon={Plus} />
    <ButtonLabel>New item</ButtonLabel>
</Button>

<Button variant="secondary" size="md">
    <ButtonLabel>Continue</ButtonLabel>
    <ButtonIcon icon={ArrowRight} />
</Button>

<Button
    variant="tertiary"
    size="md"
    iconOnly
    aria-label="Settings"
    {@attach tooltip("Settings")}
>
    <ButtonIcon icon={Settings} />
    <HitArea size="md" />
</Button>`;

    const disabledCode = `<Button variant="primary" size="md" disabled>
    <ButtonLabel>Disabled</ButtonLabel>
</Button>
<Button variant="secondary" size="md" disabled>
    <ButtonLabel>Disabled</ButtonLabel>
</Button>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Button"
        description="A clickable button primitive with semantic variants, sizes, and icon support."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Button variant="primary" size="md">
            <ButtonLabel>Save changes</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Five hierarchy levels from primary solid actions to subtle ghost and elevated controls."
        code={variantsCode}
    >
        <Button variant="primary" size="md">
            <ButtonLabel>Primary</ButtonLabel>
        </Button>
        <Button variant="secondary" size="md">
            <ButtonLabel>Secondary</ButtonLabel>
        </Button>
        <Button variant="tertiary" size="md">
            <ButtonLabel>Tertiary</ButtonLabel>
        </Button>
        <Button variant="ghost" size="md">
            <ButtonLabel>Ghost</ButtonLabel>
        </Button>
        <Button variant="elevated" size="md">
            <ButtonLabel>Elevated</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Danger"
        description="Destructive intent is supported on primary, secondary, and ghost variants."
        code={dangerCode}
    >
        <Button variant="primary" size="md" danger>
            <ButtonLabel>Delete item</ButtonLabel>
        </Button>
        <Button variant="secondary" size="md" danger>
            <ButtonLabel>Delete item</ButtonLabel>
        </Button>
        <Button variant="ghost" size="md" danger>
            <ButtonLabel>Delete item</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection title="Sizes" code={sizesCode}>
        {#each BUTTON_SIZES as size (size)}
            <Button variant="primary" {size}>
                <ButtonLabel>{sizeLabels[size]}</ButtonLabel>
            </Button>
        {/each}
    </PreviewSection>

    <PreviewSection
        title="Icons & Icon-Only"
        description="Combine icons with labels or render compact icon-only actions with a HitArea and tooltip."
        code={iconsCode}
    >
        <Button variant="primary" size="md">
            <ButtonIcon icon={Plus} />
            <ButtonLabel>New item</ButtonLabel>
        </Button>

        <Button variant="secondary" size="md">
            <ButtonLabel>Continue</ButtonLabel>
            <ButtonIcon icon={ArrowRight} />
        </Button>

        <Button
            variant="tertiary"
            size="md"
            iconOnly
            aria-label="Settings"
            {@attach tooltip("Settings")}
        >
            <ButtonIcon icon={Settings} />
            <HitArea size="md" />
        </Button>
    </PreviewSection>

    <PreviewSection title="Disabled" code={disabledCode}>
        <Button variant="primary" size="md" disabled>
            <ButtonLabel>Disabled</ButtonLabel>
        </Button>
        <Button variant="secondary" size="md" disabled>
            <ButtonLabel>Disabled</ButtonLabel>
        </Button>
    </PreviewSection>
</div>
