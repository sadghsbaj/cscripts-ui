<script module lang="ts">
    export const id = "roving-focus";
    export const label = "Roving-Focus";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { rovingFocus } from "cs/svelte/focus";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let view = $state<string | undefined>("week");

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {view} bindings */
    const horizontalCode = `<script lang="ts">
    import { rovingFocus } from "cs/svelte/focus";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";

    let view = $state<string | undefined>("week");
${closeScript}

<ToggleButtonGroup type="single" bind:value={view} {@attach rovingFocus({ orientation: "horizontal" })}>
    <ToggleButton variant="soft" color="accent" size="md" value="day">
        <ToggleButtonLabel>Day</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButton variant="soft" color="accent" size="md" value="week">
        <ToggleButtonLabel>Week</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButton variant="soft" color="accent" size="md" value="month">
        <ToggleButtonLabel>Month</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButton variant="soft" color="accent" size="md" value="year">
        <ToggleButtonLabel>Year</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */

    const verticalCode = `<div class="flex flex-col items-start gap-1" {@attach rovingFocus({ orientation: "vertical" })}>
    <Button variant="tertiary" size="sm"><ButtonLabel>Overview</ButtonLabel></Button>
    <Button variant="tertiary" size="sm"><ButtonLabel>Activity</ButtonLabel></Button>
    <Button variant="tertiary" size="sm" disabled><ButtonLabel>Billing</ButtonLabel></Button>
    <Button variant="tertiary" size="sm"><ButtonLabel>Settings</ButtonLabel></Button>
</div>`;

    const highlightCode = `<div class="flex flex-col gap-1" {@attach rovingFocus({ orientation: "vertical" })}>
    <button type="button" class="roving-item">Inbox</button>
    <button type="button" class="roving-item">Drafts</button>
    <button type="button" class="roving-item">Archive</button>
</div>

<style>
    .roving-item:focus-visible {
        outline: none;
    }

    :global([data-roving-focus]):focus-within .roving-item:global([data-roving-active]) {
        background: var(--cs-color-accent-soft);
        color: var(--cs-color-accent-soft-fg);
    }
</style>`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="rovingFocus"
        description="Maintains a single roving tab stop across composite items with arrow and Home/End navigation."
    />

    <PreviewSection
        title="Horizontal Group"
        description="Tab in, move with ArrowLeft/ArrowRight, Tab out, and Tab back in to resume at the last active button."
        code={horizontalCode}
    >
        <ToggleButtonGroup type="single" bind:value={view} {@attach rovingFocus({ orientation: "horizontal" })}>
            <ToggleButton variant="soft" color="accent" size="md" value="day">
                <ToggleButtonLabel>Day</ToggleButtonLabel>
            </ToggleButton>
            <ToggleButton variant="soft" color="accent" size="md" value="week">
                <ToggleButtonLabel>Week</ToggleButtonLabel>
            </ToggleButton>
            <ToggleButton variant="soft" color="accent" size="md" value="month">
                <ToggleButtonLabel>Month</ToggleButtonLabel>
            </ToggleButton>
            <ToggleButton variant="soft" color="accent" size="md" value="year">
                <ToggleButtonLabel>Year</ToggleButtonLabel>
            </ToggleButton>
        </ToggleButtonGroup>
    </PreviewSection>

    <PreviewSection
        title="Vertical & Disabled Skipping"
        description="Navigates with ArrowUp/ArrowDown and Home/End while skipping disabled items."
        code={verticalCode}
    >
        <div class="flex flex-col items-start gap-1" {@attach rovingFocus({ orientation: "vertical" })}>
            <Button variant="tertiary" size="sm">
                <ButtonLabel>Overview</ButtonLabel>
            </Button>
            <Button variant="tertiary" size="sm">
                <ButtonLabel>Activity</ButtonLabel>
            </Button>
            <Button variant="tertiary" size="sm" disabled>
                <ButtonLabel>Billing</ButtonLabel>
            </Button>
            <Button variant="tertiary" size="sm">
                <ButtonLabel>Settings</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Custom Highlight"
        description="The current tab stop receives data-roving-active for custom styling."
        code={highlightCode}
    >
        <div
            class="bg-sunken shadow-sunken rounded-2xl squircle-soft p-1.5 flex flex-col gap-1 w-full max-w-220px"
            {@attach rovingFocus({ orientation: "vertical" })}
        >
            <button
                type="button"
                class="roving-item text-left text-sm font-medium px-3 h-32px rounded-xl squircle-soft text-main transition-colors"
            >
                Inbox
            </button>
            <button
                type="button"
                class="roving-item text-left text-sm font-medium px-3 h-32px rounded-xl squircle-soft text-main transition-colors"
            >
                Drafts
            </button>
            <button
                type="button"
                class="roving-item text-left text-sm font-medium px-3 h-32px rounded-xl squircle-soft text-main transition-colors"
            >
                Archive
            </button>
        </div>
    </PreviewSection>
</div>

<style>
    .roving-item {
        cursor: default;
        background: transparent;
    }

    .roving-item:focus-visible {
        outline: none;
    }

    .roving-item:hover {
        background: var(--cs-color-base-soft);
    }

    :global([data-roving-focus]):focus-within .roving-item:global([data-roving-active]) {
        background: var(--cs-color-accent-soft);
        color: var(--cs-color-accent-soft-fg);
    }
</style>
