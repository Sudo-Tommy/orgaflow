<script lang="ts">
    import { isPartialAppointment, getParentInvoiceNumber } from "$lib/services/documentPartialAppointmentHelper";
    import { formatMoney } from "$lib/services/documentInvoiceCalculations";
    import { getRateBadge } from "$lib/services/documentGeneratorRateHelper";

    interface Props {
        service: any;
        allUsers: any[];
    }

    let { service, allUsers }: Props = $props();

    let wageBadge = $derived(getRateBadge('wage', service.hourlyWage, service.client, service.template));
    let kmBadge = $derived(getRateBadge('km', service.kmRate, service.client, service.template));
    let taxBadge = $derived(getRateBadge('tax', service.taxRate, service.client, service.template));

    function selectAll() {
        service.selectedAppointmentIds = service.availableAppointments.map((a: any) => a.id);
    }
    function deselectAll() {
        service.selectedAppointmentIds = [];
    }
</script>

<div class="space-y-4">
    <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">3. Termine &amp; Abrechnungsdaten</h3>
    
    {#if service.isCorrection}
        <div class="p-3.5 rounded-2xl bg-violet-50/90 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs mb-4 animate-enter">
            <div class="flex items-center gap-2 text-violet-900 dark:text-violet-200 font-bold mb-2">
                <span class="text-base">🔄</span>
                <span>Rechnungskorrektur für {service.originalInvoice?.invoice_nr || 'Alt-Rechnung'}</span>
            </div>
            <label class="flex items-center gap-2 cursor-pointer font-semibold text-violet-950 dark:text-violet-200 mb-2">
                <input type="checkbox" bind:checked={service.includeCorrectionNotice} class="w-4 h-4 text-violet-600 rounded" />
                <span>Korrektur-Hinweis auf der neuen Rechnung andrucken:</span>
            </label>
            {#if service.includeCorrectionNotice}
                <input 
                    type="text" 
                    bind:value={service.correctionNotice} 
                    class="orga-input-clear py-2 text-xs bg-white dark:bg-slate-900" 
                    placeholder="z.B. Korrektur zu Rechnung..." 
                />
            {/if}
        </div>
    {/if}

    {#if service.isInvoice}
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
                <label for="gen-invoice-nr" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rechnungsnummer</label>
                <input id="gen-invoice-nr" type="text" bind:value={service.manualInvoiceNr} class="orga-input-clear py-2 text-sm" placeholder="z.B. 01/2026" />
                {#if service.isInvoiceNrDuplicate}
                    <p class="text-[10px] text-rose-600 font-bold mt-1 leading-tight">⚠️ Nummer bereits vergeben!</p>
                {/if}
            </div>
            <div>
                <label for="gen-issue-date" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rechnungsdatum</label>
                <input id="gen-issue-date" type="date" bind:value={service.manualIssueDate} class="orga-input-clear py-2 text-sm" />
            </div>
        </div>
        <hr class="border-slate-100 dark:border-slate-800 mb-6" />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
            <div>
                <div class="flex items-center justify-between gap-1 mb-1">
                    <label for="gen-wage" class="block text-xs font-semibold text-slate-600 dark:text-slate-400">Stundensatz (€)</label>
                    <span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold border {wageBadge.cls}">{wageBadge.text}</span>
                </div>
                <input id="gen-wage" type="number" step="0.5" bind:value={service.hourlyWage} class="orga-input-clear py-2 text-sm" />
            </div>
            <div>
                <div class="flex items-center justify-between gap-1 mb-1">
                    <label for="gen-km" class="block text-xs font-semibold text-slate-600 dark:text-slate-400">Fahrt (€/km)</label>
                    <span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold border {kmBadge.cls}">{kmBadge.text}</span>
                </div>
                <input id="gen-km" type="number" step="0.01" bind:value={service.kmRate} class="orga-input-clear py-2 text-sm" />
            </div>
            <div>
                <div class="flex items-center justify-between gap-1 mb-1">
                    <label for="gen-tax" class="block text-xs font-semibold text-slate-600 dark:text-slate-400">Steuersatz (%)</label>
                    <span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold border {taxBadge.cls}">{taxBadge.text}</span>
                </div>
                <select id="gen-tax" bind:value={service.taxRate} class="orga-input-clear py-2 text-sm px-2 cursor-pointer">
                    <option value="0">0%</option>
                    <option value="7">7%</option>
                    <option value="19">19%</option>
                </select>
            </div>
        </div>

        {#if service.ratesDifferFromClient && service.client}
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 mb-6 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs animate-enter">
                <div class="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <span class="text-base shrink-0">💡</span>
                    <span>Werte weichen von der Klientenakte ab.</span>
                </div>
                <button
                    type="button"
                    onclick={() => service.saveRatesToClient()}
                    disabled={service.isSavingRates}
                    class="min-h-[36px] px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
                >
                    <span>💾</span>
                    <span>{service.isSavingRates ? 'Speichert...' : 'In Klientenakte speichern'}</span>
                </button>
            </div>
        {:else}
            <div class="mb-6 pb-2 border-b border-slate-100 dark:border-slate-800"></div>
        {/if}
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-3">
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Abzurechnende Termine wählen</p>
            {#if service.availableAppointments.length > 0}
                <div class="flex items-center gap-2 text-xs">
                    <button type="button" onclick={selectAll} class="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer min-h-[32px] px-1">Alle wählen</button>
                    <span class="text-slate-300 dark:text-slate-600">|</span>
                    <button type="button" onclick={deselectAll} class="text-slate-500 hover:underline cursor-pointer min-h-[32px] px-1">Keine</button>
                </div>
            {/if}
        </div>
        <label class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" bind:checked={service.showBilledAppointments} class="text-indigo-600 rounded border-slate-300 dark:border-slate-600" />
            Bereits abgerechnete einblenden
        </label>
    </div>

    <!-- Termine Liste: natural flow ohne innere Scrollbox -->
    <div class="space-y-2">
        {#each service.availableAppointments as app}
            {@const isPartial = isPartialAppointment(app)}
            {@const parentNr = getParentInvoiceNumber(app)}
            <label class="flex items-start gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer {isPartial ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/25 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60'} hover:border-indigo-300 dark:hover:border-indigo-500 {service.selectedAppointmentIds.includes(app.id) ? 'ring-2 ring-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/30' : ''}">
                <input type="checkbox" bind:group={service.selectedAppointmentIds} value={app.id} class="w-4 h-4 mt-1 text-indigo-600 rounded focus:ring-indigo-500" />
                <div class="flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {app.appointment ? new Date(app.appointment as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} - {app.description || 'Termin'}
                        </p>
                        {#if isPartial}
                            <span class="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-full font-extrabold whitespace-nowrap shadow-xs">
                                ⚖️ Teilforderung {parentNr ? `aus Rg. ${parentNr}` : ''}
                            </span>
                        {/if}
                        {#if app.status === 'abgesagt'}
                            <span class="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">🚫 Abgesagt</span>
                        {/if}
                        {#if app.settled}
                            <span class="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">✓ Abgerechnet</span>
                        {/if}
                    </div>

                    {#if isPartial}
                        <div class="mt-2 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/90 dark:border-amber-800/70 flex flex-wrap items-center gap-3 text-xs">
                            <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <span>Ursprünglich:</span>
                                <span class="font-semibold text-slate-700 dark:text-slate-200">{formatMoney(app.original_amount || 0)} €</span>
                            </div>
                            <span class="text-slate-300 dark:text-slate-600">•</span>
                            <div class="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                <span>Bereits bezahlt:</span>
                                <span class="font-bold">- {formatMoney(app.already_paid_amount || 0)} €</span>
                            </div>
                            <span class="text-slate-300 dark:text-slate-600">•</span>
                            <div class="flex items-center gap-1 text-amber-800 dark:text-amber-300 font-bold">
                                <span>Offener Restbetrag:</span>
                                <span class="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">{formatMoney(app.remaining_amount || 0)} €</span>
                            </div>
                        </div>
                    {:else}
                        <div class="flex gap-2 mt-1">
                            {#if app.expand?.time_record}<span class="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-bold">Zeiten</span>{/if}
                            {#if app.expand?.drive_record}<span class="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded font-bold">Fahrten</span>{/if}
                            {#if app.expand?.expenditures}<span class="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded font-bold">Ausgaben</span>{/if}
                        </div>
                    {/if}
                </div>
            </label>
        {/each}
        {#if service.availableAppointments.length === 0}
            <div class="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <span class="text-base shrink-0">⚠️</span>
                    <div>
                        <p class="font-bold">Keine offenen Termine mit Zeiterfassung vorhanden.</p>
                        {#if !service.showBilledAppointments && (service.settledAppointmentsCount ?? 0) > 0}
                            <p class="mt-0.5 text-amber-700 dark:text-amber-300">
                                Es gibt <strong>{service.settledAppointmentsCount} bereits abgerechnete Termine</strong> für diesen Klienten.
                            </p>
                        {/if}
                    </div>
                </div>
                {#if !service.showBilledAppointments && (service.settledAppointmentsCount ?? 0) > 0}
                    <button 
                        type="button" 
                        onclick={() => { service.showBilledAppointments = true; }} 
                        class="min-h-[44px] px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition-colors cursor-pointer"
                    >
                        ✓ Bereits abgerechnete Termine einblenden
                    </button>
                {/if}
            </div>
        {/if}
    </div>
</div>
