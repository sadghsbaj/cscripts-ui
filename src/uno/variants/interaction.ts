import type { Variant } from "unocss";

/** Elements in these states never trigger hover/active styles. */
const INACTIVE_GUARD = `:not([aria-disabled="true"], [aria-busy="true"], :disabled)`;

interface State {
    /** Pseudo selector appended to the element (or group/peer) that carries the state. */
    pseudo: string;
    /** Optional parent at-rule wrapping the rule. */
    parent?: string;
}

const STATES = {
    // Hover only on real hover devices, so touch screens never get sticky hover styles.
    hover: { pseudo: `:hover${INACTIVE_GUARD}`, parent: "@media (hover: hover) and (pointer: fine)" },
    active: { pseudo: `:active${INACTIVE_GUARD}` },
    // Matches native `disabled` as well as `aria-disabled`.
    disabled: { pseudo: `:is(:disabled, [aria-disabled="true"])` },
} satisfies Record<string, State>;

/**
 * One variant per state (a variant is only applied once per class, so `hover:disabled:` needs two).
 * Each matches `<state>:`, `group-<state>:` and `peer-<state>:` (also `group-<state>/name:`).
 * Runs before presetWind4 (order -1) so these win over the stock variants. Stacking with
 * other variants (`dark:hover:`, `md:group-hover:`, ...) works as usual.
 */
function interactionVariant(stateName: keyof typeof STATES): Variant {
    const state: State = STATES[stateName];
    const matcherRegex = new RegExp(String.raw`^(?:(group|peer)-)?${stateName}(?:/([\w-]+))?:`);

    return {
        name: `cs-${stateName}`,
        order: -1,
        match(matcher) {
            const result = matcherRegex.exec(matcher);
            if (!result) return;

            const [full, target, groupName] = result;
            // A name suffix only makes sense for group/peer.
            if (groupName && !target) return;

            const marker = target && `.${target}${groupName ? String.raw`\/${groupName}` : ""}`;

            return {
                matcher: matcher.slice(full.length),
                parent: state.parent,
                selector: (s) => {
                    if (!marker) return `${s}${state.pseudo}`;
                    return target === "group" ? `${marker}${state.pseudo} ${s}` : `${marker}${state.pseudo}~${s}`;
                },
            };
        },
    };
}

export const interactionVariants: Variant[] = [
    interactionVariant("hover"),
    interactionVariant("active"),
    interactionVariant("disabled"),
];
