/**
 * Shared AST helpers and attribute validators for custom Svelte ESLint rules.
 * Centralizing AST traversal and enum validation ensures uniform error reporting across design system components.
 */

import type { Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";

/**
 * Determines whether a file should be ignored by custom component rules (tests, lint internals).
 */
export function shouldSkipFile(context: Rule.RuleContext): boolean {
    const filename = context.filename ?? "";
    return (
        filename.includes("eslint/") ||
        filename.endsWith(".test.ts") ||
        filename.endsWith(".spec.ts")
    );
}

/**
 * Checks whether an element contains a specific CSS class, supporting both
 * static/interpolated `class="..."` attributes and Svelte `class:name` directives.
 */
export function hasClass(node: AST.SvelteElement, targetClass: string): boolean {
    for (const attr of node.startTag.attributes) {
        if (attr.type === "SvelteAttribute" && attr.key.name === "class") {
            const classText = attr.value
                .filter((v): v is AST.SvelteLiteral => v.type === "SvelteLiteral")
                .map((v) => v.value)
                .join(" ");

            // Using whitespace split avoids partial matches with hyphens (e.g. cs-button vs cs-button-label)
            if (classText.split(/\s+/).includes(targetClass)) {
                return true;
            }
        }

        if (
            attr.type === "SvelteDirective" &&
            attr.kind === "Class" &&
            attr.key.name.name === targetClass
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Finds an attribute on a Svelte element's start tag by its attribute name.
 */
export function findAttribute(
    node: AST.SvelteElement,
    name: string
): AST.SvelteAttribute | undefined {
    return node.startTag.attributes.find(
        (attr): attr is AST.SvelteAttribute =>
            attr.type === "SvelteAttribute" && attr.key.name === name
    );
}

/**
 * Extracts the static literal string value of an attribute if available.
 * Returns undefined for dynamic Mustache tags or complex expressions to avoid false positives.
 */
export function getLiteralStringValue(attr: AST.SvelteAttribute): string | undefined {
    if (attr.boolean) return "";
    const firstVal = attr.value[0];
    if (firstVal && firstVal.type === "SvelteLiteral") {
        return firstVal.value;
    }
    return undefined;
}

export interface EnumCheckOptions {
    required?: boolean;
    componentName?: string;
    missingMessageId?: string;
    invalidMessageId?: string;
}

/**
 * Validates a component data attribute against an allowed set of enum values.
 * Returns the literal string value if present, allowing callers to perform conditional validations.
 */
export function checkEnumAttribute(
    context: Rule.RuleContext,
    node: AST.SvelteElement,
    attributeName: string,
    allowedValues: Set<string>,
    options?: EnumCheckOptions
): string | undefined {
    const attr = findAttribute(node, attributeName);

    if (!attr) {
        if (options?.required) {
            if (options.missingMessageId) {
                context.report({
                    node: node.startTag as unknown as Rule.Node,
                    messageId: options.missingMessageId,
                });
            } else {
                const component = options.componentName ?? "Component";
                context.report({
                    node: node.startTag as unknown as Rule.Node,
                    message: `${component} must specify '${attributeName}' (${[...allowedValues].join(" | ")}).`,
                });
            }
        }
        return undefined;
    }

    const val = getLiteralStringValue(attr);
    if (val !== undefined && !allowedValues.has(val)) {
        if (options?.invalidMessageId) {
            context.report({
                node: attr as unknown as Rule.Node,
                messageId: options.invalidMessageId,
                data: { value: val },
            });
        } else {
            context.report({
                node: attr as unknown as Rule.Node,
                message: `Invalid ${attributeName} "${val}". Allowed: ${[...allowedValues].join(", ")}.`,
            });
        }
    }

    return val;
}
