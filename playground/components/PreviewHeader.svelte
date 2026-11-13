<script lang="ts">
    interface Props {
        title: string;
        description?: string;
        class?: string;
    }

    let { title, description, class: className = "" }: Props = $props();
</script>

<header class="flex flex-col gap-1.5 {className}">
    <h1 class="title-3xl text-strong">{title}</h1>
    {#if description}
        <p class="text-sm text-weak max-w-2xl">{description}</p>
    {/if}
</header>
