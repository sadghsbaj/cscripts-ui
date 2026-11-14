<script lang="ts">
    import LabView from "./lab/LabView.svelte";
    import PreviewView from "./PreviewView.svelte";

    const isLab = typeof window !== "undefined" && window.location.pathname.startsWith("/lab");
</script>

{#if isLab}
    <LabView />
{:else}
    <PreviewView />
{/if}
