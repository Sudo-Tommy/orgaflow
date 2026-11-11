<script lang="ts">
  import { onMount } from 'svelte';
  import { pb } from '$lib/services/pocketbase';
  import { toastStore } from '$lib/services/toastService.svelte';
  import { hapticFeedback } from '$lib/services/hapticFeedback';
  import ClientPersonalFields from '$lib/components/admin/clients/ClientPersonalFields.svelte';
  import ClientAddressCareFields from '$lib/components/admin/clients/ClientAddressCareFields.svelte';
  import ClientNotesField from '$lib/components/admin/clients/ClientNotesField.svelte';

  let isSubmitting = $state(false);
  let statusMessage = $state('');
  let isLoading = $state(true);

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

  async function handleSave(event: Event) {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    statusMessage = "";
    hapticFeedback.tap();

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
        hapticFeedback.success();
        toastStore.success(`Klientendaten für ${clientForm.vorname} ${clientForm.nachname} wurden erfolgreich gespeichert.`);
      }
      history.back();
    } catch (error: any) {
      console.error('[ClientEdit] Fehler beim Speichern:', error);
      hapticFeedback.error();
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

<div class="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-6 pb-32 max-w-4xl w-full mx-auto">
  <!-- Breadcrumb & Back Navigation -->
  <div class="flex items-center gap-3 mb-4">
    <button 
      type="button" 
      onclick={() => history.back()} 
      class="w-11 h-11 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors active:scale-95 touch-manipulation cursor-pointer"
      aria-label="Zurück"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
    </button>
    <nav class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <a href="/admin" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Admin</a>
      <span>/</span>
      {#if data?.id}
        <a href="/klienten/{data.id}" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Klientenakte</a>
        <span>/</span>
      {/if}
      <span class="text-slate-900 dark:text-slate-200">Stammdaten bearbeiten</span>
    </nav>
  </div>

  <div class="mb-6">
    <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
      Klienten-Stammdaten bearbeiten
    </h1>
    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
      Passen Sie hier die Stammdaten des Klienten an. Alle Änderungen werden nach den GoBD- und Datenschutzrichtlinien gesichert.
    </p>
  </div>

  {#if statusMessage}
    <div class="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
      <span>⚠️</span>
      <span>{statusMessage}</span>
    </div>
  {/if}

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-20 gap-3">
      <div class="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs font-medium text-slate-400 dark:text-slate-500">Klientendaten werden geladen...</span>
    </div>
  {:else}
    <form id="edit-client-form" onsubmit={handleSave} class="space-y-6">
      <ClientPersonalFields 
        bind:vorname={clientForm.vorname}
        bind:nachname={clientForm.nachname}
        bind:email={clientForm.email}
        bind:phone={clientForm.phone}
        {isSubmitting}
      />

      <ClientAddressCareFields
        bind:street={clientForm.street}
        bind:housenr={clientForm.housenr}
        bind:zip={clientForm.zip}
        bind:city={clientForm.city}
        bind:level_of_care={clientForm.level_of_care}
        {isSubmitting}
      />

      <ClientNotesField
        bind:notes={clientForm.notes}
        {isSubmitting}
      />
    </form>
  {/if}
</div>

<!-- Relevanter, nicht-überlagernder Footer mit Safe-Area-Puffer -->
<div class="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur-md z-10">
  <div class="flex items-center justify-end gap-3 max-w-4xl mx-auto">
    <button 
      type="button" 
      class="min-h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-semibold active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50"
      onclick={() => history.back()}
      disabled={isSubmitting}
    >
      Abbrechen
    </button>
    <button 
      type="submit" 
      form="edit-client-form" 
      class="min-h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all text-sm font-semibold flex items-center justify-center gap-2 min-w-[130px] active:scale-95 touch-manipulation cursor-pointer disabled:opacity-50"
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
