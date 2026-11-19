<script lang="ts">
    import { Card, CardBody } from "cs/svelte/card";
    import { Select, SelectContent, SelectItem, SelectTrigger } from "cs/svelte/select";
    import { Switch } from "cs/svelte/switch";

    export type QuietHoursOption = "off" | "nightly" | "weekends";

    export interface SettingsRowProps {
        emailDigest?: boolean;
        pushAlerts?: boolean;
        quietHours?: QuietHoursOption;
        productUpdates?: boolean;
        disabled?: boolean;
        class?: string;
    }

    let {
        emailDigest = $bindable(true),
        pushAlerts = $bindable(true),
        quietHours = $bindable<QuietHoursOption>("nightly"),
        productUpdates = $bindable(false),
        disabled = false,
        class: className,
    }: SettingsRowProps = $props();

    const rowId = $props.id();
    const quietHoursId = `${rowId}-quiet-hours`;
</script>

<div class={["w-full max-w-[var(--cs-container-md)]", className]}>
    <h2 class="title-sm text-weak px-1 mb-2">Notifications</h2>

    <Card variant="elevated" size="lg">
        <CardBody>
            <div class="divide-y divide-base-soft">
                <div class="py-3.5 first:pt-0 last:pb-0">
                    <label class="flex items-center justify-between gap-4 select-none">
                        <span class="flex flex-col gap-1 min-w-0">
                            <span
                                class={[
                                    "label-md",
                                    disabled ? "text-[var(--cs-color-disabled-fg)]" : "text-strong",
                                ]}
                            >
                                Email digest
                            </span>
                            <span
                                class={[
                                    "description-sm",
                                    disabled ? "text-[var(--cs-color-disabled-fg)]" : "text-weak",
                                ]}
                            >
                                Weekly summary
                            </span>
                        </span>
                        <Switch size="md" class="shrink-0" bind:checked={emailDigest} {disabled} />
                    </label>
                </div>

                <div class="py-3.5 first:pt-0 last:pb-0">
                    <label class="flex items-center justify-between gap-4 select-none">
                        <span class="flex flex-col gap-1 min-w-0">
                            <span
                                class={[
                                    "label-md",
                                    disabled ? "text-[var(--cs-color-disabled-fg)]" : "text-strong",
                                ]}
                            >
                                Push alerts
                            </span>
                            <span
                                class={[
                                    "description-sm",
                                    disabled ? "text-[var(--cs-color-disabled-fg)]" : "text-weak",
                                ]}
                            >
                                Instant on this device
                            </span>
                        </span>
                        <Switch size="md" class="shrink-0" bind:checked={pushAlerts} {disabled} />
                    </label>

                    <div class={["cs-settings-subrow", pushAlerts && "is-open"]} inert={!pushAlerts}>
                        <div class="cs-settings-subrow-inner">
                            <div class="pt-3.5 mt-3.5 pb-1 border-t border-base-soft flex items-center justify-between gap-4">
                                <label
                                    for={quietHoursId}
                                    class={[
                                        "label-md select-none",
                                        disabled ? "text-[var(--cs-color-disabled-fg)]" : "text-main",
                                    ]}
                                >
                                    Quiet hours
                                </label>
                                <Select variant="soft" size="sm" bind:value={quietHours} disabled={disabled || !pushAlerts}>
                                    <SelectTrigger id={quietHoursId} class="w-32" />
                                    <SelectContent width="min-anchor">
                                        <SelectItem value="off">Off</SelectItem>
                                        <SelectItem value="nightly">Nightly</SelectItem>
                                        <SelectItem value="weekends">Weekends</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="py-3.5 first:pt-0 last:pb-0">
                    <label class="flex items-center justify-between gap-4 select-none">
                        <span class="flex flex-col gap-1 min-w-0">
                            <span
                                class={[
                                    "label-md",
                                    disabled ? "text-[var(--cs-color-disabled-fg)]" : "text-strong",
                                ]}
                            >
                                Product updates
                            </span>
                        </span>
                        <Switch size="md" class="shrink-0" bind:checked={productUpdates} {disabled} />
                    </label>
                </div>
            </div>
        </CardBody>
    </Card>
</div>

<style>
    .cs-settings-subrow {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
            grid-template-rows var(--cs-dur-exit-sm) var(--cs-ease-exit),
            opacity var(--cs-dur-exit-sm) var(--cs-ease-exit);
    }

    .cs-settings-subrow.is-open {
        grid-template-rows: 1fr;
        opacity: 1;
        transition:
            grid-template-rows var(--cs-dur-enter-sm) var(--cs-ease-enter),
            opacity var(--cs-dur-enter-sm) var(--cs-ease-enter);
    }

    /* Keep horizontal overflow visible so SelectTrigger focus rings are not clipped. */
    .cs-settings-subrow-inner {
        overflow-x: visible;
        overflow-y: clip;
        min-height: 0;
    }
</style>
