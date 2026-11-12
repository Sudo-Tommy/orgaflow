<script lang="ts">
    import { WifiOff, RefreshCw, Send } from 'lucide-svelte';
    import { connectionManager } from '$lib/services/connectionManager.svelte';

    let pending = $derived(connectionManager.pendingCount);
    let isOnline = $derived(connectionManager.isOnline);
    let isSyncing = $derived(connectionManager.isReconnecting);
    let visible = $derived(!isOnline || isSyncing || pending > 0);
</script>

{#if visible}
    <div
        role="status"
        class="fixed top-2 left-1/2 -translate-x-1/2 z-[9970] flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-bold shadow-lg border transition-all max-w-[94vw] {!isOnline ? 'bg-amber-400 text-slate-950 border-amber-500' : 'bg-indigo-600 text-white border-indigo-500'}"
    >
        {#if !isOnline}
            <WifiOff class="w-4 h-4 shrink-0" />
            <span class="truncate">
                {pending > 0 ? `Offline – ${pending} ${pending === 1 ? 'Änderung wartet' : 'Änderungen warten'}` : 'Offline – Eingaben werden gesichert'}
            </span>
        {:else if isSyncing}
            <RefreshCw class="w-4 h-4 shrink-0 animate-spin" />
            <span class="truncate">Änderungen werden gesendet...</span>
        {:else}
            <span class="truncate">{pending} {pending === 1 ? 'Änderung wartet' : 'Änderungen warten'}</span>
            <button
                type="button"
                onclick={() => connectionManager.reconnect()}
                class="px-2.5 py-1 rounded-full bg-white text-indigo-700 hover:bg-indigo-50 text-[11px] font-black flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
            >
                <Send class="w-3 h-3" />
                <span>Jetzt senden</span>
            </button>
        {/if}
    </div>
{/if}
