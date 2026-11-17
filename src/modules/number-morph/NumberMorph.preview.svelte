<script module lang="ts">
    export const id = "number-morph";
    export const label = "Number-Morph";
</script>

<script lang="ts">
    import { Heart, Pause, Play, RotateCcw, Shuffle, TrendingDown, TrendingUp } from "@lucide/svelte";
    import { Badge, BadgeIcon, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { NumberMorph, NumberMorphGroup } from "cs/svelte/number-morph";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let count = $state(128);
    let revenue = $state(48_290.5);
    let compactFollowers = $state(12_400);
    let useEuroLocale = $state(false);

    let totalSeconds = $state(58);
    let timerRunning = $state(false);

    let stockPrice = $state(184.25);
    let stockDelta = $state(0.034);

    let likes = $state(42);
    let unread = $state(7);

    const minutes = $derived(Math.floor(totalSeconds / 60));
    const seconds = $derived(totalSeconds % 60);

    $effect(() => {
        if (!timerRunning) return;
        const handle = setInterval(() => {
            totalSeconds = (totalSeconds + 1) % 3600;
        }, 1000);
        return () => clearInterval(handle);
    });

    function randomizeCounter(): void {
        count = Math.floor(Math.random() * 9999);
    }

    function cycleMetrics(): void {
        const presets = [
            { rev: 1240, followers: 890 },
            { rev: 48_290.5, followers: 12_400 },
            { rev: 1_480_000.75, followers: 1_480_000 },
            { rev: 312.4, followers: 245_600 },
        ];
        const next = presets[(presets.findIndex((p) => p.rev === revenue) + 1) % presets.length];
        if (!next) return;
        revenue = next.rev;
        compactFollowers = next.followers;
    }

    function randomizeStock(): void {
        const quotes = [
            { price: 92.4, delta: -0.042 },
            { price: 184.25, delta: 0.034 },
            { price: 1420.8, delta: 0.128 },
            { price: 64.15, delta: -0.015 },
            { price: 318.9, delta: 0.009 },
        ];
        const next = quotes[Math.floor(Math.random() * quotes.length)];
        if (!next) return;
        stockPrice = next.price;
        stockDelta = next.delta;
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const counterCode = `<script lang="ts">
    import { NumberMorph } from "cs/svelte/number-morph";

    let count = $state(128);
${closeScript}

<NumberMorph value={count} class="text-4xl font-semibold" />`;

    const formattingCode = `<NumberMorph
    value={revenue}
    locales={useEuroLocale ? "de-DE" : "en-US"}
    format={{ style: "currency", currency: useEuroLocale ? "EUR" : "USD" }}
/>

<NumberMorph
    value={followers}
    locales="en-US"
    format={{ notation: "compact", maximumFractionDigits: 1 }}
    suffix=" followers"
/>`;

    const continuousCode = `<div class="inline-flex items-baseline text-3xl font-semibold tracking-tight">
    <NumberMorph value={minutes} continuous format={{ minimumIntegerDigits: 2 }} />
    <span>:</span>
    <NumberMorph
        value={seconds}
        continuous
        format={{ minimumIntegerDigits: 2 }}
        digits={{ 1: { max: 5 } }}
    />
</div>`;

    const groupCode = `<NumberMorphGroup class="gap-3">
    <NumberMorph
        value={stockPrice}
        locales="en-US"
        format={{ style: "currency", currency: "USD" }}
        class="text-2xl font-semibold"
    />
    <Badge variant="soft" color={stockDelta >= 0 ? "positive" : "negative"} size="sm">
        <NumberMorph
            value={stockDelta}
            format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "always" }}
        />
    </Badge>
</NumberMorphGroup>`;

    const compositionCode = `<Badge variant="solid" color="accent" size="md">
    <BadgeLabel>Unread</BadgeLabel>
    <NumberMorph value={unread} />
</Badge>

<Button variant="primary" size="md" onclick={() => (likes += 1)}>
    <ButtonIcon icon={Heart} />
    <ButtonLabel>Like</ButtonLabel>
    <NumberMorph value={likes} prefix="(" suffix=")" />
</Button>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="NumberMorph"
        description="Animated numeric transitions with tabular-nums alignment, Intl formatting, continuous digit rolls, and sibling layout sync."
    />

    <PreviewSection
        title="Basic Counter"
        description="Step through values or jump to random numbers with synchronized digit-column spins."
        code={counterCode}
    >
        <div class="flex flex-col items-center gap-4">
            <NumberMorph value={count} class="text-4xl font-semibold tracking-tight" />
            <div class="flex-center flex-wrap gap-2">
                <Button variant="secondary" size="sm" onclick={() => (count -= 10)}>
                    <ButtonLabel>-10</ButtonLabel>
                </Button>
                <Button variant="secondary" size="sm" onclick={() => (count -= 1)}>
                    <ButtonLabel>-1</ButtonLabel>
                </Button>
                <Button variant="secondary" size="sm" onclick={() => (count += 1)}>
                    <ButtonLabel>+1</ButtonLabel>
                </Button>
                <Button variant="secondary" size="sm" onclick={() => (count += 10)}>
                    <ButtonLabel>+10</ButtonLabel>
                </Button>
                <Button variant="tertiary" size="sm" onclick={randomizeCounter}>
                    <ButtonIcon icon={Shuffle} />
                    <ButtonLabel>Random</ButtonLabel>
                </Button>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Currency & Compact Formatting"
        description="Supports Intl.NumberFormatOptions and locales for localized currencies and compact notation."
        code={formattingCode}
    >
        <div class="flex flex-col items-center gap-5">
            <div class="flex flex-wrap items-baseline justify-center gap-8">
                <div class="flex flex-col items-center gap-1">
                    <span class="text-xs text-weak">Currency ({useEuroLocale ? "de-DE" : "en-US"})</span>
                    <NumberMorph
                        value={revenue}
                        locales={useEuroLocale ? "de-DE" : "en-US"}
                        format={{ style: "currency", currency: useEuroLocale ? "EUR" : "USD" }}
                        class="text-2xl font-semibold"
                    />
                </div>
                <div class="flex flex-col items-center gap-1">
                    <span class="text-xs text-weak">Compact Notation</span>
                    <NumberMorph
                        value={compactFollowers}
                        locales="en-US"
                        format={{ notation: "compact", maximumFractionDigits: 1 }}
                        suffix=" followers"
                        class="text-2xl font-semibold"
                    />
                </div>
            </div>
            <div class="flex-center flex-wrap gap-2">
                <Button variant="secondary" size="sm" onclick={cycleMetrics}>
                    <ButtonIcon icon={Shuffle} />
                    <ButtonLabel>Cycle Values</ButtonLabel>
                </Button>
                <Button variant="tertiary" size="sm" onclick={() => (useEuroLocale = !useEuroLocale)}>
                    <ButtonLabel>Locale: {useEuroLocale ? "de-DE (EUR)" : "en-US (USD)"}</ButtonLabel>
                </Button>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Continuous Mode & Digits Constraint"
        description="Enable continuous for odometer-style intermediate rolls and digits to cap base-60 places like mm:ss."
        code={continuousCode}
    >
        <div class="flex flex-col items-center gap-4">
            <div class="inline-flex items-baseline text-3xl font-semibold tracking-tight">
                <NumberMorph value={minutes} continuous format={{ minimumIntegerDigits: 2 }} />
                <span>:</span>
                <NumberMorph
                    value={seconds}
                    continuous
                    format={{ minimumIntegerDigits: 2 }}
                    digits={{ 1: { max: 5 } }}
                />
            </div>

            <div class="flex-center flex-wrap gap-2">
                <Button variant="primary" size="sm" onclick={() => (timerRunning = !timerRunning)}>
                    <ButtonIcon icon={timerRunning ? Pause : Play} />
                    <ButtonLabel>{timerRunning ? "Pause" : "Start"}</ButtonLabel>
                </Button>
                <Button variant="secondary" size="sm" onclick={() => (totalSeconds = (totalSeconds + 1) % 3600)}>
                    <ButtonLabel>+1s</ButtonLabel>
                </Button>
                <Button variant="secondary" size="sm" onclick={() => (totalSeconds = (totalSeconds + 15) % 3600)}>
                    <ButtonLabel>+15s</ButtonLabel>
                </Button>
                <Button
                    variant="tertiary"
                    size="sm"
                    onclick={() => {
                        timerRunning = false;
                        totalSeconds = 58;
                    }}
                >
                    <ButtonIcon icon={RotateCcw} />
                    <ButtonLabel>Reset</ButtonLabel>
                </Button>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="NumberMorphGroup Layout Sync"
        description="Sibling numbers and adjacent badges glide smoothly in lockstep as digit counts change."
        code={groupCode}
    >
        <div class="flex flex-col items-center gap-4">
            <SunkenWell>
                <NumberMorphGroup class="gap-3">
                    <NumberMorph
                        value={stockPrice}
                        locales="en-US"
                        format={{ style: "currency", currency: "USD" }}
                        class="text-2xl font-semibold"
                    />
                    <Badge variant="soft" color={stockDelta >= 0 ? "positive" : "negative"} size="md">
                        <BadgeIcon icon={stockDelta >= 0 ? TrendingUp : TrendingDown} />
                        <NumberMorph
                            value={stockDelta}
                            format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "always" }}
                        />
                    </Badge>
                </NumberMorphGroup>
            </SunkenWell>

            <Button variant="secondary" size="sm" onclick={randomizeStock}>
                <ButtonIcon icon={Shuffle} />
                <ButtonLabel>Update Quote</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Badge & Button Composition"
        description="Inherits font size, weight, and currentColor from host Badge and Button surfaces."
        code={compositionCode}
    >
        <div class="flex-center flex-wrap gap-4">
            <Badge variant="solid" color="accent" size="md">
                <BadgeLabel>Unread</BadgeLabel>
                <NumberMorph value={unread} />
            </Badge>

            <Badge variant="soft" color="positive" size="md">
                <BadgeLabel>Online</BadgeLabel>
                <NumberMorph value={unread * 14} />
            </Badge>

            <Button variant="primary" size="md" onclick={() => (likes += 1)}>
                <ButtonIcon icon={Heart} />
                <ButtonLabel>Like</ButtonLabel>
                <NumberMorph value={likes} prefix="(" suffix=")" />
            </Button>

            <Button
                variant="secondary"
                size="md"
                onclick={() => {
                    unread = (unread + 3) % 120;
                }}
            >
                <ButtonLabel>Bump Counts</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>
</div>
