<script module>
    export const id = "clipboard";
    export const label = "Clipboard";
</script>

<script lang="ts">
    import { BUTTON_SIZES, Button, ButtonLabel } from "cs/svelte/button";
    import { CopyIcon, copyOnClick, PasteIcon, pasteOnClick } from "cs/svelte/clipboard";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";

    let pasteValue = $state("");
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- 1. Copy Icon-Only Sizes -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Copy Sizes</h2>
            <div class="flex flex-wrap gap-3 items-center">
                {#each BUTTON_SIZES as size (size)}
                    <Button
                        variant="tertiary"
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

        <!-- 2. Copy Variants with Label -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Copy Variants</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button variant="tertiary" size="md" {@attach copyOnClick("bun add cs")}>
                    <CopyIcon />
                    <ButtonLabel>Tertiary</ButtonLabel>
                </Button>

                <Button variant="ghost" size="md" {@attach copyOnClick("bun add cs")}>
                    <CopyIcon />
                    <ButtonLabel>Ghost</ButtonLabel>
                </Button>

                <Button variant="primary" size="md" {@attach copyOnClick("bun add cs")}>
                    <CopyIcon />
                    <ButtonLabel>Primary</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 3. Copy Error Feedback -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Copy Error</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button
                    variant="tertiary"
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
                    variant="secondary"
                    danger
                    size="md"
                    {@attach copyOnClick(() => Promise.reject(new Error("Simulated failure")))}
                >
                    <CopyIcon />
                    <ButtonLabel>Fail Copy</ButtonLabel>
                </Button>
            </div>
        </div>

        <!-- 4. Paste Icon-Only Sizes -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Paste Sizes</h2>
            <div class="flex flex-wrap gap-3 items-center">
                {#each BUTTON_SIZES as size (size)}
                    <Button
                        variant="tertiary"
                        {size}
                        iconOnly
                        aria-label="Einfügen"
                        {@attach pasteOnClick((e) => {
                            pasteValue = e.text;
                        })}
                        {@attach tooltip("Einfügen")}
                    >
                        <PasteIcon />
                        <HitArea size="md" />
                    </Button>
                {/each}
            </div>
        </div>

        <!-- 5. Paste into Input -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Paste Input</h2>
            <div class="flex flex-col gap-3 w-full">
                <div class="flex gap-2 items-center w-full">
                    <input
                        bind:value={pasteValue}
                        placeholder="Ziel..."
                        class="bg-base-soft rounded-xl px-3 h-36px w-full text-sm outline-none"
                    />
                    <Button
                        variant="tertiary"
                        size="md"
                        iconOnly
                        aria-label="Einfügen"
                        {@attach pasteOnClick({
                            mode: "replace",
                            target: (e) => {
                                pasteValue = e.text;
                            },
                        })}
                        {@attach tooltip("Einfügen")}
                    >
                        <PasteIcon />
                        <HitArea size="md" />
                    </Button>
                </div>

                <div class="flex flex-wrap gap-2 items-center">
                    <Button
                        variant="tertiary"
                        size="sm"
                        {@attach copyOnClick("")}
                    >
                        <CopyIcon />
                        <ButtonLabel>Leer kopieren</ButtonLabel>
                    </Button>

                    <Button
                        variant="primary"
                        size="sm"
                        {@attach pasteOnClick((e) => {
                            pasteValue = e.text;
                        })}
                    >
                        <PasteIcon />
                        <ButtonLabel>Paste</ButtonLabel>
                    </Button>
                </div>
            </div>
        </div>

        <!-- 6. Paste Error & Static States -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Paste States</h2>
            <div class="flex flex-wrap gap-3 items-center">
                <Button
                    variant="tertiary"
                    size="md"
                    iconOnly
                    aria-label="Paste Error simulieren"
                    {@attach pasteOnClick(() => null)}
                    {@attach tooltip("Paste Error")}
                >
                    <PasteIcon />
                    <HitArea size="md" />
                </Button>

                <Button
                    variant="secondary"
                    danger
                    size="md"
                    {@attach pasteOnClick(() => null)}
                >
                    <PasteIcon />
                    <ButtonLabel>Fail Paste</ButtonLabel>
                </Button>
            </div>

            <div class="flex flex-wrap gap-4 items-center text-lg">
                <PasteIcon status="idle" />
                <PasteIcon status="pending" />
                <PasteIcon status="pasted" />
                <PasteIcon status="empty" />
                <PasteIcon status="error" />
            </div>
        </div>
    </div>
</div>
