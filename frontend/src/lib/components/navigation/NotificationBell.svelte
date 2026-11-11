<script lang="ts">
    import { notificationStore } from "$lib/services/notificationStore.svelte";
    import { updateStore } from "$lib/services/updateService.svelte";

    let { 
        onOpenRequests, 
        onOpenSettings 
    }: { 
        onOpenRequests?: (tab: 'requests' | 'changes' | 'feedbacks' | 'admissions') => void;
        onOpenSettings?: () => void;
    } = $props();

    let isOpen = $state(false);
    let containerEl = $state<HTMLDivElement>();

    function toggle(e: MouseEvent) {
        e.stopPropagation();
        isOpen = !isOpen;
        if (isOpen) {
            notificationStore.acknowledgeAll();
        }
    }

    function close() {
        isOpen = false;
    }

    function handleWindowClick(e: MouseEvent) {
        if (!isOpen) return;
        if (containerEl && !containerEl.contains(e.target as Node)) {
            close();
        }
    }

    function handleWindowKeydown(e: KeyboardEvent) {
        if (isOpen && e.key === 'Escape') {
            close();
        }
    }

    function handleOpenTab(tab: 'requests' | 'changes' | 'feedbacks' | 'admissions') {
        close();
        onOpenRequests?.(tab);
    }

    function handleOpenSettings() {
        close();
        onOpenSettings?.();
    }

    function handleOpenUpdates() {
        close();
        updateStore.open();
    }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div bind:this={containerEl} class="relative flex items-center">
    <button 
        type="button"
        class="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer"
        onclick={toggle}
        aria-label="Benachrichtigungen"
        title="Benachrichtigungen anzeigen"
    >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        {#if notificationStore.hasNewNotifications}
            <span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
        {/if}
    </button>

    {#if isOpen}
        <div class="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-84 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-enter">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center">
                <h3 class="font-bold text-slate-900 dark:text-slate-100">Benachrichtigungen</h3>
                {#if notificationStore.totalNotifications > 0}
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {notificationStore.totalNotifications}
                    </span>
                {/if}
            </div>

            <div>
                {#if notificationStore.totalNotifications === 0}
                    <div class="p-8 text-center flex flex-col items-center justify-center border-b border-slate-50 dark:border-slate-800">
                        <span class="text-3xl mb-3 opacity-50">✨</span>
                        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Alles erledigt!</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Du hast keine neuen Benachrichtigungen.</p>
                    </div>
                {/if}

                <div class="flex flex-col">
                    <button 
                        type="button" 
                        onclick={handleOpenUpdates} 
                        class="w-full text-left p-4 border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 cursor-pointer"
                    >
                        <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner text-xl">✨</div>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {notificationStore.hasUnreadUpdates ? 'Neues System-Update' : 'System-Updates (Verlauf)'}
                            </p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Erfahren Sie, was sich in OrgaFlow verändert hat.</p>
                        </div>
                    </button>

                    {#if notificationStore.unreadMails > 0}
                        <a 
                            href="/mail/" 
                            onclick={close} 
                            class="p-4 border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 cursor-pointer"
                        >
                            <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">✉️</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {notificationStore.unreadMails} ungelesene E-Mail{notificationStore.unreadMails > 1 ? 's' : ''}
                                </p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Posteingang überprüfen.</p>
                            </div>
                        </a>
                    {/if}

                    {#if notificationStore.pendingRequests > 0}
                        <button 
                            type="button" 
                            onclick={() => handleOpenTab('requests')} 
                            class="w-full text-left p-4 border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 cursor-pointer"
                        >
                            <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">📬</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {notificationStore.pendingRequests} Terminanfrage{notificationStore.pendingRequests > 1 ? 'n' : ''}
                                </p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Klicken, um Anfragen direkt zu bearbeiten.</p>
                            </div>
                        </button>
                    {/if}

                    {#if notificationStore.pendingChanges > 0}
                        <button 
                            type="button" 
                            onclick={() => handleOpenTab('changes')} 
                            class="w-full text-left p-4 border-b border-slate-50 dark:border-slate-800/60 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-colors flex items-start gap-3 cursor-pointer"
                        >
                            <div class="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-inner">🔄</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {notificationStore.pendingChanges} Termin-Änderung{notificationStore.pendingChanges > 1 ? 'en' : ''}
                                </p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Änderungswünsche Ihrer Klienten einsehen.</p>
                            </div>
                        </button>
                    {/if}

                    {#if notificationStore.pendingAdmissions > 0}
                        <button 
                            type="button" 
                            onclick={() => handleOpenTab('admissions')} 
                            class="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 cursor-pointer"
                        >
                            <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">👤</div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {notificationStore.pendingAdmissions} Neuaufnahme-Anfrage{notificationStore.pendingAdmissions > 1 ? 'n' : ''}
                                </p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Klicken, um Aufnahmen direkt zu bearbeiten.</p>
                            </div>
                        </button>
                    {/if}
                </div>
            </div>
            
            <div class="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-center shrink-0">
                <button 
                    type="button"
                    onclick={handleOpenSettings} 
                    class="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                    <span>⚙️</span> Benachrichtigungs-Einstellungen
                </button>
            </div>
        </div>
    {/if}
</div>
