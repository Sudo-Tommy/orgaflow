<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";

    // svelte-ignore non_reactive_update
    let detailModal: ReturnType<typeof ClientDetailModal>;

    // Berechnet automatisch die nächsten 20 anstehenden Geburtstage aller aktiven Klienten
    let upcomingBirthdays = $derived.by(() => {
        const clients = orgaStore.clients?.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ignoriere die Uhrzeit für saubere Tages-Berechnungen

        const bdays = clients
            .filter((c: any) => c.birthdate && (c.status || '').toLowerCase() === 'aktiv')
            .map((c: any) => {
                let bYear, bMonth, bDay;
                // Entfernt Uhrzeiten und T-Trennzeichen (z.B. bei 1950-05-12T12:00:00)
                const dateStr = (c.birthdate || '').trim().split(' ')[0].split('T')[0];
                
                if (!dateStr) return null;
                
                if (dateStr.includes('.')) {
                    // Deutsches Format (DD.MM.YYYY)
                    const parts = dateStr.split('.');
                    if (parts.length < 3) return null;
                    bDay = parseInt(parts[0], 10);
                    bMonth = parseInt(parts[1], 10) - 1;
                    bYear = parseInt(parts[2], 10);
                    // Jahrhundert-Korrektur falls jemand nur "50" statt "1950" eingetragen hat
                    if (bYear < 100) bYear += (bYear > 30 ? 1900 : 2000);
                } else if (dateStr.includes('-')) {
                    // ISO/Datenbank Format (YYYY-MM-DD)
                    const parts = dateStr.split('-');
                    if (parts.length < 3) return null;
                    bYear = parseInt(parts[0], 10);
                    bMonth = parseInt(parts[1], 10) - 1;
                    bDay = parseInt(parts[2], 10);
                } else {
                    return null;
                }
                
                if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return null;
                
                let nextBday = new Date(today.getFullYear(), bMonth, bDay);
                
                // Wenn der Geburtstag dieses Jahr schon war, findet der nächste im nächsten Jahr statt
                if (nextBday.getTime() < today.getTime()) {
                    nextBday.setFullYear(today.getFullYear() + 1);
                }

                const age = nextBday.getFullYear() - bYear;
                const daysUntil = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    client: c,
                    nextBday,
                    age,
                    daysUntil,
                    isToday: daysUntil === 0,
                    isTomorrow: daysUntil === 1
                };
            })
            .filter((b: any) => b !== null)
            .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
            .slice(0, 20) as any[];

        return bdays;
    });
</script>

<div class="orga-card-white overflow-hidden shadow-sm">
    <div class="px-5 sm:px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
        <h2 class="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
            <span class="text-xl">🎁</span> Anstehende Geburtstage
        </h2>
    </div>
    
    <div class="relative w-full overflow-x-auto custom-scrollbar">
        {#if upcomingBirthdays.length === 0}
            <div class="p-8 text-center text-neutral-400 font-medium italic text-sm">Keine Geburtstage von aktiven Klienten hinterlegt.</div>
        {:else}
            <div class="flex items-center min-w-max relative z-10 px-8 h-40">
                <!-- Die durchgehende horizontale Linie -->
                <div class="absolute top-1/2 left-0 right-0 h-1 bg-amber-100 -translate-y-1/2 z-0"></div>
                
                <!-- Die Meilensteine -->
                {#each upcomingBirthdays as bday (bday?.client?.id)}
                    <button type="button" onclick={() => detailModal?.open(bday.client.id)} class="relative flex flex-col items-center justify-center w-24 shrink-0 group focus:outline-none">
                        <!-- Datum über der Linie -->
                        <div class="absolute bottom-full mb-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap transition-colors {bday.isToday ? 'bg-rose-50 border-rose-200 text-rose-600' : (bday.isTomorrow ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-neutral-100 text-neutral-500 group-hover:text-brand-600 group-hover:border-brand-200')}">{bday.isToday ? 'Heute!' : (bday.isTomorrow ? 'Morgen!' : bday.nextBday.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }))}</div>
                        
                        <!-- Das Profilbild auf der Linie -->
                        <div class="w-10 h-10 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 z-10 font-bold text-xs shrink-0 {bday.isToday ? 'bg-rose-100 text-rose-700 ring-4 ring-rose-200 border-rose-500 animate-pulse' : 'bg-amber-100 text-amber-700 hover:border-amber-400'}">
                            {(bday.client.name_first?.charAt(0) || '')}{(bday.client.name_last?.charAt(0) || '')}
                        </div>
                        
                        <!-- Minimaler Text unter der Linie -->
                        <div class="absolute top-full mt-2 text-center w-24 px-1">
                            <p class="text-xs font-bold text-neutral-800 truncate group-hover:text-brand-600 transition-colors">{bday.client.name_first} {bday.client.name_last?.charAt(0)}.</p>
                            <p class="text-[10px] text-neutral-500 font-semibold">{bday.age} Jahre</p>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<ClientDetailModal bind:this={detailModal} />