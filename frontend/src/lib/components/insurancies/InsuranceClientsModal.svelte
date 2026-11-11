<script lang="ts">
    import { Users, ExternalLink } from "lucide-svelte";

    let dialog: HTMLDialogElement;
    let insurance = $state<any>(null);
    let clients = $state<any[]>([]);
    let onOpenClient = $state<((clientId: string) => void) | null>(null);

    let sortedClients = $derived(
        [...clients].sort((a, b) => {
            const nameA = `${a.name_last || ''} ${a.name_first || ''}`.trim();
            const nameB = `${b.name_last || ''} ${b.name_first || ''}`.trim();
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        })
    );

    export function open(insRecord: any, clientList: any[], openClientCallback?: (id: string) => void) {
        insurance = insRecord;
        clients = clientList || [];
        onOpenClient = openClientCallback || null;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function handleClientClick(clientId: string) {
        close();
        if (onOpenClient) {
            onOpenClient(clientId);
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl border-none shadow-2xl z-50 outline-none" 
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 border border-neutral-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden transition-colors">
        <!-- Header Bild-3-Design -->
        <div class="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 text-lg shrink-0">
                    🛡️
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            {insurance?.type || 'Kostenträger'}
                        </span>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                            {clients.length} {clients.length === 1 ? 'Klient' : 'Klienten'}
                        </span>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                        {insurance?.name || 'Krankenkasse'}
                    </h3>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={close}
                class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer"
            >✕</button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-3 flex-1">
            {#if sortedClients.length === 0}
                <div class="text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                    Keine Klienten bei dieser Kasse erfasst.
                </div>
            {:else}
                {#each sortedClients as client (client.id)}
                    <div class="group bg-neutral-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-slate-800 border border-neutral-100 dark:border-slate-800 p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0 shadow-inner">
                                {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                            </div>
                            <div class="min-w-0">
                                <p class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {client.name_last ? `${client.name_last}, ${client.name_first || ''}` : (client.name_first || 'Unbekannt')}
                                </p>
                                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {#if client.insurance_nr}
                                        <span class="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-slate-700">
                                            Nr: {client.insurance_nr}
                                        </span>
                                    {/if}
                                    {#if client.city}
                                        <span class="text-[11px] text-slate-400">
                                            📍 {client.city}
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        {#if onOpenClient}
                            <button
                                type="button"
                                onclick={() => handleClientClick(client.id)}
                                class="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                                title="Klienten-Akte öffnen"
                            >
                                <ExternalLink class="w-4 h-4" />
                            </button>
                        {/if}
                    </div>
                {/each}
            {/if}
        </div>

        <!-- Footer Bild-3-Design -->
        <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button 
                type="button" 
                onclick={close} 
                class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
                Schließen
            </button>
            <span class="text-xs text-neutral-400 font-semibold">
                {clients.length} Einträge
            </span>
        </div>
    </div>
</dialog>
