<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { getInternalCommandPaletteContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteInputProps } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        disabled = false,
        autocomplete = "off",
        spellcheck = false,
        class: className,
        oninput,
        onkeydown,
        ...rest
    }: CommandPaletteInputProps = $props();

    const palette = getInternalCommandPaletteContext();
    const resolvedId = $derived(id ?? palette.inputId);

    $effect(() => {
        return palette.registerInput(ref);
    });

    $effect(() => {
        return palette.registerInputId(id ?? undefined);
    });

    function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        oninput?.(event);
        if (event.defaultPrevented) return;
        palette.setInputValue(event.currentTarget.value);
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || disabled) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (event.metaKey || event.ctrlKey) {
                palette.highlightEdge("last");
            } else {
                palette.moveHighlight(1);
            }
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (event.metaKey || event.ctrlKey) {
                palette.highlightEdge("first");
            } else {
                palette.moveHighlight(-1);
            }
            return;
        }

        if (event.ctrlKey && !event.metaKey && !event.altKey) {
            const lower = event.key.toLowerCase();
            if (lower === "n") {
                event.preventDefault();
                palette.moveHighlight(1);
                return;
            }
            if (lower === "p") {
                event.preventDefault();
                palette.moveHighlight(-1);
                return;
            }
        }

        if (event.key === "PageDown") {
            event.preventDefault();
            palette.highlightEdge("last");
            return;
        }

        if (event.key === "PageUp") {
            event.preventDefault();
            palette.highlightEdge("first");
            return;
        }

        if (event.key === "Enter") {
            if (event.isComposing) return;
            palette.activateHighlighted(event);
            return;
        }

        if (event.key === "Backspace") {
            if (event.isComposing) return;
            if (
                palette.popPageOnBackspace &&
                palette.pages.length > 0 &&
                palette.inputValue === "" &&
                (event.currentTarget.selectionStart ?? 0) === 0 &&
                (event.currentTarget.selectionEnd ?? 0) === 0
            ) {
                event.preventDefault();
                palette.popPage();
            }
        }
    }
</script>

<input
    bind:this={ref}
    aria-label={rest["aria-label"] ??
        (rest["aria-labelledby"] ? undefined : t({ de: "Befehl suchen", en: "Search commands" }))}
    {...rest}
    id={resolvedId}
    type="text"
    role="combobox"
    aria-expanded={palette.hasListMounted ? "true" : "false"}
    aria-controls={palette.hasListMounted ? palette.listboxId : undefined}
    aria-autocomplete="list"
    aria-activedescendant={palette.highlightedItemId}
    {autocomplete}
    {spellcheck}
    {disabled}
    value={palette.inputValue}
    class={["cs-command-palette-input", className]}
    oninput={handleInput}
    onkeydown={handleKeyDown}
/>
