import type { Rule } from "unocss";

const SCROLLBAR_SIZE_MAP = {
    sm: { size: "8px", firefoxWidth: "thin" },
    md: { size: "10px", firefoxWidth: "auto" },
    lg: { size: "12px", firefoxWidth: "auto" },
} as const;

export const scrollbarRules: Rule[] = [
    [
        /^scrollbar-(sm|md|lg)$/,
        ([, size], { symbols }) => {
            const values = SCROLLBAR_SIZE_MAP[size as keyof typeof SCROLLBAR_SIZE_MAP];
            return [
                {
                    "--cs-scrollbar-size": values.size,
                },
                {
                    [symbols.parent]: "@supports (-moz-appearance: none)",
                    "scrollbar-width": values.firefoxWidth,
                },
                {
                    [symbols.selector]: (s: string) => `${s}::-webkit-scrollbar`,
                    width: values.size,
                    height: values.size,
                },
            ];
        },
        { autocomplete: "scrollbar-(sm|md|lg)" },
    ],

    [
        /^(?:no-scrollbar|scrollbar-none)$/,
        (_, { symbols }) => [
            {
                "-ms-overflow-style": "none",
                "scrollbar-width": "none",
            },
            {
                [symbols.selector]: (s: string) => `${s}::-webkit-scrollbar`,
                display: "none",
            },
        ],
        { autocomplete: ["no-scrollbar", "scrollbar-none"] },
    ],
];
