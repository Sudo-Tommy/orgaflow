<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import PortalAccessCardPrint from "$lib/components/portal/PortalAccessCardPrint.svelte";
    import QuickAccessMailModal from "$lib/components/portal/QuickAccessMailModal.svelte";
    import QRCode from 'qrcode';

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    // svelte-ignore non_reactive_update
    let printRef: ReturnType<typeof PortalAccessCardPrint>;
    let quickMailModal = $state() as any;

    let client = $state<any>(null);
    let explicitType = $state<'client' | 'contact' | null>(null);
    let isContact = $derived(explicitType === 'contact' || client?.company_name !== undefined || client?.collectionName === 'contacts');

    let displayName = $derived.by(() => {
        if (!client) return "";
        const fullName = `${client.name_first || ''} ${client.name_last || ''}`.trim();
        if (client.company_name) {
            return fullName ? `${fullName} (${client.company_name})` : client.company_name;
        }
        return fullName || client.email || (isContact ? 'Kontakt' : 'Klient');
    });

    let roleTitle = $derived.by(() => {
        if (!isContact) return "Klienten-Portal";
        if (client?.company_name) return "Einrichtungs- & Betreuer-Portal";
        return "Betreuer- & Angehörigen-Portal";
    });

    let nameLabel = $derived.by(() => {
        if (!isContact) return "Ausgestellt für:";
        if (client?.company_name) return "Einrichtung / Ansprechpartner:";
        return "Betreuer / Angehörige(r):";
    });

    let isLoading = $state(false);
    let isSaving = $state(false);
    let errorMsg = $state("");

    let portalPin = $state("");
    let portalCode = $state("");
    let customPinInput = $state("");
    let qrDataUrl = $state("");

    let activeView = $state<'manage' | 'print'>('manage');

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

    let fullPortalUrl = $derived.by(() => {
        if (!portalCode) return "";
        return `https://ihre-seniorenassistenz.com/portal?auth=${portalCode}`;
    });

    $effect(() => {
        if (fullPortalUrl) {
            QRCode.toDataURL(fullPortalUrl, {
                width: 220,
                margin: 2,
                color: { dark: '#0f172a', light: '#ffffff' }
            }).then(url => { qrDataUrl = url; }).catch(console.error);
        }
    });

    export async function open(clientData: any, type?: 'client' | 'contact') {
        client = clientData;
        explicitType = type || null;
        activeView = 'manage';
        errorMsg = "";
        portalPin = "";
        portalCode = "";
        customPinInput = "";
        dialog?.showModal();
        await loadAccessData('get');
    }

    export function close() {
        dialog?.close();
        client = null;
        explicitType = null;
    }

    async function loadAccessData(action: 'get' | 'generate' | 'set', customPin?: string) {
        if (!client) return;
        isLoading = true;
        errorMsg = "";

        try {
            const token = pb.authStore.token;
            const res = await fetch(`${apiBaseUrl}/admin/access-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    clientId: client.id,
                    type: isContact ? 'contact' : 'client',
                    action,
                    customPin
                })
            });

            let data: any = {};
            const text = await res.text();
            try {
                data = JSON.parse(text);
            } catch(e) {
                throw new Error(res.status === 404 ? "Endpunkt nicht gefunden. Bitte stellen Sie sicher, dass der Microservice neu gestartet wurde." : `Serverfehler (${res.status})`);
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Fehler beim Laden der Zugangsdaten.");
            }

            portalPin = data.portal_pin || "";
            portalCode = data.portal_code || "";
            customPinInput = portalPin;

            if (action === 'generate') {
                toastStore.success("Neue PIN & Zugangs-Code erfolgreich generiert!");
            } else if (action === 'set') {
                toastStore.success("Wunsch-PIN erfolgreich gespeichert!");
            }
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Abrufen der Zugangsdaten.";
            toastStore.error(errorMsg);
        } finally {
            isLoading = false;
            isSaving = false;
        }
    }

    async function handleGenerateNew() {
        if (!confirm("Möchten Sie wirklich eine neue PIN und einen neuen QR-Code generieren? Die bisherigen Zugangsdaten werden damit ungültig.")) return;
        await loadAccessData('generate');
    }

    async function handleSaveCustomPin() {
        const clean = customPinInput.trim();
        if (clean.length < 4) {
            toastStore.error("Die PIN muss mindestens 4 Ziffern lang sein.");
            return;
        }
        isSaving = true;
        await loadAccessData('set', clean);
    }

    function copyToClipboard(text: string, label: string) {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            toastStore.success(`${label} in die Zwischenablage kopiert!`);
        }
    }

    function triggerPrint() {
        activeView = 'print';
        setTimeout(() => {
            window.print();
        }, 300);
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-50 rounded-3xl w-full max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl border border-neutral-200">
        
        <!-- MODAL HEADER -->
        <div class="bg-white px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xl shadow-inner">
                    🪪
                </div>
                <div>
                    <h2 class="text-xl font-black text-brand-950 leading-tight">
                        {roleTitle}: {displayName}
                    </h2>
                    <p class="text-xs text-neutral-500 font-medium">Zugangsdaten & QR-Code für den sicheren Login ({isContact ? 'Betreuer / Pflegeheim' : 'Klient'})</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <!-- Ansicht wechseln -->
                <div class="bg-neutral-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold mr-2">
                    <button 
                        type="button"
                        onclick={() => activeView = 'manage'}
                        class="px-3 py-1.5 rounded-lg transition-all {activeView === 'manage' ? 'bg-white text-indigo-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}">
                        ⚙️ Verwalten
                    </button>
                    <button 
                        type="button"
                        onclick={() => activeView = 'print'}
                        class="px-3 py-1.5 rounded-lg transition-all {activeView === 'print' ? 'bg-white text-indigo-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}">
                        📄 Druckkarte
                    </button>
                </div>

                <button 
                    type="button"
                    onclick={() => quickMailModal?.open(client)} 
                    class="orga-button-ghost py-2 px-3 sm:px-4 text-xs font-bold inline-flex items-center gap-1.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-800 shadow-sm">
                    <span>✉️</span> <span class="hidden sm:inline">Quick-Mail Vorlage</span>
                </button>

                <button 
                    type="button"
                    onclick={triggerPrint} 
                    class="orga-button-primary py-2 px-3 sm:px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-brand-600/20">
                    <span>🖨️</span> <span class="hidden sm:inline">Karte drucken</span>
                </button>

                <button aria-label="Schließen" onclick={close} class="w-9 h-9 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                    ✕
                </button>
            </div>
        </div>

        <!-- MODAL BODY -->
        <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
            {#if isLoading && !portalPin}
                <div class="flex flex-col items-center justify-center py-20 text-neutral-500">
                    <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                    <p class="text-sm font-bold">Lade Zugangsdaten...</p>
                </div>
            {:else if errorMsg && !portalPin}
                <div class="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center">
                    <p class="font-bold mb-2">⚠️ {errorMsg}</p>
                    <button onclick={() => loadAccessData('get')} class="orga-button-primary mt-2 text-xs">Erneut versuchen</button>
                </div>
            {:else if activeView === 'print'}
                <!-- DRUCKANSICHT -->
                <div class="py-2">
                    <PortalAccessCardPrint 
                        bind:this={printRef}
                        clientName={displayName}
                        clientEmail={client?.email || ''}
                        {portalPin}
                        {portalCode}
                        portalUrl={fullPortalUrl}
                        {roleTitle}
                        subtitle="Ihre persönliche Zugangskarte"
                        {nameLabel}
                    />
                </div>
            {:else}
                <!-- VERWALTUNGSANSICHT -->
                <div class="space-y-6">
                    
                    <!-- TOP CARD: SCHNELLÜBERSICHT -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        <!-- PIN-BOX -->
                        <div class="orga-card-white p-5 border border-neutral-200 flex flex-col justify-between">
                            <div>
                                <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1">Persönliche PIN</span>
                                <div class="flex items-center gap-2 my-2">
                                    <span class="text-3xl font-black font-mono tracking-wider text-indigo-950 select-all">{portalPin || '------'}</span>
                                </div>
                                <p class="text-xs text-neutral-500">Wird für den klassischen Login auf dem PC zusammen mit der E-Mail genutzt.</p>
                            </div>
                            <div class="mt-4 flex gap-2">
                                <button type="button" onclick={() => copyToClipboard(portalPin, 'PIN')} class="orga-button-ghost py-1.5 px-3 text-xs flex-1 font-bold">
                                    📋 PIN kopieren
                                </button>
                                <button type="button" onclick={handleGenerateNew} disabled={isLoading} class="orga-button-ghost py-1.5 px-2.5 text-xs text-amber-700 hover:bg-amber-50" title="Neue Zufalls-PIN generieren">
                                    🔄 Neu
                                </button>
                            </div>
                        </div>

                        <!-- DIREKT-LINK -->
                        <div class="orga-card-white p-5 border border-neutral-200 flex flex-col justify-between">
                            <div>
                                <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1">Direkt-Zugangs-Link</span>
                                <p class="text-xs font-mono text-neutral-700 bg-neutral-50 p-2 rounded-lg border border-neutral-200 break-all my-2 line-clamp-3 select-all">
                                    {fullPortalUrl}
                                </p>
                                <p class="text-xs text-neutral-500">Einfach per WhatsApp oder SMS versenden &ndash; loggt den Klienten direkt ein!</p>
                            </div>
                            <div class="mt-4">
                                <button type="button" onclick={() => copyToClipboard(fullPortalUrl, 'Direkt-Link')} class="orga-button-ghost w-full py-1.5 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                                    🔗 Link kopieren
                                </button>
                            </div>
                        </div>

                        <!-- QR-CODE -->
                        <div class="orga-card-white p-5 border border-neutral-200 flex flex-col items-center justify-between text-center">
                            <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1">QR-Code</span>
                            <div class="p-2 bg-white rounded-xl border border-neutral-200 shadow-sm my-1">
                                {#if qrDataUrl}
                                    <img src={qrDataUrl} alt="QR-Code" class="w-24 h-24 object-contain" />
                                {/if}
                            </div>
                            <button type="button" onclick={triggerPrint} class="orga-button-primary w-full py-1.5 text-xs font-bold mt-2">
                                🖨️ Als Karte drucken
                            </button>
                        </div>
                    </div>

                    <!-- EIGENE WUNSCH-PIN FESTLEGEN -->
                    <div class="orga-card-white p-5 border border-neutral-200">
                        <h3 class="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
                            <span>✏️</span> Eigene Wunsch-PIN festlegen
                        </h3>
                        <p class="text-xs text-neutral-500 mb-3">
                            Möchten Sie eine leicht merkbare PIN für den Klienten hinterlegen (z. B. 4 bis 6 Ziffern)?
                        </p>
                        <form onsubmit={(e) => { e.preventDefault(); handleSaveCustomPin(); }} class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                            <input 
                                type="text"
                                bind:value={customPinInput}
                                placeholder="z. B. 123456"
                                maxlength="12"
                                class="orga-input-clear py-2 text-sm font-mono max-w-xs"
                                disabled={isSaving || isLoading}
                            />
                            <button 
                                type="submit" 
                                disabled={isSaving || isLoading || !customPinInput.trim() || customPinInput.trim() === portalPin}
                                class="orga-button-primary py-2 px-5 text-xs font-bold shrink-0">
                                {isSaving ? 'Speichert...' : 'PIN speichern'}
                            </button>
                        </form>
                    </div>

                    <!-- SENIOREN-HINWEIS -->
                    <div class="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950">
                        <span class="text-xl shrink-0">💡</span>
                        <div class="space-y-1">
                            <p class="font-bold">Seniorenfreundlicher Praxis-Tipp:</p>
                            <p class="text-indigo-900/80 leading-relaxed">
                                Drucken Sie die <strong>Zugangskarte</strong> mit dem Button oben rechts aus und übergeben Sie sie dem Klienten oder dessen Angehörigen bei Ihrem nächsten Termin. 
                                Ältere Menschen müssen dadurch kein Passwort tippen, sondern halten einfach ihr Tablet oder Smartphone an den QR-Code.
                            </p>
                        </div>
                    </div>

                </div>
            {/if}
        </div>
    </div>
    
    <QuickAccessMailModal bind:this={quickMailModal} />
</dialog>
