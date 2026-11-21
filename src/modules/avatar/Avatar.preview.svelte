<script module>
    export const id = "avatar";
    export const label = "Avatar";
</script>

<script lang="ts">
    import { Sparkles } from "@lucide/svelte";
    import {
        AVATAR_COLORS,
        AVATAR_PATTERNS,
        AVATAR_SIZES,
        AVATAR_STATUSES,
        AVATAR_VARIANTS,
        Avatar,
        AvatarGroup,
    } from "cs/svelte/avatar";
    import { tooltip } from "cs/svelte/tooltip";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    const closeScript = ["</", "script>"].join("");

    const identityNames = [
        "Ada Lovelace",
        "Marcus Chen",
        "Elena Rostova",
        "Noah Lindqvist",
        "Sora Takahashi",
        "Maya Patel",
    ];

    const explicitColors = AVATAR_COLORS.filter((c) => c !== "auto");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Avatar } from "cs/svelte/avatar";
${closeScript}

<Avatar variant="soft" size="md" name="Ada Lovelace" />
<Avatar variant="solid" size="md" name="Marcus Chen" status="online" />
<Avatar variant="soft" size="md" name="Elena Rostova" color="accent" />
<Avatar variant="soft" size="md" aria-label="Workspace bot">
    <Sparkles size={16} />
</Avatar>`;

    const variantsSizesCode = `{#each AVATAR_VARIANTS as variant (variant)}
    {#each AVATAR_SIZES as size (size)}
        <Avatar {variant} {size} name="Ada Lovelace" />
    {/each}
{/each}`;

    const identityCode = `<!-- Deterministic auto hue + micro-pattern from name -->
<Avatar variant="soft" size="lg" name="Ada Lovelace" />
<Avatar variant="soft" size="lg" name="Marcus Chen" />
<Avatar variant="soft" size="lg" name="Elena Rostova" />

<!-- Explicit semantic colors -->
<Avatar variant="solid" size="md" name="Alex Rivera" color="base" />
<Avatar variant="solid" size="md" name="Alex Rivera" color="accent" />
<Avatar variant="solid" size="md" name="Alex Rivera" color="positive" />
<Avatar variant="solid" size="md" name="Alex Rivera" color="caution" />
<Avatar variant="solid" size="md" name="Alex Rivera" color="negative" />`;

    const patternsCode = `<Avatar variant="soft" size="lg" name="Sora Takahashi" color="accent" pattern="diagonal" />
<Avatar variant="soft" size="lg" name="Sora Takahashi" color="accent" pattern="none" />
<Avatar variant="solid" size="lg" name="Sora Takahashi" color="accent" pattern="diagonal" />
<Avatar variant="solid" size="lg" name="Sora Takahashi" color="accent" pattern="none" />`;

    const statusCode = `<Avatar variant="soft" size="lg" name="Ada Lovelace" status="online" />
<Avatar variant="soft" size="lg" name="Marcus Chen" status="busy" />
<Avatar variant="soft" size="lg" name="Elena Rostova" status="away" />
<Avatar variant="soft" size="lg" name="Noah Lindqvist" status="offline" />`;

    const interactiveCode = `<Avatar variant="soft" size="md" name="Ada Lovelace" onclick={() => {}} />
<Avatar variant="solid" size="md" name="Marcus Chen" onclick={() => {}} />
<Avatar variant="soft" size="md" name="Elena Rostova" href="#profile" />
<Avatar variant="solid" size="md" name="Noah Lindqvist" onclick={() => {}} disabled />`;

    const groupCode = `<!-- Overlapping stack with +N overflow -->
<AvatarGroup variant="soft" size="md" max={4}>
    <Avatar name="Ada Lovelace" />
    <Avatar name="Marcus Chen" />
    <Avatar name="Elena Rostova" />
    <Avatar name="Noah Lindqvist" />
    <Avatar name="Sora Takahashi" />
    <Avatar name="Maya Patel" />
    <Avatar name="Liam O'Connor" />
</AvatarGroup>

<!-- Spaced row -->
<AvatarGroup variant="solid" size="md" overlap={false}>
    <Avatar name="Ada Lovelace" status="online" />
    <Avatar name="Marcus Chen" status="busy" />
    <Avatar name="Elena Rostova" status="away" />
</AvatarGroup>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Avatar"
        description="Typographic and geometric identity stamp with deterministic OKLCH color and initials."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Avatar variant="soft" size="md" name="Ada Lovelace" />
        <Avatar variant="solid" size="md" name="Marcus Chen" status="online" />
        <Avatar variant="soft" size="md" name="Elena Rostova" color="accent" />
        <Avatar variant="soft" size="md" aria-label="Workspace bot">
            <Sparkles size={16} />
        </Avatar>
    </PreviewSection>

    <PreviewSection
        title="Variants & Sizes"
        description="Soft and solid surface treatments across xs (20px) to xl (56px)."
        code={variantsSizesCode}
    >
        <div class="flex flex-col gap-5">
            {#each AVATAR_VARIANTS as variant (variant)}
                <div class="flex flex-wrap items-end gap-5">
                    <span class="w-10 self-center text-xs text-weak">{variant}</span>
                    {#each AVATAR_SIZES as size (size)}
                        <div class="flex flex-col items-center gap-1.5">
                            <Avatar {variant} {size} name="Ada Lovelace" />
                            <span class="text-xs text-weak">{size}</span>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Identity & Colors"
        description="Deterministic OKLCH hue seeded from name, alongside explicit semantic palettes."
        code={identityCode}
    >
        <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-center gap-3">
                <span class="w-12 text-xs text-weak">auto</span>
                {#each identityNames as name (name)}
                    <Avatar variant="soft" size="lg" {name} {@attach tooltip({ text: name })} />
                {/each}
            </div>

            {#each AVATAR_VARIANTS as variant (variant)}
                <div class="flex flex-wrap items-center gap-3">
                    <span class="w-12 text-xs text-weak">{variant}</span>
                    {#each explicitColors as color (color)}
                        <Avatar
                            {variant}
                            size="md"
                            name="Alex Rivera"
                            {color}
                            {@attach tooltip({ text: color })}
                        />
                    {/each}
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Patterns"
        description="Diagonal stripe texture or flat surface across soft and solid variants."
        code={patternsCode}
    >
        <div class="flex flex-col gap-5">
            {#each AVATAR_VARIANTS as variant (variant)}
                <div class="flex flex-wrap items-center gap-5">
                    <span class="w-10 text-xs text-weak">{variant}</span>
                    {#each AVATAR_PATTERNS as pattern (pattern)}
                        <div class="flex flex-col items-center gap-1.5">
                            <Avatar {variant} size="lg" name="Sora Takahashi" color="accent" {pattern} />
                            <span class="text-xs text-weak">{pattern}</span>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Status"
        description="Presence indicator dot with a cutout ring at the bottom-end corner."
        code={statusCode}
    >
        <div class="flex flex-wrap items-center gap-5">
            {#each AVATAR_STATUSES as status, i (status)}
                <div class="flex flex-col items-center gap-1.5">
                    <Avatar variant="soft" size="lg" name={identityNames[i]} {status} />
                    <span class="text-xs text-weak">{status}</span>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Interactive"
        description="Renders as a button with onclick, an anchor with href, or a disabled control."
        code={interactiveCode}
    >
        <Avatar
            variant="soft"
            size="md"
            name="Ada Lovelace"
            onclick={() => {}}
            {@attach tooltip({ text: "Open profile" })}
        />
        <Avatar
            variant="solid"
            size="md"
            name="Marcus Chen"
            onclick={() => {}}
            {@attach tooltip({ text: "Select member" })}
        />
        <Avatar
            variant="soft"
            size="md"
            name="Elena Rostova"
            href="#avatar-profile"
            {@attach tooltip({ text: "View account" })}
        />
        <Avatar variant="solid" size="md" name="Noah Lindqvist" onclick={() => {}} disabled />
        <Avatar variant="soft" size="md" name="Sora Takahashi" href="#avatar-profile" disabled />
    </PreviewSection>

    <PreviewSection
        title="Avatar Group"
        description="Overlapping stacks with +N overflow truncation and spaced rows."
        code={groupCode}
    >
        <div class="flex flex-wrap items-center gap-8">
            <AvatarGroup variant="soft" size="md" max={4}>
                {#each identityNames as name (name)}
                    <Avatar {name} />
                {/each}
                <Avatar name="Liam O'Connor" />
            </AvatarGroup>

            <AvatarGroup variant="solid" size="md" overlap={false}>
                <Avatar name="Ada Lovelace" status="online" />
                <Avatar name="Marcus Chen" status="busy" />
                <Avatar name="Elena Rostova" status="away" />
            </AvatarGroup>
        </div>
    </PreviewSection>
</div>
