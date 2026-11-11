<script lang="ts">
    import { page } from '$app/stores';
    import { isSubmitting } from '$lib/states/ui.svelte';
    import { pb } from '$lib/services/pocketbase';
    import { rbacService } from '$lib/services/rbacService.svelte';

    // Svelte 5 Props-Destrukturierung
    let { children } = $props();

    // Abgeleitete reaktive Werte über Runen
    const currentUser = $derived($page.data.user || pb.authStore.model);
    const isOwner = $derived(currentUser?.role === 'owner' || currentUser?.role === 'superadmin' || currentUser?.role === 'developer' || rbacService.isOwner);
    const isAdmin = $derived(currentUser?.role === 'admin');
    const isClient = $derived(currentUser?.role === 'client' || currentUser?.role === 'guest');

    // UI-State für Formular-Sicherung gegen Double-Submission
    let loadingState = $state({ submitting: false });

    function handleSecureNavigation() {
        if (loadingState.submitting || isSubmitting.submitting) return;
        // Navigation / Interaktion loggen...
    }
</script>

{#if currentUser}
    <header class="bg-slate-800 text-white p-4">
        <div class="container mx-auto flex justify-between items-center">
            <span class="font-bold text-lg">OrgaFlow Portal</span>
            <nav class="flex gap-4 items-center">
                {#if isOwner}
                    <a href="/owner/dashboard" class="px-4 py-2 hover:bg-slate-700 rounded min-h-[44px] flex items-center transition-colors">Globale Kontrolle</a>
                {/if}
                {#if isOwner || isAdmin}
                    <a href="/admin/dashboard" class="px-4 py-2 hover:bg-slate-700 rounded min-h-[44px] flex items-center transition-colors">Betriebsverwaltung</a>
                {/if}
                {#if isClient}
                    <span class="text-sm font-medium">Willkommen, Herr/Frau {currentUser.name_last || currentUser.lastName || ''}. Hier finden Sie Ihre Dokumente und Berichte.</span>
                {/if}
            </nav>
        </div>
    </header>
{/if}

<main class="p-6">
    {@render children()}
</main>
