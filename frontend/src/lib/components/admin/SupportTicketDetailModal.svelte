<!-- src/lib/components/admin/SupportTicketDetailModal.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { Trash2, X, Sparkles, Image as ImageIcon } from "lucide-svelte";
    import {
        getStatusLabel,
        getStatusBadgeClasses,
        getCategoryBadgeClasses,
        formatDate
    } from "./supportTicketUtils";
    import TicketScreenshotViewer from "./supportTickets/TicketScreenshotViewer.svelte";
    import TicketAnnotationsList from "./supportTickets/TicketAnnotationsList.svelte";
    import TicketMetadataSidebar from "./supportTickets/TicketMetadataSidebar.svelte";
    import TicketAiAnalysisTab from "./supportTickets/TicketAiAnalysisTab.svelte";

    interface Props {
        ticket: any;
        onClose: () => void;
        onStatusChange: (ticketId: string, statusKey: string) => void;
        onDelete: (ticket: any) => void;
    }

    let { ticket, onClose, onStatusChange, onDelete }: Props = $props();
    let dialog: HTMLDialogElement;
    let activeTab = $state<'overview' | 'ai'>('overview');

    onMount(() => {
        dialog?.showModal();
    });
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md w-full max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) onClose(); }}
    oncancel={(e) => { e.preventDefault(); onClose(); }}
>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-200">
        <!-- Header im Benchmark-Design (AppointmentModal) -->
        <div class="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center gap-3 rounded-t-3xl">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <span class="text-xl">🚨</span>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">Ticket #{ticket.id}</h2>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border {getStatusBadgeClasses(ticket.status)}">
                            {getStatusLabel(ticket.status)}
                        </span>
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border {getCategoryBadgeClasses(ticket.category)}">
                            {ticket.category || "Ohne Kategorie"}
                        </span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Eingereicht am {formatDate(ticket.created)}</p>
                </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onclick={() => onDelete(ticket)}
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="Ticket löschen"
                >
                    <Trash2 class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={onClose}
                    class="w-10 h-10 min-w-10 min-h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="Schließen"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>
        </div>

        <!-- Pill-Tab-Leiste im Benchmark-Design -->
        <div class="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div class="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onclick={() => (activeTab = 'overview')}
                    class="min-h-11 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border {activeTab === 'overview' ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
                >
                    <ImageIcon class="w-3.5 h-3.5" />
                    <span>Übersicht &amp; Screenshot</span>
                </button>
                <button
                    type="button"
                    onclick={() => (activeTab = 'ai')}
                    class="min-h-11 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border {activeTab === 'ai' ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700/80'}"
                >
                    <Sparkles class="w-3.5 h-3.5" />
                    <span>KI-Analyse &amp; AntiGravity-Prompt</span>
                </button>
            </div>
        </div>

        <!-- Modal Body -->
        <div class="p-4 sm:p-6 flex-1">
            {#if activeTab === 'overview'}
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div class="lg:col-span-8 flex flex-col gap-4">
                        <TicketScreenshotViewer {ticket} />
                        <TicketAnnotationsList annotationsData={ticket?.annotations_data || ticket?.annotations} />
                    </div>
                    <div class="lg:col-span-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800">
                        <TicketMetadataSidebar {ticket} {onStatusChange} />
                    </div>
                </div>
            {:else}
                <TicketAiAnalysisTab {ticket} />
            {/if}
        </div>
    </div>
</dialog>
