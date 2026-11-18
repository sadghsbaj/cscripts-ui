<script lang="ts">
    import type { MouseEventHandler } from "svelte/elements";
    import { Tag } from "@lucide/svelte";

    import {
        Chip,
        ChipGroup,
        ChipIcon,
        ChipLabel,
        ChipRemove,
        ChipTrigger,
        type ChipSize,
        type ChipVariant,
    } from "./index.ts";

    export interface ChipHostItem {
        id: string;
        label: string;
        value?: string;
        href?: string;
        as?: "button" | "a";
        variant?: ChipVariant;
        size?: ChipSize;
        disabled?: boolean;
        triggerDisabled?: boolean;
        removeDisabled?: boolean;
        invalid?: boolean;
        iconOnly?: boolean;
        showIcon?: boolean;
        showTrigger?: boolean;
        showRemove?: boolean;
        pressed?: boolean;
        onclick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
        onRemoveClick?: MouseEventHandler<HTMLButtonElement>;
        chipAttrs?: Record<string, unknown>;
        triggerAttrs?: Record<string, unknown>;
        removeAttrs?: Record<string, unknown>;
        labelAttrs?: Record<string, unknown>;
    }

    type HostMode =
        | "single"
        | "group"
        | "uncontrolled-group"
        | "nested-remove-in-trigger"
        | "strict-trigger"
        | "strict-group";

    interface Props {
        mode?: HostMode;
        variant?: ChipVariant;
        size?: ChipSize;
        disabled?: boolean;
        invalid?: boolean;
        iconOnly?: boolean;
        showIcon?: boolean;
        strokeWidth?: number | string;
        showTrigger?: boolean;
        showRemove?: boolean;
        triggerKind?: "toggle" | "action" | "link" | "value";
        triggerHref?: string;
        triggerAs?: "button" | "a";
        triggerValue?: string;
        triggerDisabled?: boolean;
        removeDisabled?: boolean;
        customRemoveText?: string;
        labelText?: string;
        pressed?: boolean;
        onPressedChange?: (pressed: boolean) => void;
        onTriggerClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
        onRemoveClick?: MouseEventHandler<HTMLButtonElement>;

        groupVariant?: ChipVariant;
        groupSize?: ChipSize;
        groupDisabled?: boolean;
        groupWrap?: boolean;
        multiple?: boolean;
        groupValue?: string | string[];
        onGroupValueChange?: ((value: string | undefined) => void) | ((value: string[]) => void);
        items?: ChipHostItem[];

        strictPressed?: boolean;
        strictGroupValue?: string | undefined;

        groupRef?: HTMLDivElement | null;
        chipRef?: HTMLSpanElement | null;
        triggerRef?: HTMLButtonElement | HTMLAnchorElement | null;
        labelRef?: HTMLSpanElement | null;
        removeRef?: HTMLButtonElement | null;

        groupAttrs?: Record<string, unknown>;
        chipAttrs?: Record<string, unknown>;
        triggerAttrs?: Record<string, unknown>;
        labelAttrs?: Record<string, unknown>;
        removeAttrs?: Record<string, unknown>;
        iconAttrs?: Record<string, unknown>;
    }

    let {
        mode = "single",
        variant,
        size,
        disabled = false,
        invalid = false,
        iconOnly = false,
        showIcon = false,
        strokeWidth,
        showTrigger = false,
        showRemove = false,
        triggerKind = "action",
        triggerHref = "/tags/svelte",
        triggerAs,
        triggerValue = "item",
        triggerDisabled = false,
        removeDisabled = false,
        customRemoveText,
        labelText = "Chip",
        pressed = $bindable(false),
        onPressedChange,
        onTriggerClick,
        onRemoveClick,

        groupVariant,
        groupSize,
        groupDisabled = false,
        groupWrap = true,
        multiple = false,
        groupValue = $bindable(),
        onGroupValueChange,
        items = [],

        strictPressed = false,
        strictGroupValue,

        groupRef = $bindable(null),
        chipRef = $bindable(null),
        triggerRef = $bindable(null),
        labelRef = $bindable(null),
        removeRef = $bindable(null),

        groupAttrs = {},
        chipAttrs = {},
        triggerAttrs = {},
        labelAttrs = {},
        removeAttrs = {},
        iconAttrs = {},
    }: Props = $props();
</script>

{#snippet chipContent()}
    {#if showIcon}
        <ChipIcon icon={Tag} {strokeWidth} {...iconAttrs} />
    {/if}
    {#if !iconOnly}
        <ChipLabel bind:ref={labelRef} {...labelAttrs}>{labelText}</ChipLabel>
    {/if}
{/snippet}

{#snippet removeButton()}
    {#if customRemoveText}
        <ChipRemove bind:ref={removeRef} disabled={removeDisabled} onclick={onRemoveClick} {...removeAttrs}>
            {customRemoveText}
        </ChipRemove>
    {:else}
        <ChipRemove bind:ref={removeRef} disabled={removeDisabled} onclick={onRemoveClick} {...removeAttrs} />
    {/if}
{/snippet}

{#snippet groupItemList()}
    {#each items as item (item.id)}
        <Chip
            variant={item.variant}
            size={item.size}
            disabled={item.disabled}
            invalid={item.invalid}
            iconOnly={item.iconOnly}
            data-item-id={item.id}
            {...item.chipAttrs}
        >
            {#if item.showTrigger !== false}
                {#if item.href !== undefined || item.as === "a"}
                    <ChipTrigger
                        as="a"
                        href={item.href ?? "/tags/default"}
                        disabled={item.triggerDisabled}
                        onclick={item.onclick}
                        {...item.triggerAttrs}
                    >
                        {#if item.showIcon}
                            <ChipIcon icon={Tag} />
                        {/if}
                        {#if !item.iconOnly}
                            <ChipLabel {...item.labelAttrs}>{item.label}</ChipLabel>
                        {/if}
                    </ChipTrigger>
                {:else if item.value !== undefined}
                    <ChipTrigger
                        value={item.value}
                        disabled={item.triggerDisabled}
                        onclick={item.onclick}
                        {...item.triggerAttrs}
                    >
                        {#if item.showIcon}
                            <ChipIcon icon={Tag} />
                        {/if}
                        {#if !item.iconOnly}
                            <ChipLabel {...item.labelAttrs}>{item.label}</ChipLabel>
                        {/if}
                    </ChipTrigger>
                {:else}
                    <ChipTrigger disabled={item.triggerDisabled} onclick={item.onclick} {...item.triggerAttrs}>
                        {#if item.showIcon}
                            <ChipIcon icon={Tag} />
                        {/if}
                        {#if !item.iconOnly}
                            <ChipLabel {...item.labelAttrs}>{item.label}</ChipLabel>
                        {/if}
                    </ChipTrigger>
                {/if}
            {:else}
                {#if item.showIcon}
                    <ChipIcon icon={Tag} />
                {/if}
                {#if !item.iconOnly}
                    <ChipLabel {...item.labelAttrs}>{item.label}</ChipLabel>
                {/if}
            {/if}

            {#if item.showRemove}
                <ChipRemove disabled={item.removeDisabled} onclick={item.onRemoveClick} {...item.removeAttrs} />
            {/if}
        </Chip>
    {/each}
{/snippet}

{#if mode === "nested-remove-in-trigger"}
    <Chip variant="soft" size="md">
        <ChipTrigger>
            <ChipLabel>Invalid nesting</ChipLabel>
            <ChipRemove />
        </ChipTrigger>
    </Chip>
{:else if mode === "strict-trigger"}
    <Chip variant="soft" size="md" bind:ref={chipRef}>
        <ChipTrigger
            bind:ref={triggerRef}
            bind:pressed={() => strictPressed, () => {}}
            {onPressedChange}
            onclick={onTriggerClick}
        >
            <ChipLabel>{labelText}</ChipLabel>
        </ChipTrigger>
    </Chip>
{:else if mode === "strict-group"}
    <ChipGroup
        bind:ref={groupRef}
        variant={groupVariant ?? "soft"}
        size={groupSize ?? "md"}
        disabled={groupDisabled}
        wrap={groupWrap}
        bind:value={() => strictGroupValue, () => {}}
        onValueChange={onGroupValueChange as ((value: string | undefined) => void) | undefined}
        {...groupAttrs}
    >
        {@render groupItemList()}
    </ChipGroup>
{:else if mode === "uncontrolled-group"}
    {#if multiple}
        <ChipGroup
            bind:ref={groupRef}
            variant={groupVariant ?? "soft"}
            size={groupSize ?? "md"}
            disabled={groupDisabled}
            wrap={groupWrap}
            multiple={true}
            onValueChange={onGroupValueChange as ((value: string[]) => void) | undefined}
            {...groupAttrs}
        >
            {@render groupItemList()}
        </ChipGroup>
    {:else}
        <ChipGroup
            bind:ref={groupRef}
            variant={groupVariant ?? "soft"}
            size={groupSize ?? "md"}
            disabled={groupDisabled}
            wrap={groupWrap}
            onValueChange={onGroupValueChange as ((value: string | undefined) => void) | undefined}
            {...groupAttrs}
        >
            {@render groupItemList()}
        </ChipGroup>
    {/if}
{:else if mode === "group"}
    {#if multiple}
        <ChipGroup
            bind:ref={groupRef}
            variant={groupVariant}
            size={groupSize}
            disabled={groupDisabled}
            wrap={groupWrap}
            multiple={true}
            bind:value={() => groupValue as string[] | undefined, (next) => (groupValue = next)}
            onValueChange={onGroupValueChange as ((value: string[]) => void) | undefined}
            {...groupAttrs}
        >
            {@render groupItemList()}
        </ChipGroup>
    {:else}
        <ChipGroup
            bind:ref={groupRef}
            variant={groupVariant}
            size={groupSize}
            disabled={groupDisabled}
            wrap={groupWrap}
            bind:value={() => groupValue as string | undefined, (next) => (groupValue = next)}
            onValueChange={onGroupValueChange as ((value: string | undefined) => void) | undefined}
            {...groupAttrs}
        >
            {@render groupItemList()}
        </ChipGroup>
    {/if}
{:else}
    <Chip bind:ref={chipRef} {variant} {size} {disabled} {invalid} {iconOnly} {...chipAttrs}>
        {#if showTrigger}
            {#if triggerKind === "link"}
                <ChipTrigger
                    bind:ref={triggerRef}
                    as={triggerAs === "a" ? "a" : undefined}
                    href={triggerHref}
                    disabled={triggerDisabled}
                    onclick={onTriggerClick}
                    {...triggerAttrs}
                >
                    {@render chipContent()}
                </ChipTrigger>
            {:else if triggerKind === "value"}
                <ChipTrigger
                    bind:ref={triggerRef}
                    value={triggerValue}
                    disabled={triggerDisabled}
                    onclick={onTriggerClick}
                    {...triggerAttrs}
                >
                    {@render chipContent()}
                </ChipTrigger>
            {:else if triggerKind === "toggle"}
                <ChipTrigger
                    bind:ref={triggerRef}
                    bind:pressed
                    {onPressedChange}
                    disabled={triggerDisabled}
                    onclick={onTriggerClick}
                    {...triggerAttrs}
                >
                    {@render chipContent()}
                </ChipTrigger>
            {:else}
                <ChipTrigger
                    bind:ref={triggerRef}
                    disabled={triggerDisabled}
                    onclick={onTriggerClick}
                    {...triggerAttrs}
                >
                    {@render chipContent()}
                </ChipTrigger>
            {/if}
        {:else}
            {@render chipContent()}
        {/if}

        {#if showRemove}
            {@render removeButton()}
        {/if}
    </Chip>
{/if}
