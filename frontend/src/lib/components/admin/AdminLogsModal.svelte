<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { X, RefreshCw, Activity, AlertCircle } from "lucide-svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    
    let dialog: HTMLDialogElement | undefined = $state();
    let isLoading = $state(false);
    let logs = $state<any[]>([]);
    
    export function open() {
        dialog?.showModal();
        loadLogs();
    }
    
    export function close() {
        dialog?.close();
    }
    
    async function loadLogs() {
        isLoading = true;
        try {
            const result = await pb.collection('audit_logs').getList(1, 100, { 
                sort: '-created'
            });
            logs = result.items;
        } catch (e: any) {
            console.error(e);
            toastStore.error("Fehler beim Laden der Logs. Haben Sie System-Admin-Rechte?");
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl w-full flex flex-col relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        
        <div class="px-5 py-3.5 border-b border-neutral-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center gap-3 rounded-t-3xl">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
                    <Activity class="w-5 h-5" />
                </div>
                <div>
                    <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">System-Logbuch</h2>
                    <p class="text-[10px] sm:text-xs text-neutral-500 dark:text-slate-400 font-medium">Automatische Aufzeichnung aller System-Aktivitäten</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick={loadLogs} class="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer" title="Aktualisieren" disabled={isLoading}>
                    <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" />
                </button>
                <button aria-label="Schließen" onclick={close} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-neutral-500 outline-none cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>
        </div>
        
        <div class="p-4 md:p-6 bg-neutral-50/50 dark:bg-slate-950/40">
            {#if isLoading && logs.length === 0}
                <div class="flex flex-col items-center justify-center py-20 text-neutral-400">
                    <RefreshCw class="w-8 h-8 animate-spin mb-4" />
                    <p class="font-medium">Lade Server-Aufzeichnungen...</p>
                </div>
            {:else if logs.length === 0}
                <div class="flex flex-col items-center justify-center py-20 text-neutral-400 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-100 dark:border-slate-800 shadow-sm">
                    <AlertCircle class="w-12 h-12 mb-4 opacity-50" />
                    <p class="font-bold text-neutral-600 dark:text-slate-300">Das Logbuch ist leer.</p>
                    <p class="text-sm mt-1">Aktuell liegen keine verwertbaren Aufzeichnungen vor.</p>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each logs as log}
                        <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span class="text-[10px] font-black px-2 py-0.5 rounded-md border bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">{log.user_role}</span>
                                    <span class="text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-widest">{new Date(log.created).toLocaleString('de-DE')}</span>
                                    <span class="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-auto">{log.user_name}</span>
                                </div>
                                <p class="text-sm font-bold text-neutral-900 dark:text-white leading-snug mb-1">{log.user_name} {log.action}</p>
                                <p class="text-[10px] text-neutral-400 font-mono truncate max-w-full" title={log.route}>Route: {log.route}</p>
                                
                                {#if log.details && log.details !== 'Keine Daten'}
                                    <div class="mt-2 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-100 dark:border-slate-700 p-2 rounded-lg text-xs text-neutral-600 dark:text-slate-300 font-mono truncate" title={log.details}>
                                        Details: {log.details}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
                
                <div class="mt-6 text-center">
                    <p class="text-xs text-neutral-400 flex items-center justify-center gap-1.5"><Activity class="w-3.5 h-3.5" /> Es werden die letzten 100 relevanten Aktivitäten angezeigt.</p>
                </div>
            {/if}
        </div>
    </div>
</dialog>