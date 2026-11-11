<script lang="ts">
    import { slide } from "svelte/transition";
    import { FileText, Mic, MicOff, Paperclip, Bot, Trash2, Save, Send } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { autoGrow } from "$lib/actions/autoGrow";
    import AppointmentDocumentsCard from "./AppointmentDocumentsCard.svelte";

    interface Props {
        appointment: any;
        client?: any;
        report: string;
        isReportSaving: boolean;
        onSaveReport: (text: string) => Promise<boolean>;
        onOpenAi: () => void;
        onDeleteVoiceRecord: (fn: string) => void;
        onUploadAudio: (e: Event) => void;
        onSendReport?: () => void;
        onRefreshAppointment?: () => Promise<void>;
    }

    let { 
        appointment, client, report = $bindable(""), isReportSaving, 
        onSaveReport, onOpenAi, onDeleteVoiceRecord, onUploadAudio, 
        onSendReport, onRefreshAppointment 
    }: Props = $props();

    let isListening = $state(false);
    let recognition: any = null;
    let audioInput: HTMLInputElement | undefined = $state();

    function toggleSpeech() {
        if (typeof window === 'undefined') return;
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { toastStore.error("Spracherkennung nicht unterstützt."); return; }
        if (isListening) { recognition?.stop(); isListening = false; return; }
        try {
            recognition = new SR();
            recognition.lang = 'de-DE'; recognition.continuous = true; recognition.interimResults = true;
            recognition.onstart = () => { isListening = true; toastStore.info("Diktat aktiv: Bitte sprechen..."); };
            recognition.onresult = (ev: any) => {
                let trans = '';
                for (let i = ev.resultIndex; i < ev.results.length; i++) { if (ev.results[i].isFinal) trans += ev.results[i][0].transcript; }
                if (trans.trim()) report = (report ? report.trim() + ' ' : '') + trans.trim();
            };
            recognition.onerror = () => { isListening = false; };
            recognition.onend = () => { isListening = false; };
            recognition.start();
        } catch { isListening = false; }
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-slate-800 shadow-xs">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 border-b border-neutral-100 dark:border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
            <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText class="w-4 h-4 text-brand-600" /> Besuchsbericht
            </h3>
            {#if report !== (appointment?.report || '')}
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900">Ungespeichert</span>
            {/if}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
            <button 
                type="button" 
                onclick={toggleSpeech} 
                class="min-h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer {isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 border-neutral-200 dark:border-slate-700'}"
            >
                {#if isListening}<MicOff class="w-4 h-4" /> <span>Stopp</span>{:else}<Mic class="w-4 h-4 text-rose-600" /> <span>🎙️ Diktieren</span>{/if}
            </button>
            <input type="file" accept="audio/*,.m4a,audio/mp4,audio/x-m4a,video/mp4" multiple class="hidden" bind:this={audioInput} onchange={onUploadAudio} />
            <button type="button" onclick={() => audioInput?.click()} class="min-h-10 px-3 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-200 border border-neutral-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer">
                <Paperclip class="w-3.5 h-3.5" /> <span>Audio</span>
            </button>
            <button type="button" onclick={onOpenAi} class="min-h-10 px-3.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 flex items-center gap-1.5 cursor-pointer shadow-xs">
                <Bot class="w-3.5 h-3.5" /> <span>KI</span>
            </button>
        </div>
    </div>

    <div class="space-y-3">
        <textarea 
            use:autoGrow 
            bind:value={report} 
            class="auto-grow w-full min-h-32 text-xs sm:text-sm p-3 bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 rounded-xl leading-relaxed resize-none overflow-hidden" 
            placeholder="Bericht einsprechen oder eintippen..." 
            disabled={isReportSaving}
        ></textarea>

        {#if appointment?.voice_records?.length}
            <div transition:slide class="bg-neutral-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-neutral-200 dark:border-slate-700 space-y-2">
                <h4 class="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Mic class="w-3.5 h-3.5 text-brand-600" /> Sprachmemos ({appointment.voice_records.length})
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {#each appointment.voice_records as vr}
                        <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-neutral-200 dark:border-slate-700 gap-2">
                            <audio controls src={pb.files.getURL(appointment, vr)} class="h-8 w-full min-w-0"></audio>
                            <button type="button" onclick={() => onDeleteVoiceRecord(vr)} class="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-600 cursor-pointer" title="Löschen">
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="flex flex-col-reverse sm:flex-row justify-end items-center gap-2 pt-1">
            {#if onSendReport}
                <button 
                    type="button" 
                    onclick={onSendReport} 
                    class="min-h-11 w-full sm:w-auto px-5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    title="Besuchsbericht an Betreuer oder Angehörige senden"
                >
                    <Send class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Bericht versenden</span>
                </button>
            {/if}
            <button 
                type="button" 
                onclick={() => onSaveReport(report)} 
                disabled={isReportSaving || report === (appointment?.report || '')} 
                class="min-h-11 w-full sm:w-auto px-6 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
                <Save class="w-4 h-4" /> 
                {isReportSaving ? 'Speichert...' : 'Bericht speichern'}
            </button>
        </div>

        <!-- Bild 3: Datei-Upload pro Termin & Klientenakte (Antwort 10b, 11a, 12a, 13a, 14a) -->
        <AppointmentDocumentsCard 
            {appointment} 
            {client} 
            {onRefreshAppointment} 
        />
    </div>
</div>
