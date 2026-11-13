<script module>
    export const id = "toggle-button-group";
    export const label = "Toggle-Button-Group";
</script>

<script lang="ts">
    import { Bold, Italic, Underline } from "@lucide/svelte";
    import { HitArea } from "cs/svelte/hit-area";
    import { ToggleButton, ToggleButtonIcon, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";
    import { tooltip } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let singleValue = $state<string | undefined>("day");
    let ghostValue = $state<string | undefined>("list");
    let toolbarValues = $state<string[]>(["bold"]);

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";

    let value = $state<string | undefined>("day");
${closeScript}

<ToggleButtonGroup type="single" bind:value orientation="horizontal" allowDeselect>
    <ToggleButton value="day" size="md" variant="soft" color="accent">
        <ToggleButtonLabel>Day</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButtonGroupSeparator />
    <ToggleButton value="week" size="md" variant="soft" color="accent">
        <ToggleButtonLabel>Week</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButtonGroupSeparator />
    <ToggleButton value="month" size="md" variant="soft" color="accent">
        <ToggleButtonLabel>Month</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>`;

    const multipleCode = `<ToggleButtonGroup type="multiple" bind:value={formats} orientation="horizontal">
    <ToggleButton
        value="bold"
        size="md"
        variant="soft"
        color="accent"
        iconOnly
        aria-label="Bold"
        {@attach tooltip("Bold")}
    >
        <ToggleButtonIcon icon={Bold} />
        <HitArea size="lg" />
    </ToggleButton>
    <ToggleButtonGroupSeparator />
    <ToggleButton
        value="italic"
        size="md"
        variant="soft"
        color="accent"
        iconOnly
        aria-label="Italic"
        {@attach tooltip("Italic")}
    >
        <ToggleButtonIcon icon={Italic} />
        <HitArea size="lg" />
    </ToggleButton>
    <ToggleButtonGroupSeparator />
    <ToggleButton
        value="underline"
        size="md"
        variant="soft"
        color="accent"
        iconOnly
        aria-label="Underline"
        {@attach tooltip("Underline")}
    >
        <ToggleButtonIcon icon={Underline} />
        <HitArea size="lg" />
    </ToggleButton>
</ToggleButtonGroup>`;

    const ghostCode = `<ToggleButtonGroup type="single" bind:value orientation="horizontal">
    <ToggleButton value="list" size="md" variant="ghost" color="accent">
        <ToggleButtonLabel>List</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButtonGroupSeparator />
    <ToggleButton value="grid" size="md" variant="ghost" color="accent">
        <ToggleButtonLabel>Grid</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="ToggleButtonGroup"
        description="A segmented control grouping toggle buttons for single or multiple selection."
    />

    <PreviewSection
        title="Basic (Single Selection)"
        description="Use allowDeselect when none of the options need to remain active."
        code={basicCode}
    >
        <ToggleButtonGroup type="single" bind:value={singleValue} orientation="horizontal" allowDeselect>
            <ToggleButton value="day" size="md" variant="soft" color="accent">
                <ToggleButtonLabel>Day</ToggleButtonLabel>
            </ToggleButton>
            <ToggleButtonGroupSeparator />
            <ToggleButton value="week" size="md" variant="soft" color="accent">
                <ToggleButtonLabel>Week</ToggleButtonLabel>
            </ToggleButton>
            <ToggleButtonGroupSeparator />
            <ToggleButton value="month" size="md" variant="soft" color="accent">
                <ToggleButtonLabel>Month</ToggleButtonLabel>
            </ToggleButton>
        </ToggleButtonGroup>
    </PreviewSection>

    <PreviewSection
        title="Multiple Selection (Toolbar)"
        description="Combine icon-only toggle buttons with multiple selection for formatting toolbars."
        code={multipleCode}
    >
        <ToggleButtonGroup type="multiple" bind:value={toolbarValues} orientation="horizontal">
            <ToggleButton
                value="bold"
                size="md"
                variant="soft"
                color="accent"
                iconOnly
                aria-label="Bold"
                {@attach tooltip("Bold")}
            >
                <ToggleButtonIcon icon={Bold} />
                <HitArea size="lg" />
            </ToggleButton>
            <ToggleButtonGroupSeparator />
            <ToggleButton
                value="italic"
                size="md"
                variant="soft"
                color="accent"
                iconOnly
                aria-label="Italic"
                {@attach tooltip("Italic")}
            >
                <ToggleButtonIcon icon={Italic} />
                <HitArea size="lg" />
            </ToggleButton>
            <ToggleButtonGroupSeparator />
            <ToggleButton
                value="underline"
                size="md"
                variant="soft"
                color="accent"
                iconOnly
                aria-label="Underline"
                {@attach tooltip("Underline")}
            >
                <ToggleButtonIcon icon={Underline} />
                <HitArea size="lg" />
            </ToggleButton>
        </ToggleButtonGroup>
    </PreviewSection>

    <PreviewSection title="Ghost Variant" code={ghostCode}>
        <ToggleButtonGroup type="single" bind:value={ghostValue} orientation="horizontal">
            <ToggleButton value="list" size="md" variant="ghost" color="accent">
                <ToggleButtonLabel>List</ToggleButtonLabel>
            </ToggleButton>
            <ToggleButtonGroupSeparator />
            <ToggleButton value="grid" size="md" variant="ghost" color="accent">
                <ToggleButtonLabel>Grid</ToggleButtonLabel>
            </ToggleButton>
        </ToggleButtonGroup>
    </PreviewSection>
</div>
