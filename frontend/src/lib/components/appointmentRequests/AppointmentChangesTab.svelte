<script lang="ts">
    import { Search, X, Calendar, Check, RotateCcw } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    interface Props {
        currentUser: any;
        isAdmin: boolean;
        isGodMode: boolean;
        onOpenAppointment: (app: any) => void;
    }

    let { currentUser, isAdmin, isGodMode, onOpenAppointment }: Props = $props();

    let changeSearch = $state("");
    let statusFilter = $state<"pending" | "done" | "all">("pending");

    let allChanges = $derived.by(() => {
        let list = (orgaStore.appointments?.data || []).filter(
            (a: any) => a.requestet_changes && a.requestet_changes.text
        );

        if (!isGodMode) {
            const userCompanyId = currentUser?.company;
            if (isAdmin && userCompanyId) {
                list = list.filter((a: any) => a.expand?.user?.company === userCompanyId);
            } else {
                const curId = currentUser?.id;
                list = list.filter((a: any) => {
                    const appUser = Array.isArray(a.user) ? a.user[0] : a.user;
                    return appUser === curId;
                });
            }
        }

        return list.sort((a: any, b: any) => {
            const dateA = a.requestet_changes.resolved_at || a.requestet_changes.created || a.updated;
            const dateB = b.requestet_changes.resolved_at || b.requestet_changes.created || b.updated;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    });

    let pendingCount = $derived(allChanges.filter((a: any) => a.requestet_changes?.status !== "done").length);
    let doneCount = $derived(allChanges.filter((a: any) => a.requestet_changes?.status === "done").length);

    let filteredList = $derived.by(() => {
        let list = allChanges;
        if (statusFilter === "pending") list = list.filter((a: any) => a.requestet_changes?.status !== "done");
        else if (statusFilter === "done") list = list.filter((a: any) => a.requestet_changes?.status === "done");

        if (changeSearch.trim()) {
            const q = changeSearch.toLowerCase().trim();
            list = list.filter((a: any) =>
                `${a.expand?.client?.[0]?.name_first || ""} ${a.expand?.client?.[0]?.name_last || ""} ${a.requestet_changes?.text || ""} ${a.requestet_changes?.resolved_by_name || ""}`.toLowerCase().includes(q)
            );
        }
        return list;
    });

    async function markAsDone(app: any) {
        try {
            const prev = app.requestet_changes || {};
            const resolvedAt = new Date().toISOString();
            const userName = currentUser?.name_first ? `${currentUser.name_first} ${currentUser.name_last || ""}`.trim() : (currentUser?.email || "Mitarbeiter");

            const updatedChanges = {
                ...prev,
                status: "done",
                resolved_at: resolvedAt,
                resolved_by: currentUser?.id || "",
                resolved_by_name: userName
            };

            await pb.collection("appointments").update(app.id, { requestet_changes: updatedChanges });
            try {
                await pb.collection("appointment_change_logs").create({
                    appointment: app.id,
                    client: Array.isArray(app.client) ? app.client[0] : app.client,
                    user: Array.isArray(app.user) ? app.user[0] : app.user,
                    resolved_by: currentUser?.id,
                    change_text: prev.text || "",
                    status: "done",
                    original_created: prev.created || app.created,
                    resolved_at: resolvedAt,
                    notes: `Erledigt durch ${userName}`
                });
            } catch {}

            app.requestet_changes = updatedChanges;
            toastStore.success("Änderungswunsch als erledigt markiert! ✅");
        } catch {
            toastStore.error("Fehler beim Aktualisieren des Termins.");
        }
    }

    async function reopen(app: any) {
        try {
            const prev = app.requestet_changes || {};
            const updatedChanges = { ...prev, status: "pending", resolved_at: null, resolved_by: null, resolved_by_name: null };
            await pb.collection("appointments").update(app.id, { requestet_changes: updatedChanges });
            app.requestet_changes = updatedChanges;
            toastStore.info("Änderungswunsch wieder auf 'Offen' gesetzt.");
        } catch {
            toastStore.error("Fehler beim Reaktivieren.");
        }
    }
</script>

<div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Sub-Toolbar mit Suche und Status-Filterkapseln -->
    <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="relative flex-1 min-w-[220px] max-w-md">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" bind:value={changeSearch} placeholder="Änderungswünsche suchen..." class="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium" />
            {#if changeSearch}
                <button type="button" onclick={() => changeSearch = ""} class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"><X class="w-3.5 h-3.5" /></button>
            {/if}
        </div>

        <div class="flex items-center gap-2 flex-wrap">
            <div class="inline-flex p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold gap-1">
                <button type="button" onclick={() => statusFilter = "pending"} class="min-h-[36px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer {statusFilter === 'pending' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Offen ({pendingCount})</button>
                <button type="button" onclick={() => statusFilter = "done"} class="min-h-[36px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer {statusFilter === 'done' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Erledigt ({doneCount})</button>
                <button type="button" onclick={() => statusFilter = "all"} class="min-h-[36px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer {statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Alle ({allChanges.length})</button>
            </div>
        </div>
    </div>

    <!-- Listenansicht (Zero-Inner-Scroll: entfaltet sich vollflächig) -->
    <div class="p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-950/30 flex-1 overflow-y-auto custom-scrollbar">
        {#if filteredList.length === 0}
            <div class="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/60 dark:bg-slate-900/60 p-8 max-w-lg mx-auto shadow-xs">
                <span class="text-5xl mb-3 block opacity-80">{changeSearch.trim() ? '🔍' : (statusFilter === 'done' ? '📋' : '🙌')}</span>
                <h3 class="text-slate-900 dark:text-white font-bold text-base mb-1">{changeSearch.trim() ? 'Keine Treffer gefunden' : (statusFilter === 'done' ? 'Keine fertigen Änderungen' : 'Alles aktuell!')}</h3>
                <p class="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{changeSearch.trim() ? 'Bitte Suchbegriff anpassen.' : (statusFilter === 'done' ? 'Bislang wurden noch keine Änderungswünsche abgeschlossen.' : 'Es liegen keine offenen Änderungswünsche vor.')}</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each filteredList as app (app.id)}
                    {@const isDone = app.requestet_changes?.status === "done"}
                    <div class="border {isDone ? 'border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900' : 'border-sky-200 dark:border-sky-800/80 bg-white dark:bg-slate-900 ring-1 ring-sky-500/10 dark:ring-sky-400/20'} rounded-2xl p-4 sm:p-5 flex flex-col relative transition-all shadow-xs hover:shadow-md">
                        <div class="flex justify-between items-start mb-3 gap-2">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">{app.expand?.client?.[0]?.name_first || ""} {app.expand?.client?.[0]?.name_last || "Klient"}</h3>
                                    <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full {isDone ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700' : 'text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-700'}">
                                        {isDone ? '✅ Erledigt' : '⏳ Offen'}
                                    </span>
                                </div>
                                <p class="text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 inline-block px-2.5 py-0.5 rounded-lg mt-1 border border-sky-200 dark:border-sky-800">
                                    Termin: {app.appointment ? new Date(app.appointment).toLocaleDateString('de-DE') : '-'} um {app.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'} Uhr
                                </p>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Angefragt: {app.requestet_changes.created ? new Date(app.requestet_changes.created).toLocaleDateString('de-DE') : new Date(app.created).toLocaleDateString('de-DE')}</p>
                                {#if isDone && app.requestet_changes.resolved_at}
                                    <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Erledigt: {new Date(app.requestet_changes.resolved_at).toLocaleDateString('de-DE')}{#if app.requestet_changes.resolved_by_name} ({app.requestet_changes.resolved_by_name}){/if}</p>
                                {/if}
                            </div>
                        </div>

                        <!-- Notizkarten wachsen dynamisch in voller Höhe mit ohne Scrollbalken -->
                        <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-700 dark:text-slate-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed shadow-inner">
                            "{app.requestet_changes.text}"
                        </div>

                        <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                            <button type="button" onclick={() => onOpenAppointment(app)} class="min-h-[40px] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                                <Calendar class="w-3.5 h-3.5" />
                                <span>Termin öffnen</span>
                            </button>

                            {#if isDone}
                                <button type="button" onclick={() => reopen(app)} class="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1.5">
                                    <RotateCcw class="w-3.5 h-3.5" />
                                    <span>Wieder öffnen</span>
                                </button>
                            {:else}
                                <button type="button" onclick={() => markAsDone(app)} class="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-all border border-emerald-200 dark:border-emerald-800 shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1.5">
                                    <Check class="w-3.5 h-3.5" />
                                    <span>Als erledigt markieren</span>
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
