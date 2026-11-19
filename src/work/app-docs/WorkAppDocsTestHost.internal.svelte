<script lang="ts">
    import type { Component } from "svelte";

    import type { SegmentedControlIconComponentProps } from "../../modules/segmented-control/index.ts";
    import {
        WorkAppDocs,
        WorkAppDocsCallout,
        WorkAppDocsCard,
        WorkAppDocsCardGrid,
        WorkAppDocsChapter,
        WorkAppDocsCode,
        WorkAppDocsContent,
        WorkAppDocsHeader,
        WorkAppDocsKbd,
        WorkAppDocsMark,
        WorkAppDocsSection,
        WorkAppDocsTab,
        WorkAppDocsTable,
        WorkAppDocsTableBody,
        WorkAppDocsTableCell,
        WorkAppDocsTableHead,
        WorkAppDocsTableHeaderCell,
        WorkAppDocsTableRow,
        WorkAppDocsTabs,
        type WorkAppDocsCalloutVariant,
        type WorkAppDocsMarkTone,
        type WorkAppDocsTableAlign,
    } from "./index.ts";

    interface Props {
        mode?: "docs" | "primitives";
        tabsMode?: "auto" | "explicit";
        tabsAriaLabel?: string;
        activeChapter?: string;
        defaultChapter?: string;
        strictControlled?: boolean;
        onChapterChange?: (id: string) => void;
        showFirstChapter?: boolean;
        showMiddleChapter?: boolean;
        showThirdChapter?: boolean;
        firstChapterIcon?: Component<SegmentedControlIconComponentProps>;
        secondChapterIcon?: Component<SegmentedControlIconComponentProps>;
        onExplicitTabClick?: (id: string, event: MouseEvent) => void;
        headerEyebrow?: string;
        headerTitle?: string;
        headerLead?: string;
        calloutVariant?: WorkAppDocsCalloutVariant;
        calloutTitle?: string;
        calloutIcon?: Component | null;
        markTone?: WorkAppDocsMarkTone;
        cardIcon?: Component;
        cardDescription?: string;
        tableCaption?: string;
        tableAlign?: WorkAppDocsTableAlign;
    }

    let {
        mode = "docs",
        tabsMode = "auto",
        tabsAriaLabel,
        activeChapter = $bindable(),
        defaultChapter,
        strictControlled = false,
        onChapterChange,
        showFirstChapter = true,
        showMiddleChapter = false,
        showThirdChapter = true,
        firstChapterIcon,
        secondChapterIcon,
        onExplicitTabClick,
        headerEyebrow,
        headerTitle = "App Documentation",
        headerLead,
        calloutVariant = "note",
        calloutTitle,
        calloutIcon,
        markTone = "accent",
        cardIcon,
        cardDescription,
        tableCaption,
        tableAlign = "start",
    }: Props = $props();

    export function getBoundActiveChapter(): string | undefined {
        return activeChapter;
    }
</script>

{#snippet docsBody()}
    <WorkAppDocsHeader eyebrow={headerEyebrow} title={headerTitle} lead={headerLead} />

    {#if tabsMode === "auto"}
        <WorkAppDocsTabs aria-label={tabsAriaLabel} />
    {:else}
        <WorkAppDocsTabs aria-label={tabsAriaLabel}>
            {#if showFirstChapter}
                <WorkAppDocsTab
                    value="overview"
                    icon={firstChapterIcon}
                    onclick={(event) => onExplicitTabClick?.("overview", event)}
                >
                    Overview
                </WorkAppDocsTab>
            {/if}
            {#if showMiddleChapter}
                <WorkAppDocsTab
                    value="workflows"
                    onclick={(event) => onExplicitTabClick?.("workflows", event)}
                >
                    Workflows
                </WorkAppDocsTab>
            {/if}
            {#if showThirdChapter}
                <WorkAppDocsTab
                    value="reference"
                    icon={secondChapterIcon}
                    onclick={(event) => onExplicitTabClick?.("reference", event)}
                >
                    Reference
                </WorkAppDocsTab>
            {/if}
        </WorkAppDocsTabs>
    {/if}

    <WorkAppDocsContent>
        {#if showFirstChapter}
            <WorkAppDocsChapter
                id="overview"
                title="Overview"
                icon={firstChapterIcon}
                lead="Overview chapter lead."
            >
                <WorkAppDocsSection id="intro" title="Introduction" lead="First section lead.">
                    <p>Intro body</p>
                </WorkAppDocsSection>

                <WorkAppDocsSection id="intro-sub" title="Quickstart" level={3}>
                    <p>Subsection body</p>
                </WorkAppDocsSection>
            </WorkAppDocsChapter>
        {/if}

        {#if showMiddleChapter}
            <WorkAppDocsChapter id="workflows" title="Workflows">
                <WorkAppDocsSection title="Daily Flow">
                    <p>Workflows body</p>
                </WorkAppDocsSection>
            </WorkAppDocsChapter>
        {/if}

        {#if showThirdChapter}
            <WorkAppDocsChapter id="reference" title="Reference" icon={secondChapterIcon}>
                <WorkAppDocsSection id="summary" title="Summary" level={2}>
                    <p>Final section body</p>
                </WorkAppDocsSection>
            </WorkAppDocsChapter>
        {/if}
    </WorkAppDocsContent>
{/snippet}

{#if mode === "docs"}
    {#if strictControlled}
        <WorkAppDocs
            bind:activeChapter={() => activeChapter, () => {}}
            {defaultChapter}
            {onChapterChange}
        >
            {@render docsBody()}
        </WorkAppDocs>
    {:else}
        <WorkAppDocs bind:activeChapter {defaultChapter} {onChapterChange}>
            {@render docsBody()}
        </WorkAppDocs>
    {/if}
{:else}
    <WorkAppDocsContent>
        <WorkAppDocsHeader eyebrow={headerEyebrow} title={headerTitle} lead={headerLead}>
            <span data-testid="header-extra">Extra header slot</span>
        </WorkAppDocsHeader>

        <WorkAppDocsSection id="intro" title="Introduction" lead="First section lead.">
            <p>Intro body</p>
        </WorkAppDocsSection>

        <WorkAppDocsSection id="intro-sub" title="Quickstart" level={3}>
            <p>Subsection body</p>
        </WorkAppDocsSection>

        <WorkAppDocsSection title="Unidentified Section">
            <p>Section without id</p>
        </WorkAppDocsSection>

        <WorkAppDocsCallout variant={calloutVariant} title={calloutTitle} icon={calloutIcon}>
            <p>Callout message</p>
        </WorkAppDocsCallout>

        <p>
            Use <WorkAppDocsMark tone={markTone}>highlighted</WorkAppDocsMark>,
            <WorkAppDocsKbd>Ctrl+S</WorkAppDocsKbd>, and
            <WorkAppDocsCode>saveWorkspace()</WorkAppDocsCode>.
        </p>

        <WorkAppDocsCardGrid>
            <WorkAppDocsCard title="First Card" description={cardDescription} icon={cardIcon}>
                <p>Card body content</p>
            </WorkAppDocsCard>
            <WorkAppDocsCard title="Minimal Card" />
        </WorkAppDocsCardGrid>

        <WorkAppDocsTable caption={tableCaption}>
            <WorkAppDocsTableHead>
                <WorkAppDocsTableRow>
                    <WorkAppDocsTableHeaderCell align={tableAlign}>Action</WorkAppDocsTableHeaderCell>
                    <WorkAppDocsTableHeaderCell align="center">Shortcut</WorkAppDocsTableHeaderCell>
                    <WorkAppDocsTableHeaderCell align="end">Scope</WorkAppDocsTableHeaderCell>
                </WorkAppDocsTableRow>
            </WorkAppDocsTableHead>
            <WorkAppDocsTableBody>
                <WorkAppDocsTableRow>
                    <WorkAppDocsTableCell align={tableAlign}>Save</WorkAppDocsTableCell>
                    <WorkAppDocsTableCell align="center">Ctrl+S</WorkAppDocsTableCell>
                    <WorkAppDocsTableCell align="end">Global</WorkAppDocsTableCell>
                </WorkAppDocsTableRow>
            </WorkAppDocsTableBody>
        </WorkAppDocsTable>
    </WorkAppDocsContent>
{/if}
