<script lang="ts">
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { autoGrow } from '$lib/actions/autoGrow';
    import { X, CheckCircle2, FileText, Save, Sparkles } from 'lucide-svelte';
    import type { AppointmentRecord, ClientRecord } from '$lib/types/orgaTypes';
    import CaregiverChecklistSection from './CaregiverChecklistSection.svelte';
    import CaregiverAppointmentTimeKm from './CaregiverAppointmentTimeKm.svelte';
    import CaregiverAppointmentSignature from './CaregiverAppointmentSignature.svelte';
    import CaregiverAppointmentPhotos from './CaregiverAppointmentPhotos.svelte';

    let isOpen = $state(false);
    let appt = $state<AppointmentRecord | null>(null);
    let dialog = $state<HTMLDialogElement | null>(null);

    let status = $state('Offen');
    let report = $state('');
    let notes = $state('');
    let checklist = $state<Array<{ text: string; done: boolean }>>([]);
    let durationMinutes = $state(60);
    let kilometers = $state(0);
    let signatureDataUrl = $state('');
    let signerName = $state('');
    let photos = $state<Array<{ name: string; dataUrl: string }>>([]);

    $effect(() => {
        if (isOpen && appt) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    export function open(targetAppt: AppointmentRecord) {
        appt = targetAppt;
        isOpen = true;
        status = targetAppt.status || (targetAppt.settled ? 'Erledigt' : 'Offen');
        report = targetAppt.report || '';
        notes = targetAppt.notes || '';

        const rawCl = targetAppt.checklist;
        if (rawCl && typeof rawCl === 'object' && !Array.isArray(rawCl)) {
            checklist = Array.isArray(rawCl.items) ? rawCl.items : [];
            signatureDataUrl = rawCl.signature || '';
            signerName = rawCl.signed_by || '';
            photos = Array.isArray(rawCl.photos) ? rawCl.photos : [];
            durationMinutes = rawCl.recorded_minutes || 60;
            kilometers = rawCl.recorded_km || 0;
        } else if (Array.isArray(rawCl)) {
            checklist = rawCl.map(item => typeof item === 'string' ? { text: item, done: false } : { text: item.text || item.title || '', done: !!item.done });
            signatureDataUrl = '';
            photos = [];
        } else {
            checklist = [];
            signatureDataUrl = '';
            photos = [];
        }
    }

    export function close() {
        isOpen = false;
        appt = null;
    }

    function insertTemplate(tpl: string) {
        report = report.trim() ? `${report.trim()}\n• ${tpl}` : `• ${tpl}`;
    }

    function handleToggleChecklist(index: number) {
        checklist = checklist.map((item, i) => i === index ? { ...item, done: !item.done } : item);
    }
    function handleAddChecklist(text: string) {
        checklist = [...checklist, { text, done: false }];
    }
    function handleRemoveChecklist(index: number) {
        checklist = checklist.filter((_, i) => i !== index);
    }

    async function handleSave(newStatus?: string) {
        if (!appt) return;
        const targetStatus = newStatus || status;
        const success = await caregiverPortal.completeAppointment(appt.id, {
            status: targetStatus,
            report,
            notes,
            checklist,
            durationMinutes,
            kilometers,
            signatureDataUrl,
            signerName,
            photos
        });
        if (success) close();
    }

    let client = $derived.by(() => {
        if (!appt) return null;
        const exp = (appt as any).expand?.client?.[0] || (Array.isArray((appt as any).expand?.client) ? (appt as any).expand.client[0] : (appt as any).expand?.client);
        if (exp) return exp as ClientRecord;
        const raw = appt.client;
        const cid = Array.isArray(raw) ? raw[0] : raw;
        return cid && typeof cid === 'string' ? orgaStore.clients.getById(cid) : null;
    });

    let clientName = $derived(caregiverPortal.getClientFullName(client));
</script>

{#if isOpen && appt}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs w-full max-w-xl mx-auto my-auto rounded-3xl border-none outline-none animate-enter z-50"
        onclick={(e) => { if (e.target === dialog) close(); }}
        oncancel={(e) => { e.preventDefault(); close(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full flex flex-col h-auto">
            <!-- Header -->
            <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0 rounded-t-3xl">
                <div class="min-w-0 pr-2">
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full {status === 'Erledigt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
                        {status}
                    </span>
                    <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate mt-1">{clientName}</h2>
                    <p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate">{appt.description || 'Betreuungstermin'}</p>
                </div>
                <button type="button" onclick={close} aria-label="Schließen" class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Body (Zero-Inner-Scroll) -->
            <div class="p-4 sm:p-6 space-y-4">
                <!-- Status Switcher -->
                <div class="grid grid-cols-3 gap-2">
                    {#each [{ id: 'Offen', label: 'Offen', cls: 'bg-amber-500 text-white' }, { id: 'In Bearbeitung', label: 'In Arbeit', cls: 'bg-indigo-600 text-white' }, { id: 'Erledigt', label: 'Erledigt', cls: 'bg-emerald-600 text-white' }] as s}
                        <button type="button" onclick={() => (status = s.id)} class="py-2 px-3 rounded-xl text-xs font-bold transition-all border {status === s.id ? `${s.cls} border-transparent shadow-sm` : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}">
                            {s.label}
                        </button>
                    {/each}
                </div>

                <!-- Zeit & Kilometer -->
                <CaregiverAppointmentTimeKm bind:durationMinutes bind:kilometers />

                <!-- Checkliste -->
                <CaregiverChecklistSection {checklist} onToggle={handleToggleChecklist} onAdd={handleAddChecklist} onRemove={handleRemoveChecklist} />

                <!-- Dokumentation / Bericht -->
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <label for="dlg-report" class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText class="w-3.5 h-3.5 text-indigo-500" /><span>Einsatzbericht / Dokumentation</span>
                        </label>
                        <div class="flex items-center gap-1">
                            {#each ['Einkauf erledigt', 'Spaziergang', 'Arztbegleitung', 'Haushaltshilfe'] as tpl}
                                <button type="button" onclick={() => insertTemplate(tpl)} class="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium">
                                    + {tpl}
                                </button>
                            {/each}
                        </div>
                    </div>
                    <textarea id="dlg-report" use:autoGrow bind:value={report} placeholder="Tätigkeiten, Wohlbefinden und Vorkommnisse dokumentieren..." class="auto-grow w-full p-3.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white resize-none"></textarea>
                </div>

                <!-- Interne Notizen -->
                <div class="space-y-1">
                    <label for="dlg-notes" class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Interne Übergabehinweise</label>
                    <textarea id="dlg-notes" use:autoGrow bind:value={notes} placeholder="Hinweise für die nächste Betreuungskraft oder das Büro..." class="auto-grow w-full p-3.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white resize-none"></textarea>
                </div>

                <!-- Belege & Fotos -->
                <CaregiverAppointmentPhotos bind:photos />

                <!-- Klienten-Unterschrift -->
                <CaregiverAppointmentSignature bind:signatureDataUrl bind:signerName defaultSignerName={clientName} />
            </div>

            <!-- Footer -->
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0 sticky bottom-0 z-10 backdrop-blur-md">
                <button type="button" onclick={close} disabled={caregiverPortal.isSaving} class="w-full sm:w-auto min-h-12 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold cursor-pointer">Abbrechen</button>
                <button type="button" onclick={() => handleSave()} disabled={caregiverPortal.isSaving} class="w-full sm:w-auto min-h-12 px-5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
                    <Save class="w-4 h-4" /><span>Zwischenspeichern</span>
                </button>
                <button type="button" onclick={() => handleSave('Erledigt')} disabled={caregiverPortal.isSaving} class="w-full sm:w-auto min-h-12 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer">
                    <CheckCircle2 class="w-4 h-4" /><span>Einsatz abschließen</span>
                </button>
            </div>
        </div>
    </dialog>
{/if}
