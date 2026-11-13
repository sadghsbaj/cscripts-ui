<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Checkbox } from "cs/svelte/checkbox";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";

    const rows = [
        { id: "enabled", label: "Enabled (Referenz)", disabled: false, cls: "" },
        { id: "current", label: "Aktuell — Global opacity: 0.5", disabled: true, cls: "" },
        {
            id: "tokens",
            label: "Token-basiert — --cs-disabled-opacity: 1 + eigene Disabled-Tokens pro Variante",
            disabled: true,
            cls: "exp-token-disabled",
        },
    ] as const;
</script>

<div class="flex flex-col gap-7 rounded-xl squircle-lg bg-elevated p-8 shadow-elevated">
    {#each rows as row (row.id)}
        <div class="flex flex-col gap-3 {row.cls}">
            <span class="text-xs font-medium text-weak">{row.label}</span>

            <div class="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="md" disabled={row.disabled}>
                    <ButtonLabel>Primary</ButtonLabel>
                </Button>
                <Button variant="primary" danger size="md" disabled={row.disabled}>
                    <ButtonLabel>Danger</ButtonLabel>
                </Button>
                <Button variant="secondary" size="md" disabled={row.disabled}>
                    <ButtonLabel>Secondary</ButtonLabel>
                </Button>
                <Button variant="tertiary" size="md" disabled={row.disabled}>
                    <ButtonLabel>Tertiary</ButtonLabel>
                </Button>
                <Button variant="ghost" size="md" disabled={row.disabled}>
                    <ButtonLabel>Ghost</ButtonLabel>
                </Button>
                <Button variant="elevated" size="md" disabled={row.disabled}>
                    <ButtonLabel>Elevated</ButtonLabel>
                </Button>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <ToggleButton variant="soft" color="accent" size="md" pressed={false} disabled={row.disabled}>
                    <ToggleButtonLabel>Soft Off</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButton variant="soft" color="accent" size="md" pressed disabled={row.disabled}>
                    <ToggleButtonLabel>Soft On</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButton variant="ghost" color="accent" size="md" pressed={false} disabled={row.disabled}>
                    <ToggleButtonLabel>Ghost Off</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButton variant="ghost" color="accent" size="md" pressed disabled={row.disabled}>
                    <ToggleButtonLabel>Ghost On</ToggleButtonLabel>
                </ToggleButton>
                <Checkbox variant="soft" size="md" disabled={row.disabled} aria-label="Unchecked" />
                <Checkbox variant="soft" size="md" checked disabled={row.disabled} aria-label="Checked" />
                <Checkbox variant="soft" size="md" invalid disabled={row.disabled} aria-label="Invalid" />
            </div>
        </div>
    {/each}
</div>

<style>
    .exp-token-disabled :global(:disabled) {
        opacity: 1;
    }

    /* Buttons: neutrale, glanzlose Disabled-Flächen + gedimmter Text */
    .exp-token-disabled :global(.cs-button:disabled) {
        --_fg: var(--cs-color-text-weaker);
        --_shadow: none;
    }

    .exp-token-disabled :global(.cs-button[data-variant="primary"]:disabled),
    .exp-token-disabled :global(.cs-button[data-variant="secondary"]:disabled) {
        --_bg: var(--cs-color-base-soft);
    }

    .exp-token-disabled :global(.cs-button[data-variant="tertiary"]:disabled),
    .exp-token-disabled :global(.cs-button[data-variant="ghost"]:disabled) {
        --_bg: transparent;
    }

    .exp-token-disabled :global(.cs-button[data-variant="elevated"]:disabled) {
        --_bg: light-dark(var(--cs-color-base-50), var(--cs-color-base-800));
        --_shadow: 0 0 0 1px var(--cs-color-base-soft);
    }

    /* ToggleButtons: ruhiges Grau für active, transparent für ghost */
    .exp-token-disabled :global(.cs-toggle-button:disabled) {
        --_fg: var(--cs-color-text-weaker);
    }

    .exp-token-disabled :global(.cs-toggle-button[data-variant="soft"]:disabled) {
        --_bg: var(--cs-color-base-soft);
    }

    .exp-token-disabled :global(.cs-toggle-button[aria-pressed="true"]:disabled) {
        --_fg: var(--cs-color-text-weak);
        --_fill-bg: var(--cs-color-base-soft-hover);
    }

    /* Checkboxes: flach, neutral grau statt leuchtendem Solid/Invalid-Ring */
    .exp-token-disabled :global(.cs-checkbox:disabled) {
        --_bg: var(--cs-color-base-soft);
        --_shadow: none;
    }

    .exp-token-disabled :global(.cs-checkbox:is(:checked, :indeterminate):disabled) {
        --_bg: light-dark(var(--cs-color-base-300), var(--cs-color-base-700));
        --_shadow: none;
    }
</style>
