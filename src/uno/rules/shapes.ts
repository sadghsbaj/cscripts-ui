import type { Rule } from "unocss";

export const shapeRules: Rule[] = [
    [
        /^squircle(?:-(smooth|soft))?$/,
        ([, type]) => ({ "corner-shape": `var(--cs-squircle${type ? `-${type}` : ""})` }),
    ],
    [
        /^shadow-elevation-1(?:-(hover))?$/,
        ([, hover]) => ({ "box-shadow": `var(--cs-shadow-elevation-1${hover ? `-${hover}` : ""})` }),
    ],
];
