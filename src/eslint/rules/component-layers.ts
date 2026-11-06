/**
 * Enforces strict CSS cascade layers on `<style>` blocks in `.svelte` components:
 * - Requires `@layer components.primitive` or `@layer components.composite`.
 * - Forbids bare `@layer components` and unlayered style rules.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { shouldSkipFile } from "./utils.ts";

export const componentLayersRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce @layer components.primitive or @layer components.composite in component <style> blocks",
        },
        messages: {
            missingLayer:
                "Component <style> must wrap styles in '@layer components.primitive' or '@layer components.composite'. Unlayered styles are forbidden.",
            forbiddenBareComponents:
                "Bare '@layer components' is forbidden. Components must explicitly use '@layer components.primitive' or '@layer components.composite'.",
            invalidLayer:
                "Component styles must use '@layer components.primitive' or '@layer components.composite', but found '@layer {{layer}}'.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        const filename = context.filename ?? "";
        if (!filename.includes("svelte/components/") && !filename.includes("svelte/work/")) {
            return {};
        }

        if (shouldSkipFile(context)) return {};

        return {
            SvelteStyleElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteStyleElement;
                const css = node.children
                    .map((c) => (c.type === "SvelteText" ? c.value : ""))
                    .join("")
                    .trim();

                if (!css) return;

                const layerMatches = Array.from(
                    css.matchAll(/@layer\s+([a-zA-Z0-9_.-]+)/g),
                    (m) => m[1]
                );

                if (layerMatches.length === 0) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingLayer",
                    });
                    return;
                }

                for (const layer of layerMatches) {
                    if (layer === "components") {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "forbiddenBareComponents",
                        });
                    } else if (layer !== "components.primitive" && layer !== "components.composite") {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "invalidLayer",
                            data: { layer },
                        });
                    }
                }
            },
        };
    },
};

export const componentLayersConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "component-layers": {
            rules: {
                "valid-style-layer": componentLayersRule,
            },
        },
    },
    rules: {
        "component-layers/valid-style-layer": "error",
    },
};
