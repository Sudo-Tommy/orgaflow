<script lang="ts">
    import { X, Trash2, UserCheck, MapPin, Building } from "lucide-svelte";
    import { autoGrow } from "$lib/actions/autoGrow";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { sortAlphabetical } from "$lib/utils/sortHelper";
    import { parseAdmissionData, saveAdmissionReview, type AdmissionFormData } from "./admissionReviewService";

    let { onClientAccepted, onClientDeleted }: { 
        onClientAccepted?: (client: any) => void; 
        onClientDeleted?: (id: string) => void; 
    } = $props();

    let dialog = $state<HTMLDialogElement>();
    let client = $state<any>(null);
    let formData = $state<AdmissionFormData | null>(null);
    let isSaving = $state(false), isDeleting = $state(false);

    let sortedInsurances = $derived(sortAlphabetical(orgaStore.insurancies?.data || [], (i: any) => i.name || ''));

    export function open(clientRecord: any) {
        client = clientRecord;
        formData = parseAdmissionData(clientRecord);
        dialog?.showModal();
    }

    export function close() { dialog?.close(); client = null; formData = null; }

    async function handleSave() {
        if (!formData || !client) return;
        isSaving = true;
        hapticFeedback.tap();
        try {
            const saved = await saveAdmissionReview(client.id, formData, client);
            if (saved) { close(); if (onClientAccepted) onClientAccepted(saved); }
        } catch (err: any) {
            toastStore.error(err?.message || "Fehler beim Speichern der Aufnahme.");
            hapticFeedback.error();
        } finally { isSaving = false; }
    }

    async function handleDelete() {
        if (!client) return;
        const name = `${client.name_first || ''} ${client.name_last || ''}`.trim() || 'Diesen Klienten';
        if (!(await confirmStore.ask(`Möchten Sie den Aufnahmeantrag für ${name} wirklich unwiderruflich löschen?`, "Aufnahme ablehnen?", "Endgültig löschen", "Abbrechen", true))) return;
        isDeleting = true;
        try {
            await pb.collection('clients').delete(client.id);
            if (orgaStore.clients) orgaStore.clients.data = orgaStore.clients.data.filter((c: any) => c.id !== client.id);
            toastStore.info("Aufnahmeantrag wurde gelöscht.");
            hapticFeedback.warning();
            const id = client.id;
            close();
            if (onClientDeleted) onClientDeleted(id);
        } catch (err: any) {
            toastStore.error(err?.message || "Fehler beim Löschen.");
        } finally { isDeleting = false; }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-md w-[96vw] max-w-4xl max-h-[92vh] mx-auto my-auto rounded-3xl outline-none z-50 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    {#if formData}
        <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full h-auto max-h-[90vh] flex flex-col relative shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
            <!-- Header -->
            <div class="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex items-center justify-between gap-3 shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800 flex items-center justify-center text-xl shrink-0">
                        <UserCheck class="w-5 h-5" />
                    </div>
                    <div>
                        <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                            Neuaufnahme prüfen & übernehmen
                        </h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400">
                            Angaben aus dem Portal validieren und direkt als Klient speichern
                        </p>
                    </div>
                </div>
                <button type="button" onclick={close} class="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Form Body (2 Spalten) -->
            <div class="p-5 sm:p-6 overflow-y-auto space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <!-- Spalte 1: Stammdaten & Adresse -->
                    <div class="space-y-4">
                        <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Persönliche Angaben</h3>
                        <div class="grid grid-cols-3 gap-2.5">
                            <div>
                                <label for="adm-salutation" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Anrede</label>
                                <select id="adm-salutation" bind:value={formData.salutation} class="orga-input-clear py-2 text-xs">
                                    <option value="Frau">Frau</option>
                                    <option value="Herr">Herr</option>
                                    <option value="Keine Angabe">Keine Angabe</option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label for="adm-first" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Vorname *</label>
                                <input id="adm-first" type="text" bind:value={formData.name_first} class="orga-input-clear py-2 text-xs" />
                            </div>
                        </div>
                        <div>
                            <label for="adm-last" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nachname *</label>
                            <input id="adm-last" type="text" bind:value={formData.name_last} class="orga-input-clear py-2 text-xs" />
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label for="adm-birth" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Geburtsdatum</label>
                                <input id="adm-birth" type="date" bind:value={formData.birthdate} class="orga-input-clear py-2 text-xs" />
                            </div>
                            <div>
                                <label for="adm-marital" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Familienstand</label>
                                <input id="adm-marital" type="text" bind:value={formData.marital_status} placeholder="z. B. Verwitwet" class="orga-input-clear py-2 text-xs" />
                            </div>
                        </div>

                        <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pt-2">Wohnort & Kontakt</h3>
                        <div class="grid grid-cols-3 gap-2.5">
                            <div class="col-span-2">
                                <label for="adm-street" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Straße</label>
                                <input id="adm-street" type="text" bind:value={formData.street} class="orga-input-clear py-2 text-xs" />
                            </div>
                            <div>
                                <label for="adm-nr" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Hausnr.</label>
                                <input id="adm-nr" type="text" bind:value={formData.housenr} class="orga-input-clear py-2 text-xs" />
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2.5">
                            <div>
                                <label for="adm-zip" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">PLZ</label>
                                <input id="adm-zip" type="text" bind:value={formData.zip} class="orga-input-clear py-2 text-xs" />
                            </div>
                            <div class="col-span-2">
                                <label for="adm-city" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Ort</label>
                                <input id="adm-city" type="text" bind:value={formData.city} class="orga-input-clear py-2 text-xs" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label for="adm-phone" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Telefon</label>
                                <input id="adm-phone" type="text" bind:value={formData.phone} class="orga-input-clear py-2 text-xs" />
                            </div>
                            <div>
                                <label for="adm-email" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">E-Mail</label>
                                <input id="adm-email" type="email" bind:value={formData.email} class="orga-input-clear py-2 text-xs" />
                            </div>
                        </div>
                    </div>

                    <!-- Spalte 2: Pflege & Betreuer -->
                    <div class="space-y-4">
                        <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pflege & Krankenkasse</h3>
                        <div class="grid grid-cols-3 gap-2.5">
                            <div>
                                <label for="adm-pg" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Pflegegrad</label>
                                <select id="adm-pg" bind:value={formData.level_of_care} class="orga-input-clear py-2 text-xs">
                                    <option value="">Keiner</option>
                                    <option value="1">Grad 1</option>
                                    <option value="2">Grad 2</option>
                                    <option value="3">Grad 3</option>
                                    <option value="4">Grad 4</option>
                                    <option value="5">Grad 5</option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label for="adm-ins-nr" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Versichertennr.</label>
                                <input id="adm-ins-nr" type="text" bind:value={formData.insurance_nr} placeholder="z. B. A123456789" class="orga-input-clear py-2 text-xs" />
                            </div>
                        </div>
                        <div>
                            <label for="adm-ins" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Krankenkasse</label>
                            <select id="adm-ins" bind:value={formData.insurance} class="orga-input-clear py-2 text-xs">
                                <option value="">Keine Kasse zugewiesen</option>
                                {#each sortedInsurances as ins (ins.id)}
                                    <option value={ins.id}>{ins.name}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label class="flex items-center gap-2 cursor-pointer mb-2">
                                <input type="checkbox" bind:checked={formData.has_caregiver} class="rounded text-indigo-600" />
                                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Gesetzlicher Betreuer / Bevollmächtigte(r)</span>
                            </label>
                            {#if formData.has_caregiver}
                                <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                                    <div class="grid grid-cols-2 gap-2">
                                        <input type="text" bind:value={formData.caregiver_name_first} placeholder="Vorname" class="orga-input-clear py-1.5 text-xs" />
                                        <input type="text" bind:value={formData.caregiver_name_last} placeholder="Nachname" class="orga-input-clear py-1.5 text-xs" />
                                    </div>
                                    <div class="grid grid-cols-2 gap-2">
                                        <input type="text" bind:value={formData.caregiver_phone} placeholder="Telefon" class="orga-input-clear py-1.5 text-xs" />
                                        <input type="email" bind:value={formData.caregiver_email} placeholder="E-Mail" class="orga-input-clear py-1.5 text-xs" />
                                    </div>
                                    <label class="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                                        <input type="checkbox" bind:checked={formData.caregiver_has_power_of_attorney} class="rounded text-indigo-600" />
                                        <span>Schriftliche Vollmacht liegt vor</span>
                                    </label>
                                </div>
                            {/if}
                        </div>

                        <div>
                            <label for="adm-notes" class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Notizen & Anliegen</label>
                            <textarea use:autoGrow id="adm-notes" bind:value={formData.notes} class="auto-grow orga-input-clear resize-none text-xs min-h-16" rows="2"></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sticky Footer -->
            <div class="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 rounded-b-3xl">
                <button type="button" onclick={handleDelete} disabled={isDeleting || isSaving} class="w-full sm:w-auto px-4 py-2 min-h-[40px] text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Ablehnen & Löschen</span>
                </button>
                <div class="flex items-center gap-2.5 w-full sm:w-auto">
                    <button type="button" onclick={close} disabled={isSaving} class="orga-button-ghost w-full sm:w-auto min-h-[40px] py-2 px-5 text-xs font-bold">
                        Abbrechen
                    </button>
                    <button type="button" onclick={handleSave} disabled={isSaving || isDeleting} class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto min-h-[40px] py-2 px-6 text-xs font-bold shadow-emerald-600/20">
                        {isSaving ? 'Speichert...' : '✓ Als Klient aufnehmen'}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</dialog>
