<script lang="ts">
    import WorkAppViewStage from "./WorkAppViewStage.svelte";
    import { type WorkAppViewKey, workAppViewIn, workAppViewOut } from "./index.ts";

    interface Props {
        activeKey?: WorkAppViewKey;
        scrollContainer?: HTMLElement | Window | null;
        restoreScroll?: boolean;
        withScrollAreaAncestor?: boolean;
        withTransitions?: boolean;
        scrollAreaRef?: HTMLElement | null;
        stageRef?: HTMLElement | null;
        stageClass?: string;
        stageTestId?: string;
        stageId?: string;
    }

    let {
        activeKey = $bindable<WorkAppViewKey | undefined>(),
        scrollContainer,
        restoreScroll = true,
        withScrollAreaAncestor = false,
        withTransitions = false,
        scrollAreaRef = $bindable(null),
        stageRef = $bindable(null),
        stageClass,
        stageTestId,
        stageId,
    }: Props = $props();
</script>

{#if withScrollAreaAncestor}
    <div bind:this={scrollAreaRef} class="cs-scroll-area-content">
        <WorkAppViewStage
            bind:ref={stageRef}
            {activeKey}
            {scrollContainer}
            {restoreScroll}
            class={stageClass}
            data-testid={stageTestId}
            id={stageId}
        >
            <div data-view={activeKey}>{activeKey}</div>
        </WorkAppViewStage>
    </div>
{:else}
    <WorkAppViewStage
        bind:ref={stageRef}
        {activeKey}
        {scrollContainer}
        {restoreScroll}
        class={stageClass}
        data-testid={stageTestId}
        id={stageId}
    >
        {#if withTransitions}
            {#key activeKey}
                <div data-view={activeKey} in:workAppViewIn out:workAppViewOut>{activeKey}</div>
            {/key}
        {:else}
            <div data-view={activeKey}>{activeKey}</div>
        {/if}
    </WorkAppViewStage>
{/if}
