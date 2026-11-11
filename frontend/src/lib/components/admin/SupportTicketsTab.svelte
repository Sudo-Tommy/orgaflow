<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { RefreshCw } from "lucide-svelte";
    import SupportTicketCard from "./SupportTicketCard.svelte";
    import SupportTicketDetailModal from "./SupportTicketDetailModal.svelte";
    import SupportTicketsFilterBar from "./supportTickets/SupportTicketsFilterBar.svelte";
    import {
        normalizeStatus,
        getStatusLabel,
        STATUS_DB_VALUES
    } from "./supportTicketUtils";

    let tickets = $state<any[]>([]);
    let isLoading = $state(true);
    let isRefreshing = $state(false);
    let selectedTicket = $state<any | null>(null);
    let isDetailModalOpen = $state(false);

    let statusFilter = $state<"all" | "open" | "in_progress" | "resolved">("all");
    let categoryFilter = $state<string>("all");
    let searchQuery = $state<string>("");

    async function loadTickets(silent = false) {
        if (!silent) isLoading = true;
        else isRefreshing = true;

        try {
            const records = await pb.collection("support_tickets").getFullList({
                sort: "-created",
                expand: "user"
            });
            tickets = records;
            if (selectedTicket) {
                const refreshed = records.find((r) => r.id === selectedTicket.id);
                if (refreshed) selectedTicket = refreshed;
            }
        } catch (err: any) {
            console.error("Fehler beim Laden der Support-Tickets:", err);
            toastStore.error("Tickets konnten nicht geladen werden: " + (err.message || "Unbekannter Fehler"));
        } finally {
            isLoading = false;
            isRefreshing = false;
        }
    }

    onMount(() => {
        loadTickets();
    });

    let filteredTickets = $derived.by(() => {
        return tickets.filter((t) => {
            if (statusFilter !== "all" && normalizeStatus(t.status) !== statusFilter) return false;
            if (categoryFilter !== "all" && (t.category || "") !== categoryFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const userName = t.expand?.user
                    ? `${t.expand.user.name_first || ""} ${t.expand.user.name_last || ""} ${t.expand.user.email || ""}`.toLowerCase()
                    : "";
                const matches =
                    (t.comment || "").toLowerCase().includes(q) ||
                    (t.category || "").toLowerCase().includes(q) ||
                    (t.url || "").toLowerCase().includes(q) ||
                    (t.userAgent || "").toLowerCase().includes(q) ||
                    userName.includes(q);
                if (!matches) return false;
            }
            return true;
        });
    });

    let openCount = $derived(tickets.filter((t) => normalizeStatus(t.status) === "open").length);
    let inProgressCount = $derived(tickets.filter((t) => normalizeStatus(t.status) === "in_progress").length);
    let resolvedCount = $derived(tickets.filter((t) => normalizeStatus(t.status) === "resolved").length);

    let availableCategories = $derived.by(() => {
        const set = new Set<string>();
        tickets.forEach((t) => {
            if (t.category) set.add(t.category);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));
    });

    function openDetailModal(ticket: any) {
        selectedTicket = ticket;
        isDetailModalOpen = true;
    }

    function closeDetailModal() {
        isDetailModalOpen = false;
        selectedTicket = null;
    }

    async function handleStatusChange(ticketId: string, normalizedKey: string) {
        const dbValue = STATUS_DB_VALUES[normalizedKey] ?? normalizedKey;
        try {
            await pb.collection("support_tickets").update(ticketId, { status: dbValue });
            toastStore.success(`Status auf "${getStatusLabel(dbValue)}" geändert.`);
            tickets = tickets.map((t) => (t.id === ticketId ? { ...t, status: dbValue } : t));
            if (selectedTicket?.id === ticketId) {
                selectedTicket = { ...selectedTicket, status: dbValue };
            }
        } catch (err: any) {
            console.error("Fehler beim Ändern des Status:", err);
            toastStore.error("Status konnte nicht aktualisiert werden: " + (err.message || "Fehler"));
        }
    }

    async function handleDeleteTicket(ticket: any) {
        const confirmed = await confirmStore.ask(
            `Möchtest du das Ticket #${ticket.id} (${ticket.category || "Feedback"}) wirklich unwiderruflich löschen?`,
            "Ticket löschen?",
            "Unwiderruflich löschen",
            "Abbrechen",
            true
        );
        if (!confirmed) return;

        try {
            await pb.collection("support_tickets").delete(ticket.id);
            toastStore.success("Ticket wurde erfolgreich gelöscht.");
            tickets = tickets.filter((t) => t.id !== ticket.id);
            if (selectedTicket?.id === ticket.id) closeDetailModal();
        } catch (err: any) {
            console.error("Fehler beim Löschen des Tickets:", err);
            toastStore.error("Ticket konnte nicht gelöscht werden: " + (err.message || "Fehler"));
        }
    }
</script>

<div class="space-y-6 animate-enter">
    <div class="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-xl">
                🚨
            </div>
            <div>
                <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Support- & Fehlerberichte
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tickets.length} gesamt
                    </span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Eingegangene Screenshots, annotierte Fehlermarkierungen und Feedback aus dem Widget.
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
            <button
                type="button"
                onclick={() => loadTickets(true)}
                disabled={isRefreshing}
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 min-h-[44px] touch-manipulation"
            >
                <RefreshCw class="w-3.5 h-3.5 {isRefreshing ? 'animate-spin' : ''}" />
                <span>Aktualisieren</span>
            </button>
        </div>
    </div>

    <SupportTicketsFilterBar
        bind:statusFilter
        bind:categoryFilter
        bind:searchQuery
        totalTicketsCount={tickets.length}
        {openCount}
        {inProgressCount}
        {resolvedCount}
        {availableCategories}
    />

    {#if isLoading}
        <div class="py-24 flex flex-col items-center justify-center gap-3">
            <div class="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">Lade Support-Tickets ...</span>
        </div>
    {:else if filteredTickets.length === 0}
        <div class="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-2xl">
                📬
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine Tickets gefunden</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? "Mit den aktuellen Filtern wurden keine Tickets gefunden. Passe deine Suche an."
                    : "Aktuell liegen keine Support-Tickets vor. Neue Meldungen aus dem Widget 'Hier klemmt\\'s' erscheinen hier automatisch."}
            </p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {#each filteredTickets as ticket (ticket.id)}
                <SupportTicketCard {ticket} onSelect={openDetailModal} />
            {/each}
        </div>
    {/if}
</div>

{#if isDetailModalOpen && selectedTicket}
    <SupportTicketDetailModal
        ticket={selectedTicket}
        onClose={closeDetailModal}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTicket}
    />
{/if}
