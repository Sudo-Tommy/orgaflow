<script lang="ts">
    let { passwordData, isLoading, onSave } = $props<{
        passwordData: any;
        isLoading: boolean;
        onSave: () => void;
    }>();
</script>

<div class="orga-card-white p-6 md:p-8">
    <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
        <span class="w-8 h-8 flex items-center justify-center bg-rose-100 text-rose-600 rounded-lg shadow-inner text-sm">🔒</span> Sicherheit & Passwort
    </h2>
    
    <form onsubmit={(e) => { e.preventDefault(); onSave(); }} class="space-y-4">
        <div><label for="sec-old" class="block text-sm font-semibold text-neutral-700 mb-1.5">Aktuelles Passwort</label><input id="sec-old" type="password" autocomplete="current-password" bind:value={passwordData.oldPassword} class="orga-input-clear" placeholder="••••••••" required disabled={isLoading} /></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label for="sec-new" class="block text-sm font-semibold text-neutral-700 mb-1.5">Neues Passwort</label><input id="sec-new" type="password" autocomplete="new-password" bind:value={passwordData.password} class="orga-input-clear" placeholder="••••••••" minlength="8" required disabled={isLoading} /></div>
            <div><label for="sec-conf" class="block text-sm font-semibold text-neutral-700 mb-1.5">Passwort bestätigen</label><input id="sec-conf" type="password" autocomplete="new-password" bind:value={passwordData.passwordConfirm} class="orga-input-clear" placeholder="••••••••" minlength="8" required disabled={isLoading} /></div>
        </div>
        
        <div class="pt-4 flex justify-end">
            <button type="submit" disabled={isLoading || passwordData.password !== passwordData.passwordConfirm || !passwordData.oldPassword} class="orga-button-primary w-full sm:w-auto shadow-rose-600/20 bg-neutral-900 hover:bg-neutral-800 py-3 sm:py-2.5">
                {isLoading ? 'Speichert...' : 'Passwort ändern'}
            </button>
        </div>
    </form>
</div>