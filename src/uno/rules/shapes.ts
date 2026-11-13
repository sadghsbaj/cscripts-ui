import type { Rule } from "unocss";

export const shapeRules: Rule[] = [
    [
        /^squircle(?:-(smooth|soft))?$/,
        ([, type]) => ({ "corner-shape": `var(--cs-squircle${type ? `-${type}` : ""})` }),
    ],
    [
        /^shadow-elevated(?:-(hover))?$/,
        ([, hover]) => ({ "box-shadow": `var(--cs-shadow-elevated${hover ? `-${hover}` : ""})` }),
    ],
    [/^shadow-sunken$/, () => ({ "box-shadow": "var(--cs-shadow-sunken)" })],
];
