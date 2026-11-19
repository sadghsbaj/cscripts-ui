<script module>
    export const id = "ref-09-email-client";
    export const label = "09 - Email Client";
    export const layout = "stage";
</script>

<script lang="ts">
    import { Toaster } from "cs/svelte/toast";
    import EmailClient from "./EmailClient.svelte";
</script>

<div class="h-full w-full">
    <EmailClient />
    <Toaster placement="bottom-right" />
</div>
