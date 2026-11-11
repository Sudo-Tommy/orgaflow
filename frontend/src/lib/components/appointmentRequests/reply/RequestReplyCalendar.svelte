<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { appointmentModalService } from "$lib/services/appointmentModalService.svelte";

    let {
        propDate = $bindable(""),
        propTime = $bindable(""),
        requestCompany = "",
        disabled = false
    }: {
        propDate: string;
        propTime: string;
        requestCompany?: string;
        disabled?: boolean;
    } = $props();

    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(null);

    let companyApps = $derived.by(() => {
        const apps = orgaStore.appointments?.data || [];
        if (!requestCompany) return apps;

        return apps.filter((a: any) => {
            const uCompId = a.expand?.user?.company;
            if (!uCompId) return false;
            
            if (Array.isArray(uCompId)) return uCompId.includes(requestCompany);
            if (typeof uCompId === 'string') {
                if (uCompId.startsWith('[')) {
                    try { return JSON.parse(uCompId).includes(requestCompany); } catch {}
                }
                return uCompId === requestCompany || uCompId.includes(requestCompany);
            }
            return false;
        });
    });

    let occupiedData = $derived.by(() => {
        const counts: Record<string, number> = {};
        const times: Record<string, string[]> = {};
        
        companyApps.forEach((r: any) => {
            if (r.appointment) {
                const dObj = new Date(r.appointment as string);
                if (isNaN(dObj.getTime())) return;
                const d = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                const isBlocked = r.description && r.description.includes('[BLOCK]');
                counts[d] = (counts[d] || 0) + (isBlocked ? 100 : 1);

                if (!isBlocked) {
                    const tStr = dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    if (!times[d]) times[d] = [];
                    if (!times[d].includes(tStr)) times[d].push(tStr);
                }
            }
        });

        for (const key in times) {
            times[key].sort();
        }

        const busy = Object.entries(counts).filter(([_, count]) => count >= 4).map(([d]) => d);
        return { busy, times };
    });

    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const firstDay = new Date(y, m, 1);
        let startDay = firstDay.getDay() || 7;
        startDay -= 1;

        const days = [];
        const prevLastDay = new Date(y, m, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ date: new Date(y, m - 1, prevLastDay - i), isCurrentMonth: false });
        }
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            days.push({ date: new Date(y, m, i), isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(y, m + 1, i), isCurrentMonth: false });
        }
        return days;
    });

    let dayApps = $derived.by(() => {
        if (!selectedDate) return [];
        const selDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return companyApps.filter((a: any) => {
            if (!a.appointment) return false;
            const dObj = new Date(a.appointment as string);
            if (isNaN(dObj.getTime())) return false;
            const dStr = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            return dStr === selDateStr;
        }).sort((a: any, b: any) => new Date(a.appointment as string).getTime() - new Date(b.appointment as string).getTime());
    });
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4 animate-enter">
    <div class="md:col-span-2">
        <h3 class="font-bold text-blue-900 text-sm mb-1">Alternativtermin festlegen</h3>
        <p class="text-xs text-blue-700">Wählen Sie im Kalender einen passenden Termin aus. Die Daten werden automatisch an die E-Mail angehängt.</p>
    </div>
    
    <div class="orga-card-white p-4 border border-blue-200 shadow-sm bg-white">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-brand-950">Wunschdatum *</h3>
            <div class="flex items-center gap-2 bg-neutral-50 rounded-lg border border-neutral-100 p-1 shadow-sm">
                <button
                    type="button"
                    onclick={() => (currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    class="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-neutral-200 rounded text-brand-700 font-bold transition-colors touch-manipulation"
                >◀</button>
                <span class="text-xs font-bold text-brand-950 w-24 text-center">{currentDate.toLocaleString('de-DE', { month: 'short', year: 'numeric' })}</span>
                <button
                    type="button"
                    onclick={() => (currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                    class="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-neutral-200 rounded text-brand-700 font-bold transition-colors touch-manipulation"
                >▶</button>
            </div>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center mb-2">
            {#each ['Mo','Di','Mi','Do','Fr','Sa','So'] as day}
                <div class="text-[10px] font-bold text-brand-600/80 uppercase tracking-wider py-1">{day}</div>
            {/each}
        </div>

        <div class="grid grid-cols-7 gap-1">
            {#each calendarDays as day}
                {@const isPast = day.date.getTime() < new Date().setHours(0,0,0,0)}
                {@const dateStr = new Date(day.date.getTime() - day.date.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                {@const isOccupied = occupiedData.busy.includes(dateStr)}
                {@const dayTimes = occupiedData.times[dateStr] || []}
                <button
                    type="button"
                    disabled={isPast || isOccupied || disabled}
                    onclick={() => { selectedDate = day.date; propDate = dateStr; }}
                    class="aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs font-bold transition-all border shadow-sm touch-manipulation min-h-[36px] {
                        isPast ? 'opacity-40 cursor-not-allowed bg-neutral-100 border-neutral-200 text-neutral-400' : 
                        (isOccupied ? 'bg-rose-50 text-rose-400 border-rose-200/50 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-brand-50 hover:text-brand-800 hover:border-brand-300 text-neutral-700')
                    } {!day.isCurrentMonth && !isOccupied && !isPast ? 'opacity-60 text-neutral-500' : ''} {selectedDate && day.date.getTime() === selectedDate.getTime() && !isOccupied && !isPast ? 'bg-brand-600! text-white! border-brand-700! shadow-md scale-105' : ''}"
                >
                    <span class={isOccupied ? 'line-through decoration-rose-400 decoration-2' : ''}>{day.date.getDate()}</span>
                    {#if isOccupied}
                        <span class="text-[7px] font-black uppercase mt-0.5 text-rose-500 truncate max-w-full px-0.5 leading-none">Belegt</span>
                    {:else if dayTimes.length > 0 && !isPast}
                        <div class="flex flex-col gap-px mt-0.5 items-center w-full px-0">
                            {#each dayTimes.slice(0, 2) as t}
                                <span class="text-[7px] leading-tight font-bold line-through {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-brand-200 decoration-brand-200' : 'text-rose-500 decoration-rose-500 opacity-70'}">{t}</span>
                            {/each}
                            {#if dayTimes.length > 2}
                                <span class="text-[7px] leading-tight font-bold {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-brand-100' : 'text-rose-500'}">...</span>
                            {/if}
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>
    
    <div class="flex flex-col gap-4">
        <div>
            <label for="prop-time" class="block text-sm font-semibold text-blue-800 mb-1.5">Neue Uhrzeit *</label>
            <input id="prop-time" type="time" bind:value={propTime} class="orga-input-clear min-h-[44px] py-2 text-sm bg-white border-blue-200 touch-manipulation" required {disabled} />
        </div>

        {#if selectedDate && dayApps.length > 0}
            <div class="mt-1 bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm flex flex-col animate-enter">
                <div class="p-2.5 bg-blue-50 border-b border-blue-100 text-xs text-blue-900 font-bold flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2"><span class="text-sm">⚠️</span> Folgende Termine sind belegt:</div>
                </div>
                <div class="p-2 flex flex-col gap-2 bg-blue-50/30">
                    {#each dayApps as app}
                        <button type="button" onclick={() => appointmentModalService.open(app.id)} class="text-left w-full bg-white p-2.5 rounded-lg border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all flex justify-between items-center gap-3 group min-h-[44px] touch-manipulation">
                            <span class="text-xs font-bold {app.description?.includes('[BLOCK]') ? 'text-rose-600' : 'text-blue-700'} whitespace-nowrap">{new Date(app.appointment as string).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                            <span class="text-xs text-neutral-700 font-medium line-clamp-1 flex-1">{app.description?.replace('[BLOCK]', '🚫 Blockiert:') || 'Ohne Beschreibung'}</span>
                            <span class="opacity-0 group-hover:opacity-100 text-blue-600 text-[10px] uppercase tracking-wider font-bold transition-opacity whitespace-nowrap bg-blue-50 px-2 py-1 rounded">Öffnen</span>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="mt-auto p-3 bg-white/50 rounded-xl border border-blue-100 text-xs text-blue-700 flex gap-2 items-start">
            <span class="text-base leading-none">💡</span>
            <p>Wählen Sie hier direkt einen passenden Termin, den der Klient nur noch bestätigen muss.</p>
        </div>
    </div>
</div>
