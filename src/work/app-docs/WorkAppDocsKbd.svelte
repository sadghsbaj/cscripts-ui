<script lang="ts">
    import { Kbd } from "../../modules/kbd/index.ts";
    import type { WorkAppDocsKbdProps } from "./index.ts";

    let { ref = $bindable(null), children, class: className, ...rest }: WorkAppDocsKbdProps = $props();
</script>

<Kbd {...rest} bind:ref variant="keycap" size="xs" class={["cs-work-app-docs-kbd", className]}>
    {@render children?.()}
</Kbd>
