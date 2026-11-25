import { tick } from "svelte";

import { t } from "../../shared/lang.internal.ts";
import type {
    CommandPaletteCommand,
    CommandPalettePlugin,
    CommandPalettePluginPlacement,
} from "../command-palette/index.ts";
import { theme, THEME_ICONS, THEME_LABELS, THEME_MODES, type ThemeManager, type ThemeMode } from "../theme/index.ts";

export const COMMAND_PALETTE_THEME_PLUGIN_ID = "cs-command-palette-theme";

export interface CommandPaletteThemePluginOptions {
    id?: string;
    priority?: number;
    placement?: CommandPalettePluginPlacement;
    group?: string;
    closeOnSelect?: boolean;
    shortcut?: readonly string[] | string;
    keywords?: readonly string[];
    labels?: Partial<{
        root: string;
        page: string;
        modes: Partial<Record<ThemeMode, string>>;
    }>;
    manager?: ThemeManager;
}

const DEFAULT_ROOT_LABEL = t({ de: "Design ändern", en: "Change Theme" });
const DEFAULT_GROUP_LABEL = t({ de: "Darstellung", en: "Appearance" });
// Both languages so search works regardless of the compile-time CS_LANG.
const DEFAULT_KEYWORDS = [
    "theme",
    "design",
    "dark",
    "light",
    "dunkel",
    "hell",
    "modus",
    "mode",
    "appearance",
    "darstellung",
] as const;

export function createCommandPaletteThemePlugin(options: CommandPaletteThemePluginOptions = {}): CommandPalettePlugin {
    const {
        id = COMMAND_PALETTE_THEME_PLUGIN_ID,
        priority = 0,
        placement = "end",
        group = DEFAULT_GROUP_LABEL,
        closeOnSelect = true,
        shortcut,
        keywords = [],
        labels,
        manager = theme,
    } = options;

    const rootLabel = labels?.root ?? DEFAULT_ROOT_LABEL;
    const pageLabel = labels?.page ?? rootLabel;
    const modeLabel = (mode: ThemeMode): string => labels?.modes?.[mode] ?? THEME_LABELS[mode];
    const modeValue = (mode: ThemeMode): string => `${id}:mode:${mode}`;

    return {
        id,
        label: group,
        priority,
        placement,
        // Single plugin serves root and sub-page; the page id equals the plugin id so the scope pill resolves.
        page: "*",
        items(ctx) {
            if (ctx.activePage === undefined) {
                // Reading manager.mode here keeps icon/trailing reactive (items() runs in a $derived).
                const mode = manager.mode;
                return [
                    {
                        value: `${id}:root`,
                        label: rootLabel,
                        icon: THEME_ICONS[mode],
                        trailing: modeLabel(mode),
                        keywords: [...DEFAULT_KEYWORDS, ...keywords],
                        shortcut,
                        onSelect(_event, palette) {
                            palette.pushPage(id, { label: pageLabel });
                            // Wait for the page items to mount before moving the highlight to the active mode.
                            void tick().then(() => {
                                if (palette.activePage === id) {
                                    palette.setHighlightedValue(modeValue(manager.mode));
                                }
                            });
                        },
                    },
                ];
            }

            if (ctx.activePage !== id) return [];

            const active = manager.mode;
            return THEME_MODES.map(
                (mode): CommandPaletteCommand => ({
                    value: modeValue(mode),
                    label: modeLabel(mode),
                    // Empty group suppresses the group label inside the page.
                    group: "",
                    icon: THEME_ICONS[mode],
                    checked: active === mode,
                    closeOnSelect,
                    onSelect() {
                        manager.set(mode);
                    },
                })
            );
        },
    };
}
