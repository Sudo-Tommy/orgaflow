<script lang="ts">
  let {
    street = $bindable(''),
    housenr = $bindable(''),
    zip = $bindable(''),
    city = $bindable(''),
    level_of_care = $bindable(''),
    isSubmitting = false
  }: {
    street: string;
    housenr: string;
    zip: string;
    city: string;
    level_of_care: string;
    isSubmitting?: boolean;
  } = $props();

  const CARE_LEVEL_OPTIONS = [
    { value: '', label: 'Kein Pflegegrad hinterlegt' },
    { value: '1', label: 'Pflegegrad 1' },
    { value: '2', label: 'Pflegegrad 2' },
    { value: '3', label: 'Pflegegrad 3' },
    { value: '4', label: 'Pflegegrad 4' },
    { value: '5', label: 'Pflegegrad 5' }
  ];
</script>

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
        bind:value={street} 
        placeholder="Straße des Klienten"
        class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
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
        bind:value={housenr} 
        placeholder="Nr."
        class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
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
          bind:value={zip} 
          placeholder="PLZ"
          class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
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
          bind:value={city} 
          placeholder="Wohnort"
          class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
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
        bind:value={level_of_care}
        class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all cursor-pointer touch-manipulation"
        disabled={isSubmitting}
      >
        {#each CARE_LEVEL_OPTIONS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
</div>
