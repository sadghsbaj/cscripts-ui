<script module>
    export const id = "clipboard";
    export const label = "Clipboard";
</script>

<script lang="ts">
    import { ClipboardPaste } from "@lucide/svelte";
    import { Button, BUTTON_SIZES, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { CopyIcon, copyOnClick, pasteOnClick } from "cs/svelte/clipboard";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";

    let pasteValue = $state("");
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- 1. Icon-Only Sizes -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Icon-Only</h2>
            <div class="flex flex-wrap gap-3 items-center">
                {#each BUTTON_SIZES as size (size)}
                    <Button
                        variant="soft"
                        color="base"
                        {size}
                        iconOnly
                        aria-label="Kopieren"
                        {@attach copyOnClick(`Copied size: ${size}`)}
                        {@attach tooltip("Kopieren")}
                    >
                        <CopyIcon />
                        <HitArea size="md" />
                    </Button>
                {/each}
            </div>
        </div>

        <!-- 2. Button Variants with Label -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">With Label</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button variant="soft" color="base" size="md" {@attach copyOnClick("bun add cs")}>
                    <CopyIcon />
                    <ButtonLabel>Soft</ButtonLabel>
                </Button>

                <Button variant="ghost" color="base" size="md" {@attach copyOnClick("bun add cs")}>
                    <CopyIcon />
                    <ButtonLabel>Ghost</ButtonLabel>
                </Button>

                <Button variant="solid" color="accent" size="md" {@attach copyOnClick("bun add cs")}>
                    <CopyIcon />
                    <ButtonLabel>Solid</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 3. Elevated Surface -->
        <div class="bg-elevation-0 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5">
            <h2 class="title-2xl">Elevated</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button
                    variant="elevated"
                    size="md"
                    iconOnly
                    aria-label="Kopieren"
                    {@attach copyOnClick("elevated-copy")}
                    {@attach tooltip("Kopieren")}
                >
                    <CopyIcon />
                    <HitArea size="md" />
                </Button>

                <Button variant="elevated" size="md" {@attach copyOnClick("elevated-copy")}>
                    <CopyIcon />
                    <ButtonLabel>Code kopieren</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 4. Error Feedback State -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Error State</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button
                    variant="soft"
                    color="base"
                    size="md"
                    iconOnly
                    aria-label="Fehler simulieren"
                    {@attach copyOnClick(() => Promise.reject(new Error("Simulated failure")))}
                    {@attach tooltip("Fehler testen")}
                >
                    <CopyIcon />
                    <HitArea size="md" />
                </Button>

                <Button
                    variant="soft"
                    color="danger"
                    size="md"
                    {@attach copyOnClick(() => Promise.reject(new Error("Simulated failure")))}
                >
                    <CopyIcon />
                    <ButtonLabel>Fail Copy</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 5. Async / Pending State -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Static States</h2>
            <div class="flex flex-wrap gap-4 items-center text-lg">
                <CopyIcon status="idle" />
                <CopyIcon status="pending" />
                <CopyIcon status="copied" />
                <CopyIcon status="error" />
            </div>
        </div>

        <!-- 6. Paste On Click -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Paste</h2>
            <div class="flex gap-2 items-center w-full">
                <input
                    bind:value={pasteValue}
                    placeholder="Ziel..."
                    class="bg-base-soft rounded-xl px-3 h-36px w-full text-sm outline-none"
                />
                <Button
                    variant="soft"
                    color="base"
                    size="md"
                    iconOnly
                    aria-label="Einfügen"
                    {@attach pasteOnClick({
                        target: (e) => {
                            pasteValue = e.text;
                        },
                    })}
                    {@attach tooltip("Einfügen")}
                >
                    <ButtonIcon icon={ClipboardPaste} />
                    <HitArea size="md" />
                </Button>
            </div>
        </div>
    </div>
</div>
