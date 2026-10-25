import type { Rule } from "unocss";

export const typographyRules: Rule[] = [
    [
        "text-trim",
        {
            "text-box-trim": "trim-both",
            "text-box-edge": "cap alphabetic",
            "text-box": "trim-both cap alphabetic",
        },
    ],

    [
        "text-trim-truncate",
        {
            "text-box-trim": "trim-both",
            "text-box-edge": "cap alphabetic",
            "text-box": "trim-both cap alphabetic",
            "min-width": "0",
            "overflow-x": "clip",
            "overflow-y": "visible",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
        },
    ],
];
