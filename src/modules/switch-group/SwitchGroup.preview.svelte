<script module>
    export const id = "switch-group";
    export const label = "Switch-Group";
</script>

<script lang="ts">
    import { Switch } from "cs/svelte/switch";
    import { SwitchGroup, SwitchGroupSelectAll } from "cs/svelte/switch-group";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let channels = $state<string[]>(["email"]);
    let features = $state<string[]>(["security", "analytics"]);
    let requiredChannels = $state<string[]>(["email"]);

    function handleRequiredChannelsChange(next: string[]): void {
        if (next.length > 0) {
            requiredChannels = next;
        }
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {value} bindings */
    const basicCode = `<script lang="ts">
    import { Switch } from "cs/svelte/switch";
    import { SwitchGroup, SwitchGroupSelectAll } from "cs/svelte/switch-group";

    let channels = $state<string[]>(["email"]);
${closeScript}

<SwitchGroup bind:value={channels} aria-label="Notification channels" class="flex flex-col gap-2.5">
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <SwitchGroupSelectAll size="md" />
        <span class="font-medium">All notifications</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="email" />
        <span>Email</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="push" />
        <span>Push</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="sms" />
        <span>SMS</span>
    </label>
</SwitchGroup>`;

    const disabledItemCode = `<SwitchGroup bind:value={features} aria-label="Features" class="flex flex-col gap-2.5">
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <SwitchGroupSelectAll size="md" />
        <span class="font-medium">Enable all</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-weak select-none">
        <Switch size="md" value="security" disabled />
        <span>Security alerts (required, disabled)</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="analytics" />
        <span>Analytics</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="marketing" />
        <span>Marketing</span>
    </label>
</SwitchGroup>`;

    const statesAndControlledCode = `<SwitchGroup name="disabled-group" value={["a"]} disabled aria-label="Disabled group" class="flex flex-col gap-2.5">
    <label class="flex items-center gap-3 text-sm text-weak select-none">
        <SwitchGroupSelectAll size="md" />
        <span class="font-medium">Disabled group</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-weak select-none">
        <Switch size="md" value="a" />
        <span>Option A</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-weak select-none">
        <Switch size="md" value="b" />
        <span>Option B</span>
    </label>
</SwitchGroup>

<SwitchGroup
    name="required-channels"
    bind:value={() => requiredChannels, () => {}}
    onValueChange={handleRequiredChannelsChange}
    aria-label="At least one channel required"
    class="flex flex-col gap-2.5"
>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="email" />
        <span>Email</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="sms" />
        <span>SMS</span>
    </label>
</SwitchGroup>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="SwitchGroup"
        description="Unstyled form control group coordinating shared value, name, disabled, and binary master-switch state across Switch items."
    />

    <PreviewSection
        title="Bind Value & Select All"
        description="SwitchGroup is unstyled—apply layout utilities like flex flex-col gap-2.5 directly. SwitchGroupSelectAll acts as a binary master switch (on when all enabled items are selected, off otherwise)."
        code={basicCode}
    >
        <div class="w-full flex flex-col gap-4">
            <SwitchGroup bind:value={channels} aria-label="Notification channels" class="flex flex-col gap-2.5">
                <label class="flex items-center gap-3 text-sm text-main select-none">
                    <SwitchGroupSelectAll size="md" />
                    <span class="font-medium">All notifications</span>
                </label>

                <label class="flex items-center gap-3 text-sm text-main select-none">
                    <Switch size="md" value="email" />
                    <span>Email</span>
                </label>

                <label class="flex items-center gap-3 text-sm text-main select-none">
                    <Switch size="md" value="push" />
                    <span>Push</span>
                </label>

                <label class="flex items-center gap-3 text-sm text-main select-none">
                    <Switch size="md" value="sms" />
                    <span>SMS</span>
                </label>
            </SwitchGroup>

            <div class="w-full min-h-8 font-mono text-xs text-weak">
                value: {JSON.stringify(channels)}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Preserving Disabled Items"
        description="Select All toggles only enabled items and preserves pre-selected disabled values."
        code={disabledItemCode}
    >
        <div class="w-full flex flex-col gap-4">
            <SwitchGroup bind:value={features} aria-label="Features" class="flex flex-col gap-2.5">
                <label class="flex items-center gap-3 text-sm text-main select-none">
                    <SwitchGroupSelectAll size="md" />
                    <span class="font-medium">Enable all</span>
                </label>

                <label class="flex items-center gap-3 text-sm text-weak select-none">
                    <Switch size="md" value="security" disabled />
                    <span>Security alerts (required, disabled)</span>
                </label>

                <label class="flex items-center gap-3 text-sm text-main select-none">
                    <Switch size="md" value="analytics" />
                    <span>Analytics</span>
                </label>

                <label class="flex items-center gap-3 text-sm text-main select-none">
                    <Switch size="md" value="marketing" />
                    <span>Marketing</span>
                </label>
            </SwitchGroup>

            <div class="w-full min-h-8 font-mono text-xs text-weak">
                value: {JSON.stringify(features)}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Disabled Group & Controlled Mode"
        description="Group-level disabled and name propagate to items. Controlled bind:value=&#123;get, set&#125; with onValueChange keeps native switch inputs in sync when an update is rejected."
        code={statesAndControlledCode}
    >
        <div class="flex flex-wrap gap-10">
            <SwitchGroup
                name="disabled-group"
                value={["a"]}
                disabled
                aria-label="Disabled group"
                class="flex flex-col gap-2.5"
            >
                <label class="flex items-center gap-3 text-sm text-weak select-none">
                    <SwitchGroupSelectAll size="md" />
                    <span class="font-medium">Disabled group</span>
                </label>
                <label class="flex items-center gap-3 text-sm text-weak select-none">
                    <Switch size="md" value="a" />
                    <span>Option A</span>
                </label>
                <label class="flex items-center gap-3 text-sm text-weak select-none">
                    <Switch size="md" value="b" />
                    <span>Option B</span>
                </label>
            </SwitchGroup>

            <div class="flex flex-col gap-4">
                <SwitchGroup
                    name="required-channels"
                    bind:value={() => requiredChannels, () => {}}
                    onValueChange={handleRequiredChannelsChange}
                    aria-label="At least one channel required"
                    class="flex flex-col gap-2.5"
                >
                    <label class="flex items-center gap-3 text-sm text-main select-none">
                        <Switch size="md" value="email" />
                        <span>Email</span>
                    </label>
                    <label class="flex items-center gap-3 text-sm text-main select-none">
                        <Switch size="md" value="sms" />
                        <span>SMS</span>
                    </label>
                </SwitchGroup>

                <div class="min-h-8 font-mono text-xs text-weak">
                    required: {JSON.stringify(requiredChannels)}
                </div>
            </div>
        </div>
    </PreviewSection>
</div>
