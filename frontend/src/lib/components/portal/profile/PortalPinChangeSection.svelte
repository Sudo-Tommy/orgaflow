<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";

    let currentPin = $state("");
    let newPin = $state("");
    let isPinChanging = $state(false);
    let pinChangeMsg = $state("");
    let pinChangeSuccess = $state(false);

    async function changePin() {
        if (!newPin || newPin.trim().length < 4) {
            pinChangeMsg = "Die neue PIN muss mindestens 4 Zeichen lang sein.";
            pinChangeSuccess = false;
            return;
        }

        isPinChanging = true;
        pinChangeMsg = "";

        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

            const res = await fetch(`${apiBaseUrl}/change-pin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPin, newPin: newPin.trim() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Ändern der PIN.");

            pinChangeMsg = "PIN erfolgreich geändert!";
            pinChangeSuccess = true;
            currentPin = "";
            newPin = "";
            toastStore.success("Portal-PIN erfolgreich geändert.");
        } catch (err: any) {
            pinChangeMsg = err.message || "Fehler beim Ändern der PIN.";
            pinChangeSuccess = false;
        } finally {
            isPinChanging = false;
        }
    }
</script>

<div class="pt-6 border-t border-neutral-200 dark:border-slate-800">
    <h3 class="text-sm font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
        <span>🔐</span> Persönliche Portal-PIN ändern
    </h3>
    <p class="text-xs text-neutral-500 dark:text-slate-400 mb-4">
        Hier können Sie Ihre 4- bis 6-stellige PIN für den Login am Computer oder Laptop anpassen.
    </p>
    
    {#if pinChangeMsg}
        <div class="p-3 rounded-xl mb-4 text-xs font-bold {pinChangeSuccess ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'}">
            {pinChangeMsg}
        </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label for="cur-pin" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">
                Bisherige PIN (falls vorhanden)
            </label>
            <input 
                id="cur-pin" 
                type="password" 
                bind:value={currentPin} 
                placeholder="Bisherige PIN" 
                class="orga-input-clear py-2.5 text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isPinChanging} 
            />
        </div>
        <div>
            <label for="new-pin" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">
                Neue Wunsch-PIN (mind. 4 Ziffern)
            </label>
            <input 
                id="new-pin" 
                type="text" 
                bind:value={newPin} 
                placeholder="z. B. 123456" 
                maxlength="12" 
                class="orga-input-clear py-2.5 text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isPinChanging} 
            />
        </div>
    </div>
    <div class="mt-3 flex justify-end">
        <button 
            type="button" 
            onclick={changePin} 
            disabled={isPinChanging || !newPin.trim() || newPin.trim().length < 4} 
            class="orga-button-ghost min-h-[44px] py-2 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-slate-700 shadow-xs cursor-pointer touch-manipulation"
        >
            {isPinChanging ? 'Ändere PIN...' : 'Neue PIN speichern'}
        </button>
    </div>
</div>
