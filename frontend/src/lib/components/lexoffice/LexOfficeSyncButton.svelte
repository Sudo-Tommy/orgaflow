<script lang="ts">
    import { onMount } from "svelte";
    import { RefreshCw, Link2, AlertTriangle, Settings2 } from "lucide-svelte";
    import { lexofficeService } from "$lib/services/lexofficeService.svelte";

    let {
        companyId = "all",
        onSynced = () => {}
    }: {
        companyId?: string;
        onSynced?: () => void;
    } = $props();

    onMount(() => {
        lexofficeService.init();
    });

    let currentConfig = $derived(lexofficeService.getConfigForCompany(companyId));
    let isConnected = $derived(
        companyId && companyId !== "all"
            ? Boolean(currentConfig?.connected)
            : lexofficeService.hasAnyConnected
    );
    let needsReconnect = $derived(
        companyId && companyId !== "all"
            ? Boolean(currentConfig?.needsReconnect)
            : lexofficeService.hasAnyError
    );

    async function handleSyncClick() {
        const ok = await lexofficeService.syncNow(companyId || "all", false);
        if (ok) onSynced();
    }
</script>

{#if lexofficeService.canManageLexOffice}
    <div class="inline-flex items-center gap-1.5 shrink-0">
        {#if needsReconnect}
            <button
                type="button"
                onclick={() => lexofficeService.openConnectModal(companyId)}
                class="min-h-10 sm:min-h-11 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                title="LexOffice-Schlüssel abgelaufen oder unterbrochen – jetzt neu verbinden"
            >
                <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>LexOffice neu verbinden</span>
            </button>
        {:else if isConnected}
            <div class="inline-flex items-center rounded-xl bg-emerald-50/90 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/80 shadow-xs overflow-hidden">
                <button
                    type="button"
                    disabled={lexofficeService.isSyncing || lexofficeService.cooldownSeconds > 0}
                    onclick={handleSyncClick}
                    class="min-h-10 sm:min-h-11 px-3.5 py-2 hover:bg-emerald-100/80 dark:hover:bg-slate-700 text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    title={lexofficeService.cooldownSeconds > 0
                        ? `Nächster Abgleich in ${lexofficeService.cooldownSeconds}s möglich`
                        : (currentConfig?.lastSync
                            ? `Mit LexOffice synchronisieren (Letzter Abgleich: ${new Date(currentConfig.lastSync).toLocaleString('de-DE')})`
                            : "Rechnungen und Status jetzt mit LexOffice abgleichen")}
                >
                    <span class="w-2 h-2 rounded-full {lexofficeService.cooldownSeconds > 0 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'} shrink-0"></span>
                    <RefreshCw class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 {lexofficeService.isSyncing ? 'animate-spin' : ''}" />
                    <span>
                        {#if lexofficeService.isSyncing}
                            LexOffice Sync...
                        {:else if lexofficeService.cooldownSeconds > 0}
                            Sync ({lexofficeService.cooldownSeconds}s)
                        {:else}
                            LexOffice Sync
                        {/if}
                    </span>
                </button>
                <button
                    type="button"
                    onclick={() => lexofficeService.openConnectModal(companyId)}
                    aria-label="LexOffice-Verbindung verwalten"
                    title="LexOffice-Zugang & Einstellungen öffnen"
                    class="min-h-10 sm:min-h-11 px-2.5 py-2 border-l border-emerald-200 dark:border-slate-700 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                    <Settings2 class="w-4 h-4" />
                </button>
            </div>
        {:else}
            <button
                type="button"
                onclick={() => lexofficeService.openConnectModal(companyId)}
                class="min-h-10 sm:min-h-11 px-3.5 py-2 rounded-xl bg-violet-50 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-slate-700 border border-violet-200 dark:border-slate-700 text-violet-700 dark:text-violet-300 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                title="Schnell-Login zu LexOffice einrichten"
            >
                <Link2 class="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span>LexOffice verbinden</span>
            </button>
        {/if}
    </div>
{/if}
