<script lang="ts">
  import { Paperclip, Trash2 } from 'lucide-svelte';

  interface Props {
    attachments: File[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
    disabled?: boolean;
  }

  let { attachments, onAdd, onRemove, disabled = false }: Props = $props();

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      onAdd(Array.from(target.files));
      target.value = '';
    }
  }
</script>

<div>
  <div class="flex items-center justify-between mb-2">
    <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Anhänge:</span>
    <label class="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-colors {disabled ? 'opacity-50 pointer-events-none' : ''}">
      <Paperclip class="w-3.5 h-3.5 text-indigo-500" />
      <span>Datei anhängen</span>
      <input type="file" multiple onchange={handleFileSelect} class="hidden" {disabled} />
    </label>
  </div>

  {#if attachments.length > 0}
    <div class="space-y-1.5">
      {#each attachments as file, idx (idx)}
        <div class="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
          <div class="flex items-center gap-2 truncate">
            <Paperclip class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span class="font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</span>
            <span class="text-slate-400 shrink-0">({Math.round(file.size / 1024)} KB)</span>
          </div>
          <button
            type="button"
            onclick={() => onRemove(idx)}
            disabled={disabled}
            class="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
            title="Anhang entfernen"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
