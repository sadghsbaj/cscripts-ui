import type { Rule } from "unocss";

export const colorRules: Rule[] = [
    [/^text-(strong|main|weak|weaker)$/, ([, level]) => ({ color: `var(--cs-color-text-${level})` })],
    [/^bg-(canvas|elevated|sunken)$/, ([, surface]) => ({ "background-color": `var(--cs-color-${surface})` })],
];
