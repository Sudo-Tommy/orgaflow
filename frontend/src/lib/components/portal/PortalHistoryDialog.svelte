<script lang="ts">
    import { X, Search, Calendar, ArrowRight } from "lucide-svelte";

    let {
        dialog = $bindable(),
        pastAppointments = [],
        userType = "client",
        onSelectAppointment = () => {}
    }: {
        dialog?: HTMLDialogElement;
        pastAppointments?: any[];
        userType?: string;
        onSelectAppointment?: (app: any) => void;
    } = $props();

    let searchQuery = $state("");

    let filtered = $derived.by(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return pastAppointments;
        return pastAppointments.filter((app: any) => {
            const desc = (app.description || '').toLowerCase();
            const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');
            const clName = app.expand?.client?.[0] ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.toLowerCase() : '';
            const uName = app.expand?.user ? `${app.expand.user.name_first} ${app.expand.user.name_last}`.toLowerCase() : '';
            return desc.includes(q) || dateStr.includes(q) || clName.includes(q) || uName.includes(q);
        });
    });

    let grouped = $derived.by(() => {
        const groups: { monthYear: string; apps: any[] }[] = [];
        for (const app of filtered) {
            const my = new Date(app.appointment).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
            let g = groups.find(x => x.monthYear === my);
            if (!g) { g = { monthYear: my, apps: [] }; groups.push(g); }
            g.apps.push(app);
        }
        return groups;
    });

    export function open() {
        searchQuery = "";
        dialog?.showModal();
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl border-none shadow-2xl outline-none" onclick={(e) => { if (e.target === dialog) dialog?.close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full flex flex-col relative shadow-2xl animate-enter">
        <div class="px-6 md:px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 rounded-t-3xl">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><span>🕰️</span> Vergangene Termine</h2>
                <button type="button" aria-label="Schließen" onclick={() => dialog?.close()} class="w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer"><X class="w-5 h-5" /></button>
            </div>
            <div class="relative">
                <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="search" bind:value={searchQuery} placeholder={userType === 'contact' ? 'Nach Beschreibung, Datum oder Klient suchen...' : 'Nach Beschreibung, Datum oder Assistenz suchen...'} class="orga-input-clear py-2.5 pl-10 pr-9 text-sm w-full" />
                {#if searchQuery}<button type="button" onclick={() => searchQuery = ""} class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs">✕</button>{/if}
            </div>
        </div>

        <div class="flex-1 p-6 md:p-8 flex flex-col gap-3.5 bg-slate-50/50 dark:bg-slate-950/40">
            {#if filtered.length === 0}
                <div class="flex flex-col items-center justify-center py-10 opacity-60"><span class="text-3xl mb-2">🔍</span><p class="text-sm font-bold text-slate-600">Keine Termine gefunden.</p></div>
            {:else}
                {#each grouped as g}
                    <div class="mb-6 last:mb-0">
                        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar class="w-3.5 h-3.5 text-indigo-500" /> {g.monthYear}</h3>
                        <div class="flex flex-col gap-3">
                            {#each g.apps as app}
                                <button type="button" onclick={() => { dialog?.close(); onSelectAppointment(app); }} class="w-full text-left bg-white dark:bg-slate-900 hover:bg-indigo-50/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 group active:scale-95 shadow-2xs cursor-pointer">
                                    <div class="flex items-center justify-between w-full">
                                        <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(app.appointment).toLocaleDateString('de-DE')} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                        <div class="flex gap-1.5">
                                            {#if app.report}<span class="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]" title="Bericht">📝</span>{/if}
                                            {#if app.settled}<span class="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]" title="Abgerechnet">✓</span>{/if}
                                        </div>
                                    </div>
                                    <p class="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{app.description || 'Termin ohne Beschreibung'}</p>
                                    <div class="mt-1 flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Details ansehen <ArrowRight class="w-3 h-3" /></div>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</dialog>
