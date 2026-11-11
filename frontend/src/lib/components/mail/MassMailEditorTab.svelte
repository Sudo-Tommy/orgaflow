<script lang="ts">
  import type { MailTemplate } from '$lib/types/mail';
  import { Sparkles } from 'lucide-svelte';

  interface Props {
    templates: MailTemplate[];
    selectedTemplateId: string;
    subject: string;
    bodyTemplate: string;
    onTemplateChange: (templateId: string) => void;
  }

  let {
    templates = [],
    selectedTemplateId = $bindable(''),
    subject = $bindable(''),
    bodyTemplate = $bindable(''),
    onTemplateChange
  }: Props = $props();

  let textareaRef = $state<HTMLTextAreaElement | null>(null);

  function insertPlaceholder(placeholder: string) {
    if (!textareaRef) {
      bodyTemplate += placeholder;
      return;
    }
    const start = textareaRef.selectionStart || 0;
    const end = textareaRef.selectionEnd || 0;
    bodyTemplate = bodyTemplate.substring(0, start) + placeholder + bodyTemplate.substring(end);
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.selectionStart = textareaRef.selectionEnd = start + placeholder.length;
        textareaRef.focus();
      }
    }, 0);
  }
</script>

<div class="space-y-3.5">
  <!-- Vorlagen-Auswahl (Alphabetisch sortiert nach Titel) -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <label for="template-select" class="text-xs font-bold text-slate-700 dark:text-slate-300">
      Gespeicherte Vorlage:
    </label>
    <select
      id="template-select"
      value={selectedTemplateId}
      onchange={(e) => onTemplateChange((e.target as HTMLSelectElement).value)}
      class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer max-w-sm"
    >
      {#each templates as tpl (tpl.id)}
        <option value={tpl.id}>{tpl.titel}</option>
      {/each}
    </select>
  </div>

  <!-- Betreffzeile -->
  <div>
    <label for="mail-subject" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
      E-Mail-Betreff:
    </label>
    <input
      id="mail-subject"
      type="text"
      bind:value={subject}
      placeholder="Betreff der E-Mail eingeben..."
      class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
    />
  </div>

  <!-- Platzhalter-Leiste -->
  <div>
    <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
      <Sparkles class="w-3.5 h-3.5 text-indigo-500" />
      <span>Platzhalter an Cursor-Position einfügen:</span>
    </div>
    <div class="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onclick={() => insertPlaceholder('{{briefanrede}}')}
        class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-lg cursor-pointer transition-colors"
      >
        + Briefanrede
      </button>
      <button
        type="button"
        onclick={() => insertPlaceholder('{{anrede}}')}
        class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
      >
        + Anrede
      </button>
      <button
        type="button"
        onclick={() => insertPlaceholder('{{nachname}}')}
        class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
      >
        + Nachname
      </button>
      <button
        type="button"
        onclick={() => insertPlaceholder('{{vorname}}')}
        class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
      >
        + Vorname
      </button>
      <button
        type="button"
        onclick={() => insertPlaceholder('{{organisation}}')}
        class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
      >
        + Organisation
      </button>
    </div>
  </div>

  <!-- Textfeld (Auto-expand, Zero-Inner-Scroll) -->
  <div>
    <label for="mail-body" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
      Nachrichtentext:
    </label>
    <textarea
      id="mail-body"
      bind:this={textareaRef}
      bind:value={bodyTemplate}
      rows="10"
      placeholder="Geben Sie hier den Inhalt Ihrer E-Mail ein..."
      class="w-full p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
    ></textarea>
  </div>
</div>

