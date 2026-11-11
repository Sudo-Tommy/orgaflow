<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        BookOpen, Plus, Search, Phone, MapPin, Navigation, 
        Lock, Edit3
    } from 'lucide-svelte';
    import type { ContactRecord } from '$lib/types/orgaTypes';
    import CaregiverContactModal from './CaregiverContactModal.svelte';

    let filterType = $state<'all' | 'own' | 'assigned'>('all');
    let searchQuery = $state('');
    let modal = $state<ReturnType<typeof CaregiverContactModal>>();

    const currentUserId = $derived(pb.authStore.model?.id);

    // Alle Kontakte sortiert nach Nachname / Firmenname gem. Regel alphabetical-select!
    const allContacts = $derived.by(() => {
        const list = [...(orgaStore.contacts.data || [])];
        return list.sort((a, b) => {
            const nameA = a.name_last || a.company_name || a.name_first || '';
            const nameB = b.name_last || b.company_name || b.name_first || '';
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        });
    });

    const filteredContacts = $derived.by(() => {
        let list = allContacts;
        if (filterType === 'own') {
            list = list.filter(c => c.created_by === currentUserId);
        } else if (filterType === 'assigned') {
            list = list.filter(c => c.created_by !== currentUserId);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c => 
                `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase().includes(q) ||
                (c.company_name || '').toLowerCase().includes(q) ||
                (c.city || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q)
            );
        }
        return list;
    });

    function callContact(num?: string) {
        if (!num) {
            toastStore.warning('Keine Telefonnummer hinterlegt.');
            return;
        }
        window.location.href = `tel:${num.replace(/\s+/g, '')}`;
    }

    function openMaps(address?: string) {
        if (!address) {
            toastStore.warning('Keine Adresse vorhanden.');
            return;
        }
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
    }
</script>

<div class="space-y-4 pb-24">
    <!-- Top Filter & Neuer Kontakt Button -->
    <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {#each [
                { id: 'all', label: 'Alle' },
                { id: 'own', label: '🟢 Eigene' },
                { id: 'assigned', label: '🔒 Zugewiesen' }
            ] as tab}
                <button
                    type="button"
                    onclick={() => filterType = tab.id as any}
                    class="min-h-11 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer {
                        filterType === tab.id 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }"
                >
                    {tab.label}
                </button>
            {/each}
        </div>

        <button
            type="button"
            onclick={() => modal?.openCreate()}
            class="min-h-11 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
            <Plus class="w-4 h-4" />
            <span>Neuer Kontakt</span>
        </button>
    </div>

    <!-- Suchleiste -->
    <div class="relative">
        <label for="search-contacts-field" class="sr-only">Kontakte suchen</label>
        <Search class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input 
            id="search-contacts-field"
            type="text" 
            bind:value={searchQuery}
            placeholder="Name, Arzt, Praxis oder Ort suchen..." 
            class="w-full min-h-12 pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs text-slate-900 dark:text-white"
        />
    </div>

    <!-- Kontaktliste -->
    {#if orgaStore.contacts?.isLoading}
        <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Kontakte...</div>
    {:else if filteredContacts.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen class="w-6 h-6" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine Kontakte gefunden</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Legen Sie eigene Kontakte für Ärzte oder Angehörige an oder nutzen Sie die Suchfunktion.
            </p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each filteredContacts as ct (ct.id)}
                {@const isOwn = ct.created_by === currentUserId}
                {@const address = `${ct.street || ''} ${ct.housenr || ''}, ${ct.zip || ''} ${ct.city || ''}`.trim()}
                {@const phoneNum = ct.phone}

                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-700 space-y-3">
                    
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            {#if ct.company_name}
                                <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block truncate">
                                    {ct.company_name}
                                </span>
                            {/if}
                            <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                {ct.name_last ? `${ct.name_last}, ${ct.name_first || ''}` : (ct.company_name || 'Kontakt')}
                            </h3>
                        </div>

                        {#if isOwn}
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                                <Edit3 class="w-3 h-3" />
                                <span>Eigen</span>
                            </span>
                        {:else}
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0">
                                <Lock class="w-3 h-3" />
                                <span>Zugewiesen</span>
                            </span>
                        {/if}
                    </div>

                    <!-- Kontaktdetails -->
                    {#if address}
                        <div class="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin class="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span class="truncate">{address}</span>
                        </div>
                    {/if}

                    <!-- Aktionen -->
                    <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onclick={() => callContact(phoneNum)}
                            disabled={!phoneNum}
                            class="min-h-11 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                            <Phone class="w-3.5 h-3.5 text-emerald-500" />
                            <span>Anrufen</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => openMaps(address)}
                            disabled={!address}
                            class="min-h-11 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                            <Navigation class="w-3.5 h-3.5 text-indigo-500" />
                            <span>Route</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => modal?.openEdit(ct)}
                            class="min-h-11 px-2.5 py-2 rounded-xl {isOwn ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'} text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                            {#if isOwn}<Edit3 class="w-3.5 h-3.5" /><span>Editieren</span>{:else}<Lock class="w-3.5 h-3.5" /><span>Details</span>{/if}
                        </button>
                    </div>

                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Modal für Kontakt Bearbeitung / Erstellung -->
<CaregiverContactModal bind:this={modal} />
