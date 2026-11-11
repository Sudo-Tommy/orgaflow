<script lang="ts">
    import { Clock, Sparkles } from "lucide-svelte";
    import DoctorAuthoritySelectorRow from "../contacts/DoctorAuthoritySelectorRow.svelte";
    import LandingAppointmentGuestContact from "./LandingAppointmentGuestContact.svelte";
    import LandingAppointmentAttachments from "./LandingAppointmentAttachments.svelte";
    import { APPOINTMENT_CATEGORIES } from "./landingAppointmentTypes";
    import { applyAppointmentCategory } from "./landingAppointmentActions";
    import { sortAlphabetical } from "$lib/utils/sortHelper";
    import { autoGrow } from "$lib/actions/autoGrow";

    let { 
        modalState, 
        openDoctorAuthorityPicker, 
        onClearDoctorAuthority, 
        previewAttachment, 
        onSubmit 
    } = $props<{
        modalState: any;
        openDoctorAuthorityPicker: () => void;
        onClearDoctorAuthority: () => void;
        previewAttachment: (file: File) => void;
        onSubmit: (e: Event) => void;
    }>();

    let sortedPortalClients = $derived.by(() => {
        return sortAlphabetical(modalState.portalClients || [], (c: any) => c.name);
    });
</script>

<div class="p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full">
    {#if modalState.isPortalUser}
        <div class="mb-5 p-4 rounded-2xl border transition-all {modalState.userRole === 'client'
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
            : modalState.userRole === 'caregiver'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'}">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 {modalState.userRole === 'client'
                        ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                        : modalState.userRole === 'caregiver'
                          ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100'
                          : 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'}">
                        {#if modalState.userRole === "client"}👤{:else if modalState.userRole === "caregiver"}📋{:else}🤝{/if}
                    </div>
                    <div>
                        <span class="text-[11px] font-black uppercase tracking-wider block opacity-75">
                            {#if modalState.userRole === "client"}Angemeldeter Klient{:else if modalState.userRole === "caregiver"}Angemeldeter Betreuer{:else}Angehöriger / Notfallkontakt{/if}
                        </span>
                        <p class="text-sm font-bold">{modalState.sender_name || "Portal-Benutzer"}</p>
                    </div>
                </div>
                <span class="text-xs font-semibold opacity-75 hidden sm:inline-block">Profil verifiziert ✓</span>
            </div>

            {#if modalState.userRole === "caregiver" || modalState.portalClients.length > 1}
                <div class="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/60">
                    <label for="req-portal-client" class="block text-xs font-bold mb-1.5 text-indigo-950 dark:text-indigo-200">
                        Für welchen Klienten möchten Sie den Termin buchen? *
                    </label>
                    <select
                        id="req-portal-client"
                        bind:value={modalState.selectedPortalClient}
                        class="orga-input-clear bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 text-slate-900 dark:text-slate-100 text-sm w-full cursor-pointer min-h-[44px] font-semibold"
                        disabled={modalState.isLoading}
                    >
                        {#if !modalState.selectedPortalClient}
                            <option value="">-- Bitte Klienten auswählen --</option>
                        {/if}
                        {#each sortedPortalClients as c (c.id)}
                            <option value={c.id}>{c.name}</option>
                        {/each}
                    </select>
                </div>
            {:else if modalState.activeClientName && modalState.userRole !== "client"}
                <div class="mt-2.5 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/60 text-xs">
                    <span class="opacity-75">Betrifft Klient:</span>
                    <strong class="font-bold">{modalState.activeClientName}</strong>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Schnellauswahl Termin-Anlässe -->
    <div class="mb-4">
        <span class="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-amber-500" />
            <span>Häufige Anlässe (Klick zum Einfügen)</span>
        </span>
        <div class="flex flex-wrap gap-1.5">
            {#each APPOINTMENT_CATEGORIES as cat}
                <button
                    type="button"
                    onclick={() => applyAppointmentCategory(cat.label, modalState, openDoctorAuthorityPicker)}
                    class="px-3 py-1.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                </button>
            {/each}
        </div>
    </div>

    {#if !modalState.isPortalUser}
        <LandingAppointmentGuestContact {modalState} />
    {/if}

    <!-- Wunschzeit & Anliegen -->
    <div class="space-y-4 flex-1">
        <DoctorAuthoritySelectorRow
            isDoctorAppointment={modalState.isDoctorAppointment}
            selectedDoctorOrAuthority={modalState.selectedDoctorOrAuthority}
            onOpenPicker={openDoctorAuthorityPicker}
            onClear={onClearDoctorAuthority}
        />

        <div>
            <label for="req-time" class="block text-xs font-bold mb-1 flex items-center justify-between {modalState.isDoctorAppointment ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}">
                <span class="flex items-center gap-1.5">
                    <Clock class="w-3.5 h-3.5 {modalState.isDoctorAppointment ? 'text-rose-600 dark:text-rose-400' : 'text-brand-600 dark:text-brand-400'}" />
                    <span>{modalState.isDoctorAppointment ? "Uhrzeit des Termins *" : "Wunsch-Uhrzeit (optional)"}</span>
                </span>
                {#if modalState.isDoctorAppointment}
                    <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Pflichtfeld (Arzt / Behörde)</span>
                {:else}
                    <span class="text-[11px] font-normal text-slate-400 dark:text-slate-500">Optional</span>
                {/if}
            </label>
            <input
                id="req-time"
                type="time"
                bind:value={modalState.time}
                required={modalState.isDoctorAppointment}
                class="orga-input-clear bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px] transition-all {modalState.isDoctorAppointment && !modalState.time.trim() ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20' : ''}"
                disabled={modalState.isLoading}
            />
            <div class="flex flex-wrap gap-1.5 mt-2">
                {#each ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"] as slot}
                    {@const isSlotBusy = modalState.selectedDate ? (modalState.occupiedTimesByDate[new Date(modalState.selectedDate.getTime() - modalState.selectedDate.getTimezoneOffset() * 60000).toISOString().split("T")[0]] || []).includes(slot) : false}
                    <button
                        type="button"
                        disabled={modalState.isLoading || isSlotBusy}
                        onclick={() => (modalState.time = slot)}
                        class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer min-h-[36px] {modalState.time === slot
                            ? 'bg-amber-600 dark:bg-amber-600 text-white border-amber-700 dark:border-amber-500 shadow-xs ring-1 ring-amber-500/30'
                            : isSlotBusy
                              ? 'opacity-40 line-through bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-700'}"
                    >
                        {slot} Uhr
                    </button>
                {/each}
            </div>
            {#if modalState.isDoctorAppointment && !modalState.time.trim()}
                <p class="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Für Termine mit Bezug zu einem Arzt oder einer Behörde ist die Angabe einer genauen Uhrzeit zwingend erforderlich.</span>
                </p>
            {/if}
        </div>

        <div class="flex-1 flex flex-col">
            <label for="req-text" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Wie können wir Ihnen helfen? *
            </label>
            <textarea
                id="req-text"
                use:autoGrow
                bind:value={modalState.request_text}
                class="orga-input-clear bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none flex-1 min-h-[120px] text-sm"
                placeholder="Beschreiben Sie kurz Ihr Anliegen oder wählen Sie oben eine Kategorie..."
                required
                disabled={modalState.isLoading}
            ></textarea>
        </div>
    </div>

    <!-- Dateianhänge -->
    <LandingAppointmentAttachments {modalState} {previewAttachment} />

    <!-- Senden -->
    <div class="pt-3">
        <button
            type="button"
            onclick={onSubmit}
            class="orga-button-primary w-full text-base py-3.5 min-h-[48px] shadow-brand-600/30 hover:shadow-brand-600/50 cursor-pointer font-black"
            disabled={modalState.isLoading || !modalState.selectedDate || (!modalState.isPortalUser && !modalState.sender_name.trim()) || !modalState.isValidContact || (modalState.userRole === "caregiver" && !modalState.selectedPortalClient && modalState.portalClients.length > 0) || (modalState.isDoctorAppointment && !modalState.time.trim())}
        >
            {modalState.isLoading ? "Wird sicher übermittelt..." : "Termin verbindlich anfragen"}
        </button>

        <p class="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2 flex items-center justify-center gap-1.5">
            <span>🔒</span>
            <span>Verschlüsselte Übertragung nach DSGVO &amp; streng vertraulich.</span>
        </p>
    </div>
</div>
