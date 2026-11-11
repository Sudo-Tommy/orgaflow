<script lang="ts">
  let {
    notes = $bindable(''),
    isSubmitting = false
  }: {
    notes: string;
    isSubmitting?: boolean;
  } = $props();

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }
</script>

<div class="bg-white dark:bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
  <label for="notes" class="block text-sm font-bold text-slate-900 dark:text-white">
    Wichtige Betreuungshinweise & Dokumentation
  </label>
  <p class="text-xs text-slate-500 dark:text-slate-400">
    Hinterlegen Sie hier spezifische Anmerkungen für den Betreuungseinsatz vor Ort (z. B. Schlüsselübergabe, Besonderheiten im Haushalt).
  </p>
  <textarea
    id="notes"
    bind:value={notes}
    rows="3"
    oninput={(e) => autoResize(e.currentTarget)}
    placeholder="Hier können Sie wichtige Hinweise zum Betreuungseinsatz hinterlegen..."
    class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition-all min-h-[96px] overflow-hidden"
    disabled={isSubmitting}
  ></textarea>
  <div class="pt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
    <span>🔒</span>
    <span>Systemgestützte Datenvalidierung: Alle Pflichtangaben werden nach DSGVO- und GoBD-Grundsätzen verarbeitet.</span>
  </div>
</div>
