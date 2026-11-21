export { default as Splitter } from "./Splitter.svelte";
export { default as SplitterPane } from "./SplitterPane.svelte";
export { default as SplitterHandle } from "./SplitterHandle.svelte";

export {
    getSplitterContext,
    setSplitterContext,
    hasSplitterContext,
    type SplitterContext,
} from "./splitter.context.ts";

export {
    SPLITTER_ORIENTATIONS,
    SPLITTER_VARIANTS,
    SPLITTER_SIZES,
    SPLITTER_DOUBLE_CLICK_ACTIONS,
    type SplitterOrientation,
    type SplitterVariant,
    type SplitterSize,
    type SplitterDoubleClickAction,
    type SplitterExtent,
    type SplitterPaneSnapshot,
    type SplitterResizeEvent,
    type SplitterProps,
    type SplitterPaneProps,
    type SplitterHandleProps,
} from "./splitter.types.ts";
