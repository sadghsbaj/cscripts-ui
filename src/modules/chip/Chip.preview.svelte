<script module>
    export const id = "chip";
    export const label = "Chip";
</script>

<script lang="ts">
    import {
        AlertCircle,
        ArrowUpRight,
        Filter,
        Mail,
        Pin,
        Plus,
        RotateCcw,
        Sparkles,
        Tag,
        User,
    } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        CHIP_SIZES,
        Chip,
        ChipGroup,
        ChipIcon,
        ChipLabel,
        ChipRemove,
        ChipTrigger,
    } from "cs/svelte/chip";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    const initialTags = ["Svelte", "TypeScript", "UnoCSS"];
    const extraTags = ["Vite", "Playwright", "Vitest", "Design Tokens"];
    let removableTags = $state<string[]>([...initialTags]);
    let nextTagIndex = $state(0);

    let interactiveFilter = $state(false);
    let summarizeClicks = $state(0);

    let splitStatusVisible = $state(true);
    let splitAssigneeVisible = $state(true);
    let splitStatusPressed = $state(true);
    let splitAssigneeClicks = $state(0);

    let softRestPressed = $state(false);
    let softActivePressed = $state(true);
    let elevatedRestPressed = $state(false);
    let elevatedActivePressed = $state(true);

    let pinnedSplitPressed = $state(true);
    let disabledPressed = $state(true);
    let canvasPressed = $state(true);
    let sunkenPressed = $state(true);
    let cardPressed = $state(true);

    let singleFilter = $state<string | undefined>("open");
    let multiFilters = $state<string[]>(["frontend", "design"]);

    interface WellRecipient {
        id: number;
        email: string;
        invalid?: boolean;
    }

    let nextRecipientId = 4;
    let wellDraft = $state("");
    let wellRecipients = $state<WellRecipient[]>([
        { id: 1, email: "maya@cscripts.dev" },
        { id: 2, email: "liam@cscripts.dev" },
        { id: 3, email: "not-an-email", invalid: true },
    ]);

    function addRemovableTag(): void {
        const candidate = extraTags[nextTagIndex % extraTags.length];
        nextTagIndex += 1;
        if (candidate && !removableTags.includes(candidate)) {
            removableTags = [...removableTags, candidate];
            return;
        }

        const fallback = `Tag ${removableTags.length + 1}`;
        removableTags = [...removableTags, fallback];
    }

    function removeTag(tag: string): void {
        removableTags = removableTags.filter((item) => item !== tag);
    }

    function resetRemovableTags(): void {
        removableTags = [...initialTags];
        nextTagIndex = 0;
    }

    function resetSplitChips(): void {
        splitStatusVisible = true;
        splitAssigneeVisible = true;
        splitStatusPressed = true;
        splitAssigneeClicks = 0;
    }

    function addWellRecipient(): void {
        const trimmed = wellDraft.trim();
        if (!trimmed) return;

        wellRecipients = [
            ...wellRecipients,
            {
                id: nextRecipientId,
                email: trimmed,
                invalid: !trimmed.includes("@"),
            },
        ];
        nextRecipientId += 1;
        wellDraft = "";
    }

    function removeWellRecipient(recipientId: number): void {
        wellRecipients = wellRecipients.filter((item) => item.id !== recipientId);
    }

    function handleWellKeydown(event: KeyboardEvent): void {
        if (event.key === "Enter") {
            event.preventDefault();
            addWellRecipient();
            return;
        }

        if (event.key === "Backspace" && wellDraft === "" && wellRecipients.length > 0) {
            wellRecipients = wellRecipients.slice(0, -1);
        }
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const compositionsCode = `<script lang="ts">
    import { ArrowUpRight, Filter, Pin, Tag } from "@lucide/svelte";
    import { Chip, ChipIcon, ChipLabel, ChipRemove, ChipTrigger } from "cs/svelte/chip";

    let openOnly = $state(false);
    let statusActive = $state(true);
${closeScript}

<!-- Static display -->
<Chip variant="soft" size="md">
    <ChipIcon icon={Tag} />
    <ChipLabel>TypeScript</ChipLabel>
</Chip>
<Chip variant="soft" size="md" iconOnly aria-label="Pinned">
    <ChipIcon icon={Pin} />
</Chip>

<!-- Removable tag -->
<Chip variant="soft" size="md">
    <ChipLabel>Svelte</ChipLabel>
    <ChipRemove onclick={() => remove("Svelte")} />
</Chip>

<!-- Interactive full-pill toggle & link -->
<Chip variant="soft" size="md">
    <ChipTrigger bind:pressed={openOnly}>
        <ChipIcon icon={Filter} />
        <ChipLabel>Open</ChipLabel>
    </ChipTrigger>
</Chip>
<Chip variant="soft" size="md">
    <ChipTrigger href="#changelog">
        <ChipIcon icon={ArrowUpRight} />
        <ChipLabel>Changelog</ChipLabel>
    </ChipTrigger>
</Chip>

<!-- Split trigger + remove -->
<Chip variant="soft" size="md">
    <ChipTrigger bind:pressed={statusActive}>
        <ChipIcon icon={Filter} />
        <ChipLabel>Status: Open</ChipLabel>
    </ChipTrigger>
    <ChipRemove onclick={dismissStatus} />
</Chip>`;

    const variantsCode = `<Chip variant="soft" size="md">
    <ChipTrigger bind:pressed><ChipLabel>Active</ChipLabel></ChipTrigger>
</Chip>

<SunkenWell>
    <Chip variant="elevated" size="md">
        <ChipTrigger bind:pressed={draft}><ChipLabel>Draft</ChipLabel></ChipTrigger>
    </Chip>
    <Chip variant="elevated" size="md">
        <ChipTrigger bind:pressed={published}><ChipLabel>Published</ChipLabel></ChipTrigger>
    </Chip>
</SunkenWell>

<Chip variant="accent" size="md">
    <ChipIcon icon={Sparkles} />
    <ChipLabel>Beta</ChipLabel>
    <ChipRemove />
</Chip>`;

    const sizesCode = `<Chip variant="soft" size="xs"><ChipLabel>Label</ChipLabel></Chip>
<Chip variant="soft" size="sm"><ChipLabel>Label</ChipLabel></Chip>
<Chip variant="soft" size="md"><ChipLabel>Label</ChipLabel></Chip>
<Chip variant="soft" size="lg"><ChipLabel>Label</ChipLabel></Chip>
<Chip variant="soft" size="xl"><ChipLabel>Label</ChipLabel></Chip>

<!-- Horizontal truncation inside a narrow container -->
<div class="w-full max-w-60">
    <Chip variant="soft" size="md">
        <ChipIcon icon={Mail} />
        <ChipLabel>engineering-platform@cscripts.dev</ChipLabel>
        <ChipRemove />
    </Chip>
</div>`;

    const statesCode = `<Chip variant="soft" size="md" invalid>
    <ChipIcon icon={AlertCircle} />
    <ChipLabel>not-an-email</ChipLabel>
    <ChipRemove />
</Chip>

<Chip variant="soft" size="md" disabled>
    <ChipTrigger bind:pressed={disabledPressed}><ChipLabel>Disabled pressed</ChipLabel></ChipTrigger>
</Chip>

<!-- Per-part disabled inside split chip -->
<Chip variant="soft" size="md">
    <ChipTrigger disabled><ChipLabel>Locked filter</ChipLabel></ChipTrigger>
    <ChipRemove />
</Chip>`;

    const groupCode = `<ChipGroup variant="soft" size="md" bind:value={singleFilter}>
    <Chip><ChipTrigger value="all"><ChipLabel>All</ChipLabel></ChipTrigger></Chip>
    <Chip><ChipTrigger value="open"><ChipLabel>Open</ChipLabel></ChipTrigger></Chip>
    <Chip><ChipTrigger value="review"><ChipLabel>In review</ChipLabel></ChipTrigger></Chip>
</ChipGroup>

<ChipGroup variant="soft" size="md" multiple bind:value={multiFilters}>
    <Chip><ChipTrigger value="frontend"><ChipLabel>Frontend</ChipLabel></ChipTrigger></Chip>
    <Chip><ChipTrigger value="backend"><ChipLabel>Backend</ChipLabel></ChipTrigger></Chip>
    <Chip><ChipTrigger value="design"><ChipLabel>Design</ChipLabel></ChipTrigger></Chip>
</ChipGroup>`;

    const pairingCode = `<!-- Soft input well overriding nested chip surfaces -->
<div
    class="bg-base-soft rounded-xl squircle-soft px-2 py-1 flex flex-wrap items-center gap-1.5"
    style="
        --cs-chip-bg: light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 14%, transparent));
        --cs-chip-bg-hover: light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 19%, transparent));
        --cs-chip-shadow: light-dark(var(--cs-shadow-xs), inset 0 1px 0 0 rgb(255 255 255 / 0.08));
    "
>
    <Chip variant="soft" size="md">
        <ChipLabel>maya@cscripts.dev</ChipLabel>
        <ChipRemove />
    </Chip>
</div>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Chip"
        description="Compact pill primitive for tags, filters, removable tokens, and split actions."
    />

    <PreviewSection
        title="Compositions"
        description="Static, removable, interactive full-pill, and split chips share one uniform Chip shell."
        align="start"
        code={compositionsCode}
    >
        <div class="flex w-full flex-col gap-5">
            <div class="flex flex-wrap items-center gap-3">
                <span class="w-24 shrink-0 text-xs font-medium text-weak">Static</span>
                <Chip variant="soft" size="md">
                    <ChipLabel>Design</ChipLabel>
                </Chip>
                <Chip variant="soft" size="md">
                    <ChipIcon icon={Tag} />
                    <ChipLabel>TypeScript</ChipLabel>
                </Chip>
                <Chip variant="soft" size="md" iconOnly aria-label="Pinned">
                    <ChipIcon icon={Pin} />
                </Chip>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-24 shrink-0 text-xs font-medium text-weak">Removable</span>
                <div class="flex flex-wrap items-center gap-2">
                    {#each removableTags as tag (tag)}
                        <Chip variant="soft" size="md">
                            <ChipIcon icon={Tag} />
                            <ChipLabel>{tag}</ChipLabel>
                            <ChipRemove aria-label="Remove {tag}" onclick={() => removeTag(tag)} />
                        </Chip>
                    {/each}

                    <Button variant="tertiary" size="xs" onclick={addRemovableTag}>
                        <ButtonIcon icon={Plus} />
                        <ButtonLabel>Add tag</ButtonLabel>
                    </Button>

                    {#if removableTags.length !== initialTags.length || initialTags.some((t, i) => removableTags[i] !== t)}
                        <Button variant="ghost" size="xs" onclick={resetRemovableTags}>
                            <ButtonIcon icon={RotateCcw} />
                            <ButtonLabel>Reset</ButtonLabel>
                        </Button>
                    {/if}
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-24 shrink-0 text-xs font-medium text-weak">Interactive</span>
                <div class="flex flex-wrap items-center gap-2">
                    <Chip variant="soft" size="md">
                        <ChipTrigger bind:pressed={interactiveFilter}>
                            <ChipIcon icon={Filter} />
                            <ChipLabel>Open</ChipLabel>
                        </ChipTrigger>
                    </Chip>

                    <Chip variant="soft" size="md">
                        <ChipTrigger onclick={() => (summarizeClicks += 1)}>
                            <ChipIcon icon={Sparkles} />
                            <ChipLabel>{summarizeClicks > 0 ? `Summarize (${summarizeClicks})` : "Summarize"}</ChipLabel>
                        </ChipTrigger>
                    </Chip>

                    <Chip variant="soft" size="md">
                        <ChipTrigger href="#changelog" onclick={(event) => event.preventDefault()}>
                            <ChipIcon icon={ArrowUpRight} />
                            <ChipLabel>Changelog</ChipLabel>
                        </ChipTrigger>
                    </Chip>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-24 shrink-0 text-xs font-medium text-weak">Split</span>
                <div class="flex flex-wrap items-center gap-2">
                    {#if splitStatusVisible}
                        <Chip variant="soft" size="md">
                            <ChipTrigger bind:pressed={splitStatusPressed}>
                                <ChipIcon icon={Filter} />
                                <ChipLabel>Status: Open</ChipLabel>
                            </ChipTrigger>
                            <ChipRemove
                                aria-label="Remove Status: Open filter"
                                onclick={() => (splitStatusVisible = false)}
                            />
                        </Chip>
                    {/if}

                    {#if splitAssigneeVisible}
                        <Chip variant="soft" size="md">
                            <ChipTrigger onclick={() => (splitAssigneeClicks += 1)}>
                                <ChipIcon icon={User} />
                                <ChipLabel>
                                    {splitAssigneeClicks > 0 ? `Assignee: Maya (${splitAssigneeClicks})` : "Assignee: Maya"}
                                </ChipLabel>
                            </ChipTrigger>
                            <ChipRemove
                                aria-label="Remove Assignee: Maya filter"
                                onclick={() => (splitAssigneeVisible = false)}
                            />
                        </Chip>
                    {/if}

                    {#if !splitStatusVisible || !splitAssigneeVisible}
                        <Button variant="ghost" size="xs" onclick={resetSplitChips}>
                            <ButtonIcon icon={RotateCcw} />
                            <ButtonLabel>Reset</ButtonLabel>
                        </Button>
                    {/if}
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Soft, elevated, and accent surfaces, with pressed elevated chips adding a 1px inset accent rim."
        align="start"
        code={variantsCode}
    >
        <div class="flex w-full flex-col gap-5">
            <div class="flex flex-wrap items-center gap-3">
                <span class="w-24 shrink-0 text-xs font-medium text-weak">soft</span>
                <Chip variant="soft" size="md">
                    <ChipLabel>Design</ChipLabel>
                </Chip>
                <Chip variant="soft" size="md">
                    <ChipIcon icon={Tag} />
                    <ChipLabel>Release</ChipLabel>
                    <ChipRemove aria-label="Remove Release" />
                </Chip>
                <Chip variant="soft" size="md">
                    <ChipTrigger bind:pressed={softRestPressed}>
                        <ChipLabel>Draft</ChipLabel>
                    </ChipTrigger>
                </Chip>
                <Chip variant="soft" size="md">
                    <ChipTrigger bind:pressed={softActivePressed}>
                        <ChipLabel>Active</ChipLabel>
                    </ChipTrigger>
                </Chip>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-24 shrink-0 text-xs font-medium text-weak">elevated</span>
                <SunkenWell class="flex-wrap gap-2">
                    <Chip variant="elevated" size="md">
                        <ChipLabel>Design</ChipLabel>
                    </Chip>
                    <Chip variant="elevated" size="md">
                        <ChipIcon icon={Tag} />
                        <ChipLabel>Release</ChipLabel>
                        <ChipRemove aria-label="Remove Release" />
                    </Chip>
                    <Chip variant="elevated" size="md">
                        <ChipTrigger bind:pressed={elevatedRestPressed}>
                            <ChipLabel>Draft</ChipLabel>
                        </ChipTrigger>
                    </Chip>
                    <Chip variant="elevated" size="md">
                        <ChipTrigger bind:pressed={elevatedActivePressed}>
                            <ChipLabel>Published</ChipLabel>
                        </ChipTrigger>
                    </Chip>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-24 shrink-0 text-xs font-medium text-weak">accent</span>
                <Chip variant="accent" size="md">
                    <ChipLabel>Featured</ChipLabel>
                </Chip>
                <Chip variant="accent" size="md">
                    <ChipIcon icon={Sparkles} />
                    <ChipLabel>Beta</ChipLabel>
                    <ChipRemove aria-label="Remove Beta" />
                </Chip>
                <Chip variant="accent" size="md">
                    <ChipTrigger onclick={() => {}}>
                        <ChipIcon icon={Filter} />
                        <ChipLabel>Priority: High</ChipLabel>
                    </ChipTrigger>
                    <ChipRemove aria-label="Remove Priority: High" />
                </Chip>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes & Truncation"
        description="Five sizes from xs (20px) to xl (36px) with concentric remove buttons and single-line label truncation."
        align="start"
        code={sizesCode}
    >
        <div class="flex w-full flex-col gap-6">
            <div class="flex flex-col gap-3">
                {#each CHIP_SIZES as size (size)}
                    <div class="flex flex-wrap items-center gap-3">
                        <span class="w-8 shrink-0 text-xs font-medium text-weak uppercase">{size}</span>
                        <Chip variant="soft" {size}>
                            <ChipLabel>Label</ChipLabel>
                        </Chip>
                        <Chip variant="soft" {size}>
                            <ChipIcon icon={Tag} />
                            <ChipLabel>Label</ChipLabel>
                        </Chip>
                        <Chip variant="soft" {size}>
                            <ChipIcon icon={Tag} />
                            <ChipLabel>Label</ChipLabel>
                            <ChipRemove aria-label="Remove Label" />
                        </Chip>
                        <Chip variant="soft" {size} iconOnly aria-label="Pinned">
                            <ChipIcon icon={Pin} />
                        </Chip>
                    </div>
                {/each}
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-xs font-medium text-weak">Narrow truncation</span>
                <div class="flex w-full max-w-60 flex-col items-start gap-2 rounded-2xl border border-base-soft p-3">
                    <Chip variant="soft" size="md">
                        <ChipLabel>Design system foundation tokens and typography</ChipLabel>
                    </Chip>
                    <Chip variant="soft" size="md">
                        <ChipIcon icon={Mail} />
                        <ChipLabel>engineering-platform@cscripts.dev</ChipLabel>
                        <ChipRemove aria-label="Remove engineering-platform@cscripts.dev" />
                    </Chip>
                    <Chip variant="soft" size="md">
                        <ChipTrigger onclick={() => {}}>
                            <ChipIcon icon={Filter} />
                            <ChipLabel>Workspace: Production Cluster EU-West</ChipLabel>
                        </ChipTrigger>
                        <ChipRemove aria-label="Remove Workspace filter" />
                    </Chip>
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Invalid & Disabled"
        description="Negative inset ring for malformed tokens and semantic disabled styling at chip or sub-trigger level."
        align="start"
        code={statesCode}
    >
        <div class="flex w-full flex-col gap-5">
            <div class="flex flex-wrap items-center gap-3">
                <span class="w-28 shrink-0 text-xs font-medium text-weak">Invalid</span>
                <Chip variant="soft" size="md" invalid>
                    <ChipIcon icon={AlertCircle} />
                    <ChipLabel>not-an-email</ChipLabel>
                    <ChipRemove aria-label="Remove not-an-email" />
                </Chip>
                <Chip variant="soft" size="md" invalid>
                    <ChipTrigger onclick={() => {}}>
                        <ChipIcon icon={AlertCircle} />
                        <ChipLabel>bad-domain@</ChipLabel>
                    </ChipTrigger>
                    <ChipRemove aria-label="Remove bad-domain@" />
                </Chip>
                <SunkenWell>
                    <Chip variant="elevated" size="md" invalid>
                        <ChipIcon icon={AlertCircle} />
                        <ChipLabel>invalid-token</ChipLabel>
                        <ChipRemove aria-label="Remove invalid-token" />
                    </Chip>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-28 shrink-0 text-xs font-medium text-weak">Disabled (soft)</span>
                <Chip variant="soft" size="md" disabled>
                    <ChipLabel>Static</ChipLabel>
                </Chip>
                <Chip variant="soft" size="md" disabled>
                    <ChipIcon icon={Tag} />
                    <ChipLabel>Removable</ChipLabel>
                    <ChipRemove aria-label="Remove disabled chip" />
                </Chip>
                <Chip variant="soft" size="md" disabled>
                    <ChipTrigger bind:pressed={disabledPressed}>
                        <ChipLabel>Pressed</ChipLabel>
                    </ChipTrigger>
                </Chip>
                <Chip variant="soft" size="md" disabled>
                    <ChipTrigger href="#archived">
                        <ChipLabel>Archived link</ChipLabel>
                    </ChipTrigger>
                </Chip>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-28 shrink-0 text-xs font-medium text-weak">Disabled (other)</span>
                <SunkenWell class="flex-wrap gap-2">
                    <Chip variant="elevated" size="md" disabled>
                        <ChipLabel>Elevated</ChipLabel>
                    </Chip>
                    <Chip variant="elevated" size="md" disabled>
                        <ChipTrigger bind:pressed={disabledPressed}>
                            <ChipLabel>Elevated pressed</ChipLabel>
                        </ChipTrigger>
                    </Chip>
                </SunkenWell>
                <Chip variant="accent" size="md" disabled>
                    <ChipLabel>Accent</ChipLabel>
                    <ChipRemove aria-label="Remove accent" />
                </Chip>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-28 shrink-0 text-xs font-medium text-weak">Per-part disabled</span>
                <Chip variant="soft" size="md">
                    <ChipTrigger disabled>
                        <ChipIcon icon={Filter} />
                        <ChipLabel>Locked filter</ChipLabel>
                    </ChipTrigger>
                    <ChipRemove aria-label="Remove Locked filter" />
                </Chip>
                <Chip variant="soft" size="md">
                    <ChipTrigger bind:pressed={pinnedSplitPressed}>
                        <ChipIcon icon={Pin} />
                        <ChipLabel>Pinned filter</ChipLabel>
                    </ChipTrigger>
                    <ChipRemove disabled aria-label="Remove Pinned filter" />
                </Chip>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="ChipGroup"
        description="Provides layout wrapping, variant/size/disabled inheritance, and single or multiple selection."
        align="start"
        code={groupCode}
    >
        <div class="flex w-full flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-3">
                    <span class="w-28 shrink-0 text-xs font-medium text-weak">Single-select</span>
                    <ChipGroup variant="soft" size="md" bind:value={singleFilter} aria-label="Issue status filter">
                        <Chip>
                            <ChipTrigger value="all"><ChipLabel>All</ChipLabel></ChipTrigger>
                        </Chip>
                        <Chip>
                            <ChipTrigger value="open"><ChipLabel>Open</ChipLabel></ChipTrigger>
                        </Chip>
                        <Chip>
                            <ChipTrigger value="review"><ChipLabel>In review</ChipLabel></ChipTrigger>
                        </Chip>
                        <Chip>
                            <ChipTrigger value="done"><ChipLabel>Done</ChipLabel></ChipTrigger>
                        </Chip>
                    </ChipGroup>
                </div>
                <span class="text-xs font-mono text-weak">value: {singleFilter ?? "undefined"}</span>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-3">
                    <span class="w-28 shrink-0 text-xs font-medium text-weak">Multi-select</span>
                    <ChipGroup
                        variant="soft"
                        size="md"
                        multiple
                        bind:value={multiFilters}
                        aria-label="Team discipline filter"
                    >
                        <Chip>
                            <ChipTrigger value="frontend"><ChipLabel>Frontend</ChipLabel></ChipTrigger>
                        </Chip>
                        <Chip>
                            <ChipTrigger value="backend"><ChipLabel>Backend</ChipLabel></ChipTrigger>
                        </Chip>
                        <Chip>
                            <ChipTrigger value="design"><ChipLabel>Design</ChipLabel></ChipTrigger>
                        </Chip>
                        <Chip>
                            <ChipTrigger value="docs"><ChipLabel>Docs</ChipLabel></ChipTrigger>
                        </Chip>
                    </ChipGroup>
                </div>
                <span class="text-xs font-mono text-weak">
                    value: [{multiFilters.length > 0 ? multiFilters.join(", ") : "empty"}]
                </span>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <span class="w-28 shrink-0 text-xs font-medium text-weak">Group disabled</span>
                <ChipGroup variant="soft" size="sm" disabled aria-label="Locked tags">
                    <Chip>
                        <ChipLabel>Read-only</ChipLabel>
                    </Chip>
                    <Chip>
                        <ChipLabel>Archived</ChipLabel>
                        <ChipRemove aria-label="Remove Archived" />
                    </Chip>
                </ChipGroup>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Surface Pairing"
        description="Compare elevated chips on canvas/sunken wells, soft chips on elevated cards, and host-overridden capsules inside a soft input well."
        align="start"
        code={pairingCode}
    >
        <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <div class="bg-canvas flex flex-col gap-2.5 rounded-2xl border border-base-soft p-4 squircle-soft">
                <span class="text-xs font-medium text-weak">Canvas (elevated & soft)</span>
                <div class="flex flex-wrap items-center gap-2">
                    <Chip variant="elevated" size="md">
                        <ChipLabel>Elevated</ChipLabel>
                    </Chip>
                    <Chip variant="elevated" size="md">
                        <ChipTrigger bind:pressed={canvasPressed}>
                            <ChipLabel>Pressed</ChipLabel>
                        </ChipTrigger>
                    </Chip>
                    <Chip variant="soft" size="md">
                        <ChipLabel>Soft</ChipLabel>
                        <ChipRemove aria-label="Remove Soft" />
                    </Chip>
                </div>
            </div>

            <div class="flex flex-col gap-2.5 rounded-2xl border border-base-soft p-4 squircle-soft">
                <span class="text-xs font-medium text-weak">Sunken well (elevated)</span>
                <SunkenWell class="w-full flex-wrap gap-2">
                    <Chip variant="elevated" size="md">
                        <ChipLabel>Design</ChipLabel>
                    </Chip>
                    <Chip variant="elevated" size="md">
                        <ChipTrigger bind:pressed={sunkenPressed}>
                            <ChipLabel>Active</ChipLabel>
                        </ChipTrigger>
                    </Chip>
                    <Chip variant="elevated" size="md">
                        <ChipLabel>v2.4</ChipLabel>
                        <ChipRemove aria-label="Remove v2.4" />
                    </Chip>
                </SunkenWell>
            </div>

            <div class="bg-elevated shadow-elevated flex flex-col gap-2.5 rounded-2xl border border-base-soft p-4 squircle-soft">
                <span class="text-xs font-medium text-weak">Elevated card (soft & accent)</span>
                <div class="flex flex-wrap items-center gap-2">
                    <Chip variant="soft" size="md">
                        <ChipLabel>Frontend</ChipLabel>
                    </Chip>
                    <Chip variant="soft" size="md">
                        <ChipTrigger bind:pressed={cardPressed}>
                            <ChipLabel>Selected</ChipLabel>
                        </ChipTrigger>
                    </Chip>
                    <Chip variant="accent" size="md">
                        <ChipLabel>Priority</ChipLabel>
                        <ChipRemove aria-label="Remove Priority" />
                    </Chip>
                </div>
            </div>

            <div class="flex flex-col gap-2.5 rounded-2xl border border-base-soft p-4 squircle-soft">
                <span class="text-xs font-medium text-weak">Soft input well (host-overridden)</span>
                <div
                    class="chip-soft-well bg-base-soft flex min-h-36px flex-wrap items-center gap-1.5 rounded-xl px-2 py-1 squircle-soft"
                >
                    {#each wellRecipients as recipient (recipient.id)}
                        <Chip variant="soft" size="md" invalid={recipient.invalid}>
                            <ChipLabel>{recipient.email}</ChipLabel>
                            <ChipRemove
                                aria-label="Remove {recipient.email}"
                                onclick={() => removeWellRecipient(recipient.id)}
                            />
                        </Chip>
                    {/each}
                    <input
                        type="text"
                        bind:value={wellDraft}
                        onkeydown={handleWellKeydown}
                        placeholder="Add email + Enter..."
                        aria-label="Add recipient email"
                        class="min-w-28 flex-1 bg-transparent px-1 text-sm text-main outline-none placeholder:text-weaker"
                    />
                </div>
            </div>
        </div>
    </PreviewSection>
</div>

<style>
    .chip-soft-well {
        --cs-chip-bg: light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 14%, transparent));
        --cs-chip-bg-hover: light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 19%, transparent));
        --cs-chip-shadow: light-dark(var(--cs-shadow-xs), inset 0 1px 0 0 rgb(255 255 255 / 0.08));
    }
</style>
