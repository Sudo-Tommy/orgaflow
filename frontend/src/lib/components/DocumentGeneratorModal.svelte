<script lang="ts">
    import { useDocumentGenerator } from "$lib/services/documentGeneratorService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { employeeService } from "$lib/services/employeeService.svelte";
    import { resolvePreferredTemplateId } from "$lib/services/documentGeneratorRateHelper";
    import { executeDocumentGeneration, setupInvoiceForRegenerate } from "$lib/services/documentGeneratorExecutionHelper";
    import { setupServiceForCorrection } from "$lib/services/invoiceCorrectionHelper";
    import GeneratorEmailSend from "./GeneratorEmailSend.svelte";
    import GeneratorStepClient from "./docGenerator/GeneratorStepClient.svelte";
    import GeneratorStepTemplate from "./docGenerator/GeneratorStepTemplate.svelte";
    import GeneratorStepAppointments from "./docGenerator/GeneratorStepAppointments.svelte";
    import GeneratorStepSummary from "./docGenerator/GeneratorStepSummary.svelte";

    let { onCorrectionComplete }: { onCorrectionComplete?: (newInvoiceId: string, origInv: any) => void } = $props();

    let dialog: HTMLDialogElement;
    const service = useDocumentGenerator();

    const isAdmin = $derived(pb.authStore.isSuperuser || ['admin','superadmin'].includes(pb.authStore.model?.role || ''));
    const allUsers = $derived((orgaStore.users?.data as any[]) || []);

    let generatedPdfBlob = $state<Blob | null>(null);
    let generatedTsBlob = $state<Blob | null>(null);
    let generatedFilename = $state("");
    let generatedTsFilename = $state("");

    let isBulkRegenerating = $state(false);
    let bulkTotal = $state(0);
    let bulkCurrent = $state(0);

    export function open(preselectedTemplateId?: string, startStep: number = 1, preselectedClientId?: string, filterType: string = "all", defaultOnBehalfOfUserId?: string, preselectedAppointmentIds?: string[]) {
        service.reset?.();
        service.step = startStep;
        service.selectedClientId = preselectedClientId || "";
        service.selectedAppointmentIds = preselectedAppointmentIds && preselectedAppointmentIds.length > 0 ? [...preselectedAppointmentIds] : [];
        service.templateTypeFilter = filterType;

        let tplIdToUse = preselectedTemplateId || "";
        if (preselectedClientId) {
            const cl = (orgaStore.clients?.data as any[])?.find(c => c.id === preselectedClientId);
            const prefId = resolvePreferredTemplateId(cl, orgaStore.invoices?.data || [], orgaStore.document_templates?.data || []);
            if (prefId && (filterType === 'rechnung' || filterType === 'all' || !preselectedTemplateId)) {
                tplIdToUse = prefId;
            }
        }
        service.selectedTemplateId = tplIdToUse;
        if (tplIdToUse) service.applyTemplateRates(tplIdToUse);

        if (defaultOnBehalfOfUserId) {
            service.onBehalfOfUserId = defaultOnBehalfOfUserId;
        } else if (preselectedAppointmentIds && preselectedAppointmentIds.length > 0) {
            const app = (orgaStore.appointments?.data as any[])?.find(a => preselectedAppointmentIds.includes(a.id));
            if (app?.billing_user) service.onBehalfOfUserId = app.billing_user;
        }
        if (!service.onBehalfOfUserId && preselectedClientId) {
            const cl = (orgaStore.clients?.data as any[])?.find(c => c.id === preselectedClientId);
            if (cl?.billing_user) {
                service.onBehalfOfUserId = cl.billing_user;
            } else if (cl?.assigned_employee) {
                const emp = Array.isArray(cl.assigned_employee) ? cl.assigned_employee[0] : cl.assigned_employee;
                if (emp) service.onBehalfOfUserId = emp;
            }
        }

        if (preselectedClientId) {
            const assigned = employeeService.getAssignedEmployeeForClient(preselectedClientId);
            if (assigned?.id) service.selectedAssistantId = assigned.id;
        } else if (!service.selectedAssistantId && pb.authStore.record?.id) {
            service.selectedAssistantId = pb.authStore.record.id;
        }

        if (typeof localStorage !== 'undefined') {
            service.selectedCompanyId = localStorage.getItem('global_company_id') || 'all';
        }
        generatedPdfBlob = generatedTsBlob = null;
        generatedFilename = generatedTsFilename = "";
        dialog?.showModal();
    }

    export async function openForRegenerate(invoicesToRegen: any[]) {
        dialog?.showModal();
        isBulkRegenerating = true;
        bulkTotal = invoicesToRegen.length;
        bulkCurrent = 0;
        service.reset?.();
        service.step = 0;
        service.isRegenerating = true;
        generatedPdfBlob = generatedTsBlob = null;
        generatedFilename = generatedTsFilename = "";
        
        for (const inv of invoicesToRegen) {
            bulkCurrent++;
            setupInvoiceForRegenerate(inv, service);
            await new Promise(r => setTimeout(r, 1000));
            await generate(true);
        }

        service.successMsg = `${bulkTotal} Dokument(e) erfolgreich aktualisiert!`;
        isBulkRegenerating = false;
        service.step = 5;
        if (orgaStore.invoices) await orgaStore.invoices.init();
    }

    export function openForCorrection(inv: any) {
        setupServiceForCorrection(inv, service);
        generatedPdfBlob = generatedTsBlob = null;
        generatedFilename = generatedTsFilename = "";
        dialog?.showModal();
    }

    export function close() { dialog?.close(); }

    function next() {
        service.errorMsg = "";
        if (service.step === 1) {
            if (!service.selectedClientId) { service.errorMsg = "Bitte einen Klienten wählen!"; return; }
            const prefId = resolvePreferredTemplateId(service.client, orgaStore.invoices?.data || [], orgaStore.document_templates?.data || []);
            if (prefId && (!service.selectedTemplateId || service.templateTypeFilter === 'rechnung' || service.templateTypeFilter === 'all')) {
                service.applyTemplateRates(prefId);
            }
            service.step = 2;
            return;
        }
        if (service.step === 2) {
            if (!service.selectedTemplateId) { service.errorMsg = "Bitte eine Vorlage wählen!"; return; }
            service.step = service.requiresAppointments ? 3 : 4;
            return;
        }
        if (service.step === 3) {
            if (service.selectedAppointmentIds.length === 0) { service.errorMsg = "Bitte Termine wählen!"; return; }
            service.step = 4;
            return;
        }
    }

    function prev() {
        service.errorMsg = "";
        if (service.step === 4) { service.step = service.requiresAppointments ? 3 : 2; return; }
        if (service.step === 3) { service.step = 2; return; }
        if (service.step === 2) { service.step = 1; return; }
    }

    function downloadManually() {
        if (generatedPdfBlob) {
            const url = URL.createObjectURL(generatedPdfBlob);
            const a = document.createElement('a'); a.href = url; a.download = generatedFilename; a.click();
        }
        if (generatedTsBlob) {
            const url = URL.createObjectURL(generatedTsBlob);
            const a = document.createElement('a'); a.href = url; a.download = generatedTsFilename; a.click();
        }
    }

    async function generate(isBulk: boolean = false) {
        if (service.isLoading) return;
        service.isLoading = true;
        service.errorMsg = "";
        try {
            const wasCorrection = service.isCorrection;
            const origInv = service.originalInvoice;
            const result = await executeDocumentGeneration(service, isBulk);
            generatedPdfBlob = result.pdfBlob; generatedFilename = result.filename;
            generatedTsBlob = result.tsBlob; generatedTsFilename = result.tsFilename;
            if (!isBulk) {
                if (wasCorrection && onCorrectionComplete && service.generatedInvoiceId) {
                    close();
                    onCorrectionComplete(service.generatedInvoiceId, origInv);
                } else {
                    service.step = 5;
                }
            }
        } catch (err: any) {
            service.errorMsg = err.message || "Fehler bei der Generierung.";
        } finally { service.isLoading = false; }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-auto rounded-3xl zero-inner-scroll-modal" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-4 sm:p-6 w-full flex flex-col relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pr-12">
            <div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">Dokument generieren</h2>
                {#if service.client}<p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Klient: <strong class="text-slate-800 dark:text-slate-200">{service.client.name_first} {service.client.name_last}</strong></p>{/if}
            </div>

            {#if isAdmin && allUsers.length > 1 && service.step >= 1 && service.step <= 4 && !isBulkRegenerating}
                <div class="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-3 py-1.5 rounded-2xl shadow-xs self-start sm:self-auto">
                    <span class="text-xs font-bold text-amber-900 dark:text-amber-300 shrink-0 flex items-center gap-1"><span>👤</span> <span class="hidden sm:inline">Erstellen für:</span></span>
                    <select bind:value={service.onBehalfOfUserId} onchange={() => { service.selectedAppointmentIds = []; }} class="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-950 dark:text-amber-200 rounded-xl px-2.5 py-1 outline-none shadow-xs focus:ring-2 focus:ring-amber-400 cursor-pointer max-w-48 sm:max-w-64 truncate">
                        <option value="">Mich selbst ({pb.authStore.model?.name_first || 'Admin'} {pb.authStore.model?.name_last || ''})</option>
                        {#each allUsers.filter(u => u.id !== pb.authStore.model?.id) as u}<option value={u.id}>{u.name_first} {u.name_last} {u.role ? `(${u.role})` : ''}</option>{/each}
                    </select>
                </div>
            {/if}
        </div>
        
        <div class="flex gap-2 mb-6">
            <div class="h-1.5 flex-1 rounded-full {service.step >= 1 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'} transition-colors"></div>
            <div class="h-1.5 flex-1 rounded-full {service.step >= 2 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'} transition-colors"></div>
            {#if service.requiresAppointments}<div class="h-1.5 flex-1 rounded-full {service.step >= 3 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'} transition-colors"></div>{/if}
            <div class="h-1.5 flex-1 rounded-full {service.step >= 4 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'} transition-colors"></div>
            <div class="h-1.5 flex-1 rounded-full {service.step >= 5 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'} transition-colors"></div>
        </div>

        {#if service.errorMsg}<div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl mb-4 text-sm font-medium border border-red-200 dark:border-red-900/60">{service.errorMsg}</div>{/if}

        <div class="mb-4 space-y-4">
            {#if isBulkRegenerating || service.step === 0}
                <div class="flex flex-col items-center justify-center py-20 animate-enter">
                    <div class="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"></div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Papiere werden neu gemischt...</h3>
                    <p class="text-slate-500 dark:text-slate-400 font-medium">Rechnung {bulkCurrent} von {bulkTotal} wird aktualisiert.</p>
                </div>
            {:else if service.step === 1}
                <GeneratorStepClient {service} {allUsers} />
            {:else if service.step === 2}
                <GeneratorStepTemplate {service} />
            {:else if service.step === 3 && service.requiresAppointments}
                <GeneratorStepAppointments {service} {allUsers} />
            {:else if service.step === 4}
                <GeneratorStepSummary {service} {allUsers} />
            {:else if service.step === 5}
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Fertig!</h3>
                <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <span class="text-xl">✅</span>
                    <div><p class="font-bold text-emerald-900 dark:text-emerald-300">{service.successMsg}</p><p class="text-sm text-emerald-700 dark:text-emerald-400 mt-1">Sie können das Dokument nun herunterladen oder direkt per E-Mail versenden.</p></div>
                </div>
                <GeneratorEmailSend {service} pdfBlob={generatedPdfBlob} tsBlob={generatedTsBlob} pdfFilename={generatedFilename} tsFilename={generatedTsFilename} onClose={close} onDownload={downloadManually} />
            {/if}
        </div>

        <div class="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0 mt-2">
            {#if service.step > 1 && service.step < 5}<button type="button" onclick={prev} class="orga-button-ghost w-full sm:w-auto py-2.5 px-6 cursor-pointer" disabled={service.isLoading}>Zurück</button>{:else}<div class="hidden sm:block"></div>{/if}
            {#if service.step < 4}<button type="button" onclick={next} class="orga-button-primary w-full sm:w-auto py-2.5 px-6 cursor-pointer" disabled={service.isLoading}>Weiter &rarr;</button>{:else if service.step === 4}<button type="button" onclick={() => generate(false)} class="orga-button-primary w-full sm:w-auto py-2.5 px-8 shadow-indigo-600/30 cursor-pointer" disabled={service.isLoading}>{#if service.isLoading}<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generiert...{:else}PDF Generieren{/if}</button>{/if}
        </div>
    </div>
</dialog>