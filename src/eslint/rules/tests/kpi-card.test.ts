import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { kpiCardStructureRule } from "../kpi-card.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("kpi-card ESLint rules", () => {
    describe("kpi-card/require-structure", () => {
        it("validates direct-child placement of <KpiCard> subcomponents", () => {
            ruleTester.run("kpi-card/require-structure", kpiCardStructureRule, {
                valid: [
                    {
                        // Full composition
                        code: [
                            '<KpiCard variant="elevated" size="md">',
                            "    <KpiCardOrnament />",
                            "    <KpiCardClose />",
                            "    <KpiCardHeader>",
                            "        <KpiCardIcon icon={Activity} />",
                            "        <KpiCardLabel>Revenue</KpiCardLabel>",
                            "        <KpiCardActions><button>Menu</button></KpiCardActions>",
                            "    </KpiCardHeader>",
                            "    <KpiCardMetric>",
                            '        <KpiCardValue prefix="$">148,920</KpiCardValue>',
                            '        <KpiCardDelta trend="up">+14.2%</KpiCardDelta>',
                            "    </KpiCardMetric>",
                            "    <KpiCardComparison>vs. last 30 days</KpiCardComparison>",
                            "    <KpiCardTarget value={80} max={100} />",
                            "    <KpiCardVisual><svg /></KpiCardVisual>",
                            "    <KpiCardBreakdown>",
                            '        <KpiCardBreakdownItem label="Organic" value="$92k" />',
                            "    </KpiCardBreakdown>",
                            "    <KpiCardBody><p>Details</p></KpiCardBody>",
                            "    <KpiCardFooter>",
                            "        <span>Updated 2m ago</span>",
                            "        <KpiCardActions><button>Inspect</button></KpiCardActions>",
                            "    </KpiCardFooter>",
                            "</KpiCard>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // NumberMorphGroup inside KpiCardMetric
                        code: [
                            '<KpiCard variant="elevated" size="md">',
                            "    <KpiCardMetric>",
                            "        <NumberMorphGroup>",
                            "            <KpiCardValue>42,500</KpiCardValue>",
                            '            <KpiCardDelta trend="up">+8%</KpiCardDelta>',
                            "        </NumberMorphGroup>",
                            "    </KpiCardMetric>",
                            "</KpiCard>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Direct KpiCard children shorthand (without header/metric wrappers)
                        code: [
                            '<KpiCard variant="soft" size="sm">',
                            "    <KpiCardIcon icon={Activity} />",
                            "    <KpiCardLabel>Users</KpiCardLabel>",
                            "    <KpiCardValue>1,240</KpiCardValue>",
                            '    <KpiCardDelta trend="up">+4%</KpiCardDelta>',
                            "    <KpiCardActions><button>View</button></KpiCardActions>",
                            "</KpiCard>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // KpiCardDelta in KpiCardHeader and KpiCardBreakdownItem
                        code: [
                            '<KpiCard variant="elevated" size="md">',
                            "    <KpiCardHeader>",
                            "        <KpiCardLabel>Latency</KpiCardLabel>",
                            '        <KpiCardDelta trend="down" color="positive">-12ms</KpiCardDelta>',
                            "    </KpiCardHeader>",
                            "    <KpiCardBreakdown>",
                            '        <KpiCardBreakdownItem label="P95" value="118ms">',
                            '            <KpiCardDelta trend="down" color="positive">-8ms</KpiCardDelta>',
                            "        </KpiCardBreakdownItem>",
                            "    </KpiCardBreakdown>",
                            "</KpiCard>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Standalone KpiCardGroup and inside CardBody
                        code: [
                            "<KpiCardGroup columns={3}>",
                            '    <KpiCard variant="elevated" size="sm">',
                            "        <KpiCardValue>100</KpiCardValue>",
                            "    </KpiCard>",
                            "</KpiCardGroup>",
                            '<Card variant="elevated" size="lg">',
                            "    <CardBody>",
                            "        <KpiCardGroup columns={2}>",
                            '            <KpiCard variant="sunken" size="sm">',
                            "                <KpiCardValue>200</KpiCardValue>",
                            "            </KpiCard>",
                            "        </KpiCardGroup>",
                            "    </CardBody>",
                            "</Card>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Control-flow blocks are transparent
                        code: [
                            '<KpiCard variant="elevated" size="md">',
                            "    {#if showHeader}",
                            "        <KpiCardHeader>",
                            "            {#if showIcon}<KpiCardIcon icon={Activity} />{/if}",
                            "            <KpiCardLabel>Revenue</KpiCardLabel>",
                            "        </KpiCardHeader>",
                            "    {:else}",
                            "        <KpiCardBody><p>Fallback</p></KpiCardBody>",
                            "    {/if}",
                            "    <KpiCardMetric>",
                            "        {#if animated}",
                            "            <NumberMorphGroup>",
                            "                <KpiCardValue>100</KpiCardValue>",
                            "            </NumberMorphGroup>",
                            "        {/if}",
                            "    </KpiCardMetric>",
                            "    <KpiCardBreakdown>",
                            "        {#each rows as row (row.id)}",
                            "            <KpiCardBreakdownItem label={row.label} value={row.value} />",
                            "        {/each}",
                            "    </KpiCardBreakdown>",
                            "</KpiCard>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Snippet definitions are exempt
                        code: [
                            "{#snippet metric()}",
                            "    <KpiCardMetric>",
                            "        <KpiCardValue>99</KpiCardValue>",
                            '        <KpiCardDelta trend="up">+1%</KpiCardDelta>',
                            "    </KpiCardMetric>",
                            "{/snippet}",
                            "{#snippet header()}",
                            "    <KpiCardLabel>Metric</KpiCardLabel>",
                            "    <KpiCardIcon icon={Activity} />",
                            "{/snippet}",
                            "{#snippet breakdownItem()}",
                            '    <KpiCardBreakdownItem label="Direct" value="42" />',
                            "{/snippet}",
                            "{#snippet morphValue()}",
                            "    <NumberMorphGroup>",
                            "        <KpiCardValue>42</KpiCardValue>",
                            "    </NumberMorphGroup>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Direct KpiCard child outside KpiCard
                        code: "<KpiCardMetric>Metric</KpiCardMetric>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardParent",
                                data: { name: "KpiCardMetric" },
                            },
                        ],
                    },
                    {
                        // Direct KpiCard child wrapped in <div>
                        code: "<KpiCard><div><KpiCardBody>Body</KpiCardBody></div></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardParent",
                                data: { name: "KpiCardBody" },
                            },
                        ],
                    },
                    {
                        // KpiCardClose wrapped in <div>
                        code: "<KpiCard><div><KpiCardClose /></div></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardParent",
                                data: { name: "KpiCardClose" },
                            },
                        ],
                    },
                    {
                        // KpiCardClose placed inside KpiCardHeader
                        code: "<KpiCard><KpiCardHeader><KpiCardClose /></KpiCardHeader></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardParent",
                                data: { name: "KpiCardClose" },
                            },
                        ],
                    },
                    {
                        // KpiCardBreakdownItem outside KpiCardBreakdown
                        code: "<KpiCard><KpiCardBreakdownItem label='A' value='1' /></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardBreakdownParent",
                                data: { name: "KpiCardBreakdownItem" },
                            },
                        ],
                    },
                    {
                        // KpiCardBreakdownItem wrapped in <div> inside KpiCardBreakdown
                        code: "<KpiCard><KpiCardBreakdown><div><KpiCardBreakdownItem label='A' value='1' /></div></KpiCardBreakdown></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardBreakdownParent",
                                data: { name: "KpiCardBreakdownItem" },
                            },
                        ],
                    },
                    {
                        // KpiCardLabel outside KpiCard / KpiCardHeader
                        code: "<KpiCardLabel>Revenue</KpiCardLabel>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardOrHeaderParent",
                                data: { name: "KpiCardLabel" },
                            },
                        ],
                    },
                    {
                        // KpiCardIcon wrapped in <div> inside KpiCardHeader
                        code: "<KpiCard><KpiCardHeader><div><KpiCardIcon icon={Activity} /></div></KpiCardHeader></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardOrHeaderParent",
                                data: { name: "KpiCardIcon" },
                            },
                        ],
                    },
                    {
                        // KpiCardActions inside KpiCardBody
                        code: "<KpiCard><KpiCardBody><KpiCardActions /></KpiCardBody></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardActionsParent",
                                data: { name: "KpiCardActions" },
                            },
                        ],
                    },
                    {
                        // KpiCardValue wrapped in <div> inside KpiCardMetric
                        code: "<KpiCard><KpiCardMetric><div><KpiCardValue>42</KpiCardValue></div></KpiCardMetric></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardValueParent",
                                data: { name: "KpiCardValue" },
                            },
                        ],
                    },
                    {
                        // KpiCardValue inside standalone NumberMorphGroup outside KpiCard
                        code: "<NumberMorphGroup><KpiCardValue>42</KpiCardValue></NumberMorphGroup>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardValueParent",
                                data: { name: "KpiCardValue" },
                            },
                        ],
                    },
                    {
                        // KpiCardValue placed inside KpiCardHeader
                        code: "<KpiCard><KpiCardHeader><KpiCardValue>42</KpiCardValue></KpiCardHeader></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardValueParent",
                                data: { name: "KpiCardValue" },
                            },
                        ],
                    },
                    {
                        // KpiCardDelta placed inside KpiCardFooter
                        code: "<KpiCard><KpiCardFooter><KpiCardDelta>+5%</KpiCardDelta></KpiCardFooter></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardDeltaParent",
                                data: { name: "KpiCardDelta" },
                            },
                        ],
                    },
                    {
                        // KpiCardDelta inside wrapped NumberMorphGroup
                        code: "<KpiCard><KpiCardMetric><div><NumberMorphGroup><KpiCardDelta>+5%</KpiCardDelta></NumberMorphGroup></div></KpiCardMetric></KpiCard>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectKpiCardDeltaParent",
                                data: { name: "KpiCardDelta" },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
