<!-- src/lib/components/drive/GoogleDriveItemList.svelte -->
<script lang="ts">
    import { Folder, FileText, Image, File as FileIcon, Check } from 'lucide-svelte';
    import { googleDriveService, type DriveItem } from '$lib/services/googleDriveService';

    let {
        items,
        selectedIds,
        ontoggle
    } = $props<{
        items: DriveItem[];
        selectedIds: Set<string>;
        ontoggle: (item: DriveItem) => void;
    }>();

    function getItemIcon(item: DriveItem) {
        if (item.isFolder) return Folder;
        const lower = item.name.toLowerCase();
        if (lower.endsWith('.pdf') || item.mimeType === 'application/pdf') return FileText;
        if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || item.mimeType.startsWith('image/')) return Image;
        return FileIcon;
    }
</script>

<div class="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/40">
    {#each items as item (item.id)}
        {@const Icon = getItemIcon(item)}
        {@const isSelected = selectedIds.has(item.id)}
        <div
            class="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer transition-colors {isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''}"
            onclick={() => ontoggle(item)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') ontoggle(item); }}
        >
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 {item.isFolder ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'}">
                    <Icon class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p class="text-[10px] text-slate-400">{item.isFolder ? 'Ordner' : googleDriveService.formatFileSize(item.size)}</p>
                </div>
            </div>

            {#if item.isFolder}
                <span class="text-xs text-slate-400 font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">Öffnen →</span>
            {:else}
                <div class="w-5 h-5 rounded-lg border flex items-center justify-center transition-colors {isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}">
                    {#if isSelected}<Check class="w-3.5 h-3.5 stroke-[3]" />{/if}
                </div>
            {/if}
        </div>
    {/each}
</div>
