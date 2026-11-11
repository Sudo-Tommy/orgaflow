<script lang="ts">
    import { X } from "lucide-svelte";

    let {
        dialog = $bindable(),
        userEmail = "",
        apiBaseUrl = "",
        getAuthToken = () => ""
    }: {
        dialog?: HTMLDialogElement;
        userEmail?: string;
        apiBaseUrl?: string;
        getAuthToken?: () => string;
    } = $props();

    let isSubscribed = $state(false);
    let isLoading = $state(false);
    let mailingMsg = $state("");

    export async function open() {
        mailingMsg = "";
        isLoading = true;
        dialog?.showModal();
        try {
            const res = await fetch(`${apiBaseUrl}/mailing-list`, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
            if (res.ok) {
                const data = await res.json();
                isSubscribed = data.subscribed;
            }
        } catch {}
        finally { isLoading = false; }
    }

    async function updateSubscription() {
        isLoading = true;
        mailingMsg = "";
        try {
            const res = await fetch(`${apiBaseUrl}/mailing-list`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscribed: isSubscribed })
            });
            if (!res.ok) throw new Error();
            mailingMsg = isSubscribed ? "Erfolgreich in den Verteiler eingetragen!" : "Erfolgreich ausgetragen.";
        } catch {
            mailingMsg = "Fehler bei der Aktualisierung.";
            isSubscribed = !isSubscribed;
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-md mx-auto my-auto rounded-3xl border-none shadow-2xl outline-none" onclick={(e) => { if (e.target === dialog) dialog?.close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl animate-enter">
        <button type="button" aria-label="Schließen" onclick={() => dialog?.close()} class="absolute top-5 right-5 w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer"><X class="w-5 h-5" /></button>
        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2"><span>📧</span> Info-Verteiler</h2>
        <p class="text-sm text-slate-500 mb-6">Erhalten Sie wichtige Updates und Terminkopien per E-Mail.</p>
        {#if isLoading}
            <div class="flex justify-center my-4"><div class="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
        {:else}
            {#if mailingMsg}<div class="mb-4 p-3 rounded-xl text-sm font-semibold {mailingMsg.includes('Fehler') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} border">{mailingMsg}</div>{/if}
            <label class="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/60">
                <input type="checkbox" bind:checked={isSubscribed} onchange={updateSubscription} class="w-5 h-5 mt-0.5 text-indigo-600 rounded cursor-pointer" disabled={isLoading} />
                <div>
                    <span class="font-bold text-slate-900 dark:text-slate-100 text-sm block">Im Verteiler eintragen</span>
                    <span class="text-xs text-slate-500 mt-1 block">Ihre Adresse ({userEmail || 'Ihre Adresse'}) wird für Benachrichtigungen hinterlegt.</span>
                </div>
            </label>
        {/if}
    </div>
</dialog>
