import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { generatePdfBlob } from "$lib/services/pdfGeneratorService";
import { prepareFieldsForPdfKit, prepareBlocksForPdf } from "$lib/services/documentPdfPrep";
import { replaceDocumentPlaceholders } from "$lib/services/documentPlaceholderHelper";
import { computeServicePeriod } from "$lib/services/documentInvoiceCalculations";
import {
    resolveInvoiceActors,
    resolveRegenerateTemplates,
    extractTableConfig,
    buildRegeneratedPositions,
    loadInvoiceAppointments,
    loadCompanyLogoBase64
} from "./invoiceRegenerateHelper";

export async function regenerateSingleInvoice(inv: any): Promise<any> {
    const { clientId, clientObj, onBehalfOfUserId, assistantUser, effectiveUser, company } =
        resolveInvoiceActors(inv, pb);

    const manualIssueDate = inv.issue_date ? inv.issue_date.substring(0, 10) : new Date().toISOString().substring(0, 10);
    const manualInvoiceNr = inv.invoice_nr || '';
    const hourlyWage = inv.hourly_wage ?? 40;
    const kmRate = inv.travel_expanses_rate ?? 0.3;
    const taxRate = inv.tax_rate != null ? inv.tax_rate.toString() : "0";

    let meta: any = {};
    try {
        const parsed = typeof inv.table_sum_positions === 'string' ? JSON.parse(inv.table_sum_positions) : (inv.table_sum_positions || {});
        if (!Array.isArray(parsed)) meta = parsed;
    } catch {}

    let oldPositions: any[] = [];
    try {
        const parsed = typeof inv.table_positions === 'string' ? JSON.parse(inv.table_positions) : (inv.table_positions || []);
        if (Array.isArray(parsed)) oldPositions = parsed;
    } catch {}

    const { targetTemplateId, recipientType, recipientId, template, timesheetTemplate } =
        await resolveRegenerateTemplates(pb, inv, oldPositions, clientObj, meta);

    const apps = await loadInvoiceAppointments(pb, inv);
    const service_period = computeServicePeriod(apps, manualIssueDate);

    let invoiceData: any;
    let timesheetData: any;

    function replacePlaceholders(text: string, isTimesheet: boolean = false, overrideData?: any, isAddressContext: boolean = false) {
        return replaceDocumentPlaceholders(text, {
            client: clientObj,
            recipientType,
            recipientId,
            company,
            effectiveUser,
            onBehalfOfUserId,
            assistantUser,
            manualIssueDate,
            verhinderungVon: "",
            verhinderungBis: "",
            isTimesheet,
            overrideData,
            isAddressContext,
            orgaStore,
            get invoiceData() { return overrideData ? null : invoiceData; },
            get timesheetData() { return overrideData ? null : timesheetData; },
            hourlyWage,
            kmRate,
            taxRate
        });
    }

    const isTs = (template?.type || '').toLowerCase() === 'arbeitszeitnachweis';
    const invTableConf = extractTableConfig(template);
    const { positions: invPositions, netto: calculatedNetto } = buildRegeneratedPositions(
        apps,
        oldPositions,
        invTableConf,
        hourlyWage,
        kmRate,
        manualIssueDate,
        (desc) => replacePlaceholders(desc, isTs, { invoice_nr: manualInvoiceNr, service_period, brutto: 0 }),
        isTs
    );

    const effectiveNetto = apps.length > 0 ? calculatedNetto : (inv.netto != null ? Number(inv.netto) : calculatedNetto);
    const taxRateNum = parseFloat(taxRate) || 0;
    const effectiveTaxSum = apps.length > 0
        ? (taxRateNum > 0 ? effectiveNetto * (taxRateNum / 100) : 0)
        : (inv.tax_sum != null ? Number(inv.tax_sum) : (taxRateNum > 0 ? effectiveNetto * (taxRateNum / 100) : 0));
    const effectiveBrutto = effectiveNetto + effectiveTaxSum;

    invoiceData = {
        invoice_nr: manualInvoiceNr,
        netto: effectiveNetto,
        tax_sum: effectiveTaxSum,
        brutto: effectiveBrutto,
        positions: invPositions,
        service_period,
        issue_date: manualIssueDate
    };

    const appointmentIds = Array.isArray(inv.appointments) ? inv.appointments : (inv.appointments ? [inv.appointments] : []);
    const hasTimesheet = Boolean(timesheetTemplate && appointmentIds.length > 0);
    const tsTableConf = extractTableConfig(timesheetTemplate);
    const { positions: tsPositions, netto: tsNetto } = hasTimesheet
        ? buildRegeneratedPositions(
            apps,
            [],
            tsTableConf,
            hourlyWage,
            kmRate,
            manualIssueDate,
            (desc) => replacePlaceholders(desc, true, { invoice_nr: manualInvoiceNr, service_period, brutto: 0 }),
            true
        )
        : { positions: [], netto: 0 };

    timesheetData = {
        invoice_nr: manualInvoiceNr,
        netto: tsNetto,
        tax_sum: 0,
        brutto: tsNetto,
        positions: tsPositions,
        service_period,
        issue_date: manualIssueDate
    };

    const logoPromise = loadCompanyLogoBase64(pb, company);

    const invoicePrepPromise = Promise.all([
        prepareFieldsForPdfKit(template?.content_html?.fields || [], isTs, replacePlaceholders),
        template?.content_html?.blocks ? prepareBlocksForPdf(template.content_html.blocks, isTs, replacePlaceholders) : Promise.resolve(undefined)
    ]);

    const tsPrepPromise = hasTimesheet && timesheetTemplate ? Promise.all([
        prepareFieldsForPdfKit(timesheetTemplate.content_html?.fields || [], true, replacePlaceholders),
        timesheetTemplate.content_html?.blocks ? prepareBlocksForPdf(timesheetTemplate.content_html.blocks, true, replacePlaceholders) : Promise.resolve(undefined)
    ]) : Promise.resolve(null);

    const [companyLogoBase64, [fieldsReady, blocksReady], tsPrep] = await Promise.all([
        logoPromise,
        invoicePrepPromise,
        tsPrepPromise
    ]);

    const [pdfBlob, tsBlob] = await Promise.all([
        generatePdfBlob({
            templateJson: { ...(template?.content_html || {}), fields: fieldsReady, blocks: blocksReady },
            data: {
                companyLogoBase64,
                invoicePositions: invoiceData.positions,
                timesheetPositions: tsPositions,
                positions: invoiceData.positions,
                netto: invoiceData.netto,
                tax_sum: invoiceData.tax_sum,
                brutto: invoiceData.brutto,
                taxRate: Number(taxRate) || 0
            },
            isTimesheet: isTs
        }),
        tsPrep && timesheetTemplate ? generatePdfBlob({
            templateJson: { ...timesheetTemplate.content_html, fields: tsPrep[0], blocks: tsPrep[1] },
            data: {
                companyLogoBase64,
                invoicePositions: tsPositions,
                timesheetPositions: tsPositions,
                positions: tsPositions,
                netto: tsNetto,
                tax_sum: 0,
                brutto: tsNetto,
                taxRate: 0
            },
            isTimesheet: true
        }) : Promise.resolve(null)
    ]);

    const lastName = clientObj?.name_last ? `-${clientObj.name_last}` : '';
    let baseNr = invoiceData.invoice_nr || new Date().toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
    let filename = `RE-${baseNr}${lastName}.pdf`.replace(/\//g, '-');
    let tsFilename = `AZ-${baseNr}${lastName}.pdf`.replace(/\//g, '-');

    const pbFormData = new FormData();
    pbFormData.append('user', onBehalfOfUserId || pb.authStore.model?.id || '');
    if (clientId) pbFormData.append('client', clientId);
    pbFormData.append('invoice_nr', invoiceData.invoice_nr);
    pbFormData.append('issue_date', new Date(invoiceData.issue_date).toISOString());
    pbFormData.append('status', inv.status || 'Entwurf');
    const due = new Date(invoiceData.issue_date); due.setDate(due.getDate() + 14);
    pbFormData.append('due_date', due.toISOString());
    pbFormData.append('tax_rate', taxRate === "0" ? "" : taxRate);
    pbFormData.append('netto', invoiceData.netto.toString());
    pbFormData.append('tax_sum', invoiceData.tax_sum.toString());
    pbFormData.append('brutto', invoiceData.brutto.toString());
    pbFormData.append('hourly_wage', hourlyWage.toString());
    pbFormData.append('travel_expanses_rate', kmRate.toString());
    pbFormData.append('table_positions', JSON.stringify(invoiceData.positions));
    pbFormData.append('table_sum_positions', JSON.stringify({ recipientType, recipientId, templateId: targetTemplateId, timesheetPositions: tsPositions }));

    appointmentIds.forEach((id: string) => pbFormData.append('appointments', id));
    if (company?.id) pbFormData.append('company', company.id);

    if (inv.pdf) {
        const oldPdfs = Array.isArray(inv.pdf) ? inv.pdf : [inv.pdf];
        for (const oldFile of oldPdfs) {
            pbFormData.append('pdf-', oldFile);
        }
    }

    pbFormData.append('pdf', pdfBlob, filename);
    if (tsBlob) pbFormData.append('pdf', tsBlob, tsFilename);

    const updated = await pb.collection('invoices').update(inv.id, pbFormData, {
        expand: 'user,client,appointments,company',
        requestKey: null
    });

    if (orgaStore.invoices) {
        const existing = orgaStore.invoices.getById(inv.id) || inv;
        const mergedExpand = {
            ...(existing.expand || {}),
            ...(updated.expand || {})
        };
        if (!mergedExpand.client && clientObj) mergedExpand.client = clientObj;
        if (!mergedExpand.company && company) mergedExpand.company = company;
        if (!mergedExpand.user && assistantUser) mergedExpand.user = assistantUser;

        const finalRecord = {
            ...existing,
            ...updated,
            expand: mergedExpand
        };
        orgaStore.invoices.replaceItem(inv.id, finalRecord);
    }

    return updated as any;
}
