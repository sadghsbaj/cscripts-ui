/**
 * Enforces direct-child structural placement for `<KpiCard>` subcomponents:
 * - `KpiCardHeader`, `KpiCardMetric`, `KpiCardComparison`, `KpiCardTarget`, `KpiCardVisual`, `KpiCardBreakdown`, `KpiCardBody`, `KpiCardFooter`, `KpiCardOrnament`, and `KpiCardClose` must have `<KpiCard>` as their direct element ancestor (Svelte control-flow blocks are transparent).
 * - `KpiCardLabel` and `KpiCardIcon` must have `<KpiCardHeader>` or `<KpiCard>` as their direct element ancestor.
 * - `KpiCardActions` must have `<KpiCard>`, `<KpiCardHeader>`, or `<KpiCardFooter>` as its direct element ancestor.
 * - `KpiCardBreakdownItem` must have `<KpiCardBreakdown>` as its direct element ancestor.
 * - `KpiCardValue` must have `<KpiCardMetric>`, `<KpiCard>`, or `<NumberMorphGroup>` (inside `<KpiCardMetric>` / `<KpiCard>`) as its direct element ancestor.
 * - `KpiCardDelta` must have `<KpiCardMetric>`, `<KpiCard>`, `<KpiCardHeader>`, `<KpiCardBreakdownItem>`, or `<NumberMorphGroup>` (inside one of those parents) as its direct element ancestor.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { getElementName, shouldSkipFile } from "./utils.ts";

interface PlacementConstraint {
    allowedParents: ReadonlySet<string>;
    allowNumberMorphGroupWrapper?: boolean;
    messageId:
        | "requireDirectKpiCardParent"
        | "requireDirectKpiCardOrHeaderParent"
        | "requireDirectKpiCardActionsParent"
        | "requireDirectKpiCardBreakdownParent"
        | "requireDirectKpiCardValueParent"
        | "requireDirectKpiCardDeltaParent";
}

const KPI_CARD_PARENT = new Set(["KpiCard"]);
const KPI_CARD_HEADER_OR_CARD_PARENT = new Set(["KpiCardHeader", "KpiCard"]);
const KPI_CARD_ACTIONS_PARENT = new Set(["KpiCard", "KpiCardHeader", "KpiCardFooter"]);
const KPI_CARD_BREAKDOWN_PARENT = new Set(["KpiCardBreakdown"]);
const KPI_CARD_VALUE_PARENT = new Set(["KpiCardMetric", "KpiCard"]);
const KPI_CARD_DELTA_PARENT = new Set(["KpiCardMetric", "KpiCard", "KpiCardHeader", "KpiCardBreakdownItem"]);

const PLACEMENT_CONSTRAINTS = new Map<string, PlacementConstraint>([
    [
        "KpiCardHeader",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardMetric",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardComparison",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardTarget",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardVisual",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardBreakdown",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardBody",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardFooter",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardOrnament",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardClose",
        { allowedParents: KPI_CARD_PARENT, messageId: "requireDirectKpiCardParent" },
    ],
    [
        "KpiCardLabel",
        { allowedParents: KPI_CARD_HEADER_OR_CARD_PARENT, messageId: "requireDirectKpiCardOrHeaderParent" },
    ],
    [
        "KpiCardIcon",
        { allowedParents: KPI_CARD_HEADER_OR_CARD_PARENT, messageId: "requireDirectKpiCardOrHeaderParent" },
    ],
    [
        "KpiCardActions",
        { allowedParents: KPI_CARD_ACTIONS_PARENT, messageId: "requireDirectKpiCardActionsParent" },
    ],
    [
        "KpiCardBreakdownItem",
        { allowedParents: KPI_CARD_BREAKDOWN_PARENT, messageId: "requireDirectKpiCardBreakdownParent" },
    ],
    [
        "KpiCardValue",
        {
            allowedParents: KPI_CARD_VALUE_PARENT,
            allowNumberMorphGroupWrapper: true,
            messageId: "requireDirectKpiCardValueParent",
        },
    ],
    [
        "KpiCardDelta",
        {
            allowedParents: KPI_CARD_DELTA_PARENT,
            allowNumberMorphGroupWrapper: true,
            messageId: "requireDirectKpiCardDeltaParent",
        },
    ],
]);

const CONTROL_FLOW_BLOCK_TYPES = new Set([
    "SvelteIfBlock",
    "SvelteElseBlock",
    "SvelteEachBlock",
    "SvelteAwaitBlock",
    "SvelteAwaitPendingBlock",
    "SvelteAwaitThenBlock",
    "SvelteAwaitCatchBlock",
    "SvelteKeyBlock",
]);

type AncestorResult =
    | { kind: "element"; element: AST.SvelteElement }
    | { kind: "snippet" }
    | { kind: "none" };

function getDirectElementAncestor(node: AST.SvelteElement): AncestorResult {
    let current = (node as unknown as { parent?: { type: string } }).parent;
    while (current) {
        if (current.type === "SvelteElement") {
            return { kind: "element", element: current as unknown as AST.SvelteElement };
        }
        if (current.type === "SvelteSnippetBlock") {
            return { kind: "snippet" };
        }
        if (!CONTROL_FLOW_BLOCK_TYPES.has(current.type)) {
            return { kind: "none" };
        }
        current = (current as { parent?: { type: string } }).parent;
    }
    return { kind: "none" };
}

export const kpiCardStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce direct-child placement of <KpiCard> subcomponents",
        },
        messages: {
            requireDirectKpiCardParent:
                "<{{name}}> must be a direct child of <KpiCard> (wrapping elements break .cs-kpi-card > ... CSS Grid tracks and KpiCardClose clearance).",
            requireDirectKpiCardOrHeaderParent:
                "<{{name}}> must be a direct child of <KpiCardHeader> or <KpiCard>.",
            requireDirectKpiCardActionsParent:
                "<{{name}}> must be a direct child of <KpiCard>, <KpiCardHeader>, or <KpiCardFooter>.",
            requireDirectKpiCardBreakdownParent:
                "<{{name}}> must be a direct child of <KpiCardBreakdown>.",
            requireDirectKpiCardValueParent:
                "<{{name}}> must be a direct child of <KpiCardMetric>, <NumberMorphGroup>, or <KpiCard>.",
            requireDirectKpiCardDeltaParent:
                "<{{name}}> must be a direct child of <KpiCardMetric>, <NumberMorphGroup>, <KpiCard>, <KpiCardHeader>, or <KpiCardBreakdownItem>.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);
                const constraint = PLACEMENT_CONSTRAINTS.get(name);
                if (!constraint) return;

                let ancestor = getDirectElementAncestor(node);
                if (ancestor.kind === "snippet") return;

                // NumberMorphGroup wraps KpiCardValue and KpiCardDelta for sibling morph transitions.
                if (
                    constraint.allowNumberMorphGroupWrapper &&
                    ancestor.kind === "element" &&
                    getElementName(ancestor.element) === "NumberMorphGroup"
                ) {
                    ancestor = getDirectElementAncestor(ancestor.element);
                    if (ancestor.kind === "snippet") return;
                }

                if (ancestor.kind !== "element" || !constraint.allowedParents.has(getElementName(ancestor.element))) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: constraint.messageId,
                        data: { name },
                    });
                }
            },
        };
    },
};

export const kpiCardConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "kpi-card": {
            rules: {
                "require-structure": kpiCardStructureRule,
            },
        },
    },
    rules: {
        "kpi-card/require-structure": "error",
    },
};
