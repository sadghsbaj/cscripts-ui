<script lang="ts">
    import { ChevronDown, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "cs/svelte/card";
    import { Checkbox } from "cs/svelte/checkbox";
    import { HitArea } from "cs/svelte/hit-area";
    import { TextInput, TextInputAction, TextInputField, TextInputIcon } from "cs/svelte/text-input";

    export interface LoginFormData {
        email: string;
        password: string;
        rememberMe: boolean;
    }

    export interface LoginFormProps {
        email?: string;
        password?: string;
        rememberMe?: boolean;
        emailError?: string;
        passwordError?: string;
        submitting?: boolean;
        onsubmit?: (data: LoginFormData) => void | Promise<void>;
        onforgot?: () => void;
        onaltmethod?: (method: "passkey" | "sso") => void;
        class?: string;
    }

    let {
        email = $bindable(""),
        password = $bindable(""),
        rememberMe = $bindable(false),
        emailError,
        passwordError,
        submitting = false,
        onsubmit,
        onforgot,
        onaltmethod,
        class: className,
    }: LoginFormProps = $props();

    const formId = $props.id();
    const emailId = `${formId}-email`;
    const emailErrorId = `${formId}-email-error`;
    const passwordId = `${formId}-password`;
    const passwordErrorId = `${formId}-password-error`;
    const altPanelId = `${formId}-alt-methods`;

    let showPassword = $state(false);
    let altOpen = $state(false);
    let internalSubmitting = $state(false);

    const isSubmitting = $derived(Boolean(submitting || internalSubmitting));

    async function handleSubmit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        if (isSubmitting || !onsubmit) return;

        internalSubmitting = true;
        try {
            await onsubmit({ email, password, rememberMe });
        } finally {
            internalSubmitting = false;
        }
    }
</script>

<Card variant="elevated" size="lg" class={["w-full max-w-[var(--cs-container-sm)]", className]}>
    <CardHeader>
        <CardTitle as="h2" class="title-xl">Sign in</CardTitle>
        <CardDescription class="subtitle-md">Enter your credentials to access your workspace.</CardDescription>
    </CardHeader>

    <CardBody>
        <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
            <div class="flex flex-col gap-1.5">
                <label for={emailId} class="label-sm">Email</label>
                <TextInput variant="soft" size="lg" invalid={Boolean(emailError)} disabled={isSubmitting}>
                    <TextInputIcon icon={Mail} />
                    <TextInputField
                        id={emailId}
                        type="email"
                        autocomplete="email"
                        placeholder="you@company.com"
                        bind:value={email}
                        aria-describedby={emailError ? emailErrorId : undefined}
                    />
                </TextInput>
                {#if emailError}
                    <p id={emailErrorId} class="m-0 text-xs font-500 text-[var(--cs-color-negative-soft-fg)]">
                        {emailError}
                    </p>
                {/if}
            </div>

            <div class="flex flex-col gap-1.5">
                <label for={passwordId} class="label-sm">Password</label>
                <TextInput variant="soft" size="lg" invalid={Boolean(passwordError)} disabled={isSubmitting}>
                    <TextInputIcon icon={Lock} />
                    <TextInputField
                        id={passwordId}
                        type={showPassword ? "text" : "password"}
                        autocomplete="current-password"
                        placeholder="Password"
                        bind:value={password}
                        aria-describedby={passwordError ? passwordErrorId : undefined}
                    />
                    <TextInputAction
                        icon={showPassword ? EyeOff : Eye}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        visible={password.length > 0 || showPassword}
                        onclick={() => (showPassword = !showPassword)}
                    />
                </TextInput>
                {#if passwordError}
                    <p id={passwordErrorId} class="m-0 text-xs font-500 text-[var(--cs-color-negative-soft-fg)]">
                        {passwordError}
                    </p>
                {/if}
            </div>

            <div class="flex items-center justify-between gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-main select-none">
                    <Checkbox variant="soft" size="sm" bind:checked={rememberMe} disabled={isSubmitting} />
                    <span class="text-trim">Remember me</span>
                </label>

                <button
                    type="button"
                    class="inline-flex items-center text-sm font-500 text-weak enabled:hover:text-strong bg-transparent border-0 p-0 cursor-default transition-colors duration-[var(--cs-dur-effect-fast)] ease-[var(--cs-ease-effect)] disabled:text-[var(--cs-color-disabled-fg)]"
                    disabled={isSubmitting}
                    onclick={() => onforgot?.()}
                >
                    <HitArea size="md" />
                    <span class="text-trim">Forgot?</span>
                </button>
            </div>

            <Button
                variant="primary"
                size="lg"
                type="submit"
                class="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
            >
                <ButtonLabel>{isSubmitting ? "Signing in..." : "Sign in"}</ButtonLabel>
            </Button>

            <div class="flex flex-col items-center">
                <Button
                    variant="ghost"
                    size="sm"
                    aria-expanded={altOpen}
                    aria-controls={altPanelId}
                    disabled={isSubmitting}
                    onclick={() => (altOpen = !altOpen)}
                >
                    <ButtonLabel>Other ways</ButtonLabel>
                    <ButtonIcon icon={ChevronDown} class={["cs-login-disclosure-icon", altOpen && "is-open"]} />
                </Button>

                <div id={altPanelId} class={["cs-login-disclosure w-full", altOpen && "is-open"]} inert={!altOpen}>
                    <div class="cs-login-disclosure-inner">
                        <div class="flex flex-col gap-2 pt-3 pb-1">
                            <Button
                                variant="tertiary"
                                size="md"
                                class="w-full"
                                disabled={isSubmitting}
                                onclick={() => onaltmethod?.("passkey")}
                            >
                                <ButtonIcon icon={KeyRound} />
                                <ButtonLabel>Continue with Passkey</ButtonLabel>
                            </Button>

                            <Button
                                variant="tertiary"
                                size="md"
                                class="w-full"
                                disabled={isSubmitting}
                                onclick={() => onaltmethod?.("sso")}
                            >
                                <ButtonIcon icon={ShieldCheck} />
                                <ButtonLabel>Continue with SSO</ButtonLabel>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </CardBody>
</Card>

<style>
    .cs-login-disclosure {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
            grid-template-rows var(--cs-dur-exit-sm) var(--cs-ease-exit),
            opacity var(--cs-dur-exit-sm) var(--cs-ease-exit);
    }

    .cs-login-disclosure.is-open {
        grid-template-rows: 1fr;
        opacity: 1;
        transition:
            grid-template-rows var(--cs-dur-enter-sm) var(--cs-ease-enter),
            opacity var(--cs-dur-enter-sm) var(--cs-ease-enter);
    }

    .cs-login-disclosure-inner {
        overflow-x: visible;
        overflow-y: clip;
        min-height: 0;
    }

    /* ButtonIcon renders inside the child Button component, so scope opt-out is required. */
    :global(.cs-login-disclosure-icon) {
        transition: transform var(--cs-dur-exit-sm) var(--cs-ease-exit);
    }

    :global(.cs-login-disclosure-icon.is-open) {
        transform: rotate(180deg);
        transition: transform var(--cs-dur-enter-sm) var(--cs-ease-enter);
    }
</style>
