<script lang="ts">
    import type { ClassValue, MouseEventHandler } from "svelte/elements";

    import Avatar from "./Avatar.svelte";
    import AvatarGroup from "./AvatarGroup.svelte";
    import type {
        AvatarColor,
        AvatarPattern,
        AvatarRef,
        AvatarSize,
        AvatarStatus,
        AvatarVariant,
    } from "./index.ts";

    export type TestAvatarItemConfig = {
        id: string;
        variant?: AvatarVariant;
        size?: AvatarSize;
        name?: string;
        initials?: string;
        seed?: string;
        color?: AvatarColor;
        pattern?: AvatarPattern;
        status?: AvatarStatus;
        disabled?: boolean;
        href?: string;
        onclick?: MouseEventHandler<HTMLButtonElement> | MouseEventHandler<HTMLAnchorElement>;
        customText?: string;
    };

    interface Props {
        mode?: "snippet" | "group";
        variant?: AvatarVariant;
        size?: AvatarSize;
        name?: string;
        status?: AvatarStatus;
        customText?: string;
        onAvatarRef?: (el: AvatarRef | null) => void;
        onGroupRef?: (el: HTMLDivElement | null) => void;
        groupRef?: HTMLDivElement | null;
        max?: number;
        overlap?: boolean;
        disabled?: boolean;
        groupClass?: ClassValue;
        items?: TestAvatarItemConfig[];
    }

    let {
        mode = "group",
        variant = "soft",
        size = "md",
        name,
        status,
        customText = "CUSTOM",
        onAvatarRef,
        onGroupRef,
        groupRef = $bindable(null),
        max,
        overlap = true,
        disabled = false,
        groupClass,
        items = [],
    }: Props = $props();

    let avatarRef = $state<AvatarRef | null>(null);

    $effect(() => {
        onAvatarRef?.(avatarRef);
    });

    $effect(() => {
        onGroupRef?.(groupRef);
    });
</script>

{#if mode === "snippet"}
    <Avatar bind:ref={avatarRef} {variant} {size} {name} {status}>
        <span data-testid="custom-child">{customText}</span>
    </Avatar>
{:else}
    <AvatarGroup bind:ref={groupRef} {variant} {size} {max} {overlap} {disabled} class={groupClass}>
        {#each items as item (item.id)}
            {#if item.href !== undefined}
                <Avatar
                    variant={item.variant}
                    size={item.size}
                    name={item.name}
                    initials={item.initials}
                    seed={item.seed}
                    color={item.color}
                    pattern={item.pattern}
                    status={item.status}
                    disabled={item.disabled}
                    href={item.href}
                    onclick={item.onclick as MouseEventHandler<HTMLAnchorElement> | undefined}
                    data-item-id={item.id}
                >
                    {#if item.customText}
                        <span data-testid={`child-${item.id}`}>{item.customText}</span>
                    {/if}
                </Avatar>
            {:else if item.onclick !== undefined}
                <Avatar
                    variant={item.variant}
                    size={item.size}
                    name={item.name}
                    initials={item.initials}
                    seed={item.seed}
                    color={item.color}
                    pattern={item.pattern}
                    status={item.status}
                    disabled={item.disabled}
                    onclick={item.onclick as MouseEventHandler<HTMLButtonElement>}
                    data-item-id={item.id}
                >
                    {#if item.customText}
                        <span data-testid={`child-${item.id}`}>{item.customText}</span>
                    {/if}
                </Avatar>
            {:else}
                <Avatar
                    variant={item.variant}
                    size={item.size}
                    name={item.name}
                    initials={item.initials}
                    seed={item.seed}
                    color={item.color}
                    pattern={item.pattern}
                    status={item.status}
                    disabled={item.disabled}
                    data-item-id={item.id}
                >
                    {#if item.customText}
                        <span data-testid={`child-${item.id}`}>{item.customText}</span>
                    {/if}
                </Avatar>
            {/if}
        {/each}
    </AvatarGroup>
{/if}
