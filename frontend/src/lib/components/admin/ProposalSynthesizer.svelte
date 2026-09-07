<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { generateSammelAuftragBriefing, type ProposalSynthesizerRecord } from '$lib/utils/synthesizer';
    import { Copy, Check, FileText, X, Download, Eye, Layers, Save } from 'lucide-svelte';

    interface Props {
        selectedIds: string[];
        onClearSelection: () => void;
    }

    let { selectedIds, onClearSelection }: Props = $props();

    // Reaktiver State für UI-Feedback & Double-Submission-Schutz
    let isProcessing = $state(false);
    let synthesisResult = $state("");
    let copySuccess = $state(false);
    let downloadSuccess = $state(false);
    let isSavingToPrompts = $state(false);
    let saveSuccess = $state(false);
    let isPreviewOpen = $state(false);

    // Derived State für die UI-Steuerung
    let selectionCount = $derived(selectedIds.length);

    async function generateSammelAuftrag() {
        if (isProcessing || selectionCount === 0) return;
        isProcessing = true; // Double-Submission-Schutz aktivieren

        try {
            // Abfrage der ausgewählten Vorschläge aus PocketBase
            const filterQuery = (selectedIds || []).map((id: string) => `id="${id}"`).join(' || ');
            let records: ProposalSynthesizerRecord[] = [];

            try {
                records = await pb.collection('improvement_proposals').getFullList<any>({
                    filter: filterQuery,
                    sort: '-created',
                    requestKey: null
                });
            } catch (err) {
                try {
                    records = await pb.collection('proposals').getFullList<any>({
                        filter: filterQuery,
                        sort: '-created',
                        requestKey: null
                    });
                } catch {
                    // Fallback aus lokalem Cache / proposalService
                    records = (proposalService.proposals || []).filter(p => selectedIds.includes(p.id)) as any[];
                }
            }

            // Falls PB leer ist oder Teilergebnisse fehlen, ergänze aus proposalService
            if (records.length < selectedIds.length && proposalService.proposals.length > 0) {
                const existingIds = new Set(records.map(r => r.id));
                const missing = proposalService.proposals.filter(p => selectedIds.includes(p.id) && !existingIds.has(p.id));
                records = [...records, ...missing as any[]];
            }

            // Generierung des strukturierten "Mega-Briefings"
            synthesisResult = generateSammelAuftragBriefing(records);
        } catch (error) {
            console.error("Synthese-Fehler:", error);
        } finally {
            isProcessing = false; // Schutz wieder aufheben
        }
    }

    async function copyToClipboard() {
        if (!synthesisResult) return;
        try {
            await navigator.clipboard.writeText(synthesisResult);
            copySuccess = true;
            setTimeout(() => { copySuccess = false; }, 3000);
        } catch (e) {
            console.error("Clipboard-Kopierfehler:", e);
        }
    }

    function downloadMarkdownFile() {
        if (!synthesisResult) return;
        try {
            const blob = new Blob([synthesisResult], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const todayStr = new Date().toISOString().split('T')[0];
            link.href = url;
            link.setAttribute('download', `Sammel-Arbeitsauftrag_${todayStr}_${recordsCount()}-Vorgaenge.md`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            downloadSuccess = true;
            setTimeout(() => { downloadSuccess = false; }, 2500);
        } catch (e) {
            console.error("Download-Fehler:", e);
        }
    }

    async function saveAsSystemPrompt() {
        if (!synthesisResult || isSavingToPrompts) return;
        isSavingToPrompts = true;
        try {
            const currentYear = new Date().getFullYear();
            const d = new Date();
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const kwNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            const kwTag = `${currentYear}-W${String(kwNo).padStart(2, '0')}-Sammel-${Date.now().toString().slice(-4)}`;
            const title = `Sammel-Arbeitsauftrag (${selectedIds.length} Vorgänge)`;

            await pb.collection('system_prompts').create({
                title,
                calendar_week: kwTag,
                status: 'open',
                prompt_content: synthesisResult,
                feedback_count: selectedIds.length,
                source_period_start: new Date().toISOString(),
                source_period_end: new Date().toISOString(),
                raw_summary: `Sammel-Arbeitsauftrag generiert aus ${selectedIds.length} ausgewählten Verbesserungsvorschlägen.`
            }, { requestKey: null });

            saveSuccess = true;
            toastStore.success('Als System-Prompt für Antigravity gespeichert! 💾');
            setTimeout(() => { saveSuccess = false; }, 3000);
        } catch (err: any) {
            console.error("Fehler beim Speichern in system_prompts:", err);
            toastStore.error("Speichern fehlgeschlagen: " + (err.message || 'Unbekannter Fehler'));
        } finally {
            isSavingToPrompts = false;
        }
    }

    function recordsCount(): number {
        return selectedIds.length;
    }
</script>

{#if selectionCount > 0}
    <!-- Floating Synthese-Docking-Station (barrierefrei & mobil adaptiv) -->
    <div 
        role="region" 
        aria-label="Sammel-Arbeitsauftrag Steuerung"
        class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-md w-auto bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 sm:p-5 transition-all duration-300 animate-enter backdrop-blur-md"
    >
        <!-- Kopfzeile: Zähler & Auswahl aufheben -->
        <div class="flex items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-2.5">
            <div class="flex items-center gap-2 min-w-0">
                <span class="flex h-7 w-7 rounded-xl bg-primary-100 text-primary-700 font-bold text-xs items-center justify-center shrink-0">
                    <Layers class="w-4 h-4" />
                </span>
                <div class="min-w-0">
                    <span class="text-sm font-bold text-slate-800 block truncate">
                        {selectionCount} {selectionCount === 1 ? 'Vorgang' : 'Vorgänge'} ausgewählt
                    </span>
                    <span class="text-[11px] text-slate-400 font-medium block">Bereit zur Bündelung</span>
                </div>
            </div>
            
            <button 
                type="button"
                onclick={onClearSelection} 
                class="text-xs font-semibold text-slate-400 hover:text-slate-700 min-w-[44px] min-h-[44px] px-2 py-1 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Auswahl aufheben"
            >
                Auswahl aufheben
            </button>
        </div>

        <!-- Haupt-Aktionsbutton mit Double-Submission-Schutz -->
        <button
            type="button"
            onclick={generateSammelAuftrag}
            disabled={isProcessing}
            class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 min-h-[44px] flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
        >
            {#if isProcessing}
                <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full shrink-0"></span>
                <span>Erstelle Synthese...</span>
            {:else}
                <FileText class="w-4 h-4 shrink-0" />
                <span>Synthetisiertes System-Briefing generieren</span>
            {/if}
        </button>

        <!-- Ergebnis-Bereich nach erfolgreicher Generierung -->
        {#if synthesisResult}
            <div class="mt-3.5 bg-slate-50/90 rounded-xl p-3.5 border border-slate-200 space-y-3 animate-enter">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                        <span class="text-emerald-600 font-bold text-xs">✓</span>
                        <p class="text-xs font-semibold text-slate-700">System-Briefing erfolgreich zusammengestellt</p>
                    </div>
                    <button
                        type="button"
                        onclick={() => isPreviewOpen = true}
                        class="text-[11px] font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 min-h-[44px] px-2 py-1 cursor-pointer rounded-lg hover:bg-slate-200/50"
                        title="Volltext-Vorschau ansehen"
                    >
                        <Eye class="w-3.5 h-3.5" />
                        <span>Vorschau</span>
                    </button>
                </div>

                <!-- Aktionsleiste: Zwischenablage, System-Prompts & Markdown-Download -->
                <div class="flex flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        onclick={copyToClipboard}
                        class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold py-2.5 px-3 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                        {#if copySuccess}
                            <Check class="w-4 h-4 text-white" />
                            <span>✓ Kopiert</span>
                        {:else}
                            <Copy class="w-4 h-4" />
                            <span>Kopieren</span>
                        {/if}
                    </button>

                    <button
                        type="button"
                        onclick={saveAsSystemPrompt}
                        disabled={isSavingToPrompts}
                        class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs sm:text-sm font-bold py-2.5 px-3 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        title="Als Prompt in system_prompts für Antigravity speichern"
                    >
                        {#if isSavingToPrompts}
                            <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full shrink-0"></span>
                            <span>Speichert...</span>
                        {:else if saveSuccess}
                            <Check class="w-4 h-4 text-white" />
                            <span>Gespeichert</span>
                        {:else}
                            <Save class="w-4 h-4" />
                            <span>Als Prompt speichern</span>
                        {/if}
                    </button>

                    <button
                        type="button"
                        onclick={downloadMarkdownFile}
                        class="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-xl transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        title="Als Markdown-Datei (.md) exportieren"
                    >
                        {#if downloadSuccess}
                            <Check class="w-4 h-4 text-emerald-600" />
                            <span>Gespeichert</span>
                        {:else}
                            <Download class="w-4 h-4 text-slate-500" />
                            <span class="hidden sm:inline">Export</span>
                        {/if}
                    </button>
                </div>
            </div>
        {/if}
    </div>
{/if}

<!-- Volltext-Vorschau Modal / Dialog -->
{#if isPreviewOpen}
    <div 
        class="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-enter"
        role="dialog"
        aria-modal="true"
        aria-label="Vorschau des System-Briefings"
    >
        <div class="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <!-- Modal Header -->
            <div class="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div class="flex items-center gap-2.5">
                    <span class="p-2 rounded-xl bg-primary-100 text-primary-700">
                        <FileText class="w-5 h-5" />
                    </span>
                    <div>
                        <h3 class="text-base font-bold text-slate-900">Synthetisiertes System-Briefing</h3>
                        <p class="text-xs text-slate-500 font-medium">Releasespezifikation ({selectionCount} Vorgänge gebündelt)</p>
                    </div>
                </div>

                <button
                    type="button"
                    onclick={() => isPreviewOpen = false}
                    class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/50 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Vorschau schließen"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Dokumenten-Textbereich (Markdown Quelltext) -->
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed custom-scrollbar selection:bg-primary-500 selection:text-white">
                <pre class="whitespace-pre-wrap">{synthesisResult}</pre>
            </div>

            <!-- Modal Footer -->
            <div class="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <span class="text-xs text-slate-400 font-mono">
                    {synthesisResult.length} Zeichen
                </span>

                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        onclick={copyToClipboard}
                        class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        {#if copySuccess}
                            <Check class="w-4 h-4 text-white" />
                            <span>✓ Kopiert</span>
                        {:else}
                            <Copy class="w-4 h-4" />
                            <span>In Zwischenablage kopieren</span>
                        {/if}
                    </button>

                    <button
                        type="button"
                        onclick={() => isPreviewOpen = false}
                        class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold py-2 px-4 rounded-xl transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
