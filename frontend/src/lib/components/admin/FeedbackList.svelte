<script lang="ts">
    interface Props {
        feedbacks: any[];
        selectedId: string | null;
        onSelect: (id: string) => void;
    }

    let { feedbacks, selectedId, onSelect }: Props = $props();

    function getPriorityColor(priority: string) {
        switch ((priority || '').toLowerCase()) {
            case 'high':
            case 'critical':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'medium':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    }

    function getStatusBadge(status: string) {
        switch ((status || '').toLowerCase()) {
            case 'resolved':
                return { label: 'Gelöst', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            case 'in_progress':
                return { label: 'In Bearbeitung', class: 'bg-blue-50 text-blue-700 border-blue-200' };
            default:
                return { label: 'Neu', class: 'bg-slate-100 text-slate-600 border-slate-200' };
        }
    }
</script>

<div class="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
    {#if feedbacks.length === 0}
        <div class="p-8 text-center text-slate-400">
            <p class="text-sm">Keine Feedback-Meldungen vorhanden.</p>
        </div>
    {:else}
        {#each feedbacks as item (item.id)}
            {@const statusInfo = getStatusBadge(item.status)}
            <button
                type="button"
                onclick={() => onSelect(item.id)}
                class="w-full text-left p-4 transition-all duration-150 flex flex-col justify-between hover:bg-slate-50 focus:outline-none focus:bg-slate-50/80 min-h-[80px] cursor-pointer
                    {selectedId === item.id ? 'bg-primary-50/60 border-l-4 border-primary-600 pl-3.5 shadow-xs' : 'border-l-4 border-transparent'}"
                aria-pressed={selectedId === item.id}
            >
                <div class="flex justify-between items-start w-full gap-2">
                    <span class="font-semibold text-slate-900 truncate text-sm sm:text-base tracking-tight">{item.sender || 'Anonym'}</span>
                    <span class="text-xs text-slate-400 whitespace-nowrap shrink-0">
                        {item.created ? new Date(item.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                    </span>
                </div>
                
                <p class="text-xs text-slate-600 truncate w-full mt-1 mb-2.5 font-medium">{item.subject || 'Kein Betreff'}</p>
                
                <div class="flex gap-2 items-center flex-wrap">
                    <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold {getPriorityColor(item.priority)}">
                        {(item.priority || 'NORMAL').toUpperCase()}
                    </span>
                    {#if item.category}
                        <span class="text-[10px] bg-slate-100 text-slate-600 border border-slate-200/60 px-2 py-0.5 rounded-full font-medium">
                            {item.category}
                        </span>
                    {/if}
                    <span class="text-[10px] px-2 py-0.5 rounded-full border font-medium ml-auto {statusInfo.class}">
                        {statusInfo.label}
                    </span>
                </div>
            </button>
        {/each}
    {/if}
</div>
