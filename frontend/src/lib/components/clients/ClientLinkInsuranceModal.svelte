<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { ShieldCheck, Check } from "lucide-svelte";

    let { client } = $props<{ client: any }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");
    let insurance = $state("");

    let sortedInsurances = $derived(
        [...(orgaStore.insurancies?.data || [])].sort((a: any, b: any) => 
            (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' })
        )
    );

    export function open() {
        insurance = client?.insurance || "";
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            await pb.collection('clients').update(client.id, { insurance });
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Verknüpfen der Krankenkasse.";
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
        <div class="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 text-lg shrink-0">
                    <ShieldCheck class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            Krankenkasse
                        </span>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400 truncate max-w-[180px]">
                            {client?.name_first || ''} {client?.name_last || ''}
                        </span>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                        Kasse verknüpfen
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

                <div class="space-y-1.5">
                    <label for="insurance_select" class="block text-xs font-bold text-neutral-700 dark:text-slate-300">
                        Kranken- / Pflegekasse wählen:
                    </label>
                    <select 
                        id="insurance_select" 
                        bind:value={insurance} 
                        class="w-full h-11 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer" 
                        disabled={isLoading}
                    >
                        <option value="">Keine / Unbekannt</option>
                        {#each sortedInsurances as ins (ins.id)}
                            <option value={ins.id}>{ins.name}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <!-- Footer Bild-3-Design -->
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <button type="button" onclick={close} class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" disabled={isLoading}>
                    Schließen
                </button>
                <button type="submit" class="orga-button-primary py-2.5 px-5 text-xs font-bold shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 cursor-pointer" disabled={isLoading}>
                    <Check class="w-3.5 h-3.5" />
                    <span>{isLoading ? "Speichert..." : "Verknüpfen"}</span>
                </button>
            </div>
        </form>
    </div>
</dialog>