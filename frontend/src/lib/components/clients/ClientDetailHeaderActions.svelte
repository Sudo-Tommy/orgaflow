<!-- src/lib/components/clients/ClientDetailHeaderActions.svelte -->
<script lang="ts">
    import { Calendar, FileText, Edit3, MoreHorizontal, Phone, Mail, UserCheck, Trash2 } from "lucide-svelte";

    interface Props {
        client: any;
        canDelete: boolean;
        canEdit?: boolean;
        canPlanAppointment?: boolean;
        canCreateInvoice?: boolean;
        isDeleting: boolean;
        isMobile?: boolean;
        onNewAppointment: () => void;
        onNewInvoice: () => void;
        onEdit: () => void;
        onQuickMail: () => void;
        onPortalAccess: () => void;
        onDelete: () => void;
    }

    let {
        client,
        canDelete,
        canEdit = true,
        canPlanAppointment = true,
        canCreateInvoice = true,
        isDeleting,
        isMobile = false,
        onNewAppointment,
        onNewInvoice,
        onEdit,
        onQuickMail,
        onPortalAccess,
        onDelete
    }: Props = $props();

    let showMoreMenu = $state(false);

    function toggleMoreMenu(e: MouseEvent) {
        e.stopPropagation();
        showMoreMenu = !showMoreMenu;
    }

    function handleWindowClick() {
        if (showMoreMenu) showMoreMenu = false;
    }
</script>

<svelte:window onclick={handleWindowClick} />

{#if isMobile}
    <!-- Mobile Action Row: Clean, horizontal touch bar with clear labels -->
    <div class="flex items-center gap-1.5 w-full pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {#if canPlanAppointment}
            <button
                type="button"
                onclick={onNewAppointment}
                class="flex-1 min-h-10 px-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Neuen Termin anlegen"
            >
                <Calendar class="w-3.5 h-3.5 shrink-0" />
                <span class="truncate">Termin</span>
            </button>
        {/if}

        {#if canCreateInvoice}
            <button
                type="button"
                onclick={onNewInvoice}
                class="flex-1 min-h-10 px-2.5 text-xs font-bold text-cyan-800 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Neue Rechnung erstellen"
            >
                <FileText class="w-3.5 h-3.5 shrink-0" />
                <span class="truncate">Rechnung</span>
            </button>
        {/if}

        {#if canEdit}
            <button
                type="button"
                onclick={onEdit}
                class="{canCreateInvoice ? 'w-10 min-w-10' : 'flex-1'} min-h-10 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Stammdaten bearbeiten"
            >
                <Edit3 class="w-3.5 h-3.5 shrink-0" />
                {#if !canCreateInvoice}
                    <span class="truncate">Bearbeiten</span>
                {/if}
            </button>
        {/if}

        <!-- More Menu on Mobile -->
        <div class="relative">
            <button
                type="button"
                onclick={toggleMoreMenu}
                aria-label="Weitere Aktionen"
                class="w-10 h-10 min-w-10 min-h-10 text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
            >
                <MoreHorizontal class="w-4 h-4" />
            </button>

            {#if showMoreMenu}
                <div class="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 text-slate-700 dark:text-slate-200 animate-enter backdrop-blur-md">
                    <button
                        type="button"
                        onclick={() => { showMoreMenu = false; onQuickMail(); }}
                        class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 transition-colors cursor-pointer text-amber-600 dark:text-amber-400"
                    >
                        <Mail class="w-4 h-4 shrink-0" />
                        <span>Quick-Mail Vorlage</span>
                    </button>
                    <button
                        type="button"
                        onclick={() => { showMoreMenu = false; onPortalAccess(); }}
                        class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400"
                    >
                        <UserCheck class="w-4 h-4 shrink-0" />
                        <span>Portal-Zugangsdaten</span>
                    </button>
                    {#if client?.phone}
                        <a
                            href={`tel:${client.phone}`}
                            class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 transition-colors text-emerald-600 dark:text-emerald-400"
                        >
                            <Phone class="w-4 h-4 shrink-0" />
                            <span>Anrufen ({client.phone})</span>
                        </a>
                    {/if}
                    {#if canDelete}
                        <div class="h-px bg-slate-100 dark:bg-slate-700/80 my-1"></div>
                        <button
                            type="button"
                            onclick={() => { showMoreMenu = false; onDelete(); }}
                            disabled={isDeleting}
                            class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer text-rose-600 dark:text-rose-400"
                        >
                            <Trash2 class="w-4 h-4 shrink-0" />
                            <span>Klient löschen</span>
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{:else}
    <!-- Desktop Actions Bar -->
    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
        {#if canPlanAppointment}
            <button
                type="button"
                onclick={onNewAppointment}
                class="min-h-10 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Neuen Termin anlegen"
            >
                <Calendar class="w-3.5 h-3.5 shrink-0" />
                <span>Termin</span>
            </button>
        {/if}

        {#if canCreateInvoice}
            <button
                type="button"
                onclick={onNewInvoice}
                class="min-h-10 px-3 text-xs font-bold text-cyan-800 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Neue Rechnung erstellen"
            >
                <FileText class="w-3.5 h-3.5 shrink-0" />
                <span>Rechnung</span>
            </button>
        {/if}

        {#if canEdit}
            <button
                type="button"
                onclick={onEdit}
                class="min-h-10 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Stammdaten bearbeiten"
            >
                <Edit3 class="w-3.5 h-3.5 shrink-0" />
                <span class="hidden md:inline">Bearbeiten</span>
            </button>
        {/if}

        <!-- More Menu -->
        <div class="relative">
            <button
                type="button"
                onclick={toggleMoreMenu}
                aria-label="Weitere Aktionen"
                class="w-10 h-10 min-w-10 min-h-10 text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
            >
                <MoreHorizontal class="w-4 h-4" />
            </button>

            {#if showMoreMenu}
                <div class="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 text-slate-700 dark:text-slate-200 animate-enter backdrop-blur-md">
                    <button
                        type="button"
                        onclick={() => { showMoreMenu = false; onQuickMail(); }}
                        class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 transition-colors cursor-pointer text-amber-600 dark:text-amber-400"
                    >
                        <Mail class="w-4 h-4 shrink-0" />
                        <span>Quick-Mail Vorlage</span>
                    </button>
                    <button
                        type="button"
                        onclick={() => { showMoreMenu = false; onPortalAccess(); }}
                        class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400"
                    >
                        <UserCheck class="w-4 h-4 shrink-0" />
                        <span>Portal-Zugangsdaten</span>
                    </button>
                    {#if client?.phone}
                        <a
                            href={`tel:${client.phone}`}
                            class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 transition-colors text-emerald-600 dark:text-emerald-400"
                        >
                            <Phone class="w-4 h-4 shrink-0" />
                            <span>Anrufen ({client.phone})</span>
                        </a>
                    {/if}
                    {#if canDelete}
                        <div class="h-px bg-slate-100 dark:bg-slate-700/80 my-1"></div>
                        <button
                            type="button"
                            onclick={() => { showMoreMenu = false; onDelete(); }}
                            disabled={isDeleting}
                            class="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer text-rose-600 dark:text-rose-400"
                        >
                            <Trash2 class="w-4 h-4 shrink-0" />
                            <span>Klient löschen</span>
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{/if}
