<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { Building2, Check } from "lucide-svelte";

    let { client } = $props<{ client: any }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");
    let retirement_homes = $state<string[]>([]);

    let sortedHomes = $derived(
        [...(orgaStore.retirement_homes?.data || [])].sort((a: any, b: any) => 
            (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' })
        )
    );

    export function open() {
        retirement_homes = Array.isArray(client?.retirement_homes) ? client.retirement_homes : (client?.retirement_homes ? [client.retirement_homes] : []);
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function toggleHome(id: string) {
        if (retirement_homes.includes(id)) {
            retirement_homes = retirement_homes.filter(hId => hId !== id);
        } else {
            retirement_homes = [...retirement_homes, id];
        }
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            await pb.collection('clients').update(client.id, { retirement_homes });
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Verknüpfen des Pflegeheims.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl border-none shadow-2xl z-50 outline-none" 
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-slate-800 w-full flex flex-col relative overflow-hidden transition-colors">
        <!-- Header Bild-3-Design -->
        <div class="p-6 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 text-lg shrink-0">
                    <Building2 class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            Pflegeheime
                        </span>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400 truncate max-w-[180px]">
                            {client?.name_first || ''} {client?.name_last || ''}
                        </span>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                        Pflegeheime verknüpfen
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

        <form onsubmit={onSubmit} class="flex flex-col flex-1">
            <div class="p-6 space-y-4 flex-1">
                {#if errorMsg}
                    <div class="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 p-3.5 rounded-2xl text-xs font-bold border border-rose-200 dark:border-rose-900">{errorMsg}</div>
                {/if}

                <div class="border border-neutral-100 dark:border-slate-800 rounded-2xl p-2 bg-neutral-50/50 dark:bg-slate-900/60 space-y-2">
                    {#each sortedHomes as home}
                        {@const isChecked = retirement_homes.includes(home.id)}
                        <label class="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition-all border {isChecked ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-xs' : 'border-neutral-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50'}">
                            <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onchange={() => toggleHome(home.id)} 
                                class="w-4 h-4 text-indigo-600 border-neutral-300 dark:border-slate-600 rounded-md focus:ring-indigo-500 cursor-pointer" 
                                disabled={isLoading} 
                            />
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">{home.name}</p>
                                <p class="text-xs text-neutral-500 dark:text-slate-400 truncate">{home.address || 'Keine Adresse hinterlegt'}</p>
                            </div>
                        </label>
                    {/each}
                    {#if sortedHomes.length === 0}
                        <p class="text-xs text-neutral-400 dark:text-slate-500 p-4 italic text-center">Keine Pflegeheime im System vorhanden.</p>
                    {/if}
                </div>
            </div>

            <!-- Footer Bild-3-Design -->
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <button type="button" onclick={close} class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" disabled={isLoading}>
                    Schließen
                </button>
                <button type="submit" class="orga-button-primary py-2.5 px-5 text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer" disabled={isLoading}>
                    <Check class="w-3.5 h-3.5" />
                    <span>{isLoading ? "Speichert..." : "Verknüpfen"}</span>
                </button>
            </div>
        </form>
    </div>
</dialog>