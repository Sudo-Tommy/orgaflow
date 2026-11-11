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

<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {#each filteredContacts as contact (contact.id)}
        {@const whatsapp = formatWhatsAppUrl(contact.phone)}
        {@const cType = getContactType(contact, clientsList)}
        {@const typeConf = getContactTypeConfig(cType)}
        <div 
            role="button" 
            tabindex="0" 
            onclick={() => onOpenContact(contact)} 
            onkeydown={(e) => { if (e.key === 'Enter') onOpenContact(contact); }} 
            class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
            <div>
                <!-- Karte Header: Avatar, Name & 1-Klick-Portal-Freigabe -->
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-sm shadow-indigo-500/20">
                            {getInitials(contact.name_first, contact.name_last, contact.company_name)}
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {#if contact.name_first || contact.name_last}
                                    {contact.name_first || ''} {contact.name_last || ''}
                                {:else if contact.company_name}
                                    {contact.company_name}
                                {:else}
                                    Unbekannt
                                {/if}
                            </h3>
                            {#if contact.company_name && (contact.name_first || contact.name_last)}
                                <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {contact.company_name}
                                </p>
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

                    <!-- 1-Klick Schnell-Schalter für Portal-Freigabe -->
                    <button
                        type="button"
                        onclick={(e) => onTogglePortalActive(contact, e)}
                        class="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border {contact.portal_active 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
                        title={contact.portal_active ? 'Portal-Zugang freigegeben – Klick zum Sperren' : 'Portal-Zugang gesperrt – Klick zur Freigabe'}
                    >
                        <span class="w-2 h-2 rounded-full {contact.portal_active ? 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700 animate-pulse' : 'bg-slate-400'}"></span>
                        <span>{contact.portal_active ? 'Portal: Aktiv' : 'Portal: Aus'}</span>
                    </button>
                </div>

                <!-- Adresse & Erreichbarkeit -->
                <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 py-2 border-t border-slate-100 dark:border-slate-800/80">
                    {#if contact.street || contact.city}
                        <div class="flex items-center gap-2 truncate">
                            <span class="text-amber-500 text-sm shrink-0">📍</span>
                            <span class="truncate">{contact.street || ''} {contact.housenr || ''}{contact.street && contact.city ? ', ' : ''}{contact.zip || ''} {contact.city || ''}</span>
                        </div>
                    {/if}
                    {#if contact.phone}
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 truncate min-w-0">
                                <span class="text-indigo-500 text-sm shrink-0">📞</span>
                                <span class="font-mono truncate">{contact.phone}</span>
                            </div>
                            <button 
                                type="button" 
                                onclick={(e) => { e.stopPropagation(); copyToClipboard(contact.phone, 'Telefonnummer'); }} 
                                class="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer shrink-0" 
                                title="Nummer kopieren"
                            >📋</button>
                        </div>
                    {/if}
                    {#if contact.email}
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 truncate min-w-0">
                                <span class="text-emerald-500 text-sm shrink-0">✉️</span>
                                <span class="truncate">{contact.email}</span>
                            </div>
                            <button 
                                type="button" 
                                onclick={(e) => { e.stopPropagation(); copyToClipboard(contact.email, 'E-Mail'); }} 
                                class="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer shrink-0" 
                                title="E-Mail kopieren"
                            >📋</button>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- 1-Klick Aktionen Fußleiste -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5 mt-2">
                <div class="flex items-center gap-1">
                    {#if contact.phone}
                        <a 
                            href="tel:{contact.phone}" 
                            onclick={(e) => e.stopPropagation()}
                            class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center justify-center shadow-2xs" 
                            title="Anrufen"
                        >📞</a>
                    {/if}
                    {#if contact.email}
                        <a 
                            href="mailto:{contact.email}" 
                            onclick={(e) => e.stopPropagation()}
                            class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center justify-center shadow-2xs" 
                            title="E-Mail schreiben"
                        >✉️</a>
                    {/if}
                    {#if whatsapp}
                        <a 
                            href={whatsapp} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onclick={(e) => e.stopPropagation()}
                            class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors flex items-center justify-center shadow-2xs" 
                            title="WhatsApp Chat"
                        >💬</a>
                    {/if}
                    <button 
                        type="button" 
                        onclick={(e) => { e.stopPropagation(); downloadVCard(contact); }} 
                        class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center justify-center shadow-2xs cursor-pointer" 
                        title="vCard (.vcf) Visitenkarte herunterladen"
                    >📇</button>
                </div>

                <div class="flex items-center gap-1.5">
                    {#if isSuspectedRetirementHome(contact)}
                        <button 
                            type="button" 
                            onclick={(e) => { e.stopPropagation(); onConvertToRetirementHome(contact); }} 
                            class="py-1.5 px-2.5 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="In Pflegeheime & Einrichtungen verschieben"
                        >
                            <span>🏥</span> <span>In Heime</span>
                        </button>
                    {/if}
                    <button 
                        type="button" 
                        onclick={(e) => { e.stopPropagation(); onOpenShareQr(contact); }} 
                        class="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center justify-center shadow-2xs cursor-pointer" 
                        title="QR-Freigabe"
                    >📱</button>
                    <button 
                        type="button" 
                        onclick={(e) => { e.stopPropagation(); onOpenPortalAccess(contact); }} 
                        class="py-1.5 px-3 min-h-[40px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <span>🪪</span> <span>Portal</span>
                    </button>
                </div>
            </div>
        </div>
    {/each}
</div>
