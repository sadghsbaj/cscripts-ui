<script module lang="ts">
    export const id = "text-morph";
    export const label = "Text-Morph";
</script>

<script lang="ts">
    import { Check, Save, Shuffle } from "@lucide/svelte";
    import { Badge, BadgeLabel, type BadgeColor } from "cs/svelte/badge";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Switch } from "cs/svelte/switch";
    import { TextInput, TextInputField } from "cs/svelte/text-input";
    import { TextMorph } from "cs/svelte/text-morph";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    const saveSteps = ["Save changes", "Saving...", "Saved"] as const;
    let saveIndex = $state(0);
    const saveLabel = $derived(saveSteps[saveIndex] ?? "Save changes");

    const statusSteps: ReadonlyArray<{ label: string; color: BadgeColor }> = [
        { label: "Draft", color: "base" },
        { label: "In review", color: "caution" },
        { label: "Published", color: "positive" },
    ];
    let statusIndex = $state(0);
    const currentStatus = $derived(statusSteps[statusIndex] ?? { label: "Draft", color: "base" as const });

    const inlinePhrases = ["3 of 12 files", "8 of 12 files", "12 of 12 files", "Step 1 of 4", "Step 3 of 4"] as const;
    const metricValues = [1240.5, 48_290.75, 312.4, 9840.25] as const;
    let numericStep = $state(0);
    let useGermanLocale = $state(false);
    let tabular = $state(false);

    const inlineText = $derived(inlinePhrases[numericStep % inlinePhrases.length] ?? "3 of 12 files");
    const metricValue = $derived(metricValues[numericStep % metricValues.length] ?? 1240.5);
    const locale = $derived(useGermanLocale ? "de-DE" : "en-US");

    let caretText = $state("48290.50");
    let cursorIndex = $state<number | undefined>();

    const headlinePhrases = ["Ship faster together", "Built for clarity", "Ready for launch"] as const;
    let headlineIndex = $state(0);
    let animated = $state(true);
    const currentHeadline = $derived(headlinePhrases[headlineIndex] ?? "Ship faster together");

    function cycleSave(): void {
        saveIndex = (saveIndex + 1) % saveSteps.length;
    }

    function cycleStatus(): void {
        statusIndex = (statusIndex + 1) % statusSteps.length;
    }

    function handleCaretInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        cursorIndex = event.currentTarget.selectionStart ?? undefined;
        caretText = event.currentTarget.value;
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const controlsCode = `<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { TextMorph } from "cs/svelte/text-morph";
${closeScript}

<Button variant="primary" size="md" onclick={cycleSave}>
    <ButtonLabel><TextMorph text={saveLabel} /></ButtonLabel>
</Button>

<Badge variant="dot" color={status.color} size="md">
    <BadgeLabel><TextMorph text={status.label} /></BadgeLabel>
</Badge>`;

    const numbersCode = `<TextMorph text={inlineText} {tabular} />

<TextMorph
    text={metricValue}
    decimals={2}
    locales={useGermanLocale ? "de-DE" : "en-US"}
    {tabular}
/>`;

    const caretCode = `<TextMorph text={value} {cursorIndex} tabular />

<TextInput variant="soft" size="md">
    <TextInputField
        value={value}
        oninput={(e) => {
            cursorIndex = e.currentTarget.selectionStart ?? undefined;
            value = e.currentTarget.value;
        }}
    />
</TextInput>`;

    const headingsCode = `<TextMorph as="h2" text={headline} {animated} class="title-xl" />

<TextMorph
    as="h2"
    text={headline}
    {animated}
    ease={{ stiffness: 220, damping: 22 }}
    class="title-xl"
/>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="TextMorph"
        description="Animated single-line text and inline numeric transitions with baseline alignment and cscripts-ui motion defaults."
    />

    <PreviewSection
        title="Buttons & Badges"
        description="Morphs short state labels inline inside Button and Badge while preserving baseline alignment."
        code={controlsCode}
    >
        <div class="flex-center flex-wrap gap-8">
            <Button variant="primary" size="md" onclick={cycleSave}>
                <ButtonIcon icon={saveLabel === "Saved" ? Check : Save} />
                <ButtonLabel><TextMorph text={saveLabel} /></ButtonLabel>
            </Button>

            <div class="flex items-center gap-3">
                <Badge variant="dot" color={currentStatus.color} size="md">
                    <BadgeLabel><TextMorph text={currentStatus.label} /></BadgeLabel>
                </Badge>

                <Button variant="secondary" size="sm" onclick={cycleStatus}>
                    <ButtonLabel>Next status</ButtonLabel>
                </Button>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Numbers & Locales"
        description="Morphs numeric words by place value inside text and formats numbers with decimals, locales, and tabular alignment."
        code={numbersCode}
    >
        <div class="flex flex-col items-center gap-6">
            <div class="flex flex-wrap items-baseline justify-center gap-10">
                <TextMorph text={inlineText} {tabular} class="text-xl font-medium tracking-tight text-strong" />
                <TextMorph
                    text={metricValue}
                    decimals={2}
                    locales={locale}
                    {tabular}
                    class="text-2xl font-semibold tracking-tight text-strong"
                />
            </div>

            <div class="flex-center flex-wrap gap-3">
                <Button variant="secondary" size="sm" onclick={() => (numericStep += 1)}>
                    <ButtonIcon icon={Shuffle} />
                    <ButtonLabel>Cycle values</ButtonLabel>
                </Button>

                <Button variant="tertiary" size="sm" onclick={() => (useGermanLocale = !useGermanLocale)}>
                    <ButtonLabel>{locale}</ButtonLabel>
                </Button>

                <label class="flex items-center gap-2 text-sm text-main select-none">
                    <Switch size="sm" bind:checked={tabular} />
                    <span>Tabular</span>
                </label>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Caret-Aligned Editing"
        description="Bind cursorIndex to selectionStart so mid-string edits morph digits around the caret."
        code={caretCode}
    >
        <div class="flex flex-col items-center gap-5 w-full max-w-xs">
            <TextMorph
                text={caretText}
                {cursorIndex}
                tabular
                class="text-3xl font-semibold tracking-tight text-strong"
            />

            <TextInput variant="soft" size="md" class="w-full">
                <TextInputField
                    value={caretText}
                    oninput={handleCaretInput}
                    placeholder="Enter a number"
                    aria-label="Edit number"
                />
            </TextInput>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Headings & Easing"
        description="Renders as a semantic heading comparing default quint-out timing with spring physics."
        code={headingsCode}
    >
        <div class="flex flex-col items-center gap-6 w-full">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl text-center">
                <div class="flex flex-col items-center gap-1.5">
                    <span class="text-xs text-weak">Default</span>
                    <TextMorph as="h2" text={currentHeadline} {animated} class="title-xl text-strong" />
                </div>

                <div class="flex flex-col items-center gap-1.5">
                    <span class="text-xs text-weak">Spring</span>
                    <TextMorph
                        as="h2"
                        text={currentHeadline}
                        {animated}
                        ease={{ stiffness: 220, damping: 22 }}
                        class="title-xl text-strong"
                    />
                </div>
            </div>

            <div class="flex-center flex-wrap gap-4">
                <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => (headlineIndex = (headlineIndex + 1) % headlinePhrases.length)}
                >
                    <ButtonLabel>Swap headline</ButtonLabel>
                </Button>

                <label class="flex items-center gap-2 text-sm text-main select-none">
                    <Switch size="sm" bind:checked={animated} />
                    <span>Animated</span>
                </label>
            </div>
        </div>
    </PreviewSection>
</div>
