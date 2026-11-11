<script lang="ts">
    import { Users, Plus, Phone, Mail, Edit3, Link2Off, Building2 } from "lucide-svelte";

    interface Props {
        client: any;
        contacts: any[];
        retirementHomes: any[];
        getContactRelationData: (contactId: string) => any;
        onLinkContact: () => void;
        onOpenContact: (contact: any) => void;
        onEditRelation: (contact: any, relData: any) => void;
        onUnlinkContact: (contactId: string, contactDisplayName: string) => void;
        onLinkHome: () => void;
        onOpenHome: (home: any) => void;
        onUnlinkHome: (homeId: string, homeName: string) => void;
    }

    let {
        client,
        contacts,
        retirementHomes,
        getContactRelationData,
        onLinkContact,
        onOpenContact,
        onEditRelation,
        onUnlinkContact,
        onLinkHome,
        onOpenHome,
        onUnlinkHome
    }: Props = $props();
</script>

<div class="space-y-4 sm:space-y-5 animate-enter">
    <!-- Bezugspersonen & Angehörige -->
    <div class="orga-card-white p-4 sm:p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
            <div>
                <h4 class="text-sm sm:text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Users class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Bezugspersonen & Angehörige ({contacts.length})
                </h4>
                <p class="text-xs text-neutral-500 dark:text-slate-400">Angehörige, Pflegepersonen, Bevollmächtigte und Pflegedienste</p>
            </div>
            <button
                type="button"
                onclick={onLinkContact}
                class="orga-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
                <Plus class="w-3.5 h-3.5" /> Kontakt verknüpfen
            </button>
        </div>

        {#if contacts.length === 0}
            <div class="text-center py-6 border border-dashed border-neutral-200 dark:border-slate-800 rounded-2xl bg-neutral-50/50 dark:bg-slate-800/40">
                <p class="text-xs font-semibold text-neutral-500 dark:text-slate-400">Noch keine Bezugspersonen verknüpft.</p>
                <button
                    type="button"
                    onclick={onLinkContact}
                    class="mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                    + Kontakt aus dem Adressbuch verknüpfen
                </button>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each contacts as contact (contact.id)}
                    {@const relData = getContactRelationData(contact.id)}
                    {@const relLabel = typeof relData === 'string' ? relData : (relData?.relation || '')}
                    {@const contactDisplayName = `${contact.name_first || ''} ${contact.name_last || ''}`.trim() || contact.company_name || 'Kontakt'}
                    <div class="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-neutral-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between gap-2.5">
                        <div class="flex items-start gap-2.5">
                            <div class="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {(contact.name_first?.[0] || contact.company_name?.[0] || '?').toUpperCase()}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                                    {contactDisplayName}
                                </p>
                                {#if relLabel}
                                    <div class="flex items-center gap-1 mt-0.5">
                                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                            {relLabel}
                                        </span>
                                    </div>
                                {/if}
                                <p class="text-[11px] text-neutral-500 dark:text-slate-400 mt-1 truncate">
                                    {contact.phone || contact.email || 'Keine Kontaktdaten'}
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center justify-between border-t border-neutral-100 dark:border-slate-700/60 pt-2">
                            <div class="flex items-center gap-1">
                                {#if contact.phone}
                                    <a href={`tel:${contact.phone}`} class="p-1 text-neutral-500 hover:text-emerald-600 rounded" title="Anrufen">
                                        <Phone class="w-3.5 h-3.5" />
                                    </a>
                                {/if}
                                {#if contact.email}
                                    <a href={`mailto:${contact.email}`} class="p-1 text-neutral-500 hover:text-indigo-600 rounded" title="E-Mail">
                                        <Mail class="w-3.5 h-3.5" />
                                    </a>
                                {/if}
                            </div>

                            <div class="flex items-center gap-1">
                                <button
                                    type="button"
                                    onclick={() => onEditRelation(contact, relData)}
                                    class="p-1 text-neutral-400 hover:text-indigo-600 rounded cursor-pointer"
                                    title="Rolle / Vollmacht bearbeiten"
                                >
                                    <Edit3 class="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onclick={() => onOpenContact(contact)}
                                    class="text-xs font-bold text-indigo-600 hover:underline px-1 cursor-pointer"
                                >
                                    Details
                                </button>
                                <button
                                    type="button"
                                    onclick={() => onUnlinkContact(contact.id, contactDisplayName)}
                                    class="p-1 text-neutral-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Trennen"
                                >
                                    <Link2Off class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Pflegeheime & Residenzen -->
    <div class="orga-card-white p-4 sm:p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
            <div>
                <h4 class="text-sm sm:text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Building2 class="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Pflegeheime & Residenzen ({retirementHomes.length})
                </h4>
                <p class="text-xs text-neutral-500 dark:text-slate-400">Stationäre Einrichtungen & Residenzen</p>
            </div>
            <button
                type="button"
                onclick={onLinkHome}
                class="orga-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
                <Plus class="w-3.5 h-3.5" /> Pflegeheim verknüpfen
            </button>
        </div>

        {#if retirementHomes.length === 0}
            <div class="text-center py-6 border border-dashed border-neutral-200 dark:border-slate-800 rounded-2xl bg-neutral-50/50 dark:bg-slate-800/40">
                <p class="text-xs font-semibold text-neutral-500 dark:text-slate-400">Kein Pflegeheim verknüpft (Klient wohnt ambulant/zu Hause).</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each retirementHomes as home (home.id)}
                    <div class="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-neutral-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 transition-all flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onclick={() => onOpenHome(home)}
                            class="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                            <div class="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-base shrink-0">
                                🏠
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">{home.name}</p>
                                <p class="text-[11px] text-neutral-500 dark:text-slate-400 truncate">{home.address || 'Keine Adresse'}</p>
                            </div>
                        </button>

                        <div class="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onclick={() => onOpenHome(home)}
                                class="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline px-1.5 cursor-pointer"
                            >
                                Details
                            </button>
                            <button
                                type="button"
                                onclick={() => onUnlinkHome(home.id, home.name || 'Pflegeheim')}
                                class="p-1 text-neutral-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Trennen"
                            >
                                <Link2Off class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
