<script lang="ts">
    import { onMount } from "svelte";
    import { proposalService } from "$lib/services/improvementProposalService.svelte";
    import ImprovementProposalModal from "$lib/components/admin/ImprovementProposalModal.svelte";
    import ProposalCard from "$lib/../routes/admin/system-prompts/components/ProposalCard.svelte";
    import { Plus, Search, Lightbulb } from "lucide-svelte";
    import { goto } from "$app/navigation";

    let proposalModal: ReturnType<typeof ImprovementProposalModal>;
    let statusFilter = $state<"all" | "idea" | "planned" | "in_progress" | "implemented">("all");
    let searchQuery = $state("");
    let selectedIds = $state<string[]>([]);

    onMount(() => {
        proposalService.init();
        proposalService.markAllAsRead();
    });

    let filteredProposals = $derived(
        proposalService.proposals.filter((p) => {
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = (p.title || "").toLowerCase().includes(q);
                const matchDesc = (p.description || "").toLowerCase().includes(q);
                const matchAuthor = (p.author_name || "").toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchAuthor) return false;
            }
            return true;
        })
    );
</script>

<div class="space-y-4">
    <!-- Filter- und Aktionsleiste -->
    <div class="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div class="relative flex-1 max-w-md">
            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Nach Titel, Problem oder Autor suchen..."
                class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-hidden focus:ring-2 focus:ring-amber-500 min-h-[38px]"
            />
        </div>

        <div class="flex items-center gap-2 justify-between md:justify-end flex-wrap">
            <div class="flex items-center gap-1.5 flex-wrap">
                {#each [
                    { key: 'all', label: 'Alle' },
                    { key: 'idea', label: 'Idee 💡' },
                    { key: 'planned', label: 'Geplant 📋' },
                    { key: 'in_progress', label: 'In Arbeit ⚙️' },
                    { key: 'implemented', label: 'Umgesetzt ✅' }
                ] as f}
                    <button
                        type="button"
                        onclick={() => statusFilter = f.key as any}
                        class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[34px]
                        {statusFilter === f.key ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
                    >
                        {f.label}
                    </button>
                {/each}
            </div>

            <button
                type="button"
                onclick={() => proposalModal?.open(null)}
                class="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px]"
            >
                <Plus class="w-4 h-4" />
                <span>Neuer Vorschlag</span>
            </button>
        </div>
    </div>

    <!-- Vorschläge Raster -->
    {#if proposalService.isLoading}
        <div class="p-8 text-center text-xs text-slate-500">Lade Verbesserungsvorschläge...</div>
    {:else if filteredProposals.length === 0}
        <div class="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
            <span class="text-3xl">💡</span>
            <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Keine Vorschläge gefunden</p>
            <p class="text-xs text-slate-400">Erstellen Sie den ersten Verbesserungsvorschlag über den Button oben.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredProposals as proposal (proposal.id)}
                <ProposalCard
                    {proposal}
                    isSelected={selectedIds.includes(proposal.id)}
                    onToggleSelect={() => {
                        if (selectedIds.includes(proposal.id)) selectedIds = selectedIds.filter(x => x !== proposal.id);
                        else selectedIds = [...selectedIds, proposal.id];
                    }}
                    onUpdateStatus={(id, st) => proposalService.updateProposalStatus(id, st)}
                    onEdit={(p) => proposalModal?.open(p)}
                    onDelete={(p) => proposalService.deleteProposal(p.id)}
                    onShareChat={() => {}}
                    onSolution={(p) => proposalModal?.open(p)}
                    onCreatePrompt={() => goto(`/admin/system-prompts?tab=proposals`)}
                />
            {/each}
        </div>
    {/if}
</div>

<ImprovementProposalModal bind:this={proposalModal} />
