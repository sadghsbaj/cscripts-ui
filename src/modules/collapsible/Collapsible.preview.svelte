<script module>
    export const id = "collapsible";
    export const label = "Collapsible";
</script>

<script lang="ts">
    import { ChevronDown, ChevronRight } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { COLLAPSIBLE_MOTIONS, Collapsible, type CollapsibleMotion } from "cs/svelte/collapsible";
    import { TextMorph } from "cs/svelte/text-morph";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    const closeScript = ["</", "script>"].join("");

    let motionOpen = $state<Record<CollapsibleMotion, boolean>>({
        slide: false,
        swell: false,
        fade: false,
        none: false,
    });

    let partialOpen = $state(false);
    let horizontalOpen = $state(false);
    let outerOpen = $state(true);
    let innerOpen = $state(false);

    const motionLabels: Record<CollapsibleMotion, string> = {
        slide: "Slide",
        swell: "Swell",
        fade: "Fade",
        none: "None",
    };

    const motionContent: Record<CollapsibleMotion, { title: string; body: string }> = {
        slide: {
            title: "Weekly digest",
            body: "Receive a summary of project activity and open pull requests every Monday morning.",
        },
        swell: {
            title: "Deployment alerts",
            body: "Get notified when a production build finishes or fails during rollouts.",
        },
        fade: {
            title: "Team permissions",
            body: "Members can invite collaborators and manage environment variables for staging.",
        },
        none: {
            title: "Audit log retention",
            body: "Security events and sign-in records are archived for 90 days by default.",
        },
    };

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const motionCode = `<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Collapsible } from "cs/svelte/collapsible";

    let open = $state(false);
${closeScript}

<Button
    variant="tertiary"
    size="sm"
    aria-expanded={open}
    aria-controls="details-panel"
    onclick={() => (open = !open)}
>
    <ButtonLabel>Toggle details</ButtonLabel>
</Button>

<Collapsible id="details-panel" bind:open motion="swell">
    <div class="pt-3 text-sm text-weak">
        Receive a summary of project activity every Monday morning.
    </div>
</Collapsible>`;

    const partialCode = `<Collapsible id="release-notes" bind:open collapsedSize="120px" fadeMask>
    <div class="flex flex-col gap-3 text-sm text-weak">
        ...
    </div>
</Collapsible>

<Button
    variant="ghost"
    size="sm"
    aria-expanded={open}
    aria-controls="release-notes"
    onclick={() => (open = !open)}
>
    <ButtonLabel><TextMorph text={open ? "Show less" : "Show more"} /></ButtonLabel>
</Button>`;

    const horizontalCode = `<div class="flex items-center gap-2">
    <Button
        variant="tertiary"
        size="sm"
        aria-expanded={open}
        aria-controls="quick-filters"
        onclick={() => (open = !open)}
    >
        <ButtonLabel>Filters</ButtonLabel>
    </Button>

    <Collapsible id="quick-filters" bind:open axis="horizontal" motion="swell">
        <div class="flex items-center gap-2 whitespace-nowrap">
            ...
        </div>
    </Collapsible>
</div>`;

    const nestedCode = `<Collapsible id="account-settings" bind:open={outerOpen}>
    <Collapsible id="recovery-codes" bind:open={innerOpen} keepMounted={false}>
        ...
    </Collapsible>
</Collapsible>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Collapsible"
        description="Animated vertical and horizontal disclosure container with motion presets, partial collapse, and fade masking."
    />

    <PreviewSection
        title="Motion Presets"
        description="Compare slide, swell, fade, and instant transitions."
        code={motionCode}
    >
        <div class="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            {#each COLLAPSIBLE_MOTIONS as motion (motion)}
                <div class="flex flex-col rounded-2xl squircle-soft bg-sunken p-4 shadow-sunken">
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-sm font-600 text-strong">{motionLabels[motion]}</span>
                        <Button
                            variant="tertiary"
                            size="sm"
                            aria-expanded={motionOpen[motion]}
                            aria-controls="collapsible-motion-{motion}"
                            onclick={() => (motionOpen[motion] = !motionOpen[motion])}
                        >
                            <ButtonLabel><TextMorph text={motionOpen[motion] ? "Hide" : "Show"} /></ButtonLabel>
                            <ButtonIcon
                                icon={ChevronDown}
                                class="transition-transform duration-200 {motionOpen[motion] ? 'rotate-180' : ''}"
                            />
                        </Button>
                    </div>

                    <Collapsible id="collapsible-motion-{motion}" bind:open={motionOpen[motion]} {motion}>
                        <div class="pt-3 text-sm leading-relaxed text-weak">
                            <p class="font-600 text-main">{motionContent[motion].title}</p>
                            <p class="mt-1">{motionContent[motion].body}</p>
                        </div>
                    </Collapsible>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Partial Collapse"
        description="Clamp collapsed height with a surface-agnostic fade mask."
        code={partialCode}
    >
        <div class="flex w-full max-w-md flex-col gap-3">
            <h3 class="text-sm font-600 text-strong">Version 2.4 Release Notes</h3>

            <Collapsible id="collapsible-partial" bind:open={partialOpen} collapsedSize="120px" fadeMask>
                <div class="flex flex-col gap-3 text-sm leading-relaxed text-weak">
                    <p>
                        Workspace indexing now runs incrementally in the background, cutting cold-start times in half for
                        repositories with over ten thousand files.
                    </p>
                    <p>
                        Environment secrets can be scoped to individual preview branches without duplicating shared
                        production keys across teams.
                    </p>
                    <p>
                        Scheduled exports now support compressed JSONL archives alongside CSV, with automatic webhook
                        delivery once a job completes.
                    </p>
                    <p>
                        Fixed an edge case where keyboard focus could escape nested popovers when navigating quickly
                        with Tab.
                    </p>
                </div>
            </Collapsible>

            <div class="flex justify-start">
                <Button
                    variant="ghost"
                    size="sm"
                    aria-expanded={partialOpen}
                    aria-controls="collapsible-partial"
                    onclick={() => (partialOpen = !partialOpen)}
                >
                    <ButtonLabel><TextMorph text={partialOpen ? "Show less" : "Show more"} /></ButtonLabel>
                    <ButtonIcon
                        icon={ChevronDown}
                        class="transition-transform duration-200 {partialOpen ? 'rotate-180' : ''}"
                    />
                </Button>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Horizontal"
        description="Inline disclosure along the horizontal axis with stabilized inner width."
        code={horizontalCode}
    >
        <div class="inline-flex items-center gap-1.5 rounded-2xl squircle-soft bg-sunken p-1.5 shadow-sunken">
            <Button
                variant="tertiary"
                size="sm"
                aria-expanded={horizontalOpen}
                aria-controls="collapsible-horizontal"
                onclick={() => (horizontalOpen = !horizontalOpen)}
            >
                <ButtonLabel>Quick actions</ButtonLabel>
                <ButtonIcon
                    icon={ChevronRight}
                    class="transition-transform duration-200 {horizontalOpen ? 'rotate-180' : ''}"
                />
            </Button>

            <Collapsible id="collapsible-horizontal" bind:open={horizontalOpen} axis="horizontal" motion="swell">
                <div class="flex items-center gap-1.5 pl-0.5 whitespace-nowrap">
                    <Button variant="ghost" size="sm">
                        <ButtonLabel>Duplicate</ButtonLabel>
                    </Button>
                    <Button variant="ghost" size="sm">
                        <ButtonLabel>Archive</ButtonLabel>
                    </Button>
                    <Button variant="ghost" size="sm" negative>
                        <ButtonLabel>Delete</ButtonLabel>
                    </Button>
                </div>
            </Collapsible>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Nested & Lazy"
        description="Nested disclosure with lazy-mounted inner content."
        code={nestedCode}
    >
        <div class="flex w-full max-w-md flex-col">
            <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-600 text-strong">Account & Security</span>
                <Button
                    variant="tertiary"
                    size="sm"
                    aria-expanded={outerOpen}
                    aria-controls="collapsible-nested-outer"
                    onclick={() => (outerOpen = !outerOpen)}
                >
                    <ButtonLabel><TextMorph text={outerOpen ? "Collapse" : "Expand"} /></ButtonLabel>
                </Button>
            </div>

            <Collapsible id="collapsible-nested-outer" bind:open={outerOpen}>
                <div class="flex flex-col gap-3 pt-3">
                    <p class="text-sm leading-relaxed text-weak">
                        Two-factor authentication is enabled for your workspace sign-ins.
                    </p>

                    <div class="rounded-2xl squircle-soft bg-sunken p-3.5 shadow-sunken">
                        <div class="flex items-center justify-between gap-3">
                            <span class="text-xs font-600 text-main">Recovery codes</span>
                            <Button
                                variant="ghost"
                                size="xs"
                                aria-expanded={innerOpen}
                                aria-controls="collapsible-nested-inner"
                                onclick={() => (innerOpen = !innerOpen)}
                            >
                                <ButtonLabel><TextMorph text={innerOpen ? "Hide" : "Reveal"} /></ButtonLabel>
                            </Button>
                        </div>

                        <Collapsible id="collapsible-nested-inner" bind:open={innerOpen} keepMounted={false}>
                            <div class="mt-2 grid grid-cols-2 gap-1.5 font-mono text-xs tabular-nums text-weak">
                                <span>8F4K-29LM</span>
                                <span>3P7Q-91ZX</span>
                                <span>6D2N-44WR</span>
                                <span>9J5V-70CT</span>
                            </div>
                        </Collapsible>
                    </div>
                </div>
            </Collapsible>
        </div>
    </PreviewSection>
</div>
