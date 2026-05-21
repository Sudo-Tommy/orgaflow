<script lang="ts">
    import { useDocumentGenerator } from "$lib/services/documentGeneratorService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import GeneratorEmailSend from "./GeneratorEmailSend.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    const service = useDocumentGenerator();
    let pdfContainerRef = $state<HTMLDivElement | null>(null);
    let timesheetPdfContainerRef = $state<HTMLDivElement | null>(null);

    let generatedPdfBlob = $state<Blob | null>(null);
    let generatedTsBlob = $state<Blob | null>(null);
    let generatedFilename = $state("");
    let generatedTsFilename = $state("");

    export function open(preselectedTemplateId?: string, startStep: number = 1) {
        service.reset();
        service.step = startStep;
        service.selectedTemplateId = preselectedTemplateId || "";
        service.selectedClientId = "";
        service.selectedAppointmentIds = [];
        if (typeof localStorage !== 'undefined') {
            service.selectedCompanyId = localStorage.getItem('global_company_id') || 'all';
        }
        generatedPdfBlob = null;
        generatedTsBlob = null;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function next() {
        service.errorMsg = "";
        if (service.step === 1) {
            if (!service.selectedClientId) { service.errorMsg = "Bitte einen Klienten wählen!"; return; }
            // Smart Skip: Wenn der Klient eine Standard-Vorlage hat, weisen wir sie zu und überspringen Schritt 2
            if (service.client?.default_template) {
                const exists = service.availableTemplates.find((t: any) => t.id === service.client?.default_template);
                if (exists) {
                    service.selectedTemplateId = exists.id;
                    service.recipientType = 'client';
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

    async function generate() {
        if (!pdfContainerRef) return;
        service.isLoading = true;
        service.errorMsg = "";
        try {
            // Wir laden html2pdf NUR DANN dynamisch, wenn der Nutzer auf "Generieren" drückt!
            // So vermeiden wir jegliche SSR/Vite Fehler.
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            
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

            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg' as const, quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'px', format: [794, 1123] as any, orientation: service.template?.content_html?.orientation || 'portrait' }
            };

            const pdfBlob = await html2pdf().set(opt).from(pdfContainerRef).output('blob');

            let tsBlob = null;
            if (service.isInvoice && service.timesheetTemplate && timesheetPdfContainerRef) {
                const optTs = {
                    margin: 0,
                    filename: tsFilename,
                    image: { type: 'jpeg' as const, quality: 0.95 },
                    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                    jsPDF: { unit: 'px', format: [794, 1123] as any, orientation: service.timesheetTemplate.content_html?.orientation || 'portrait' }
                };
                tsBlob = await html2pdf().set(optTs).from(timesheetPdfContainerRef).output('blob');
            }

            // Wenn es eine Rechnung ODER ein reiner Arbeitszeitnachweis ist, im System hinterlegen
            if ((service.isInvoice && service.invoiceData) || service.template?.type?.toLowerCase() === 'arbeitszeitnachweis') {
                const pbFormData = new FormData();
                pbFormData.append('user', pb.authStore.model?.id || '');
                pbFormData.append('client', service.selectedClientId);
                
                if (service.isInvoice && service.invoiceData) {
                    pbFormData.append('invoice_nr', service.invoiceData.invoice_nr);
                    pbFormData.append('issue_date', new Date(service.invoiceData.issue_date).toISOString());
                    pbFormData.append('status', 'Entwurf');
                    const due = new Date(service.invoiceData.issue_date); due.setDate(due.getDate() + 14);
                    pbFormData.append('due_date', due.toISOString());
                pbFormData.append('tax_rate', service.taxRate === "0" ? "" : service.taxRate);
                pbFormData.append('netto', service.invoiceData.netto.toString());
                pbFormData.append('tax_sum', service.invoiceData.tax_sum.toString());
                pbFormData.append('brutto', service.invoiceData.brutto.toString());
                pbFormData.append('hourly_wage', service.hourlyWage.toString());
                pbFormData.append('travel_expanses_rate', service.kmRate.toString());
                pbFormData.append('table_positions', JSON.stringify(service.invoiceData.positions));
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

                await pb.collection('invoices').create(pbFormData);
                
                // Setze alle verknüpften Termine auf "abgerechnet" (settled = true)
                for (const appId of service.selectedAppointmentIds) {
                    await pb.collection('appointments').update(appId, { settled: true });
                }
                
                service.successMsg = "Dokument erfolgreich generiert und für das Portal gespeichert!";
            } else {
                service.successMsg = "Dokument erfolgreich generiert!";
            }
            
            generatedPdfBlob = pdfBlob;
            generatedFilename = filename;
            if (tsBlob) {
                generatedTsBlob = tsBlob;
                generatedTsFilename = tsFilename;
            }
            service.step = 5;
        } catch (err: any) {
            console.error(err);
            service.errorMsg = err.message || "Fehler bei der Generierung.";
        } finally {
            service.isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full min-h-100 max-h-[90vh] flex flex-col relative overflow-hidden">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-10"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-2">Dokument generieren</h2>
        
        <div class="flex gap-2 mb-6">
            <div class="h-1.5 flex-1 rounded-full {service.step >= 1 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
            <div class="h-1.5 flex-1 rounded-full {service.step >= 2 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
            {#if service.requiresAppointments}<div class="h-1.5 flex-1 rounded-full {service.step >= 3 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>{/if}
            <div class="h-1.5 flex-1 rounded-full {service.step >= 4 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
            <div class="h-1.5 flex-1 rounded-full {service.step >= 5 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
        </div>

        {#if service.errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">{service.errorMsg}</div>{/if}

        <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
            {#if service.step === 1}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">1. Klient & Empfänger</h3>
                <label for="generator-client" class="block text-sm font-semibold text-neutral-700 mb-1.5">Basis-Klient</label><select id="generator-client" bind:value={service.selectedClientId} class="orga-input-clear mb-6"><option value="">Klienten wählen...</option>{#each orgaStore.clients?.data || [] as c}<option value={c.id}>{c.name_first} {c.name_last}</option>{/each}</select>
            {:else if service.step === 2}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">2. Vorlage wählen</h3>
                <div class="grid grid-cols-1 gap-3">
                    {#each service.availableTemplates as t}
                        <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors {service.selectedTemplateId === t.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-neutral-200 hover:border-indigo-300'}"><input type="radio" bind:group={service.selectedTemplateId} value={t.id} class="w-4 h-4 text-indigo-600" /><div><p class="font-bold text-neutral-900">{t.title || 'Unbenannt'}</p><p class="text-xs text-neutral-500 uppercase mt-0.5 tracking-wider font-semibold">{t.type}</p></div></label>
                    {/each}
                </div>
                {#if service.template && (service.template.type?.toLowerCase() === 'brief' || service.template.type?.toLowerCase() === 'antrag' || service.template.type?.toLowerCase() === 'allgemein')}
                    <div class="mt-6 pt-6 border-t border-neutral-100 animate-enter">
                        <span class="block text-sm font-semibold text-neutral-700 mb-2">Adressat / Empfänger auf dem Dokument</span>
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="client" class="text-indigo-600" /> <span class="text-sm font-medium">Klient selbst ({service.client?.name_first} {service.client?.name_last})</span></label>
                            {#if service.client?.expand?.insurance}<label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="insurance" class="text-indigo-600" /> <span class="text-sm font-medium">Krankenkasse ({service.client.expand.insurance.name})</span></label>{/if}
                            {#each service.client?.expand?.contacts || [] as contact}<label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="contact" onchange={() => service.recipientId = contact.id} class="text-indigo-600" /> <span class="text-sm font-medium">Kontakt: {contact.name_first} {contact.name_last} ({contact.company_name || contact.salutation})</span></label>{/each}
                            {#each service.client?.expand?.retirement_homes || [] as home}<label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="home" onchange={() => service.recipientId = home.id} class="text-indigo-600" /> <span class="text-sm font-medium">Pflegeheim: {home.name}</span></label>{/each}
                        </div>
                    </div>
                {/if}
            {:else if service.step === 3 && service.requiresAppointments}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">3. Termine & Abrechnungsdaten</h3>
                {#if service.isInvoice}
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div><label for="gen-invoice-nr" class="block text-xs font-semibold text-neutral-600 mb-1">Rechnungsnummer</label><input id="gen-invoice-nr" type="text" bind:value={service.manualInvoiceNr} class="orga-input-clear py-2 text-sm" placeholder="z.B. 01/2026" />{#if service.isInvoiceNrDuplicate}<p class="text-[10px] text-rose-600 font-bold mt-1 leading-tight">⚠️ Nummer bereits vergeben!</p>{/if}</div>
                        <div><label for="gen-issue-date" class="block text-xs font-semibold text-neutral-600 mb-1">Rechnungsdatum</label><input id="gen-issue-date" type="date" bind:value={service.manualIssueDate} class="orga-input-clear py-2 text-sm" /></div>
                    </div>
                    <hr class="border-neutral-100 mb-6" />
                    <div class="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-neutral-100">
                        <div><label for="gen-wage" class="block text-xs font-semibold text-neutral-600 mb-1">Stundensatz (€)</label><input id="gen-wage" type="number" bind:value={service.hourlyWage} class="orga-input-clear py-2 text-sm" /></div>
                        <div><label for="gen-km" class="block text-xs font-semibold text-neutral-600 mb-1">Fahrt (€/km)</label><input id="gen-km" type="number" step="0.01" bind:value={service.kmRate} class="orga-input-clear py-2 text-sm" /></div>
                        <div><label for="gen-tax" class="block text-xs font-semibold text-neutral-600 mb-1">Steuersatz (%)</label><select id="gen-tax" bind:value={service.taxRate} class="orga-input-clear py-2 text-sm px-2"><option value="0">0%</option><option value="7">7%</option><option value="19">19%</option></select></div>
                    </div>
                {/if}
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold text-neutral-700">Abzurechnende Termine wählen</p>
                    <label class="flex items-center gap-2 text-xs font-semibold text-neutral-600 cursor-pointer"><input type="checkbox" bind:checked={service.showBilledAppointments} class="text-indigo-600 rounded border-neutral-300" /> Bereits abgerechnete einblenden</label>
                </div>
                <div class="space-y-2">
                    {#each service.availableAppointments as app}
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 hover:border-indigo-300 cursor-pointer transition-colors {service.selectedAppointmentIds.includes(app.id) ? 'bg-indigo-50/30' : ''}"><input type="checkbox" bind:group={service.selectedAppointmentIds} value={app.id} class="w-4 h-4 mt-1 text-indigo-600 rounded focus:ring-indigo-500" /><div><p class="text-sm font-bold text-neutral-900">{app.appointment ? new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} - {app.description || 'Termin'} {#if app.settled}<span class="ml-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">✓ Abgerechnet</span>{/if}</p><div class="flex gap-2 mt-1">{#if app.expand?.time_record}<span class="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Zeiten</span>{/if}{#if app.expand?.drive_record}<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Fahrten</span>{/if}{#if app.expand?.expenditures}<span class="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">Ausgaben</span>{/if}</div></div></label>
                    {/each}
                    {#if service.availableAppointments.length === 0}<p class="text-sm italic text-neutral-500">Keine Termine vorhanden.</p>{/if}
                </div>
            {:else if service.step === 4}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">Zusammenfassung</h3>
                <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-100 space-y-3">
                    <p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Vorlage:</span> <span class="font-bold">{service.template?.title}</span></p>
                    <p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Empfänger:</span> <span class="font-bold">{service.recipientType}</span></p>
                    {#if service.isInvoice && service.invoiceData}
                        <hr class="border-neutral-200 my-2" /><p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Rechnung:</span> <span class="font-bold {service.isInvoiceNrDuplicate ? 'text-rose-600' : ''}">{service.invoiceData.invoice_nr}</span></p>{#if service.isInvoiceNrDuplicate}<p class="text-xs text-rose-600 font-bold mb-1">⚠️ Diese Rechnungsnummer existiert bereits im System!</p>{/if}<p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Posten:</span> <span class="font-bold">{service.invoiceData.positions.length} Stück</span></p><p class="text-sm mt-2"><span class="font-semibold text-neutral-500 w-24 inline-block">Gesamt Brutto:</span> <span class="font-bold text-indigo-700 text-lg">{service.invoiceData.brutto.toFixed(2).replace('.', ',')} €</span></p>
                    {/if}
                </div>
                <div class="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3"><span class="text-xl">📄</span><p class="text-sm text-indigo-900">Das Dokument wird nun hochauflösend als PDF generiert. Dies kann wenige Sekunden dauern.</p></div>
            {:else if service.step === 5}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">Fertig!</h3>
                <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <span class="text-xl">✅</span>
                    <div>
                        <p class="font-bold text-emerald-900">{service.successMsg}</p>
                        <p class="text-sm text-emerald-700 mt-1">Sie können das Dokument nun herunterladen oder direkt per E-Mail versenden.</p>
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

        <div class="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-neutral-100 shrink-0 mt-2">
            {#if service.step > 1 && service.step < 5}<button type="button" onclick={prev} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={service.isLoading}>Zurück</button>{:else}<div class="hidden sm:block"></div>{/if}
            {#if service.step < 4}<button type="button" onclick={next} class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={service.isLoading}>Weiter &rarr;</button>{:else if service.step === 4}<button type="button" onclick={generate} class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 px-8 shadow-indigo-600/30" disabled={service.isLoading}>{#if service.isLoading}<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generiert...{:else}PDF Generieren{/if}</button>{/if}
        </div>
    </div>
</dialog>

<!-- Verstecktes Canvas-Container für html2pdf Rendering -->
{#if service.template && service.step === 4}
    <div style="position: fixed; left: -9999px; top: 0; z-index: -100; color: #000000; background-color: #ffffff;">
        <div bind:this={pdfContainerRef} class="pdf-export-container orga-canvas-a4" style="background-color: #ffffff; width: 794px; min-height: 1123px; position: relative;">
            {#each service.template.content_html?.fields || [] as field}
                    <div style="position: absolute; left: {field.x}px; top: {field.y}px; width: {field.w}px; height: {field.h}px; font-size: {field.style.fontSize}px; color: {field.style.color}; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px;">{#if field.type === 'text'}{@html service.replacePlaceholders(field.content, false)}{:else if field.type === 'logo'}{#if service.company?.logo}<img src={pb.files.getURL(service.company, service.company.logo)} style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Logo" crossorigin="anonymous" />{/if}{:else if field.type === 'table'}{@html service.getItemsHtml(field.tableConfig, false)}{/if}</div>
            {/each}
        </div>
    </div>
    {#if service.isInvoice && service.timesheetTemplate}
        <div style="position: fixed; left: -9999px; top: 0; z-index: -100; color: #000000; background-color: #ffffff;">
            <div bind:this={timesheetPdfContainerRef} class="pdf-export-container orga-canvas-a4" style="background-color: #ffffff; width: 794px; min-height: 1123px; position: relative;">
                {#each service.timesheetTemplate.content_html?.fields || [] as field}
                    <div style="position: absolute; left: {field.x}px; top: {field.y}px; width: {field.w}px; height: {field.h}px; font-size: {field.style.fontSize}px; color: {field.style.color}; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px;">{#if field.type === 'text'}{@html service.replacePlaceholders(field.content, true)}{:else if field.type === 'logo'}{#if service.company?.logo}<img src={pb.files.getURL(service.company, service.company.logo)} style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Logo" crossorigin="anonymous" />{/if}{:else if field.type === 'table'}{@html service.getItemsHtml(field.tableConfig, true)}{/if}</div>
                {/each}
            </div>
        </div>
    {/if}
{/if}