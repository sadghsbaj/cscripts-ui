<script lang="ts">
    import type { KbdIconComponentProps } from "./keys.ts";

    let { strokeWidth: _strokeWidth, ...rest }: KbdIconComponentProps = $props();
</script>

<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path
        d="M3 5.55 10.35 4.55v6.65H3V5.55Zm8.55-1.16L21 3v8.2h-9.45V4.39ZM3 12.8h7.35v6.65L3 18.45V12.8Zm8.55 0H21V21l-9.45-1.39V12.8Z"
    />
</svg>
