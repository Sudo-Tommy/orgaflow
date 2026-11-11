<!-- src/lib/components/clients/ClientNotesMigrationNotice.svelte -->
<script lang="ts">
    import type { ClientRecord } from '$lib/types/orgaTypes';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        detectBillingTypeFromNotes, 
        getBillingTypeDef, 
        cleanNotesFromBillingType, 
        saveClientBillingType 
    } from '$lib/services/clientBillingService';
    import { Sparkles, Check, X } from 'lucide-svelte';

    let {
        client,
        notes = $bindable(''),
        onMigrated
    }: {
        client?: ClientRecord | any;
        notes?: string;
        onMigrated?: () => void;
    } = $props();

    let dismissed = $state(false);
    let isApplying = $state(false);

    let detectedType = $derived(
        dismissed ? null : detectBillingTypeFromNotes(notes || client?.notes)
    );
    let detectedDef = $derived(detectedType ? getBillingTypeDef(detectedType) : null);

    let shouldShow = $derived(
        detectedType !== null && 
        (!client?.billing_type || client.billing_type !== detectedType)
    );

    async function applyAndClean() {
        if (!detectedType) return;
        isApplying = true;

        try {
            const currentNotes = notes || client?.notes || '';
            const cleanedNotes = cleanNotesFromBillingType(currentNotes, detectedType);

            await saveClientBillingType(client, detectedType, { syncTemplate: true, updateRates: true });

            await pb.collection('clients').update(client.id, { notes: cleanedNotes });
            client.notes = cleanedNotes;
            notes = cleanedNotes;

            toastStore.success(`Abrechnungsart "${detectedDef?.shortLabel}" übernommen und Notiz bereinigt.`);
            dismissed = true;
            if (onMigrated) onMigrated();
        } catch (err: any) {
            console.error('Fehler beim Übernehmen der Abrechnungsart:', err);
            toastStore.error('Konnte Notiz nicht automatisch migrieren.');
        } finally {
            isApplying = false;
        }
    }

    async function applyOnly() {
        if (!detectedType) return;
        isApplying = true;

        try {
            await saveClientBillingType(client, detectedType, { syncTemplate: true, updateRates: true });
            toastStore.success(`Abrechnungsart "${detectedDef?.shortLabel}" übernommen.`);
            dismissed = true;
            if (onMigrated) onMigrated();
        } catch (err: any) {
            console.error('Fehler beim Übernehmen:', err);
        } finally {
            isApplying = false;
        }
    }
</script>

{#if shouldShow && detectedDef}
    <div class="p-3.5 bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-white dark:from-indigo-950/70 dark:via-purple-950/60 dark:to-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/70 shadow-xs flex flex-col gap-2.5 animate-enter">
        <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2 min-w-0">
                <span class="w-6 h-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles class="w-3.5 h-3.5" />
                </span>
                <div class="min-w-0">
                    <p class="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                        Abrechnungsart erkannt:
                    </p>
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black mt-1 {detectedDef.badgeClass}">
                        {detectedDef.label}
                    </span>
                </div>
            </div>
            <button
                type="button"
                onclick={() => (dismissed = true)}
                class="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Hinweis ausblenden"
                aria-label="Hinweis ausblenden"
            >
                <X class="w-4 h-4" />
            </button>
        </div>

        <p class="text-[11px] text-neutral-600 dark:text-slate-300 leading-snug">
            Möchten Sie dieses Kürzel als feste Abrechnungsart für Rechnungen übernehmen?
        </p>

        <!-- Aktionen sauber untereinander / als Pillen ohne Überlappung -->
        <div class="flex items-center gap-1.5 pt-0.5 flex-wrap">
            <button
                type="button"
                onclick={applyAndClean}
                disabled={isApplying}
                class="flex-1 min-w-[140px] py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                title="Übernimmt die Abrechnungsart und entfernt das Kürzel aus den Notizen"
            >
                <Check class="w-3.5 h-3.5" />
                <span>Übernehmen & bereinigen</span>
            </button>

            <button
                type="button"
                onclick={applyOnly}
                disabled={isApplying}
                class="py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 border border-neutral-200 dark:border-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Nur als Abrechnungsart setzen, Notiz nicht verändern"
            >
                <span>Nur setzen</span>
            </button>
        </div>
    </div>
{/if}
