<script lang="ts">
    import type { ContactModalState } from "./contactModalState.svelte";
    import { copyToClipboard } from "./contactDetailHelpers";
    import { Mail, Phone, MessageSquare, ShieldCheck, ShieldAlert, MapPin, Copy, ExternalLink } from "lucide-svelte";

    interface Props {
        state: ContactModalState;
        initials: string;
        fullName: string;
        typeConfig: { label: string; icon: string; badgeClass: string };
        phoneInfo: { waNumber: string; isMobile: boolean; isLandline: boolean; label: string } | null;
        whatsappDirectUrl: string;
        whatsappShareUrl: string;
        mapsUrl: string;
        address: { line1: string; line2: string } | null;
        onOpenPortal?: () => void;
        onOpenMail?: () => void;
    }

    let {
        state,
        initials,
        fullName,
        typeConfig,
        phoneInfo,
        whatsappDirectUrl,
        whatsappShareUrl,
        mapsUrl,
        address,
        onOpenPortal,
        onOpenMail
    }: Props = $props();

    function copyFullContactData() {
        const parts: string[] = [];
        if (fullName) parts.push(fullName);
        if (state.company_name) parts.push(state.company_name);
        if (state.phone) parts.push(`Tel: ${state.phone}`);
        if (state.email) parts.push(`E-Mail: ${state.email}`);
        if (address) {
            const addrStr = [address.line1, address.line2].filter(Boolean).join(", ");
            parts.push(`Adresse: ${addrStr}`);
        }
        if (state.notes) parts.push(`Notiz: ${state.notes}`);
        copyToClipboard(parts.join("\n"), "Kontaktdaten");
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-xs relative overflow-hidden space-y-4">
    <!-- Oberer Bereich: Profil, Typ & Portal-Freigabeschalter -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center text-lg sm:text-2xl shrink-0 shadow-md shadow-indigo-500/20">
                {initials}
            </div>
            <div class="min-w-0">
                <h2 class="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 truncate">
                    {fullName || state.company_name || 'Neuer Kontakt'}
                </h2>
                {#if state.company_name && fullName}
                    <p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5 truncate">
                        {state.company_name}
                    </p>
                {/if}
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold {typeConfig.badgeClass} shadow-2xs">
                        <span>{typeConfig.icon}</span> {typeConfig.label}
                    </span>
                    {#if state.linkedClients.length > 0}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            👥 {state.linkedClients.length} {state.linkedClients.length === 1 ? 'Klient' : 'Klienten'}
                        </span>
                    {/if}
                    {#if state.linkedHomes.length > 0}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            🏥 {state.linkedHomes.length} {state.linkedHomes.length === 1 ? 'Heim' : 'Heime'}
                        </span>
                    {/if}
                </div>
            </div>
        </div>

        <!-- 1-Klick Portal-Freigabe Schalter -->
        <div class="shrink-0 flex items-center">
            <button
                type="button"
                onclick={() => state.togglePortalActive()}
                class="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm border transition-all cursor-pointer shadow-xs active:scale-95 {
                    state.portal_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }"
                title={state.portal_active ? 'Klicken, um den Portal-Zugang für diesen Kontakt zu sperren' : 'Klicken, um den Portal-Zugang für diesen Kontakt freizuschalten'}
            >
                {#if state.portal_active}
                    <ShieldCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Portal: Freigegeben</span>
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                {:else}
                    <ShieldAlert class="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Portal: Gesperrt</span>
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0"></span>
                {/if}
            </button>
        </div>
    </div>

    <!-- 1-Tap Schnell-Aktionen Leiste -->
    <div class="flex items-center gap-2 flex-wrap">
        {#if onOpenMail}
            <button 
                type="button"
                onclick={onOpenMail} 
                class="orga-button-primary py-2 px-3.5 min-h-[42px] text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                title="Portal-Zugang oder Nachricht per E-Mail senden"
            >
                <Mail class="w-4 h-4" />
                <span>E-Mail senden</span>
            </button>
        {:else if state.email}
            <a 
                href="mailto:{state.email}" 
                class="orga-button-ghost py-2 px-3.5 min-h-[42px] text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1.5 shadow-2xs hover:bg-emerald-100 active:scale-95 transition-all"
                title="E-Mail schreiben an {state.email}"
            >
                <Mail class="w-4 h-4" />
                <span>E-Mail</span>
            </a>
        {/if}

        {#if phoneInfo?.isMobile}
            <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="orga-button-ghost py-2 px-3.5 min-h-[42px] text-xs font-bold bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800 inline-flex items-center gap-1.5 shadow-2xs hover:bg-green-100 active:scale-95 transition-all"
                title="WhatsApp-Chat direkt öffnen"
            >
                <MessageSquare class="w-4 h-4 text-green-600" />
                <span>WhatsApp</span>
            </a>
        {:else if phoneInfo?.isLandline}
            <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="orga-button-ghost py-2 px-3.5 min-h-[42px] text-xs font-bold bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800 inline-flex items-center gap-1.5 shadow-2xs hover:bg-green-100 active:scale-95 transition-all"
                title="WhatsApp-Empfänger auswählen"
            >
                <MessageSquare class="w-4 h-4 text-green-600" />
                <span>WhatsApp Teilen</span>
            </a>
        {/if}

        {#if state.phone}
            <a 
                href="tel:{state.phone}" 
                class="orga-button-ghost py-2 px-3.5 min-h-[42px] text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1.5 shadow-2xs hover:bg-indigo-100 active:scale-95 transition-all"
                title="Anrufen ({state.phone})"
            >
                <Phone class="w-4 h-4 text-indigo-600" />
                <span>Anrufen</span>
            </a>
        {/if}

        {#if onOpenPortal && state.editId}
            <button 
                type="button" 
                onclick={onOpenPortal} 
                class="orga-button-ghost py-2 px-3.5 min-h-[42px] text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="PIN & Zugangskarte für das Klienten-Portal verwalten"
            >
                <ExternalLink class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Portal-Daten & QR</span>
            </button>
        {/if}

        {#if mapsUrl}
            <a 
                href={mapsUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                class="orga-button-ghost py-2 px-3.5 min-h-[42px] text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                title="Route in Google Maps planen"
            >
                <MapPin class="w-4 h-4 text-amber-600" />
                <span>Route</span>
            </a>
        {/if}

        <button 
            type="button" 
            onclick={copyFullContactData} 
            class="orga-button-ghost py-2 px-3 min-h-[42px] text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 inline-flex items-center gap-1.5 ml-auto cursor-pointer"
            title="Alle Kontaktdaten kopieren"
        >
            <Copy class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Kopieren</span>
        </button>
    </div>
</div>
