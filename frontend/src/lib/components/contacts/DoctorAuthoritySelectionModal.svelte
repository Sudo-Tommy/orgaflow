<script lang="ts">
    import { onMount } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import type { ContactRecord } from '$lib/types/orgaTypes';
    import GoogleContactSelectionModal from './GoogleContactSelectionModal.svelte';
    import { isAuthority, isDoctor, filterAndSortDoctorAuthorityList } from './doctorAuthorityHelpers';

    let dialog = $state<HTMLDialogElement>();
    let googleModal = $state<ReturnType<typeof GoogleContactSelectionModal>>();

    let isOpen = $state(false);
    let isLoading = $state(false);
    let searchFilter = $state('');
    let activeCategory = $state<'all' | 'doctor' | 'authority'>('all');
    let targetClientId = $state<string>('');
    let locationContext = $state<string>('Halle (Saale)');
    let localContacts = $state<ContactRecord[]>([]);
    let resolvePromise: ((selected: ContactRecord | null) => void) | null = null;

    let clientContacts = $derived.by(() => {
        if (!targetClientId || !orgaStore.clients?.data) return [];
        const cl = orgaStore.clients.data.find(c => c.id === targetClientId);
        if (!cl) return [];
        const cIds = Array.isArray(cl.contacts) ? cl.contacts : (cl.contacts ? [cl.contacts] : []);
        const all = (orgaStore.contacts?.data && orgaStore.contacts.data.length > 0)
            ? orgaStore.contacts.data
            : localContacts;
        return all.filter(c => cIds.includes(c.id));
    });

    let baseList = $derived.by(() => {
        return (orgaStore.contacts?.data && orgaStore.contacts.data.length > 0)
            ? orgaStore.contacts.data
            : localContacts;
    });

    let doctorsCount = $derived(baseList.filter(c => isDoctor(c)).length);
    let authoritiesCount = $derived(baseList.filter(c => isAuthority(c)).length);

    let displayList = $derived.by(() => {
        return filterAndSortDoctorAuthorityList(baseList, searchFilter, activeCategory, clientContacts);
    });

    async function ensureContactsLoaded() {
        if (orgaStore.contacts?.data && orgaStore.contacts.data.length > 0) return;
        isLoading = true;
        try {
            if (pb.authStore.isValid && orgaStore.contacts) {
                await orgaStore.contacts.init();
                if (orgaStore.contacts.data && orgaStore.contacts.data.length > 0) return;
            }
            const res = await pb.collection('public_doctors').getFullList<ContactRecord>({
                sort: 'company_name,name_last',
                requestKey: null
            });
            localContacts = res;
        } catch (err) {
            console.warn('[DoctorAuthoritySelectionModal] Fehler beim Laden von public_doctors:', err);
        } finally {
            isLoading = false;
        }
    }

    onMount(() => {
        ensureContactsLoaded();
    });

    export function open(opts?: { clientId?: string; locationHint?: string }): Promise<ContactRecord | null> {
        targetClientId = opts?.clientId || '';
        locationContext = opts?.locationHint || 'Halle (Saale)';
        searchFilter = '';
        activeCategory = 'all';
        isOpen = true;
        ensureContactsLoaded();
        dialog?.showModal();
        return new Promise(resolve => { resolvePromise = resolve; });
    }

    export function close(result: ContactRecord | null = null) {
        isOpen = false;
        dialog?.close();
        if (resolvePromise) { resolvePromise(result); resolvePromise = null; }
    }

    async function openGoogleCreate() {
        const created = await googleModal?.open({
            query: searchFilter.trim() || 'Praxis',
            location: locationContext,
            type: activeCategory === 'authority' ? 'location' : 'doctor'
        });
        if (created) {
            localContacts = [created, ...localContacts.filter(c => c.id !== created.id)];
            close(created);
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs w-full max-w-xl mx-auto my-6 sm:my-10 rounded-2xl border-0 overflow-visible z-[99999]"
    onclick={(e) => { if (e.target === dialog) close(null); }}
    oncancel={(e) => { e.preventDefault(); close(null); }}
>
    {#if isOpen}
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-slate-800 w-full flex flex-col animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-neutral-50 to-white dark:from-slate-850 dark:via-slate-900 dark:to-slate-900">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shrink-0">
                    🩺
                </div>
                <div>
                    <h2 class="text-base font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Arzt oder Behörde festlegen</span>
                    </h2>
                    <p class="text-xs text-neutral-500 dark:text-slate-400">
                        Vorhandenen Kontakt auswählen oder neue Praxis / Behörde ermitteln.
                    </p>
                </div>
            </div>
            <button
                type="button"
                onclick={() => close(null)}
                class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
            >✕</button>
        </div>

        <!-- Filter & Kategorie Tabs -->
        <div class="p-4 bg-neutral-50 dark:bg-slate-850 border-b border-neutral-200 dark:border-slate-800 space-y-2.5">
            <div class="relative">
                <input
                    type="text"
                    bind:value={searchFilter}
                    placeholder="Name des Arztes, der Praxis oder des Amtes..."
                    class="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-800 dark:text-slate-200 focus:outline-hidden focus:border-rose-500 shadow-2xs font-medium"
                />
                <span class="absolute left-2.5 top-2.5 text-neutral-400 text-xs">🔍</span>
            </div>

            <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-1 flex-wrap">
                    <button
                        type="button"
                        onclick={() => activeCategory = 'all'}
                        class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer {activeCategory === 'all' ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-100'}"
                    >Alle ({baseList.length})</button>
                    <button
                        type="button"
                        onclick={() => activeCategory = 'doctor'}
                        class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer {activeCategory === 'doctor' ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-100'}"
                    >🩺 Ärzte ({doctorsCount})</button>
                    <button
                        type="button"
                        onclick={() => activeCategory = 'authority'}
                        class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer {activeCategory === 'authority' ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-100'}"
                    >🏛️ Behörden ({authoritiesCount})</button>
                </div>

                <button
                    type="button"
                    onclick={openGoogleCreate}
                    class="px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
                >
                    <span>🌐</span>
                    <span>Neu über Google</span>
                </button>
            </div>
        </div>

        <!-- Kontaktliste -->
        <div class="p-4 space-y-2 max-h-[380px] overflow-y-auto">
            {#if isLoading && baseList.length === 0}
                <div class="py-10 text-center text-xs text-neutral-500 dark:text-slate-400 flex items-center justify-center gap-2">
                    <svg class="animate-spin w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                    <span>Praxen und Behörden werden geladen...</span>
                </div>
            {:else if displayList.length > 0}
                {#each displayList as contact (contact.id)}
                    {@const isClientDirect = clientContacts.some(c => c.id === contact.id)}
                    <button
                        type="button"
                        onclick={() => close(contact)}
                        class="w-full text-left p-3 rounded-xl border border-neutral-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 bg-white dark:bg-slate-850 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                        <div class="space-y-0.5 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-xs text-neutral-900 dark:text-slate-100 truncate">
                                    {contact.company_name || `${contact.name_first || ''} ${contact.name_last || ''}`.trim()}
                                </span>
                                {#if isClientDirect}
                                    <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
                                        Klienten-Kontakt
                                    </span>
                                {/if}
                            </div>
                            {#if contact.street || contact.city}
                                <p class="text-[11px] text-neutral-500 dark:text-slate-400 truncate">
                                    📍 {contact.street} {contact.housenr || ''}{contact.street && contact.city ? ', ' : ''}{contact.zip || ''} {contact.city || ''}
                                </p>
                            {/if}
                        </div>
                        <span class="text-xs text-neutral-400 group-hover:text-rose-600 font-bold shrink-0">
                            Übernehmen →
                        </span>
                    </button>
                {/each}
            {:else}
                <div class="py-8 text-center space-y-3">
                    <span class="text-3xl block">🔍</span>
                    <p class="text-xs text-neutral-500 dark:text-slate-400">
                        Keine passenden Einträge für "{searchFilter}" gefunden.
                    </p>
                    <button
                        type="button"
                        onclick={openGoogleCreate}
                        class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                        Jetzt über Google recherchieren & anlegen
                    </button>
                </div>
            {/if}
        </div>

        <!-- Footer -->
        <div class="p-3.5 bg-neutral-50 dark:bg-slate-850 border-t border-neutral-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
                type="button"
                onclick={() => close(null)}
                class="px-3 py-1.5 text-xs text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
            >
                Praxis noch offen (später klären)
            </button>
            <button
                type="button"
                onclick={() => close(null)}
                class="px-3.5 py-1.5 text-xs font-bold text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-xl hover:bg-neutral-100 cursor-pointer"
            >
                Abbrechen
            </button>
        </div>
    </div>
    {/if}
</dialog>

<GoogleContactSelectionModal bind:this={googleModal} />
