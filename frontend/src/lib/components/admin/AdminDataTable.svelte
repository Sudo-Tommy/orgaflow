<script lang="ts">
    let { data, onEdit, onDelete } = $props<{
        data: any[];
        onEdit: (record: any) => void;
        onDelete: (id: string) => void;
    }>();

    // Extrahiert dynamisch alle Spalten aus den Rohdaten
    let columns = $derived.by(() => {
        if (data.length === 0) return [];
        const keys = new Set<string>();
        data.forEach((item: any) => Object.keys(item).forEach(k => {
            if(k !== 'expand' && k !== 'collectionId' && k !== 'collectionName') keys.add(k);
        }));
        
        const arr = Array.from(keys);
        arr.sort((a, b) => {
            if (a === 'id') return -1; if (b === 'id') return 1;
            if (a === 'created') return 1; if (b === 'created') return -1;
            return a.localeCompare(b);
        });
        return arr;
    });

    function formatCell(val: any) {
        if (val === null || val === undefined || val === "") return '<span class="text-neutral-400">-</span>';
        if (typeof val === 'boolean') return val ? '✅' : '❌';
        if (typeof val === 'object') {
            if (Array.isArray(val) && val.length === 0) return '<span class="text-neutral-400">[]</span>';
            return `<span class="text-indigo-600 text-xs px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md font-mono">${JSON.stringify(val).substring(0, 35)}${JSON.stringify(val).length > 35 ? '...' : ''}</span>`;
        }
        const str = String(val);
        if (str.length > 50) return `<span title="${str.replace(/"/g, '&quot;')}">${str.substring(0, 50)}...</span>`;
        return str;
    }
</script>

<div class="orga-table-container flex flex-col h-full relative z-0">
    <div class="overflow-auto custom-scrollbar flex-1">
        <table class="w-full text-left border-collapse text-sm min-w-max">
            <thead class="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-2xs border-b border-slate-200 dark:border-slate-700">
                <tr>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm text-xs uppercase tracking-wider">Aktionen</th>
                    {#each columns as col}
                        <th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm text-xs uppercase tracking-wider">{col}</th>
                    {/each}
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {#each data as row (row.id)}
                    <tr class="hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition-colors">
                        <td class="p-3.5 sm:p-4 whitespace-nowrap border-r border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky left-0 z-0">
                            <button onclick={() => onEdit(row)} class="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors mr-2 shadow-2xs">Bearbeiten</button>
                            <button onclick={() => onDelete(row.id)} class="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold hover:bg-rose-600 hover:text-white transition-colors shadow-2xs">Löschen</button>
                        </td>
                        {#each columns as col}
                            <td class="p-3.5 sm:p-4 text-slate-800 dark:text-slate-200 font-medium max-w-75 truncate">{@html formatCell(row[col])}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if data.length === 0}<div class="p-12 text-center text-slate-400 dark:text-slate-500 font-medium italic">Keine Einträge in dieser Tabelle vorhanden.</div>{/if}
    </div>
</div>