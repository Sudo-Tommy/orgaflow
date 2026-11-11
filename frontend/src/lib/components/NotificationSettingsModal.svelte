<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import NotificationTopicsList from "./notifications/NotificationTopicsList.svelte";
    import { onMount } from "svelte";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let isSubscribed = $state(false);
    let isSupported = $state(true);

    let prefs = $state({
        requests: true,
        emails: true,
        chats: true,
        updates: true
    });
    
    let prefsTimeout: any;

    onMount(() => {
        const stored = localStorage.getItem('orga_notify_prefs');
        if (stored) {
            try { prefs = { ...prefs, ...JSON.parse(stored) }; } catch(e){}
        }
    });

    $effect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('orga_notify_prefs', JSON.stringify(prefs));
            
            if (isSubscribed && pb.authStore.model) {
                clearTimeout(prefsTimeout);
                prefsTimeout = setTimeout(async () => {
                    try {
                        const user = pb.authStore.model;
                        if (!user) return;
                        const collection = pb.authStore.isSuperuser ? '_superusers' : 'users';
                        const freshUser = await pb.collection(collection).getOne(user.id, { requestKey: null });
                        
                        let existingSubs = freshUser.push_subscriptions || [];
                        if (typeof existingSubs === 'string') { try { existingSubs = JSON.parse(existingSubs); } catch(e){ existingSubs = []; } }
                        
                        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
                        if (registration) {
                            const sub = await registration.pushManager.getSubscription();
                            if (sub) {
                                let updated = false;
                                existingSubs = existingSubs.map((s: any) => {
                                    if (s.endpoint === sub.endpoint) {
                                        s.preferences = $state.snapshot(prefs);
                                        updated = true;
                                    }
                                    return s;
                                });
                                
                                if (updated) {
                                    await pb.collection(collection).update(user.id, { push_subscriptions: existingSubs });
                                }
                            }
                        }
                    } catch (e) {}
                }, 1000);
            }
        }
    });

    export function open() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            isSupported = false;
        } else {
            checkSubscription();
        }
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function checkSubscription() {
        try {
            const registration = await navigator.serviceWorker.getRegistration('/sw.js');
            if (registration) {
                const sub = await registration.pushManager.getSubscription();
                isSubscribed = !!sub;
            } else {
                isSubscribed = false;
            }
        } catch (err) {
            console.error("SW Error:", err);
        }
    }

    function urlB64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async function togglePush() {
        isLoading = true;
        try {
            if (isSubscribed) {
                const registration = await navigator.serviceWorker.getRegistration('/sw.js');
                if (registration) {
                    const sub = await registration.pushManager.getSubscription();
                    if (sub) {
                        await sub.unsubscribe();
                        const user = pb.authStore.model;
                        if (user) {
                            const collection = pb.authStore.isSuperuser ? '_superusers' : 'users';
                            const freshUser = await pb.collection(collection).getOne(user.id, { requestKey: null });
                            let existingSubs = freshUser.push_subscriptions || [];
                            if (typeof existingSubs === 'string') { try { existingSubs = JSON.parse(existingSubs); } catch(e){ existingSubs = []; } }
                            existingSubs = existingSubs.filter((s: any) => s.endpoint !== sub.endpoint);
                            await pb.collection(collection).update(user.id, { push_subscriptions: existingSubs });
                            freshUser.push_subscriptions = existingSubs;
                            pb.authStore.save(pb.authStore.token, freshUser);
                        }
                    }
                }
                isSubscribed = false;
                toastStore.info("Push-Benachrichtigungen deaktiviert.");
            } else {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    toastStore.warning("Berechtigung für Benachrichtigungen wurde im Browser blockiert.");
                    isLoading = false;
                    return;
                }
                await navigator.serviceWorker.register('/sw.js');
                const vapidPublicKey = "BDX77m5HXgMy7eT8QB86A4a6RCfeSr6KroakoYqsbSHAiTdPo3Bq3E3yUbIGhFYr8JQA9CzBPYQdr1j7IhUUVpw";
                const subscription = await (await navigator.serviceWorker.getRegistration('/sw.js'))?.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
                });
                const user = pb.authStore.model;
                if (user && subscription) {
                    const collection = pb.authStore.isSuperuser ? '_superusers' : 'users';
                    const freshUser = await pb.collection(collection).getOne(user.id, { requestKey: null });
                    let existingSubs = freshUser.push_subscriptions || [];
                    if (typeof existingSubs === 'string') { try { existingSubs = JSON.parse(existingSubs); } catch(e){ existingSubs = []; } }
                    if (!existingSubs.some((s: any) => s.endpoint === subscription.endpoint)) {
                        const subJSON = JSON.parse(JSON.stringify(subscription));
                        subJSON.preferences = $state.snapshot(prefs);
                        existingSubs.push(subJSON);
                        await pb.collection(collection).update(user.id, { push_subscriptions: existingSubs });
                        freshUser.push_subscriptions = existingSubs;
                        pb.authStore.save(pb.authStore.token, freshUser);
                    }
                }
                isSubscribed = true;
                toastStore.success('Gerät für Benachrichtigungen gekoppelt!');
            }
        } catch (err) {
            console.error('Push Toggle Error:', err);
            toastStore.error('Fehler beim Ändern der Push-Einstellungen.');
        } finally {
            isLoading = false;
        }
    }

    async function testPush() {
        isLoading = true;
        try {
            const user = pb.authStore.model;
            if (!user) return;
            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/emails/portal/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                body: JSON.stringify({ userId: user.id, title: 'Test erfolgreich! 🚀', body: 'Dieses Gerät ist perfekt mit dem Server verbunden.', url: '/dashboard' })
            });
            const data = await res.json();
            if (data.pushResults) {
                const errors = data.pushResults.filter((r: any) => r.status === 'error');
                if (errors.length > 0) toastStore.error(`Apple/Google hat blockiert: ${errors[0].error}`);
                else toastStore.success('Signal erfolgreich bei Apple/Google abgeliefert!');
            } else {
                toastStore.warning(data.error || 'Antwort unklar.');
            }
        } catch(e) {
            toastStore.error('Fehler beim Senden des Test-Signals.');
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl w-full flex flex-col relative shadow-2xl">
        <div class="p-6 md:p-8 shrink-0 relative border-b border-neutral-100">
            <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-10 active:scale-95 cursor-pointer"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            <h2 class="text-xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>🔔</span> Benachrichtigungen</h2>
            <p class="text-sm text-neutral-500 mb-2">Passen Sie an, worüber dieses Gerät Sie informieren darf.</p>
        </div>
        
        <div class="flex-1 p-6 md:p-8 bg-neutral-50/30">
        {#if !isSupported}
            <div class="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-700 text-sm font-medium mb-6">Ihr aktueller Browser unterstützt keine Push-Benachrichtigungen. (Nutzen Sie Safari auf iOS ab Version 16.4 oder Google Chrome).</div>
        {:else}
            <div class="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-100 flex items-center justify-between gap-4 mb-6">
                <div>
                    <p class="font-bold text-neutral-900 text-sm">Push-Benachrichtigungen (Gerät)</p>
                    <p class="text-xs text-neutral-500 mt-0.5">{isSubscribed ? 'Aktiviert für dieses Gerät' : 'Auf diesem Gerät deaktiviert'}</p>
                </div>
                <button type="button" aria-label="Push-Benachrichtigungen ein- oder ausschalten" onclick={togglePush} disabled={isLoading} class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {isSubscribed ? 'bg-emerald-500' : 'bg-neutral-300'} disabled:opacity-50" role="switch" aria-checked={isSubscribed}><span class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {isSubscribed ? 'translate-x-5' : 'translate-x-0'}"></span></button>
            </div>

            <NotificationTopicsList bind:prefs />
            
            {#if isSubscribed}
                <div class="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl animate-enter">
                    <p class="text-xs text-blue-800 mb-3 font-medium">Testen Sie die Verbindung zum Server:</p>
                    <button type="button" onclick={testPush} disabled={isLoading} class="w-full py-2 bg-white border border-blue-200 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition-colors shadow-sm text-sm active:scale-95 cursor-pointer">📲 Test-Nachricht senden</button>
                </div>
            {/if}
        {/if}
        </div>

        <div class="border-t border-neutral-100 p-4 sm:p-6 md:p-8 bg-white/95 backdrop-blur-md flex flex-row gap-2 sm:gap-3 shrink-0 justify-end">
            <button type="button" onclick={close} aria-label="Speichern und Schließen" class="orga-button-primary shadow-indigo-600/20 flex-1 sm:flex-none py-3 sm:py-2.5 px-4 sm:px-6 active:scale-95 text-xs sm:text-sm flex justify-center items-center gap-1.5 cursor-pointer">
                <span>Speichern & Schließen</span>
            </button>
        </div>
    </div>
</dialog>