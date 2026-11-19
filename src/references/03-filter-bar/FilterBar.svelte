<script lang="ts">
    import { Search, SlidersHorizontal, X } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Card, CardBody } from "cs/svelte/card";
    import { Chip, ChipGroup, ChipLabel, ChipRemove } from "cs/svelte/chip";
    import {
        Dropdown,
        DropdownCheckboxItem,
        DropdownContent,
        DropdownGroupLabel,
        DropdownRadioGroup,
        DropdownRadioItem,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import { TextInput, TextInputAction, TextInputField, TextInputIcon } from "cs/svelte/text-input";

    export type FilterStatus = "all" | "open" | "done";
    export type FilterSort = "updated" | "title";

    export interface FilterBarProps {
        query?: string;
        status?: FilterStatus;
        ownerOnly?: boolean;
        highPriority?: boolean;
        sort?: FilterSort;
        disabled?: boolean;
        class?: string;
    }

    interface FilterItem {
        id: string;
        title: string;
        owner: string;
        isOwner: boolean;
        status: Exclude<FilterStatus, "all">;
        highPriority: boolean;
        updatedOrder: number;
    }

    const ITEMS: readonly FilterItem[] = [
        {
            id: "1",
            title: "Audit token contrast in dark mode",
            owner: "Me",
            isOwner: true,
            status: "open",
            highPriority: true,
            updatedOrder: 1,
        },
        {
            id: "2",
            title: "Refine popover entrance spring",
            owner: "Alex",
            isOwner: false,
            status: "open",
            highPriority: true,
            updatedOrder: 2,
        },
        {
            id: "3",
            title: "Document segmented control overflow",
            owner: "Sam",
            isOwner: false,
            status: "done",
            highPriority: false,
            updatedOrder: 3,
        },
        {
            id: "4",
            title: "Migrate checkbox hit target tests",
            owner: "Me",
            isOwner: true,
            status: "done",
            highPriority: false,
            updatedOrder: 4,
        },
        {
            id: "5",
            title: "Align toolbar input heights",
            owner: "Alex",
            isOwner: false,
            status: "open",
            highPriority: false,
            updatedOrder: 5,
        },
    ];

    let {
        query = $bindable(""),
        status = $bindable<FilterStatus>("all"),
        ownerOnly = $bindable(false),
        highPriority = $bindable(false),
        sort = $bindable<FilterSort>("updated"),
        disabled = false,
        class: className,
    }: FilterBarProps = $props();

    const hasActiveFilters = $derived(ownerOnly || highPriority);

    const visibleItems = $derived.by(() => {
        const needle = query.trim().toLowerCase();

        const filtered = ITEMS.filter((item) => {
            if (status !== "all" && item.status !== status) return false;
            if (ownerOnly && !item.isOwner) return false;
            if (highPriority && !item.highPriority) return false;
            if (needle && !item.title.toLowerCase().includes(needle) && !item.owner.toLowerCase().includes(needle)) {
                return false;
            }
            return true;
        });

        return filtered.toSorted((a, b) => {
            if (sort === "title") return a.title.localeCompare(b.title);
            return a.updatedOrder - b.updatedOrder;
        });
    });

    function clearSecondary(): void {
        ownerOnly = false;
        highPriority = false;
    }

    function resetAll(): void {
        query = "";
        status = "all";
        ownerOnly = false;
        highPriority = false;
    }
</script>

<div class={["w-full max-w-[var(--cs-container-2xl)] flex flex-col", className]}>
    <div class="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <div class="flex-1 min-w-0">
            <TextInput variant="soft" size="md" {disabled}>
                <TextInputIcon icon={Search} />
                <TextInputField type="search" placeholder="Search..." aria-label="Search" bind:value={query} />
                <TextInputAction
                    icon={X}
                    aria-label="Clear search"
                    visible={query.length > 0}
                    onclick={() => (query = "")}
                />
            </TextInput>
        </div>

        <div class="flex items-center gap-2 shrink-0">
            <SegmentedControl size="md" width="content" bind:value={status} {disabled} aria-label="Status">
                <SegmentedControlItem value="all">
                    <SegmentedControlLabel>All</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="open">
                    <SegmentedControlLabel>Open</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="done">
                    <SegmentedControlLabel>Done</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>

            <Dropdown size="md" {disabled}>
                <Button variant="tertiary" size="md" {disabled} {@attach dropdownTrigger()}>
                    <ButtonIcon icon={SlidersHorizontal} />
                    <ButtonLabel>Filter</ButtonLabel>
                </Button>

                <DropdownContent placement="bottom-end">
                    <DropdownCheckboxItem bind:checked={ownerOnly}>Owner: Me</DropdownCheckboxItem>
                    <DropdownCheckboxItem bind:checked={highPriority}>Priority: High</DropdownCheckboxItem>

                    <DropdownSeparator />

                    <DropdownRadioGroup bind:value={sort}>
                        <DropdownGroupLabel>Sort</DropdownGroupLabel>
                        <DropdownRadioItem value="updated">Recently updated</DropdownRadioItem>
                        <DropdownRadioItem value="title">Title</DropdownRadioItem>
                    </DropdownRadioGroup>
                </DropdownContent>
            </Dropdown>
        </div>
    </div>

    <div class={["cs-filter-bar-disclosure", hasActiveFilters && "is-open"]} inert={!hasActiveFilters}>
        <div class="cs-filter-bar-disclosure-inner">
            <div class="pt-2.5 pb-1 flex items-center justify-between gap-3">
                <ChipGroup size="sm" variant="soft" {disabled} aria-label="Active filters">
                    {#if ownerOnly}
                        <Chip>
                            <ChipLabel><span class="text-weak">Owner:</span> Me</ChipLabel>
                            <ChipRemove aria-label="Remove Owner: Me filter" onclick={() => (ownerOnly = false)} />
                        </Chip>
                    {/if}
                    {#if highPriority}
                        <Chip>
                            <ChipLabel><span class="text-weak">Priority:</span> High</ChipLabel>
                            <ChipRemove
                                aria-label="Remove Priority: High filter"
                                onclick={() => (highPriority = false)}
                            />
                        </Chip>
                    {/if}
                </ChipGroup>

                <Button variant="ghost" size="xs" {disabled} onclick={clearSecondary}>
                    <ButtonLabel>Clear</ButtonLabel>
                </Button>
            </div>
        </div>
    </div>

    <Card variant="elevated" size="md" class="mt-3">
        <CardBody>
            {#if visibleItems.length > 0}
                <div class="divide-y divide-base-soft">
                    {#each visibleItems as item (item.id)}
                        <div class="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                            <span class="text-sm font-500 text-strong min-w-0 truncate">{item.title}</span>
                            <span class="description-sm text-weak shrink-0">
                                {item.owner}, {item.status === "open" ? "Open" : "Done"}
                            </span>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="py-6 flex flex-col items-center gap-3 text-center">
                    <p class="m-0 text-sm text-weak">No matching items</p>
                    <Button variant="tertiary" size="sm" {disabled} onclick={resetAll}>
                        <ButtonLabel>Reset filters</ButtonLabel>
                    </Button>
                </div>
            {/if}
        </CardBody>
    </Card>
</div>

<style>
    .cs-filter-bar-disclosure {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
            grid-template-rows var(--cs-dur-exit-sm) var(--cs-ease-exit),
            opacity var(--cs-dur-exit-sm) var(--cs-ease-exit);
    }

    .cs-filter-bar-disclosure.is-open {
        grid-template-rows: 1fr;
        opacity: 1;
        transition:
            grid-template-rows var(--cs-dur-enter-sm) var(--cs-ease-enter),
            opacity var(--cs-dur-enter-sm) var(--cs-ease-enter);
    }

    /* Keep horizontal overflow visible so ChipRemove focus rings are not clipped. */
    .cs-filter-bar-disclosure-inner {
        overflow-x: visible;
        overflow-y: clip;
        min-height: 0;
    }
</style>
