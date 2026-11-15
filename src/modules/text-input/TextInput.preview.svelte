<script module>
    export const id = "text-input";
    export const label = "TextInput";
</script>

<script lang="ts">
    import { AlertCircle, Eye, EyeOff, Lock, Mail, Search, Sparkles, X } from "@lucide/svelte";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { CopyIcon } from "cs/svelte/clipboard";
    import {
        TEXT_INPUT_SIZES,
        TextInput,
        TextInputAction,
        TextInputField,
        TextInputIcon,
        type TextInputSize,
    } from "cs/svelte/text-input";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let softValue = $state("");
    let elevatedValue = $state("");

    let sizeValues = $state<Record<TextInputSize, string>>({
        xs: "",
        sm: "",
        md: "",
        lg: "",
        xl: "",
    });

    let searchValue = $state("Design tokens");
    let searchFieldRef = $state<HTMLInputElement | null>(null);

    let passwordValue = $state("hunter2-secret");
    let showPassword = $state(false);

    let trailingIconValue = $state("hello@cscripts.dev");
    let multiActionValue = $state("cs_live_9f8a2c4e1b");
    let multiCopied = $state(false);

    let invalidSoftValue = $state("not-an-email");
    let invalidElevatedValue = $state("taken-handle");

    let readonlyValue = $state("https://cscripts.dev/share/94a1");
    let readonlyCopied = $state(false);

    let pairedValue = $state("");
    const pairedId = $props.id();

    function clearSearch(): void {
        searchValue = "";
        searchFieldRef?.focus();
    }

    function copyReadonly(): void {
        readonlyCopied = true;
        setTimeout(() => {
            readonlyCopied = false;
        }, 1200);
    }

    function copyMultiAction(): void {
        multiCopied = true;
        setTimeout(() => {
            multiCopied = false;
        }, 1200);
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const variantsCode = `<script lang="ts">
    import { TextInput, TextInputField } from "cs/svelte/text-input";

    let value = $state("");
${closeScript}

<TextInput variant="soft" size="md">
    <TextInputField bind:value placeholder="Soft input..." />
</TextInput>

<TextInput variant="elevated" size="md">
    <TextInputField bind:value placeholder="Elevated input..." />
</TextInput>`;

    const sizesCode = `<div class="flex items-center gap-2">
    <TextInput variant="soft" size="md">
        <TextInputField placeholder="Size md" />
    </TextInput>
    <Button variant="secondary" size="md">
        <ButtonLabel>Submit</ButtonLabel>
    </Button>
</div>`;

    const slotsCode = `<!-- Leading icon + conditional clear action -->
<TextInput variant="soft" size="md">
    <TextInputIcon icon={Search} />
    <TextInputField type="search" bind:value={searchValue} placeholder="Search..." />
    <TextInputAction
        icon={X}
        aria-label="Clear search"
        visible={searchValue.length > 0}
        onclick={() => (searchValue = "")}
    />
</TextInput>

<!-- Password reveal toggle -->
<TextInput variant="soft" size="md">
    <TextInputIcon icon={Lock} />
    <TextInputField type={showPassword ? "text" : "password"} bind:value={passwordValue} />
    <TextInputAction
        icon={showPassword ? EyeOff : Eye}
        aria-label={showPassword ? "Hide password" : "Show password"}
        onclick={() => (showPassword = !showPassword)}
    />
</TextInput>`;

    const statesCode = `<TextInput variant="soft" size="md" invalid>
    <TextInputIcon icon={AlertCircle} />
    <TextInputField value="not-an-email" />
</TextInput>

<TextInput variant="soft" size="md" disabled>
    <TextInputField value="Disabled soft" />
</TextInput>

<TextInput variant="soft" size="md" readonly>
    <TextInputField bind:value={readonlyValue} />
    <TextInputAction aria-label="Copy link" onclick={copyReadonly}>
        <CopyIcon copied={readonlyCopied} />
    </TextInputAction>
    <TextInputAction icon={X} aria-label="Clear link" disabled />
</TextInput>`;

    const labelCode = `<div class="flex flex-col gap-1.5">
    <label for={id} class="text-sm font-medium text-main">Work email</label>
    <TextInput variant="soft" size="md">
        <TextInputField id={id} type="email" bind:value placeholder="you@company.com" />
    </TextInput>
</div>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="TextInput"
        description="Single-line text entry primitive with soft and elevated surfaces, 1:1 Button height parity, and compound icon/action slots."
    />

    <PreviewSection
        title="Variants"
        description="Use soft on canvas or elevated cards, and elevated on canvas or sunken wells."
        code={variantsCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">soft</span>
                <TextInput variant="soft" size="md" class="w-64">
                    <TextInputField bind:value={softValue} placeholder="Soft input..." />
                </TextInput>
            </div>

            <SunkenWell>
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">elevated</span>
                    <TextInput variant="elevated" size="md" class="w-64">
                        <TextInputField bind:value={elevatedValue} placeholder="Elevated input..." />
                    </TextInput>
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Sizes xs through xl (28px–44px) match Button heights 1:1 for clean inline alignment."
        code={sizesCode}
    >
        <div class="flex flex-col items-start gap-3">
            {#each TEXT_INPUT_SIZES as size (size)}
                <div class="flex items-center gap-3">
                    <span class="w-6 text-xs font-medium text-weak uppercase">{size}</span>
                    <TextInput variant="soft" {size} class="w-56">
                        <TextInputField bind:value={sizeValues[size]} placeholder="Size {size}" />
                    </TextInput>
                    <Button variant="secondary" {size}>
                        <ButtonLabel>Action</ButtonLabel>
                    </Button>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Leading & Trailing Slots"
        description="Compose TextInputIcon and TextInputAction in DOM order, including animated conditional reveal and multiple actions."
        code={slotsCode}
    >
        <div class="flex flex-wrap items-start gap-4">
            <TextInput variant="soft" size="md" class="w-64">
                <TextInputIcon icon={Search} />
                <TextInputField
                    bind:ref={searchFieldRef}
                    type="search"
                    bind:value={searchValue}
                    placeholder="Search..."
                />
                <TextInputAction
                    icon={X}
                    aria-label="Clear search"
                    visible={searchValue.length > 0}
                    onclick={clearSearch}
                />
            </TextInput>

            <TextInput variant="soft" size="md" class="w-64">
                <TextInputIcon icon={Lock} />
                <TextInputField
                    type={showPassword ? "text" : "password"}
                    bind:value={passwordValue}
                    placeholder="Password"
                />
                <TextInputAction
                    icon={showPassword ? EyeOff : Eye}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onclick={() => (showPassword = !showPassword)}
                />
            </TextInput>

            <TextInput variant="soft" size="md" class="w-64">
                <TextInputIcon icon={Mail} />
                <TextInputField type="email" bind:value={trailingIconValue} placeholder="Email" />
                <TextInputIcon icon={Sparkles} />
            </TextInput>

            <TextInput variant="soft" size="md" class="w-64">
                <TextInputField bind:value={multiActionValue} placeholder="API key" />
                <TextInputAction aria-label="Copy API key" onclick={copyMultiAction}>
                    <CopyIcon copied={multiCopied} />
                </TextInputAction>
                <TextInputAction
                    icon={X}
                    aria-label="Clear API key"
                    visible={multiActionValue.length > 0}
                    onclick={() => (multiActionValue = "")}
                />
            </TextInput>
        </div>
    </PreviewSection>

    <PreviewSection
        title="States"
        description="Supports invalid, disabled, and readonly states. Non-mutating actions stay enabled on readonly fields."
        code={statesCode}
    >
        <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Invalid (soft)</span>
                    <TextInput variant="soft" size="md" invalid class="w-64">
                        <TextInputIcon icon={AlertCircle} />
                        <TextInputField bind:value={invalidSoftValue} placeholder="Email" />
                    </TextInput>
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Invalid (elevated)</span>
                        <TextInput variant="elevated" size="md" invalid class="w-64">
                            <TextInputIcon icon={AlertCircle} />
                            <TextInputField bind:value={invalidElevatedValue} placeholder="Username" />
                        </TextInput>
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Disabled (soft)</span>
                    <TextInput variant="soft" size="md" disabled class="w-64">
                        <TextInputIcon icon={Mail} />
                        <TextInputField value="disabled@cscripts.dev" />
                    </TextInput>
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Disabled (elevated)</span>
                        <TextInput variant="elevated" size="md" disabled class="w-64">
                            <TextInputIcon icon={Mail} />
                            <TextInputField value="disabled@cscripts.dev" />
                        </TextInput>
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Readonly (Copy enabled, Clear disabled)</span>
                <TextInput variant="soft" size="md" readonly class="w-72">
                    <TextInputField bind:value={readonlyValue} />
                    <TextInputAction aria-label="Copy share link" onclick={copyReadonly}>
                        <CopyIcon copied={readonlyCopied} />
                    </TextInputAction>
                    <TextInputAction
                        icon={X}
                        aria-label="Clear share link"
                        disabled
                    />
                </TextInput>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="External Label Pairing"
        description="TextInput omits built-in label chrome; pair an external <label for={id}> directly with TextInputField."
        code={labelCode}
    >
        <div class="flex flex-col gap-1.5">
            <label for={pairedId} class="text-sm font-medium text-main">Work email</label>
            <TextInput variant="soft" size="md" class="w-72">
                <TextInputField
                    id={pairedId}
                    type="email"
                    bind:value={pairedValue}
                    placeholder="you@company.com"
                />
            </TextInput>
        </div>
    </PreviewSection>
</div>
