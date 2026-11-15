<script module>
    export const id = "checkbox-group";
    export const label = "Checkbox-Group";
</script>

<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";
    import { CheckboxGroup, CheckboxGroupSelectAll } from "cs/svelte/checkbox-group";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let toppings = $state<string[]>(["cheese"]);
    let features = $state<string[]>(["core", "analytics"]);
    let permissions = $state<string[]>(["read"]);

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {value} bindings */
    const basicCode = `<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";
    import { CheckboxGroup, CheckboxGroupSelectAll } from "cs/svelte/checkbox-group";

    let toppings = $state<string[]>(["cheese"]);
${closeScript}

<CheckboxGroup bind:value={toppings} aria-label="Pizza toppings" class="flex flex-col gap-2">
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <CheckboxGroupSelectAll variant="soft" size="md" />
        <span class="font-medium">Select all</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="cheese" />
        <span>Extra cheese</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="mushrooms" />
        <span>Mushrooms</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="olives" />
        <span>Olives</span>
    </label>
</CheckboxGroup>`;

    const disabledItemCode = `<CheckboxGroup bind:value={features} aria-label="Features" class="flex flex-col gap-2">
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <CheckboxGroupSelectAll variant="soft" size="md" />
        <span class="font-medium">Select all</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-weak select-none">
        <Checkbox variant="soft" size="md" value="core" disabled />
        <span>Core (required, disabled)</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="analytics" />
        <span>Analytics</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="notifications" />
        <span>Notifications</span>
    </label>
</CheckboxGroup>`;

    const statesCode = `<CheckboxGroup name="disabled-group" disabled aria-label="Disabled group" class="flex flex-col gap-2">
    <label class="flex items-center gap-2.5 text-sm text-weak select-none">
        <CheckboxGroupSelectAll variant="soft" size="md" />
        <span>Select all</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-weak select-none">
        <Checkbox variant="soft" size="md" value="a" />
        <span>Option A</span>
    </label>
</CheckboxGroup>

<CheckboxGroup name="permissions" invalid bind:value={permissions} aria-label="Invalid group" class="flex flex-col gap-2">
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="read" />
        <span>Read (inherits invalid)</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="write" invalid={false} />
        <span>Write (overrides invalid={false})</span>
    </label>
</CheckboxGroup>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="CheckboxGroup"
        description="Unstyled form control group coordinating shared value, name, disabled, invalid, and tri-state select-all across Checkbox items."
    />

    <PreviewSection
        title="Bind Value & Select All"
        description="CheckboxGroup is unstyled—apply layout utilities like flex flex-col gap-2 directly. Clicking Select All morphs smoothly between indeterminate and checked."
        code={basicCode}
    >
        <div class="w-full flex flex-col gap-4">
            <CheckboxGroup bind:value={toppings} aria-label="Pizza toppings" class="flex flex-col gap-2">
                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <CheckboxGroupSelectAll variant="soft" size="md" />
                    <span class="font-medium">Select all</span>
                </label>

                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="soft" size="md" value="cheese" />
                    <span>Extra cheese</span>
                </label>

                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="soft" size="md" value="mushrooms" />
                    <span>Mushrooms</span>
                </label>

                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="soft" size="md" value="olives" />
                    <span>Olives</span>
                </label>
            </CheckboxGroup>

            <div class="w-full min-h-8 font-mono text-xs text-weak">
                value: {JSON.stringify(toppings)}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Preserving Disabled Items"
        description="Select All toggles only enabled items and preserves pre-selected disabled values."
        code={disabledItemCode}
    >
        <div class="w-full flex flex-col gap-4">
            <CheckboxGroup bind:value={features} aria-label="Features" class="flex flex-col gap-2">
                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <CheckboxGroupSelectAll variant="soft" size="md" />
                    <span class="font-medium">Select all</span>
                </label>

                <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                    <Checkbox variant="soft" size="md" value="core" disabled />
                    <span>Core (required, disabled)</span>
                </label>

                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="soft" size="md" value="analytics" />
                    <span>Analytics</span>
                </label>

                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="soft" size="md" value="notifications" />
                    <span>Notifications</span>
                </label>
            </CheckboxGroup>

            <div class="w-full min-h-8 font-mono text-xs text-weak">
                value: {JSON.stringify(features)}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Group States (disabled, invalid, name)"
        description="Group-level disabled, invalid, and name propagate to items; individual items can override invalid."
        code={statesCode}
    >
        <div class="flex flex-wrap gap-10">
            <CheckboxGroup
                name="disabled-group"
                value={["a"]}
                disabled
                aria-label="Disabled group"
                class="flex flex-col gap-2"
            >
                <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                    <CheckboxGroupSelectAll variant="soft" size="md" />
                    <span class="font-medium">Disabled group</span>
                </label>
                <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                    <Checkbox variant="soft" size="md" value="a" />
                    <span>Option A</span>
                </label>
                <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                    <Checkbox variant="soft" size="md" value="b" />
                    <span>Option B</span>
                </label>
            </CheckboxGroup>

            <CheckboxGroup
                name="permissions"
                invalid
                bind:value={permissions}
                aria-label="Invalid group"
                class="flex flex-col gap-2"
            >
                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <CheckboxGroupSelectAll variant="soft" size="md" />
                    <span class="font-medium">Invalid group</span>
                </label>
                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="soft" size="md" value="read" />
                    <span>Read (inherits invalid)</span>
                </label>
                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="soft" size="md" value="write" invalid={false} />
                    <span>Write (invalid=&#123;false&#125;)</span>
                </label>
            </CheckboxGroup>
        </div>
    </PreviewSection>
</div>
