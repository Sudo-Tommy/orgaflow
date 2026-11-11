<script lang="ts">
  let {
    vorname = $bindable(''),
    nachname = $bindable(''),
    email = $bindable(''),
    phone = $bindable(''),
    isSubmitting = false
  }: {
    vorname: string;
    nachname: string;
    email: string;
    phone: string;
    isSubmitting?: boolean;
  } = $props();
</script>

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
        bind:value={vorname} 
        placeholder="Bitte Vornamen eintragen"
        class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
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
        bind:value={nachname} 
        placeholder="Bitte Nachnamen eintragen"
        class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
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
        bind:value={email} 
        placeholder="beispiel@domain.de"
        class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
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
        bind:value={phone} 
        placeholder="0151 12345678"
        class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-11 text-sm outline-none transition-all touch-manipulation"
        disabled={isSubmitting}
      />
    </div>
  </div>
</div>
