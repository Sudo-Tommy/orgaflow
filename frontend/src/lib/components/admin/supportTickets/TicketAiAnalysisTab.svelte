<!-- src/lib/components/admin/supportTickets/TicketAiAnalysisTab.svelte -->
<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Sparkles, Copy, Check, MessageSquare, Terminal } from "lucide-svelte";

    let { ticket }: { ticket: any } = $props();

    let copiedPrompt = $state(false);

    let parsed = $derived.by(() => {
        const raw = ticket.annotations_data || ticket.annotations || "";
        if (!raw) return null;
        try {
            return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
            return null;
        }
    });

    let promptContent = $derived(parsed?.antigravityPrompt || ticket.antigravity_prompt || "");
    let transcript = $derived<Array<{ role: string; text: string }>>(parsed?.transcript || []);
    let summary = $derived(parsed?.summary || ticket.comment || "");

    async function copyPrompt() {
        if (!promptContent) return;
        try {
            await navigator.clipboard.writeText(promptContent);
            copiedPrompt = true;
            toastStore.success("AntiGravity-Prompt in Zwischenablage kopiert! ✓");
            setTimeout(() => (copiedPrompt = false), 2500);
        } catch {
            toastStore.error("Kopieren fehlgeschlagen.");
        }
    }
</script>

<div class="space-y-4">
    <!-- Problem Zusammenfassung -->
    <div class="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
        <span class="text-[10px] font-black uppercase text-slate-400">KI-Zusammenfassung</span>
        <p class="text-xs font-bold text-slate-800 dark:text-slate-100">{summary || "Keine Zusammenfassung hinterlegt."}</p>
    </div>

    <!-- AntiGravity Prompt Box -->
    {#if promptContent}
        <div class="bg-slate-950 text-slate-100 rounded-2xl p-4 border border-slate-800 space-y-2.5 shadow-md">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Terminal class="w-4 h-4" />
                    <span>AntiGravity Ausbesserungs-Prompt</span>
                </span>
                <button
                    type="button"
                    onclick={copyPrompt}
                    class="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                    {#if copiedPrompt}
                        <Check class="w-3.5 h-3.5" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-3.5 h-3.5" />
                        <span>Prompt kopieren</span>
                    {/if}
                </button>
            </div>
            <pre class="text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 leading-relaxed select-all">{promptContent}</pre>
        </div>
    {:else}
        <div class="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
            Für dieses Ticket wurde kein AntiGravity-Prompt automatisch hinterlegt.
        </div>
    {/if}

    <!-- Chat Transkript -->
    {#if transcript.length > 0}
        <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
                <MessageSquare class="w-3.5 h-3.5 text-indigo-500" />
                <span>Live-Chat Verlauf ({transcript.length} Nachrichten)</span>
            </h4>
            <div class="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                {#each transcript as msg, idx (idx)}
                    <div class="text-xs p-2 rounded-xl {msg.role === 'user' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 ml-4' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 mr-4 border border-slate-200/60 dark:border-slate-700/60'}">
                        <span class="font-bold block text-[10px] uppercase text-slate-400 mb-0.5">{msg.role === 'user' ? 'Nutzer' : 'Support-KI'}</span>
                        <p class="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

