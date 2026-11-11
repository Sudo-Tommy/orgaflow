<script lang="ts">
    import { PhoneCall, Plus, HeartHandshake, Phone, Mail, Edit2, Trash2, Building } from "lucide-svelte";

    let {
        client,
        onAddContact = () => {},
        onEditContact = () => {},
        onDeleteContact = () => {}
    }: {
        client: any;
        onAddContact?: () => void;
        onEditContact?: (c: any) => void;
        onDeleteContact?: (id: string) => void;
    } = $props();

    const contactsList = $derived(Array.isArray(client.expand?.contacts) ? client.expand.contacts : (client.expand?.contacts ? [client.expand.contacts] : []));
    const retirementHomeObj = $derived(Array.isArray(client.expand?.retirement_homes) ? client.expand.retirement_homes[0] : client.expand?.retirement_homes);

    function getContactRole(c: any): string {
        if (typeof c?.notes === 'object' && c.notes !== null) return c.notes.role || c.notes.relationship || 'Kontakt';
        return typeof c?.notes === 'string' && c.notes.trim() ? c.notes : 'Bezugsperson';
    }
    function getContactDetails(c: any): string {
        return typeof c?.notes === 'object' && c.notes !== null ? (c.notes.details || c.notes.note || '') : '';
    }
</script>

<div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h3 class="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PhoneCall class="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Wichtige Kontakte & Notfallpersonen
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Angehörige, Notfallkontakte, Hausärzte und Pflegedienste</p>
        </div>
        <button type="button" onclick={onAddContact} class="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0">
            <Plus class="w-4 h-4" /> Kontakt hinterlegen
        </button>
    </div>

    {#if contactsList.length === 0}
        <div class="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            <HeartHandshake class="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-500" />
            <p class="font-bold text-slate-700 dark:text-slate-300">Noch keine Kontakte eingetragen.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each contactsList as contact}
                {@const role = getContactRole(contact)}
                {@const details = getContactDetails(contact)}
                <div class="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-4 group">
                    <div>
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-start gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200">
                                    {(contact.name_first?.charAt(0) || '')}{(contact.name_last?.charAt(0) || '')}
                                </div>
                                <div class="min-w-0">
                                    <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{contact.name_first} {contact.name_last}</h4>
                                    {#if contact.company_name}<p class="text-xs text-slate-500 font-medium truncate">{contact.company_name}</p>{/if}
                                </div>
                            </div>
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">{role}</span>
                        </div>
                        {#if details}<p class="text-xs text-slate-600 mt-2.5 p-2 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200/60">{details}</p>{/if}
                    </div>

                    <div class="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            {#if contact.phone || contact.handy}
                                <a href="tel:{contact.phone || contact.handy}" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"><Phone class="w-3 h-3" /> Anrufen</a>
                            {/if}
                            {#if contact.email}
                                <a href="mailto:{contact.email}" class="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"><Mail class="w-3 h-3" /> Mail</a>
                            {/if}
                        </div>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick={() => onEditContact(contact)} class="w-8 h-8 rounded-lg bg-slate-200/70 hover:bg-indigo-100 text-slate-600 flex items-center justify-center cursor-pointer" title="Bearbeiten"><Edit2 class="w-3.5 h-3.5" /></button>
                            <button type="button" onclick={() => onDeleteContact(contact.id)} class="w-8 h-8 rounded-lg bg-slate-200/70 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center cursor-pointer" title="Löschen"><Trash2 class="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

{#if retirementHomeObj}
    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0 border border-amber-200">
                <Building class="w-6 h-6" />
            </div>
            <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pflegeheim / Einrichtung</span>
                <h4 class="font-bold text-slate-900 dark:text-slate-100 text-base">{retirementHomeObj.name}</h4>
                <p class="text-xs text-slate-600">{retirementHomeObj.address || ''} {retirementHomeObj.address_addition || ''}</p>
            </div>
        </div>
        {#if retirementHomeObj.phone}
            <a href="tel:{retirementHomeObj.phone}" class="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-800 border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold shrink-0">
                <Phone class="w-3.5 h-3.5 text-amber-600" /> {retirementHomeObj.phone}
            </a>
        {/if}
    </div>
{/if}
