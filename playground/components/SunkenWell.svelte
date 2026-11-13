<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        class?: string;
    }

    let { children, class: className = "" }: Props = $props();
</script>

<div class="bg-sunken shadow-sunken rounded-2xl squircle-soft px-4 py-2.5 inline-flex items-center gap-3 {className}">
    {@render children()}
</div>
