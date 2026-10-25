import type { Rule } from "unocss";

export const shapeRules: Rule[] = [
    [
        /^squircle(?:-(smooth|soft))?$/,
        ([, type]) => ({ "corner-shape": `var(--cs-squircle${type ? `-${type}` : ""})` }),
    ],
];
