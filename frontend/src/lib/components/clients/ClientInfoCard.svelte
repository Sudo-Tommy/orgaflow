<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import ClientLinkInsuranceModal from "./ClientLinkInsuranceModal.svelte";
    import ClientBudgetModal from "./ClientBudgetModal.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { slide } from "svelte/transition";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    
    let { client } = $props<{ client: any }>();
    // svelte-ignore non_reactive_update
    let linkInsuranceModal: ReturnType<typeof ClientLinkInsuranceModal>;

    // svelte-ignore non_reactive_update
    let budgetModal: ReturnType<typeof ClientBudgetModal>;

    let currentYear = new Date().getFullYear();

    // --- DYNAMISCHE GESETZLICHE HÖCHSTBETRÄGE (basierend auf Pflegegrad) ---
    let careLevel = $derived(parseInt(client.level_of_care, 10) || 0);

    // Gemeinsamer Jahresbetrag (VHP)
    let annualMaxVHP = $derived(() => {
        if (careLevel >= 2 && careLevel <= 5) return 3539;
        return 0; // Kein Anspruch bei PG 1 oder 0/unbekannt
    });

    // Entlastungsleistungen
    let annualMaxEntlastung = $derived(() => {
        if (careLevel >= 1 && careLevel <= 5) return 1572; // 131 € * 12
        return 0; // Kein Anspruch bei PG 0/unbekannt
    });
    
    function calculateAppointmentCost(appointment: any, clientData: any): number {
        let appCost = 0;
        if (appointment.expand?.time_record) {
            for (const tr of appointment.expand.time_record) {
                if (tr.start && tr.end) {
                    const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                    if (diffMs > 0) appCost += (diffMs / 3600000) * (clientData.hourly_rate ?? 0);
                }
            }
        }
        if (appointment.expand?.drive_record) {
            for (const dr of appointment.expand.drive_record) {
                appCost += (dr.km ?? 0) * (clientData.km_rate ?? 0);
                appCost += (dr.lump_sum ?? 0);
            }
        }
        if (appointment.expand?.expenditures) {
            for (const exp of appointment.expand.expenditures) {
                appCost += (exp.sum ?? 0);
            }
        }
        return appCost;
    }

    // Reaktive Berechnung der genutzten Budgets aus Rechnungen und Terminen
    const usedBudgets = $derived((() => {
        let vhp = 0; // Gemeinsamer Jahresbetrag
        let elb = 0; // Entlastungsleistungen
        if (!client || !orgaStore.invoices?.data || !orgaStore.appointments?.data) return { usedGemeinsamerJahresbetrag: 0, usedEntlastungsleistungen: 0 };

        // 1. Kosten aus abgeschlossenen Rechnungen des aktuellen Jahres
        const clientInvoices = orgaStore.invoices.data.filter(inv => 
            (Array.isArray(inv.client) ? inv.client.includes(client.id) : inv.client === client.id) && 
            inv.status === 'Abgeschlossen' && 
            (inv.issue_date ? new Date(inv.issue_date).getFullYear() === currentYear : false)
        );

        for (const inv of clientInvoices) {
            let invoiceAssigned = false;
            const invoiceTaxRate = parseFloat(inv.tax_rate || '0'); // Steuersatz der Rechnung, 0 wenn nicht vorhanden

            for (const pos of (inv.table_positions || [])) {
                if (invoiceAssigned) break; // Nächste Rechnung prüfen, da diese schon zugewiesen wurde

                const title = pos.title?.toLowerCase() || '';

                // Zuordnung zum Gemeinsamen Jahresbetrag
                if (title.includes('verhinderungspflege') || title.includes('kurzzeitpflege')) {
                    vhp += inv.brutto || 0;
                    invoiceAssigned = true;
                }
                // Zuordnung zu Entlastungsleistungen
                else if (title.includes('entlastungsleistung') || title.includes('betreuungsleistung')) {
                    elb += inv.brutto || 0;
                    invoiceAssigned = true;
                }
            }

            // Fallback: Wenn keine Position explizit zugeordnet wurde, aber die Rechnung steuerfrei ist
            if (!invoiceAssigned && invoiceTaxRate === 0) {
                vhp += inv.brutto || 0;
            }
        }

        // 2. Kosten aus noch nicht abgerechneten Terminen des aktuellen Jahres
        const clientAppointments = orgaStore.appointments.data.filter(app => (Array.isArray(app.client) ? app.client.includes(client.id) : app.client === client.id) && !app.settled && app.appointment && new Date(app.appointment).getFullYear() === currentYear);
        for (const app of clientAppointments.filter(app => app.appointment)) { // Filter out appointments without a valid date
            const cost = calculateAppointmentCost(app, client);
            const tasks: string[] = app.expand?.tasks?.map((t: any) => t.title.toLowerCase()) || [];
            
            let appointmentAssigned = false;
            if (tasks.some(t => t.includes('verhinderungspflege') || t.includes('kurzzeitpflege'))) { // Priorisiere Verhinderungspflege
                vhp += cost;
                appointmentAssigned = true;
            }
            // Nur Entlastungsleistungen zuordnen, wenn nicht bereits der Verhinderungspflege zugeordnet
            else if (!appointmentAssigned && tasks.some(t => t.includes('entlastungsleistung') || t.includes('betreuungsleistung'))) {
                elb += cost;
            }
        }

        return { usedGemeinsamerJahresbetrag: vhp, usedEntlastungsleistungen: elb };
    })());

    let usedGemeinsamerJahresbetrag = $derived(usedBudgets.usedGemeinsamerJahresbetrag);
    let usedEntlastungsleistungen = $derived(usedBudgets.usedEntlastungsleistungen);

    // Warnhinweis, falls VHP-Budget bei falschem Pflegegrad genutzt wird
    let hasBudgetWarning = $derived(usedGemeinsamerJahresbetrag > 0 && annualMaxVHP() === 0);
    let warningText = $derived(`Für Pflegegrad ${careLevel} besteht kein Anspruch auf den Gemeinsamen Jahresbetrag. Die Kosten müssen ggf. privat getragen werden.`);

    // 30. Juni Regel: Prüft, ob das Restbudget des Vorjahres noch gültig ist. (Svelte 5: $derived.by)
    let previousYearRemainingBudget = $derived(() => {
        const today = new Date();
        const isAfterJune30 = today.getMonth() > 5 || (today.getMonth() === 5 && today.getDate() > 30);
        return isAfterJune30 ? 0 : (client.restbudget_vorjahr ?? 0);
    });

    let age = $derived(() => {
        if (!client.birthdate) return null; // Svelte 5: $derived.by
        try {
            const birthDate = new Date(client.birthdate);
            if (isNaN(birthDate.getTime())) return null;
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
            return calculatedAge;
        } catch { return null; } // Svelte 5: $derived.by
    });

    // Berechne die verbleibenden Budgets basierend auf den neuen gesetzlichen Höchstbeträgen
    let remainingVHP = $derived(Math.max(0, annualMaxVHP() - usedGemeinsamerJahresbetrag));
    let remainingEntlastung = $derived(Math.max(0, annualMaxEntlastung() - usedEntlastungsleistungen));

    // Aktuell verfügbares Gesamtbudget
    let totalAvailableBudget = $derived.by(() => {
        // Summiere alle verfügbaren Budgetkomponenten
        return remainingVHP + remainingEntlastung + previousYearRemainingBudget();
    });

    // Robuste Formatierung, um "Invalid Date" komplett zu verhindern
    function safeFormatDate(val: string) {
        if (!val) return '';
        const clean = val.trim().replace(' ', 'T');
        const d = new Date(clean);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}.${match[2]}.${match[1]}`;
        return val.split(' ')[0]; // Fallback
    }

    async function unlinkInsurance() {
        const insName = client.expand?.insurance?.name || "Krankenkasse";
        if (!(await confirmStore.ask(
            `Möchten Sie die Verknüpfung zu "${insName}" wirklich aufheben?`,
            "Krankenkasse trennen?",
            "Verknüpfung aufheben",
            "Abbrechen",
            true
        ))) return;

        try {
            await pb.collection('clients').update(client.id, { insurance: null });
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { 
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
                    requestKey: null 
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch {}
            }
            toastStore.success("Verknüpfung zur Krankenkasse aufgehoben.");
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Aufheben der Krankenkassen-Verknüpfung.");
        }
    }

    async function unlinkCaregiver() {
        const cgName = `${client.expand?.caregiver?.name_first || ''} ${client.expand?.caregiver?.name_last || ''}`.trim() || "gesetzliche Betreuung";
        if (!(await confirmStore.ask(
            `Möchten Sie die Verknüpfung zur gesetzlichen Betreuung ("${cgName}") von diesem Klienten trennen?`,
            "Betreuung trennen?",
            "Verknüpfung aufheben",
            "Abbrechen",
            true
        ))) return;

        try {
            await pb.collection('clients').update(client.id, { caregiver: null });
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { 
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
                    requestKey: null 
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch {}
            }
            toastStore.success("Verknüpfung zur gesetzlichen Betreuung aufgehoben.");
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Aufheben der Betreuungs-Verknüpfung.");
        }
    }
</script>

<div class="orga-card-white relative overflow-hidden group">
    <!-- Dekorativer Hintergrund-Blob -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 z-0"></div>
    
    <div class="p-6 md:p-8 relative z-10">
        <div class="flex items-center gap-4 mb-8 border-b border-neutral-100 pb-6">
            <div class="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-2xl shrink-0 shadow-inner">
                {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
            </div>
            <div>
                <h2 class="text-xl font-bold text-neutral-900">{client.name_first} {client.name_last}</h2>
                <p class="text-neutral-500 font-medium text-xs mt-1 tracking-wider uppercase">ID: {client.id}</p>
            </div>
        </div>

        <div class="space-y-6">
            {#if client.birthdate}
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🎂</span></div>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Geburtsdatum</p>
                        {#if age() !== null}<span class="text-xs font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">{age() ?? 0} Jahre</span>{/if}
                    </div>
                    <p class="text-neutral-900 font-bold">{safeFormatDate(client.birthdate)}</p>
                </div>
            </div>
            {/if}
            
            {#if client.level_of_care}
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">❤️</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Pflegegrad</p>
                    <p class="text-neutral-900 font-bold">Grad {client.level_of_care}</p>
                </div>
            </div>
            {/if}

            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">📞</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Telefon</p>
                    <p class="text-neutral-900 font-bold">{client.phone || 'Nicht hinterlegt'}</p>
                </div>
            </div>

            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">✉️</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">E-Mail</p>
                    <p class="text-neutral-900 font-bold break-all">{client.email || 'Nicht hinterlegt'}</p>
                </div>
            </div>

            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🏠</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Adresse</p>
                    <p class="text-neutral-900 font-bold leading-relaxed">{#if client.street || client.city}{client.street || ''} {client.housenr || ''}<br /> {client.zip || ''} {client.city || ''}{:else}Nicht hinterlegt{/if}</p>
                    {#if client.street || client.city}
                        <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${client.street || ''} ${client.housenr || ''}, ${client.zip || ''} ${client.city || ''}`)}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200 shadow-sm active:scale-95">
                            <span>🗺️</span> In Google Maps öffnen
                        </a>
                    {/if}
                </div>
            </div>
        </div>
        
        <div class="mt-6 pt-6 border-t border-neutral-100">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🛡️</span></div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Krankenkasse</p>
                        <div class="flex items-center gap-2">
                            {#if client.insurance || client.expand?.insurance}
                                <button type="button" onclick={unlinkInsurance} class="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors" title="Verknüpfung zur Krankenkasse aufheben">Trennen</button>
                                <span class="text-neutral-300">·</span>
                            {/if}
                            <button type="button" onclick={() => linkInsuranceModal?.open()} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Ändern</button>
                        </div>
                    </div>
                    <p class="text-neutral-900 font-bold truncate">{client.expand?.insurance?.name || 'Keine / Unbekannt'}</p>
                    {#if client.insurance_nr}
                        <p class="text-sm text-neutral-600 mt-1">Vers-Nr: <span class="font-mono bg-neutral-100 px-1 py-0.5 rounded">{client.insurance_nr}</span></p>
                    {/if}
                </div>
            </div>
        </div>

        {#if client.expand?.caregiver}
            <div class="mt-6 pt-6 border-t border-neutral-100">
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">⚖️</span></div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Gesetzl. Betreuung</p>
                            <button type="button" onclick={unlinkCaregiver} class="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors" title="Verknüpfung zur Betreuung aufheben">Trennen</button>
                        </div>
                        <p class="text-neutral-900 font-bold truncate">{client.expand.caregiver.name_first} {client.expand.caregiver.name_last}</p>
                        {#if client.expand.caregiver.phone}
                            <p class="text-sm text-neutral-600 mt-1">Tel: {client.expand.caregiver.phone}</p>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}

        <!-- Verhinderungspflege (§ 39 SGB XI) / Pflegeperson -->
        {#if client.inheritor_info?.name || client.expand?.inheritor}
            {@const info = client.inheritor_info || {}}
            <div class="mt-6 pt-6 border-t border-neutral-100">
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🤝</span></div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Antrag Verhinderungspflege</p>
                            {#if info.reason}
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">{info.reason}</span>
                            {/if}
                        </div>
                        <p class="text-neutral-900 font-bold">{info.name || 'Pflegeperson hinterlegt'} {#if info.relation}<span class="text-xs font-normal text-neutral-500">({info.relation})</span>{/if}</p>
                        {#if info.birthdate}
                            <p class="text-xs text-neutral-600 mt-0.5">🎂 Geb.: {safeFormatDate(info.birthdate)}</p>
                        {/if}
                        {#if info.address || info.street}
                            <p class="text-xs text-neutral-600 mt-0.5 truncate">🏠 {info.address || `${info.street || ''} ${info.housenr || ''}, ${info.zip || ''} ${info.city || ''}`}</p>
                        {/if}
                        {#if info.phone}
                            <p class="text-xs text-neutral-600 mt-0.5">📞 {info.phone}</p>
                        {/if}
                        {#if info.email}
                            <p class="text-xs text-neutral-600 mt-0.5">✉️ {info.email}</p>
                        {/if}
                        <div class="mt-2 flex flex-wrap gap-1.5">
                            {#if info.pre_care_fulfilled !== false}
                                <span class="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">✓ Vorpflegezeit ≥ 6 Mon.</span>
                            {/if}
                            <span class="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">{info.care_type === 'tageweise' ? 'Tageweise' : 'Stundenweise (< 8h)'}</span>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
        
        <div class="mt-6 pt-6 border-t border-neutral-100">
            <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Abrechnungskonditionen</p>
            <div class="grid grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                <div><p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Stundensatz</p><p class="text-sm font-bold text-neutral-900">{client.hourly_rate ?? 40} €</p></div>
                <div><p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Fahrtkosten</p><p class="text-sm font-bold text-neutral-900">{client.km_rate ?? 0.3} €/km</p></div>
                <div><p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Steuersatz</p><p class="text-sm font-bold text-neutral-900">{client.tax_rate != null ? client.tax_rate : '0'} %</p></div>
            </div>
        </div>
        
        {#if client.sign}
            <div class="pt-6 mt-6 border-t border-neutral-100">
                <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Unterschrift</p>
                <div class="bg-white rounded-xl border border-neutral-100 p-4 flex justify-center shadow-sm">
                    {#if client.sign.toLowerCase().endsWith('.pdf')}
                        <a href={pb.files.getURL(client, client.sign)} target="_blank" rel="noopener noreferrer" class="flex flex-col items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors">
                            <span class="text-3xl">📄</span>
                            <span class="text-xs font-bold">PDF öffnen</span>
                        </a>
                    {:else}
                        <img src={pb.files.getURL(client, client.sign)} alt="Unterschrift von {client.name_first}" class="max-h-24 object-contain bg-white rounded-lg p-1 safe-signature" />
                    {/if}
                </div>
            </div>
            {/if}
            <!-- Finanz- und Leistungsübersicht -->
            <div class="mt-6 pt-6 border-t border-neutral-100">
                <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Finanz- & Leistungsübersicht ({currentYear})</p>
            <div class="grid grid-cols-1 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                    {#if hasBudgetWarning}
                        <div transition:slide class="bg-amber-100 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs font-bold leading-relaxed shadow-sm">
                            <span class="font-black">⚠️ Achtung:</span> {warningText}
                        </div>
                    {/if}
                    <div class="flex items-center justify-between">
                        <p class="text-[10px] text-neutral-500 uppercase tracking-wider">Gemeinsamer Jahresbetrag (Rest)</p>
                        <p class="text-sm font-bold text-neutral-900">{remainingVHP.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    <div class="pl-4 text-xs text-neutral-400 font-medium">
                        ({annualMaxVHP().toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} abzgl. {usedGemeinsamerJahresbetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} genutzt)
                    </div>

                    <div class="flex items-center justify-between mt-2">
                        <p class="text-[10px] text-neutral-500 uppercase tracking-wider">Entlastungsleistungen (Rest)</p>
                        <p class="text-sm font-bold text-neutral-900">{remainingEntlastung.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                     <div class="pl-4 text-xs text-neutral-400 font-medium">
                        ({annualMaxEntlastung().toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} abzgl. {usedEntlastungsleistungen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} genutzt)
                    </div>
                {#if previousYearRemainingBudget() > 0}
                    <div transition:slide class="flex items-center justify-between mt-2">
                        <p class="text-[10px] text-neutral-500 uppercase tracking-wider">Restbudget Vorjahr</p>
                        <p class="text-sm font-bold text-neutral-900">{previousYearRemainingBudget().toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                {/if}
                <div class="mt-2 pt-2 border-t border-neutral-200">
                    <p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Verfügbares Gesamtbudget</p>
                    <p class="text-base font-bold text-brand-700">{Number(totalAvailableBudget).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                </div>
                </div>
                <p class="text-[10px] text-neutral-400 mt-2">
                    Die genutzten Beträge basieren auf abgeschlossenen Rechnungen und offenen Terminen. Das verfügbare Gesamtbudget berücksichtigt die gesetzl. Höchstbeträge.
                    {#if careLevel > 0}
                        (Gemeinsamer Jahresbetrag: {annualMaxVHP().toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}, Entlastungsleistungen: {annualMaxEntlastung().toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
                    {:else}
                        (für diesen Klienten ist kein Pflegegrad hinterlegt).
                    {/if}
                    Das Restbudget aus dem Vorjahr verfällt am 30.06.
                </p>
                <div class="mt-4 flex justify-end">
                    <button onclick={() => budgetModal?.open(client)} class="orga-button-ghost py-2 px-4 text-xs font-bold shadow-sm">Budget bearbeiten</button>
                </div>
            </div>
    </div>
    
</div>

<ClientLinkInsuranceModal bind:this={linkInsuranceModal} client={client} />
<ClientBudgetModal bind:this={budgetModal} usedGemeinsamerJahresbetrag={usedGemeinsamerJahresbetrag} usedEntlastungsleistungen={usedEntlastungsleistungen} />

<style>
    :global(.theme-negative) .safe-signature {
        filter: invert(1) hue-rotate(180deg);
    }
</style>