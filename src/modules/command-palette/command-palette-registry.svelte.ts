import { SvelteMap } from "svelte/reactivity";

import type {
    CommandPaletteCommand,
    CommandPalettePlugin,
    CommandPaletteRegisterCommandsOptions,
    CommandPaletteRegistry,
} from "./index.ts";

let commandPluginCounter = 0;

export function createCommandPaletteRegistry(): CommandPaletteRegistry {
    const plugins = new SvelteMap<string, CommandPalettePlugin>();

    function register(plugin: CommandPalettePlugin): () => void {
        plugins.set(plugin.id, plugin);
        return () => {
            if (plugins.get(plugin.id) === plugin) {
                plugins.delete(plugin.id);
            }
        };
    }

    function registerCommands(
        commands: readonly CommandPaletteCommand[],
        options?: CommandPaletteRegisterCommandsOptions
    ): () => void {
        commandPluginCounter += 1;
        const id = `cs-command-palette-commands-${commandPluginCounter}`;
        return register({
            id,
            label: options?.group,
            page: options?.page,
            priority: options?.priority,
            placement: options?.placement,
            items: commands,
        });
    }

    function unregister(pluginId: string): void {
        plugins.delete(pluginId);
    }

    return {
        get plugins(): ReadonlyMap<string, CommandPalettePlugin> {
            return plugins;
        },
        register,
        registerCommands,
        unregister,
    };
}
