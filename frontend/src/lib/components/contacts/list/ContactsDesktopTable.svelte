<script lang="ts">
    import type { ClientRecord } from "$lib/types/orgaTypes";
    import {
        downloadVCard,
        copyToClipboard,
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

<table class="w-full text-left border-collapse min-w-160">
    <thead class="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80">
        <tr>
            <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Name & Status</th>
            <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Firma / Praxis</th>
            <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Erreichbarkeit</th>
            <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Adresse</th>
            <th class="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right">Schnellaktionen</th>
        </tr>
    </thead>
    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
        {#each filteredContacts as contact (contact.id)}
            {@const whatsapp = formatWhatsAppUrl(contact.phone)}
            {@const cType = getContactType(contact, clientsList)}
            {@const typeConf = getContactTypeConfig(cType)}
            <tr onclick={() => onOpenContact(contact)} class="hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer">
                <!-- Name & Avatar -->
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-2xs">
                            {getInitials(contact.name_first, contact.name_last, contact.company_name)}
                        </div>
                        <div class="min-w-0">
                            <p class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {#if contact.name_first || contact.name_last}
                                    {contact.name_first || ''} {contact.name_last || ''}
                                {:else if contact.company_name}
                                    {contact.company_name}
                                {:else}
                                    Unbekannt
                                {/if}
                            </p>
                            <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                {#if isSuspectedRetirementHome(contact)}
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                        <span>🏥</span> Pflegeheim?
                                    </span>
                                {/if}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold {typeConf.badgeClass}">
                                    <span>{typeConf.icon}</span> {typeConf.shortLabel}
                                </span>
                                <!-- 1-Klick Schnellschalter Portal in der Tabelle -->
                                <button
                                    type="button"
                                    onclick={(e) => onTogglePortalActive(contact, e)}
                                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border cursor-pointer {contact.portal_active 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'}"
                                    title={contact.portal_active ? 'Portal-Zugang freigegeben – Klick zum Sperren' : 'Portal-Zugang gesperrt – Klick zur Freigabe'}
                                >
                                    <span class="w-1.5 h-1.5 rounded-full {contact.portal_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
                                    <span>{contact.portal_active ? '✓ Portal freigegeben' : '✕ Portal gesperrt'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </td>

                <!-- Firma -->
                <td class="p-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {#if contact.company_name}
                        <span class="font-semibold text-slate-900 dark:text-slate-100">{contact.company_name}</span>
                    {:else}
                        <span class="text-slate-400">-</span>
                    {/if}
                </td>

                <!-- Erreichbarkeit mit 1-Klick Kopieren -->
                <td class="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {#if contact.phone}
                        <div class="flex items-center gap-1.5 truncate">
                            <span class="text-indigo-500">📞</span>
                            <span class="font-mono">{contact.phone}</span>
                            <button 
                                type="button" 
                                onclick={(e) => { e.stopPropagation(); copyToClipboard(contact.phone, 'Telefonnummer'); }} 
                                class="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer" 
                                title="Nummer kopieren"
                            >📋</button>
                        </div>
                    {/if}
                    {#if contact.email}
                        <div class="flex items-center gap-1.5 truncate mt-1">
                            <span class="text-emerald-500">✉️</span>
                            <span class="truncate">{contact.email}</span>
                            <button 
                                type="button" 
                                onclick={(e) => { e.stopPropagation(); copyToClipboard(contact.email, 'E-Mail'); }} 
                                class="text-slate-400 hover:text-emerald-600 p-0.5 rounded cursor-pointer" 
                                title="E-Mail kopieren"
                            >📋</button>
                        </div>
                    {/if}
                    {#if !contact.phone && !contact.email}
                        <span class="text-slate-400 italic">Keine Angaben</span>
                    {/if}
                </td>

                <!-- Adresse -->
                <td class="p-4 text-xs text-slate-600 dark:text-slate-300">
                    {#if contact.street || contact.city}
                        <p class="font-medium text-slate-900 dark:text-slate-200">{contact.street || ''} {contact.housenr || ''}</p>
                        <p class="text-slate-500 dark:text-slate-400 mt-0.5">{contact.zip || ''} {contact.city || ''}</p>
                    {:else}
                        <span class="text-slate-400 italic">-</span>
                    {/if}
                </td>

                <!-- Schnellaktionen Spalte -->
                <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-1.5 flex-wrap">
                        {#if contact.phone}
                            <a href="tel:{contact.phone}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center justify-center transition-colors shadow-2xs" title="Anrufen">📞</a>
                        {/if}
                        {#if contact.email}
                            <a href="mailto:{contact.email}" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-2xs" title="E-Mail">✉️</a>
                        {/if}
                        {#if whatsapp}
                            <a href={whatsapp} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 hover:bg-green-100 flex items-center justify-center transition-colors shadow-2xs" title="WhatsApp Chat">💬</a>
                        {/if}
                        {#if isSuspectedRetirementHome(contact)}
                            <button 
                                type="button" 
                                onclick={(e) => { e.stopPropagation(); onConvertToRetirementHome(contact); }} 
                                class="py-1.5 px-3 min-h-[38px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                                title="Diesen Eintrag in Pflegeheime & Einrichtungen verschieben"
                            >
                                <span>🏥</span> <span>In Heime</span>
                            </button>
                        {/if}
                        <button type="button" onclick={(e) => { e.stopPropagation(); downloadVCard(contact); }} class="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="vCard Visitenkarte">📇</button>
                        <button type="button" onclick={(e) => { e.stopPropagation(); onOpenShareQr(contact); }} class="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="QR-Freigabe">📱</button>
                        <button type="button" onclick={(e) => { e.stopPropagation(); onOpenPortalAccess(contact); }} class="py-1.5 px-3 min-h-[38px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer">
                            <span>🪪</span> <span>Portal</span>
                        </button>
                    </div>
                </td>
            </tr>
        {/each}
    </tbody>
</table>
