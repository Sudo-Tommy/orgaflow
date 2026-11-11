<script lang="ts">
    import type { ContactRecord } from "$lib/types/orgaTypes";

    let {
        isDoctorAppointment,
        selectedDoctorOrAuthority,
        onOpenPicker,
        onClear,
    }: {
        isDoctorAppointment: boolean;
        selectedDoctorOrAuthority: ContactRecord | null;
        onOpenPicker: () => void;
        onClear: () => void;
    } = $props();
</script>

<div
    class="flex items-center justify-between p-2.5 rounded-xl border transition-colors {isDoctorAppointment
        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60'}"
>
    <div class="flex items-center gap-2.5 min-w-0">
        <div
            class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 {isDoctorAppointment
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}"
        >
            🩺
        </div>
        <div class="min-w-0">
            <p
                class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate"
            >
                <span>Arzt- / Behördenbezug</span>
                {#if isDoctorAppointment}
                    <span
                        class="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0"
                    >
                        {selectedDoctorOrAuthority ? "Gewählt" : "Aktiv"}
                    </span>
                {/if}
            </p>
            {#if selectedDoctorOrAuthority}
                <p class="text-xs font-semibold text-rose-800 dark:text-rose-200 truncate">
                    {selectedDoctorOrAuthority.company_name || `${selectedDoctorOrAuthority.name_first || ''} ${selectedDoctorOrAuthority.name_last || ''}`.trim()}
                    {#if selectedDoctorOrAuthority.city}
                        <span class="text-[11px] text-slate-500 font-normal">
                            ({selectedDoctorOrAuthority.street || ''} {selectedDoctorOrAuthority.housenr || ''}, {selectedDoctorOrAuthority.city})
                        </span>
                    {/if}
                </p>
            {:else}
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {isDoctorAppointment
                        ? "Uhrzeit erforderlich. Praxis oder Behörde kann hinterlegt werden."
                        : "Uhrzeit ist optional (bei Arzt- & Behördenterminen Pflicht)."}
                </p>
            {/if}
        </div>
    </div>

    <div class="flex items-center gap-1.5 shrink-0">
        {#if selectedDoctorOrAuthority}
            <button
                type="button"
                onclick={onOpenPicker}
                class="text-xs font-bold px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 cursor-pointer"
                title="Anderen Arzt oder Behörde wählen"
            >
                Ändern
            </button>
            <button
                type="button"
                onclick={onClear}
                class="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Auswahl entfernen"
            >
                ✕
            </button>
        {:else}
            <button
                type="button"
                onclick={onOpenPicker}
                class="text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer {isDoctorAppointment
                    ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}"
            >
                {isDoctorAppointment
                    ? "🩺/🏛️ Wählen / Anlegen"
                    : "+ Als Arzt- / Behördentermin festlegen"}
            </button>
        {/if}
    </div>
</div>
