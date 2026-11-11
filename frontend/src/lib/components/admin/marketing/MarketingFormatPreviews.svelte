<script lang="ts">
    import { Copy } from 'lucide-svelte';
    import FlyerGenerator from '../FlyerGenerator.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { triggerHaptic } from '$lib/services/hapticFeedback';
    import type { MarketingFormat } from './marketingDefaults';

    interface Props {
        activeFormat: MarketingFormat;
        formatData: any;
        flyerSheets: any[];
    }

    let { activeFormat, formatData, flyerSheets = $bindable([]) }: Props = $props();

    async function copySocialText(item: any) {
        triggerHaptic('tap');
        const fullText = `${item.hook}\n\n${item.text}\n\n${item.cta}\n\n${item.hashtags}`;
        await navigator.clipboard.writeText(fullText);
        toastStore.success("Social-Media-Text in die Zwischenablage kopiert!");
    }
</script>

<div class="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 overflow-hidden print:p-0 print:m-0 print:border-none print:shadow-none print:bg-transparent print:overflow-visible">
    <!-- 1. PLAKAT / AUSHANG (DIN A4) -->
    {#if activeFormat === 'poster'}
        <div class="max-w-[210mm] mx-auto bg-white border border-neutral-300 p-8 sm:p-12 shadow-lg rounded-xl print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:h-full">
            <div class="text-center pb-8 border-b-2 border-amber-500">
                <span class="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Offizielle Seniorenassistenz</span>
                <h1 class="text-2xl sm:text-4xl font-extrabold text-neutral-900 mt-4 leading-tight">{formatData.poster.headline}</h1>
                <p class="text-base sm:text-lg text-neutral-600 font-medium mt-2">{formatData.poster.subheadline}</p>
            </div>

            <div class="py-8 space-y-4">
                <h2 class="text-sm font-bold uppercase tracking-wider text-neutral-500">Unsere Leistungen für Sie:</h2>
                <div class="grid grid-cols-1 gap-3">
                    {#each formatData.poster.bulletpoints as bp}
                        <div class="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                            <span class="text-lg">✅</span>
                            <span class="text-sm sm:text-base font-bold text-neutral-800">{bp}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="bg-indigo-900 text-white p-6 rounded-2xl text-center shadow-md my-6 print:bg-indigo-900 print:text-white">
                <p class="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-1">Pflegekassen-Vorteil</p>
                <p class="text-lg sm:text-xl font-black">{formatData.poster.highlight_box}</p>
            </div>

            <div class="text-center pt-6 border-t border-neutral-200">
                <p class="text-sm font-bold text-neutral-900">{formatData.poster.cta}</p>
                <div class="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200 font-mono text-xs sm:text-sm text-amber-950 whitespace-pre-line font-bold">
                    {formatData.poster.contacts}
                </div>
            </div>
        </div>

    <!-- 2. FLYER (Wickelfalz DIN Lang 6 Seiten) -->
    {:else if activeFormat === 'flyer'}
        <div class="w-full">
            <FlyerGenerator bind:sheets={flyerSheets} />
        </div>

    <!-- 3. SOCIAL-MEDIA SHEET -->
    {:else if activeFormat === 'social_sheet'}
        <div class="space-y-6 max-w-3xl mx-auto">
            <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                💡 <strong>Social-Media-Vorlagen:</strong> Nutzen Sie den Kopier-Button, um die fertigen Texte direkt in Instagram, Facebook oder den WhatsApp-Unternehmensstatus einzufügen.
            </div>

            {#each formatData.social_sheet as item}
                <div class="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-sm">
                    <div class="flex items-center justify-between pb-3 border-b border-neutral-200">
                        <span class="font-bold text-xs uppercase tracking-wider text-indigo-900">{item.platform}</span>
                        <button 
                            type="button" 
                            onclick={() => copySocialText(item)}
                            class="orga-button-primary text-xs py-1.5 px-3 flex items-center gap-1 min-h-[36px] cursor-pointer touch-manipulation active:scale-95"
                        >
                            <Copy class="w-3.5 h-3.5" />
                            <span>Text kopieren</span>
                        </button>
                    </div>
                    <div>
                        <span class="text-[11px] font-bold text-neutral-500 uppercase">Hookline / Überschrift</span>
                        <p class="text-sm font-bold text-neutral-900 mt-0.5">{item.hook}</p>
                    </div>
                    <div>
                        <span class="text-[11px] font-bold text-neutral-500 uppercase">Beitragstext</span>
                        <p class="text-xs text-neutral-700 whitespace-pre-line mt-0.5 leading-relaxed">{item.text}</p>
                    </div>
                    <div>
                        <span class="text-[11px] font-bold text-neutral-500 uppercase">Call To Action</span>
                        <p class="text-xs font-semibold text-amber-700 mt-0.5">{item.cta}</p>
                    </div>
                    <div class="text-[11px] text-indigo-600 font-mono">
                        {item.hashtags}
                    </div>
                </div>
            {/each}
        </div>

    <!-- 4. BEILEGER / POSTKARTE (DIN A6) -->
    {:else if activeFormat === 'insert'}
        <div class="max-w-[148mm] mx-auto bg-white border-2 border-indigo-900 p-8 rounded-2xl shadow-md print:border-indigo-900 print:shadow-none print:m-0">
            <div class="text-center pb-4 border-b border-neutral-200">
                <span class="text-xs font-bold text-indigo-600 uppercase tracking-widest">Seniorenassistenz Jenzsch</span>
                <h2 class="text-xl font-bold text-neutral-900 mt-1">{formatData.insert.title}</h2>
                <p class="text-xs text-neutral-600 mt-1">{formatData.insert.subtitle}</p>
            </div>
            <div class="py-6 space-y-2">
                {#each formatData.insert.benefits as b}
                    <div class="text-xs font-semibold text-neutral-800 flex items-center gap-2">
                        <span>✨</span> <span>{b}</span>
                    </div>
                {/each}
            </div>
            <div class="pt-4 border-t border-neutral-200 text-center text-[10px] text-neutral-500 font-medium">
                {formatData.insert.footer}
            </div>
        </div>

    <!-- 5. INFOBLATT (DIN A4) -->
    {:else if activeFormat === 'factsheet'}
        <div class="max-w-[210mm] mx-auto bg-white border border-neutral-300 p-8 sm:p-12 shadow-lg rounded-xl print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none">
            <div class="flex items-center justify-between pb-6 border-b-2 border-indigo-600">
                <div>
                    <h1 class="text-xl sm:text-2xl font-black text-neutral-900">{formatData.factsheet.title}</h1>
                    <p class="text-xs text-neutral-500 mt-1">Information für Klienten, Angehörige & Betreuer</p>
                </div>
                <div class="text-right text-xs font-bold text-indigo-900">
                    Seniorenassistenz Jenzsch<br>
                    Halle & Wittenberg
                </div>
            </div>

            <div class="py-6 space-y-6 text-xs sm:text-sm leading-relaxed text-neutral-800">
                <div>
                    <h3 class="font-bold text-base text-indigo-950 mb-1">{formatData.factsheet.section1_title}</h3>
                    <p>{formatData.factsheet.section1_text}</p>
                </div>
                <div>
                    <h3 class="font-bold text-base text-indigo-950 mb-2">{formatData.factsheet.section2_title}</h3>
                    <ul class="list-disc pl-5 space-y-1">
                        {#each formatData.factsheet.section2_items as it}
                            <li>{it}</li>
                        {/each}
                    </ul>
                </div>
                <div>
                    <h3 class="font-bold text-base text-indigo-950 mb-1">{formatData.factsheet.section3_title}</h3>
                    <p>{formatData.factsheet.section3_text}</p>
                </div>
            </div>

            <div class="pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
                Seniorenassistenz Jenzsch · Dreyhauptstr. 2, 06108 Halle (Saale) · Tel: 0345 / 213 895 20 · info@ihre-seniorenassistenz.com
            </div>
        </div>

    <!-- 6. GUTSCHEIN-KARTE -->
    {:else if activeFormat === 'voucher'}
        <div class="max-w-lg mx-auto bg-linear-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-400 p-8 rounded-3xl text-center shadow-md relative overflow-hidden print:border-amber-400 print:shadow-none print:m-0">
            <div class="text-xs font-black uppercase tracking-widest text-amber-800 mb-2">🎁 Einladung zum Kennenlernen</div>
            <h2 class="text-2xl font-black text-neutral-900 mb-2">{formatData.voucher.title}</h2>
            <div class="inline-block bg-amber-500 text-white font-black text-sm px-4 py-1.5 rounded-full my-3 shadow-md">
                {formatData.voucher.value}
            </div>
            <p class="text-xs text-neutral-700 leading-relaxed max-w-sm mx-auto mb-6">
                {formatData.voucher.description}
            </p>
            <div class="p-3 bg-white rounded-xl border border-amber-300 font-mono font-bold text-sm text-neutral-900 tracking-wider">
                {formatData.voucher.code}
            </div>
            <p class="text-[10px] text-neutral-500 mt-4">{formatData.voucher.validity}</p>
        </div>
    {/if}
</div>
