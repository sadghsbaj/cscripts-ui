import { createContext, type Component } from "svelte";

import type { SegmentedControlIconComponentProps } from "../../modules/segmented-control/index.ts";

export interface AppDocsChapterRecord {
    id: string;
    title: string;
    icon?: Component<SegmentedControlIconComponentProps>;
}

export interface AppDocsContext {
    readonly activeChapter: string | undefined;
    readonly chapters: readonly AppDocsChapterRecord[];
    registerChapter: (record: AppDocsChapterRecord) => () => void;
    selectChapter: (id: string) => void;
}

export const [getAppDocsContext, setAppDocsContext, hasAppDocsContext] = createContext<AppDocsContext>();
