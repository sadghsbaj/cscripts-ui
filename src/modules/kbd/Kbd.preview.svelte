<script module>
    export const id = "kbd";
    export const label = "Kbd";
</script>

<script lang="ts">
    import { Terminal } from "@lucide/svelte";
    import {
        Kbd,
        KBD_SIZES,
        KBD_SYMBOL_DISPLAYS,
        KbdGroup,
        KbdSeparator,
        KbdSymbol,
    } from "cs/svelte/kbd";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
${closeScript}

<Kbd variant="soft" size="md">K</Kbd>

<KbdGroup variant="soft" size="md">
    <Kbd symbol="ctrl" />
    <KbdSeparator />
    <Kbd>K</Kbd>
</KbdGroup>`;

    const variantsCode = `<Kbd variant="soft" size="md">Ctrl</Kbd>
<Kbd variant="ghost" size="md">Ctrl</Kbd>
<Kbd variant="keycap" size="md">Ctrl</Kbd>

<!-- On a sunken surface -->
<SunkenWell>
    <Kbd variant="soft" size="md">Soft</Kbd>
    <Kbd variant="ghost" size="md">Ghost</Kbd>
    <Kbd variant="keycap" size="md">Keycap</Kbd>
</SunkenWell>`;

    const sizesCode = `<!-- Single-character and multi-character keys across all 5 sizes -->
<Kbd variant="keycap" size="xs">K</Kbd>
<Kbd variant="keycap" size="xs">Ctrl</Kbd>

<Kbd variant="keycap" size="sm">K</Kbd>
<Kbd variant="keycap" size="sm">Ctrl</Kbd>

<Kbd variant="keycap" size="md">K</Kbd>
<Kbd variant="keycap" size="md">Ctrl</Kbd>

<Kbd variant="keycap" size="lg">K</Kbd>
<Kbd variant="keycap" size="lg">Ctrl</Kbd>

<Kbd variant="keycap" size="xl">K</Kbd>
<Kbd variant="keycap" size="xl">Ctrl</Kbd>`;

    const coherentShortcutCode = `<!-- Same inner markup: soft = 1 pill, ghost = 1 inline group, keycap = separate 3D keys -->
<KbdGroup variant="soft" size="md">
    <Kbd>Ctrl</Kbd>
    <KbdSeparator />
    <Kbd>C</Kbd>
</KbdGroup>

<KbdGroup variant="ghost" size="md">
    <Kbd>Ctrl</Kbd>
    <KbdSeparator />
    <Kbd>C</Kbd>
</KbdGroup>

<KbdGroup variant="keycap" size="md">
    <Kbd>Ctrl</Kbd>
    <KbdSeparator />
    <Kbd>C</Kbd>
</KbdGroup>`;

    const combosCode = `<!-- Default inline + SVG separator vs custom "/" override -->
<KbdGroup variant="keycap" size="md">
    <Kbd symbol="ctrl" />
    <KbdSeparator />
    <Kbd symbol="shift" />
    <KbdSeparator />
    <Kbd>P</Kbd>
</KbdGroup>

<KbdGroup variant="soft" size="md">
    <Kbd symbol="alt" />
    <KbdSeparator>/</KbdSeparator>
    <Kbd symbol="tab" display="text" />
</KbdGroup>

<KbdGroup variant="keycap" size="md">
    <Kbd symbol="super" />
    <KbdSeparator />
    <Kbd>L</Kbd>
</KbdGroup>

<KbdGroup variant="keycap" size="md">
    <Kbd symbol="win" />
    <KbdSeparator />
    <Kbd>V</Kbd>
</KbdGroup>

<Kbd variant="keycap" size="md" symbol="esc" />

<!-- Chained / multiple shortcuts: separate KbdGroups side by side -->
<div class="flex items-center gap-2">
    <KbdGroup variant="keycap" size="md">
        <Kbd>Ctrl</Kbd>
        <KbdSeparator />
        <Kbd>C</Kbd>
    </KbdGroup>
    <KbdGroup variant="keycap" size="md">
        <Kbd>Ctrl</Kbd>
        <KbdSeparator />
        <Kbd>V</Kbd>
    </KbdGroup>
</div>`;

    const symbolCode = `<!-- Shorthand symbol prop -->
<Kbd variant="soft" size="md" symbol="enter" />

<!-- KbdSymbol display modes: auto | icon | text | both -->
<Kbd variant="soft" size="md">
    <KbdSymbol symbol="enter" display="auto" />
</Kbd>
<Kbd variant="soft" size="md">
    <KbdSymbol symbol="enter" display="icon" />
</Kbd>
<Kbd variant="soft" size="md">
    <KbdSymbol symbol="enter" display="text" />
</Kbd>
<Kbd variant="soft" size="md">
    <KbdSymbol symbol="enter" display="both" />
</Kbd>

<!-- Custom icon escape hatch -->
<Kbd variant="keycap" size="md">
    <KbdSymbol icon={Terminal} label="Terminal" />
</Kbd>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Kbd"
        description="A calm, tactile keyboard keycap primitive for Linux and Windows shortcuts, with coherent shortcut groups, separators, and typed symbol icons."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Kbd variant="soft" size="md">K</Kbd>

        <KbdGroup variant="soft" size="md">
            <Kbd symbol="ctrl" />
            <KbdSeparator />
            <Kbd>K</Kbd>
        </KbdGroup>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Three surface treatments — soft, ghost, and tactile 3D keycap — shown on both elevated and sunken surfaces."
        code={variantsCode}
    >
        <div class="flex-center flex-wrap gap-6">
            <div class="flex items-center gap-3">
                <Kbd variant="soft" size="md">Ctrl</Kbd>
                <Kbd variant="ghost" size="md">Ctrl</Kbd>
                <Kbd variant="keycap" size="md">Ctrl</Kbd>
            </div>

            <SunkenWell>
                <Kbd variant="soft" size="md">Soft</Kbd>
                <Kbd variant="ghost" size="md">Ghost</Kbd>
                <Kbd variant="keycap" size="md">Keycap</Kbd>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five sizes from xs to xl. The slightly wide minimum width (height + 4px) keeps single-character keys as soft squircle keycaps rather than circles."
        code={sizesCode}
    >
        <div class="flex flex-wrap items-end justify-center gap-6">
            {#each KBD_SIZES as size (size)}
                <div class="flex flex-col items-center gap-2">
                    <div class="flex items-center gap-2">
                        <Kbd variant="keycap" {size}>K</Kbd>
                        <Kbd variant="keycap" {size}>Ctrl</Kbd>
                    </div>
                    <span class="text-xs text-weak">{size}</span>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Coherent Shortcut"
        description="One KbdGroup represents one coherent shortcut and passes variant and size via context. With identical inner markup, soft renders one shared pill, ghost renders one inline group, and keycap renders separate 3D keys."
        code={coherentShortcutCode}
    >
        <div class="flex-center flex-wrap gap-8">
            <div class="flex flex-col items-center gap-2">
                <KbdGroup variant="soft" size="md">
                    <Kbd>Ctrl</Kbd>
                    <KbdSeparator />
                    <Kbd>C</Kbd>
                </KbdGroup>
                <span class="text-xs text-weak">soft</span>
            </div>

            <div class="flex flex-col items-center gap-2">
                <KbdGroup variant="ghost" size="md">
                    <Kbd>Ctrl</Kbd>
                    <KbdSeparator />
                    <Kbd>C</Kbd>
                </KbdGroup>
                <span class="text-xs text-weak">ghost</span>
            </div>

            <div class="flex flex-col items-center gap-2">
                <KbdGroup variant="keycap" size="md">
                    <Kbd>Ctrl</Kbd>
                    <KbdSeparator />
                    <Kbd>C</Kbd>
                </KbdGroup>
                <span class="text-xs text-weak">keycap</span>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Separators & Chained Shortcuts"
        description="KbdSeparator defaults to an inline + SVG icon (24×24, stroke-width 2.25) and accepts custom children such as /. Place separate KbdGroup instances side by side for multi-step shortcuts."
        code={combosCode}
    >
        <div class="flex flex-col items-center gap-6">
            <div class="flex-center flex-wrap gap-6">
                <KbdGroup variant="keycap" size="md">
                    <Kbd symbol="ctrl" />
                    <KbdSeparator />
                    <Kbd symbol="shift" />
                    <KbdSeparator />
                    <Kbd>P</Kbd>
                </KbdGroup>

                <KbdGroup variant="soft" size="md">
                    <Kbd symbol="alt" />
                    <KbdSeparator>/</KbdSeparator>
                    <Kbd symbol="tab" display="text" />
                </KbdGroup>

                <KbdGroup variant="keycap" size="md">
                    <Kbd symbol="super" />
                    <KbdSeparator />
                    <Kbd>L</Kbd>
                </KbdGroup>

                <KbdGroup variant="keycap" size="md">
                    <Kbd symbol="win" />
                    <KbdSeparator />
                    <Kbd>V</Kbd>
                </KbdGroup>

                <Kbd variant="keycap" size="md" symbol="esc" />
            </div>

            <div class="flex flex-col items-center gap-2">
                <div class="flex items-center gap-2">
                    <KbdGroup variant="keycap" size="md">
                        <Kbd>Ctrl</Kbd>
                        <KbdSeparator />
                        <Kbd>C</Kbd>
                    </KbdGroup>
                    <KbdGroup variant="keycap" size="md">
                        <Kbd>Ctrl</Kbd>
                        <KbdSeparator />
                        <Kbd>V</Kbd>
                    </KbdGroup>
                </div>
                <span class="text-xs text-weak">chained shortcuts (gap-2)</span>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Symbols & Display Modes"
        description="Use the symbol shorthand on Kbd, control icon/text rendering with KbdSymbol display modes, or pass a custom Lucide icon."
        code={symbolCode}
    >
        <div class="flex flex-wrap items-end justify-center gap-6">
            <div class="flex flex-col items-center gap-2">
                <Kbd variant="soft" size="md" symbol="enter" />
                <span class="text-xs text-weak">shorthand</span>
            </div>

            {#each KBD_SYMBOL_DISPLAYS as mode (mode)}
                <div class="flex flex-col items-center gap-2">
                    <Kbd variant="soft" size="md">
                        <KbdSymbol symbol="enter" display={mode} />
                    </Kbd>
                    <span class="text-xs text-weak">{mode}</span>
                </div>
            {/each}

            <div class="flex flex-col items-center gap-2">
                <Kbd variant="keycap" size="md">
                    <KbdSymbol icon={Terminal} label="Terminal" />
                </Kbd>
                <span class="text-xs text-weak">custom icon</span>
            </div>
        </div>
    </PreviewSection>
</div>
