<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import FeedbackContainer from '$lib/components/admin/FeedbackContainer.svelte';
</script>

<svelte:head>
    <title>Support & Feedback | OrgaFlow</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col">
    <FeedbackContainer pbClient={pb} />
</div>
