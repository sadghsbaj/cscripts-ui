<script module>
    export const id = "toggle-button";
    export const label = "Toggle-Button";
</script>

<script lang="ts">
    import { Bookmark, Pin } from "@lucide/svelte";
    import { HitArea } from "cs/svelte/hit-area";
    import {
        TOGGLE_BUTTON_COLORS,
        TOGGLE_BUTTON_SIZES,
        ToggleButton,
        ToggleButtonIcon,
        ToggleButtonLabel,
    } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let basicPressed = $state(false);
    let softVariantPressed = $state(true);
    let ghostVariantPressed = $state(true);
    let accentPressed = $state(true);
    let successPressed = $state(true);
    let warningPressed = $state(true);
    let dangerPressed = $state(true);
    let iconPressed = $state(true);

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";

    let pressed = $state(false);
${closeScript}

<ToggleButton variant="soft" color="accent" size="md" bind:pressed>
    <ToggleButtonLabel>Pin item</ToggleButtonLabel>
</ToggleButton>`;

    const variantsCode = `<ToggleButton variant="soft" color="accent" size="md" bind:pressed={softPressed}>
    <ToggleButtonLabel>Soft</ToggleButtonLabel>
</ToggleButton>
<ToggleButton variant="ghost" color="accent" size="md" bind:pressed={ghostPressed}>
    <ToggleButtonLabel>Ghost</ToggleButtonLabel>
</ToggleButton>`;

    const colorsCode = `<ToggleButton variant="soft" color="accent" size="md" bind:pressed>
    <ToggleButtonLabel>Accent</ToggleButtonLabel>
</ToggleButton>
<ToggleButton variant="soft" color="success" size="md" bind:pressed>
    <ToggleButtonLabel>Success</ToggleButtonLabel>
</ToggleButton>
<ToggleButton variant="soft" color="warning" size="md" bind:pressed>
    <ToggleButtonLabel>Warning</ToggleButtonLabel>
</ToggleButton>
<ToggleButton variant="soft" color="danger" size="md" bind:pressed>
    <ToggleButtonLabel>Danger</ToggleButtonLabel>
</ToggleButton>`;

    const sizesCode = `<ToggleButton variant="soft" color="accent" size="xs"><ToggleButtonLabel>xSmall</ToggleButtonLabel></ToggleButton>
<ToggleButton variant="soft" color="accent" size="sm"><ToggleButtonLabel>Small</ToggleButtonLabel></ToggleButton>
<ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Medium</ToggleButtonLabel></ToggleButton>
<ToggleButton variant="soft" color="accent" size="lg"><ToggleButtonLabel>Large</ToggleButtonLabel></ToggleButton>
<ToggleButton variant="soft" color="accent" size="xl"><ToggleButtonLabel>xLarge</ToggleButtonLabel></ToggleButton>`;

    const iconCode = `<ToggleButton variant="soft" color="accent" size="md">
    <ToggleButtonIcon icon={Pin} />
    <ToggleButtonLabel>Pin</ToggleButtonLabel>
</ToggleButton>

<ToggleButton
    variant="soft"
    color="accent"
    size="md"
    iconOnly
    aria-label="Toggle bookmark"
    {@attach tooltip("Toggle bookmark")}
>
    <ToggleButtonIcon icon={Bookmark} />
    <HitArea size="md" />
</ToggleButton>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */

    const sizeLabels: Record<(typeof TOGGLE_BUTTON_SIZES)[number], string> = {
        xs: "xSmall",
        sm: "Small",
        md: "Medium",
        lg: "Large",
        xl: "xLarge",
    };

    const colorLabels: Record<(typeof TOGGLE_BUTTON_COLORS)[number], string> = {
        accent: "Accent",
        success: "Success",
        warning: "Warning",
        danger: "Danger",
    };
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="ToggleButton"
        description="A pressable two-state button supporting soft and ghost variants with semantic colors."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <ToggleButton variant="soft" color="accent" size="md" bind:pressed={basicPressed}>
            <ToggleButtonLabel>Pin item</ToggleButtonLabel>
        </ToggleButton>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Compare soft and ghost toggle surfaces interactively."
        code={variantsCode}
    >
        <ToggleButton variant="soft" color="accent" size="md" bind:pressed={softVariantPressed}>
            <ToggleButtonLabel>Soft</ToggleButtonLabel>
        </ToggleButton>
        <ToggleButton variant="ghost" color="accent" size="md" bind:pressed={ghostVariantPressed}>
            <ToggleButtonLabel>Ghost</ToggleButtonLabel>
        </ToggleButton>
    </PreviewSection>

    <PreviewSection
        title="Colors"
        description="Semantic tint options for active toggle states."
        code={colorsCode}
    >
        <ToggleButton variant="soft" color="accent" size="md" bind:pressed={accentPressed}>
            <ToggleButtonLabel>{colorLabels.accent}</ToggleButtonLabel>
        </ToggleButton>
        <ToggleButton variant="soft" color="success" size="md" bind:pressed={successPressed}>
            <ToggleButtonLabel>{colorLabels.success}</ToggleButtonLabel>
        </ToggleButton>
        <ToggleButton variant="soft" color="warning" size="md" bind:pressed={warningPressed}>
            <ToggleButtonLabel>{colorLabels.warning}</ToggleButtonLabel>
        </ToggleButton>
        <ToggleButton variant="soft" color="danger" size="md" bind:pressed={dangerPressed}>
            <ToggleButtonLabel>{colorLabels.danger}</ToggleButtonLabel>
        </ToggleButton>
    </PreviewSection>

    <PreviewSection title="Sizes" code={sizesCode}>
        {#each TOGGLE_BUTTON_SIZES as size (size)}
            <ToggleButton variant="soft" color="accent" {size}>
                <ToggleButtonLabel>{sizeLabels[size]}</ToggleButtonLabel>
            </ToggleButton>
        {/each}
    </PreviewSection>

    <PreviewSection
        title="Icons & Icon-Only"
        description="Pair icons with labels or render icon-only toggles with a HitArea and tooltip."
        code={iconCode}
    >
        <ToggleButton variant="soft" color="accent" size="md">
            <ToggleButtonIcon icon={Pin} />
            <ToggleButtonLabel>Pin</ToggleButtonLabel>
        </ToggleButton>

        <ToggleButton
            variant="soft"
            color="accent"
            size="md"
            iconOnly
            bind:pressed={iconPressed}
            aria-label="Toggle bookmark"
            {@attach tooltip("Toggle bookmark")}
        >
            <ToggleButtonIcon icon={Bookmark} />
            <HitArea size="md" />
        </ToggleButton>
    </PreviewSection>
</div>
