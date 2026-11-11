<script lang="ts">
    import { updateStore } from "$lib/services/updateService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { autoGrow } from "$lib/actions/autoGrow";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { systemDialogService } from "$lib/services/systemDialogService.svelte";
    import { Bell, Sparkles } from "lucide-svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner);

    let isEditing = $state(false);
    let editId = $state<string | null>(null);
    let editNumber = $state<string>("");
    let editDate = $state("");
    let editText = $state("");
    let sendAsUrgentNotice = $state(true);
    let isSaving = $state(false);

    const SHORT_SIMPLE_TEMPLATE = `✨ Übersichtliche Liste (wie bei Gmail) mit Schnellfiltern für Zeitraum & Anhänge\n📨 Einheitlicher OrgaFlow-Briefbogen automatisch für alle gesendeten E-Mails\n💬 Antworten & Zitate platzsparend zum Aufklappen ("⋯ Ursprüngliche Nachricht")`;

    $effect(() => {
        if (updateStore.isOpen) {
            dialog?.showModal();
            isEditing = false;
            
            const user = pb.authStore.model;
            if (user) {
                updateStore.updates.forEach(async (u: any) => {
                    let readBy = Array.isArray(u.read_by) ? u.read_by : (u.read_by ? [u.read_by] : []);
                    if (!readBy.includes(user.id)) {
                        readBy = [...readBy, user.id];
                        try {
                            await pb.collection('updates').update(u.id, { read_by: readBy }, { requestKey: null });
                            u.read_by = readBy;
                        } catch {}
                    }
                });
            }
        } else {
            dialog?.close();
        }
    });

    async function broadcastUpdateAsDialog(versionStr: string, textStr: string) {
        try {
            const currentUserId = pb.authStore.record?.id || pb.authStore.model?.id;
            const users = await pb.collection('users').getFullList({ fields: 'id', requestKey: null }).catch(() => []);
            const formData = new FormData();
            formData.append('title', `✨ Neues Update (v${versionStr.replace(/^v/i, '')}) – Kurz & Einfach`);
            formData.append('message', textStr.trim());
            formData.append('priority', 'info');
            formData.append('is_broadcast', 'true');
            formData.append('is_active', 'true');
            if (currentUserId) formData.append('sender', currentUserId);
            for (const u of users) {
                if (u.id !== currentUserId) formData.append('recipients', u.id);
            }
            await pb.collection('system_dialogs').create(formData, { requestKey: null });
            systemDialogService.loadSentDialogs();
            toastStore.success("Update als kurze Eilmitteilung an alle gesendet!");
        } catch (err) {
            console.warn("Konnte Eilmitteilung nicht senden:", err);
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) updateStore.close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" onclick={() => updateStore.close()} class="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors z-20 cursor-pointer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="mb-6 border-b border-slate-100 dark:border-slate-800 pb-5 pr-12 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
                <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                    <span class="text-amber-500">✨</span>
                    <span>Was ist neu? (Kurz &amp; Einfach)</span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                    Alle Neuerungen in OrgaFlow kurz und verständlich auf einen Blick zusammengefasst.
                </p>
            </div>
            {#if isSuperAdmin && !isEditing}
                <button onclick={() => {
                    editId = null;
                    let nextNum = "2.5.0";
                    if (updateStore.updates.length > 0 && updateStore.updates[0].number) {
                        nextNum = updateStore.updates[0].number.toString().replace(/(\d+)(?!.*\d)/, (match: string) => (parseInt(match, 10) + 1).toString());
                    }
                    editNumber = nextNum;
                    editDate = new Date().toISOString().split('T')[0];
                    editText = SHORT_SIMPLE_TEMPLATE;
                    sendAsUrgentNotice = true;
                    isEditing = true;
                }} class="orga-button-primary py-2.5 px-4 text-xs font-bold shrink-0 cursor-pointer">+ Neues Kurz-Update</button>
            {/if}
        </div>

        <div class="relative">
            {#if isEditing}
                <form onsubmit={async (e) => {
                    e.preventDefault();
                    isSaving = true;
                    try {
                        const data = { number: editNumber, date: editDate ? new Date(editDate).toISOString() : new Date().toISOString(), text: editText };
                        if (editId) await pb.collection('updates').update(editId, data);
                        else await pb.collection('updates').create(data);
                        if (sendAsUrgentNotice) {
                            await broadcastUpdateAsDialog(editNumber, editText);
                        }
                        await updateStore.check();
                        isEditing = false;
                        toastStore.success("Update gespeichert!");
                    } catch (err) {
                        console.error(err);
                        toastStore.error("Fehler beim Speichern.");
                    } finally { isSaving = false; }
                }} class="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="font-bold text-slate-900 dark:text-slate-100">{editId ? 'Update bearbeiten' : 'Neues Kurz-Update anlegen'}</h3>
                        <button type="button" onclick={() => editText = SHORT_SIMPLE_TEMPLATE} class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                            <Sparkles class="w-3.5 h-3.5" /> Vorlage einfügen
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="upd-ver" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Versions-Nr.</label>
                            <input id="upd-ver" type="text" placeholder="z.B. 2.5.0" bind:value={editNumber} class="orga-input-clear py-2 text-sm" required disabled={isSaving} />
                        </div>
                        <div>
                            <label for="upd-date" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Datum</label>
                            <input id="upd-date" type="date" bind:value={editDate} class="orga-input-clear py-2 text-sm" required disabled={isSaving} />
                        </div>
                    </div>
                    <div>
                        <label for="upd-txt" class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Kurz &amp; Einfach (3–4 klare Stichpunkte ohne Fachbegriffe):</label>
                        <textarea id="upd-txt" use:autoGrow bind:value={editText} rows="4" class="orga-input-clear py-2 text-sm auto-grow" required disabled={isSaving}></textarea>
                    </div>
                    <label class="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 cursor-pointer">
                        <input type="checkbox" bind:checked={sendAsUrgentNotice} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                        <span class="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <Bell class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Gleichzeitig als freundliche Eilmitteilung an alle Mitarbeiter senden</span>
                        </span>
                    </label>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" onclick={() => isEditing = false} class="orga-button-ghost py-2 cursor-pointer" disabled={isSaving}>Abbrechen</button>
                        <button type="submit" class="orga-button-primary py-2 px-5 cursor-pointer" disabled={isSaving}>{isSaving ? 'Speichert...' : 'Speichern & Veröffentlichen'}</button>
                    </div>
                </form>
            {:else if updateStore.updates.length === 0}
                <div class="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">Bisher wurden keine Updates eingetragen.</div>
            {:else}
                <div class="space-y-4">
                    {#each updateStore.updates as update, i}
                        <div class="bg-slate-50/80 dark:bg-slate-800/50 border {i === 0 ? 'border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-500/20' : 'border-slate-200/80 dark:border-slate-700/80'} p-4 sm:p-5 rounded-2xl transition-all relative">
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                <div class="flex items-center gap-2">
                                    {#if i === 0}
                                        <span class="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-500 text-white rounded-full">Neu</span>
                                    {/if}
                                    <span class="font-extrabold text-base text-slate-900 dark:text-slate-100">
                                        Update {update.number ? update.number.toString().replace(/^v/i, '') : ''}
                                    </span>
                                    <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        • {update.date ? new Date(update.date).toLocaleDateString('de-DE', {day:'2-digit', month:'short', year:'numeric'}) : 'Aktuell'}
                                    </span>
                                </div>

                                {#if isSuperAdmin}
                                    <div class="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onclick={() => broadcastUpdateAsDialog(update.number?.toString() || 'Neu', update.text || '')}
                                            class="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Dieses Update jetzt als Eilmitteilung an alle senden"
                                        >
                                            <Bell class="w-3 h-3" /> <span>Als Eilmitteilung senden</span>
                                        </button>
                                        <button onclick={() => {
                                            editId = update.id; editNumber = update.number?.toString() || "";
                                            editDate = update.date ? update.date.substring(0, 10) : "";
                                            editText = update.text || ""; sendAsUrgentNotice = false; isEditing = true;
                                        }} class="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 rounded-lg flex items-center justify-center cursor-pointer" title="Bearbeiten">✎</button>
                                        <button onclick={async () => {
                                            if (confirm("Update wirklich löschen?")) {
                                                await pb.collection('updates').delete(update.id);
                                                await updateStore.check();
                                            }
                                        }} class="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 rounded-lg flex items-center justify-center cursor-pointer" title="Löschen">✕</button>
                                    </div>
                                {/if}
                            </div>
                            <div class="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">{update.text || 'Keine Beschreibung angegeben.'}</div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</dialog>
