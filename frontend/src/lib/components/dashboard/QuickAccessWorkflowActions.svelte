<script lang="ts">
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { notificationStore } from '$lib/services/notificationStore.svelte';
    import { systemDialogService } from '$lib/services/systemDialogService.svelte';

    interface Props {
        onOpenFollowUp: () => void;
        onOpenShareQr: () => void;
        onOpenLetter?: () => void;
        onOpenEingangszentrale?: () => void;
        onOpenInquiries?: () => void;
        unhandledInquiriesCount?: number;
    }

    let {
        onOpenFollowUp,
        onOpenShareQr,
        onOpenLetter,
        onOpenEingangszentrale,
        onOpenInquiries,
        unhandledInquiriesCount = 0
    }: Props = $props();

    let isAdmin = $derived(rbacService.isOwner || rbacService.isFacilityAdmin);
    let isCaregiver = $derived(rbacService.isCaregiver);
    let totalIncomingCount = $derived(notificationStore.totalIncomingCount);

    function handleOpenIncoming() {
        if (onOpenEingangszentrale) {
            onOpenEingangszentrale();
        } else if (onOpenInquiries) {
            onOpenInquiries();
        }
    }
</script>

<!-- Section 1: Workflow-Schnellaktionen (Mind. 44px Touch-Targets, responsive Grid) -->
<div class="grid grid-cols-2 {isCaregiver ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-3 sm:gap-4 mb-5">
    
    <!-- 1. Schneller Folgetermin -->
    <button
        type="button"
        onclick={onOpenFollowUp}
        class="min-h-[64px] p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center gap-3 active:scale-95 touch-manipulation cursor-pointer border border-indigo-500 group text-left"
    >
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
            ⚡
        </div>
        <div class="min-w-0">
            <p class="text-xs sm:text-sm font-bold truncate leading-tight">Folgetermin</p>
            <p class="text-[10px] text-indigo-100 truncate mt-0.5">Aus Termin ableiten</p>
        </div>
    </button>

    <!-- 2. QR-Code Teilen -->
    <button
        type="button"
        onclick={onOpenShareQr}
        class="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white shadow-xs dark:shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation cursor-pointer border border-slate-200/90 dark:border-white/15 group text-left"
    >
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
            📱
        </div>
        <div class="min-w-0">
            <p class="text-xs sm:text-sm font-bold truncate leading-tight">QR-Code Teilen</p>
            <p class="text-[10px] text-slate-500 dark:text-slate-300 truncate mt-0.5">Portal & Visitenkarte</p>
        </div>
    </button>

    <!-- 3. Brief schreiben (DIN 5008 mit Firmenlogo) – Für Mitarbeiter strikt verborgen -->
    {#if !isCaregiver}
        <button
            type="button"
            onclick={onOpenLetter}
            class="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white shadow-xs dark:shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-slate-200/90 dark:border-white/15 group text-left cursor-pointer"
            title="Neuen Geschäftsbrief mit Firmenlogo nach DIN 5008 verfassen, als PDF exportieren oder drucken"
        >
            <div class="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/20 dark:border-sky-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                ✉️
            </div>
            <div class="min-w-0">
                <p class="text-xs sm:text-sm font-bold truncate leading-tight">Brief schreiben</p>
                <p class="text-[10px] text-slate-500 dark:text-slate-300 truncate mt-0.5">DIN 5008 mit Logo</p>
            </div>
        </button>
    {/if}

    <!-- 4. Eingangszentrale (Admins/Inhaber) bzw. Mein Dienstplan (Betreuer) -->
    {#if isAdmin}
        <button
            type="button"
            onclick={handleOpenIncoming}
            class="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white shadow-xs dark:shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-slate-200/90 dark:border-white/15 group relative text-left cursor-pointer w-full {totalIncomingCount > 0 ? 'border-indigo-300 dark:border-indigo-500/40' : ''}"
            title="Eingangszentrale: Kundenanfragen, Supportberichte & Verbesserungsvorschläge"
        >
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                📥
            </div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                    <p class="text-xs sm:text-sm font-bold truncate leading-tight">Eingangszentrale</p>
                    {#if totalIncomingCount > 0}
                        <span class="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse shadow-2xs">
                            {totalIncomingCount}
                        </span>
                    {/if}
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-300 truncate mt-0.5">Anfragen, Support & Ideen</p>
            </div>
        </button>
    {:else}
        <a
            href="/appointments"
            class="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white shadow-xs dark:shadow-sm transition-all flex items-center gap-3 active:scale-95 touch-manipulation border border-slate-200/90 dark:border-white/15 group text-left"
        >
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                📅
            </div>
            <div class="min-w-0">
                <p class="text-xs sm:text-sm font-bold truncate leading-tight">Mein Dienstplan</p>
                <p class="text-[10px] text-slate-500 dark:text-slate-300 truncate mt-0.5">Alle Einsätze einsehen</p>
            </div>
        </a>
    {/if}

</div>

{#if isAdmin}
    <div class="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-300/60 dark:border-amber-700/50 shadow-2xs">
        <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-xs">💬</span>
            <div class="min-w-0">
                <p class="text-xs font-black text-slate-900 dark:text-white leading-tight">Wichtige Mitteilungen &amp; Sofortnachrichten</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">Dringende Mitteilungen mit Lesebestätigung und Schnell-Antwort an das Team senden</p>
            </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <button
                type="button"
                onclick={() => systemDialogService.isHistoryModalOpen = true}
                class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
            >
                Bisherige Mitteilungen
            </button>
            <button
                type="button"
                onclick={() => systemDialogService.isSendModalOpen = true}
                class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
                <span>+ Eil-Mitteilung senden</span>
            </button>
        </div>
    </div>
{/if}
