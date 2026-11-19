# 07 · Plan Picker

## Intent

Three-tier subscription plan comparison grid pairing a centered billing period switcher, synchronized morphing currency readouts, feature checklists, and footer-aligned action buttons.

## Used Modules

- `cs/svelte/segmented-control` (`SegmentedControl`, `SegmentedControlItem`, `SegmentedControlLabel`)
- `cs/svelte/number-morph` (`NumberMorphGroup`, `NumberMorph`)
- `cs/svelte/card` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `CardFooter`)
- `cs/svelte/badge` (`Badge`, `BadgeLabel`)
- `cs/svelte/button` (`Button`, `ButtonLabel`)

## Key Patterns

- **Centered Billing Switcher:** `<SegmentedControl size="md" width="content" bind:value={billing} />` sits above the plan grid, toggling between `"monthly"` and `"yearly"` pricing.
- **Synchronized Price Morphing:** `<NumberMorphGroup>` wraps the 3-column grid so all three `<NumberMorph>` currency readouts animate together with `tabular-nums` alignment and zero horizontal jitter.
- **Equal-Height Tier Cards:** `grid-cols-1 md:grid-cols-3 items-stretch` paired with `Card variant="elevated" size="lg" class="h-full"` keeps `CardFooter` CTAs aligned along the bottom edge across tiers.
- **Single Primary Emphasis:** Only the `recommended` tier renders a `soft` `accent` `Badge` (`Popular`) and a `primary` `Button`; sibling tiers use `tertiary` buttons.

## States

- **Monthly:** Displays monthly rates (`$0`, `$12`, `$29`) with interactive plan selection buttons.
- **Yearly:** Switches billing to yearly rates (`$0`, `$9`, `$24`) with synchronized `NumberMorph` transitions.
- **Selected:** Marks the active tier (`pro`) as `"Current plan"` with its CTA disabled.
- **Disabled:** Disables the billing `SegmentedControl` and all tier CTA buttons.
