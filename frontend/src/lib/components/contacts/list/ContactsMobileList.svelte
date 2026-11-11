<script lang="ts">
    import type { ClientRecord } from "$lib/types/orgaTypes";
    import {
        downloadVCard,
        formatWhatsAppUrl,
        getInitials,
        getContactType,
        getContactTypeConfig,
        isSuspectedRetirementHome
    } from "$lib/components/contacts/contactDetailHelpers";

    interface Props {
        filteredContacts: any[];
        clientsList: ClientRecord[];
        onOpenContact: (contact: any) => void;
        onTogglePortalActive: (contact: any, event?: Event) => void;
        onOpenPortalAccess: (contact: any) => void;
        onOpenShareQr: (contact: any) => void;
        onConvertToRetirementHome: (contact: any) => void;
    }

    let {
        filteredContacts,
        clientsList,
        onOpenContact,
        onTogglePortalActive,
        onOpenPortalAccess,
        onOpenShareQr,
        onConvertToRetirementHome
    }: Props = $props();
</script>

<div class="divide-y divide-slate-100 dark:divide-slate-800">
    {#each filteredContacts as contact (contact.id)}
        {@const whatsapp = formatWhatsAppUrl(contact.phone)}
        {@const cType = getContactType(contact, clientsList)}
        {@const typeConf = getContactTypeConfig(cType)}
        <div 
            role="button" 
            tabindex="0" 
            onclick={() => onOpenContact(contact)} 
            onkeydown={(e) => { if (e.key === 'Enter') onOpenContact(contact); }} 
            class="p-4 flex flex-col gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center text-base shrink-0 shadow-2xs">
                        {getInitials(contact.name_first, contact.name_last, contact.company_name)}
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {#if contact.name_first || contact.name_last}
                                {contact.name_first || ''} {contact.name_last || ''}
                            {:else if contact.company_name}
                                {contact.company_name}
                            {:else}
                                Unbekannt
                            {/if}
                        </h3>
                        {#if contact.company_name && (contact.name_first || contact.name_last)}
                            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{contact.company_name}</p>
                        {:else if contact.city}
                            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">📍 {contact.city}</p>
                        {/if}
                        <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                            {#if isSuspectedRetirementHome(contact)}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                    <span>🏥</span> Pflegeheim?
                                </span>
                            {/if}
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold {typeConf.badgeClass}">
                                <span>{typeConf.icon}</span> {typeConf.shortLabel}
                            </span>
                        </div>
                    </div>
                </div>
                <!-- 1-Klick Schnellschalter Mobile -->
                <button
                    type="button"
                    onclick={(e) => onTogglePortalActive(contact, e)}
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border {contact.portal_active 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}"
                    title={contact.portal_active ? 'Portal-Zugang freigegeben – Klick zum Sperren' : 'Portal-Zugang gesperrt – Klick zur Freigabe'}
                >
                    <span class="w-2 h-2 rounded-full {contact.portal_active ? 'bg-emerald-500 ring-2 ring-emerald-300 animate-pulse' : 'bg-slate-400'}"></span>
                    <span>{contact.portal_active ? 'Portal: Aktiv' : 'Portal: Aus'}</span>
                </button>
            </div>

            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div class="flex items-center gap-1">
                    {#if contact.phone}
                        <a href="tel:{contact.phone}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center" title="Anrufen">📞</a>
                    {/if}
                    {#if contact.email}
                        <a href="mailto:{contact.email}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center" title="E-Mail">✉️</a>
                    {/if}
                    {#if whatsapp}
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 flex items-center justify-center" title="WhatsApp">💬</a>
                    {/if}
                    <button type="button" onclick={(e) => { e.stopPropagation(); downloadVCard(contact); }} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer" title="vCard">📇</button>
                </div>
                <div class="flex items-center gap-1.5">
                    {#if isSuspectedRetirementHome(contact)}
                        <button 
                            type="button" 
                            onclick={(e) => { e.stopPropagation(); onConvertToRetirementHome(contact); }} 
                            class="py-1.5 px-2.5 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                            title="In Pflegeheime verschieben"
                        >
                            <span>🏥</span> <span>In Heime</span>
                        </button>
                    {/if}
                    <button type="button" onclick={(e) => { e.stopPropagation(); onOpenShareQr(contact); }} class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer" title="QR-Code">📱</button>
                    <button type="button" onclick={(e) => { e.stopPropagation(); onOpenPortalAccess(contact); }} class="py-1.5 px-3 min-h-[40px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1">
                        <span>🪪</span> <span>Portal</span>
                    </button>
                </div>
            </div>
        </div>
    {/each}
</div>
