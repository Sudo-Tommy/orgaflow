<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { systemDialogService } from "$lib/services/systemDialogService.svelte";
    import { Copy, Check, ExternalLink, Zap } from "lucide-svelte";
    import { normalizeStatus } from "../supportTicketUtils";

    let { ticket, onStatusChange }: {
        ticket: any;
        onStatusChange: (ticketId: string, statusKey: string) => void;
    } = $props();

    let copiedText = $state(false);

    const STATUS_OPTIONS = [
        { value: 'resolved', label: '🟢 Gelöst (resolved)' },
        { value: 'in_progress', label: '🟡 In Bearbeitung (in_progress)' },
        { value: 'open', label: '🔴 Offen (open)' }
    ];

    async function copyText(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            copiedText = true;
            setTimeout(() => (copiedText = false), 2000);
            toastStore.success('In Zwischenablage kopiert! ✓');
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    function openUrgentReply() {
        const creatorId = ticket.expand?.user?.id || ticket.user;
        const creatorName = ticket.expand?.user?.name_first || 'Kollege(in)';
        const quote = ticket.comment ? `> "${ticket.comment}"\n\n` : '';

        window.dispatchEvent(new CustomEvent('compose-follow-up-dialog', {
            detail: {
                recipientId: creatorId || undefined,
                title: `Antwort zu Support-Ticket #${ticket.id}`,
                message: `Hallo ${creatorName},\n\nbezugnehmend auf dein Ticket #${ticket.id} (${ticket.category || 'Support'}):\n${quote}Hallo, `,
                priority: 'urgent'
            }
        }));

        systemDialogService.isSendModalOpen = true;

        if (ticket.status === 'open') {
            onStatusChange(ticket.id, 'in_progress');
        }
    }
</script>

<div class="space-y-6">
    <!-- Eilmitteilung / Direkte Antwort -->
    <button
        type="button"
        onclick={openUrgentReply}
        class="w-full min-h-11 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
        title="Sofortige Eilmitteilung / Antwort an den Ticketersteller senden"
    >
        <Zap class="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
        <span>Eilmitteilung senden</span>
    </button>

    <!-- Status-Steuerung -->
    <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2">
        <label for="ticket-status-select" class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Bearbeitungsstatus ändern
        </label>
        <select
            id="ticket-status-select"
            value={normalizeStatus(ticket.status)}
            onchange={(e) => onStatusChange(ticket.id, (e.target as HTMLSelectElement).value)}
            class="orga-input-clear w-full text-sm font-bold min-h-11 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer touch-manipulation"
        >
            {#each STATUS_OPTIONS as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
            {/each}
        </select>
    </div>

    <!-- Gesamtkommentar / Nachricht -->
    <div class="space-y-2">
        <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nachricht / Gesamtkommentar
            </h4>
            {#if ticket.comment}
                <button
                    type="button"
                    onclick={() => copyText(ticket.comment)}
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-manipulation cursor-pointer
                    {copiedText ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}"
                    title="Text kopieren"
                >
                    {#if copiedText}
                        <Check class="w-3.5 h-3.5" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-3.5 h-3.5" />
                        <span>Kopieren</span>
                    {/if}
                </button>
            {/if}
        </div>
        <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
            {ticket.comment || "Kein zusätzlicher Kommentar eingegeben."}
        </div>
    </div>

    <!-- Systemdaten & Meta -->
    <div class="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Systemdaten
        </h4>

        <div class="flex items-start justify-between gap-2">
            <span class="text-slate-400 font-medium">Route:</span>
            <a
                href={ticket.url || "#"}
                target="_blank"
                rel="noreferrer"
                class="font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-right break-all max-w-[240px] touch-manipulation"
            >
                <span>{ticket.url || "–"}</span>
                <ExternalLink class="w-3 h-3 shrink-0" />
            </a>
        </div>

        <div class="flex items-center justify-between gap-2">
            <span class="text-slate-400 font-medium">Ersteller:</span>
            <span class="font-semibold text-slate-700 dark:text-slate-200 text-right">
                {#if ticket.expand?.user}
                    {ticket.expand.user.name_first || ""} {ticket.expand.user.name_last || ticket.expand.user.email}
                {:else}
                    Gast / Nicht eingeloggt
                {/if}
            </span>
        </div>

        <div class="flex items-start justify-between gap-2">
            <span class="text-slate-400 font-medium shrink-0">User-Agent:</span>
            <span class="font-mono text-[11px] text-slate-500 dark:text-slate-400 text-right break-all max-w-[240px]">
                {ticket.userAgent || "–"}
            </span>
        </div>
    </div>
</div>
