<script lang="ts">
    interface Props {
        service: any;
        allUsers: any[];
    }

    let { service, allUsers }: Props = $props();
</script>

<div class="space-y-4">
    <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Zusammenfassung</h3>
    
    <div class="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
        {#if service.onBehalfOfUserId}
            <p class="text-sm">
                <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Erstellt für:</span> 
                <span class="font-bold text-amber-800 dark:text-amber-300">👤 {allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_first} {allUsers.find(u => u.id === service.onBehalfOfUserId)?.name_last}</span>
            </p>
        {/if}
        <p class="text-sm">
            <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Vorlage:</span> 
            <span class="font-bold text-slate-900 dark:text-slate-100">{service.template?.title}</span>
        </p>
        <p class="text-sm">
            <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Empfänger:</span> 
            <span class="font-bold text-slate-900 dark:text-slate-100">{service.recipientSummary || (service.recipientType === 'inheritor' ? 'Pflegeperson (Antrag Verhinderungspflege)' : service.recipientType)}</span>
        </p>

        <!-- Assistent (für dieses Dokument) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm pt-1 border-t border-slate-200/70 dark:border-slate-700/70">
            <div class="flex items-center gap-2">
                <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Assistent:</span>
                {#if service.assistantUser}
                    <span class="font-bold text-indigo-700 dark:text-indigo-300">
                        🤝 {service.assistantUser.name_first} {service.assistantUser.name_last}
                    </span>
                {:else}
                    <span class="font-bold text-amber-600 dark:text-amber-400">
                        Kein Assistent
                    </span>
                {/if}
            </div>
            <select
                aria-label="Assistent für dieses Dokument ändern"
                bind:value={service.selectedAssistantId}
                class="text-xs py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium cursor-pointer max-w-xs"
            >
                <option value="">Kein Assistent (leer lassen)</option>
                {#each allUsers.filter(u => u.role !== 'client') as emp}
                    <option value={emp.id}>{emp.name_last}, {emp.name_first} ({emp.role === 'employee' ? 'Assistent' : emp.role})</option>
                {/each}
            </select>
        </div>

        {#if service.isInvoice && service.invoiceData}
            <hr class="border-slate-200 dark:border-slate-700 my-2" />
            <p class="text-sm">
                <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Rechnung:</span> 
                <span class="font-bold {service.isInvoiceNrDuplicate ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}">{service.invoiceData.invoice_nr}</span>
            </p>
            {#if service.isInvoiceNrDuplicate}
                <p class="text-xs text-rose-600 dark:text-rose-400 font-bold mb-1">⚠️ Diese Rechnungsnummer existiert bereits im System!</p>
            {/if}
            <p class="text-sm">
                <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Posten:</span> 
                <span class="font-bold text-slate-900 dark:text-slate-100">{service.invoiceData.positions.length} Stück</span>
            </p>
            <p class="text-sm mt-2">
                <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 inline-block">Gesamt Brutto:</span> 
                <span class="font-bold text-indigo-700 dark:text-indigo-400 text-lg">{service.invoiceData.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </p>
        {/if}
    </div>

    {#if !service.assistantUser}
        <div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <span class="text-base shrink-0">⚠️</span>
            <div>
                <p class="font-bold">Diesem Klienten ist noch kein Assistent zugewiesen.</p>
                <p class="mt-0.5 text-amber-700 dark:text-amber-300">Platzhalter für den Assistenten bleiben in diesem Dokument leer. Sie können oben bei Bedarf direkt einen Mitarbeiter auswählen.</p>
            </div>
        </div>
    {/if}

    <div class="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl flex items-start gap-3">
        <span class="text-xl">📄</span>
        <p class="text-sm text-indigo-900 dark:text-indigo-200">Das Dokument wird nun hochauflösend als PDF generiert. Dies kann wenige Sekunden dauern.</p>
    </div>
</div>
