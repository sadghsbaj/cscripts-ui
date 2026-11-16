<script module>
    export const id = "badge";
    export const label = "Badge";
</script>

<script lang="ts">
    import { ArrowUpRight, Bell, Check, Sparkles } from "@lucide/svelte";
    import {
        BADGE_COLORS,
        BADGE_SIZES,
        BADGE_VARIANTS,
        Badge,
        BadgeIcon,
        BadgeLabel,
    } from "cs/svelte/badge";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Kbd } from "cs/svelte/kbd";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
${closeScript}

<Badge variant="soft" color="base" size="md">
    <BadgeLabel>Beta</BadgeLabel>
</Badge>

<Badge variant="soft" color="accent" size="md">
    <BadgeLabel>12</BadgeLabel>
</Badge>

<Badge variant="dot" color="positive" size="md">
    <BadgeLabel>Active</BadgeLabel>
</Badge>`;

    const variantsCode = `<Badge variant="soft" color="accent" size="md">
    <BadgeLabel>Soft</BadgeLabel>
</Badge>
<Badge variant="solid" color="accent" size="md">
    <BadgeLabel>Solid</BadgeLabel>
</Badge>
<Badge variant="dot" color="accent" size="md">
    <BadgeLabel>Dot</BadgeLabel>
</Badge>

<!-- On a sunken surface -->
<SunkenWell>
    <Badge variant="soft" color="accent" size="md"><BadgeLabel>Soft</BadgeLabel></Badge>
    <Badge variant="solid" color="accent" size="md"><BadgeLabel>Solid</BadgeLabel></Badge>
    <Badge variant="dot" color="accent" size="md"><BadgeLabel>Dot</BadgeLabel></Badge>
</SunkenWell>`;

    const colorsCode = `<Badge variant="soft" color="base" size="md"><BadgeLabel>Base</BadgeLabel></Badge>
<Badge variant="soft" color="accent" size="md"><BadgeLabel>Accent</BadgeLabel></Badge>
<Badge variant="soft" color="positive" size="md"><BadgeLabel>Positive</BadgeLabel></Badge>
<Badge variant="soft" color="caution" size="md"><BadgeLabel>Caution</BadgeLabel></Badge>
<Badge variant="soft" color="negative" size="md"><BadgeLabel>Negative</BadgeLabel></Badge>`;

    const sizesCode = `<Badge variant="soft" color="base" size="xs"><BadgeLabel>New</BadgeLabel></Badge>
<Badge variant="soft" color="accent" size="xs"><BadgeLabel>1</BadgeLabel></Badge>
<Badge variant="solid" color="accent" size="xs"><BadgeLabel>12</BadgeLabel></Badge>
<Badge variant="soft" color="base" size="xs"><BadgeLabel>99+</BadgeLabel></Badge>

<!-- Repeat for sm, md, lg, xl -->`;

    const iconsCode = `<!-- Leading icon -->
<Badge variant="soft" color="accent" size="md">
    <BadgeIcon icon={Sparkles} />
    <BadgeLabel>Beta</BadgeLabel>
</Badge>

<!-- Trailing icon -->
<Badge variant="soft" color="base" size="md">
    <BadgeLabel>Docs</BadgeLabel>
    <BadgeIcon icon={ArrowUpRight} />
</Badge>

<!-- Icon-only (requires aria-label) -->
<Badge variant="soft" color="positive" size="md" iconOnly aria-label="Verified">
    <BadgeIcon icon={Check} />
</Badge>
<Badge variant="solid" color="accent" size="md" iconOnly aria-label="Notifications">
    <BadgeIcon icon={Bell} />
</Badge>`;

    const pairingCode = `<!-- Calibrated to Kbd (24px at md) -->
<div class="flex items-center gap-2">
    <Kbd variant="soft" size="md">Ctrl</Kbd>
    <Badge variant="soft" color="base" size="md">
        <BadgeLabel>v2.4</BadgeLabel>
    </Badge>
</div>

<!-- Paired alongside Button -->
<Button variant="secondary" size="md">
    <ButtonLabel>Inbox</ButtonLabel>
    <Badge variant="solid" color="accent" size="sm">
        <BadgeLabel>12</BadgeLabel>
    </Badge>
</Button>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */

    const colorLabels: Record<(typeof BADGE_COLORS)[number], string> = {
        base: "Base",
        accent: "Accent",
        positive: "Positive",
        caution: "Caution",
        negative: "Negative",
    };

    const variantLabels: Record<(typeof BADGE_VARIANTS)[number], string> = {
        soft: "Soft",
        solid: "Solid",
        dot: "Dot",
    };
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Badge"
        description="A non-interactive compact indicator for semantic status, live counts, and short metadata labels."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Badge variant="soft" color="base" size="md">
            <BadgeLabel>Beta</BadgeLabel>
        </Badge>

        <Badge variant="soft" color="accent" size="md">
            <BadgeLabel>12</BadgeLabel>
        </Badge>

        <Badge variant="dot" color="positive" size="md">
            <BadgeLabel>Active</BadgeLabel>
        </Badge>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Three surface treatments — soft, solid, and dot — shown on both elevated and sunken surfaces."
        code={variantsCode}
    >
        <div class="flex-center flex-wrap gap-6">
            <div class="flex items-center gap-3">
                {#each BADGE_VARIANTS as variant (variant)}
                    <Badge {variant} color="accent" size="md">
                        <BadgeLabel>{variantLabels[variant]}</BadgeLabel>
                    </Badge>
                {/each}
            </div>

            <SunkenWell>
                {#each BADGE_VARIANTS as variant (variant)}
                    <Badge {variant} color="accent" size="md">
                        <BadgeLabel>{variantLabels[variant]}</BadgeLabel>
                    </Badge>
                {/each}
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Colors"
        description="Neutral base, brand accent, and semantic status colors across soft, solid, and dot variants."
        code={colorsCode}
    >
        <div class="flex flex-col gap-4">
            {#each BADGE_VARIANTS as variant (variant)}
                <div class="flex flex-wrap items-center gap-3">
                    <span class="w-12 text-xs text-weak">{variant}</span>
                    {#each BADGE_COLORS as color (color)}
                        <Badge {variant} {color} size="md">
                            <BadgeLabel>{colorLabels[color]}</BadgeLabel>
                        </Badge>
                    {/each}
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes & Counts"
        description="Five sizes from xs (18px) to xl (32px). A 1:1 minimum width keeps single-digit counts as balanced circular squircles, and tabular-nums prevents layout shift."
        code={sizesCode}
    >
        <div class="flex flex-wrap items-end justify-center gap-6">
            {#each BADGE_SIZES as size (size)}
                <div class="flex flex-col items-center gap-2">
                    <div class="flex items-center gap-2">
                        <Badge variant="soft" color="base" {size}>
                            <BadgeLabel>New</BadgeLabel>
                        </Badge>
                        <Badge variant="soft" color="accent" {size}>
                            <BadgeLabel>1</BadgeLabel>
                        </Badge>
                        <Badge variant="solid" color="accent" {size}>
                            <BadgeLabel>12</BadgeLabel>
                        </Badge>
                        <Badge variant="soft" color="base" {size}>
                            <BadgeLabel>99+</BadgeLabel>
                        </Badge>
                    </div>
                    <span class="text-xs text-weak">{size}</span>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Icons"
        description="Compose leading icons, trailing icons, or icon-only badges with an accessible aria-label."
        code={iconsCode}
    >
        <div class="flex flex-wrap items-center gap-4">
            <Badge variant="soft" color="accent" size="md">
                <BadgeIcon icon={Sparkles} />
                <BadgeLabel>Beta</BadgeLabel>
            </Badge>

            <Badge variant="soft" color="base" size="md">
                <BadgeLabel>Docs</BadgeLabel>
                <BadgeIcon icon={ArrowUpRight} />
            </Badge>

            <Badge variant="soft" color="positive" size="md" iconOnly aria-label="Verified">
                <BadgeIcon icon={Check} />
            </Badge>

            <Badge variant="solid" color="accent" size="md" iconOnly aria-label="Notifications">
                <BadgeIcon icon={Bell} />
            </Badge>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Pairing"
        description="Calibrated to match Kbd heights at each T-shirt step and pair cleanly alongside Button controls."
        code={pairingCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <div class="flex items-center gap-2">
                <Kbd variant="soft" size="md">Ctrl</Kbd>
                <Badge variant="soft" color="base" size="md">
                    <BadgeLabel>v2.4</BadgeLabel>
                </Badge>
            </div>

            <Button variant="secondary" size="md">
                <ButtonLabel>Inbox</ButtonLabel>
                <Badge variant="solid" color="accent" size="sm">
                    <BadgeLabel>12</BadgeLabel>
                </Badge>
            </Button>
        </div>
    </PreviewSection>
</div>
