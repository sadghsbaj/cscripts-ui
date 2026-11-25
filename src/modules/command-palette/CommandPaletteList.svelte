<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";

    import { t } from "../../shared/lang.internal.ts";
    import { Kbd, KbdGroup } from "../kbd/index.ts";
    import { ScrollArea, ScrollAreaContent } from "../scroll-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import { isCustomWidgetTarget } from "./command-palette-utils.internal.ts";
    import {
        getInternalCommandPaletteContext,
        setCommandPaletteListContext,
    } from "./command-palette.context.internal.ts";
    import CommandPaletteGroup from "./CommandPaletteGroup.svelte";
    import CommandPaletteGroupLabel from "./CommandPaletteGroupLabel.svelte";
    import CommandPaletteItem from "./CommandPaletteItem.svelte";
    import CommandPaletteItemDescription from "./CommandPaletteItemDescription.svelte";
    import CommandPaletteItemShortcut from "./CommandPaletteItemShortcut.svelte";
    import CommandPaletteItemText from "./CommandPaletteItemText.svelte";
    import CommandPaletteItemTrailing from "./CommandPaletteItemTrailing.svelte";
    import CommandPalettePage from "./CommandPalettePage.svelte";
    import CommandPalettePluginScope from "./CommandPalettePluginScope.internal.svelte";
    import CommandPaletteWidget from "./CommandPaletteWidget.svelte";
    import type {
        CommandPaletteCommand,
        CommandPaletteListProps,
        CommandPalettePlugin,
        CommandPalettePluginRenderContext,
        CommandPaletteQueryContext,
    } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        maxHeight,
        scrollbar = "hover",
        class: className,
        style: styleProp,
        children,
        onpointerdown,
        ...rest
    }: CommandPaletteListProps = $props();

    const palette = getInternalCommandPaletteContext();
    const resolvedId = $derived(id ?? palette.listboxId);
    const resolvedAriaLabel = $derived(
        rest["aria-label"] ?? (rest["aria-labelledby"] ? undefined : t({ de: "Befehle", en: "Commands" }))
    );
    const resolvedStyle = $derived(
        maxHeight !== undefined
            ? styleProp
                ? `--cs-command-palette-list-max-height: ${maxHeight}; ${styleProp}`
                : `--cs-command-palette-list-max-height: ${maxHeight}`
            : styleProp
    );

    setCommandPaletteListContext({ isInsideList: true });

    $effect(() => {
        return palette.registerList(ref, id ?? undefined);
    });

    interface PluginCommandGroup {
        key: string;
        label: string | undefined;
        commands: CommandPaletteCommand[];
    }

    interface ResolvedPluginRenderEntry {
        plugin: CommandPalettePlugin;
        groups: PluginCommandGroup[];
    }

    const queryContext = $derived<CommandPaletteQueryContext>({
        query: palette.effectiveQuery,
        rawQuery: palette.inputValue,
        activePage: palette.activePage,
        pages: palette.pages,
        prefix: palette.activePrefixPlugin?.prefix,
    });

    const renderContext = $derived<CommandPalettePluginRenderContext>({
        ...queryContext,
        palette: palette.publicContext,
    });

    const activePluginPageView = $derived.by((): CommandPalettePlugin | undefined => {
        if (palette.activePage === undefined) return undefined;
        return palette.allPlugins.find(
            (plugin) =>
                plugin.pageView !== undefined &&
                (plugin.page === palette.activePage || plugin.id === palette.activePage)
        );
    });

    const activePluginEntries = $derived.by((): ResolvedPluginRenderEntry[] => {
        if (activePluginPageView) return [];

        const candidates: CommandPalettePlugin[] = [];
        if (palette.activePage !== undefined) {
            for (const plugin of palette.allPlugins) {
                if (plugin.page === palette.activePage || plugin.page === "*") {
                    candidates.push(plugin);
                }
            }
        } else if (palette.activePrefixPlugin) {
            candidates.push(palette.activePrefixPlugin);
        } else {
            for (const plugin of palette.allPlugins) {
                if (!plugin.prefix && (plugin.page === undefined || plugin.page === "*")) {
                    candidates.push(plugin);
                }
            }
        }

        const entries: ResolvedPluginRenderEntry[] = [];
        for (const plugin of candidates) {
            const rawItems = typeof plugin.items === "function" ? plugin.items(queryContext) : (plugin.items ?? []);

            const groupMap = new SvelteMap<string, PluginCommandGroup>();
            for (const cmd of rawItems) {
                const groupLabel = cmd.group ?? plugin.label;
                const key = groupLabel ?? "__ungrouped__";
                let bucket = groupMap.get(key);
                if (!bucket) {
                    bucket = { key: `${plugin.id}:${key}`, label: groupLabel, commands: [] };
                    groupMap.set(key, bucket);
                }
                bucket.commands.push(cmd);
            }

            const groups = groupMap.values().toArray();
            if (plugin.widget || groups.length > 0) {
                entries.push({
                    plugin,
                    groups,
                });
            }
        }

        return entries;
    });

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerdown?.(event);
        if (event.pointerType === "mouse" && palette.isKeyboardNav) {
            palette.setKeyboardNav(false);
        }
        if (event.defaultPrevented) return;
        // Allow interactive controls inside widgets/previews/footers to receive focus normally.
        if (isCustomWidgetTarget(event.target, null)) return;
        // Prevent ScrollAreaContent (tabindex=-1) from stealing focus from CommandPaletteInput.
        event.preventDefault();
    }
</script>

<ScrollArea
    size="sm"
    direction="vertical"
    {scrollbar}
    hidden={palette.hasExternalActivePage}
    class="cs-command-palette-list-scroll"
    style={resolvedStyle}
>
    <ScrollAreaContent
        bind:ref
        {...rest}
        id={resolvedId}
        role="listbox"
        tabindex={-1}
        aria-label={resolvedAriaLabel}
        class={["cs-command-palette-list", "cs-listbox-list", className]}
        {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
        onpointerdown={handlePointerDown}
    >
        {#if activePluginPageView?.pageView && palette.activePage !== undefined}
            <CommandPalettePage value={palette.activePage} label={activePluginPageView.label} filter={false}>
                <CommandPaletteWidget>
                    {@render activePluginPageView.pageView(renderContext)}
                </CommandPaletteWidget>
            </CommandPalettePage>
        {:else}
            {#each activePluginEntries as entry (entry.plugin.id)}
                {#if entry.plugin.widget}
                    <CommandPaletteWidget>
                        {@render entry.plugin.widget(renderContext)}
                    </CommandPaletteWidget>
                {/if}

                {#each entry.groups as group (group.key)}
                    <CommandPalettePluginScope
                        pageValue={palette.activePage}
                        filter={entry.plugin.filter}
                        isPrefixPlugin={entry.plugin === palette.activePrefixPlugin}
                    >
                        <CommandPaletteGroup>
                            {#if group.label}
                                <CommandPaletteGroupLabel>{group.label}</CommandPaletteGroupLabel>
                            {/if}
                            {#each group.commands as cmd (cmd.value)}
                                <CommandPaletteItem
                                    value={cmd.value}
                                    label={cmd.label}
                                    keywords={cmd.keywords}
                                    icon={cmd.icon}
                                    href={cmd.href}
                                    target={cmd.target}
                                    rel={cmd.rel}
                                    negative={cmd.negative}
                                    disabled={cmd.disabled}
                                    closeOnSelect={cmd.closeOnSelect}
                                    checked={cmd.checked}
                                    onSelect={cmd.onSelect}
                                >
                                    <CommandPaletteItemText>{cmd.label}</CommandPaletteItemText>
                                    {#if cmd.description}
                                        <CommandPaletteItemDescription>{cmd.description}</CommandPaletteItemDescription>
                                    {/if}
                                    {#if cmd.trailing}
                                        <CommandPaletteItemTrailing>{cmd.trailing}</CommandPaletteItemTrailing>
                                    {/if}
                                    {#if cmd.shortcut}
                                        <CommandPaletteItemShortcut>
                                            {#if typeof cmd.shortcut === "string"}
                                                {cmd.shortcut}
                                            {:else}
                                                <KbdGroup variant="ghost" size={palette.size === "lg" ? "md" : "sm"}>
                                                    {#each cmd.shortcut as key, keyIndex (`${cmd.value}-kbd-${keyIndex}`)}
                                                        <Kbd>{key}</Kbd>
                                                    {/each}
                                                </KbdGroup>
                                            {/if}
                                        </CommandPaletteItemShortcut>
                                    {/if}
                                </CommandPaletteItem>
                            {/each}
                        </CommandPaletteGroup>
                    </CommandPalettePluginScope>
                {/each}
            {/each}

            {@render children?.()}
        {/if}
    </ScrollAreaContent>
</ScrollArea>
