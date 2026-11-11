<!-- src/lib/components/clients/ClientDetailHeader.svelte -->
<script lang="ts">
    import { X, AlertTriangle, Phone } from "lucide-svelte";
    import { safeFormatDate } from "$lib/services/clientDetailHelper";
    import ClientBillingBadge from "./ClientBillingBadge.svelte";
    import ClientDetailHeaderActions from "./ClientDetailHeaderActions.svelte";

    interface Props {
        client: any;
        clientId: string | null;
        clientAge: number | null;
        clientCompletion: any;
        canDelete: boolean;
        canEdit?: boolean;
        canPlanAppointment?: boolean;
        canCreateInvoice?: boolean;
        isDeleting: boolean;
        onNewAppointment: () => void;
        onNewInvoice: () => void;
        onEdit: () => void;
        onQuickMail: () => void;
        onPortalAccess: () => void;
        onDelete: () => void;
        onClose: () => void;
    }

    let {
        client,
        clientId,
        clientAge,
        clientCompletion,
        canDelete,
        canEdit = true,
        canPlanAppointment = true,
        canCreateInvoice = true,
        isDeleting,
        onNewAppointment,
        onNewInvoice,
        onEdit,
        onQuickMail,
        onPortalAccess,
        onDelete,
        onClose
    }: Props = $props();

    const actionProps = $derived({
        client,
        canDelete,
        canEdit,
        canPlanAppointment,
        canCreateInvoice,
        isDeleting,
        onNewAppointment,
        onNewInvoice,
        onEdit,
        onQuickMail,
        onPortalAccess,
        onDelete
    });
</script>

<header class="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 sm:gap-4 rounded-t-3xl shadow-xs">
    <!-- Top Row on Mobile / Left Identity on Desktop -->
    <div class="flex items-start sm:items-center justify-between gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
        <div class="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <!-- Avatar im Benchmark Icon-Box Style -->
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center font-black text-sm sm:text-base shadow-xs shrink-0 relative mt-0.5 sm:mt-0">
                {(client?.name_first?.[0] || '')}{(client?.name_last?.[0] || 'K')}
                <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 {client?.status === 'inaktiv' ? 'bg-slate-400' : 'bg-emerald-500'}"></span>
            </div>

            <!-- Name and Badges -->
            <div class="min-w-0 flex-1">
                <div class="flex items-baseline sm:items-center gap-2 flex-wrap">
                    <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug break-words">
                        {client?.name_first || ''} {client?.name_last || 'Klient'}
                    </h2>

                    {#if client?.level_of_care}
                        <span class="px-2 py-0.5 text-[10px] font-black rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0">
                            PG {client.level_of_care}
                        </span>
                    {/if}

                    {#if client?.billing_type && canCreateInvoice}
                        <div class="inline-flex shrink-0">
                            <ClientBillingBadge {client} compact={true} />
                        </div>
                    {/if}

                    {#if clientCompletion && !clientCompletion.isComplete}
                        <button
                            type="button"
                            onclick={onEdit}
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-all cursor-pointer shrink-0"
                            title="Klientendaten noch unvollständig. Klicken zum Bearbeiten."
                        >
                            <AlertTriangle class="w-3 h-3 text-amber-500" />
                            <span>{clientCompletion.score}% Daten</span>
                        </button>
                    {/if}
                </div>

                <!-- Sub info: Phone & Birthdate -->
                <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex-wrap">
                    {#if client?.birthdate}
                        <span class="text-[11px] sm:text-xs">
                            🎂 {safeFormatDate(client.birthdate)}{clientAge !== null ? ` (${clientAge} J.)` : ''}
                        </span>
                    {/if}
                    {#if client?.phone}
                        {#if client?.birthdate}<span class="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>{/if}
                        <a href={`tel:${client.phone}`} class="text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-1 hover:underline text-[11px] sm:text-xs">
                            <Phone class="w-3 h-3" /> {client.phone}
                        </a>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Mobile Close Button (Top-Right) -->
        <button
            type="button"
            aria-label="Schließen"
            onclick={onClose}
            class="sm:hidden w-10 h-10 min-w-10 min-h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700 mt-0.5"
            title="Schließen (ESC)"
        >
            <X class="w-5 h-5" />
        </button>
    </div>

    <!-- Mobile Action Row (Underneath identity on small screens) -->
    <div class="sm:hidden w-full">
        <ClientDetailHeaderActions isMobile={true} {...actionProps} />
    </div>

    <!-- Desktop Actions Bar & Close Button -->
    <div class="hidden sm:flex items-center gap-2 shrink-0">
        <ClientDetailHeaderActions isMobile={false} {...actionProps} />

        <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

        <button
            type="button"
            aria-label="Schließen"
            onclick={onClose}
            class="w-10 h-10 min-w-10 min-h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Schließen (ESC)"
        >
            <X class="w-5 h-5" />
        </button>
    </div>
</header>
