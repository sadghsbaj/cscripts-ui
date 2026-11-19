<script module>
    export const id = "ref-04-confirmation-dialog";
    export const label = "04 - Confirmation Dialog";
    export const layout = "stage";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import DeleteDialog from "./DeleteDialog.svelte";
    import DiscardDialog from "./DiscardDialog.svelte";

    let discardOpen = $state(false);
    let deleteOpen = $state(false);
</script>

<div class="min-h-full w-full flex-center bg-canvas p-8 gap-3">
    <Button variant="elevated" size="md" onclick={() => (discardOpen = true)}>
        <ButtonLabel>Discard changes</ButtonLabel>
    </Button>
    <Button variant="elevated" size="md" negative onclick={() => (deleteOpen = true)}>
        <ButtonLabel>Delete project</ButtonLabel>
    </Button>
</div>

<DiscardDialog bind:open={discardOpen} />
<DeleteDialog bind:open={deleteOpen} confirmText="acme" />
