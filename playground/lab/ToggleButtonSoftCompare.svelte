<script lang="ts">
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";

    const colors = ["accent", "success", "warning", "danger"] as const;
    const labels: Record<(typeof colors)[number], string> = {
        accent: "Accent",
        success: "Success",
        warning: "Warning",
        danger: "Danger",
    };

    let softPressed = $state({
        accent: true,
        success: true,
        warning: true,
        danger: true,
    });

    let ghostPressed = $state({
        accent: true,
        success: true,
        warning: true,
        danger: true,
    });
</script>

<div class="flex flex-col gap-6 rounded-xl squircle-lg bg-elevated p-8 shadow-elevated">
    <div class="flex flex-col gap-2">
        <span class="text-xs font-medium text-weak">soft</span>
        <div class="flex flex-wrap items-center gap-3">
            {#each colors as color (color)}
                <ToggleButton variant="soft" {color} size="md" bind:pressed={softPressed[color]}>
                    <ToggleButtonLabel>{labels[color]}</ToggleButtonLabel>
                </ToggleButton>
            {/each}
        </div>
    </div>

    <div class="flex flex-col gap-2">
        <span class="text-xs font-medium text-weak">ghost</span>
        <div class="flex flex-wrap items-center gap-3">
            {#each colors as color (color)}
                <ToggleButton variant="ghost" {color} size="md" bind:pressed={ghostPressed[color]}>
                    <ToggleButtonLabel>{labels[color]}</ToggleButtonLabel>
                </ToggleButton>
            {/each}
        </div>
    </div>
</div>
