<script lang="ts">
    import { updateStore } from "$lib/services/updateService.svelte";
    import { pb } from "$lib/services/pocketbase";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');

    let isEditing = $state(false);
    let editId = $state<string | null>(null);
    let editNumber = $state<string>("");
    let editDate = $state("");
    let editText = $state("");
    let isSaving = $state(false);

    $effect(() => {
        if (updateStore.isOpen) {
            dialog?.showModal();
            isEditing = false;
            
            // Markiere alle ungesehenen Updates als gelesen
            const user = pb.authStore.model;
            if (user) {
                updateStore.updates.forEach(async (u: any) => {
                    let readBy = Array.isArray(u.read_by) ? u.read_by : (u.read_by ? [u.read_by] : []);
                    if (!readBy.includes(user.id)) {
                        readBy = [...readBy, user.id];
                        try {
                            await pb.collection('updates').update(u.id, { read_by: readBy }, { requestKey: null });
                            u.read_by = readBy; // Aktualisiere lokal für UI-Feedback
                        } catch (e) {
                            console.error("Fehler beim Markieren als gelesen:", e);
                        }
                    }
                });
            }
        } else {
            dialog?.close();
        }
    });
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) updateStore.close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-10 w-full max-h-[85vh] flex flex-col relative overflow-hidden shadow-2xl">
        <button aria-label="Schließen" onclick={() => updateStore.close()} class="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors z-20">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="shrink-0 mb-6 border-b border-slate-100 dark:border-slate-800 pb-6 pr-12 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
                <h2 class="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3"><span class="text-amber-500">✨</span> System-Updates</h2>
                <p class="text-slate-500 dark:text-slate-400 font-medium mt-2">Was gibt es Neues in OrgaFlow? Hier finden Sie alle kürzlichen Änderungen, Verbesserungen und neuen Funktionen.</p>
            </div>
            {#if isSuperAdmin && !isEditing}
                <button onclick={() => {
                    editId = null;
                    
                    let nextNum = "1.0.0";
                    if (updateStore.updates.length > 0 && updateStore.updates[0].number) {
                        nextNum = updateStore.updates[0].number.toString().replace(/(\d+)(?!.*\d)/, (match: string) => (parseInt(match, 10) + 1).toString());
                    }
                    editNumber = nextNum;
                    
                    editDate = new Date().toISOString().split('T')[0];
                    editText = "";
                    isEditing = true;
                }} class="orga-button-primary py-2 px-4 text-xs shrink-0">+ Neues Update</button>
            {/if}
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar pr-4 relative">
            {#if isEditing}
                <form onsubmit={async (e) => {
                    e.preventDefault();
                    isSaving = true;
                    try {
                        const data = { number: editNumber, date: editDate ? new Date(editDate).toISOString() : new Date().toISOString(), text: editText };
                        if (editId) await pb.collection('updates').update(editId, data);
                        else await pb.collection('updates').create(data);
                        await updateStore.check(); // Lädt die Liste sofort neu
                        isEditing = false;
                    } catch (err) { console.error(err); alert("Fehler beim Speichern. Hast du die Admin-Rechte?"); }
                    finally { isSaving = false; }
                }} class="bg-slate-50 dark:bg-slate-800/60 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 animate-enter space-y-4">
                    <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">{editId ? 'Update bearbeiten' : 'Neues Update anlegen'}</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <div><label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Versions-Nr.</label><input type="text" placeholder="z.B. 1.0.1" bind:value={editNumber} class="orga-input-clear py-2 text-sm" required disabled={isSaving} /></div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <div><label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Datum</label><input type="date" bind:value={editDate} class="orga-input-clear py-2 text-sm" required disabled={isSaving} /></div>
                    </div>
                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Beschreibung / Text</label>
                        <textarea bind:value={editText} rows="6" class="orga-input-clear py-2 text-sm resize-none custom-scrollbar" required disabled={isSaving}></textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" onclick={() => isEditing = false} class="orga-button-ghost py-2" disabled={isSaving}>Abbrechen</button>
                        <button type="submit" class="orga-button-primary py-2" disabled={isSaving}>{isSaving ? 'Speichert...' : 'Speichern'}</button>
                    </div>
                </form>
            {:else}
                {#if updateStore.updates.length === 0}
                    <div class="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">Bisher wurden keine Updates eingetragen.</div>
                {:else}
                    <!-- Vertikale Timeline-Linie -->
                    <div class="absolute left-3.75 top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800 rounded-full z-0"></div>
                    
                    <div class="space-y-8 relative z-10">
                        {#each updateStore.updates as update, i}
                            <div class="flex gap-6 items-start group">
                                <div class="w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shrink-0 mt-1 shadow-sm transition-colors {i === 0 ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-400'}"></div>
                                <div class="flex-1 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 p-5 rounded-2xl group-hover:border-indigo-200 dark:group-hover:border-indigo-600 group-hover:shadow-md transition-all relative">
                                    {#if isSuperAdmin}
                                        <div class="absolute top-4 right-4 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onclick={() => {
                                                editId = update.id; editNumber = update.number?.toString() || "";
                                                editDate = update.date ? update.date.substring(0, 10) : "";
                                                editText = update.text || ""; isEditing = true;
                                            }} class="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 rounded-lg flex items-center justify-center shadow-sm transition-colors" title="Bearbeiten">✎</button>
                                            <button onclick={async () => {
                                                if (confirm("Update wirklich löschen?")) {
                                                    await pb.collection('updates').delete(update.id);
                                                    await updateStore.check();
                                                }
                                            }} class="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 rounded-lg flex items-center justify-center shadow-sm transition-colors" title="Löschen">✕</button>
                                        </div>
                                    {/if}
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pr-16 sm:pr-20">
                                        <span class="font-bold text-lg text-slate-900 dark:text-slate-100">Version {update.number ? update.number.toString().replace(/^v/i, '') : 'Unbekannt'}</span>
                                        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-sm w-fit">{update.date ? new Date(update.date).toLocaleDateString('de-DE', {day:'2-digit', month:'long', year:'numeric'}) : 'Neuestes'}</span>
                                    </div>
                                    <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{update.text || 'Keine Beschreibung angegeben.'}</div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</dialog>