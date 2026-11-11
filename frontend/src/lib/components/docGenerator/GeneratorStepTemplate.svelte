<script lang="ts">
    interface Props {
        service: any;
    }

    let { service }: Props = $props();

    let caregivers = $derived(
        Array.isArray(service.client?.expand?.caregiver)
            ? service.client.expand.caregiver
            : (service.client?.expand?.caregiver ? [service.client.expand.caregiver] : [])
    );
    let insurances = $derived(
        Array.isArray(service.client?.expand?.insurance)
            ? service.client.expand.insurance
            : (service.client?.expand?.insurance ? [service.client.expand.insurance] : [])
    );
    let contacts = $derived(service.client?.expand?.contacts || []);
    let homes = $derived([
        ...(service.client?.expand?.retirement_homes || []),
        ...(service.client?.expand?.nursing_homes || [])
    ]);
    let inheritors = $derived(
        Array.isArray(service.client?.expand?.inheritor)
            ? service.client.expand.inheritor
            : (service.client?.expand?.inheritor ? [service.client.expand.inheritor] : [])
    );

    function handleSelectTemplate(t: any) {
        service.applyTemplateRates?.(t.id);
    }
</script>

<div class="space-y-4">
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
            <label class="flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-colors {service.selectedTemplateId === t.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-500'}">
                <input type="radio" name="selectedTemplate" checked={service.selectedTemplateId === t.id} onchange={() => handleSelectTemplate(t)} class="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={t.title || 'Unbenannt'}>{t.title || 'Unbenannt'}</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-0.5 tracking-wider font-semibold truncate">{t.type}</p>
                </div>
            </label>
        {/each}
        {#if service.availableTemplates.length === 0}
            <p class="text-sm italic text-slate-500 dark:text-slate-400 py-4 text-center col-span-full">Keine Vorlagen für diesen Typ gefunden.</p>
        {/if}
    </div>

    {#if service.template && service.template.type?.toLowerCase() !== 'arbeitszeitnachweis'}
        <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-enter">
            <span class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Adressat / Empfänger auf dem Dokument</span>
            <div class="space-y-2">
                <label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input 
                        type="radio" 
                        name="doc-recipient" 
                        checked={service.recipientType === 'client'} 
                        onchange={() => { service.recipientType = 'client'; service.recipientId = service.client?.id || ''; }} 
                        class="text-indigo-600" 
                    />
                    <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Klient selbst ({service.client?.name_first} {service.client?.name_last})</span>
                </label>
                {#each caregivers as cg}
                    <label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input 
                            type="radio" 
                            name="doc-recipient" 
                            checked={service.recipientType === 'caregiver' && (service.recipientId === cg.id || !service.recipientId)} 
                            onchange={() => { service.recipientType = 'caregiver'; service.recipientId = cg.id; }} 
                            class="text-indigo-600" 
                        />
                        <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Gesetzl. Betreuung: {cg.name_first} {cg.name_last}{cg.company_name ? ` (${cg.company_name})` : ''}</span>
                    </label>
                {/each}
                {#each insurances as ins}
                    <label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input 
                            type="radio" 
                            name="doc-recipient" 
                            checked={service.recipientType === 'insurance' && (service.recipientId === ins.id || !service.recipientId)} 
                            onchange={() => { service.recipientType = 'insurance'; service.recipientId = ins.id; }} 
                            class="text-indigo-600" 
                        />
                        <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Krankenkasse ({ins.name}{ins.department ? ` - ${ins.department}` : ''})</span>
                    </label>
                {/each}
                {#each contacts as contact}
                    <label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input 
                            type="radio" 
                            name="doc-recipient" 
                            checked={service.recipientType === 'contact' && service.recipientId === contact.id} 
                            onchange={() => { service.recipientType = 'contact'; service.recipientId = contact.id; }} 
                            class="text-indigo-600" 
                        />
                        <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Kontakt: {contact.name_first} {contact.name_last} ({contact.company_name || contact.salutation || 'Kontakt'})</span>
                    </label>
                {/each}
                {#each homes as home}
                    <label class="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input 
                            type="radio" 
                            name="doc-recipient" 
                            checked={service.recipientType === 'home' && service.recipientId === home.id} 
                            onchange={() => { service.recipientType = 'home'; service.recipientId = home.id; }} 
                            class="text-indigo-600" 
                        />
                        <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Pflegeheim: {home.name}{home.addition ? ` (${home.addition})` : ''}</span>
                    </label>
                {/each}
                {#each inheritors as inheritor}
                    <label class="flex items-center gap-2 p-3 border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 rounded-lg cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/60">
                        <input 
                            type="radio" 
                            name="doc-recipient" 
                            checked={service.recipientType === 'inheritor' && (service.recipientId === inheritor.id || !service.recipientId)} 
                            onchange={() => { service.recipientType = 'inheritor'; service.recipientId = inheritor.id; }} 
                            class="text-teal-600" 
                        />
                        <span class="text-sm font-medium text-teal-900 dark:text-teal-200">Pflegeperson (Antrag Verhinderungspflege): {inheritor.name_first} {inheritor.name_last} ({inheritor.company_name || 'Pflegeperson'})</span>
                    </label>
                {/each}
            </div>
        </div>
    {/if}

    {#if service.template && (service.template.type?.toLowerCase() === 'antrag') && service.template.title?.toLowerCase().includes('verhinderung')}
        <div class="mt-6 pt-6 border-t border-teal-100 dark:border-teal-900/40 animate-enter">
            <div class="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl p-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-lg">📅</span>
                    <div>
                        <p class="text-sm font-bold text-teal-900 dark:text-teal-200">Zeitraum der Verhinderung</p>
                        <p class="text-xs text-teal-700 dark:text-teal-400">Wird als {'{{verhinderung.von}}'} und {'{{verhinderung.bis}}'} im Dokument eingesetzt</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="gen-verh-von" class="block text-xs font-bold text-teal-800 dark:text-teal-300 mb-1.5">Von</label>
                        <input
                            id="gen-verh-von"
                            type="date"
                            bind:value={service.verhinderungVon}
                            class="orga-input-clear py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label for="gen-verh-bis" class="block text-xs font-bold text-teal-800 dark:text-teal-300 mb-1.5">Bis</label>
                        <input
                            id="gen-verh-bis"
                            type="date"
                            bind:value={service.verhinderungBis}
                            class="orga-input-clear py-2 text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

