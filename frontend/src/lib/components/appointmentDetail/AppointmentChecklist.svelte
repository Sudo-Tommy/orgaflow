<script lang="ts">
    import { slide } from "svelte/transition";
    import {
        CheckSquare,
        Square,
        Sparkles,
        Plus,
        Trash2,
        Loader2,
        ShieldAlert,
    } from "lucide-svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import {
        generateChecklistFromAi,
        persistChecklist,
        toggleChecklistItem,
        addChecklistItem,
        deleteChecklistItem,
        type ChecklistItem,
    } from "./appointmentChecklistService";

    let {
        appointmentId,
        initialChecklist = [],
        isSettled = false,
    }: {
        appointmentId: string;
        initialChecklist?: ChecklistItem[];
        isSettled?: boolean;
    } = $props();

    let items = $state<ChecklistItem[]>([]);
    let isGenerating = $state(false),
        newText = $state("");

    $effect(() => {
        items = initialChecklist || [];
    });

    const totalCount = $derived(items.length);
    const completedCount = $derived(items.filter((i) => i.completed).length);
    const percent = $derived(
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    );

    async function handleGenerate() {
        if (isSettled || isGenerating) return;
        if (
            items.length > 0 &&
            !(await confirmStore.ask(
                "Bestehende Checkliste durch neu generierte Aufgaben ersetzen?",
                "Aufgaben neu generieren?",
                "Überschreiben",
                "Abbrechen",
                true,
            ))
        )
            return;
        isGenerating = true;
        try {
            const res = await generateChecklistFromAi(appointmentId);
            items = res;
            await persistChecklist(appointmentId, res);
            toastStore.success(
                `${res.length} Aufgaben generiert und gespeichert.`,
            );
        } catch (err: any) {
            console.error("[AppointmentChecklist] Fehler beim Generieren:", err);
            toastStore.error(err?.message || "Fehler beim Generieren der Aufgaben.");
        } finally {
            isGenerating = false;
        }
    }

    async function handleToggle(id: string) {
        if (isSettled) return;
        items = await toggleChecklistItem(appointmentId, items, id);
    }

    async function handleAdd() {
        if (isSettled || !newText.trim()) return;
        items = await addChecklistItem(appointmentId, items, newText);
        newText = "";
    }

    async function handleDelete(id: string) {
        if (isSettled) return;
        items = await deleteChecklistItem(appointmentId, items, id);
    }
</script>

<div
    class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200/90 dark:border-rose-900/60 shadow-2xs space-y-3"
>
    <div
        class="flex items-center justify-between border-b border-rose-100 dark:border-rose-950/60 pb-2.5"
    >
        <div>
            <h4
                class="text-xs font-black text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5"
            >
                <span>📋</span> Vor-Ort Checkliste
            </h4>
            <p class="text-[11px] text-neutral-500 mt-0.5">
                {#if totalCount > 0}{completedCount} von {totalCount} erledigt ({percent}%){:else}Keine
                    Aufgaben hinterlegt{/if}
            </p>
        </div>
        {#if !isSettled}
            <button
                type="button"
                onclick={handleGenerate}
                disabled={isGenerating}
                class="min-h-11 min-w-11 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
                {#if isGenerating}<Loader2 class="w-4 h-4 animate-spin" /><span
                        >Generiere...</span
                    >{:else}<Sparkles class="w-4 h-4" /><span>Generieren</span
                    >{/if}
            </button>
        {:else}
            <span
                class="px-2.5 py-1 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1"
                ><ShieldAlert class="w-3 h-3" /> {rbacService.canAccessFinances ? 'Abgerechnet (Archiv)' : 'Abgeschlossen (Archiv)'}</span
            >
        {/if}
    </div>

    {#if totalCount > 0}
        <div
            class="w-full bg-neutral-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden"
        >
            <div
                class="bg-rose-600 h-full transition-all duration-300 rounded-full"
                style="width: {percent}%"
            ></div>
        </div>
    {/if}

    <div class="space-y-1.5">
        {#each items as item (item.id)}
            <div
                transition:slide
                class="flex items-center justify-between p-1.5 rounded-xl border {item.completed
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-neutral-50/80 dark:bg-slate-800/60 border-neutral-200/80 dark:border-slate-700/60'} gap-2"
            >
                <button
                    type="button"
                    onclick={() => handleToggle(item.id)}
                    disabled={isSettled}
                    class="flex items-center gap-2.5 flex-1 min-w-0 min-h-11 min-w-11 px-2 rounded-lg text-left cursor-pointer disabled:cursor-default"
                    title={item.completed
                        ? "Als unerledigt markieren"
                        : "Als erledigt markieren"}
                >
                    <div
                        class="shrink-0 text-rose-600 dark:text-rose-400 min-w-6 flex items-center justify-center"
                    >
                        {#if item.completed}<CheckSquare
                                class="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                            />{:else}<Square
                                class="w-5 h-5 text-neutral-400 hover:text-rose-500 transition-colors"
                            />{/if}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p
                            class="text-xs font-medium leading-snug {item.completed
                                ? 'line-through text-neutral-400 dark:text-slate-500'
                                : 'text-neutral-800 dark:text-slate-100'}"
                        >
                            {item.text}
                        </p>
                        {#if item.completed && item.completed_at}<p
                                class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5"
                            >
                                Erledigt: {new Date(
                                    item.completed_at,
                                ).toLocaleTimeString("de-DE", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })} Uhr
                            </p>{/if}
                    </div>
                </button>
                {#if !isSettled}
                    <button
                        type="button"
                        onclick={() => handleDelete(item.id)}
                        class="min-h-11 min-w-11 text-neutral-400 hover:text-rose-600 flex items-center justify-center rounded-lg cursor-pointer"
                        title="Löschen"><Trash2 class="w-3.5 h-3.5" /></button
                    >
                {/if}
            </div>
        {:else}
            <div class="py-5 text-center text-xs text-neutral-400 italic">
                Noch keine Aufgaben generiert. Tippe auf „Aufgaben generieren“
                für einen KI-Vorschlag.
            </div>
        {/each}
    </div>

    {#if !isSettled}
        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleAdd();
            }}
            class="flex gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800"
        >
            <input
                bind:value={newText}
                type="text"
                placeholder="Aufgabe manuell ergänzen..."
                class="flex-1 min-h-11 px-3 bg-neutral-50 dark:bg-slate-800 text-xs rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-white"
            />
            <button
                type="submit"
                disabled={!newText.trim()}
                class="min-h-11 min-w-11 px-3 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                ><Plus class="w-4 h-4" /><span>Neu</span></button
            >
        </form>
    {/if}
</div>
