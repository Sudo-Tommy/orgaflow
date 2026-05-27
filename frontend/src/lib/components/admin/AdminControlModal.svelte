<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import FeedbackModal from "$lib/components/feedback/FeedbackModal.svelte";

    let dialog: HTMLDialogElement;
    let isTestingPush = $state(false);
    let feedbackModal: ReturnType<typeof FeedbackModal>;

    export function open() {
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function testPush() {
        isTestingPush = true;
        try {
            const user = pb.authStore.model;
            if (!user) return;
            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : 'https://www.ihre-seniorenassistenz.com';
            const res = await fetch(`${microserviceUrl}/api/emails/portal/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                body: JSON.stringify({ userId: user.id, title: 'System-Test 🔧', body: 'Das Push-System funktioniert fehlerfrei!', url: '/admin' })
            });
            const data = await res.json();
            if (data.pushResults && data.pushResults.some((r:any) => r.status === 'error')) {
                toastStore.warning("Push gesendet, aber einige Geräte meldeten Fehler.");
            } else {
                toastStore.success('Push-Test erfolgreich gesendet!');
            }
        } catch (e) {
            toastStore.error('Fehler beim Senden des Push-Tests.');
        } finally {
            isTestingPush = false;
        }
    }

    async function clearCache() {
        if (await confirmStore.ask("Lokalen Speicher leeren und App neu laden?", "Cache leeren", "Leeren & Neustart", "Abbrechen", true)) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    }

    async function forceSync() {
        toastStore.info("Synchronisiere gesamte Datenbank...");
        try {
            const isSuperuser = pb.authStore.isSuperuser;
            for (const [key, store] of Object.entries(orgaStore)) {
                if ((key === 'superusers' || key === 'letterboxes') && !isSuperuser) continue;
                await (store as any).init();
            }
            toastStore.success("Datenbank-Synchronisation abgeschlossen!");
        } catch(e) {
            toastStore.error("Fehler bei der Synchronisation.");
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative shadow-2xl">
        <button aria-label="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">✕</button>
        
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>🎛️</span> System-Kontrolle & Test Center</h2>
        <p class="text-sm text-neutral-500 mb-8">Führen Sie hier Wartungsarbeiten und System-Tests durch.</p>

        <div class="space-y-6">
            <!-- Testbereich -->
            <div>
                <h3 class="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wider">Test-Funktionen</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="border border-neutral-200 p-4 rounded-2xl bg-neutral-50 flex flex-col justify-between items-start gap-4"><p class="font-bold text-neutral-800 text-sm">Push-Benachrichtigungen</p><p class="text-xs text-neutral-500 mt-1 mb-4">Sendet ein Test-Signal an alle verbundenen Geräte dieses Accounts.</p><button onclick={testPush} disabled={isTestingPush} class="orga-button-primary w-full py-3 sm:py-2 shadow-sm text-sm justify-center">{isTestingPush ? 'Sendet...' : 'Push-Test senden'}</button></div>
                    <div class="border border-neutral-200 p-4 rounded-2xl bg-amber-50 flex flex-col justify-between items-start gap-4">
                        <p class="font-bold text-amber-800 text-sm">Feedback UI Test</p>
                        <p class="text-xs text-amber-700 mt-1 mb-4">Öffnet die neue, interaktive Feedback-Komponente zum Testen der User Experience.</p>
                        <button onclick={() => feedbackModal?.open()} class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 w-full py-3 sm:py-2 shadow-sm text-sm justify-center">Feedback testen</button>
                    </div>
                    <div class="border border-neutral-200 p-4 rounded-2xl bg-sky-50 flex flex-col justify-between items-start gap-4">
                        <p class="font-bold text-sky-800 text-sm">Klienten-Portal</p>
                        <p class="text-xs text-sky-700 mt-1 mb-4">Öffnet das Portal in einem neuen Tab, um die Ansicht aus Sicht eines Klienten zu prüfen.</p>
                        <a href="/portal" target="_blank" onclick={close} class="orga-button-primary bg-sky-500 hover:bg-sky-600 shadow-sky-500/30 w-full py-3 sm:py-2 shadow-sm text-sm justify-center text-center">Portal öffnen</a>
                    </div>
                </div>
            </div>

            <!-- Wartung -->
            <div>
                <h3 class="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wider">Wartung & Cache</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="border border-neutral-200 p-4 rounded-2xl bg-neutral-50 flex flex-col justify-between items-start gap-4"><p class="font-bold text-neutral-800 text-sm">Erzwungene Synchronisation</p><p class="text-xs text-neutral-500 mt-1 mb-4">Lädt alle Tabellen und Collections sofort komplett neu aus der Datenbank.</p><button onclick={forceSync} class="orga-button-ghost w-full py-3 sm:py-2 shadow-sm text-sm border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 justify-center">Live-Sync anstoßen</button></div>
                    <div class="border border-neutral-200 p-4 rounded-2xl bg-rose-50 flex flex-col justify-between items-start gap-4"><p class="font-bold text-rose-800 text-sm">Lokalen Cache leeren</p><p class="text-xs text-rose-600 mt-1 mb-4">Löscht alle gespeicherten Zwischenstände im Browser (erfordert Neustart).</p><button onclick={clearCache} class="w-full py-3 sm:py-2 text-sm font-bold bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors shadow-sm justify-center">Cache leeren</button></div>
                </div>
            </div>
        </div>

        <div class="mt-8 pt-4 border-t border-neutral-100 flex justify-end"><button onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 px-6">Schließen</button></div>
    </div>
</dialog>

<FeedbackModal bind:this={feedbackModal} />