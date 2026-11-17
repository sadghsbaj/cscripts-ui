<script module lang="ts">
    export const id = "middle-click";
    export const label = "MiddleClick";
</script>

<script lang="ts">
    import { middleClick } from "cs/svelte/middle-click";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let tabs = $state(["Alpha", "Beta", "Gamma", "Delta"]);
    let count = $state(0);

    function closeTab(name: string): void {
        tabs = tabs.filter((tab) => tab !== name);
    }

    function resetTabs(): void {
        tabs = ["Alpha", "Beta", "Gamma", "Delta"];
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {@attach} bindings */
    const tabsCode = `<script lang="ts">
    import { middleClick } from "cs/svelte/middle-click";
${closeScript}

{#each tabs as tab (tab)}
    <div {@attach middleClick({ onMiddleClick: () => closeTab(tab), ignore: "button" })}>
        {tab}
        <button onclick={() => closeTab(tab)}>×</button>
    </div>
{/each}`;

    const counterCode = `<div {@attach middleClick({ onMiddleClick: () => count++, allowModifiers: true })}>
    Middle clicks: {count}
</div>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="middleClick"
        description="Reacts to a middle mouse button click and suppresses autoscroll and native defaults."
    />

    <PreviewSection
        title="Close Tabs"
        description="Middle click a tab to close it. The close button keeps its own click via ignore."
        code={tabsCode}
    >
        <div class="flex-center flex-wrap gap-2 w-full min-h-10">
            {#each tabs as tab (tab)}
                <div
                    role="tab"
                    tabindex="0"
                    aria-selected="false"
                    class="h-9 pl-3.5 pr-1.5 flex-center gap-2 border border-base-300 dark:border-base-700 rounded-full squircle text-xs font-medium text-strong select-none"
                    {@attach middleClick({ onMiddleClick: () => closeTab(tab), ignore: "button" })}
                >
                    {tab}
                    <button
                        type="button"
                        class="size-6 flex-center rounded-full text-weak hover:text-strong"
                        aria-label="Close {tab}"
                        onclick={() => closeTab(tab)}
                    >
                        ×
                    </button>
                </div>
            {/each}
            {#if tabs.length === 0}
                <button
                    type="button"
                    class="text-xs text-weak hover:text-strong"
                    aria-label="Restore all tabs"
                    onclick={resetTabs}>Reset</button
                >
            {/if}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Counter"
        description="Middle click anywhere in the box; Ctrl/Shift/Alt/Meta + middle click is counted too (allowModifiers)."
        code={counterCode}
    >
        <div
            class="w-full max-w-xs h-12 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-2xl squircle-soft text-xs font-medium text-strong select-none"
            {@attach middleClick({ onMiddleClick: () => count++, allowModifiers: true })}
        >
            Middle clicks: {count}
        </div>
    </PreviewSection>
</div>
