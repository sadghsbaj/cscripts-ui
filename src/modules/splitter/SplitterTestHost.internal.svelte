<script lang="ts">
    import Splitter from "./Splitter.svelte";
    import SplitterHandle from "./SplitterHandle.svelte";
    import SplitterPane from "./SplitterPane.svelte";
    import type {
        SplitterDoubleClickAction,
        SplitterExtent,
        SplitterOrientation,
        SplitterResizeEvent,
        SplitterSize,
        SplitterVariant,
    } from "./splitter.types.ts";

    export interface SplitterTestHostProps {
        rootRef?: HTMLDivElement | null;
        variant?: SplitterVariant;
        size?: SplitterSize;
        orientation?: SplitterOrientation;
        animate?: boolean;
        disabled?: boolean;
        onResize?: (event: SplitterResizeEvent) => void;
        onResizeEnd?: (event: SplitterResizeEvent) => void;

        leftId?: string;
        leftDefaultExtent?: SplitterExtent;
        leftMin?: SplitterExtent;
        leftMax?: SplitterExtent;
        leftCollapsible?: boolean;
        leftCollapsed?: boolean;
        leftCollapsedExtent?: SplitterExtent;
        leftCollapseThreshold?: number;
        onLeftCollapseChange?: (collapsed: boolean) => void;

        handleDisabled?: boolean;
        doubleClickAction?: SplitterDoubleClickAction;
        keyboardStep?: SplitterExtent;
        keyboardStepLarge?: SplitterExtent;
        handleLabel?: string;
        handleVariant?: SplitterVariant;
        handleSize?: SplitterSize;

        showExtraPane?: boolean;
        extraPaneId?: string;
        extraPaneDefaultExtent?: SplitterExtent;
        extraPaneExtent?: SplitterExtent;

        nested?: boolean;
        onOuterResize?: (event: SplitterResizeEvent) => void;
        onInnerResize?: (event: SplitterResizeEvent) => void;
    }

    let {
        rootRef = $bindable<HTMLDivElement | null>(null),
        variant = "subtle",
        size = "md",
        orientation = "horizontal",
        animate = true,
        disabled = false,
        onResize,
        onResizeEnd,

        leftId = "left-pane",
        leftDefaultExtent = "300px",
        leftMin = "150px",
        leftMax = "700px",
        leftCollapsible = false,
        leftCollapsed = $bindable(false),
        leftCollapsedExtent = "0px",
        leftCollapseThreshold = 0.5,
        onLeftCollapseChange,

        handleDisabled = false,
        doubleClickAction = "reset",
        keyboardStep = "16px",
        keyboardStepLarge = "64px",
        handleLabel,
        handleVariant,
        handleSize,

        showExtraPane = false,
        extraPaneId,
        extraPaneDefaultExtent = "200px",
        extraPaneExtent = $bindable<SplitterExtent | undefined>(),

        nested = false,
        onOuterResize,
        onInnerResize,
    }: SplitterTestHostProps = $props();
</script>

<Splitter
    bind:ref={rootRef}
    data-testid="outer-splitter"
    {variant}
    {size}
    {orientation}
    {animate}
    {disabled}
    onResize={onOuterResize ?? onResize}
    {onResizeEnd}
>
    <SplitterPane
        id={leftId}
        data-testid="left-pane"
        defaultExtent={leftDefaultExtent}
        min={leftMin}
        max={leftMax}
        collapsible={leftCollapsible}
        bind:collapsed={leftCollapsed}
        collapsedExtent={leftCollapsedExtent}
        collapseThreshold={leftCollapseThreshold}
        onCollapseChange={onLeftCollapseChange}
    >
        Left
    </SplitterPane>

    <SplitterHandle
        data-testid="primary-handle"
        disabled={handleDisabled}
        {doubleClickAction}
        {keyboardStep}
        {keyboardStepLarge}
        label={handleLabel}
        variant={handleVariant}
        size={handleSize}
    />

    <SplitterPane id="main-pane" data-testid="main-pane" min="100px">
        {#if nested}
            <Splitter
                data-testid="inner-splitter"
                variant="transparent"
                size="sm"
                orientation="vertical"
                onResize={onInnerResize}
            >
                <SplitterPane id="inner-top" data-testid="inner-top" defaultExtent="50%">
                    Inner Top
                </SplitterPane>
                <SplitterHandle data-testid="inner-handle" />
                <SplitterPane id="inner-bottom" data-testid="inner-bottom">
                    Inner Bottom
                </SplitterPane>
            </Splitter>
        {:else}
            Main
        {/if}
    </SplitterPane>

    {#if showExtraPane}
        <SplitterHandle data-testid="extra-handle" />
        {#if extraPaneId !== undefined}
            <SplitterPane
                id={extraPaneId}
                data-testid="extra-pane"
                defaultExtent={extraPaneDefaultExtent}
                bind:extent={extraPaneExtent}
                min="100px"
            >
                Extra
            </SplitterPane>
        {:else}
            <SplitterPane
                data-testid="extra-pane"
                defaultExtent={extraPaneDefaultExtent}
                bind:extent={extraPaneExtent}
                min="100px"
            >
                Extra
            </SplitterPane>
        {/if}
    {/if}
</Splitter>
