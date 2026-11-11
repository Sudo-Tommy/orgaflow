import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { employeeService } from "$lib/services/employeeService.svelte";
import { resolveRecipientData, getRecipientSummaryLabel } from "./documentRecipientHelper";
import { replaceDocumentPlaceholders } from "./documentPlaceholderHelper";
import { getLocalDate, safeString, getNextInvoiceNumber } from "./documentInvoiceCalculations";
import {
    resolvePreselectedRates, resolvePreferredTemplateId, isCareInvoiceTemplate, isInvoiceTemplate,
    checkRatesDiffer, saveRatesToClientFile, sortTemplatesAlphabetically, sortClientsAlphabetically
} from "./documentGeneratorRateHelper";
import { computeGeneratedInvoiceData, computeGeneratedTimesheetData } from "./documentInvoiceBuilderHelper";

export function useDocumentGenerator() {
    let isLoading = $state(false), errorMsg = $state(""), successMsg = $state(""), isRegenerating = $state(false);
    let step = $state(1), selectedTemplateId = $state(""), selectedClientId = $state("");
    let selectedAssistantId = $state(""), recipientType = $state("client"), recipientId = $state("");
    let selectedAppointmentIds = $state<string[]>([]), selectedCompanyId = $state<string>("all");
    let templateTypeFilter = $state<string>("all"), onBehalfOfUserId = $state<string>("");

    let showBilledAppointments = $state(false), hourlyWage = $state(40), kmRate = $state(0.3), taxRate = $state("0");
    let manualInvoiceNr = $state(""), manualIssueDate = $state(getLocalDate()), verhinderungVon = $state(""), verhinderungBis = $state("");
    let generatedInvoiceId = $state<string | null>(null), existingInvoiceId = $state<string | null>(null), existingStatus = $state<string | null>(null);
    let existingPositions = $state<any[] | null>(null), existingNetto = $state<number | null>(null), existingTaxSum = $state<number | null>(null), existingBrutto = $state<number | null>(null);
    let isSavingRates = $state(false), isCorrection = $state(false), originalInvoice = $state<any>(null);
    let includeCorrectionNotice = $state(true), correctionNotice = $state("");

    let template = $derived(orgaStore.document_templates?.data.find(t => t.id === selectedTemplateId));
    let effectiveUser = $derived.by(() => (onBehalfOfUserId ? (orgaStore.users?.data as any[])?.find((u: any) => u.id === onBehalfOfUserId) : null) || pb.authStore.model || pb.authStore.record || {});
    let assistantUser = $derived.by(() => {
        const users = (orgaStore.users?.data as any[]) || [];
        if (selectedAssistantId) { const f = users.find((u: any) => u.id === selectedAssistantId); if (f) return f; }
        if (onBehalfOfUserId) { const obo = users.find((u: any) => u.id === onBehalfOfUserId); if (obo) return obo; }
        if (selectedClientId) { const assigned = employeeService.getAssignedEmployeeForClient(selectedClientId); if (assigned) return assigned; }
        return effectiveUser || null;
    });

    let availableClients = $derived.by(() => {
        const all = orgaStore.clients?.data || [];
        const filtered = !onBehalfOfUserId ? all : all.filter((c: any) => {
            if (c.id === selectedClientId) return true;
            const emp = Array.isArray(c.assigned_employee) ? c.assigned_employee : (c.assigned_employee ? [c.assigned_employee] : []);
            return emp.includes(onBehalfOfUserId);
        });
        return sortClientsAlphabetically(filtered);
    });

    let client = $derived(orgaStore.clients?.data.find(c => c.id === selectedClientId));
    let company = $derived.by(() => {
        if (selectedCompanyId && selectedCompanyId !== "all") return orgaStore.company?.data.find((c: any) => c.id === selectedCompanyId) || orgaStore.company?.data[0];
        const user: any = effectiveUser;
        const userCompanyId = user?.company ? (Array.isArray(user.company) ? user.company[0] : user.company) : null;
        return (userCompanyId && orgaStore.company?.data.find((c: any) => c.id === userCompanyId)) || orgaStore.company?.data[0];
    });

    function applyTemplateRates(tplId: string) {
        selectedTemplateId = tplId;
        if (isRegenerating) return;
        const tpl = (orgaStore.document_templates?.data || []).find(t => t.id === tplId);
        if (client) {
            const rates = resolvePreselectedRates(client, tpl);
            hourlyWage = rates.hourlyWage; kmRate = rates.kmRate; taxRate = rates.taxRate;
            if (rates.recipientType) { recipientType = rates.recipientType; recipientId = rates.recipientId; }
        } else {
            taxRate = isCareInvoiceTemplate(tpl) ? "0" : (isInvoiceTemplate(tpl) ? "19" : "0");
        }
    }

    let lastClient = "";
    $effect(() => {
        if (selectedClientId !== lastClient) {
            lastClient = selectedClientId;
            if (!isRegenerating) {
                const c = orgaStore.clients?.data.find(cl => cl.id === selectedClientId);
                if (c) {
                    const prefTplId = resolvePreferredTemplateId(c, orgaStore.invoices?.data || [], orgaStore.document_templates?.data || []);
                    if (prefTplId && (templateTypeFilter === 'rechnung' || templateTypeFilter === 'all' || !selectedTemplateId)) {
                        selectedTemplateId = prefTplId;
                    }
                    const activeTpl = (orgaStore.document_templates?.data || []).find(t => t.id === selectedTemplateId);
                    const rates = resolvePreselectedRates(c, activeTpl);
                    hourlyWage = rates.hourlyWage; kmRate = rates.kmRate; taxRate = rates.taxRate;
                    if (rates.recipientType) { recipientType = rates.recipientType; recipientId = rates.recipientId; }
                    const assigned = employeeService.getAssignedEmployeeForClient(c.id);
                    selectedAssistantId = assigned?.id || "";
                } else {
                    selectedAssistantId = "";
                }
            }
        }
    });

    let availableTemplates = $derived.by(() => {
        const filtered = (orgaStore.document_templates?.data || []).filter(t => {
            const tType = (t.type || '').toLowerCase();
            return tType !== 'arbeitszeitnachweis' && (templateTypeFilter === "all" || tType === templateTypeFilter);
        });
        return sortTemplatesAlphabetically(filtered);
    });

    let timesheetTemplate = $derived(orgaStore.document_templates?.data.find(t => (t.type || '').toLowerCase() === 'arbeitszeitnachweis'));
    let availableAppointments = $derived.by(() => {
        if (!selectedClientId || !orgaStore.appointments) return [];
        return orgaStore.appointments.data.filter((a: any) => {
            const isClient = Array.isArray(a.client) ? a.client.includes(selectedClientId) : a.client === selectedClientId;
            if (!isClient) return false;
            if ((template?.type || '').toLowerCase() === 'arbeitszeitnachweis' && onBehalfOfUserId) {
                const apptUser = Array.isArray(a.user) ? a.user : (a.user ? [a.user] : []);
                if (!apptUser.includes(onBehalfOfUserId)) return false;
            }
            const hasTime = (a.expand?.time_record && a.expand.time_record.length > 0) || Number(a.remaining_amount || 0) > 0;
            if (!hasTime) return false;
            if (a.status === 'abgesagt' && !selectedAppointmentIds.includes(a.id)) return false;
            if (!showBilledAppointments && a.settled && !selectedAppointmentIds.includes(a.id)) return false;
            return true;
        }).sort((a: any, b: any) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime());
    });

    let settledAppointmentsCount = $derived.by(() => {
        if (!selectedClientId || !orgaStore.appointments) return 0;
        return orgaStore.appointments.data.filter((a: any) => {
            const isClient = Array.isArray(a.client) ? a.client.includes(selectedClientId) : a.client === selectedClientId;
            return isClient && ((a.expand?.time_record && a.expand.time_record.length > 0) || Number(a.remaining_amount || 0) > 0) && a.settled;
        }).length;
    });

    let isInvoice = $derived((template?.type || '').toLowerCase() === 'rechnung');
    let requiresAppointments = $derived(isInvoice || (template?.type || '').toLowerCase() === 'arbeitszeitnachweis');
    function resolveNextInvNr() { return getNextInvoiceNumber(orgaStore.invoices?.data || [], pb.authStore.record?.id || pb.authStore.model?.id, company?.id); }

    let invoiceData = $derived.by(() => computeGeneratedInvoiceData({
        currentInvoiceNr: manualInvoiceNr || resolveNextInvNr(), manualIssueDate, isRegenerating,
        existingPositions, existingNetto, existingTaxSum, existingBrutto, requiresAppointments,
        selectedAppointmentIds, availableAppointments, template, hourlyWage, kmRate, taxRate,
        replacePlaceholders: (desc, ts, ov) => replacePlaceholders(desc, ts, ov)
    }));

    let isInvoiceNrDuplicate = $derived.by(() => (!isInvoice || !invoiceData?.invoice_nr) ? false : (orgaStore.invoices?.data || []).some((inv: any) => inv.invoice_nr === invoiceData.invoice_nr));
    let timesheetData = $derived.by(() => computeGeneratedTimesheetData({
        currentInvoiceNr: manualInvoiceNr || resolveNextInvNr(), manualIssueDate, requiresAppointments,
        selectedAppointmentIds, availableAppointments, timesheetTemplate, hourlyWage, kmRate, taxRate,
        replacePlaceholders: (desc, ts, ov) => replacePlaceholders(desc, ts, ov)
    }));

    function getRecipientData() { return resolveRecipientData(client, recipientType, recipientId, orgaStore); }
    let recipientSummary = $derived.by(() => getRecipientSummaryLabel(recipientType, getRecipientData()));

    function replacePlaceholders(text: string, isTimesheet: boolean = false, overrideData?: any, isAddressContext: boolean = false) {
        return replaceDocumentPlaceholders(text, {
            client, recipientType, recipientId, company, effectiveUser, onBehalfOfUserId,
            assistantUser, manualIssueDate, verhinderungVon, verhinderungBis,
            isTimesheet, overrideData, isAddressContext, orgaStore,
            get invoiceData() { return overrideData ? null : invoiceData; },
            get timesheetData() { return overrideData ? null : timesheetData; },
            hourlyWage, kmRate, taxRate
        });
    }

    let ratesDifferFromClient = $derived.by(() => checkRatesDiffer(client, hourlyWage, kmRate, taxRate));
    async function saveRatesToClient() {
        if (!client?.id || isSavingRates) return;
        isSavingRates = true;
        try { await saveRatesToClientFile(client.id, hourlyWage, kmRate, taxRate); } finally { isSavingRates = false; }
    }

    function reset() {
        step = 1; selectedTemplateId = selectedClientId = selectedAssistantId = "";
        recipientType = "client"; recipientId = ""; selectedAppointmentIds = [];
        showBilledAppointments = false; hourlyWage = 40; kmRate = 0.3; taxRate = "0";
        manualInvoiceNr = resolveNextInvNr(); manualIssueDate = getLocalDate();
        generatedInvoiceId = existingInvoiceId = existingStatus = null; isRegenerating = false;
        existingPositions = existingNetto = existingTaxSum = existingBrutto = null;
        templateTypeFilter = "all"; onBehalfOfUserId = verhinderungVon = verhinderungBis = "";
        isCorrection = false; originalInvoice = null; includeCorrectionNotice = true; correctionNotice = "";
    }

    return {
        get step() { return step; }, set step(v) { step = v; },
        get selectedCompanyId() { return selectedCompanyId; }, set selectedCompanyId(v) { selectedCompanyId = v; },
        get selectedTemplateId() { return selectedTemplateId; }, set selectedTemplateId(v) { selectedTemplateId = v; },
        get selectedClientId() { return selectedClientId; }, set selectedClientId(v) { selectedClientId = v; },
        get selectedAssistantId() { return selectedAssistantId; }, set selectedAssistantId(v) { selectedAssistantId = v; },
        get recipientType() { return recipientType; }, set recipientType(v) { recipientType = v; },
        get recipientId() { return recipientId; }, set recipientId(v) { recipientId = v; },
        get selectedAppointmentIds() { return selectedAppointmentIds; }, set selectedAppointmentIds(v) { selectedAppointmentIds = v; },
        get showBilledAppointments() { return showBilledAppointments; }, set showBilledAppointments(v) { showBilledAppointments = v; },
        get hourlyWage() { return hourlyWage; }, set hourlyWage(v) { hourlyWage = v; },
        get kmRate() { return kmRate; }, set kmRate(v) { kmRate = v; },
        get taxRate() { return taxRate; }, set taxRate(v) { taxRate = v; },
        get manualInvoiceNr() { return manualInvoiceNr; }, set manualInvoiceNr(v) { manualInvoiceNr = v; },
        get manualIssueDate() { return manualIssueDate; }, set manualIssueDate(v) { manualIssueDate = v; },
        get generatedInvoiceId() { return generatedInvoiceId; }, set generatedInvoiceId(v) { generatedInvoiceId = v; },
        get existingInvoiceId() { return existingInvoiceId; }, set existingInvoiceId(v) { existingInvoiceId = v; },
        get existingStatus() { return existingStatus; }, set existingStatus(v) { existingStatus = v; },
        get templateTypeFilter() { return templateTypeFilter; }, set templateTypeFilter(v) { templateTypeFilter = v; },
        get onBehalfOfUserId() { return onBehalfOfUserId; }, set onBehalfOfUserId(v) { onBehalfOfUserId = v; },
        get verhinderungVon() { return verhinderungVon; }, set verhinderungVon(v) { verhinderungVon = v; },
        get verhinderungBis() { return verhinderungBis; }, set verhinderungBis(v) { verhinderungBis = v; },
        get effectiveUser() { return effectiveUser; }, get assistantUser() { return assistantUser; },
        get availableClients() { return availableClients; }, get template() { return template; },
        get availableTemplates() { return availableTemplates; }, get timesheetTemplate() { return timesheetTemplate; },
        get client() { return client; }, get company() { return company; },
        get availableAppointments() { return availableAppointments; }, get settledAppointmentsCount() { return settledAppointmentsCount; },
        get isInvoice() { return isInvoice; }, get requiresAppointments() { return requiresAppointments; },
        get invoiceData() { return invoiceData; }, get timesheetData() { return timesheetData; },
        get isInvoiceNrDuplicate() { return isInvoiceNrDuplicate; },
        get isLoading() { return isLoading; }, set isLoading(v) { isLoading = v; },
        get isRegenerating() { return isRegenerating; }, set isRegenerating(v) { isRegenerating = v; },
        get errorMsg() { return errorMsg; }, set errorMsg(v) { errorMsg = v; },
        get successMsg() { return successMsg; }, set successMsg(v) { successMsg = v; },
        get existingPositions() { return existingPositions; }, set existingPositions(v) { existingPositions = v; },
        get existingNetto() { return existingNetto; }, set existingNetto(v) { existingNetto = v; },
        get existingTaxSum() { return existingTaxSum; }, set existingTaxSum(v) { existingTaxSum = v; },
        get existingBrutto() { return existingBrutto; }, set existingBrutto(v) { existingBrutto = v; },
        get recipientSummary() { return recipientSummary; },
        get ratesDifferFromClient() { return ratesDifferFromClient; },
        get isSavingRates() { return isSavingRates; },
        get isCorrection() { return isCorrection; }, set isCorrection(v) { isCorrection = v; },
        get originalInvoice() { return originalInvoice; }, set originalInvoice(v) { originalInvoice = v; },
        get includeCorrectionNotice() { return includeCorrectionNotice; }, set includeCorrectionNotice(v) { includeCorrectionNotice = v; },
        get correctionNotice() { return correctionNotice; }, set correctionNotice(v) { correctionNotice = v; },
        saveRatesToClient, applyTemplateRates, getRecipientData, replacePlaceholders, safeString, reset
    };
}