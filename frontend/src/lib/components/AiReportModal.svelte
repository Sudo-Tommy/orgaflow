<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { sanitizeReportText } from "$lib/utils/reportSanitizer";
    import { triggerHaptic } from "$lib/services/hapticFeedback";
    import { 
        PROMPT_FAMILIE, 
        PROMPT_INTERN, 
        PROMPT_STANDARD, 
        buildAiContext, 
        blobToBase64 
    } from "./aiReport/aiReportPrompts";
    import { AiReportState } from "./aiReport/aiReportState.svelte";
    import AiReportResultView from "./aiReport/AiReportResultView.svelte";
    import AiReportInputView from "./aiReport/AiReportInputView.svelte";

    let dialog: HTMLDialogElement;
    let { onSave } = $props<{ onSave: (text: string, type: 'family' | 'internal', blobs?: Blob[]) => void }>();

    const reportState = new AiReportState();
    let isGenerating = $state(false);
    let generatedText = $state("");
    let errorMsg = $state("");
    
    let inputType = $state<'record' | 'text' | 'standard'>('record');
    let manualText = $state("");
    let client = $state<any>(null);
    let appointment = $state<any>(null);
    
    let availableRecipients = $state<{name: string, role: string}[]>([]);
    let selectedRecipientName = $state("");
    let reportType = $state<'family' | 'internal' | 'standard'>('family');
    let customPrompt = $state(PROMPT_FAMILIE);

    const microserviceUrl = (import.meta as any).env?.DEV ? 'http://localhost:3000' : '';

    export function open(defaultType: 'family' | 'internal' | 'standard' = 'family', app: any = null, cl: any = null) {
        reportType = defaultType;
        customPrompt = defaultType === 'internal' ? PROMPT_INTERN : (defaultType === 'standard' ? PROMPT_STANDARD : PROMPT_FAMILIE);
        appointment = app;
        client = cl;
        errorMsg = "";
        generatedText = "";
        manualText = "";
        availableRecipients = [];
        selectedRecipientName = "";
        reportState.cleanup();
        
        if (cl) {
            if (cl.caregiver) {
                const caregiver = orgaStore.contacts?.getById(cl.caregiver);
                if (caregiver) {
                    availableRecipients.push({
                        name: `${caregiver.name_first} ${caregiver.name_last}`.trim(),
                        role: 'Gesetzl. Betreuung'
                    });
                }
            }
            const contactsList = Array.isArray(cl.contacts) ? cl.contacts : (cl.contacts ? [cl.contacts] : []);
            contactsList.forEach((cId: string) => {
                const contact = orgaStore.contacts?.getById(cId);
                if (contact) {
                    availableRecipients.push({
                        name: `${contact.name_first} ${contact.name_last}`.trim(),
                        role: contact.company_name || 'Angehörige/r'
                    });
                }
            });
        }
        
        dialog?.showModal();
    }

    export function close() {
        reportState.cleanup();
        errorMsg = "";
        dialog?.close();
    }

    async function generateReport(attempt: any = 0) {
        const retryCount = typeof attempt === 'number' ? attempt : 0;
        isGenerating = true;
        errorMsg = "";
        triggerHaptic('tap');
        const startTime = Date.now();
        try {
            const payload: Record<string, any> = {};
            payload.prompt = buildAiContext(client, appointment, selectedRecipientName, customPrompt);

            if (inputType === 'record' && reportState.recordings.length > 0) {
                const combinedBlob = new Blob(reportState.recordings.map(r => r.blob), { type: reportState.recordings[0].mimeType });
                payload.audioBase64 = await blobToBase64(combinedBlob);
                payload.mimeType = reportState.recordings[0].mimeType;
            } else if (inputType === 'text' && manualText.trim()) {
                payload.inputText = manualText;
            } else if (inputType === 'standard') {
                payload.inputText = "Es gibt keine besonderen Vorkommnisse. Der Termin verlief gut und alles war in Ordnung. Der Ort und die Tätigkeiten sind aus dem Kontext ersichtlich.";
            } else if (reportState.attachedDocuments.length > 0) {
                payload.inputText = "Bitte werte die angehängten Dokumente aus.";
            } else {
                throw new Error("Bitte eine Eingabe tätigen (Sprache, Text, Standard oder Dokument anhängen).");
            }

            if (reportState.attachedDocuments.length > 0) {
                payload.attachedDocuments = await Promise.all(reportState.attachedDocuments.map(async doc => ({
                    base64: await blobToBase64(doc.blob),
                    mimeType: doc.mimeType,
                    name: doc.name
                })));
            }
            
            payload.retryAttempt = retryCount;

            const response = await fetch(`${microserviceUrl}/api/emails/ai/transcribe`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify(payload)
            });
            
            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const errorText = await response.text();
                throw new Error(`Unerwartete Antwort vom Server: ${errorText.substring(0, 200)}...`);
            }

            if (!response.ok || data.error) {
                const errorStr = (data.error || "").toLowerCase();
                const isOverloaded = response.status === 503 || response.status === 429 || errorStr.includes("high demand") || errorStr.includes("overloaded");
                if (isOverloaded && retryCount < 2) {
                    const waitTime = (retryCount + 1) * 3000;
                    toastStore.info(`KI-Dienst ausgelastet. Neuversuch (${retryCount + 1}/2) in ${waitTime/1000}s...`);
                    await new Promise(r => setTimeout(r, waitTime));
                    return await generateReport(retryCount + 1);
                }
                throw new Error(data.error || "Server-Fehler bei der KI-Anfrage.");
            }
            
            const wait = Math.max(0, 1000 - (Date.now() - startTime));
            if (wait > 0) await new Promise(r => setTimeout(r, wait));

            generatedText = sanitizeReportText(data.text);
            triggerHaptic('success');
            toastStore.success("Bericht erfolgreich generiert!");
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Die Eingabe konnte nicht verarbeitet werden.";
            triggerHaptic('error');
        } finally {
            isGenerating = false;
        }
    }

    function handleSave() {
        triggerHaptic('success');
        onSave(sanitizeReportText(generatedText), reportType === 'standard' ? 'family' : reportType, reportState.recordings.map(r => r.blob));
        close();
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center justify-center transition-all z-20 cursor-pointer touch-manipulation active:scale-95">✕</button>
        
        <h2 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
            <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg shadow-inner text-sm">🤖</span> KI Sprach-Notiz
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Nehmen Sie Sprachnotizen auf oder geben Sie Text ein. Die KI fasst alles zu einem Bericht zusammen.</p>

        {#if errorMsg || reportState.errorMsg}
            <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">
                {errorMsg || reportState.errorMsg}
            </div>
        {/if}

        {#if isGenerating}
            <div class="flex flex-col items-center justify-center p-12 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p class="font-bold text-indigo-900 dark:text-indigo-200">KI analysiert Termine & Daten...</p>
                <p class="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Das kann je nach Länge ein paar Sekunden dauern.</p>
            </div>
        {:else if generatedText}
            <AiReportResultView 
                bind:generatedText
                bind:customPrompt
                bind:reportType
                {availableRecipients}
                bind:selectedRecipientName
                onRegenerate={() => generateReport(0)}
                onBack={() => generatedText = ""}
                onSave={handleSave}
            />
        {:else}
            <AiReportInputView 
                {reportState}
                bind:inputType
                bind:manualText
                bind:reportType
                bind:customPrompt
                {availableRecipients}
                bind:selectedRecipientName
                onClose={close}
                onGenerate={() => generateReport(0)}
            />
        {/if}
    </div>
</dialog>