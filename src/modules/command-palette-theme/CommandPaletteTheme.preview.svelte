<script module lang="ts">
    export const id = "command-palette-theme";
    export const label = "Command Palette Theme";
</script>

<script lang="ts">
    import { Palette } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        CommandPalette,
        CommandPaletteBar,
        CommandPaletteClear,
        CommandPaletteEmpty,
        CommandPaletteIcon,
        CommandPaletteInput,
        CommandPaletteList,
        createCommandPaletteRegistry,
    } from "cs/svelte/command-palette";
    import { createCommandPaletteThemePlugin } from "cs/svelte/command-palette-theme";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    const defaultPlugin = createCommandPaletteThemePlugin();
    const stayOpenPlugin = createCommandPaletteThemePlugin({ closeOnSelect: false });

    const registry = createCommandPaletteRegistry();
    registry.register(createCommandPaletteThemePlugin({ id: "registered-theme", shortcut: "Ctrl+T" }));

    let defaultOpen = $state(false);
    let stayOpen = $state(false);
    let registryOpen = $state(false);
</script>

<div class="flex flex-col gap-12 w-full max-w-4xl p-6">
    <PreviewHeader
        title="Command Palette Theme"
        description="Optional plugin that adds a theme picker to any command palette."
    />

    <PreviewSection title="Default" description="Pass the plugin through the plugins prop.">
        <Button variant="secondary" size="md" onclick={() => (defaultOpen = true)}>
            <ButtonIcon icon={Palette} />
            <ButtonLabel>Open palette</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection title="Stay Open" description="closeOnSelect: false keeps the palette open after picking a mode.">
        <Button variant="secondary" size="md" onclick={() => (stayOpen = true)}>
            <ButtonIcon icon={Palette} />
            <ButtonLabel>Open palette</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection title="Registry" description="Register the plugin on a shared registry.">
        <Button variant="secondary" size="md" onclick={() => (registryOpen = true)}>
            <ButtonIcon icon={Palette} />
            <ButtonLabel>Open palette</ButtonLabel>
        </Button>
    </PreviewSection>
</div>

<CommandPalette bind:open={defaultOpen} size="md" plugins={[defaultPlugin]}>
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Search commands…" />
        <CommandPaletteClear />
    </CommandPaletteBar>
    <CommandPaletteList>
        <CommandPaletteEmpty />
    </CommandPaletteList>
</CommandPalette>

<CommandPalette bind:open={stayOpen} size="md" plugins={[stayOpenPlugin]}>
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Search commands…" />
        <CommandPaletteClear />
    </CommandPaletteBar>
    <CommandPaletteList>
        <CommandPaletteEmpty />
    </CommandPaletteList>
</CommandPalette>

<CommandPalette bind:open={registryOpen} size="md" {registry}>
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Search commands…" />
        <CommandPaletteClear />
    </CommandPaletteBar>
    <CommandPaletteList>
        <CommandPaletteEmpty />
    </CommandPaletteList>
</CommandPalette>
