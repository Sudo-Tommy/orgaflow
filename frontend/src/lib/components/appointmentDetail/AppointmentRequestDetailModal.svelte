<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { tick } from "svelte";
    import { fetchRequestForAppointment, type ParsedRequestData } from "$lib/services/appointmentRequestHelper";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, Mail, Clock, Sparkles, MessageSquare, ExternalLink, CheckCircle2 } from "lucide-svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import RequestReplyModal from "$lib/components/RequestReplyModal.svelte";
    import AppointmentRequestSenderCard from "./request/AppointmentRequestSenderCard.svelte";
    import AppointmentRequestAttachments from "./request/AppointmentRequestAttachments.svelte";

    let dialog: HTMLDialogElement | undefined = $state();
    let isOpen = $state(false);
    let isLoading = $state(false);
    let requestData = $state<ParsedRequestData | null>(null);
    let appointmentRef = $state<any>(null);

    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let replyModal = $state<ReturnType<typeof RequestReplyModal>>();

    interface Props {
        onOpenAllRequests?: () => void;
    }

    let { onOpenAllRequests }: Props = $props();

    export async function open(appointment: any) {
        appointmentRef = appointment;
        isOpen = true;
        isLoading = true;
        requestData = null;

        await tick();
        if (dialog && !dialog.open) {
            dialog.showModal();
        }

        try {
            const data = await fetchRequestForAppointment(appointment);
            requestData = data;
        } catch (err: any) {
            console.error("[AppointmentRequestDetailModal] Fehler beim Laden der Anfrage:", err);
            toastStore.error("Anfragedaten konnten nicht vollständig geladen werden.");
        } finally {
            isLoading = false;
        }
    }

    export function close() {
        if (dialog?.open) {
            dialog.close();
        }
        isOpen = false;
    }

    function handlePreviewAttachment(filename: string) {
        if (!requestData?.raw) return;
        const url = pb.files.getURL(requestData.raw, filename);
        pdfPreviewModal?.open(url, filename, filename);
    }

    function handleOpenReply() {
        if (!requestData) return;
        const targetEmail = requestData.email;
        if (!targetEmail) {
            toastStore.warning("Keine E-Mail-Adresse für diesen Absender hinterlegt.");
            return;
        }
        const reqObj = requestData.raw || {
            id: requestData.id,
            sender_name: requestData.sender_name,
            email: requestData.email,
            request_text: requestData.request_text,
            ai_summary: requestData.ai_summary
        };
        replyModal?.open(reqObj, 'accepted', targetEmail);
    }
</script>

{#if isOpen}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-6 sm:my-10 rounded-3xl outline-none z-50 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10"
        onclick={(e) => {
            if (e.target === dialog) close();
        }}
        oncancel={(e) => {
            e.preventDefault();
            close();
        }}
    >
        <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative border border-slate-200/90 dark:border-slate-800">
            <div class="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                        <span class="text-xl">📥</span>
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                            Terminanfrage
                        </h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
                            Ursprüngliche Kundenanfrage zu diesem Termin
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onclick={close}
                    class="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors touch-manipulation"
                    aria-label="Schließen"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <div class="p-4 sm:p-6 space-y-5">
                {#if isLoading}
                    <div class="flex flex-col items-center justify-center py-20 gap-3">
                        <div class="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Lade Anfragedaten...</p>
                    </div>
                {:else if !requestData}
                    <div class="p-8 text-center text-slate-400 dark:text-slate-500">
                        <p class="text-sm">Für diesen Termin wurden keine spezifischen Anfragedaten gefunden.</p>
                    </div>
                {:else}
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 class="w-3.5 h-3.5" />
                            <span>Angenommen & im Kalender</span>
                        </span>

                        {#if requestData.contact_method}
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                <span>{requestData.contact_method}</span>
                            </span>
                        {/if}

                        {#if requestData.created}
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Clock class="w-3.5 h-3.5 text-slate-400" />
                                <span>Eingegangen: {new Date(requestData.created).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr</span>
                            </span>
                        {/if}

                        {#if requestData.id}
                            <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-auto select-all">
                                ID: {requestData.id}
                            </span>
                        {/if}
                    </div>

                    <AppointmentRequestSenderCard {requestData} />

                    {#if requestData.ai_summary}
                        <div class="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl p-4 sm:p-5 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2 relative overflow-hidden">
                            <div class="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                                <Sparkles class="w-4 h-4" />
                                <span>Strukturierte KI-Analyse & Details</span>
                            </div>
                            <div class="text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {requestData.ai_summary}
                            </div>
                        </div>
                    {/if}

                    <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <MessageSquare class="w-4 h-4" />
                            <span>Ursprünglicher Anfragetext</span>
                        </div>
                        <div class="bg-slate-50/80 dark:bg-slate-950/60 rounded-xl p-3.5 sm:p-4 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono select-text">
                            {requestData.request_text || 'Kein separater Text übermittelt.'}
                        </div>
                    </div>

                    <AppointmentRequestAttachments 
                        attachments={requestData.attachments || []} 
                        onPreview={handlePreviewAttachment} 
                    />
                {/if}
            </div>

            <div class="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0 rounded-b-3xl">
                <div class="flex items-center gap-2 flex-wrap">
                    {#if onOpenAllRequests}
                        <button
                            type="button"
                            onclick={() => { close(); onOpenAllRequests(); }}
                            class="min-h-[44px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors touch-manipulation"
                            title="Im Anfragen-Center öffnen"
                        >
                            <ExternalLink class="w-4 h-4" />
                            <span class="hidden sm:inline">Im Anfragen-Center</span>
                        </button>
                    {/if}

                    {#if requestData?.email}
                        <button
                            type="button"
                            onclick={handleOpenReply}
                            class="min-h-[44px] px-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center gap-2 border border-sky-200 dark:border-sky-800 cursor-pointer transition-colors touch-manipulation"
                        >
                            <Mail class="w-4 h-4" />
                            <span>E-Mail an Absender</span>
                        </button>
                    {/if}
                </div>

                <button
                    type="button"
                    onclick={close}
                    class="min-h-[44px] px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs touch-manipulation"
                >
                    Schließen
                </button>
            </div>
        </div>
    </dialog>
{/if}

<PdfPreviewModal bind:this={pdfPreviewModal} />
<RequestReplyModal bind:this={replyModal} />
