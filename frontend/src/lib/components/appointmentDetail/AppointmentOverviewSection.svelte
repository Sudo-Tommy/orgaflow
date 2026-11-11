<script lang="ts">
    import { FileText, Edit3, ShieldCheck } from "lucide-svelte";
    import AppointmentBasicInfoCard from "./AppointmentBasicInfoCard.svelte";
    import AppointmentChecklist from "./AppointmentChecklist.svelte";
    import { autoGrow } from "$lib/actions/autoGrow";

    interface Props {
        appointment: any;
        client: any;
        fullClient: any;
        assignedUser: any;
        onOpenClientModal?: (clientId: string) => void;
        onOpenReminder?: () => void;
        onOpenCancel?: () => void;
        onSaveNotes: (notes: string) => Promise<boolean>;
        onSaveDescription: (desc: string) => Promise<boolean>;
        onSaveDateTime: (dateStr: string, startTime: string, endTime?: string) => Promise<boolean>;
        onSaveUser: (userId: string) => Promise<boolean>;
        onSaveClient: (clientId: string) => Promise<boolean>;
        onSaveAddress: (address: string, contactId?: string) => Promise<boolean>;
        onSavePickupAddress?: (address: string) => Promise<boolean>;
        onSelectTab?: (tab: any) => void;
    }

    let {
        appointment,
        client,
        fullClient,
        assignedUser,
        onOpenCancel,
        onSaveNotes,
        onSaveDescription,
        onSaveDateTime,
        onSaveUser,
        onSaveClient,
        onSaveAddress,
        onSavePickupAddress,
        onSelectTab
    }: Props = $props();

    let isEditingNotes = $state(false), notesValue = $state("");
    let isEditingDesc = $state(false), descValue = $state("");

    let effectiveClient = $derived(fullClient || client);

    $effect(() => {
        if (appointment) {
            if (!isEditingNotes) notesValue = appointment.notes || "";
            if (!isEditingDesc) descValue = appointment.description?.replace('[BLOCK]', '').trim() || "";
        }
    });
</script>

<div class="space-y-4">
    <!-- Abgesagt Banner (nur sichtbar falls abgesagt) -->
    {#if appointment?.status === 'abgesagt'}
        <div class="bg-rose-50/90 dark:bg-rose-950/40 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/60 shadow-xs flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
                <span class="text-xl shrink-0 mt-0.5">🚫</span>
                <div class="min-w-0">
                    <h4 class="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Dieser Termin ist abgesagt</h4>
                    {#if appointment.cancellation_reason}
                        <p class="text-sm font-semibold text-rose-950 dark:text-rose-100 mt-0.5 break-words">
                            ⚠️ Ausfallgrund: {appointment.cancellation_reason}
                        </p>
                    {:else}
                        <p class="text-xs text-rose-700/80 dark:text-rose-400 mt-0.5 italic">
                            Kein Ausfallgrund hinterlegt.
                        </p>
                    {/if}
                </div>
            </div>
            {#if onOpenCancel}
                <button
                    type="button"
                    onclick={onOpenCancel}
                    class="shrink-0 text-xs font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                    Grund ändern
                </button>
            {/if}
        </div>
    {/if}

    <!-- 1. Einheitliche, kompakte Kern-Info Karte (Zeit, Klient, Betreuer, Ort) -->
    <AppointmentBasicInfoCard
        {appointment}
        client={effectiveClient}
        {assignedUser}
        {onSaveDateTime}
        {onSaveUser}
        {onSaveClient}
        {onSaveAddress}
        {onSavePickupAddress}
        onOpenClientTab={() => onSelectTab?.('client')}
    />

    <!-- 2. Beschreibung & Interne Notizen im 2-Spalten-Raster -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <!-- Beschreibung -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 shadow-2xs flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-center mb-1.5">
                    <p class="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                        <FileText class="w-3.5 h-3.5" /> Termin-Beschreibung
                    </p>
                    {#if !isEditingDesc}
                        <button type="button" onclick={() => isEditingDesc = true} class="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer">
                            <Edit3 class="w-3 h-3" /> Bearbeiten
                        </button>
                    {/if}
                </div>
                {#if isEditingDesc}
                    <textarea use:autoGrow bind:value={descValue} class="auto-grow w-full text-xs p-2 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-blue-300 resize-none overflow-hidden" placeholder="Beschreibung..."></textarea>
                    <div class="flex gap-2 mt-1.5 justify-end">
                        <button type="button" onclick={() => isEditingDesc = false} class="px-2.5 py-1 text-xs text-neutral-600 bg-neutral-100 rounded-lg cursor-pointer">Abbrechen</button>
                        <button type="button" onclick={async () => { if (await onSaveDescription(descValue)) isEditingDesc = false; }} class="px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg cursor-pointer">Speichern</button>
                    </div>
                {:else}
                    <p class="text-xs text-neutral-800 dark:text-slate-200 whitespace-pre-wrap">{descValue || 'Keine Beschreibung vorhanden.'}</p>
                {/if}
            </div>
        </div>

        <!-- Interne Notizen -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 shadow-2xs flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-center mb-1.5">
                    <p class="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck class="w-3.5 h-3.5" /> Interne Notizen
                    </p>
                    {#if !isEditingNotes}
                        <button type="button" onclick={() => isEditingNotes = true} class="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer">
                            <Edit3 class="w-3 h-3" /> Bearbeiten
                        </button>
                    {/if}
                </div>
                {#if isEditingNotes}
                    <textarea use:autoGrow bind:value={notesValue} class="auto-grow w-full text-xs p-2 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-rose-300 resize-none overflow-hidden" placeholder="Interne Team-Notizen..."></textarea>
                    <div class="flex gap-2 mt-1.5 justify-end">
                        <button type="button" onclick={() => isEditingNotes = false} class="px-2.5 py-1 text-xs text-neutral-600 bg-neutral-100 rounded-lg cursor-pointer">Abbrechen</button>
                        <button type="button" onclick={async () => { if (await onSaveNotes(notesValue)) isEditingNotes = false; }} class="px-3 py-1 text-xs font-bold text-white bg-rose-600 rounded-lg cursor-pointer">Speichern</button>
                    </div>
                {:else}
                    <p class="text-xs text-neutral-800 dark:text-slate-200 whitespace-pre-wrap">{notesValue || 'Keine internen Notizen.'}</p>
                {/if}
            </div>
        </div>
    </div>

    <!-- 3. Vor-Ort Checkliste (falls vorhanden) -->
    {#if appointment?.id}
        <AppointmentChecklist
            appointmentId={appointment.id}
            initialChecklist={appointment.checklist || []}
            isSettled={Boolean(appointment.settled)}
        />
    {/if}
</div>
