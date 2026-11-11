<script lang="ts">
  import { parseMailTemplate, renderResponsiveMailHtml } from '$lib/utils/mailParser';
  import type { MailRecipient } from '$lib/types/mail';
  import { ChevronLeft, ChevronRight, Eye, User } from 'lucide-svelte';

  interface Props {
    recipients: MailRecipient[];
    subject: string;
    bodyTemplate: string;
  }

  let { recipients = [], subject = '', bodyTemplate = '' }: Props = $props();

  let currentIndex = $state(0);

  let currentRecipient = $derived(recipients[currentIndex] || null);

  let parsedSubject = $derived.by(() => {
    if (!currentRecipient) return subject;
    return parseMailTemplate(subject, currentRecipient);
  });

  let parsedBody = $derived.by(() => {
    if (!currentRecipient) return bodyTemplate;
    return parseMailTemplate(bodyTemplate, currentRecipient);
  });

  let renderedHtml = $derived(renderResponsiveMailHtml(parsedBody));

  function prevRecipient() {
    if (currentIndex > 0) currentIndex--;
  }

  function nextRecipient() {
    if (currentIndex < recipients.length - 1) currentIndex++;
  }
</script>

<div class="space-y-4">
  {#if recipients.length === 0}
    <div class="p-12 text-center text-slate-400 font-medium text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
      <Eye class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
      Wählen Sie mindestens einen Empfänger aus, um eine personalisierte Live-Vorschau zu sehen.
    </div>
  {:else}
    <!-- Durchblätter-Leiste -->
    <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
      <div class="flex items-center gap-2">
        <User class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span class="font-bold text-slate-900 dark:text-white">
          Vorschau {currentIndex + 1} von {recipients.length}:
        </span>
        <span class="text-slate-600 dark:text-slate-300">
          {currentRecipient?.anrede} {currentRecipient?.vorname} {currentRecipient?.nachname}
          {currentRecipient?.organisation ? `(${currentRecipient.organisation})` : ''}
        </span>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          onclick={prevRecipient}
          disabled={currentIndex === 0}
          class="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Vorheriger Empfänger"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          onclick={nextRecipient}
          disabled={currentIndex === recipients.length - 1}
          class="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Nächster Empfänger"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Vorschau-Header -->
    <div class="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
      <div><span class="text-slate-400 font-bold">An:</span> <span class="text-slate-800 dark:text-slate-200 font-medium">{currentRecipient?.email}</span></div>
      <div><span class="text-slate-400 font-bold">Betreff:</span> <span class="text-slate-800 dark:text-slate-200 font-black">{parsedSubject}</span></div>
    </div>

    <!-- HTML-Vorschau-Frame (Zero-Inner-Scroll) -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white shadow-xs">
      <div class="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        E-Mail Darstellungs-Vorschau
      </div>
      <div class="p-4 sm:p-6 bg-slate-50/50">
        <!-- eslint-disable-next-js svelte/no-at-html-tags -->
        {@html renderedHtml}
      </div>
    </div>
  {/if}
</div>
