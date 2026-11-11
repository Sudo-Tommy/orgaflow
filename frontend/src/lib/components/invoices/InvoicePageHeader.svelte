<script lang="ts">
    import { Plus, Mail, RefreshCw, Trash2 } from "lucide-svelte";
    import LexOfficeSyncButton from "$lib/components/lexoffice/LexOfficeSyncButton.svelte";

    let {
        selectedCount = 0,
        isRefreshing = false,
        companyId = "all",
        onSend = () => {},
        onRefresh = () => {},
        onDelete = () => {},
        onNew = () => {}
    }: {
        selectedCount?: number;
        isRefreshing?: boolean;
        companyId?: string;
        onSend?: () => void;
        onRefresh?: () => void;
        onDelete?: () => void;
        onNew?: () => void;
    } = $props();
</script>

<div class="orga-page-header animate-enter pb-2 sm:pb-6">
    <div class="flex flex-col sm:flex-row justify-between items-center w-full gap-3 sm:gap-4">
        <div class="w-full sm:w-auto text-center sm:text-left flex flex-col items-center sm:items-start min-w-0">
            <h1 class="orga-page-title">Rechnungen</h1>
            <p class="orga-page-subtitle hidden sm:block">Verwalten Sie alle Rechnungen, Einnahmen und den LexOffice-Abgleich.</p>
        </div>
        
        <div class="flex flex-wrap items-center gap-2">
            {#if selectedCount > 0}
                <div class="hidden md:flex items-center gap-2">
                    <button aria-label="Ausgewählte senden" onclick={onSend} class="orga-button-primary bg-cyan-600 hover:bg-cyan-700 py-2 px-4 min-h-12 text-sm flex items-center gap-1.5 shadow-cyan-600/25">
                        <Mail class="w-4 h-4" /> Senden ({selectedCount})
                    </button>
                    <button aria-label="Layout neu generieren" onclick={onRefresh} disabled={isRefreshing} class="orga-button-ghost bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 py-2 px-4 min-h-12 text-sm flex items-center gap-1.5 {isRefreshing ? 'cursor-wait opacity-80' : ''}">
                        <RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" /> Refresh ({selectedCount})
                    </button>
                    <button aria-label="Ausgewählte löschen" onclick={onDelete} class="orga-button-ghost bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 py-2 px-4 min-h-12 text-sm flex items-center gap-1.5">
                        <Trash2 class="w-4 h-4" /> Löschen ({selectedCount})
                    </button>
                    <div class="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2" aria-hidden="true"></div>
                </div>
            {/if}

            <LexOfficeSyncButton {companyId} />

            <button aria-label="Neue Rechnung erstellen" onclick={onNew} class="orga-button-primary py-2 px-4 sm:px-6 min-h-11 sm:min-h-12 text-sm font-bold flex items-center gap-1.5 shadow-violet-600/30 shrink-0">
                <Plus class="w-4 h-4 sm:w-5 sm:h-5" /> <span>Neue Rechnung</span>
            </button>
        </div>
    </div>
</div>
