<script module lang="ts">
    export const id = "card";
    export const label = "Card";
</script>

<script lang="ts">
    import {
        Fan,
        Lamp,
        Lock,
        Monitor,
        Power,
        RotateCcw,
        Settings,
        Sofa,
        Sparkles,
        Speaker,
        Thermometer,
        Utensils,
        Wind,
    } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        Card,
        CARD_ACTIONS_ALIGNS,
        CARD_ACTIONS_ORIENTATIONS,
        CARD_ORIENTATIONS,
        CARD_SIZES,
        CARD_VARIANTS,
        CardActions,
        CardBody,
        CardClose,
        CardDescription,
        CardFooter,
        CardHeader,
        CardMedia,
        CardOrnament,
        CardRail,
        CardTitle,
        type CardActionsAlign,
        type CardActionsOrientation,
        type CardOrientation,
        type CardSize,
        type CardVariant,
    } from "cs/svelte/card";
    import { Checkbox } from "cs/svelte/checkbox";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import { Switch } from "cs/svelte/switch";
    import { TextInput, TextInputField, TextInputIcon } from "cs/svelte/text-input";
    import { ToggleButton, ToggleButtonIcon } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let variant = $state<CardVariant>("elevated");
    let size = $state<CardSize>("md");
    let orientation = $state<CardOrientation>("vertical");
    let showClose = $state(true);
    let actionsAlign = $state<CardActionsAlign>("end");
    let actionsOrientation = $state<CardActionsOrientation>("horizontal");

    let promoDismissed = $state(false);

    let livingLights = $state(true);
    let livingSpeaker = $state(false);
    let livingLock = $state(true);
    let livingClimate = $state(false);

    let kitchenLights = $state(true);
    let kitchenFan = $state(false);
    let kitchenPower = $state(true);

    let studyDeskLamp = $state(true);
    let studyAir = $state(true);

    let workspaceName = $state("Studio Nord");
    let autoSync = $state(true);
    let notifyReleases = $state(true);
    let compactDensity = $state(false);
    const workspaceId = $props.id();

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const playgroundCode = `<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        Card,
        CardActions,
        CardBody,
        CardClose,
        CardDescription,
        CardFooter,
        CardHeader,
        CardMedia,
        CardTitle,
    } from "cs/svelte/card";
${closeScript}

<Card variant="elevated" size="md" orientation="vertical">
    <CardMedia ratio="16/9">...</CardMedia>
    <CardHeader>
        <CardTitle>Design System Release</CardTitle>
        <CardDescription>Calm monochrome surfaces with concentric squircle radii.</CardDescription>
    </CardHeader>
    <CardClose variant="soft" />
    <CardBody>
        <p class="text-sm text-main">Composable regions adapt smoothly between vertical and horizontal tracks.</p>
    </CardBody>
    <CardFooter>
        <span class="text-xs text-weak">Updated today</span>
        <CardActions align="end" orientation="horizontal">
            <Button variant="secondary" size="sm"><ButtonLabel>Preview</ButtonLabel></Button>
            <Button variant="primary" size="sm"><ButtonLabel>Publish</ButtonLabel></Button>
        </CardActions>
    </CardFooter>
</Card>`;

    const horizontalPromoCode = `<Card variant="elevated" size="md" orientation="horizontal">
    <CardMedia ratio="1/1">...</CardMedia>
    <CardHeader>
        <CardTitle>Become an ACME Creator</CardTitle>
        <CardDescription>
            Publish reusable themes, motion presets, and component packs for the community workspace.
        </CardDescription>
    </CardHeader>
    <CardClose variant="soft" />
    <CardFooter>
        <div class="flex flex-col">
            <span class="text-sm font-semibold text-strong">Only 10 spots</span>
            <span class="text-xs text-weak">Submission ends Oct 10</span>
        </div>
        <CardActions>
            <Button variant="primary" size="md"><ButtonLabel>Apply Now</ButtonLabel></Button>
        </CardActions>
    </CardFooter>
</Card>`;

    const dashboardCode = `<Card variant="elevated" size="sm" orientation="horizontal">
    <CardOrnament placement="bottom-left" shape="circle" style="--cs-card-ornament-color: var(--cs-color-amber-500)">
        <Sofa />
    </CardOrnament>
    <CardHeader>
        <CardTitle>Living Room</CardTitle>
        <CardDescription class="tabular-nums">24.2°C / 48%</CardDescription>
    </CardHeader>
    <CardRail variant="sunken" placement="end" columns={2}>
        <ToggleButton
            variant="ghost"
            color="accent"
            size="sm"
            iconOnly
            bind:pressed={livingLights}
            aria-label="Toggle lights"
            {@attach tooltip({ text: "Ceiling lights" })}
        >
            <ToggleButtonIcon icon={Lamp} />
        </ToggleButton>
    </CardRail>
</Card>`;

    const compositionCode = `<Card variant="elevated" size="lg">
    <CardHeader>
        <CardTitle>Workspace Preferences</CardTitle>
        <CardDescription>Configure defaults and nested sub-cards without raw borders.</CardDescription>
    </CardHeader>
    <CardBody>
        <TextInput variant="soft" size="md">...</TextInput>
        <Card variant="soft" size="md">
            <CardHeader>
                <CardTitle>Automatic Concentric Nesting</CardTitle>
                <CardDescription>Nested cards inherit computed inner radii automatically.</CardDescription>
            </CardHeader>
            <CardBody>...</CardBody>
        </Card>
    </CardBody>
    <CardFooter>...</CardFooter>
</Card>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Card"
        description="A calm, borderless, composable surface container with concentric squircle radii, horizontal media/rail tracks, and bleeding ornaments."
    />

    <PreviewSection
        title="Interactive Playground"
        description="Explore surface variants, density sizes, orientation, optional close button, and action alignment."
        code={playgroundCode}
    >
        <div class="w-full flex flex-col gap-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Variant</span>
                    <SegmentedControl size="sm" width="equal" bind:value={variant} aria-label="Card variant">
                        {#each CARD_VARIANTS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Size</span>
                    <SegmentedControl size="sm" width="equal" bind:value={size} aria-label="Card size">
                        {#each CARD_SIZES as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="uppercase">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Orientation</span>
                    <SegmentedControl size="sm" width="equal" bind:value={orientation} aria-label="Card orientation">
                        {#each CARD_ORIENTATIONS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Actions align</span>
                    <SegmentedControl size="sm" width="equal" bind:value={actionsAlign} aria-label="Actions alignment">
                        {#each CARD_ACTIONS_ALIGNS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Actions layout</span>
                    <SegmentedControl
                        size="sm"
                        width="equal"
                        bind:value={actionsOrientation}
                        aria-label="Actions orientation"
                    >
                        {#each CARD_ACTIONS_ORIENTATIONS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex items-end pb-1">
                    <label class="flex items-center gap-2.5 text-sm text-main select-none">
                        <Switch size="sm" bind:checked={showClose} />
                        <span>Show close button</span>
                    </label>
                </div>
            </div>

            <div
                class={[
                    "w-full rounded-2xl squircle-soft p-6 md:p-8 flex justify-center transition-colors",
                    variant === "soft" || variant === "sunken"
                        ? "bg-elevated border border-base-soft"
                        : "bg-canvas border border-transparent",
                ]}
            >
                <div class="w-full max-w-lg">
                    <Card {variant} {size} {orientation}>
                        <CardMedia ratio={orientation === "horizontal" ? "1/1" : "16/9"}>
                            <svg
                                viewBox="0 0 320 180"
                                preserveAspectRatio="xMidYMid slice"
                                aria-hidden="true"
                                class="size-full"
                            >
                                <defs>
                                    <linearGradient id="card-preview-grad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stop-color="var(--cs-color-sky-200)" />
                                        <stop offset="55%" stop-color="var(--cs-color-indigo-200)" />
                                        <stop offset="100%" stop-color="var(--cs-color-emerald-200)" />
                                    </linearGradient>
                                </defs>
                                <rect width="320" height="180" fill="url(#card-preview-grad)" />
                                <circle cx="245" cy="52" r="38" fill="var(--cs-color-sky-400)" opacity="0.35" />
                                <circle cx="105" cy="128" r="52" fill="var(--cs-color-indigo-400)" opacity="0.28" />
                                <path
                                    d="M0 138 Q 95 92 185 124 T 320 104 L 320 180 L 0 180 Z"
                                    fill="var(--cs-color-teal-500)"
                                    opacity="0.22"
                                />
                            </svg>
                        </CardMedia>

                        <CardHeader>
                            <CardTitle>Design System Release</CardTitle>
                            <CardDescription>Calm monochrome surfaces with concentric squircle radii.</CardDescription>
                        </CardHeader>

                        {#if showClose}
                            <CardClose variant="soft" onclick={() => (showClose = false)} />
                        {/if}

                        <CardBody>
                            <p class="text-sm text-main m-0">
                                Composable regions adapt smoothly between stacked vertical cards and side-tracked
                                horizontal layouts.
                            </p>
                        </CardBody>

                        <CardFooter>
                            <span class="text-xs text-weak">Updated today</span>
                            <CardActions align={actionsAlign} orientation={actionsOrientation}>
                                <Button variant="secondary" size="sm">
                                    <ButtonLabel>Preview</ButtonLabel>
                                </Button>
                                <Button variant="primary" size="sm">
                                    <ButtonLabel>Publish</ButtonLabel>
                                </Button>
                            </CardActions>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Horizontal Media & Action"
        description="A compact horizontal spotlight card pairing square leading artwork, balanced editorial typography, leading footer metadata, a primary action, and an optically offset corner close button."
        code={horizontalPromoCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex justify-center">
            {#if promoDismissed}
                <div class="py-6 flex flex-col items-center gap-3">
                    <span class="text-sm text-weak">Card dismissed</span>
                    <Button variant="secondary" size="sm" onclick={() => (promoDismissed = false)}>
                        <ButtonIcon icon={RotateCcw} />
                        <ButtonLabel>Restore card</ButtonLabel>
                    </Button>
                </div>
            {:else}
                <div class="w-full max-w-2xl">
                    <Card variant="elevated" size="md" orientation="horizontal">
                        <CardMedia ratio="1/1">
                            <svg viewBox="0 0 160 160" aria-hidden="true" class="size-full">
                                <defs>
                                    <linearGradient id="acme-bg" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stop-color="#c3ebe1" />
                                        <stop offset="100%" stop-color="#9ad8cb" />
                                    </linearGradient>
                                    <radialGradient id="cherry-a" cx="35%" cy="32%" r="68%">
                                        <stop offset="0%" stop-color="#ff5a6b" />
                                        <stop offset="55%" stop-color="#d81b35" />
                                        <stop offset="100%" stop-color="#8b091c" />
                                    </radialGradient>
                                    <radialGradient id="cherry-b" cx="35%" cy="32%" r="68%">
                                        <stop offset="0%" stop-color="#ff6575" />
                                        <stop offset="55%" stop-color="#df1e38" />
                                        <stop offset="100%" stop-color="#920a1f" />
                                    </radialGradient>
                                </defs>
                                <rect width="160" height="160" fill="url(#acme-bg)" />
                                <ellipse cx="56" cy="126" rx="22" ry="6" fill="#2d6e62" opacity="0.18" />
                                <ellipse cx="104" cy="126" rx="22" ry="6" fill="#2d6e62" opacity="0.18" />
                                <path
                                    d="M84 44 C 76 62, 62 78, 56 94 M84 44 C 92 64, 100 78, 104 94"
                                    fill="none"
                                    stroke="#6e8c2f"
                                    stroke-width="3.2"
                                    stroke-linecap="round"
                                />
                                <circle cx="84" cy="43" r="3.2" fill="#829e3b" />
                                <circle cx="56" cy="104" r="21" fill="url(#cherry-a)" />
                                <circle cx="104" cy="104" r="21" fill="url(#cherry-b)" />
                                <ellipse
                                    cx="49"
                                    cy="96"
                                    rx="4.5"
                                    ry="2.5"
                                    transform="rotate(-28 49 96)"
                                    fill="white"
                                    opacity="0.55"
                                />
                                <ellipse
                                    cx="97"
                                    cy="96"
                                    rx="4.5"
                                    ry="2.5"
                                    transform="rotate(-28 97 96)"
                                    fill="white"
                                    opacity="0.55"
                                />
                            </svg>
                        </CardMedia>

                        <CardHeader>
                            <CardTitle>Become an ACME Creator</CardTitle>
                            <CardDescription>
                                Publish reusable themes, motion presets, and component packs for teams building on the
                                shared workspace.
                            </CardDescription>
                        </CardHeader>

                        <CardClose variant="soft" onclick={() => (promoDismissed = true)} />

                        <CardFooter>
                            <div class="flex flex-col leading-tight">
                                <span class="text-sm font-semibold text-strong">Only 10 spots</span>
                                <span class="text-xs text-weak">Submission ends Oct 10</span>
                            </div>

                            <CardActions>
                                <Button variant="primary" size="md">
                                    <ButtonLabel>Apply Now</ButtonLabel>
                                </Button>
                            </CardActions>
                        </CardFooter>
                    </Card>
                </div>
            {/if}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Dashboard Tiles"
        description="Compact horizontal tiles combining tabular-nums telemetry, bleeding duotone CardOrnament circles, and sunken CardRail control docks."
        code={dashboardCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card variant="elevated" size="sm" orientation="horizontal" class="min-h-140px">
                    <CardOrnament
                        placement="bottom-left"
                        shape="circle"
                        style="--cs-card-ornament-color: var(--cs-color-amber-500)"
                    >
                        <Sofa />
                    </CardOrnament>

                    <CardHeader>
                        <CardTitle>Living Room</CardTitle>
                        <CardDescription class="tabular-nums">24.2°C / 48%</CardDescription>
                    </CardHeader>

                    <CardRail variant="sunken" placement="end" columns={2}>
                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="accent"
                            size="sm"
                            iconOnly
                            bind:pressed={livingLights}
                            aria-label="Toggle living room lights"
                            {@attach tooltip({ text: "Lights" })}
                        >
                            <ToggleButtonIcon icon={Lamp} />
                        </ToggleButton>

                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="accent"
                            size="sm"
                            iconOnly
                            bind:pressed={livingSpeaker}
                            aria-label="Toggle living room speaker"
                            {@attach tooltip({ text: "Speaker" })}
                        >
                            <ToggleButtonIcon icon={Speaker} />
                        </ToggleButton>

                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="positive"
                            size="sm"
                            iconOnly
                            bind:pressed={livingLock}
                            aria-label="Toggle front door lock"
                            {@attach tooltip({ text: "Door lock" })}
                        >
                            <ToggleButtonIcon icon={Lock} />
                        </ToggleButton>

                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="caution"
                            size="sm"
                            iconOnly
                            bind:pressed={livingClimate}
                            aria-label="Toggle heating boost"
                            {@attach tooltip({ text: "Heating boost" })}
                        >
                            <ToggleButtonIcon icon={Thermometer} />
                        </ToggleButton>
                    </CardRail>
                </Card>

                <Card variant="elevated" size="sm" orientation="horizontal" class="min-h-140px">
                    <CardOrnament
                        placement="bottom-left"
                        shape="circle"
                        style="--cs-card-ornament-color: var(--cs-color-emerald-500)"
                    >
                        <Utensils />
                    </CardOrnament>

                    <CardHeader>
                        <CardTitle>Kitchen</CardTitle>
                        <CardDescription class="tabular-nums">21.8°C / 51%</CardDescription>
                    </CardHeader>

                    <CardRail
                        variant="sunken"
                        placement="end"
                        columns={1}
                        style="--cs-card-rail-radius: var(--cs-radius-full)"
                    >
                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="accent"
                            size="sm"
                            iconOnly
                            class="rounded-full"
                            bind:pressed={kitchenLights}
                            aria-label="Toggle kitchen lights"
                            {@attach tooltip({ text: "Counter lights" })}
                        >
                            <ToggleButtonIcon icon={Lamp} />
                        </ToggleButton>

                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="accent"
                            size="sm"
                            iconOnly
                            class="rounded-full"
                            bind:pressed={kitchenFan}
                            aria-label="Toggle extractor fan"
                            {@attach tooltip({ text: "Extractor fan" })}
                        >
                            <ToggleButtonIcon icon={Fan} />
                        </ToggleButton>

                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="positive"
                            size="sm"
                            iconOnly
                            class="rounded-full"
                            bind:pressed={kitchenPower}
                            aria-label="Toggle kitchen outlets"
                            {@attach tooltip({ text: "Appliance power" })}
                        >
                            <ToggleButtonIcon icon={Power} />
                        </ToggleButton>
                    </CardRail>
                </Card>

                <Card variant="elevated" size="sm" orientation="horizontal" class="min-h-140px">
                    <CardOrnament
                        placement="bottom-left"
                        shape="circle"
                        style="--cs-card-ornament-color: var(--cs-color-sky-500)"
                    >
                        <Monitor />
                    </CardOrnament>

                    <CardHeader>
                        <CardTitle>Study</CardTitle>
                        <CardDescription class="tabular-nums">23.4°C / 44%</CardDescription>
                    </CardHeader>

                    <CardRail
                        variant="sunken"
                        placement="end"
                        columns={1}
                        style="--cs-card-rail-radius: var(--cs-radius-full)"
                    >
                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="accent"
                            size="sm"
                            iconOnly
                            class="rounded-full"
                            bind:pressed={studyDeskLamp}
                            aria-label="Toggle desk lamp"
                            {@attach tooltip({ text: "Desk lamp" })}
                        >
                            <ToggleButtonIcon icon={Lamp} />
                        </ToggleButton>

                        <!-- eslint-disable-next-line toggle-button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <ToggleButton
                            variant="ghost"
                            color="accent"
                            size="sm"
                            iconOnly
                            class="rounded-full"
                            bind:pressed={studyAir}
                            aria-label="Toggle air purifier"
                            {@attach tooltip({ text: "Air purifier" })}
                        >
                            <ToggleButtonIcon icon={Wind} />
                        </ToggleButton>

                        <!-- eslint-disable-next-line button/require-hit-area -- Tight CardRail cells would cause hit areas to overlap -->
                        <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            class="rounded-full"
                            aria-label="Study room settings"
                            {@attach tooltip({ text: "Room settings" })}
                        >
                            <ButtonIcon icon={Settings} />
                        </Button>
                    </CardRail>
                </Card>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Rich Composition & Nesting"
        description="Interactive form primitives in CardBody and automatic concentric radius nesting on inner soft cards."
        code={compositionCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex justify-center">
            <div class="w-full max-w-xl">
                <Card variant="elevated" size="lg">
                    <CardHeader>
                        <CardTitle>Workspace Preferences</CardTitle>
                        <CardDescription>
                            Group form controls and nested sub-surfaces with automatic concentric corners.
                        </CardDescription>
                    </CardHeader>

                    <CardBody>
                        <div class="flex flex-col gap-1.5">
                            <label for={workspaceId} class="text-xs font-medium text-weak">Workspace name</label>
                            <TextInput variant="soft" size="md">
                                <TextInputIcon icon={Sparkles} />
                                <TextInputField
                                    id={workspaceId}
                                    bind:value={workspaceName}
                                    placeholder="Enter workspace name..."
                                />
                            </TextInput>
                        </div>

                        <Card variant="soft" size="md">
                            <CardHeader>
                                <CardTitle>Sync & Notifications</CardTitle>
                                <CardDescription>
                                    Nested soft cards automatically compute a tighter concentric squircle radius.
                                </CardDescription>
                            </CardHeader>

                            <CardBody>
                                <label class="flex items-center justify-between gap-4 text-sm text-main select-none">
                                    <span>Sync workspace presets</span>
                                    <Switch size="md" bind:checked={autoSync} />
                                </label>

                                <label class="flex items-center gap-3 text-sm text-main select-none">
                                    <Checkbox variant="elevated" size="md" bind:checked={notifyReleases} />
                                    <span>Notify on token updates</span>
                                </label>

                                <label class="flex items-center gap-3 text-sm text-main select-none">
                                    <Checkbox variant="elevated" size="md" bind:checked={compactDensity} />
                                    <span>Use compact tile spacing</span>
                                </label>
                            </CardBody>
                        </Card>
                    </CardBody>

                    <CardFooter>
                        <span class="text-xs text-weak">
                            {autoSync ? "Cloud sync enabled" : "Local changes only"}
                        </span>

                        <CardActions>
                            <Button variant="secondary" size="md">
                                <ButtonLabel>Cancel</ButtonLabel>
                            </Button>
                            <Button variant="primary" size="md">
                                <ButtonLabel>Save changes</ButtonLabel>
                            </Button>
                        </CardActions>
                    </CardFooter>
                </Card>
            </div>
        </div>
    </PreviewSection>
</div>
