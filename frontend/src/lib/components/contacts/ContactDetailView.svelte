<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import type { ClientRecord, RetirementHomeRecord } from "$lib/types/orgaTypes";
    import type { ContactModalState } from "./contactModalState.svelte";
    import {
        getInitials,
        formatFullName,
        getFormattedAddress,
        buildGoogleMapsUrl,
        getClientSubtitle,
        resolveRecords,
        classifyPhoneNumber,
        copyToClipboard,
        getContactType,
        getContactTypeConfig,
        parseContactNotes,
        isSuspectedRetirementHome,
        convertContactToRetirementHome
    } from "./contactDetailHelpers";
    import ContactDetailHeaderCard from "./ContactDetailHeaderCard.svelte";
    import ContactDetailRelationsSection, { type RelationItem } from "./ContactDetailRelationsSection.svelte";

    let { 
        state, 
        onOpenPortal 
    }: { 
        state: ContactModalState; 
        onOpenPortal?: () => void;
    } = $props();

    // Reaktive Präsentationsdaten
    const initials = $derived(getInitials(state.name_first, state.name_last, state.company_name));
    const fullName = $derived(formatFullName(state.name_first, state.name_last, state.salutation));
    const formattedBirthdate = $derived(state.birthdate ? state.safeFormatDate(state.birthdate) : "");
    const address = $derived(getFormattedAddress(state.street, state.housenr, state.zip, state.city));
    const mapsUrl = $derived(address ? buildGoogleMapsUrl(state.company_name || fullName, address) : "");
    const phoneInfo = $derived(classifyPhoneNumber(state.phone));
    const whatsappDirectUrl = $derived(phoneInfo ? `https://wa.me/${phoneInfo.waNumber}` : "");
    const whatsappShareUrl = $derived(phoneInfo ? `https://api.whatsapp.com/send?phone=${phoneInfo.waNumber}` : "");

    const clientsById = $derived(new Map(((orgaStore.clients?.data || []) as ClientRecord[]).map((c) => [c.id, c])));
    const homesById = $derived(new Map(((orgaStore.retirement_homes?.data || []) as RetirementHomeRecord[]).map((h) => [h.id, h])));

    const contactType = $derived(
        state.contact_type || (state.currentRecord ? getContactType(state.currentRecord, (orgaStore.clients?.data || []) as ClientRecord[]) : 'unassigned')
    );
    const typeConfig = $derived(getContactTypeConfig(contactType as any));
    const cleanNotes = $derived(parseContactNotes(state.notes).text);
    const isRetirementHome = $derived(state.currentRecord ? isSuspectedRetirementHome(state.currentRecord) : false);

    const clientItems = $derived<RelationItem[]>(
        resolveRecords(state.linkedClients, clientsById).map((c) => ({
            id: c.id,
            badge: getInitials(c.name_first, c.name_last, ""),
            badgeClass: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400",
            title: formatFullName(c.name_first, c.name_last),
            subtitle: getClientSubtitle(c),
            caregiver: c.caregiver === state.editId
        }))
    );

    const homeItems = $derived<RelationItem[]>(
        resolveRecords(state.linkedHomes, homesById).map((h) => ({
            id: h.id,
            badge: "🏥",
            badgeClass: "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400",
            title: h.name || "Unbenanntes Heim",
            subtitle: h.address || ""
        }))
    );

    const mailingItems = $derived<RelationItem[]>(
        resolveRecords(state.linkedMailingLists, clientsById).map((c) => ({
            id: c.id,
            badge: "📧",
            badgeClass: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
            title: formatFullName(c.name_first, c.name_last),
            subtitle: "Erhält automatische E-Mail-Kopien (CC)"
        }))
    );
</script>

{#snippet infoItem(icon: string, colorClass: string, label: string, value: string, copyVal = "", extraClass = "")}
    <div class="flex items-start justify-between gap-4 py-2 border-b border-slate-100/80 dark:border-slate-800/80 last:border-0">
        <div class="flex items-start gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-xl {colorClass} flex items-center justify-center shrink-0 shadow-2xs">
                <span class="text-base">{icon}</span>
            </div>
            <div class="min-w-0">
                <p class="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                <p class="text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base {extraClass}">{value}</p>
            </div>
        </div>
        {#if copyVal && copyVal !== "Nicht hinterlegt"}
            <button 
                type="button" 
                onclick={() => copyToClipboard(copyVal, label)}
                class="p-2 min-h-[40px] min-w-[40px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0" 
                title="{label} kopieren"
            >
                <span class="text-base">📋</span>
            </button>
        {/if}
    </div>
{/snippet}

<div class="space-y-5 sm:space-y-6">
    <!-- Warnung/Aktion: Kontakt ist ein Pflegeheim -->
    {#if isRetirementHome && state.currentRecord}
        <div class="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-4 rounded-3xl border-2 border-amber-500/40 dark:border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div class="flex items-start sm:items-center gap-3.5">
                <span class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-2xs">🏥</span>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Dieser Kontakt scheint ein Pflegeheim zu sein</span>
                        <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-extrabold">Einrichtung</span>
                    </h4>
                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Möchten Sie diesen Eintrag mit allen Daten in den Bereich „Pflegeheime & Einrichtungen“ verschieben?
                    </p>
                </div>
            </div>
            <button
                type="button"
                onclick={async () => {
                    const ok = await convertContactToRetirementHome(state.currentRecord!);
                    if (ok) state.close();
                }}
                class="orga-button-primary min-h-[42px] py-2 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 text-white border-none shadow-amber-600/20 shrink-0 cursor-pointer flex items-center gap-2 active:scale-95 transition-all w-full sm:w-auto justify-center"
            >
                <span>🏥</span> In Heime verschieben
            </button>
        </div>
    {/if}

    <!-- Header-Kachel mit Avatar & Schnell-Aktionen (Ausgelagert) -->
    <ContactDetailHeaderCard
        {state}
        {initials}
        {fullName}
        {typeConfig}
        {phoneInfo}
        {whatsappDirectUrl}
        {whatsappShareUrl}
        {mapsUrl}
        {address}
    />

    <!-- Portal-Zugang Schnell-Info -->
    {#if onOpenPortal && state.editId}
        <div class="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 p-4 sm:p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xl shrink-0 shadow-2xs">🪪</div>
                <div>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Klienten- & Angehörigen-Portal</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                        {state.hasPortalAccess ? 'Zugangsschlüssel oder PIN hinterlegt. Vor-Ort-Freigabe & Dokumenteneinsicht aktiv.' : 'Noch kein PIN vergeben. Erstellen Sie eine Zugangskarte für diesen Kontakt.'}
                    </p>
                </div>
            </div>
            <button 
                type="button" 
                onclick={onOpenPortal}
                class="orga-button-primary min-h-[42px] py-2 px-4 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shrink-0 shadow-indigo-600/20"
            >
                <span>🪪</span> Portal-Karte öffnen
            </button>
        </div>
    {/if}

    <!-- Kontaktdaten Detail-Card -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Stammdaten & Erreichbarkeit</h3>

        <div class="space-y-1">
            {#if formattedBirthdate}
                {@render infoItem("🎂", "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400", "Geburtsdatum", formattedBirthdate, formattedBirthdate)}
            {/if}

            {@render infoItem("📞", "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400", phoneInfo?.label ?? "Telefon", state.phone || "Nicht hinterlegt", state.phone)}
            {@render infoItem("✉️", "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400", "E-Mail", state.email || "Nicht hinterlegt", state.email, "break-all")}

            <div class="flex items-start justify-between gap-4 py-2 border-b border-slate-100/80 dark:border-slate-800/80 last:border-0">
                <div class="flex items-start gap-3.5 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                        <span class="text-base">🏠</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Adresse</p>
                        <p class="text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base leading-relaxed">
                            {#if address}
                                {#if address.line1}{address.line1}<br />{/if}
                                {address.line2}
                            {:else}
                                Nicht hinterlegt
                            {/if}
                        </p>
                    </div>
                </div>
                {#if address}
                    <button 
                        type="button" 
                        onclick={() => copyToClipboard([address.line1, address.line2].filter(Boolean).join(", "), "Adresse")}
                        class="p-2 min-h-[40px] min-w-[40px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0" 
                        title="Adresse kopieren"
                    >
                        <span class="text-base">📋</span>
                    </button>
                {/if}
            </div>
        </div>

        {#if cleanNotes}
            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Notizen</p>
                <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/80">
                    <p class="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{cleanNotes}</p>
                </div>
            </div>
        {/if}

        {#if state.existingSignatureUrl}
            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Hinterlegte Unterschrift</p>
                <div class="bg-white rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex justify-center shadow-2xs">
                    <img src={state.existingSignatureUrl} alt="Unterschrift" class="max-h-28 object-contain bg-white rounded-lg p-2" />
                </div>
            </div>
        {/if}

        <!-- Ausgelagerte Zuweisungs-Detailanzeige -->
        <ContactDetailRelationsSection {clientItems} {homeItems} {mailingItems} />
    </div>
</div>
