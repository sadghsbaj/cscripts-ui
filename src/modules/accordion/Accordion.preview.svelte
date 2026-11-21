<script module>
    export const id = "accordion";
    export const label = "Accordion";
</script>

<script lang="ts">
    import { Bell, CreditCard, Globe, KeyRound, ShieldCheck, Users } from "@lucide/svelte";
    import {
        Accordion,
        AccordionContent,
        AccordionHeader,
        AccordionItem,
        AccordionTrigger,
    } from "cs/svelte/accordion";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let flushValue = $state<string | undefined>("shipping");
    let elevatedValue = $state<string | undefined>("sso");
    let separatedValue = $state<string | undefined>("backup");

    let smValue = $state<string | undefined>("notifications");
    let mdValue = $state<string | undefined>("security");
    let lgValue = $state<string | undefined>("billing");

    let multipleValue = $state<string[]>(["overview", "limits"]);

    const usageRows = [
        { label: "Active seats", value: "14 of 20" },
        { label: "Artifact storage", value: "38.4 GB / 100 GB" },
        { label: "Monthly bandwidth", value: "412 GB / 1 TB" },
        { label: "API requests", value: "1.8M / 5M" },
    ];

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const variantsCode = `<Accordion variant="flush" size="md" collapsible bind:value>
    <AccordionItem value="shipping">
        <AccordionHeader>
            <AccordionTrigger>Shipping & delivery</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
            Orders ship within one business day with tracking sent by email.
        </AccordionContent>
    </AccordionItem>
</Accordion>

<Accordion variant="elevated" size="md" collapsible bind:value>
    ...
</Accordion>

<Accordion variant="separated" size="md" collapsible bind:value>
    ...
</Accordion>`;

    const sizesCode = `<Accordion variant="elevated" size="sm" collapsible bind:value>
    <AccordionItem value="notifications">
        <AccordionHeader>
            <AccordionTrigger subtitle="Email and push digests">
                {#snippet leading()}
                    <Bell size={16} />
                {/snippet}
                Notifications
            </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
            Choose when to receive activity summaries and mention alerts.
        </AccordionContent>
    </AccordionItem>
</Accordion>`;

    const multipleCode = `<Accordion variant="elevated" size="md" multiple bind:value>
    <AccordionItem value="overview">
        <AccordionHeader>
            <AccordionTrigger>Workspace plan</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
            Your team is on the Pro plan, billed annually with priority support included.
        </AccordionContent>
    </AccordionItem>

    <AccordionItem value="limits">
        <AccordionHeader>
            <AccordionTrigger>Current usage</AccordionTrigger>
        </AccordionHeader>
        <AccordionContent padded={false}>
            <dl class="divide-y divide-base-soft border-t border-base-soft">
                ...
            </dl>
        </AccordionContent>
    </AccordionItem>
</Accordion>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Accordion"
        description="Vertically stacked disclosure items with single or multiple expansion and keyboard navigation."
    />

    <PreviewSection
        title="Variants"
        description="Flush, elevated, and separated surface treatments."
        code={variantsCode}
    >
        <div class="flex w-full max-w-lg flex-col gap-6">
            <Accordion variant="flush" size="md" collapsible bind:value={flushValue}>
                <AccordionItem value="shipping">
                    <AccordionHeader>
                        <AccordionTrigger>Shipping & delivery</AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>
                        Orders ship within one business day from our regional fulfillment centers with live tracking
                        updates sent by email.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="returns">
                    <AccordionHeader>
                        <AccordionTrigger>Returns & exchanges</AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>
                        Unused items can be returned or exchanged within 30 days using the prepaid label included in
                        your account.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div class="rounded-2xl squircle-soft bg-sunken p-4 shadow-sunken">
                <Accordion variant="elevated" size="md" collapsible bind:value={elevatedValue}>
                    <AccordionItem value="sso">
                        <AccordionHeader>
                            <AccordionTrigger>Single sign-on</AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Connect Okta, Google Workspace, or any SAML 2.0 identity provider to manage member access.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="audit">
                        <AccordionHeader>
                            <AccordionTrigger>Audit logs</AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Sign-in events, role changes, and token creations are retained for 90 days by default.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            <div class="rounded-2xl squircle-soft bg-sunken p-4 shadow-sunken">
                <Accordion variant="separated" size="md" collapsible bind:value={separatedValue}>
                    <AccordionItem value="backup">
                        <AccordionHeader>
                            <AccordionTrigger>Automated backups</AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Encrypted snapshots run every six hours and can be restored to any point in the past week.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="webhooks">
                        <AccordionHeader>
                            <AccordionTrigger>Webhook retries</AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Failed deliveries are retried with exponential backoff for up to 24 hours before pausing.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes & Rich Trigger"
        description="Small, medium, and large proportions with leading icons and subtitles."
        code={sizesCode}
    >
        <div class="flex w-full max-w-lg flex-col gap-6">
            <div class="rounded-2xl squircle-soft bg-sunken p-4 shadow-sunken">
                <Accordion variant="elevated" size="sm" collapsible bind:value={smValue}>
                    <AccordionItem value="notifications">
                        <AccordionHeader>
                            <AccordionTrigger subtitle="Email and push digests">
                                {#snippet leading()}
                                    <Bell size={16} />
                                {/snippet}
                                Notifications
                            </AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Choose when to receive activity summaries and mention alerts across projects.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="region">
                        <AccordionHeader>
                            <AccordionTrigger subtitle="Primary data residency">
                                {#snippet leading()}
                                    <Globe size={16} />
                                {/snippet}
                                Region & locale
                            </AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Workspace data is hosted in Frankfurt (eu-central-1) with UTC+1 display formatting.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            <div class="rounded-2xl squircle-soft bg-sunken p-4 shadow-sunken">
                <Accordion variant="elevated" size="md" collapsible bind:value={mdValue}>
                    <AccordionItem value="security">
                        <AccordionHeader>
                            <AccordionTrigger subtitle="Two-factor authentication and passkeys">
                                {#snippet leading()}
                                    <ShieldCheck size={18} />
                                {/snippet}
                                Account security
                            </AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Require hardware keys or authenticator apps for all members with deployment permissions.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="tokens">
                        <AccordionHeader>
                            <AccordionTrigger subtitle="Scoped credentials for CI pipelines">
                                {#snippet leading()}
                                    <KeyRound size={18} />
                                {/snippet}
                                API tokens
                            </AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Create read-only or environment-scoped tokens with automatic expiration dates.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            <div class="rounded-2xl squircle-soft bg-sunken p-4 shadow-sunken">
                <Accordion variant="elevated" size="lg" collapsible bind:value={lgValue}>
                    <AccordionItem value="billing">
                        <AccordionHeader>
                            <AccordionTrigger subtitle="Visa ending in 4242 · Renews Nov 1">
                                {#snippet leading()}
                                    <CreditCard size={20} />
                                {/snippet}
                                Billing & invoices
                            </AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Invoices are emailed to your billing contact on the first of each month with PDF receipts.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="members">
                        <AccordionHeader>
                            <AccordionTrigger subtitle="14 active members · 2 pending invites">
                                {#snippet leading()}
                                    <Users size={20} />
                                {/snippet}
                                Team directory
                            </AccordionTrigger>
                        </AccordionHeader>
                        <AccordionContent>
                            Invite collaborators by email or sync groups automatically from your identity provider.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Multiple & Flush Content"
        description="Allow multiple open items and edge-to-edge unpadded content blocks."
        code={multipleCode}
    >
        <div class="w-full max-w-lg rounded-2xl squircle-soft bg-sunken p-4 shadow-sunken">
            <Accordion variant="elevated" size="md" multiple bind:value={multipleValue}>
                <AccordionItem value="overview">
                    <AccordionHeader>
                        <AccordionTrigger>Workspace plan</AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>
                        Your team is on the Pro plan, billed annually with priority support and custom retention
                        policies included.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="limits">
                    <AccordionHeader>
                        <AccordionTrigger>Current usage</AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent padded={false}>
                        <dl class="divide-y divide-base-soft border-t border-base-soft">
                            {#each usageRows as row (row.label)}
                                <div class="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                                    <dt class="text-weak">{row.label}</dt>
                                    <dd class="font-600 tabular-nums text-strong">{row.value}</dd>
                                </div>
                            {/each}
                        </dl>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support">
                    <AccordionHeader>
                        <AccordionTrigger>Support hours</AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>
                        Engineering support is available Monday through Friday with a two-hour response target.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </PreviewSection>
</div>
