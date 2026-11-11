<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let pushUsers = $derived.by(() => {
        let list: any[] = [];
        if (orgaStore.users?.data) list = list.concat(orgaStore.users.data.filter((u: any) => u.push_subscriptions && u.push_subscriptions.length > 0));
        if ((orgaStore as any).superusers?.data) list = list.concat((orgaStore as any).superusers.data.filter((u: any) => u.push_subscriptions && u.push_subscriptions.length > 0));
        return list;
    });

    let pushTargetId = $state("");
    let pushTitle = $state("System-Nachricht");
    let pushBody = $state("Bitte prüfen Sie das System.");
    let pushUrl = $state("/dashboard");
    let isSendingPush = $state(false);

    async function sendCustomPush() {
        if (!pushTargetId) {
            toastStore.warning("Bitte einen Benutzer auswählen.");
            return;
        }
        isSendingPush = true;
        try {
            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/emails/portal/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                body: JSON.stringify({ userId: pushTargetId, title: pushTitle, body: pushBody, url: pushUrl })
            });
            const data = await res.json();
            if (data.pushResults && data.pushResults.some((r: any) => r.status === 'error')) {
                toastStore.warning("Push gesendet, aber einige Geräte meldeten Fehler.");
            } else if (data.success) {
                toastStore.success('Push-Nachricht erfolgreich zugestellt!');
            } else {
                toastStore.error(data.error || "Fehler beim Senden.");
            }
        } catch {
            toastStore.error('Netzwerkfehler beim Senden des Pushes.');
        } finally {
            isSendingPush = false;
        }
    }
</script>

<div class="p-5 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
    <div class="flex items-center gap-2.5 mb-4">
        <span class="text-xl">🚀</span>
        <div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">Team-Push-Benachrichtigung senden</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Echtzeit-Mitteilung direkt auf die Smartphones gekoppelter Mitarbeiter schicken</p>
        </div>
    </div>

    {#if pushUsers.length === 0}
        <div class="text-center py-8 text-slate-400 dark:text-slate-500 font-medium flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <span class="text-3xl opacity-50">📱</span>
            <p class="text-xs sm:text-sm">Aktuell sind keine Mitarbeiter mit aktiven Push-Abonnements im System registriert.</p>
        </div>
    {:else}
        <form onsubmit={(e) => { e.preventDefault(); sendCustomPush(); }} class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="push-target" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Empfänger
                    </label>
                    <select
                        id="push-target"
                        bind:value={pushTargetId}
                        class="orga-input-clear py-2.5 cursor-pointer text-sm w-full min-h-[44px]"
                        required
                        disabled={isSendingPush}
                    >
                        <option value="">Mitarbeiter auswählen...</option>
                        {#each pushUsers as pu}
                            <option value={pu.id}>{pu.name_first} {pu.name_last} ({pu.email})</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label for="push-title" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Betreff / Titel
                    </label>
                    <input
                        id="push-title"
                        type="text"
                        bind:value={pushTitle}
                        class="orga-input-clear py-2.5 text-sm w-full min-h-[44px]"
                        required
                        disabled={isSendingPush}
                    />
                </div>
                <div class="sm:col-span-2">
                    <label for="push-body" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Nachricht
                    </label>
                    <textarea
                        id="push-body"
                        bind:value={pushBody}
                        rows="2"
                        class="orga-input-clear py-2.5 text-sm w-full"
                        required
                        disabled={isSendingPush}
                    ></textarea>
                </div>
            </div>
            <button
                type="submit"
                disabled={isSendingPush}
                class="orga-button-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
                <span>{isSendingPush ? 'Wird gesendet...' : 'Push senden'}</span>
            </button>
        </form>
    {/if}
</div>
