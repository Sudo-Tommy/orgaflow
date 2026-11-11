<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    onMount(() => {
        goto("/dashboard", { replaceState: true });
    });
</script>

<div
    class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs"
>
    <span>Weiterleitung zum Dashboard...</span>
</div>
