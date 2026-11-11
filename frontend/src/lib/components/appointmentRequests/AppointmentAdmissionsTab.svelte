<script lang="ts">
    import { Trash2, UserCheck, Eye, Phone, Mail, MapPin, Building, ShieldCheck } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";

    interface Props {
        admissions: any[];
        admissionSearch: string;
        onOpenDetail: (clientId: string) => void;
        onOpenReview?: (client: any) => void;
        onAcceptClient: (clientId: string) => void;
        onDeleteClient: (clientId: string) => void;
    }

    let {
        admissions,
        admissionSearch = $bindable(),
        onOpenDetail,
        onOpenReview,
        onAcceptClient,
        onDeleteClient
    }: Props = $props();

    let filteredAdmissions = $derived.by(() => {
        let list = admissions;
        if (admissionSearch.trim()) {
            const q = admissionSearch.toLowerCase().trim();
            list = list.filter(c => {
                const fullName = `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase();
                const notes = (c.notes || '').toLowerCase();
                return fullName.includes(q) || notes.includes(q);
            });
        }
        return list;
    });
</script>

<div class="space-y-4">
    <!-- Sub-Toolbar -->
    <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-2xl">
        <input
            type="text"
            bind:value={admissionSearch}
            placeholder="Aufnahmeanträge nach Klient oder Notiz suchen..."
            class="orga-input-clear min-h-11 text-xs max-w-sm flex-1"
        />
        <span class="inline-flex px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Offene Aufnahmeanträge: {filteredAdmissions.length}
        </span>
    </div>

    {#if filteredAdmissions.length === 0}
        <div class="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p class="text-2xl mb-1">{admissionSearch.trim() ? '🔍' : '🙌'}</p>
            <p class="text-sm font-bold">{admissionSearch.trim() ? 'Keine Treffer gefunden' : 'Alles aktuell!'}</p>
            <p class="text-xs text-slate-400 mt-1">Es liegen keine Anfragen zur Neuaufnahme vor.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-4">
            {#each filteredAdmissions as client (client.id)}
                {@const caregiver = Array.isArray(client.expand?.caregiver) ? client.expand.caregiver[0] : client.expand?.caregiver}
                {@const insurance = Array.isArray(client.expand?.insurance) ? client.expand.insurance[0] : client.expand?.insurance}
                <div class="border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-6 relative transition-all shadow-xs hover:shadow-md ring-1 ring-emerald-500/10">
                    <!-- Spalte 1: Stammdaten, Adresse & Pflegegrad -->
                    <div class="flex-1 min-w-0 space-y-2.5">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="font-bold text-slate-900 dark:text-white text-base truncate">{client.name_first} {client.name_last}</h3>
                            <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">Neuaufnahme</span>
                            {#if client.level_of_care}
                                <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">Grad {client.level_of_care}</span>
                            {/if}
                        </div>

                        <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            {#if client.street || client.city}
                                <p class="flex items-center gap-1.5"><MapPin class="w-3.5 h-3.5 text-slate-400 shrink-0" /> {client.street} {client.housenr || ''}, {client.zip || ''} {client.city || ''}</p>
                            {/if}
                            {#if client.phone || client.handy}
                                <p class="flex items-center gap-1.5"><Phone class="w-3.5 h-3.5 text-slate-400 shrink-0" /> {client.phone || client.handy}</p>
                            {/if}
                            {#if client.email}
                                <p class="flex items-center gap-1.5"><Mail class="w-3.5 h-3.5 text-slate-400 shrink-0" /> {client.email}</p>
                            {/if}
                            {#if insurance?.name || client.insurance_nr}
                                <p class="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-medium"><Building class="w-3.5 h-3.5 shrink-0" /> {insurance?.name || 'Kasse angegeben'} {client.insurance_nr ? `(${client.insurance_nr})` : ''}</p>
                            {/if}
                        </div>
                    </div>

                    <!-- Spalte 2: Betreuer, Notizen & Aktionen -->
                    <div class="flex-1 min-w-0 flex flex-col justify-between space-y-3 md:border-l md:border-slate-100 dark:md:border-slate-800 md:pl-5">
                        <div class="space-y-2">
                            <div class="flex items-center justify-between text-xs text-slate-400">
                                <span>Angefragt am {new Date(client.created).toLocaleDateString('de-DE')}</span>
                                {#if caregiver || client.inheritor_name}
                                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                                        <ShieldCheck class="w-3 h-3" /> Betreuer: {caregiver ? `${caregiver.name_first} ${caregiver.name_last}` : client.inheritor_name}
                                    </span>
                                {/if}
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed border border-slate-200/60 dark:border-slate-700/60">
                                {(client.notes || '').replace(/\[NEUE_KRANKENKASSE:\s*{.*?}\]/g, '').replace('⚠️ NEUAUFNAHME-ANFRAGE:', '').trim() || 'Keine gesonderten Notizen.'}
                            </div>
                        </div>

                        <!-- 1-Click Aktionen -->
                        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {#if onOpenReview}
                                <button type="button" onclick={() => { hapticFeedback.tap(); onOpenReview(client); }} class="min-h-10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer flex items-center gap-1.5 touch-manipulation">
                                    <UserCheck class="w-3.5 h-3.5" />
                                    <span>Prüfen & Übernehmen</span>
                                </button>
                            {/if}
                            <button type="button" onclick={() => { hapticFeedback.tap(); onOpenDetail(client.id); }} class="min-h-10 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 touch-manipulation" title="Akte ansehen">
                                <Eye class="w-3.5 h-3.5" />
                                <span>Akte</span>
                            </button>
                            <button type="button" onclick={() => { hapticFeedback.warning(); onDeleteClient(client.id); }} class="min-h-10 min-w-10 p-2 text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center cursor-pointer touch-manipulation" title="Ablehnen / Löschen">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
