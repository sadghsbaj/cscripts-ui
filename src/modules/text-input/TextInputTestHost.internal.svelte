<script lang="ts">
    import { ChevronLeft, X } from "@lucide/svelte";

    import TextInput from "./TextInput.svelte";
    import TextInputAction from "./TextInputAction.svelte";
    import TextInputField from "./TextInputField.svelte";
    import TextInputIcon from "./TextInputIcon.svelte";
    import type { TextInputSize, TextInputVariant } from "./index.ts";

    interface Props {
        variant?: TextInputVariant;
        size?: TextInputSize;
        invalid?: boolean;
        disabled?: boolean;
        readonly?: boolean;
        shellRef?: HTMLDivElement | null;
        shellProps?: Record<string, unknown>;
        value?: string;
        onValueChange?: (value: string) => void;
        fieldRef?: HTMLInputElement | null;
        fieldDisabled?: boolean;
        fieldReadonly?: boolean;
        fieldInvalid?: boolean;
        fieldProps?: Record<string, unknown>;
        showField?: boolean;
        showIcon?: boolean;
        iconProps?: Record<string, unknown>;
        showAction?: boolean;
        actionRef?: HTMLButtonElement | null;
        actionVisible?: boolean;
        actionDisabled?: boolean;
        actionUseIcon?: boolean;
        actionLabel?: string;
        actionProps?: Record<string, unknown>;
        labelText?: string;
    }

    let {
        variant = "soft",
        size = "md",
        invalid,
        disabled,
        readonly,
        shellRef = $bindable(null),
        shellProps = {},
        value = $bindable(""),
        onValueChange,
        fieldRef = $bindable(null),
        fieldDisabled,
        fieldReadonly,
        fieldInvalid,
        fieldProps = {},
        showField = true,
        showIcon = false,
        iconProps = {},
        showAction = false,
        actionRef = $bindable(null),
        actionVisible = true,
        actionDisabled,
        actionUseIcon = true,
        actionLabel,
        actionProps = {},
        labelText,
    }: Props = $props();
</script>

{#if labelText && typeof fieldProps.id === "string"}
    <label for={fieldProps.id}>{labelText}</label>
{/if}

<TextInput bind:ref={shellRef} {variant} {size} {invalid} {disabled} {readonly} {...shellProps}>
    {#if showIcon}
        <TextInputIcon icon={ChevronLeft} {...iconProps} />
    {/if}

    {#if showField}
        <TextInputField
            bind:ref={fieldRef}
            bind:value
            {onValueChange}
            disabled={fieldDisabled}
            readonly={fieldReadonly}
            invalid={fieldInvalid}
            {...fieldProps}
        />
    {/if}

    {#if showAction}
        <TextInputAction
            bind:ref={actionRef}
            icon={actionUseIcon ? X : undefined}
            visible={actionVisible}
            disabled={actionDisabled}
            {...actionProps}
        >
            {#if !actionUseIcon && actionLabel}
                <span>{actionLabel}</span>
            {/if}
        </TextInputAction>
    {/if}
</TextInput>
