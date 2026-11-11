import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { employeeService } from "$lib/services/employeeService.svelte";
import { blobToBase64 } from "$lib/services/documentPdfPrep";
import { buildPositionsFromAppointments, sanitizeExistingPositions, filterPositionsForTimesheet } from "$lib/services/documentInvoiceCalculations";

export function resolveInvoiceActors(inv: any, pbInstance: any) {
    const rawClient = Array.isArray(inv.expand?.client) ? inv.expand.client[0] : (inv.expand?.client || inv.client);
    const clientId = typeof rawClient === 'string' ? rawClient : (rawClient?.id || (Array.isArray(inv.client) ? inv.client[0] : ''));
    const clientObj = (orgaStore.clients?.data as any[])?.find(c => c.id === clientId) || (typeof rawClient === 'object' ? rawClient : null);

    const assignedEmp = employeeService.getAssignedEmployeeForClient(clientId);
    const invUserId = Array.isArray(inv.user) ? inv.user[0] : (inv.user || inv.expand?.user?.id);
    const assistantId = invUserId || assignedEmp?.id || (pbInstance.authStore.record?.id || "");
    const onBehalfOfUserId = invUserId || "";
    const assistantUser = (orgaStore.users?.data as any[])?.find((u: any) => u.id === assistantId) || pbInstance.authStore.model || null;
    const effectiveUser = (orgaStore.users?.data as any[])?.find((u: any) => u.id === (onBehalfOfUserId || pbInstance.authStore.model?.id)) || pbInstance.authStore.model || null;

    const companyId = inv.company || "all";
    let company = companyId && companyId !== "all" ? orgaStore.company?.data.find((c: any) => c.id === companyId) : null;
    if (!company) company = orgaStore.company?.data[0];

    return { clientId, clientObj, onBehalfOfUserId, assistantUser, effectiveUser, company };
}

export async function resolveRegenerateTemplates(pbInstance: any, inv: any, oldPositions: any[], clientObj: any, meta: any) {
    let freshTemplates: any[] = [];
    try {
        freshTemplates = await pbInstance.collection('document_templates').getFullList({ requestKey: null });
        if (orgaStore.document_templates) {
            orgaStore.document_templates.data = freshTemplates;
            orgaStore.document_templates.pagination.totalItems = freshTemplates.length;
        }
    } catch {
        freshTemplates = orgaStore.document_templates?.data || [];
    }

    const posText = JSON.stringify(oldPositions).toLowerCase();
    let detectedKeyword = "";
    if (posText.includes('verhinderungspflege') || posText.includes('39 sgb') || posText.includes('§39') || posText.includes('$39')) {
        detectedKeyword = "verhinderungspflege";
    } else if (posText.includes('entlastungsleistung') || posText.includes('45b') || posText.includes('§45') || posText.includes('$45')) {
        detectedKeyword = "entlastungsleistung";
    } else if (posText.includes('privat')) {
        detectedKeyword = "privat";
    }

    let targetTemplateId = meta?.templateId;
    const templateExists = targetTemplateId && freshTemplates.some((t: any) => t.id === targetTemplateId);
    if (!templateExists && detectedKeyword) {
        const matched = freshTemplates.find((t: any) => {
            if (t.type !== 'rechnung') return false;
            const tStr = (t.title + " " + JSON.stringify(t.content_html || {})).toLowerCase();
            return tStr.includes(detectedKeyword) || (detectedKeyword === 'entlastungsleistung' && tStr.includes('entlastungsleistungen'));
        });
        if (matched) targetTemplateId = matched.id;
    }

    let fallbackRecipient = (detectedKeyword === 'verhinderungspflege' || detectedKeyword === 'entlastungsleistung') ? 'insurance' : 'client';
    const cStatus = (clientObj?.status || '').toLowerCase();
    const inheritors = Array.isArray(clientObj?.expand?.inheritor) ? clientObj.expand.inheritor : (clientObj?.expand?.inheritor ? [clientObj.expand.inheritor] : []);
    if (cStatus === 'verstorben' && inheritors.length > 0) fallbackRecipient = 'inheritor';
    const recipientType = meta?.recipientType || fallbackRecipient;
    const recipientId = meta?.recipientId || (fallbackRecipient === 'inheritor' ? inheritors[0]?.id : '');

    if (!targetTemplateId || !freshTemplates.some((t: any) => t.id === targetTemplateId)) {
        targetTemplateId = clientObj?.default_template;
    }
    if (!targetTemplateId || !freshTemplates.some((t: any) => t.id === targetTemplateId)) {
        const invoiceTemplate = freshTemplates.find((t: any) => (t.type || '').toLowerCase() === 'rechnung');
        targetTemplateId = invoiceTemplate?.id || "";
    }
    const template = freshTemplates.find((t: any) => t.id === targetTemplateId);
    const timesheetTemplate = freshTemplates.find((t: any) => (t.type || '').toLowerCase() === 'arbeitszeitnachweis');

    return { targetTemplateId, recipientType, recipientId, template, timesheetTemplate };
}

export function extractTableConfig(template: any) {
    return template?.content_html?.blocks?.find((b: any) => b.type === 'billing_table' || b.type === 'table')?.tableConfig
        || template?.content_html?.fields?.find((f: any) => f.type === 'table')?.tableConfig || {};
}

export function buildRegeneratedPositions(
    apps: any[],
    oldPositions: any[],
    tableConf: any,
    hourlyWage: number,
    kmRate: number,
    manualIssueDate: string,
    replacePlaceholdersFn: (desc: string) => string,
    isTimesheet: boolean
): { positions: any[]; netto: number } {
    if (apps && apps.length > 0) {
        return buildPositionsFromAppointments(
            apps,
            tableConf,
            hourlyWage,
            kmRate,
            replacePlaceholdersFn,
            isTimesheet
        );
    }
    let positions = sanitizeExistingPositions(oldPositions, manualIssueDate);
    if (isTimesheet) {
        positions = filterPositionsForTimesheet(positions);
    }
    const netto = positions.reduce((acc, p) => acc + (p.total || 0), 0);
    return { positions, netto };
}

export async function loadInvoiceAppointments(pbInstance: any, inv: any): Promise<any[]> {
    const appointmentIds = Array.isArray(inv.appointments) ? inv.appointments : (inv.appointments ? [inv.appointments] : []);
    if (appointmentIds.length === 0) return [];

    const apps = await Promise.all(
        appointmentIds.map((id: string) => pbInstance.collection('appointments').getOne(id, {
            expand: 'user,assigned_to,client,appointment_at,drive_record,time_record,tasks,expenditures',
            requestKey: null
        }).catch(() => (orgaStore.appointments?.data || []).find((a: any) => a.id === id)))
    );
    return apps.filter(Boolean).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
}

export async function loadCompanyLogoBase64(pbInstance: any, company: any): Promise<string | null> {
    if (!company?.logo) return null;
    try {
        const logoUrl = pbInstance.files.getURL(company, company.logo);
        const blob = await fetch(logoUrl).then(r => r.blob());
        return await blobToBase64(blob);
    } catch {
        return null;
    }
}
