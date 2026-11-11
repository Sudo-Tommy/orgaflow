<script lang="ts">
    import { tick } from "svelte";
    import { X } from "lucide-svelte";
    import AppointmentRequestsWidget from "$lib/components/AppointmentRequestsWidget.svelte";
    import SupportTicketsTab from "$lib/components/admin/SupportTicketsTab.svelte";
    import EingangszentraleProposalsTab from "./EingangszentraleProposalsTab.svelte";
    import { notificationStore } from "$lib/services/notificationStore.svelte";
    import { proposalService } from "$lib/services/improvementProposalService.svelte";

    type EingangszentraleTab = 'requests' | 'changes' | 'admissions' | 'feedbacks' | 'support' | 'proposals';

    let dialog = $state<HTMLDialogElement>();
    let isOpen = $state(false);
    let currentTab = $state<EingangszentraleTab>('requests');

    let pendingRequestsCount = $derived(notificationStore.pendingRequests);
    let pendingChangesCount = $derived(notificationStore.pendingChanges);
    let pendingAdmissionsCount = $derived(notificationStore.pendingAdmissions);
    let openSupportTicketsCount = $derived(notificationStore.openSupportTickets);
    let unreadProposalsCount = $derived(proposalService.unreadCount);

    let modalMaxWidth = $derived.by(() => {
        if (currentTab === 'requests') return 'max-w-6xl';
        if (currentTab === 'admissions') return 'max-w-5xl';
        return 'max-w-4xl';
    });

    export async function open(tab: EingangszentraleTab = 'requests') {
        currentTab = tab;
        isOpen = true;
        if (tab === 'proposals') {
            proposalService.markAllAsRead();
        }
        await tick();
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    }

    export function close() {
        if (dialog?.open) {
            dialog.close();
        }
        isOpen = false;
    }

    function selectTab(tab: EingangszentraleTab) {
        currentTab = tab;
        if (tab === 'proposals') {
            proposalService.markAllAsRead();
        }
    }
</script>

{#if isOpen}
    <dialog 
        bind:this={dialog} 
        class="zero-inner-scroll-modal overflow-hidden p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-md w-[96vw] {modalMaxWidth} h-[90vh] max-h-[90vh] mx-auto my-auto rounded-3xl outline-none z-50 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 transition-all duration-200"
        onclick={(e) => {
            if (e.target === dialog) {
                e.stopPropagation();
                close();
            }
        }}
        oncancel={(e) => {
            e.preventDefault();
            close();
        }}
    >
        <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full h-full max-h-full flex flex-col relative shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
            <!-- Modal Header: Titel links, Schließen oben rechts -->
            <div class="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex flex-col gap-3 shrink-0 rounded-t-3xl">
                <div class="flex items-center justify-between gap-3 w-full">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800 flex items-center justify-center text-xl shrink-0 shadow-xs">
                            📥
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                                    Eingangszentrale
                                </h2>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                                    Alles von außen
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
                                Anfragen, Änderungen, Aufnahmen, Feedback, Support und Ideen an einem zentralen Ort
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onclick={close}
                        class="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        aria-label="Schließen"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Zusammengeführte Reiterleiste (Horizontal scrollbar, kein Zeilenumbruch) -->
                <div class="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-2xl overflow-x-auto no-scrollbar w-full">
                    <!-- 1. Anfragen -->
                    <button
                        type="button"
                        onclick={() => selectTab('requests')}
                        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] whitespace-nowrap shrink-0
                        {currentTab === 'requests' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        <span>📬</span>
                        <span>Anfragen</span>
                        {#if pendingRequestsCount > 0}
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white animate-pulse">{pendingRequestsCount}</span>
                        {/if}
                    </button>

                    <!-- 2. Änderungen -->
                    <button
                        type="button"
                        onclick={() => selectTab('changes')}
                        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] whitespace-nowrap shrink-0
                        {currentTab === 'changes' ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        <span>🔄</span>
                        <span>Änderungen</span>
                        {#if pendingChangesCount > 0}
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-600 text-white animate-pulse">{pendingChangesCount}</span>
                        {/if}
                    </button>

                    <!-- 3. Aufnahmen -->
                    <button
                        type="button"
                        onclick={() => selectTab('admissions')}
                        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] whitespace-nowrap shrink-0
                        {currentTab === 'admissions' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        <span>👤</span>
                        <span>Aufnahmen</span>
                        {#if pendingAdmissionsCount > 0}
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white animate-pulse">{pendingAdmissionsCount}</span>
                        {/if}
                    </button>

                    <!-- 4. Kunden-Feedback -->
                    <button
                        type="button"
                        onclick={() => selectTab('feedbacks')}
                        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] whitespace-nowrap shrink-0
                        {currentTab === 'feedbacks' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        <span>⭐</span>
                        <span>Kunden-Feedback</span>
                    </button>

                    <!-- 5. Support & Fehler -->
                    <button
                        type="button"
                        onclick={() => selectTab('support')}
                        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] whitespace-nowrap shrink-0
                        {currentTab === 'support' ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        <span>🐞</span>
                        <span>Support & Fehler</span>
                        {#if openSupportTicketsCount > 0}
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">{openSupportTicketsCount}</span>
                        {/if}
                    </button>

                    <!-- 6. Vorschläge -->
                    <button
                        type="button"
                        onclick={() => selectTab('proposals')}
                        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] whitespace-nowrap shrink-0
                        {currentTab === 'proposals' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        <span>💡</span>
                        <span>Vorschläge</span>
                        {#if unreadProposalsCount > 0}
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">{unreadProposalsCount}</span>
                        {/if}
                    </button>
                </div>
            </div>

            <!-- Content Area: Füllt die Resthöhe ohne vertikale Abbrüche -->
            <div class="flex-1 min-h-0 flex flex-col overflow-hidden {currentTab === 'requests' || currentTab === 'changes' || currentTab === 'admissions' || currentTab === 'feedbacks' ? 'p-0' : 'p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-950/40 rounded-b-3xl overflow-y-auto'}">
                {#if currentTab === 'requests' || currentTab === 'changes' || currentTab === 'admissions' || currentTab === 'feedbacks'}
                    <AppointmentRequestsWidget 
                        bind:activeTab={currentTab} 
                        hideHeader={true} 
                        onclose={close} 
                    />
                {:else if currentTab === 'support'}
                    <SupportTicketsTab />
                {:else if currentTab === 'proposals'}
                    <EingangszentraleProposalsTab />
                {/if}
            </div>
        </div>
    </dialog>
{/if}
