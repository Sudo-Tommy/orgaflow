import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { generatePdfBlob } from "$lib/services/pdfGeneratorService";
import { blobToBase64, prepareFieldsForPdfKit, prepareBlocksForPdf } from "$lib/services/documentPdfPrep";
import { employeeService } from "$lib/services/employeeService.svelte";
import { getClientTemplateId } from "./documentGeneratorRateHelper";
import { finalizeOriginalInvoiceCancellation } from "./invoiceCorrectionHelper";
import { lexofficeService } from "$lib/services/lexofficeService.svelte";

export async function executeDocumentGeneration(service: any, isBulk: boolean = false) {
    const lastName = service.client?.name_last ? `-${service.client.name_last}` : '';
    const baseNr = service.invoiceData?.invoice_nr || new Date().toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
    const filename = service.isInvoice && service.invoiceData 
        ? `RE-${baseNr}${lastName}.pdf`.replace(/\//g, '-') 
        : (service.template?.type?.toLowerCase() === 'arbeitszeitnachweis' 
            ? `AZ-${baseNr}${lastName}.pdf`.replace(/\//g, '-') 
            : `${service.template?.title || 'Dokument'}.pdf`.replace(/\//g, '-'));
    const tsFilename = service.isInvoice && service.invoiceData ? `AZ-${baseNr}${lastName}.pdf`.replace(/\//g, '-') : '';

    let companyLogoBase64 = null;
    if (service.company?.logo) {
        const logoUrl = pb.files.getURL(service.company, service.company.logo);
        try { companyLogoBase64 = await fetch(logoUrl).then(r => r.blob()).then(blobToBase64); } catch(e){}
    }
    
    const isTs = (service.template?.type || '').toLowerCase() === 'arbeitszeitnachweis';
    const fieldsReady = await prepareFieldsForPdfKit(service.template?.content_html?.fields || [], isTs, (c: any, isTsMode: boolean, overrideData?: any, isAddressContext?: boolean) => service.replacePlaceholders(c, isTsMode, overrideData, isAddressContext));
    const blocksReady = service.template?.content_html?.blocks 
        ? await prepareBlocksForPdf(service.template.content_html.blocks, isTs, (c: any, isTsMode: boolean, overrideData?: any, isAddressContext?: boolean) => service.replacePlaceholders(c, isTsMode, overrideData, isAddressContext))
        : undefined;
    const pdfBlob = await generatePdfBlob({
        templateJson: { ...(service.template?.content_html || {}), fields: fieldsReady, blocks: blocksReady },
        data: {
            companyLogoBase64,
            invoicePositions: service.invoiceData?.positions || [],
            timesheetPositions: service.timesheetData?.positions || [],
            positions: isTs ? (service.timesheetData?.positions || []) : (service.invoiceData?.positions || []),
            netto: Number(service.invoiceData?.netto) || 0,
            tax_sum: Number(service.invoiceData?.tax_sum) || 0,
            brutto: Number(service.invoiceData?.brutto) || 0,
            taxRate: Number(service.taxRate) || 0
        },
        isTimesheet: isTs
    });

    let tsBlob: Blob | null = null;
    if (service.isInvoice && service.timesheetTemplate && service.selectedAppointmentIds.length > 0) {
        const tsFieldsReady = await prepareFieldsForPdfKit(service.timesheetTemplate.content_html.fields, true, (c: any, isTsMode: boolean, overrideData?: any, isAddressContext?: boolean) => service.replacePlaceholders(c, isTsMode, overrideData, isAddressContext));
        const tsBlocksReady = service.timesheetTemplate.content_html.blocks 
            ? await prepareBlocksForPdf(service.timesheetTemplate.content_html.blocks, true, (c: any, isTsMode: boolean, overrideData?: any, isAddressContext?: boolean) => service.replacePlaceholders(c, isTsMode, overrideData, isAddressContext))
            : undefined;
        tsBlob = await generatePdfBlob({
            templateJson: { ...service.timesheetTemplate.content_html, fields: tsFieldsReady, blocks: tsBlocksReady },
            data: { 
                companyLogoBase64, 
                invoicePositions: service.timesheetData?.positions || [],
                timesheetPositions: service.timesheetData?.positions || [],
                positions: service.timesheetData?.positions || []
            },
            isTimesheet: true
        });
    }

    if ((service.isInvoice && service.invoiceData) || service.template?.type?.toLowerCase() === 'arbeitszeitnachweis') {
        const pbFormData = new FormData();
        pbFormData.append('user', service.onBehalfOfUserId || pb.authStore.model?.id || '');
        pbFormData.append('client', service.selectedClientId);
        
        if (service.isInvoice && service.invoiceData) {
            pbFormData.append('invoice_nr', service.invoiceData.invoice_nr);
            pbFormData.append('issue_date', new Date(service.invoiceData.issue_date).toISOString());
            pbFormData.append('status', service.existingStatus || 'Entwurf');
            const due = new Date(service.invoiceData.issue_date); due.setDate(due.getDate() + 14);
            pbFormData.append('due_date', due.toISOString());
            pbFormData.append('tax_rate', service.taxRate === "0" ? "" : service.taxRate);
            pbFormData.append('netto', service.invoiceData.netto.toString());
            pbFormData.append('tax_sum', service.invoiceData.tax_sum.toString());
            pbFormData.append('brutto', service.invoiceData.brutto.toString());
            pbFormData.append('hourly_wage', service.hourlyWage.toString());
            pbFormData.append('travel_expanses_rate', service.kmRate.toString());
            pbFormData.append('table_positions', JSON.stringify(service.invoiceData.positions));
            const metaObj: any = { recipientType: service.recipientType, recipientId: service.recipientId, templateId: service.selectedTemplateId };
            if (service.isCorrection && service.originalInvoice) {
                metaObj.replaces_invoice_id = service.originalInvoice.id;
                metaObj.replaces_invoice_nr = service.originalInvoice.invoice_nr;
            }
            pbFormData.append('table_sum_positions', JSON.stringify(metaObj));
            if (service.isCorrection && service.includeCorrectionNotice && service.correctionNotice) {
                pbFormData.append('notes', service.correctionNotice);
            }
        } else {
            pbFormData.append('invoice_nr', 'Zeitnachweis');
            pbFormData.append('issue_date', new Date().toISOString());
            pbFormData.append('status', 'Eingereicht');
            pbFormData.append('brutto', '0');
        }
        
        service.selectedAppointmentIds.forEach((id: string) => pbFormData.append('appointments', id));
        if (service.company?.id) pbFormData.append('company', service.company.id);
        pbFormData.append('pdf', pdfBlob, filename);
        if (tsBlob) pbFormData.append('pdf', tsBlob, tsFilename);

        if (service.existingInvoiceId) {
            const updated = await pb.collection('invoices').update(service.existingInvoiceId, pbFormData);
            service.generatedInvoiceId = updated.id;
        } else {
            const created = await pb.collection('invoices').create(pbFormData);
            service.generatedInvoiceId = created.id;
        }

        if (service.isCorrection && service.originalInvoice) {
            await finalizeOriginalInvoiceCancellation(
                service.originalInvoice.id,
                service.invoiceData.invoice_nr,
                service.generatedInvoiceId || undefined
            );
            lexofficeService.notifyInvoiceAction('storno', {
                invoiceId: service.originalInvoice.id,
                replacementInvoiceId: service.generatedInvoiceId || undefined
            });
        } else if (service.isInvoice && service.generatedInvoiceId) {
            lexofficeService.notifyInvoiceAction('sync', {
                invoiceId: service.generatedInvoiceId
            });
        }
        
        if (!isBulk) {
            for (const appId of service.selectedAppointmentIds) {
                await pb.collection('appointments').update(appId, { settled: true, remaining_amount: 0, already_paid_amount: 0 });
                const localApp = orgaStore.appointments?.data.find((a: any) => a.id === appId);
                if (localApp) {
                    localApp.settled = true;
                    localApp.remaining_amount = 0;
                    localApp.already_paid_amount = 0;
                }
            }
            service.successMsg = "Dokument erfolgreich generiert und mit LexOffice abgeglichen!";
        }
    } else if (!isBulk && service.selectedClientId) {
        try {
            const clientFormData = new FormData();
            const existingClient = orgaStore.clients?.data.find((c: any) => c.id === service.selectedClientId);
            for (const doc of (existingClient?.documents || [])) clientFormData.append('documents', doc);
            clientFormData.append('documents', pdfBlob, filename);
            await pb.collection('clients').update(service.selectedClientId, clientFormData);
            service.successMsg = "Dokument generiert und in der Klienten-Akte gespeichert!";
        } catch { service.successMsg = "Dokument erfolgreich generiert!"; }
    }

    return { pdfBlob, filename, tsBlob, tsFilename };
}

export function setupInvoiceForRegenerate(inv: any, service: any) {
    service.selectedClientId = Array.isArray(inv.expand?.client) ? inv.expand.client[0]?.id : (inv.expand?.client?.id || (Array.isArray(inv.client) ? inv.client[0] : inv.client));
    const assignedEmp = employeeService.getAssignedEmployeeForClient(service.selectedClientId);
    const invUserId = Array.isArray(inv.user) ? inv.user[0] : (inv.user || inv.expand?.user?.id);
    service.selectedAssistantId = invUserId || assignedEmp?.id || (pb.authStore.record?.id || "");
    if (invUserId) service.onBehalfOfUserId = invUserId;
    service.selectedAppointmentIds = Array.isArray(inv.appointments) ? inv.appointments : (inv.appointments ? [inv.appointments] : []);
    service.manualInvoiceNr = inv.invoice_nr;
    service.manualIssueDate = inv.issue_date ? inv.issue_date.substring(0, 10) : new Date().toISOString().substring(0, 10);
    service.hourlyWage = inv.hourly_wage ?? 40;
    service.kmRate = inv.travel_expanses_rate ?? 0.3;
    service.taxRate = inv.tax_rate != null ? inv.tax_rate.toString() : "0";
    service.selectedCompanyId = inv.company || "all";
    service.existingInvoiceId = inv.id;
    service.existingStatus = inv.status;
    
    let meta: any = {};
    try {
        const parsed = typeof inv.table_sum_positions === 'string' ? JSON.parse(inv.table_sum_positions) : (inv.table_sum_positions || {});
        if (!Array.isArray(parsed)) meta = parsed;
    } catch(e) {}
    
    const clientObj = orgaStore.clients?.data.find((c: any) => c.id === service.selectedClientId);
    let oldPositions: any[] = [];
    try {
        const parsed = typeof inv.table_positions === 'string' ? JSON.parse(inv.table_positions) : (inv.table_positions || []);
        if (Array.isArray(parsed)) oldPositions = parsed;
    } catch(e) {}

    service.existingPositions = oldPositions;
    service.existingNetto = inv.netto;
    service.existingTaxSum = inv.tax_sum;
    service.existingBrutto = inv.brutto;

    const posText = JSON.stringify(oldPositions).toLowerCase();
    let detectedKeyword = "";
    if (posText.includes('verhinderungspflege') || posText.includes('39 sgb') || posText.includes('§39') || posText.includes('§ 39') || posText.includes('$39')) detectedKeyword = "verhinderungspflege";
    else if (posText.includes('entlastungsleistung') || posText.includes('45b') || posText.includes('§45') || posText.includes('§ 45') || posText.includes('$45')) detectedKeyword = "entlastungsleistung";
    else if (posText.includes('privat')) detectedKeyword = "privat";
    
    let targetTemplateId = meta.templateId;
    const templateExists = targetTemplateId && orgaStore.document_templates?.data.some((t: any) => t.id === targetTemplateId);
    if (!templateExists && detectedKeyword) {
        const matchedTemplate = orgaStore.document_templates?.data.find((t: any) => {
            if (t.type !== 'rechnung') return false;
            const tStr = (t.title + " " + JSON.stringify(t.content_html || {})).toLowerCase();
            return tStr.includes(detectedKeyword) || (detectedKeyword === 'entlastungsleistung' && tStr.includes('entlastungsleistungen'));
        });
        if (matchedTemplate) targetTemplateId = matchedTemplate.id;
    }

    let fallbackRecipient = (detectedKeyword === 'verhinderungspflege' || detectedKeyword === 'entlastungsleistung') ? 'insurance' : 'client';
    const cStatus = (clientObj?.status || '').toLowerCase();
    const inheritors = Array.isArray(clientObj?.expand?.inheritor) ? clientObj.expand.inheritor : (clientObj?.expand?.inheritor ? [clientObj.expand.inheritor] : []);
    if (cStatus === 'verstorben' && inheritors.length > 0) fallbackRecipient = 'inheritor';
    service.recipientType = meta.recipientType || fallbackRecipient;
    service.recipientId = meta.recipientId || (fallbackRecipient === 'inheritor' ? inheritors[0]?.id : '');

    const clientTemplateId = getClientTemplateId(clientObj);
    if (!targetTemplateId || !orgaStore.document_templates?.data.some((t: any) => t.id === targetTemplateId)) targetTemplateId = clientTemplateId;
    if (!targetTemplateId || !orgaStore.document_templates?.data.some((t: any) => t.id === targetTemplateId)) {
        const invoiceTemplate = orgaStore.document_templates?.data.find((t: any) => t.type === 'rechnung');
        targetTemplateId = invoiceTemplate?.id || "";
    }
    service.selectedTemplateId = targetTemplateId || "";
}
