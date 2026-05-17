<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { env } from '$env/dynamic/public';
    import { toastStore } from "$lib/services/toastService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let { onSave } = $props<{ onSave: (text: string, type: 'family' | 'internal', blobs?: Blob[]) => void }>();

    let isRecording = $state(false);
    let isGenerating = $state(false);
    let generatedText = $state("");
    let errorMsg = $state("");
    
    let inputType = $state<'record' | 'text'>('record');
    let manualText = $state("");

    let recordings = $state<{ id: number, blob: Blob, mimeType: string, duration: number, url: string }[]>([]);
    
    const promptFamilie = "Erstelle einen professionellen und detaillierten Besuchsbericht aus den vorliegenden Aufzeichnungen. Fasse die wichtigsten medizinischen, privaten und organisatorischen Punkte übersichtlich und strukturiert zusammen. Der Bericht sollte folgende Abschnitte enthalten: 1. Zusammenfassung 2. Medizinische Informationen 3. Private Informationen 4. Organisatorische Punkte. Bitte formuliere den Bericht so, dass er professionell und empathisch klingt, damit ich ihn direkt an die Familie weiterleiten kann.";
    const promptIntern = "Erstelle eine präzise interne Notiz für das Team aus den Aufzeichnungen. Bitte fasse alle wichtigen Fakten, medizinischen Auffälligkeiten und To-Dos sachlich und kurz in Stichpunkten zusammen. Keine langen Fließtexte, sondern reine Fakten für die interne Akte.";
    let reportType = $state<'family' | 'internal'>('family');
    let customPrompt = $state(promptFamilie);
    
    let mediaRecorder: MediaRecorder | null = $state(null);
    let audioChunks: Blob[] = [];
    let recordingTime = $state(0);
    let recordingInterval: any;

    // svelte-ignore non_reactive_update
    let audioInput: HTMLInputElement;

    // Nutzt relativ zur aktuellen Domain (verhindert www. vs non-www Weiterleitungs-Fehler)
    const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';

    export function open(defaultType: 'family' | 'internal' = 'family') {
        reportType = defaultType;
        customPrompt = defaultType === 'internal' ? promptIntern : promptFamilie;
        errorMsg = "";
        generatedText = "";
        recordings = [];
        manualText = "";
        dialog?.showModal();
    }

    export function close() {
        cancelRecording();
        recordings.forEach(r => URL.revokeObjectURL(r.url));
        dialog?.close();
    }

    async function startRecording() {
        try {
            errorMsg = "";
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (audioChunks.length > 0 && !errorMsg) {
                    const mimeType = mediaRecorder?.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks, { type: mimeType });
                    recordings = [...recordings, {
                        id: Date.now(),
                        blob: audioBlob,
                        mimeType,
                        duration: recordingTime,
                        url: URL.createObjectURL(audioBlob)
                    }];
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordingTime = 0;
            recordingInterval = setInterval(() => recordingTime++, 1000);
        } catch (err) {
            console.error("Mikrofon-Zugriff verweigert", err);
            errorMsg = "Konnte nicht auf das Mikrofon zugreifen. Bitte überprüfen Sie Ihre Browser-Einstellungen.";
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            clearInterval(recordingInterval);
        }
    }

    function cancelRecording() {
        if (mediaRecorder && isRecording) {
            errorMsg = "Abgebrochen"; // Signalisiert onstop, dass wir nicht an die KI senden
            mediaRecorder.stop();
            isRecording = false;
            clearInterval(recordingInterval);
            errorMsg = "";
        }
    }

    function deleteRecording(id: number) {
        const recToDelete = recordings.find(r => r.id === id);
        if (recToDelete) {
            URL.revokeObjectURL(recToDelete.url);
        }
        recordings = recordings.filter(r => r.id !== id);
    }

    function handleFileUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const newRecordings = [];
        for (const file of input.files) {
            newRecordings.push({
                id: Date.now() + Math.random(),
                blob: file,
                mimeType: file.type,
                duration: 0, // Dauer ist bei Uploads nicht direkt ersichtlich
                url: URL.createObjectURL(file)
            });
        }
        recordings = [...recordings, ...newRecordings];
        input.value = ''; // File-Input zurücksetzen
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
                else reject(new Error("Fehler beim Konvertieren"));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function generateReport() {
        if (inputType === 'record' && recordings.length === 0) {
            errorMsg = "Bitte nehmen Sie zuerst eine Sprachnotiz auf oder laden Sie eine Datei hoch.";
            return;
        }
        if (inputType === 'text' && !manualText.trim()) {
            errorMsg = "Bitte geben Sie einen Text zur Verarbeitung ein.";
            return;
        }

        isGenerating = true;
        errorMsg = "";
        try {
            const payload: any = { prompt: customPrompt };

            if (inputType === 'record' && recordings.length > 0) {
                const combinedBlob = new Blob(recordings.map(r => r.blob), { type: recordings[0].mimeType });
                payload.audioBase64 = await blobToBase64(combinedBlob);
                payload.mimeType = recordings[0].mimeType;
            } else if (inputType === 'text' && manualText.trim()) {
                payload.inputText = manualText;
            } else {
                throw new Error("Keine Eingabe zum Verarbeiten gefunden.");
            }
            
            const response = await fetch(`${microserviceUrl}/api/emails/ai/transcribe`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || "Server-Fehler");
            
            generatedText = data.text;
            toastStore.success("Bericht erfolgreich generiert!");
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Die KI konnte die Eingabe nicht verarbeiten.";
        } finally {
            isGenerating = false;
        }
    }
    function handleSave() {
        onSave(generatedText, reportType, recordings.map(r => r.blob));
        close();
    }

    function formatTime(seconds: number) {
        return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    let formattedTime = $derived(formatTime(recordingTime));
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative shadow-2xl">
        <button aria-label="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">✕</button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">🤖</span> KI Sprach-Notiz
        </h2>
        <p class="text-sm text-neutral-500 mb-6">Nehmen Sie Sprachnotizen auf oder geben Sie Text ein. Die KI fasst alles zu einem Bericht zusammen.</p>

        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}

        {#if isGenerating}
            <div class="flex flex-col items-center justify-center p-12 bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200">
                <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p class="font-bold text-indigo-900">KI analysiert Aufnahme...</p>
                <p class="text-xs text-indigo-600 mt-1">Das kann je nach Länge ein paar Sekunden dauern.</p>
            </div>
        {:else if generatedText}
            <div class="animate-enter space-y-6">
                <div>
                    <label for="ai-result" class="block text-sm font-semibold text-neutral-700 mb-1.5">Generierter Bericht (Bitte prüfen & anpassen)</label>
                    <textarea id="ai-result" bind:value={generatedText} rows="10" class="orga-input-clear resize-y custom-scrollbar text-sm leading-relaxed"></textarea>
                </div>
                
                <div class="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                    <div class="flex items-center justify-between mb-1.5">
                        <label for="ai-prompt-edit" class="block text-sm font-semibold text-neutral-700">KI-Prompt anpassen</label>
                        <div class="flex gap-2">
                            <button type="button" onclick={() => { reportType = 'family'; customPrompt = promptFamilie; }} class="px-2 py-1 {reportType === 'family' ? 'bg-indigo-600 text-white shadow-sm border-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} text-[10px] font-bold rounded-md border transition-colors">Für Familie</button>
                            <button type="button" onclick={() => { reportType = 'internal'; customPrompt = promptIntern; }} class="px-2 py-1 {reportType === 'internal' ? 'bg-emerald-600 text-white shadow-sm border-emerald-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'} text-[10px] font-bold rounded-md border transition-colors">Intern (Team)</button>
                        </div>
                    </div>
                    <textarea id="ai-prompt-edit" bind:value={customPrompt} rows="3" class="orga-input-clear text-sm resize-y custom-scrollbar"></textarea>
                    <div class="flex justify-end mt-3">
                        <button type="button" onclick={generateReport} class="orga-button-ghost py-2 px-4 text-xs font-bold bg-white shadow-sm border border-neutral-200 hover:border-indigo-300 hover:text-indigo-700">Mit neuem Prompt neu generieren 🔄</button>
                    </div>
                </div>

                <div class="pt-4 border-t border-neutral-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button type="button" onclick={() => generatedText = ""} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5">Zurück zu den Aufnahmen</button>
                    <button type="button" onclick={handleSave} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 w-full sm:w-auto py-3 sm:py-2.5">Bericht übernehmen</button>
                </div>
            </div>
        {:else}
            <div class="flex flex-col gap-4">
                <div class="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                    <button type="button" onclick={() => inputType = 'record'} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {inputType === 'record' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">🎤 Aufnahme</button>
                    <button type="button" onclick={() => inputType = 'text'} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {inputType === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">✍️ Text eingeben</button>
                </div>

                {#if inputType === 'record'}
                    <div class="animate-enter space-y-4">
                        {#if recordings.length > 0}
                            <div class="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100">
                                <h3 class="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">Aufnahmen ({recordings.length})</h3>
                                <div class="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                    {#each recordings as rec (rec.id)}
                                        <div class="flex items-center justify-between bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">🎵</div>
                                                <div>
                                                    <p class="text-[10px] font-bold text-neutral-900">Sprachnotiz</p>
                                                    {#if rec.duration > 0}
                                                        <p class="text-xs text-neutral-500">Dauer: {formatTime(rec.duration)}</p>
                                                    {:else}
                                                        <p class="text-xs text-neutral-500">Hochgeladene Datei</p>
                                                    {/if}
                                                </div>
                                            </div>
                                            <button type="button" onclick={() => deleteRecording(rec.id)} class="text-rose-500 hover:text-rose-700 w-8 h-8 rounded-full hover:bg-rose-50 transition-colors flex items-center justify-center font-bold" title="Löschen">✕</button>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                        <div class="flex flex-col items-center justify-center py-8 bg-neutral-50/50 rounded-2xl border border-neutral-100 border-dashed">
                        {#if isRecording}
                            <div class="text-3xl font-mono font-black text-rose-600 mb-6 animate-pulse">{formattedTime}</div>
                            <div class="flex gap-4"><button type="button" onclick={cancelRecording} class="w-14 h-14 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 rounded-full flex items-center justify-center transition-colors shadow-sm" title="Abbrechen">✕</button><button type="button" onclick={stopRecording} class="w-16 h-16 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-rose-500/30" title="Aufnahme beenden"><div class="w-5 h-5 bg-white rounded-sm"></div></button></div>
                            <p class="text-xs text-rose-500 mt-4 font-bold animate-pulse">Nimmt auf...</p>
                        {:else}
                            <button type="button" onclick={startRecording} class="w-20 h-20 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-full flex flex-col items-center justify-center transition-colors shadow-sm group"><span class="text-2xl group-hover:scale-110 transition-transform">🎤</span></button>
                            <p class="text-sm font-bold text-neutral-700 mt-4">Neue Notiz aufnehmen</p>
                            <div class="flex items-center gap-2 my-2 w-40">
                                <div class="h-px flex-1 bg-neutral-200"></div>
                                <span class="text-xs text-neutral-400 font-medium">oder</span>
                                <div class="h-px flex-1 bg-neutral-200"></div>
                            </div>
                            <input type="file" bind:this={audioInput} onchange={handleFileUpload} class="hidden" accept="audio/*" multiple />
                            <button type="button" onclick={() => audioInput.click()} class="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline">Datei hochladen</button>
                        {/if}
                        </div>
                    </div>
                {:else}
                    <div class="animate-enter">
                        <label for="manual-text" class="block text-sm font-semibold text-neutral-700 mb-1.5">Manueller Text</label>
                        <textarea id="manual-text" bind:value={manualText} rows="8" class="orga-input-clear resize-y custom-scrollbar text-sm leading-relaxed" placeholder="Stichpunkte, Sätze oder ganze Absätze hier einfügen..."></textarea>
                    </div>
                {/if}

                {#if (inputType === 'record' && recordings.length > 0 && !isRecording) || (inputType === 'text' && manualText.trim())}
                    <div class="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                        <div class="flex items-center justify-between mb-1.5">
                            <label for="ai-prompt" class="block text-sm font-semibold text-neutral-700">KI-Anweisung (Prompt)</label>
                            <div class="flex gap-2">
                                <button type="button" onclick={() => { reportType = 'family'; customPrompt = promptFamilie; }} class="px-2 py-1 {reportType === 'family' ? 'bg-indigo-600 text-white shadow-sm border-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} text-[10px] font-bold rounded-md border transition-colors">Für Familie</button>
                                <button type="button" onclick={() => { reportType = 'internal'; customPrompt = promptIntern; }} class="px-2 py-1 {reportType === 'internal' ? 'bg-emerald-600 text-white shadow-sm border-emerald-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'} text-[10px] font-bold rounded-md border transition-colors">Intern (Team)</button>
                            </div>
                        </div>
                        <textarea id="ai-prompt" bind:value={customPrompt} rows="3" class="orga-input-clear text-sm resize-y custom-scrollbar"></textarea>
                    </div>
                    
                    <div class="pt-4 mt-2 border-t border-neutral-100 flex flex-col sm:flex-row justify-end gap-3">
                        <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5">Abbrechen</button>
                        <button type="button" onclick={generateReport} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 w-full sm:w-auto py-3 sm:py-2.5">Bericht generieren ✨</button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</dialog>