<script lang="ts">
    import { Camera, Image as ImageIcon, Trash2, Plus } from 'lucide-svelte';
    import { compressImageFile } from '$lib/utils/imageCompressor';
    import { toastStore } from '$lib/services/toastService.svelte';

    interface Props {
        photos: Array<{ name: string; dataUrl: string }>;
    }

    let { photos = $bindable([]) }: Props = $props();
    let isProcessing = $state(false);

    async function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        isProcessing = true;
        try {
            for (let i = 0; i < input.files.length; i++) {
                const file = input.files[i];
                const compressed = await compressImageFile(file);
                photos = [...photos, { name: compressed.name, dataUrl: compressed.dataUrl }];
            }
            toastStore.success('Foto(s) erfolgreich hinzugefügt.');
        } catch (err: any) {
            console.error('Fehler beim Bild-Upload:', err);
            toastStore.error('Foto konnte nicht verarbeitet werden.');
        } finally {
            isProcessing = false;
            input.value = '';
        }
    }

    function removePhoto(index: number) {
        photos = photos.filter((_, i) => i !== index);
    }
</script>

<div class="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
    <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
        <span class="flex items-center gap-1.5 uppercase tracking-wider">
            <Camera class="w-4 h-4 text-indigo-500" />
            <span>Belege & Fotos ({photos.length})</span>
        </span>
        <label 
            class="min-h-8 px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 flex items-center gap-1 cursor-pointer transition-colors"
        >
            <Plus class="w-3.5 h-3.5" />
            <span>Foto aufnehmen</span>
            <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                multiple 
                onchange={handleFileSelect} 
                class="hidden" 
            />
        </label>
    </div>

    <!-- Foto Galerie Voransicht -->
    {#if photos.length > 0}
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
            {#each photos as photo, idx}
                <div class="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                    <img 
                        src={photo.dataUrl} 
                        alt={photo.name} 
                        class="w-full h-full object-cover" 
                    />
                    <button
                        type="button"
                        onclick={() => removePhoto(idx)}
                        aria-label="Foto löschen"
                        class="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                        <Trash2 class="w-3.5 h-3.5" />
                    </button>
                </div>
            {/each}
        </div>
    {:else}
        <p class="text-[11px] text-slate-400">
            Hier können Quittungen, Rezepte oder Einkaufsbelege direkt fotografiert und hinterlegt werden.
        </p>
    {/if}
</div>
