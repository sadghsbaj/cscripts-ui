<!--
@component
Pill-framed Pfleiderer brand badge (`<WorkAppBrand />`) for internal work tools.

Architectural Notes:
- Header Integration: Automatically rendered on the right edge of `<WorkAppHeader />`, so it does
  not need to be placed manually in standard layouts. Exported standalone for custom header setups.
- Visual Framing: Matches the height (`100%`), horizontal padding (`20px`), and squircle pill surface
  of the tool identity pill in `<WorkAppHeader />` for balanced left/right anchoring.
-->
<script lang="ts">
    import logoUrl from "cs/assets/work/logo.svg";

    import type { WorkAppBrandProps } from "./index";

    let { class: className, ...rest }: WorkAppBrandProps = $props();
</script>

<img alt="Pfleiderer" {...rest} src={logoUrl} class={["cs-work-app-brand-logo", className]} />

<style>
    @layer components {
        .cs-work-app-brand-logo {
            height: 100%;
            padding: 12px 20px;
            background-color: var(--cs-color-elevation-1);
            border: 1px solid var(--cs-color-elevation-1-border);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-sm);
            user-select: none;
            pointer-events: none;
        }
    }
</style>
