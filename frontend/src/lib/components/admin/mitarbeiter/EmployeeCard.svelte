<script lang="ts">
    import { Award, QrCode, Link, Edit3, Trash2 } from 'lucide-svelte';
    import type { UserRecord } from '$lib/types/orgaTypes';

    interface Props {
        emp: UserRecord;
        onOpenQr: (emp: UserRecord) => void;
        onOpenAssignment: (emp: UserRecord) => void;
        onEdit: (emp: UserRecord) => void;
        onDelete: (emp: UserRecord) => void;
    }

    let {
        emp,
        onOpenQr,
        onOpenAssignment,
        onEdit,
        onDelete
    }: Props = $props();

    let clientsCount = $derived(Array.isArray(emp.assigned_clients) ? emp.assigned_clients.length : 0);
    let contactsCount = $derived(Array.isArray(emp.assigned_contacts) ? emp.assigned_contacts.length : 0);
    let hasQr = $derived(Boolean(emp.quick_access_token));
</script>

<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group">
    <div>
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                    {emp.name_first ? emp.name_first[0] : 'M'}{emp.name_last ? emp.name_last[0] : ''}
                </div>
                <div class="min-w-0">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">
                        {emp.name_first} {emp.name_last}
                    </h3>
                    <p class="text-xs text-slate-500 truncate">{emp.email}</p>
                </div>
            </div>

            <!-- Status Badge -->
            <span class="text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 {
                emp.status === 'Urlaub' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                emp.status === 'Krank' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                emp.status === 'Inaktiv' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            }">
                {emp.status || 'Aktiv'}
            </span>
        </div>

        <!-- Meta Info Pills -->
        <div class="flex flex-wrap gap-2 mb-4 text-xs font-semibold">
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {emp.employment_type || 'Vollzeit'}
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                Rolle: {emp.role || 'employee'}
            </span>
        </div>

        <!-- Qualifikationen -->
        {#if emp.qualifications}
            <div class="mb-3">
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Award class="w-3 h-3 text-indigo-500" />
                    <span>Qualifikationen</span>
                </p>
                <p class="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                    {emp.qualifications}
                </p>
            </div>
        {/if}

        <!-- Zuweisungs-Zähler -->
        <div class="grid grid-cols-2 gap-2 my-3">
            <div class="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                <span class="text-[11px] text-slate-500 block">Klienten</span>
                <span class="text-base font-black text-indigo-600 dark:text-indigo-400">{clientsCount}</span>
            </div>
            <div class="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                <span class="text-[11px] text-slate-500 block">Kontakte (Read-Only)</span>
                <span class="text-base font-black text-amber-600 dark:text-amber-400">{contactsCount}</span>
            </div>
        </div>

        <!-- QR Code Status Banner -->
        <div class="mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between {hasQr ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
            <div class="flex items-center gap-1.5 truncate">
                <QrCode class="w-4 h-4 shrink-0" />
                <span class="truncate">
                    {hasQr ? 'QR-Code aktiv' : 'Kein aktiver QR-Zugang'}
                </span>
            </div>
            {#if hasQr && emp.token_expires_at}
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Bis {new Date(emp.token_expires_at).toLocaleDateString('de-DE')}
                </span>
            {/if}
        </div>
    </div>

    <!-- Card Actions -->
    <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
            type="button"
            onclick={() => onOpenQr(emp)}
            class="min-h-11 flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer touch-manipulation active:scale-95"
        >
            <QrCode class="w-4 h-4" />
            <span>QR-Zugang</span>
        </button>

        <button
            type="button"
            onclick={() => onOpenAssignment(emp)}
            class="min-h-11 flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
        >
            <Link class="w-4 h-4" />
            <span>Zuweisen</span>
        </button>

        <button
            type="button"
            onclick={() => onEdit(emp)}
            aria-label="Mitarbeiter bearbeiten"
            title="Mitarbeiter bearbeiten"
            class="min-h-11 min-w-11 px-2.5 py-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
        >
            <Edit3 class="w-4 h-4" />
        </button>

        <button
            type="button"
            onclick={() => onDelete(emp)}
            aria-label="Mitarbeiter unwiderruflich löschen"
            title="Mitarbeiter löschen"
            class="min-h-11 min-w-11 px-2.5 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
        >
            <Trash2 class="w-4 h-4" />
        </button>
    </div>
</div>
