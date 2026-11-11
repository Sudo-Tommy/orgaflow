<!-- src/lib/components/systemDialog/AdminSendDialogModal.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { systemDialogService } from "$lib/services/systemDialogService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Send, X, ShieldAlert, AlertTriangle, Info, Paperclip, Users, User, Trash2 } from "lucide-svelte";

    let dialog = $state<HTMLDialogElement>();
    let title = $state("");
    let message = $state("");
    let priority = $state<'urgent' | 'important' | 'info'>('urgent');
    let isBroadcast = $state(false);
    let selectedUserIds = $state<string[]>([]);
    let selectedFiles = $state<File[]>([]);
    let isSending = $state(false);

    $effect(() => {
        if (systemDialogService.isSendModalOpen && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!systemDialogService.isSendModalOpen && dialog && dialog.open) {
            dialog.close();
        }
    });

    let allUsers = $derived.by(() => {
        const list = (orgaStore.users?.data as any[]) || [];
        const currentId = pb.authStore.record?.id || pb.authStore.model?.id;
        return list
            .filter(u => u.id !== currentId)
            .sort((a, b) => (a.name_first || '').localeCompare(b.name_first || '', 'de', { sensitivity: 'base' }));
    });

    onMount(() => {
        const handleFollowUp = (e: any) => {
            if (e.detail?.recipientId) {
                isBroadcast = false;
                selectedUserIds = [e.detail.recipientId];
                if (e.detail.title) title = e.detail.title;
                if (e.detail.message) message = e.detail.message;
                if (e.detail.priority) priority = e.detail.priority;
            }
        };
        window.addEventListener('compose-follow-up-dialog', handleFollowUp);
        return () => window.removeEventListener('compose-follow-up-dialog', handleFollowUp);
    });

    function toggleUser(id: string) {
        if (selectedUserIds.includes(id)) {
            selectedUserIds = selectedUserIds.filter(u => u !== id);
        } else {
            selectedUserIds = [...selectedUserIds, id];
        }
    }

    function handleFileChange(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files) return;
        selectedFiles = [...selectedFiles, ...Array.from(input.files)];
        input.value = "";
    }

    async function handleSend() {
        if (!title.trim() || !message.trim()) {
            toastStore.warning("Bitte Titel und Mitteilung eingeben.");
            return;
        }
        if (!isBroadcast && selectedUserIds.length === 0) {
            toastStore.warning("Bitte mindestens einen Empfänger wählen oder 'Alle Mitarbeiter' aktivieren.");
            return;
        }

        isSending = true;
        try {
            const currentUserId = pb.authStore.record?.id || pb.authStore.model?.id;
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('message', message.trim());
            formData.append('priority', priority);
            formData.append('sender', currentUserId || '');
            formData.append('is_active', 'true');

            if (isBroadcast) {
                for (const u of allUsers) formData.append('recipients', u.id);
            } else {
                for (const uid of selectedUserIds) formData.append('recipients', uid);
            }

            for (const file of selectedFiles) {
                formData.append('attachments', file, file.name);
            }

            await pb.collection('system_dialogs').create(formData, { requestKey: null });
            toastStore.success(isBroadcast ? "Anweisung an alle Mitarbeiter gesendet!" : `An ${selectedUserIds.length} Mitarbeiter gesendet!`);

            title = "";
            message = "";
            selectedUserIds = [];
            selectedFiles = [];
            systemDialogService.isSendModalOpen = false;
            systemDialogService.loadSentDialogs();
        } catch (err: any) {
            toastStore.error(err?.message || "Fehler beim Senden der Anweisung.");
        } finally {
            isSending = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) systemDialogService.isSendModalOpen = false; }}
    oncancel={(e) => { e.preventDefault(); systemDialogService.isSendModalOpen = false; }}
>
    {#if systemDialogService.isSendModalOpen}
        <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-enter">
            <!-- Header -->
            <div class="p-4 sm:p-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">💬</div>
                    <div>
                        <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">Wichtige Eil-Mitteilung senden</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Erscheint sofort als wichtiges Hinweis-Fenster beim Mitarbeiter</p>
                    </div>
                </div>
                <button type="button" onclick={() => systemDialogService.isSendModalOpen = false} class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Body -->
            <div class="p-4 sm:p-6 space-y-4">
                <!-- Dringlichkeits-Stufen -->
                <div class="space-y-1.5">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Dringlichkeit &amp; Alarmstufe:</span>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" onclick={() => priority = 'urgent'} class="p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer {priority === 'urgent' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-400/50' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}">
                            <ShieldAlert class="w-4 h-4 text-rose-500" />
                            <span>🔴 Dringend</span>
                        </button>
                        <button type="button" onclick={() => priority = 'important'} class="p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer {priority === 'important' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400/50' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}">
                            <AlertTriangle class="w-4 h-4 text-amber-500" />
                            <span>🟡 Wichtig</span>
                        </button>
                        <button type="button" onclick={() => priority = 'info'} class="p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer {priority === 'info' ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400/50' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}">
                            <Info class="w-4 h-4 text-indigo-500" />
                            <span>🔵 Information</span>
                        </button>
                    </div>
                </div>

                <!-- Titel -->
                <div class="space-y-1">
                    <label for="admin-dialog-title" class="text-xs font-bold text-slate-700 dark:text-slate-300">Titel / Betreff *</label>
                    <input id="admin-dialog-title" type="text" bind:value={title} placeholder="z. B. Wichtiger Hinweis zu Klient Müller" class="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <!-- Nachricht -->
                <div class="space-y-1">
                    <label for="admin-dialog-msg" class="text-xs font-bold text-slate-700 dark:text-slate-300">Anweisung / Mitteilung *</label>
                    <textarea id="admin-dialog-msg" bind:value={message} rows="4" placeholder="Schreibe hier die klare Anweisung oder Mitteilung..." class="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"></textarea>
                </div>

                <!-- Empfänger-Auswahl -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Empfänger:</span>
                        <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            <input type="checkbox" bind:checked={isBroadcast} class="w-4 h-4 rounded text-indigo-600" />
                            <span>📢 An ALLE Mitarbeiter senden</span>
                        </label>
                    </div>

                    {#if !isBroadcast}
                        <div class="max-h-36 overflow-y-auto p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                            {#each allUsers as u}
                                {@const isChecked = selectedUserIds.includes(u.id)}
                                <button type="button" onclick={() => toggleUser(u.id)} class="w-full p-2 rounded-xl flex items-center justify-between text-xs font-bold transition-colors cursor-pointer {isChecked ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200'}">
                                    <span class="flex items-center gap-2">
                                        <User class="w-3.5 h-3.5 opacity-70" />
                                        <span>{u.name_first} {u.name_last || ''}</span>
                                        <span class="text-[10px] font-normal opacity-70">({u.role || 'Mitarbeiter'})</span>
                                    </span>
                                    <span>{isChecked ? '✓' : '+'}</span>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Dateianhang -->
                <div class="flex items-center gap-3 pt-1 flex-wrap">
                    <label class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors">
                        <Paperclip class="w-4 h-4" />
                        <span>Datei / Foto anhängen</span>
                        <input type="file" multiple onchange={handleFileChange} class="hidden" />
                    </label>

                    {#each selectedFiles as f, idx}
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                            {f.name}
                            <button type="button" onclick={() => selectedFiles = selectedFiles.filter((_, i) => i !== idx)} class="text-rose-500 hover:text-rose-700 cursor-pointer"><X class="w-3 h-3" /></button>
                        </span>
                    {/each}
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 sm:p-6 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button type="button" onclick={() => systemDialogService.isSendModalOpen = false} class="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer">
                    Abbrechen
                </button>
                <button type="button" onclick={handleSend} disabled={isSending} class="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50">
                    <Send class="w-4 h-4" />
                    <span>{isSending ? 'Wird gesendet...' : 'Mitteilung jetzt senden'}</span>
                </button>
            </div>
        </div>
    {/if}
</dialog>
