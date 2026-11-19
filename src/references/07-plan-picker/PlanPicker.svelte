<script lang="ts">
    import { Check } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "cs/svelte/card";
    import { NumberMorph, NumberMorphGroup } from "cs/svelte/number-morph";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";

    export type BillingPeriod = "monthly" | "yearly";

    export interface PlanOption {
        id: string;
        name: string;
        summary: string;
        monthlyPrice: number;
        yearlyPrice: number;
        features: string[];
        ctaLabel: string;
        recommended?: boolean;
    }

    export interface PlanPickerProps {
        plans?: PlanOption[];
        billing?: BillingPeriod;
        selectedPlan?: string;
        disabled?: boolean;
        onselect?: (planId: string) => void;
        class?: string;
    }

    const DEFAULT_PLANS: PlanOption[] = [
        {
            id: "free",
            name: "Free",
            summary: "For personal projects and quick prototypes.",
            monthlyPrice: 0,
            yearlyPrice: 0,
            features: ["Up to 3 projects", "1 GB cloud storage", "Community support"],
            ctaLabel: "Get started",
        },
        {
            id: "pro",
            name: "Pro",
            summary: "For growing teams shipping production apps.",
            monthlyPrice: 12,
            yearlyPrice: 9,
            features: ["Unlimited projects", "50 GB cloud storage", "Priority email support", "Custom domains"],
            ctaLabel: "Upgrade to Pro",
            recommended: true,
        },
        {
            id: "team",
            name: "Team",
            summary: "For organizations with shared workspaces.",
            monthlyPrice: 29,
            yearlyPrice: 24,
            features: ["Everything in Pro", "500 GB shared storage", "Role-based access", "Audit logs"],
            ctaLabel: "Start Team trial",
        },
    ];

    let {
        plans = DEFAULT_PLANS,
        billing = $bindable<BillingPeriod>("monthly"),
        selectedPlan = $bindable<string | undefined>(),
        disabled = false,
        onselect,
        class: className,
    }: PlanPickerProps = $props();

    function handleSelect(planId: string): void {
        if (disabled) return;
        selectedPlan = planId;
        onselect?.(planId);
    }
</script>

<div class={["w-full max-w-[var(--cs-container-4xl)] flex flex-col items-center gap-6", className]}>
    <SegmentedControl size="md" width="content" bind:value={billing} {disabled} aria-label="Billing period">
        <SegmentedControlItem value="monthly">
            <SegmentedControlLabel>Monthly</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="yearly">
            <SegmentedControlLabel>Yearly</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>

    <NumberMorphGroup class="w-full">
        <div class="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {#each plans as plan (plan.id)}
                {const price = $derived(billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice)}
                {const isCurrent = $derived(selectedPlan === plan.id)}

                <Card variant="elevated" size="lg" class="h-full grid-rows-[auto_1fr_auto]">
                    <CardHeader>
                        <CardTitle as="h3" class="title-md flex items-center justify-between gap-2">
                            <span>{plan.name}</span>
                            {#if plan.recommended}
                                <Badge variant="soft" color="accent" size="sm">
                                    <BadgeLabel>Popular</BadgeLabel>
                                </Badge>
                            {/if}
                        </CardTitle>
                        <CardDescription class="text-sm text-weak">{plan.summary}</CardDescription>
                    </CardHeader>

                    <CardBody class="gap-5">
                        <div class="flex items-baseline gap-1">
                            <span class="text-3xl font-600 tracking-tight text-strong tabular-nums">
                                <NumberMorph
                                    value={price}
                                    locales="en-US"
                                    format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
                                    willChange
                                />
                            </span>
                            <span class="text-sm text-weak">/ mo</span>
                        </div>

                        <ul class="flex flex-col gap-2.5 m-0 p-0 list-none">
                            {#each plan.features as feature (feature)}
                                <li class="flex items-center gap-2.5">
                                    <Check class="size-4 shrink-0 text-weak" strokeWidth={2.25} aria-hidden="true" />
                                    <span class="text-sm text-main">{feature}</span>
                                </li>
                            {/each}
                        </ul>
                    </CardBody>

                    <CardFooter class="w-full">
                        <Button
                            variant={plan.recommended ? "primary" : "tertiary"}
                            size="md"
                            class="w-full"
                            disabled={disabled || isCurrent}
                            onclick={() => handleSelect(plan.id)}
                        >
                            <ButtonLabel>{isCurrent ? "Current plan" : plan.ctaLabel}</ButtonLabel>
                        </Button>
                    </CardFooter>
                </Card>
            {/each}
        </div>
    </NumberMorphGroup>
</div>
