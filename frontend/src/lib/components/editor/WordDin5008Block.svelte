<script lang="ts">
    import type { WordBlock } from "./wordTypes";
    import { renderWithSampleData, htmlToWysiwyg } from "./wordVariables";

    let { 
        block = $bindable(), 
        isSelected, 
        isPreview = false,
        onFocus 
    } = $props<{
        block: WordBlock;
        isSelected: boolean;
        isPreview?: boolean;
        onFocus: () => void;
    }>();

    let returnAddress = $derived(block.din5008Config?.returnAddress ?? '{{company.return_address_line}}');
    let returnAddressFontSize = $derived(block.din5008Config?.returnAddressFontSize ?? 7);
    let bottomSpacing = $derived(block.din5008Config?.bottomSpacing ?? 32);
    let recipient = $derived(block.din5008Config?.recipient ?? '{{recipient.salutation}}\n{{recipient.name_first}} {{recipient.name_last}}\n{{recipient.street}} {{recipient.housenr}}\n{{recipient.zip}} {{recipient.city}}');
    let dateBlock = $derived(block.din5008Config?.infoDateBlock ?? 'Datum: {{date.today}}\nIhr Zeichen: {{client.insurance_nr}}\nUnser Zeichen: OF-{{current_year}}');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div 
    class="my-3 p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/20 transition-all" 
    style="margin-bottom: {bottomSpacing}mm;"
    onclick={onFocus} 
    role="region" 
    aria-label="DIN 5008 Briefkopf"
>
    <div class="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-700">
        <span class="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            ✉️ DIN 5008 Briefkopf-Bereich
        </span>
        <div class="flex items-center gap-2">
            <!-- Absender Schriftgröße -->
            <div class="flex items-center gap-1 bg-white dark:bg-neutral-800 rounded px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700">
                <span class="text-[10px] text-neutral-500 font-medium">Absender:</span>
                <select 
                    value={returnAddressFontSize}
                    onchange={(e) => {
                        if (!block.din5008Config) block.din5008Config = {};
                        block.din5008Config.returnAddressFontSize = parseFloat(e.currentTarget.value);
                    }}
                    class="bg-transparent text-[10px] font-bold text-violet-600 dark:text-violet-400 outline-none cursor-pointer"
                >
                    <option value={6}>6 pt</option>
                    <option value={6.5}>6,5 pt</option>
                    <option value={7}>7 pt (Standard)</option>
                    <option value={7.5}>7,5 pt</option>
                    <option value={8}>8 pt</option>
                    <option value={8.5}>8,5 pt</option>
                    <option value={9}>9 pt</option>
                    <option value={10}>10 pt</option>
                </select>
            </div>

            <!-- Abstand nach unten / zum Betreff -->
            <div class="flex items-center gap-1 bg-white dark:bg-neutral-800 rounded px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700">
                <span class="text-[10px] text-neutral-500 font-medium">Abstand unten:</span>
                <select 
                    value={bottomSpacing}
                    onchange={(e) => {
                        if (!block.din5008Config) block.din5008Config = {};
                        block.din5008Config.bottomSpacing = parseFloat(e.currentTarget.value);
                    }}
                    class="bg-transparent text-[10px] font-bold text-violet-600 dark:text-violet-400 outline-none cursor-pointer"
                    title="Abstand zwischen Adressfeld und Betreff ('weiter runter')"
                >
                    <option value={12}>12 mm (Kompakt)</option>
                    <option value={20}>20 mm (Mittel)</option>
                    <option value={26}>26 mm (Weit)</option>
                    <option value={32}>32 mm (DIN 5008 unter Falzmarke)</option>
                    <option value={38}>38 mm (Extra weit)</option>
                </select>
            </div>

            <span class="text-[10px] text-neutral-400 font-mono hidden sm:inline">{isPreview ? 'Vorschau' : 'Normgerechte Fensterzone'}</span>
        </div>
    </div>

    <!-- Anschriftfeld links & Datumsblock rechts -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Links: Rücksendezeile + Anschrift -->
        <div>
            <!-- Absenderzeile -->
            <div class="mb-1 text-neutral-500 underline decoration-neutral-300 truncate" style="font-size: {returnAddressFontSize}pt;">
                {#if isPreview}
                    <span>{renderWithSampleData(returnAddress)}</span>
                {:else}
                    <input 
                        type="text" 
                        bind:value={block.din5008Config!.returnAddress}
                        class="w-full bg-transparent border-0 p-0 text-neutral-500 outline-none underline"
                        style="font-size: {returnAddressFontSize}pt;"
                        placeholder="Musterfirma • Musterstraße 1 • 12345 Musterstadt"
                    />
                {/if}
            </div>

            <!-- Anschriftenfeld (85x45mm Zone) -->
            <div class="p-2 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900/60 min-h-24">
                {#if isPreview}
                    <div class="text-[10pt] text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-tight">
                        {@html renderWithSampleData(recipient)}
                    </div>
                {:else}
                    <textarea
                        bind:value={block.din5008Config!.recipient}
                        rows="4"
                        class="w-full bg-transparent text-[10pt] text-neutral-900 dark:text-neutral-100 outline-none resize-none leading-tight"
                        placeholder="Empfänger-Adresse / Variablen..."
                    ></textarea>
                {/if}
            </div>
        </div>

        <!-- Rechts: Datum & Bezugszeichen -->
        <div class="p-2 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900/60">
            {#if isPreview}
                <div class="text-[9pt] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {@html renderWithSampleData(dateBlock)}
                </div>
            {:else}
                <textarea
                    bind:value={block.din5008Config!.infoDateBlock}
                    rows="4"
                    class="w-full bg-transparent text-[9pt] text-neutral-700 dark:text-neutral-300 outline-none resize-none leading-relaxed"
                    placeholder="Datum / Aktenzeichen / Betreff..."
                ></textarea>
            {/if}
        </div>
    </div>
</div>
