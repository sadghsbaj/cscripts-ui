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
 * Recursively checks whether any descendant element contains a specific CSS class.
 * Traverses Svelte elements, arrays of children, and conditional blocks ({#if} / {:else}).
 */
export function hasDescendantClass(
    children: AST.SvelteElement["children"],
    targetClass: string
): boolean {
    for (const child of children) {
        if (child.type === "SvelteElement") {
            if (hasClass(child, targetClass)) {
                return true;
            }
            if (hasDescendantClass(child.children, targetClass)) {
                return true;
            }
        } else if (
            "children" in child &&
            Array.isArray(child.children) &&
            hasDescendantClass(child.children as AST.SvelteElement["children"], targetClass)
        ) {
            return true;
        }

        if (
            "else" in child &&
            child.else &&
            "children" in child.else &&
            Array.isArray(child.else.children) &&
            hasDescendantClass(child.else.children as AST.SvelteElement["children"], targetClass)
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
 * Scans <script> blocks in a Svelte file to collect names of imported icon components
 * (e.g. from 'lucide-svelte' or icon packages).
 */
export function getImportedIconNames(context: Rule.RuleContext): Set<string> {
    const iconNames = new Set<string>();
    const ast = context.sourceCode?.ast;
    if (!ast || !("body" in ast) || !Array.isArray(ast.body)) return iconNames;

    for (const node of ast.body) {
        // Direct root ImportDeclaration
        if (node.type === "ImportDeclaration" && typeof node.source?.value === "string") {
            const src = node.source.value.toLowerCase();
            if (src.includes("lucide") || src.includes("icon")) {
                for (const spec of node.specifiers) {
                    if (spec.local?.name) {
                        iconNames.add(spec.local.name);
                    }
                }
            }
        }

        // Inside <script> (SvelteScriptElement)
        const customNode = node as unknown as { type: string; body?: unknown[] };
        if (
            customNode.type === "SvelteScriptElement" &&
            Array.isArray(customNode.body)
        ) {
            for (const item of customNode.body) {
                const statement = item as {
                    type: string;
                    source?: { value?: unknown };
                    specifiers?: Array<{ local?: { name?: string } }>;
                };
                if (
                    statement.type === "ImportDeclaration" &&
                    typeof statement.source?.value === "string"
                ) {
                    const src = statement.source.value.toLowerCase();
                    if (src.includes("lucide") || src.includes("icon")) {
                        const specifiers = statement.specifiers ?? [];
                        for (const spec of specifiers) {
                            if (spec.local?.name) {
                                iconNames.add(spec.local.name);
                            }
                        }
                    }
                }
            }
        }
    }

    return iconNames;
}

/**
 * Finds all direct or nested icon elements (<svg>, Lucide components, *Icon) inside child nodes.
 */
export function findIcons(
    children: AST.SvelteElement["children"],
    iconNames: Set<string>
): AST.SvelteElement[] {
    const icons: AST.SvelteElement[] = [];

    function search(nodes: AST.SvelteElement["children"]): void {
        for (const child of nodes) {
            if (child.type === "SvelteElement") {
                const tagName = "name" in child.name ? child.name.name : "";
                if (
                    tagName === "svg" ||
                    iconNames.has(tagName) ||
                    tagName.endsWith("Icon") ||
                    tagName.startsWith("Icon")
                ) {
                    icons.push(child);
                } else {
                    search(child.children);
                }
            } else if ("children" in child && Array.isArray(child.children)) {
                search(child.children as AST.SvelteElement["children"]);
            } else if (
                "else" in child &&
                child.else &&
                "children" in child.else &&
                Array.isArray(child.else.children)
            ) {
                search(child.else.children as AST.SvelteElement["children"]);
            }
        }
    }

    search(children);
    return icons;
}

/**
 * Checks whether an element has aria-hidden="true" (boolean or literal/mustache true).
 */
export function isAriaHidden(element: AST.SvelteElement): boolean {
    const ariaHiddenAttr = findAttribute(element, "aria-hidden");
    return Boolean(
        ariaHiddenAttr &&
            (ariaHiddenAttr.boolean ||
                ariaHiddenAttr.value.some(
                    (v) =>
                        (v.type === "SvelteLiteral" && v.value === "true") ||
                        (v.type === "SvelteMustacheTag" &&
                            v.expression.type === "Literal" &&
                            v.expression.value === true)
                ))
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
