<script lang="ts">
  import { onMount } from 'svelte';
  import { pb } from '$lib/services/pocketbase';
  import { toastStore } from '$lib/services/toastService.svelte';
  
  // Svelte 5 Runes für reaktiven Zustand
  let viewportHeight = $state('100dvh');
  let isSubmitting = $state(false);
  let statusMessage = $state('');
  let isLoading = $state(true);

  // Props empfangen via Svelte 5 Runes
  let { data } = $props();

  let clientForm = $state({
    vorname: '',
    nachname: '',
    email: '',
    phone: '',
    street: '',
    housenr: '',
    zip: '',
    city: '',
    level_of_care: '',
    notes: ''
  });

  onMount(async () => {
    try {
      if (data?.id) {
        const record = await pb.collection('clients').getOne(data.id).catch(() => null);
        if (record) {
          clientForm.vorname = record.name_first || '';
          clientForm.nachname = record.name_last || '';
          clientForm.email = record.email || '';
          clientForm.phone = record.phone || record.handy || '';
          clientForm.street = record.street || '';
          clientForm.housenr = record.housenr || '';
          clientForm.zip = record.zip || '';
          clientForm.city = record.city || '';
          clientForm.level_of_care = record.level_of_care || '';
          clientForm.notes = record.notes || '';
        }
      }
    } catch (err: any) {
      console.error('[ClientEdit] Fehler beim Laden:', err);
      toastStore.error('Die Klientendaten konnten nicht geladen werden.');
    } finally {
      isLoading = false;
    }
  });

  $effect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        // Berechne die tatsächliche Höhe abzüglich des Offsets durch die Tastatur
        viewportHeight = `${window.visualViewport.height}px`;
      }
    };

    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    
    // Initialer Aufruf
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  });

  async function handleSave(event: Event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    statusMessage = "";
    
    try {
      if (data?.id) {
        await pb.collection('clients').update(data.id, {
          name_first: clientForm.vorname.trim(),
          name_last: clientForm.nachname.trim(),
          email: clientForm.email.trim(),
          phone: clientForm.phone.trim(),
          street: clientForm.street.trim(),
          housenr: clientForm.housenr.trim(),
          zip: clientForm.zip.trim(),
          city: clientForm.city.trim(),
          level_of_care: clientForm.level_of_care,
          notes: clientForm.notes.trim()
        });
        toastStore.success(`Klientendaten für ${clientForm.vorname} ${clientForm.nachname} wurden erfolgreich gespeichert.`);
      }
      history.back();
    } catch (error: any) {
      console.error('[ClientEdit] Fehler beim Speichern:', error);
      statusMessage = "Es ist ein Fehler bei der systemgestützten Datenvalidierung aufgetreten. Bitte versuchen Sie es erneut.";
      toastStore.error(statusMessage);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Klienten-Stammdaten bearbeiten | OrgaFlow</title>
</svelte:head>

<!-- CSS Variable injizieren zur dynamischen Höhenbegrenzung -->
<div 
  class="form-mobile-container bg-slate-50 dark:bg-slate-900" 
  style="height: {viewportHeight};"
>
  <!-- Scrollbarer Content-Bereich -->
  <div class="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 pb-28 max-w-4xl w-full mx-auto">
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
        Klienten-Stammdaten bearbeiten
      </h1>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
        Passen Sie hier die Stammdaten des Klienten an. Alle Änderungen werden nach den GoBD- und Datenschutzrichtlinien gesichert.
      </p>
    </div>

    {#if statusMessage}
      <div class="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2">
        <span>⚠️</span>
        <span>{statusMessage}</span>
      </div>
    {/if}
    
    <form id="edit-client-form" onsubmit={handleSave} class="space-y-6">
      <!-- Basisdaten -->
      <div class="bg-white dark:bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
          Persönliche Angaben
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="vorname" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Vorname des Klienten *
            </label>
            <input 
              id="vorname" 
              type="text" 
              bind:value={clientForm.vorname} 
              placeholder="Bitte tragen Sie hier den Vornamen ein"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label for="nachname" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Nachname des Klienten *
            </label>
            <input 
              id="nachname" 
              type="text" 
              bind:value={clientForm.nachname} 
              placeholder="Bitte tragen Sie hier den Nachnamen ein"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label for="email" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              E-Mail-Adresse
            </label>
            <input 
              id="email" 
              type="email" 
              bind:value={clientForm.email} 
              placeholder="Bitte tragen Sie hier die E-Mail-Adresse ein"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label for="phone" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Telefon- oder Mobilnummer
            </label>
            <input 
              id="phone" 
              type="tel" 
              bind:value={clientForm.phone} 
              placeholder="Bitte tragen Sie hier die Telefonnummer ein"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <!-- Anschrift & Pflegegrad -->
      <div class="bg-white dark:bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
          Anschrift & Betreuungsstatus
        </h2>

        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-2">
            <label for="street" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Straße
            </label>
            <input 
              id="street" 
              type="text" 
              bind:value={clientForm.street} 
              placeholder="Straße des Klienten"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label for="housenr" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Hausnummer
            </label>
            <input 
              id="housenr" 
              type="text" 
              bind:value={clientForm.housenr} 
              placeholder="Nr."
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label for="zip" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                PLZ
              </label>
              <input 
                id="zip" 
                type="text" 
                bind:value={clientForm.zip} 
                placeholder="PLZ"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
                disabled={isSubmitting}
              />
            </div>
            <div class="col-span-2">
              <label for="city" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Wohnort
              </label>
              <input 
                id="city" 
                type="text" 
                bind:value={clientForm.city} 
                placeholder="Wohnort"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label for="level_of_care" class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Pflegegrad (SGB XI)
            </label>
            <select
              id="level_of_care"
              bind:value={clientForm.level_of_care}
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              <option value="">Kein Pflegegrad hinterlegt</option>
              <option value="1">Pflegegrad 1</option>
              <option value="2">Pflegegrad 2</option>
              <option value="3">Pflegegrad 3</option>
              <option value="4">Pflegegrad 4</option>
              <option value="5">Pflegegrad 5</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Hinweise & System-Spezifikation -->
      <div class="bg-white dark:bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <label for="notes" class="block text-sm font-bold text-slate-900 dark:text-white">
          Wichtige Betreuungshinweise & Dokumentation
        </label>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Bitte hinterlegen Sie hier spezifische Anmerkungen für die Pflegekräfte vor Ort (z. B. Schlüsselübergabe, Besonderheiten im Haushalt).
        </p>
        <textarea
          id="notes"
          bind:value={clientForm.notes}
          rows="3"
          placeholder="Hier können Sie wichtige Hinweise zum Betreuungseinsatz hinterlegen..."
          class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition-all resize-y min-h-[96px]"
          disabled={isSubmitting}
        ></textarea>
        <div class="pt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <span>🔒</span>
          <span>Systemgestützte Datenvalidierung: Alle Pflichtangaben werden nach DSGVO- und GoBD-Grundsätzen verarbeitet.</span>
        </div>
      </div>
    </form>
  </div>

  <!-- Relevanter, nicht-überlagernder Footer mit Safe-Area-Puffer -->
  <div class="border-t border-slate-200 bg-white/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur-md sticky bottom-0 z-10">
    <div class="flex items-center justify-end gap-3 max-w-4xl mx-auto">
      <button 
        type="button" 
        class="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-semibold active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50"
        onclick={() => history.back()}
        disabled={isSubmitting}
      >
        Abbrechen
      </button>
      <button 
        type="submit" 
        form="edit-client-form" 
        class="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all text-sm font-semibold flex items-center justify-center gap-2 min-w-[130px] active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50"
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Speichert...</span>
        {:else}
          <span>Speichern</span>
        {/if}
      </button>
    </div>
  </div>
</div>
