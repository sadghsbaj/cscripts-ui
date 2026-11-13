/**
 * Shared AST helpers for custom Svelte component ESLint rules.
 */

import type { AST } from "svelte-eslint-parser";
import type { Rule } from "eslint";

/**
 * Determines whether a file should be ignored by custom component rules (tests, lint internals).
 */
export function shouldSkipFile(context: Rule.RuleContext): boolean {
    const filename = context.filename ?? "";
    return filename.includes("eslint/") || filename.endsWith(".test.ts") || filename.endsWith(".spec.ts");
}

/**
 * Extracts the tag/component name of a SvelteElement node (e.g. "Button", "CloseButton", "svg").
 */
export function getElementName(node: AST.SvelteElement): string {
    return "name" in node.name ? node.name.name : "";
}

/**
 * Finds an attribute on a Svelte element's start tag by its attribute name.
 */
export function findAttribute(node: AST.SvelteElement, name: string): AST.SvelteAttribute | undefined {
    return node.startTag.attributes.find(
        (attr): attr is AST.SvelteAttribute => attr.type === "SvelteAttribute" && attr.key.name === name
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
    if (
        firstVal &&
        firstVal.type === "SvelteMustacheTag" &&
        firstVal.expression.type === "Literal" &&
        typeof firstVal.expression.value === "string"
    ) {
        return firstVal.expression.value;
    }
    return undefined;
}

/**
 * Checks whether a boolean prop on a Svelte component is statically truthy
 * (e.g. `<Button iconOnly>` or `<Button iconOnly={true}>`).
 */
export function isTruthyAttribute(node: AST.SvelteElement, name: string): boolean {
    const attr = findAttribute(node, name);
    if (!attr) return false;
    if (attr.boolean) return true;

    return attr.value.some(
        (v) =>
            (v.type === "SvelteLiteral" && v.value === "true") ||
            (v.type === "SvelteMustacheTag" && v.expression.type === "Literal" && v.expression.value === true)
    );
}

/**
 * Checks whether an element specifies a non-empty `aria-label` or `aria-labelledby` attribute.
 */
export function hasAccessibleLabel(node: AST.SvelteElement): boolean {
    const ariaLabel = findAttribute(node, "aria-label");
    const ariaLabelledBy = findAttribute(node, "aria-labelledby");

    return Boolean(
        (ariaLabel &&
            (Boolean(getLiteralStringValue(ariaLabel)?.trim()) ||
                ariaLabel.value.some((v) => v.type === "SvelteMustacheTag"))) ||
        (ariaLabelledBy &&
            (Boolean(getLiteralStringValue(ariaLabelledBy)?.trim()) ||
                ariaLabelledBy.value.some((v) => v.type === "SvelteMustacheTag")))
    );
}

/**
 * Recursively checks whether any descendant element matches a specific component/tag name.
 * Traverses Svelte elements, arrays of children, and conditional blocks ({#if} / {:else}).
 */
export function hasDescendantElement(children: AST.SvelteElement["children"], targetName: string): boolean {
    for (const child of children) {
        if (child.type === "SvelteElement") {
            if (getElementName(child) === targetName) {
                return true;
            }
            if (hasDescendantElement(child.children, targetName)) {
                return true;
            }
        } else if (
            "children" in child &&
            Array.isArray(child.children) &&
            hasDescendantElement(child.children as AST.SvelteElement["children"], targetName)
        ) {
            return true;
        }

        if (
            "else" in child &&
            child.else &&
            "children" in child.else &&
            Array.isArray(child.else.children) &&
            hasDescendantElement(child.else.children as AST.SvelteElement["children"], targetName)
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Scans <script> blocks in a Svelte file to collect names of imported icon components
 * (e.g. from '@lucide/svelte' or icon packages).
 */
export function getImportedIconNames(context: Rule.RuleContext): Set<string> {
    const iconNames = new Set<string>();
    const ast = context.sourceCode?.ast;
    if (!ast || !("body" in ast) || !Array.isArray(ast.body)) return iconNames;

    for (const node of ast.body) {
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

        const customNode = node as unknown as { type: string; body?: unknown[] };
        if (customNode.type === "SvelteScriptElement" && Array.isArray(customNode.body)) {
            for (const item of customNode.body) {
                const statement = item as {
                    type: string;
                    source?: { value?: unknown };
                    specifiers?: Array<{ local?: { name?: string } }>;
                };
                if (statement.type === "ImportDeclaration" && typeof statement.source?.value === "string") {
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
 * Finds all raw icon elements (<svg> or imported Lucide components) inside child nodes,
 * ignoring `<ButtonIcon>` components.
 */
export function findRawIcons(children: AST.SvelteElement["children"], iconNames: Set<string>): AST.SvelteElement[] {
    const icons: AST.SvelteElement[] = [];

    function search(nodes: AST.SvelteElement["children"]): void {
        for (const child of nodes) {
            if (child.type === "SvelteElement") {
                const tagName = getElementName(child);
                if (["ButtonIcon", "ToggleButtonIcon", "CopyIcon", "PasteIcon"].includes(tagName)) continue;

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
 * Checks whether an element specifies a tooltip attachment (e.g. `{@attach tooltip(...)}`)
 * or a tooltip prop.
 */
export function hasTooltipAttachment(node: AST.SvelteElement): boolean {
    if (findAttribute(node, "tooltip")) {
        return true;
    }

    for (const attr of node.startTag.attributes) {
        if (attr.type !== "SvelteAttachTag") continue;

        const expr = attr.expression;
        if (expr.type === "CallExpression") {
            if (expr.callee.type === "Identifier" && expr.callee.name.toLowerCase().includes("tooltip")) {
                return true;
            }
            if (
                expr.callee.type === "MemberExpression" &&
                expr.callee.property.type === "Identifier" &&
                expr.callee.property.name.toLowerCase().includes("tooltip")
            ) {
                return true;
            }
        } else if (expr.type === "Identifier" && expr.name.toLowerCase().includes("tooltip")) {
            return true;
        }
    }

    return false;
}
