<script module>
    export const id = "ref-01-login-form";
    export const label = "01 - Login Form";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import LoginForm from "./LoginForm.svelte";

    type PreviewMode = "normal" | "error" | "submitting";

    let mode = $state<PreviewMode>("normal");
    let email = $state("alex@acme.dev");
    let password = $state("");
    let rememberMe = $state(true);

    const emailError = $derived(mode === "error" ? "Enter a valid work email" : undefined);
    const passwordError = $derived(mode === "error" ? "Incorrect password" : undefined);
    const submitting = $derived(mode === "submitting");
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-6">
    <LoginForm
        bind:email
        bind:password
        bind:rememberMe
        {emailError}
        {passwordError}
        {submitting}
    />

    <SegmentedControl size="sm" bind:value={mode} aria-label="Login form state">
        <SegmentedControlItem value="normal">
            <SegmentedControlLabel>Normal</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="error">
            <SegmentedControlLabel>Error</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="submitting">
            <SegmentedControlLabel>Submitting</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
