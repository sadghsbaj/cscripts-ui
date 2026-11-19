<script lang="ts">
    import { getWorkAppIdentity } from "./index.ts";

    const identity = getWorkAppIdentity();
</script>

<div
    data-testid="identity-probe"
    data-tool-category={identity.toolCategory}
    data-tool-name={identity.toolName}
    data-phase={identity.phase}
    data-settled={String(identity.settled)}
></div>
