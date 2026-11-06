import type { Rule } from "unocss";

export const colorRules: Rule[] = [
    [/^text-(strong|main|weak|weaker)$/, ([, level]) => ({ color: `var(--cs-color-text-${level})` })],
    [/^bg-elevation-([012])$/, ([, level]) => ({ "background-color": `var(--cs-color-elevation-${level})` })],
];
