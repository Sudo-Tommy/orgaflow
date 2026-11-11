<script lang="ts">
    import type { ClientFormData } from "../types";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { autoGrow } from "$lib/actions/autoGrow";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { sortTemplatesAlphabetically } from "$lib/services/documentGeneratorRateHelper";
    import { BILLING_TYPE_OPTIONS, getBillingTypeDef, findMatchingTemplateForBillingType } from "$lib/services/clientBillingService";
    import { Banknote, FileText, Maximize2, RotateCcw, Upload, FileSignature } from "lucide-svelte";

    interface Props {
        formData: ClientFormData;
        isOwner: boolean;
        isLoading: boolean;
        signatureBlob: Blob | null;
        signatureDataUrl: string;
        signatureFile: File | null;
        onOpenFullscreenSignature: () => void;
        onClearSignature: () => void;
        onFileSelected: (file: File | null) => void;
    }

    let { 
        formData = $bindable(), 
        isOwner, 
        isLoading, 
        signatureBlob, 
        signatureDataUrl, 
        signatureFile, 
        onOpenFullscreenSignature, 
        onClearSignature, 
        onFileSelected 
    }: Props = $props();

    let signatureMode = $state<"draw" | "upload">("draw");

    import { sortAlphabetical, sortSelectOptions } from "$lib/utils/sortHelper";

    let invoiceTemplates = $derived(
        sortTemplatesAlphabetically(
            (orgaStore.document_templates?.data || []).filter(t => (t.type || '').toLowerCase() === 'rechnung')
        )
    );

    let sortedCompanies = $derived(sortAlphabetical(orgaStore.company?.data || [], (c: any) => c.name || ''));
    let sortedBillingTypes = $derived(sortSelectOptions(BILLING_TYPE_OPTIONS, 'label'));

    function handleFileInput(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            onFileSelected(target.files[0]);
        } else {
            onFileSelected(null);
        }
    }

    function handleBillingTypeChange(newType: string) {
        formData.billing_type = newType;
        const def = getBillingTypeDef(newType);
        if (def) {
            formData.tax_rate = def.defaultTaxRate.toString();
            const matched = findMatchingTemplateForBillingType(newType, invoiceTemplates);
            if (matched) {
                formData.templates = matched.id;
            }
        }
    }
</script>

<div class="space-y-6 animate-enter">
    {#if rbacService.canAccessFinances}
        <!-- ABRECHNUNGSKONDITIONEN -->
        <div>
            <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Banknote class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Abrechnungskonditionen & Zuordnung</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label for="new-wage" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Stundensatz (€)</label>
                    <input id="new-wage" type="number" step="0.01" bind:value={formData.hourly_wage} class="orga-input-clear min-h-[44px] py-2 text-sm font-bold" disabled={isLoading} />
                </div>
                <div>
                    <label for="new-km" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Fahrtkosten (€/km)</label>
                    <input id="new-km" type="number" step="0.01" bind:value={formData.km_rate} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                </div>
                <div>
                    <label for="new-tax" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Umsatzsteuer (%)</label>
                    <select id="new-tax" bind:value={formData.tax_rate} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                        <option value="0">0% (Befreit nach § 4 Nr. 16 UStG)</option>
                        <option value="7">7% ermäßigt</option>
                        <option value="19">19% Regelsteuersatz</option>
                    </select>
                </div>

                <div class="sm:col-span-2">
                    <label for="new-billing-type" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                        <span>Standard-Abrechnungsart</span>
                        {#if formData.billing_type}
                            {@const def = getBillingTypeDef(formData.billing_type)}
                            {#if def}
                                <span class="text-[10px] px-2 py-0.5 rounded-full font-black {def.badgeClass}">
                                    {def.shortLabel}
                                </span>
                            {/if}
                        {/if}
                    </label>
                    <select 
                        id="new-billing-type" 
                        value={formData.billing_type} 
                        onchange={(e) => handleBillingTypeChange((e.target as HTMLSelectElement).value)}
                        class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" 
                        disabled={isLoading}
                    >
                        <option value="">Keine Abrechnungsart ausgewählt</option>
                        {#each sortedBillingTypes as opt (opt.id)}
                            <option value={opt.id}>{opt.label}</option>
                        {/each}
                    </select>
                </div>

                <div class="sm:col-span-2">
                    <label for="new-company" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Zugehörige Firma</label>
                    <select id="new-company" bind:value={formData.company} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading || !isOwner}>
                        {#if isOwner}<option value="">Bitte Firma auswählen...</option>{/if}
                        {#each sortedCompanies as comp (comp.id)}
                            <option value={comp.id}>{comp.name} ({comp.city || "Hauptsitz"})</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label for="new-template" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Standard-Rechnungsart</label>
                    <select id="new-template" bind:value={formData.templates} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                        <option value="">Keine Standard-Rechnungsart zugewiesen</option>
                        {#each invoiceTemplates as t (t.id)}
                            <option value={t.id}>{t.title}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>
    {/if}

    <!-- INTERNE NOTIZEN -->
    <div class="{rbacService.canAccessFinances ? 'pt-5 border-t border-slate-100 dark:border-slate-800' : ''}">
        <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Interne Notizen & Besonderheiten</span>
        </h3>
        <textarea 
            id="new-notes" 
            bind:value={formData.notes} 
            use:autoGrow
            rows="3" 
            class="orga-input-clear py-2.5 text-sm auto-grow" 
            placeholder="Wichtige Hinweise, Krankheitsbilder, Vorlieben oder Aufgaben..." 
            disabled={isLoading}
        ></textarea>
    </div>

    <!-- DIGITALE UNTERSCHRIFT -->
    <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <FileSignature class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Digitale Unterschrift (Optional)</span>
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Direkt digital erfassen oder als Dokumentdatei hochladen</p>
            </div>
            <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <button type="button" onclick={() => signatureMode = "draw"} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer {signatureMode === 'draw' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">Zeichnen</button>
                <button type="button" onclick={() => signatureMode = "upload"} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer {signatureMode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">Datei</button>
            </div>
        </div>

        {#if signatureMode === "draw"}
            <div class="relative bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden p-4 min-h-[160px] flex flex-col items-center justify-center">
                {#if signatureDataUrl}
                    <img src={signatureDataUrl} alt="Erfasste Unterschrift" class="max-h-36 max-w-full object-contain mb-2" />
                    <div class="flex items-center gap-2">
                        <button type="button" onclick={onOpenFullscreenSignature} class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer">
                            <Maximize2 class="w-3.5 h-3.5" />
                            <span>Neu zeichnen (Vollbild)</span>
                        </button>
                        <button type="button" onclick={onClearSignature} class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-rose-600 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer">
                            <RotateCcw class="w-3.5 h-3.5" />
                            <span>Entfernen</span>
                        </button>
                    </div>
                {:else}
                    <div class="text-center py-6">
                        <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Noch keine Unterschrift erfasst.</p>
                        <button type="button" onclick={onOpenFullscreenSignature} class="orga-button-primary min-h-[44px] px-4 py-2 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20">
                            <Maximize2 class="w-4 h-4" />
                            <span>Unterschriftsfeld im Vollbild öffnen</span>
                        </button>
                    </div>
                {/if}
            </div>
        {:else}
            <div class="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    class="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 transition-colors cursor-pointer" 
                    onchange={handleFileInput} 
                />
                {#if signatureFile}
                    <p class="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                        Ausgewählt: {signatureFile.name} ({(signatureFile.size / 1024).toFixed(1)} KB)
                    </p>
                {/if}
            </div>
        {/if}
    </div>
</div>
