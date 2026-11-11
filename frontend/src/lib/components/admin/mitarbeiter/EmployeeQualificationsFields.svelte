<script lang="ts">
    import { Award } from 'lucide-svelte';

    interface Props {
        qualifications: string;
        emergency_contacts: string;
    }

    let {
        qualifications = $bindable(),
        emergency_contacts = $bindable()
    }: Props = $props();
</script>

<div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
        <Award class="w-3.5 h-3.5" />
        <span>Qualifikationen & Notfallkontakt</span>
    </h4>

    <div class="space-y-1">
        <label for="emp-quals" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Qualifikationen & Zertifikate (Kommagetrennt oder Fließtext)
        </label>
        <textarea 
            id="emp-quals"
            bind:value={qualifications}
            rows="2"
            placeholder="z. B. Examinierte Pflegefachkraft, Führerschein Klasse B, Erste-Hilfe-Kurs 2026, Wundexperte"
            class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation resize-y"
        ></textarea>
    </div>

    <div class="space-y-1">
        <label for="emp-emergency" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Notfallkontakt für den Außendienst (Name, Telefonnummer, Beziehung)
        </label>
        <input 
            id="emp-emergency"
            type="text"
            bind:value={emergency_contacts}
            placeholder="z. B. Klaus Müller (Ehemann): +49 171 9876543"
            class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
        />
    </div>
</div>
