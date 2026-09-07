<script lang="ts">
    import { rbacService } from '$lib/services/rbacService.svelte';

    interface Props {
        unhandledInquiriesCount?: number;
        onOpenFollowUp: () => void;
        onOpenShareQr: () => void;
        onOpenLetter?: () => void;
        onOpenInquiries?: () => void;
        activeClientsCount?: number;
        openInvoicesCount?: number;
        openInvoicesSum?: number;
        missingFollowUpsCount?: number;
        onOpenFollowUps?: () => void;
        unsettledAppointmentsCount?: number;
        onOpenUnsettled?: () => void;
        monthlyKms?: number;
    }

    let {
        unhandledInquiriesCount = 0,
        onOpenFollowUp,
        onOpenShareQr,
        onOpenLetter,
        onOpenInquiries,
        activeClientsCount = 0,
        openInvoicesCount = 0,
        openInvoicesSum = 0,
        missingFollowUpsCount = 0,
        onOpenFollowUps,
        unsettledAppointmentsCount = 0,
        onOpenUnsettled,
        monthlyKms = 0
    }: Props = $props();

    let isOwner = $derived(rbacService.isOwner);
    let isAdmin = $derived(rbacService.isOwner || rbacService.isFacilityAdmin);
    let isCaregiver = $derived(rbacService.isCaregiver);
    let canAccessFinances = $derived(rbacService.canAccessFinances);
</script>

<div class="mb-8 w-full animate-enter delay-50">
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 rounded-3xl text-white shadow-xl border border-slate-800/80 relative overflow-hidden">
        <!-- Ambient background glow -->
        <div class="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-white/10">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner shrink-0">
                    ⚡
                </div>
                <div>
                    <h3 class="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                        <span>Schnellzugriff & Aktionen</span>
                        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                            {isOwner ? 'Inhaber' : isAdmin ? 'Betriebsleitung' : 'Betreuung'}
                        </span>
                    </h3>
                    <p class="text-xs text-indigo-200/80 mt-0.5">
                        {isCaregiver 
                            ? 'Schneller Zugriff auf Vor-Ort-Workflows, Klienten und Nachbereitungen' 
                            : 'Zentrale Steuerung für Workflows, Finanzen, Klienten und Anfragen'}
                    </p>
                </div>
            </div>
        </div>

        <!-- Section 1: Workflow-Schnellaktionen (Mind. 44px Touch-Targets) -->
        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
            
            <!-- 1. Schneller Folgetermin -->
            <button
                type="button"
                onclick={onOpenFollowUp}
                class="min-h-[64px] p-3.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-3 active:scale-95 touch-manipulation cursor-pointer border border-indigo-400/30 group text-left"
            >
                <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                    ⚡
                </div>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold truncate leading-tight">Folgetermin</p>
                    <p class="text-[10px] text-indigo-200 truncate mt-0.5">Aus Termin ableiten</p>
                </div>
            </button>

            <!-- 2. QR-Code Teilen -->
            <button
                type="button"
                onclick={onOpenShareQr}
                class="min-h-[64px] p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation cursor-pointer border border-white/15 group text-left"
            >
                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                    📱
                </div>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold truncate leading-tight">QR-Code Teilen</p>
                    <p class="text-[10px] text-slate-300 truncate mt-0.5">Portal & Visitenkarte</p>
                </div>
            </button>

            <!-- 3. Brief schreiben (DIN 5008 mit Firmenlogo) -->
            <button
                type="button"
                onclick={onOpenLetter}
                class="min-h-[64px] p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-white/15 group text-left cursor-pointer"
                title="Neuen Geschäftsbrief mit Firmenlogo nach DIN 5008 verfassen, als PDF exportieren oder drucken"
            >
                <div class="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                    ✉️
                </div>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold truncate leading-tight">Brief schreiben</p>
                    <p class="text-[10px] text-slate-300 truncate mt-0.5">DIN 5008 mit Logo</p>
                </div>
            </button>

            <!-- 3. Kundenanfragen (Admins/Inhaber) bzw. Mein Dienstplan (Caregiver) -->
            {#if isAdmin}
                <button
                    type="button"
                    onclick={onOpenInquiries}
                    class="min-h-[64px] p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-white/15 group relative text-left cursor-pointer w-full"
                >
                    <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                        📬
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                            <p class="text-xs sm:text-sm font-bold truncate leading-tight">Kundenanfragen</p>
                            {#if unhandledInquiriesCount > 0}
                                <span class="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                                    {unhandledInquiriesCount}
                                </span>
                            {/if}
                        </div>
                        <p class="text-[10px] text-slate-300 truncate mt-0.5">Posteingang & Beratung</p>
                    </div>
                </button>
            {:else}
                <a
                    href="/appointments"
                    class="min-h-[64px] p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-white/15 group text-left"
                >
                    <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                        📅
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs sm:text-sm font-bold truncate leading-tight">Mein Dienstplan</p>
                        <p class="text-[10px] text-slate-300 truncate mt-0.5">Alle Einsätze einsehen</p>
                    </div>
                </a>
            {/if}

            <!-- 4. Spezifikationen (Inhaber) bzw. Dokumente & Vorlagen (Mitarbeiter) -->
            {#if isOwner}
                <a
                    href="/admin/system-prompts"
                    class="min-h-[64px] p-3.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-purple-400/30 group text-left"
                >
                    <div class="w-10 h-10 rounded-xl bg-purple-500/30 text-purple-200 border border-purple-400/40 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                        🧠
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs sm:text-sm font-bold truncate leading-tight">Spezifikationen</p>
                        <p class="text-[10px] text-purple-300 truncate mt-0.5">System-Prompts & Synthese</p>
                    </div>
                </a>
            {:else}
                <a
                    href="/documents"
                    class="min-h-[64px] p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-white/15 group text-left"
                >
                    <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                        📄
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs sm:text-sm font-bold truncate leading-tight">Vorlagen</p>
                        <p class="text-[10px] text-slate-300 truncate mt-0.5">Formulare & Nachweise</p>
                    </div>
                </a>
            {/if}

        </div>

        <!-- Section 2: Vorgänge & Status-Aktionen (Aktive Klienten, Offene Rechnungen, Offener Betrag, Nachbereitungen, Ohne Rechnung, Team-KM) -->
        <div class="pt-4 border-t border-white/10">
            <div class="grid grid-cols-2 {canAccessFinances ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-2.5 sm:gap-3">
                
                <!-- A. Aktive Klienten -->
                <a 
                    href="/clients" 
                    class="p-3 sm:p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/40 transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98]"
                >
                    <div class="flex items-center justify-between gap-1.5">
                        <span class="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                            {isOwner ? 'Aktive Klienten' : 'Klienten'}
                        </span>
                        <div class="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                            👥
                        </div>
                    </div>
                    <div class="mt-1">
                        <p class="text-lg sm:text-2xl font-black text-white leading-none">
                            {activeClientsCount}
                        </p>
                    </div>
                </a>

                <!-- B. Offene Rechnungen (Finanzen) -->
                {#if canAccessFinances}
                    <a 
                        href="/invoices" 
                        class="p-3 sm:p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-400/40 transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98]"
                    >
                        <div class="flex items-center justify-between gap-1.5">
                            <span class="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                                {isOwner ? 'Offene Rechnungen' : 'Rechnungen'}
                            </span>
                            <div class="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                                💶
                            </div>
                        </div>
                        <div class="mt-1">
                            <p class="text-lg sm:text-2xl font-black text-white leading-none">
                                {openInvoicesCount}
                            </p>
                        </div>
                    </a>

                    <!-- C. Offener Betrag (Finanzen) -->
                    <a 
                        href="/invoices" 
                        class="p-3 sm:p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/40 transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98]"
                    >
                        <div class="flex items-center justify-between gap-1.5">
                            <span class="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                                Offener Betrag
                            </span>
                            <div class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                                💰
                            </div>
                        </div>
                        <div class="mt-1">
                            <p class="text-base sm:text-lg lg:text-xl font-black text-emerald-400 leading-none truncate" title="{openInvoicesSum.toFixed(2).replace('.', ',')} €">
                                {openInvoicesSum.toFixed(2).replace('.', ',')} €
                            </p>
                        </div>
                    </a>
                {/if}

                <!-- D. Nachbereitungen -->
                <button 
                    type="button" 
                    onclick={onOpenFollowUps} 
                    class="p-3 sm:p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-400/40 transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98] cursor-pointer"
                >
                    <div class="flex items-center justify-between gap-1.5">
                        <span class="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                            Nachbereitungen
                        </span>
                        <div class="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                            ⚠️
                        </div>
                    </div>
                    <div class="mt-1 flex items-baseline gap-1.5">
                        <p class="text-lg sm:text-2xl font-black leading-none {missingFollowUpsCount > 0 ? 'text-amber-400' : 'text-white'}">
                            {missingFollowUpsCount}
                        </p>
                        {#if missingFollowUpsCount > 0}
                            <span class="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1 rounded">offen</span>
                        {/if}
                    </div>
                </button>

                <!-- E. Ohne Rechnung -->
                <button 
                    type="button" 
                    onclick={onOpenUnsettled} 
                    class="p-3 sm:p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 transition-all group flex flex-col justify-between min-h-[72px] text-left active:scale-[0.98] cursor-pointer"
                >
                    <div class="flex items-center justify-between gap-1.5">
                        <span class="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                            {isOwner ? 'Ohne Rechnung' : 'Meine ohne Rechnung'}
                        </span>
                        <div class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                            📄
                        </div>
                    </div>
                    <div class="mt-1 flex items-baseline gap-1.5">
                        <p class="text-lg sm:text-2xl font-black leading-none {unsettledAppointmentsCount > 0 ? 'text-cyan-400' : 'text-white'}">
                            {unsettledAppointmentsCount}
                        </p>
                        {#if unsettledAppointmentsCount > 0}
                            <span class="text-[9px] font-bold text-cyan-300 bg-cyan-500/20 px-1 rounded">offen</span>
                        {/if}
                    </div>
                </button>

                <!-- F. Team-KM (Monat) / Gefahrene KM -->
                <div 
                    class="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 transition-all group flex flex-col justify-between min-h-[72px] text-left"
                >
                    <div class="flex items-center justify-between gap-1.5">
                        <span class="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                            {isOwner ? 'Team-KM (Monat)' : 'Gefahrene KM'}
                        </span>
                        <div class="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs shrink-0">
                            🚗
                        </div>
                    </div>
                    <div class="mt-1">
                        <p class="text-lg sm:text-2xl font-black text-white leading-none">
                            {monthlyKms.toFixed(0)} <span class="text-xs font-bold text-slate-400">km</span>
                        </p>
                    </div>
                </div>

            </div>
        </div>

    </div>
</div>

