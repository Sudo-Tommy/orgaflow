<script lang="ts">
    import { Users, Plus, Star, ScrollText, Edit3, Link2Off } from "lucide-svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let {
        contacts = [],
        clientData,
        onLinkContact,
        onOpenContact,
        onEditRelation,
        onUnlinkContact
    } = $props<{
        contacts: any[];
        clientData: any;
        onLinkContact: () => void;
        onOpenContact: (contact: any) => void;
        onEditRelation: (contact: any, relData: any) => void;
        onUnlinkContact: (contactId: string, name: string) => void;
    }>();

    let sortedContacts = $derived.by(() => {
        return sortAlphabetical(contacts || [], (c: any) => `${c.name_first || ''} ${c.name_last || ''}`.trim() || c.company_name || '');
    });

    function getContactRelationData(contactId: string) {
        const rels = clientData?.contact_relations;
        if (!rels || !rels[contactId]) return null;
        const data = rels[contactId];
        if (typeof data === 'string') return { relation: data, is_primary: false, has_power_of_attorney: false };
        return data;
    }
</script>

<div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col border-l-4 border-l-emerald-500">
    <div class="p-5 sm:p-6 border-b border-neutral-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50 dark:bg-slate-800/40">
        <h3 class="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
            <span class="w-9 h-9 flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 shadow-xs">
                <Users class="w-4 h-4" />
            </span>
            <span>Bezugspersonen</span>
            {#if sortedContacts.length > 0}
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {sortedContacts.length}
                </span>
            {/if}
        </h3>
        <button onclick={onLinkContact} aria-label="Kontakt verknüpfen" title="Kontakt verknüpfen" class="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer min-h-[44px] min-w-[44px]">
            <Plus class="w-4 h-4" />
        </button>
    </div>
    <div class="p-5 sm:p-6 flex-1">
        {#if sortedContacts.length === 0}
            <div class="text-center py-8">
                <Users class="w-10 h-10 text-neutral-300 dark:text-slate-600 mx-auto mb-2" />
                <p class="text-neutral-400 dark:text-slate-500 text-sm mb-3">Keine Kontakte hinterlegt.</p>
                <button onclick={onLinkContact} class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 text-sm font-bold transition-colors cursor-pointer min-h-[44px]">Jetzt verknüpfen &rarr;</button>
            </div>
        {:else}
            <ul class="space-y-3">
                {#each sortedContacts as contact}
                    {@const relData = getContactRelationData(contact.id)}
                    {@const contactDisplayName = `${contact.name_first || ''} ${contact.name_last || ''}`.trim() || contact.company_name || 'Kontakt'}
                    <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-50/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-neutral-200/70 dark:border-slate-700/70 transition-all group shadow-xs hover:shadow-md">
                        <button type="button" onclick={() => onOpenContact(contact)} class="flex-1 text-left flex items-center gap-3 cursor-pointer min-w-0 min-h-[44px]">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0 shadow-inner">
                                {(contact.name_first?.charAt(0) || contact.company_name?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">
                                        {contactDisplayName}
                                    </p>
                                    {#if relData?.relation}
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                            {relData.relation}
                                        </span>
                                    {:else if contact.company_name}
                                        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-700 text-neutral-600 dark:text-slate-300 border border-neutral-200/60 dark:border-slate-600 shrink-0">
                                            {contact.company_name}
                                        </span>
                                    {/if}
                                    {#if relData?.is_primary}
                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0 flex items-center gap-1" title="Hauptansprechpartner/in">
                                            <Star class="w-3 h-3 fill-amber-500 text-amber-500" /> Hauptkontakt
                                        </span>
                                    {/if}
                                    {#if relData?.has_power_of_attorney}
                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0 flex items-center gap-1" title="Hat Vorsorgevollmacht">
                                            <ScrollText class="w-3 h-3" /> Vollmacht
                                        </span>
                                    {/if}
                                </div>
                                <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1 truncate">
                                    {contact.phone || contact.email || 'Keine Direktkontaktdaten hinterlegt'}
                                </p>
                            </div>
                        </button>
                        <div class="flex items-center gap-1 shrink-0">
                            <button 
                                type="button" 
                                onclick={() => onEditRelation(contact, relData)}
                                class="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                                title="Beziehung / Rolle anpassen"
                                aria-label="Beziehung bearbeiten"
                            >
                                <Edit3 class="w-4 h-4" />
                            </button>
                            <button 
                                type="button" 
                                onclick={() => onOpenContact(contact)} 
                                class="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400 px-2.5 py-1 text-xs font-bold uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg hidden sm:block cursor-pointer min-h-[44px]"
                            >
                                Details
                            </button>
                            <button 
                                type="button" 
                                onclick={() => onUnlinkContact(contact.id, contactDisplayName)}
                                class="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                                title="Verknüpfung aufheben"
                                aria-label="Verknüpfung aufheben"
                            >
                                <Link2Off class="w-4 h-4 text-rose-500" />
                            </button>
                        </div>
                    </div>
                {/each}
            </ul>
        {/if}
    </div>
</div>
