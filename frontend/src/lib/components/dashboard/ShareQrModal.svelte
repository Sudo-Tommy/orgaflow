<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import QRCode from 'qrcode';
    import { X, QrCode, User, Phone, Mail, Copy, Check, Download, Share2, Sparkles, ExternalLink } from 'lucide-svelte';

    let dialog = $state<HTMLDialogElement | null>(null);
    let isOpen = $state(false);

    let activeTab = $state<'portal' | 'vcard' | 'appointment'>('portal');
    let selectedClientId = $state<string>('');
    let qrDataUrl = $state<string>('');
    let rawQrText = $state<string>('');
    let isCopied = $state(false);

    // Filterbare Klienten basierend auf RBAC
    let availableClients = $derived.by(() => {
        const all = orgaStore.clients?.data || [];
        return all.filter((c: any) => rbacService.isRecordInScope(c, 'client'));
    });

    let selectedClient = $derived(
        availableClients.find((c: any) => c.id === selectedClientId) || availableClients[0] || null
    );

    // Heutige Termine für die Check-In Freigabe
    let todaysAppointments = $derived.by(() => {
        const today = new Date().toDateString();
        return (orgaStore.appointments?.data || []).filter((a: any) => {
            if (!a.appointment) return false;
            return new Date(a.appointment).toDateString() === today && rbacService.isRecordInScope(a, 'appointment');
        });
    });
    let selectedAppointmentId = $state<string>('');
    let selectedAppointment = $derived(
        todaysAppointments.find((a: any) => a.id === selectedAppointmentId) || todaysAppointments[0] || null
    );

    export function open(preselectedClient?: any) {
        if (preselectedClient?.id) {
            selectedClientId = preselectedClient.id;
            activeTab = 'portal';
        } else if (availableClients.length > 0) {
            selectedClientId = availableClients[0].id;
        }
        isOpen = true;
        dialog?.showModal();
        updateQrCode();
    }

    export function close() {
        isOpen = false;
        dialog?.close();
    }

    async function updateQrCode() {
        if (activeTab === 'portal') {
            if (!selectedClient) {
                qrDataUrl = '';
                rawQrText = '';
                return;
            }
            const authKey = selectedClient.portal_code || selectedClient.id;
            rawQrText = `https://ihre-seniorenassistenz.com/portal?auth=${authKey}`;
        } else if (activeTab === 'vcard') {
            const u = pb.authStore.model;
            const firstName = u?.name_first || '';
            const lastName = u?.name_last || '';
            const phone = u?.phone || u?.handy || '';
            const email = u?.email || '';
            const company = orgaStore.company?.data?.[0]?.name || 'OrgaFlow Seniorenassistenz';
            
            rawQrText = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${firstName} ${lastName}\nORG:${company}\nTEL;TYPE=CELL:${phone}\nEMAIL:${email}\nURL:https://ihre-seniorenassistenz.com\nEND:VCARD`;
        } else if (activeTab === 'appointment') {
            if (!selectedAppointment) {
                rawQrText = `https://ihre-seniorenassistenz.com/portal`;
            } else {
                rawQrText = `https://ihre-seniorenassistenz.com/portal/appointments?id=${selectedAppointment.id}`;
            }
        }

        try {
            if (rawQrText) {
                qrDataUrl = await QRCode.toDataURL(rawQrText, {
                    width: 320,
                    margin: 2,
                    color: {
                        dark: '#1e1b4b',
                        light: '#ffffff'
                    }
                });
            }
        } catch (err) {
            console.error('[QRCode Error]:', err);
        }
    }

    $effect(() => {
        // Reaktiv aktualisieren wenn Tab oder Selektion wechselt
        if (activeTab || selectedClientId || selectedAppointmentId) {
            updateQrCode();
        }
    });

    async function copyToClipboard() {
        if (!rawQrText) return;
        try {
            await navigator.clipboard.writeText(rawQrText);
            isCopied = true;
            toastStore.success('Freigabe-Link in Zwischenablage kopiert! 📋');
            setTimeout(() => { isCopied = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    function downloadQr() {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `orgaflow-qr-${activeTab}-${Date.now()}.png`;
        link.href = qrDataUrl;
        link.click();
        toastStore.success('QR-Code erfolgreich heruntergeladen! 📥');
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-lg m-0 sm:m-auto fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto rounded-t-3xl sm:rounded-3xl border-none shadow-2xl z-[9999] touch-pan-y"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="form-mobile-container sm:h-auto sm:min-h-0 bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full flex flex-col relative overflow-hidden shadow-2xl border border-neutral-100 dark:border-slate-800">
        
        <!-- Header -->
        <div class="px-5 sm:px-6 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                    📱
                </div>
                <div>
                    <h2 class="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-tight">
                        QR-Code Vor-Ort-Freigabe
                    </h2>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 font-medium">
                        DSGVO-konformes Teilen für Klienten & Angehörige
                    </p>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={close}
                class="w-10 h-10 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shrink-0"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Scrollbarer Body -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
            
            <!-- Modus Switcher -->
            <div class="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-slate-800 rounded-2xl">
                <button
                    type="button"
                    onclick={() => activeTab = 'portal'}
                    class="py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-1 {activeTab === 'portal' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900'}"
                >
                    <span>👤</span>
                    <span>Klienten-Portal</span>
                </button>
                <button
                    type="button"
                    onclick={() => activeTab = 'vcard'}
                    class="py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-1 {activeTab === 'vcard' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900'}"
                >
                    <span>📇</span>
                    <span>Visitenkarte</span>
                </button>
                <button
                    type="button"
                    onclick={() => activeTab = 'appointment'}
                    class="py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-1 {activeTab === 'appointment' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900'}"
                >
                    <span>📅</span>
                    <span>Termin-Scan</span>
                </button>
            </div>

            <!-- Selektoren je nach Modus -->
            {#if activeTab === 'portal'}
                <div class="space-y-1.5">
                    <label for="qr-client-select" class="block text-xs font-bold text-neutral-700 dark:text-slate-300">
                        Klienten auswählen:
                    </label>
                    <select
                        id="qr-client-select"
                        bind:value={selectedClientId}
                        class="w-full h-11 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {#each availableClients as c}
                            <option value={c.id}>
                                {c.name_first || ''} {c.name_last || ''} {c.city ? `(${c.city})` : ''}
                            </option>
                        {/each}
                    </select>
                </div>
            {:else if activeTab === 'appointment'}
                <div class="space-y-1.5">
                    <label for="qr-app-select" class="block text-xs font-bold text-neutral-700 dark:text-slate-300">
                        Heutigen Termin auswählen:
                    </label>
                    {#if todaysAppointments.length > 0}
                        <select
                            id="qr-app-select"
                            bind:value={selectedAppointmentId}
                            class="w-full h-11 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            {#each todaysAppointments as app}
                                <option value={app.id}>
                                    {new Date(app.appointment || '').toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr · {app.title || 'Termin'}
                                </option>
                            {/each}
                        </select>
                    {:else}
                        <p class="text-xs text-neutral-400 p-2.5 bg-neutral-50 dark:bg-slate-800 rounded-xl">
                            Heute sind keine Termine in Ihrem Kalender hinterlegt.
                        </p>
                    {/if}
                </div>
            {:else}
                <div class="p-3 bg-neutral-50 dark:bg-slate-800/80 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs text-neutral-600 dark:text-slate-300">
                    <p class="font-bold text-neutral-900 dark:text-white mb-0.5">Digitale Visitenkarte (vCard)</p>
                    <p>Beim Scannen mit dem Smartphone öffnet sich direkt der Dialog "Neuen Kontakt anlegen" mit Ihren hinterlegten Rufnummern und Daten.</p>
                </div>
            {/if}

            <!-- QR Code Anzeige Kachel -->
            <div class="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-neutral-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
                {#if qrDataUrl}
                    <div class="p-3 bg-white rounded-2xl shadow-md border border-neutral-100 mb-3">
                        <img src={qrDataUrl} alt="QR-Code" class="w-56 h-56 object-contain" />
                    </div>
                    <p class="text-xs font-mono text-neutral-400 break-all max-w-xs truncate">
                        {rawQrText.startsWith('BEGIN:VCARD') ? 'vCard: ' + (pb.authStore.model?.email || 'Kontakt') : rawQrText}
                    </p>
                {:else}
                    <div class="w-48 h-48 rounded-2xl border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-xs">
                        QR-Code wird erzeugt...
                    </div>
                {/if}
            </div>

            <div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <span>🔒</span>
                <span>DSGVO-konform: Verschlüsselte Direktverbindung ohne Speicherung auf externen Tracking-Servern.</span>
            </div>
        </div>

        <!-- Sticky Footer -->
        <div class="p-4 border-t border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onclick={copyToClipboard}
                    class="h-11 px-4 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer"
                >
                    {#if isCopied}
                        <Check class="w-4 h-4 text-emerald-600" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-4 h-4" />
                        <span>Link kopieren</span>
                    {/if}
                </button>
                <button
                    type="button"
                    onclick={downloadQr}
                    class="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer"
                >
                    <Download class="w-4 h-4" />
                    <span>QR herunterladen</span>
                </button>
            </div>
        </div>
    </div>
</dialog>
