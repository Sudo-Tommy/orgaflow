<script lang="ts">
    import { onMount } from 'svelte';
    import { UserPlus, Check, X, Loader2, Building2, User } from 'lucide-svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { saveNewBudgetPartner } from './partnerSearchService';

    interface Props {
        initialName: string;
        onClose: () => void;
        onCreated: (name: string) => void;
    }

    let { initialName, onClose, onCreated }: Props = $props();

    let dialog: HTMLDialogElement;
    let newPartnerName = $state('');
    let newPartnerType = $state<'person' | 'company'>('person');
    let isSaving = $state(false);

    $effect(() => {
        newPartnerName = initialName;
    });

    onMount(() => {
        dialog?.showModal();
    });

    async function handleSave() {
        if (!newPartnerName.trim()) {
            toastStore.warning('Bitte geben Sie einen Namen ein.');
            return;
        }
        isSaving = true;
        try {
            await saveNewBudgetPartner(newPartnerName, newPartnerType);
            const name = newPartnerName.trim();
            toastStore.success(`Partner „${name}“ gespeichert.`);
            onCreated(name);
        } catch (err: any) {
            console.warn('[PartnerQuickCreateDialog] Fehler beim Speichern:', err);
            const name = newPartnerName.trim();
            toastStore.success(`Partner „${name}“ übernommen.`);
            onCreated(name);
        } finally {
            isSaving = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-2xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) onClose(); }}
    oncancel={(e) => { e.preventDefault(); onClose(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-enter">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <UserPlus class="w-4 h-4" />
                </div>
                <h3 class="font-bold text-slate-900 dark:text-slate-100 text-sm">Neuen Partner anlegen</h3>
            </div>
            <button
                type="button"
                onclick={onClose}
                class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            >
                <X class="w-4 h-4" />
            </button>
        </div>

        <div class="p-5 space-y-4">
            <div>
                <label for="new-partner-name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Name / Bezeichnung *
                </label>
                <input
                    id="new-partner-name"
                    type="text"
                    bind:value={newPartnerName}
                    placeholder="z. B. Vodafone GmbH, Max Mustermann"
                    class="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
            </div>

            <div>
                <span class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Typ</span>
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onclick={() => (newPartnerType = 'person')}
                        class="min-h-[44px] rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation {newPartnerType === 'person'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}"
                    >
                        <User class="w-4 h-4" />
                        <span>Person</span>
                    </button>
                    <button
                        type="button"
                        onclick={() => (newPartnerType = 'company')}
                        class="min-h-[44px] rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation {newPartnerType === 'company'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}"
                    >
                        <Building2 class="w-4 h-4" />
                        <span>Unternehmen</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-2.5 justify-end">
            <button
                type="button"
                onclick={onClose}
                class="orga-button-ghost py-2.5 px-4 text-sm font-semibold cursor-pointer min-h-[44px] touch-manipulation"
            >
                Abbrechen
            </button>
            <button
                type="button"
                onclick={handleSave}
                disabled={isSaving || !newPartnerName.trim()}
                class="orga-button-primary py-2.5 px-4 text-sm font-bold cursor-pointer flex items-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {#if isSaving}
                    <Loader2 class="w-3.5 h-3.5 animate-spin" />
                {:else}
                    <Check class="w-3.5 h-3.5" />
                {/if}
                <span>Partner speichern</span>
            </button>
        </div>
    </div>
</dialog>
