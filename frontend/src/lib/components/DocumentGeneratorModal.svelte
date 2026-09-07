<script lang="ts">
    import { useDocumentGenerator } from "$lib/services/documentGeneratorService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { generatePdfBlob } from "$lib/services/pdfGeneratorService";
    import GeneratorEmailSend from "./GeneratorEmailSend.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    const service = useDocumentGenerator();

    const isAdmin = $derived(pb.authStore.isSuperuser || ['admin','superadmin'].includes(pb.authStore.model?.role || ''));
    // Alle Nutzer für den Admin-Dropdown (aus dem gemeinsamen orgaStore.users)
    const allUsers = $derived((orgaStore.users?.data as any[]) || []);

    let generatedPdfBlob = $state<Blob | null>(null);
    let generatedTsBlob = $state<Blob | null>(null);
    let generatedFilename = $state("");
    let generatedTsFilename = $state("");

    let isBulkRegenerating = $state(false);
    let bulkTotal = $state(0);
    let bulkCurrent = $state(0);

    export function open(preselectedTemplateId?: string, startStep: number = 1, preselectedClientId?: string, filterType: string = "all", defaultOnBehalfOfUserId?: string) {
        service.reset?.();
        service.step = startStep;
        service.selectedTemplateId = preselectedTemplateId || "";
        service.selectedClientId = preselectedClientId || "";
        service.selectedAppointmentIds = [];
        service.templateTypeFilter = filterType;

        if (defaultOnBehalfOfUserId) {
            service.onBehalfOfUserId = defaultOnBehalfOfUserId;
        } else if (preselectedClientId) {
            const cl = (orgaStore.clients?.data as any[])?.find(c => c.id === preselectedClientId);
            if (cl?.assigned_employee) {
                const emp = Array.isArray(cl.assigned_employee) ? cl.assigned_employee[0] : cl.assigned_employee;
                if (emp) {
                    service.onBehalfOfUserId = emp;
                }
            }
        }

        if (typeof localStorage !== 'undefined') {
            service.selectedCompanyId = localStorage.getItem('global_company_id') || 'all';
        }
        generatedPdfBlob = null;
        generatedTsBlob = null;
        generatedFilename = "";
        generatedTsFilename = "";
        dialog?.showModal();
    }

    export async function openForRegenerate(invoicesToRegen: any[]) {
        dialog?.showModal();
        isBulkRegenerating = true;
        bulkTotal = invoicesToRegen.length;
        bulkCurrent = 0;
        service.reset?.();
        service.step = 0; // 0 = Eigener Ladescreen-Indikator
        service.isRegenerating = true;
        generatedPdfBlob = null;
        generatedTsBlob = null;
        generatedFilename = "";
        generatedTsFilename = "";
        
        for (const inv of invoicesToRegen) {
            bulkCurrent++;
            service.selectedClientId = Array.isArray(inv.expand?.client) ? inv.expand.client[0]?.id : (inv.expand?.client?.id || (Array.isArray(inv.client) ? inv.client[0] : inv.client));
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
            
            // Alte Positionen auslesen, um den Rechnungstyp intelligent zu erkennen (falls Template-ID fehlt oder falsch ist)
            let oldPositions: any[] = [];
            try {
                const parsed = typeof inv.table_positions === 'string' ? JSON.parse(inv.table_positions) : (inv.table_positions || []);
                if (Array.isArray(parsed)) oldPositions = parsed;
            } catch(e) {}

            // Übernehme die exakten Positionen und Summen aus der alten Rechnung! 1 zu 1!
            service.existingPositions = oldPositions;
            service.existingNetto = inv.netto;
            service.existingTaxSum = inv.tax_sum;
            service.existingBrutto = inv.brutto;

            const posText = JSON.stringify(oldPositions).toLowerCase();
            let detectedKeyword = "";
            
            if (posText.includes('verhinderungspflege') || posText.includes('39 sgb') || posText.includes('§39') || posText.includes('§ 39') || posText.includes('$39')) {
                detectedKeyword = "verhinderungspflege";
            } else if (posText.includes('entlastungsleistung') || posText.includes('45b') || posText.includes('§45') || posText.includes('§ 45') || posText.includes('$45')) {
                detectedKeyword = "entlastungsleistung";
            } else if (posText.includes('privat')) {
                detectedKeyword = "privat";
            }
            
            let targetTemplateId = meta.templateId;
            const templateExists = targetTemplateId && orgaStore.document_templates?.data.some((t: any) => t.id === targetTemplateId);

            // Suche nach passender Vorlage für das gefundene Keyword (nur als Fallback, falls Vorlage fehlt)
            if (!templateExists && detectedKeyword) {
                const matchedTemplate = orgaStore.document_templates?.data.find((t: any) => {
                    if (t.type !== 'rechnung') return false;
                    const tStr = (t.title + " " + JSON.stringify(t.content_html || {})).toLowerCase();
                    return tStr.includes(detectedKeyword) || (detectedKeyword === 'entlastungsleistung' && tStr.includes('entlastungsleistungen'));
                });
                if (matchedTemplate) {
                    targetTemplateId = matchedTemplate.id;
                }
            }

            // Empfänger-Typ wiederherstellen (oder per Keyword raten)
            let fallbackRecipient = (detectedKeyword === 'verhinderungspflege' || detectedKeyword === 'entlastungsleistung') ? 'insurance' : 'client';
            
            // Bei Verstorbenen direkt Erben auswählen, falls vorhanden
            const cStatus = (clientObj?.status || '').toLowerCase();
            const inheritors = Array.isArray(clientObj?.expand?.inheritor) ? clientObj.expand.inheritor : (clientObj?.expand?.inheritor ? [clientObj.expand.inheritor] : []);
            if (cStatus === 'verstorben' && inheritors.length > 0) {
                fallbackRecipient = 'inheritor';
            }
            service.recipientType = meta.recipientType || fallbackRecipient;
            service.recipientId = meta.recipientId || (fallbackRecipient === 'inheritor' ? inheritors[0]?.id : '');

            if (!targetTemplateId || !orgaStore.document_templates?.data.some((t: any) => t.id === targetTemplateId)) {
                targetTemplateId = clientObj?.default_template;
            }
            
            if (!targetTemplateId || !orgaStore.document_templates?.data.some((t: any) => t.id === targetTemplateId)) {
                const invoiceTemplate = orgaStore.document_templates?.data.find((t: any) => t.type === 'rechnung');
                targetTemplateId = invoiceTemplate?.id || "";
            }
            service.selectedTemplateId = targetTemplateId || "";

            // Warten, bis das DOM komplett die neuen Platzhalter gerendert hat!
            await new Promise(r => setTimeout(r, 1000)); 
            
            await generate(true);
        }

        service.successMsg = `${bulkTotal} Dokument(e) erfolgreich aktualisiert!`;
        isBulkRegenerating = false;
        service.step = 5; // Abschluss-Bildschirm
        
        if (orgaStore.invoices) await orgaStore.invoices.init();
    }

    export function close() {
        dialog?.close();
    }

    function next() {
        service.errorMsg = "";
        if (service.step === 1) {
            if (!service.selectedClientId) { service.errorMsg = "Bitte einen Klienten wählen!"; return; }
            
            // Smart auto-select Erbe if deceased
            let defaultType = 'client';
            let defaultId = '';
            if (service.client) {
                const cStatus = (service.client.status || '').toLowerCase();
                const inheritors = Array.isArray(service.client.expand?.inheritor) ? service.client.expand.inheritor : (service.client.expand?.inheritor ? [service.client.expand.inheritor] : []);
                if (cStatus === 'verstorben' && inheritors.length > 0) {
                    defaultType = 'inheritor';
                    defaultId = inheritors[0].id;
                }
            }

            if (service.recipientType === 'client' || service.recipientType === '') {
                service.recipientType = defaultType;
                service.recipientId = defaultId;
            }

            // Smart Skip: Wenn der Klient eine Standard-Vorlage hat, weisen wir sie zu und überspringen Schritt 2
            if (service.client?.default_template) {
                const exists = service.availableTemplates.find((t: any) => t.id === service.client?.default_template);
                if (exists) {
                    service.selectedTemplateId = exists.id;
                    service.recipientType = defaultType;
                    service.recipientId = defaultId;
                    if (exists.type?.toLowerCase() === 'rechnung' || exists.type?.toLowerCase() === 'arbeitszeitnachweis') { service.step = 3; return; }
                    return;
                }
            }
            service.step = 2;
            return;
        }
        if (service.step === 2) {
            if (!service.selectedTemplateId) { service.errorMsg = "Bitte eine Vorlage wählen!"; return; }
            if (service.requiresAppointments) { service.step = 3; return; }
            service.step = 4; return;
        }
        if (service.step === 3) {
            if (service.selectedAppointmentIds.length === 0) { service.errorMsg = "Bitte Termine wählen!"; return; }
            service.step = 4; return;
        }
    }

    function prev() {
        service.errorMsg = "";
        if (service.step === 4) {
            if (service.requiresAppointments) { service.step = 3; return; }
            service.step = 2; return;
        }
        if (service.step === 3) { service.step = 2; return; }
        if (service.step === 2) { service.step = 1; return; }
    }

    function downloadManually() {
        if (generatedPdfBlob) {
            const url = URL.createObjectURL(generatedPdfBlob);
            const aTag = document.createElement('a');
            aTag.href = url;
            aTag.download = generatedFilename;
            aTag.click();
        }
        if (generatedTsBlob) {
            const url = URL.createObjectURL(generatedTsBlob);
            const aTag = document.createElement('a');
            aTag.href = url;
            aTag.download = generatedTsFilename;
            aTag.click();
        }
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
                else reject(new Error("Failed to convert blob to base64"));
            };
            reader.readAsDataURL(blob);
        });
    }

    async function prepareFieldsForPdfKit(fields: any[], isTimesheet: boolean) {
        const result = [];
        for (const f of fields) {
            // Garantiert absolute Typensicherheit für pdfkit, um Endlosschleifen (Maximum call stack) zu verhindern
            const safeX = Number(f.x) || 0;
            const safeY = Number(f.y) || 0; // Sperre entfernt, damit Seitenfußzeilen am unteren Rand bleiben!
            const safeW = Math.max(Number(f.w) || 500, 50);
            const safeH = Math.max(Number(f.h) || 50, 15);
            const sanitizedField = { ...f, x: safeX, y: safeY, w: safeW, h: safeH };
            
            if (sanitizedField.style) {
                sanitizedField.style.color = sanitizedField.style.color || '#000000';
                sanitizedField.style.fontSize = Math.min(Math.max(Number(sanitizedField.style.fontSize) || 12, 4), 30); // Max 30pt
                
                // Verhindert, dass das Padding den Textbereich auf 0 zerquetscht
                let pad = Number(sanitizedField.style.padding) || 0;
                if (pad * 2 + 10 >= safeW || pad * 2 + 10 >= safeH) pad = 0;
                sanitizedField.style.padding = pad;
            }
            
            if (sanitizedField.type === 'table' && sanitizedField.tableConfig) {
                let safeColumns = sanitizedField.tableConfig.columns || [];
                if (Array.isArray(safeColumns)) {
                    safeColumns = safeColumns.map((c: any) => ({
                        ...c,
                            name: (c.name || "").substring(0, 35),
                        // Absolutes Minimum 8%, um Platz für Text + Padding zu garantieren
                        width: Math.max(Number(c.width) || 10, 8)
                    }));
                }
                    if (safeColumns.length === 0) {
                        safeColumns = [{ id: "1", name: " ", type: "title", width: 100, align: "left" }];
                    }

                sanitizedField.tableConfig = {
                    ...sanitizedField.tableConfig,
                    columns: safeColumns,
                    borderWidth: Number(sanitizedField.tableConfig.borderWidth) || 1,
                    fontSize: Math.min(Math.max(Number(sanitizedField.tableConfig.fontSize) || 10, 4), 30),
                    cellPadding: Math.min(Math.max(Number(sanitizedField.tableConfig.cellPadding) || 6, 0), 5),
                    footerWidth: Math.max(Number(sanitizedField.tableConfig.footerWidth) || 200, 50),
                    firstPageLimit: Math.max(Number(sanitizedField.tableConfig.firstPageLimit) || 6, 1),
                    nextPageLimit: Math.max(Number(sanitizedField.tableConfig.nextPageLimit) || 12, 1),
                    headerBackgroundColor: sanitizedField.tableConfig.headerBackgroundColor || '#f4f4f5',
                    headerTextColor: sanitizedField.tableConfig.headerTextColor || '#000000',
                    borderColor: sanitizedField.tableConfig.borderColor || '#cbd5e1'
                };
            }

            if (sanitizedField.type === 'text') {
                // HINWEIS: Wir behalten field.h nun bei, damit das Backend die korrekten
                // Canvas-Abstände (Gaps) errechnen kann. PDFKit ignoriert die Höhe, 
                // wenn field.style.dynamicHeight true ist.

                let content = service.replacePlaceholders(sanitizedField.content, isTimesheet);
                const imgMatch = content.match(/<img[^>]+src="([^">]+)"[^>]*>/);
                if (imgMatch) {
                    // HTML-Entities entschlüsseln, damit der Token in der URL funktioniert
                    const src = imgMatch[1].replace(/&amp;/g, '&'); 
                    try {
                        const response = await fetch(src);
                        if (!response.ok) throw new Error("Bild konnte nicht geladen werden");
                        const blob = await response.blob();
                        const base64 = await blobToBase64(blob);
                        
                        const textOnly = content.replace(/<img[^>]*>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>?/gm, '').trim();
                        if (textOnly) {
                            result.push({ ...sanitizedField, content: textOnly });
                            result.push({ ...sanitizedField, type: 'logo', imageBase64: base64, y: (Number(sanitizedField.y) || 0) + 20, h: 60 });
                        } else {
                            result.push({ ...sanitizedField, type: 'logo', imageBase64: base64 });
                        }
                    } catch (e) {
                        console.warn("Unterschrift/Bild übersprungen:", e);
                        const textOnly = content.replace(/<img[^>]*>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>?/gm, '').trim();
                        if (textOnly) {
                            result.push({ ...sanitizedField, content: textOnly });
                        }
                    }
                } else {
                    content = content.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>?/gm, '').trim();
                    if (content) {
                        result.push({ ...sanitizedField, content });
                    }
                }
            } else { result.push(sanitizedField); }
        }
        return result;
    }

    async function generate(isBulk: boolean = false) {
        if (service.isLoading) return;
        service.isLoading = true;
        service.errorMsg = "";
        try {
            const lastName = service.client?.name_last ? `-${service.client.name_last}` : '';
            let baseNr = service.invoiceData?.invoice_nr || new Date().toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
            
            let filename = 'Dokument.pdf';
            let tsFilename = '';

            if (service.isInvoice && service.invoiceData) {
                // Slashes im Dateinamen sind im Betriebssystem problematisch, daher durch Bindestriche ersetzen
                filename = `RE-${baseNr}${lastName}.pdf`.replace(/\//g, '-');
                tsFilename = `AZ-${baseNr}${lastName}.pdf`.replace(/\//g, '-');
            } else if (service.template?.type?.toLowerCase() === 'arbeitszeitnachweis') {
                filename = `AZ-${baseNr}${lastName}.pdf`.replace(/\//g, '-');
            } else {
                filename = `${service.template?.title || 'Dokument'}.pdf`.replace(/\//g, '-');
            }

            let companyLogoBase64 = null;
            if (service.company?.logo) {
                const logoUrl = pb.files.getURL(service.company, service.company.logo);
                try { companyLogoBase64 = await fetch(logoUrl).then(r => r.blob()).then(blobToBase64); } catch(e){}
            }
            
            const fieldsReady = await prepareFieldsForPdfKit(service.template?.content_html?.fields || [], false);
            
            const tableField = service.template?.content_html?.fields?.find((f: any) => f.type === 'table');
            
            const pdfBlob = await generatePdfBlob({
                templateJson: { ...(service.template?.content_html || {}), fields: fieldsReady },
                data: {
                    companyLogoBase64,
                    invoicePositions: service.invoiceData?.positions || [],
                    netto: Number(service.invoiceData?.netto) || 0,
                    tax_sum: Number(service.invoiceData?.tax_sum) || 0,
                    brutto: Number(service.invoiceData?.brutto) || 0,
                    taxRate: Number(service.taxRate) || 0
                },
                isTimesheet: false
            });

            let tsBlob = null;
            if (service.isInvoice && service.timesheetTemplate) {
                const tsFieldsReady = await prepareFieldsForPdfKit(service.timesheetTemplate.content_html.fields, true);
                tsBlob = await generatePdfBlob({
                    templateJson: { ...service.timesheetTemplate.content_html, fields: tsFieldsReady },
                    data: { companyLogoBase64, timesheetPositions: service.timesheetData?.positions || [] },
                    isTimesheet: true
                });
            }

            // Wenn es eine Rechnung ODER ein reiner Arbeitszeitnachweis ist, im System hinterlegen
            if ((service.isInvoice && service.invoiceData) || service.template?.type?.toLowerCase() === 'arbeitszeitnachweis') {
                const pbFormData = new FormData();
                // Im Namen von: user = Ziel-Nutzer, sonst eingeloggter Nutzer
                const targetUserId = service.onBehalfOfUserId || pb.authStore.model?.id || '';
                pbFormData.append('user', targetUserId);
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
                pbFormData.append('table_sum_positions', JSON.stringify({
                    recipientType: service.recipientType,
                    recipientId: service.recipientId,
                    templateId: service.selectedTemplateId
                }));
                } else {
                    // Eigenständiger Arbeitszeitnachweis
                    pbFormData.append('invoice_nr', 'Zeitnachweis');
                    pbFormData.append('issue_date', new Date().toISOString());
                    pbFormData.append('status', 'Eingereicht'); // Direkt für den Klienten freigeben
                    pbFormData.append('brutto', '0');
                }
                
                service.selectedAppointmentIds.forEach(id => pbFormData.append('appointments', id));
                if (service.company?.id) pbFormData.append('company', service.company.id);

                pbFormData.append('pdf', pdfBlob, filename);

                // Wenn der Arbeitszeitnachweis existiert, als zweites PDF anheften
                if (tsBlob) {
                    pbFormData.append('pdf', tsBlob, tsFilename);
                }

                if (service.existingInvoiceId) {
                    const updatedInvoice = await pb.collection('invoices').update(service.existingInvoiceId, pbFormData);
                    service.generatedInvoiceId = updatedInvoice.id;
                } else {
                    const createdInvoice = await pb.collection('invoices').create(pbFormData);
                    service.generatedInvoiceId = createdInvoice.id;
                }
                
                if (!isBulk) {
                    // Setze alle verknüpften Termine auf "abgerechnet" (settled = true)
                    for (const appId of service.selectedAppointmentIds) {
                        await pb.collection('appointments').update(appId, { settled: true });
                    }
                    service.successMsg = "Dokument erfolgreich generiert und für das Portal gespeichert!";
                }
            } else {
                if (!isBulk) {
                    if (service.selectedClientId) {
                        try {
                            const clientFormData = new FormData();
                            const existingClient = orgaStore.clients?.data.find((c: any) => c.id === service.selectedClientId);
                            const existingDocs = existingClient?.documents || [];
                            for (const doc of existingDocs) {
                                clientFormData.append('documents', doc);
                            }
                            clientFormData.append('documents', pdfBlob, filename);
                            await pb.collection('clients').update(service.selectedClientId, clientFormData);
                            setTimeout(async () => {
                                const updatedClient = await pb.collection('clients').getOne(service.selectedClientId, { expand: 'insurance,retirement_homes,contacts,caregiver,templates,inheritor', requestKey: null }) as any;
                                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === service.selectedClientId) ?? -1;
                                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
                            }, 400);
                            service.successMsg = "Dokument generiert und in der Klienten-Akte gespeichert!";
                        } catch (e) {
                            console.error("Fehler beim Speichern in der Klienten-Akte", e);
                            service.successMsg = "Dokument erfolgreich generiert!";
                        }
                    } else {
                        service.successMsg = "Dokument erfolgreich generiert!";
                    }
                }
            }
            
            generatedPdfBlob = pdfBlob;
            generatedFilename = filename;
            generatedTsBlob = tsBlob;
            generatedTsFilename = tsFilename;

            if (!isBulk) {
                generatedPdfBlob = pdfBlob;
                generatedFilename = filename;
                generatedTsBlob = tsBlob;
                generatedTsFilename = tsFilename;
                service.step = 5;
            }
        } catch (err: any) {
            console.error(err);
            service.errorMsg = err.message || "Fehler bei der Generierung.";
        } finally {
            service.isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-4xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors z-10"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pr-12">
            <div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">Dokument generieren</h2>
                {#if service.client}
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Klient: <strong class="text-slate-800 dark:text-slate-200">{service.client.name_first} {service.client.name_last}</strong>
                    </p>
                {/if}
            </div>

            <!-- ADMIN: Mitarbeiter-Auswahl stets sichtbar im Header (über alle Schritte) -->
            {#if isAdmin && allUsers.length > 1 && service.step >= 1 && service.step <= 4 && !isBulkRegenerating}
                <div class="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-3 py-1.5 rounded-2xl shadow-xs self-start sm:self-auto">
                    <span class="text-xs font-bold text-amber-900 dark:text-amber-300 shrink-0 flex items-center gap-1">
                        <span>👤</span> <span class="hidden sm:inline">Erstellen für:</span>
                    </span>
                    <select
                        bind:value={service.onBehalfOfUserId}
                        onchange={() => { service.selectedAppointmentIds = []; }}
                        class="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-950 dark:text-amber-200 rounded-xl px-2.5 py-1 outline-none shadow-xs focus:ring-2 focus:ring-amber-400 cursor-pointer max-w-48 sm:max-w-64 truncate"
                        title="Mitarbeiter auswählen, in dessen Namen dieses Dokument erstellt wird"
                    >
                        <option value="">Mich selbst ({pb.authStore.model?.name_first || 'Admin'} {pb.authStore.model?.name_last || ''})</option>
                        {#each allUsers.filter(u => u.id !== pb.authStore.model?.id) as u}
                            <option value={u.id}>{u.name_first} {u.name_last} {u.role ? `(${u.role})` : ''}</option>
                        {/each}
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

        <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
            {#if isBulkRegenerating || service.step === 0}
                <div class="flex flex-col items-center justify-center py-20 animate-enter">
                    <div class="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"></div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Papiere werden neu gemischt...</h3>
                    <p class="text-slate-500 dark:text-slate-400 font-medium">Rechnung {bulkCurrent} von {bulkTotal} wird aktualisiert.</p>
                    <p class="text-xs text-amber-600 dark:text-amber-400 mt-4">Bitte schließen Sie dieses Fenster nicht.</p>
                </div>
            {:else if service.step === 1}
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">1. Klient &amp; Empfänger</h3>

                {#if service.onBehalfOfUserId}
                    <div class="mb-4 p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                        <span>ℹ️</span>
                        <span>Mitarbeiter-Daten, Unterschrift und Termine werden von <strong>{allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_first} {allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_last}</strong> übernommen.</span>
                    </div>
                {/if}

                <label for="generator-client" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Basis-Klient</label>
                <select
                    id="generator-client"
                    bind:value={service.selectedClientId}
                    class="orga-input-clear mb-6"
                >
                    <option value="">Klienten wählen...</option>
                    {#each service.availableClients as c}
                        <option value={c.id}>{c.name_first} {c.name_last}</option>
                    {/each}
                    {#if service.availableClients.length === 0 && service.onBehalfOfUserId}
                        <option disabled value="">Keine Klienten für diesen Mitarbeiter gefunden</option>
                    {/if}
                </select>
            {:else if service.step === 2}
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">2. Vorlage wählen</h3>
                    <select bind:value={service.templateTypeFilter} class="orga-input-clear py-1.5 px-3 text-xs font-bold bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer w-auto">
                        <option value="all">Alle Vorlagen</option>
                        <option value="rechnung">Rechnungen</option>
                        <option value="vollmacht">Vollmachten</option>
                        <option value="antrag">Anträge</option>
                        <option value="kündigung">Kündigungen</option>
                        <option value="vertrag">Verträge</option>
                        <option value="allgemein">Brief / Sonstiges</option>
                    </select>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {#each service.availableTemplates as t}
                        <label class="flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-colors {service.selectedTemplateId === t.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-500'}"><input type="radio" bind:group={service.selectedTemplateId} value={t.id} class="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" /><div class="min-w-0 flex-1"><p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={t.title || 'Unbenannt'}>{t.title || 'Unbenannt'}</p><p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-0.5 tracking-wider font-semibold truncate">{t.type}</p></div></label>
                    {/each}
                    {#if service.availableTemplates.length === 0}
                        <p class="text-sm italic text-slate-500 dark:text-slate-400 py-4 text-center col-span-full">Keine Vorlagen für diesen Typ gefunden.</p>
                    {/if}
                </div>
                {#if service.template && !['rechnung', 'arbeitszeitnachweis'].includes(service.template.type?.toLowerCase() || '')}
                    <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-enter">
                        <span class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Adressat / Empfänger auf dem Dokument</span>
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"><input type="radio" bind:group={service.recipientType} value="client" class="text-indigo-600" /> <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Klient selbst ({service.client?.name_first} {service.client?.name_last})</span></label>
                            {#if service.client?.expand?.caregiver}<label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"><input type="radio" bind:group={service.recipientType} value="caregiver" onchange={() => service.recipientId = service.client?.expand?.caregiver?.id} class="text-indigo-600" /> <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Gesetzl. Betreuung: {service.client.expand.caregiver.name_first} {service.client.expand.caregiver.name_last}</span></label>{/if}
                            {#if service.client?.expand?.insurance}<label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"><input type="radio" bind:group={service.recipientType} value="insurance" class="text-indigo-600" /> <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Krankenkasse ({service.client.expand.insurance.name})</span></label>{/if}
                            {#each service.client?.expand?.contacts || [] as contact}<label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"><input type="radio" bind:group={service.recipientType} value="contact" onchange={() => service.recipientId = contact.id} class="text-indigo-600" /> <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Kontakt: {contact.name_first} {contact.name_last} ({contact.company_name || contact.salutation})</span></label>{/each}
                            {#each service.client?.expand?.retirement_homes || [] as home}<label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"><input type="radio" bind:group={service.recipientType} value="home" onchange={() => service.recipientId = home.id} class="text-indigo-600" /> <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Pflegeheim: {home.name}</span></label>{/each}
                            {#each (Array.isArray(service.client?.expand?.inheritor) ? service.client.expand.inheritor : (service.client?.expand?.inheritor ? [service.client.expand.inheritor] : [])) as inheritor}
                                <label class="flex items-center gap-2 p-3 border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 rounded-lg cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/60"><input type="radio" bind:group={service.recipientType} value="inheritor" onchange={() => service.recipientId = inheritor.id} class="text-teal-600" /> <span class="text-sm font-medium text-teal-900 dark:text-teal-200">Pflegeperson (Antrag Verhinderungspflege): {inheritor.name_first} {inheritor.name_last} ({inheritor.company_name || 'Pflegeperson'})</span></label>
                            {/each}
                        </div>
                    </div>
                {/if}
            {:else if service.step === 3 && service.requiresAppointments}
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">3. Termine & Abrechnungsdaten</h3>
                {#if service.isInvoice}
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div><label for="gen-invoice-nr" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rechnungsnummer</label><input id="gen-invoice-nr" type="text" bind:value={service.manualInvoiceNr} class="orga-input-clear py-2 text-sm" placeholder="z.B. 01/2026" />{#if service.isInvoiceNrDuplicate}<p class="text-[10px] text-rose-600 font-bold mt-1 leading-tight">⚠️ Nummer bereits vergeben!</p>{/if}</div>
                        <div><label for="gen-issue-date" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rechnungsdatum</label><input id="gen-issue-date" type="date" bind:value={service.manualIssueDate} class="orga-input-clear py-2 text-sm" /></div>
                    </div>
                    <hr class="border-slate-100 dark:border-slate-800 mb-6" />
                    <div class="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div><label for="gen-wage" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Stundensatz (€)</label><input id="gen-wage" type="number" bind:value={service.hourlyWage} class="orga-input-clear py-2 text-sm" /></div>
                        <div><label for="gen-km" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Fahrt (€/km)</label><input id="gen-km" type="number" step="0.01" bind:value={service.kmRate} class="orga-input-clear py-2 text-sm" /></div>
                        <div><label for="gen-tax" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Steuersatz (%)</label><select id="gen-tax" bind:value={service.taxRate} class="orga-input-clear py-2 text-sm px-2"><option value="0">0%</option><option value="7">7%</option><option value="19">19%</option></select></div>
                    </div>
                {/if}
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Abzurechnende Termine wählen</p>
                    <label class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"><input type="checkbox" bind:checked={service.showBilledAppointments} class="text-indigo-600 rounded border-slate-300 dark:border-slate-600" /> Bereits abgerechnete einblenden</label>
                </div>
                <div class="space-y-2">
                    {#each service.availableAppointments as app}
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer transition-colors {service.selectedAppointmentIds.includes(app.id) ? 'bg-indigo-50/30 dark:bg-indigo-950/30' : ''}"><input type="checkbox" bind:group={service.selectedAppointmentIds} value={app.id} class="w-4 h-4 mt-1 text-indigo-600 rounded focus:ring-indigo-500" /><div><p class="text-sm font-bold text-slate-900 dark:text-slate-100">{app.appointment ? new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} - {app.description || 'Termin'} {#if app.settled}<span class="ml-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">✓ Abgerechnet</span>{/if}</p><div class="flex gap-2 mt-1">{#if app.expand?.time_record}<span class="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-bold">Zeiten</span>{/if}{#if app.expand?.drive_record}<span class="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded font-bold">Fahrten</span>{/if}{#if app.expand?.expenditures}<span class="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded font-bold">Ausgaben</span>{/if}</div></div></label>
                    {/each}
                    {#if service.availableAppointments.length === 0}
                        <p class="text-sm italic text-slate-500 dark:text-slate-400 p-3 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl">
                            Keine offenen Termine mit Zeiterfassung {#if service.onBehalfOfUserId}für <strong>{allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_first}</strong>{/if} bei diesem Klienten vorhanden.
                        </p>
                    {/if}
                </div>
            {:else if service.step === 4}
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Zusammenfassung</h3>
                <div class="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                    {#if service.onBehalfOfUserId}
                        <p class="text-sm"><span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Erstellt für:</span> <span class="font-bold text-amber-800 dark:text-amber-300">👤 {allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_first} {allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_last}</span></p>
                    {/if}
                    <p class="text-sm"><span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Vorlage:</span> <span class="font-bold text-slate-900 dark:text-slate-100">{service.template?.title}</span></p>
                    <p class="text-sm"><span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Empfänger:</span> <span class="font-bold text-slate-900 dark:text-slate-100">{service.recipientType === 'inheritor' ? 'Pflegeperson (Antrag Verhinderungspflege)' : service.recipientType}</span></p>
                    {#if service.isInvoice && service.invoiceData}
                        <hr class="border-slate-200 dark:border-slate-700 my-2" /><p class="text-sm"><span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Rechnung:</span> <span class="font-bold {service.isInvoiceNrDuplicate ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}">{service.invoiceData.invoice_nr}</span></p>{#if service.isInvoiceNrDuplicate}<p class="text-xs text-rose-600 dark:text-rose-400 font-bold mb-1">⚠️ Diese Rechnungsnummer existiert bereits im System!</p>{/if}<p class="text-sm"><span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Posten:</span> <span class="font-bold text-slate-900 dark:text-slate-100">{service.invoiceData.positions.length} Stück</span></p><p class="text-sm mt-2"><span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Gesamt Brutto:</span> <span class="font-bold text-indigo-700 dark:text-indigo-400 text-lg">{service.invoiceData.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></p>
                    {/if}
                </div>
                <div class="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl flex items-start gap-3"><span class="text-xl">📄</span><p class="text-sm text-indigo-900 dark:text-indigo-200">Das Dokument wird nun hochauflösend als PDF generiert. Dies kann wenige Sekunden dauern.</p></div>
            {:else if service.step === 5}
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Fertig!</h3>
                <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <span class="text-xl">✅</span>
                    <div>
                        <p class="font-bold text-emerald-900 dark:text-emerald-300">{service.successMsg}</p>
                        <p class="text-sm text-emerald-700 dark:text-emerald-400 mt-1">Sie können das Dokument nun herunterladen oder direkt per E-Mail versenden.</p>
                    </div>
                </div>

                <GeneratorEmailSend 
                    {service}
                    pdfBlob={generatedPdfBlob}
                    tsBlob={generatedTsBlob}
                    pdfFilename={generatedFilename}
                    tsFilename={generatedTsFilename}
                    onClose={close}
                    onDownload={downloadManually}
                />
            {/if}
        </div>

        <div class="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0 mt-2">
            {#if service.step > 1 && service.step < 5}<button type="button" onclick={prev} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={service.isLoading}>Zurück</button>{:else}<div class="hidden sm:block"></div>{/if}
            {#if service.step < 4}<button type="button" onclick={next} class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={service.isLoading}>Weiter &rarr;</button>{:else if service.step === 4}<button type="button" onclick={() => generate(false)} class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 px-8 shadow-indigo-600/30" disabled={service.isLoading}>{#if service.isLoading}<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generiert...{:else}PDF Generieren{/if}</button>{/if}
        </div>
    </div>
</dialog>