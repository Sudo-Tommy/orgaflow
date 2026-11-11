<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { Copy, Check, Download } from 'lucide-svelte';
    import { ensurePortalCode, buildQrText, generateQrCode, downloadQrFile, type TabType } from './shareQrUtils';
    import ShareQrTabSelectors from './ShareQrTabSelectors.svelte';

    let dialog = $state<HTMLDialogElement | null>(null);
    let isOpen = $state(false);
    let activeTab = $state<TabType>('client-portal');

    let selectedClientId = $state<string>('');
    let availableClients = $derived.by(() => (orgaStore.clients?.data || []).filter((c: any) => rbacService.isRecordInScope(c, 'client')));
    let selectedClient = $derived(availableClients.find((c: any) => c.id === selectedClientId) || availableClients[0] || null);

    let selectedContactId = $state<string>('');
    let availableContacts = $derived.by(() => (orgaStore.contacts?.data || []).filter((c: any) => rbacService.isRecordInScope(c, 'contact')));
    let selectedContact = $derived(availableContacts.find((c: any) => c.id === selectedContactId) || availableContacts[0] || null);

    let vcardSource = $state<'me' | 'contact'>('me');
    let selectedVcardContactId = $state<string>('');
    let selectedVcardContact = $derived(availableContacts.find((c: any) => c.id === selectedVcardContactId) || availableContacts[0] || null);

    let todaysAppointments = $derived.by(() => {
        const today = new Date().toDateString();
        return (orgaStore.appointments?.data || []).filter((a: any) => a.appointment && new Date(a.appointment).toDateString() === today && rbacService.isRecordInScope(a, 'appointment'));
    });
    let selectedAppointmentId = $state<string>('');
    let selectedAppointment = $derived(todaysAppointments.find((a: any) => a.id === selectedAppointmentId) || todaysAppointments[0] || null);

    let qrDataUrl = $state<string>('');
    let rawQrText = $state<string>('');
    let isCopied = $state(false);

    export function open(preselectedItem?: any, type?: 'client' | 'contact' | 'vcard' | 'appointment') {
        if (orgaStore.contacts && (!orgaStore.contacts.data || orgaStore.contacts.data.length === 0)) orgaStore.contacts.init().catch(console.error);
        if (orgaStore.clients && (!orgaStore.clients.data || orgaStore.clients.data.length === 0)) orgaStore.clients.init().catch(console.error);

        if (preselectedItem?.id) {
            const isContact = type === 'contact' || preselectedItem?.company_name !== undefined || preselectedItem?.collectionName === 'contacts';
            if (isContact) {
                selectedContactId = preselectedItem.id;
                selectedVcardContactId = preselectedItem.id;
                activeTab = 'contact-portal';
            } else {
                selectedClientId = preselectedItem.id;
                activeTab = 'client-portal';
            }
        } else if (type) {
            activeTab = (type === 'contact' ? 'contact-portal' : (type === 'client' ? 'client-portal' : type)) as TabType;
        } else if (activeTab === 'portal') {
            activeTab = 'client-portal';
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
        const companyName = orgaStore.company?.data?.[0]?.name;
        rawQrText = buildQrText(activeTab, selectedClient, selectedContact, selectedAppointment, vcardSource, selectedVcardContact, companyName);

        if (activeTab === 'client-portal' || activeTab === 'portal') {
            ensurePortalCode(selectedClient, 'client', () => updateQrCode());
        } else if (activeTab === 'contact-portal') {
            ensurePortalCode(selectedContact, 'contact', () => updateQrCode());
        }

        try {
            qrDataUrl = await generateQrCode(rawQrText);
        } catch (err) {
            console.error('[QRCode Error]:', err);
        }
    }

    $effect(() => {
        if (!selectedClientId && availableClients.length > 0) selectedClientId = availableClients[0].id;
        if (!selectedContactId && availableContacts.length > 0) selectedContactId = availableContacts[0].id;
        if (!selectedVcardContactId && availableContacts.length > 0) selectedVcardContactId = availableContacts[0].id;
    });

    $effect(() => {
        if (activeTab || selectedClientId || selectedContactId || selectedAppointmentId || vcardSource || selectedVcardContactId) {
            updateQrCode();
        }
    });

    async function copyToClipboard() {
        if (!rawQrText) return;
        try {
            await navigator.clipboard.writeText(rawQrText);
            isCopied = true;
            toastStore.success('Freigabe-Link kopiert! 📋');
            setTimeout(() => { isCopied = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    function handleDownload() {
        let name = 'qr';
        if ((activeTab === 'client-portal' || activeTab === 'portal') && selectedClient) name = `portal-klient-${selectedClient.name_last || selectedClient.id}`;
        else if (activeTab === 'contact-portal' && selectedContact) name = `portal-kontakt-${selectedContact.name_last || selectedContact.company_name || selectedContact.id}`;
        else if (activeTab === 'vcard') name = vcardSource === 'contact' ? `vcard-${selectedVcardContact?.name_last || 'kontakt'}` : `vcard-${pb.authStore.model?.name_last || 'mitarbeiter'}`;
        else if (activeTab === 'appointment') name = `termin-${selectedAppointment?.id || 'scan'}`;
        downloadQrFile(qrDataUrl, name);
        toastStore.success('QR-Code heruntergeladen! 📥');
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-xl mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl border-none shadow-2xl z-50 outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-slate-800 w-full flex flex-col relative overflow-hidden transition-colors">
        <div class="p-6 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 text-lg shrink-0">
                    📱
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            Vor-Ort-Freigabe
                        </span>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                            DSGVO-konform
                        </span>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                        QR-Code teilen
                    </h3>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={close}
                class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer"
            >✕</button>
        </div>

        <div class="p-6 space-y-4 flex-1">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-100 dark:bg-slate-800/80 rounded-2xl border border-neutral-200/50 dark:border-slate-700/50">
                {#each [
                    { id: 'client-portal', icon: '👤', label: 'Klienten' },
                    { id: 'contact-portal', icon: '👥', label: 'Kontakte' },
                    { id: 'vcard', icon: '📇', label: 'Visitenkarte' },
                    { id: 'appointment', icon: '📅', label: 'Termin-Scan' }
                ] as tab}
                    <button
                        type="button"
                        onclick={() => activeTab = tab.id as TabType}
                        class="py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer {activeTab === tab.id || (tab.id === 'client-portal' && activeTab === 'portal') ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                    >
                        <span class="text-base">{tab.icon}</span>
                        <span class="truncate max-w-full">{tab.label}</span>
                    </button>
                {/each}
            </div>

            <ShareQrTabSelectors
                {activeTab}
                {availableClients}
                bind:selectedClientId
                {availableContacts}
                bind:selectedContactId
                bind:vcardSource
                bind:selectedVcardContactId
                {todaysAppointments}
                bind:selectedAppointmentId
            />

            <div class="bg-neutral-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-neutral-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                {#if qrDataUrl}
                    <div class="p-3 bg-white rounded-2xl shadow-md border border-neutral-100 mb-2.5">
                        <img src={qrDataUrl} alt="QR-Code" class="w-48 h-48 sm:w-52 sm:h-52 object-contain" />
                    </div>
                    <p class="text-[11px] font-mono text-neutral-400 break-all max-w-xs truncate">
                        {rawQrText.startsWith('BEGIN:VCARD') ? (vcardSource === 'contact' ? (selectedVcardContact?.name_last || 'Kontakt') : 'Meine Visitenkarte') : rawQrText}
                    </p>
                {:else}
                    <div class="w-48 h-48 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-slate-700 flex items-center justify-center text-neutral-400 text-xs">
                        QR-Code wird erzeugt...
                    </div>
                {/if}
            </div>

            <div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <span>🔒</span>
                <span>DSGVO-konform: Verschlüsselte Direktverbindung ohne externe Tracking-Server.</span>
            </div>
        </div>

        <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button 
                type="button" 
                onclick={close} 
                class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
                Schließen
            </button>
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    onclick={copyToClipboard}
                    class="py-2.5 px-3.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                    {#if isCopied}
                        <Check class="w-4 h-4 text-emerald-600" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-4 h-4" />
                        <span>Kopieren</span>
                    {/if}
                </button>
                <button
                    type="button"
                    onclick={handleDownload}
                    class="orga-button-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-indigo-600/20"
                >
                    <Download class="w-4 h-4" />
                    <span>Herunterladen</span>
                </button>
            </div>
        </div>
    </div>
</dialog>
