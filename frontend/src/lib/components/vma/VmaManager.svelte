<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { CalendarDays, Car, RefreshCw, ChevronLeft, ChevronRight, Loader2, FileText } from "lucide-svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";

    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedYear = $state(new Date().getFullYear());
    let viewMode = $state<'monthly' | 'yearly'>('monthly');
    let isLoading = $state(false);
    let isGenerating = $state(false);
    let travelReports = $state<any[]>([]);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let userAddress = $state<string | null>(null);

    let totals = $derived.by(() => {
        return travelReports.reduce((acc, r) => {
            acc.absence += r.totalAbsenceHours;
            acc.vma += r.perDiem;
            acc.mileage += r.mileageCosts;
            acc.accommodation += r.accommodation;
            acc.incidental += r.incidentalCosts;
            acc.total += r.dayTotal;
            return acc;
        }, { absence: 0, vma: 0, mileage: 0, accommodation: 0, incidental: 0, total: 0 });
    });

    // Zentrale Konfiguration für den Microservice
    const microserviceUrl = (import.meta as any).env?.DEV ? 'http://localhost:3000' : ''; 
    // Hinweis: Im Produktivbetrieb sollte die URL auf einen Proxy (z.B. /api/vma/) zeigen

    // Per diem rates (simplified German rules)
    const PER_DIEM_RATES = {
        SINGLE_DAY_OVER_8H: 14,
        MULTI_DAY_BOUND: 14,
        FULL_DAY: 28
    };

    const KM_RATE = 0.30;
    const ACCOMMODATION_LUMP_SUM = 20.00; // Privatübernachtung pro Nacht

    onMount(async () => {
        await loadTravelReports();
    });

    async function loadTravelReports() {
        isLoading = true;
        travelReports = [];
        userAddress = null;

        try {
            const currentUser = pb.authStore.model;
            if (!currentUser) {
                toastStore.error("Bitte melden Sie sich an, um Reisekosten abzurufen.");
                return;
            }

            // 1. Get user's home address
            userAddress = `${currentUser.street || ''} ${currentUser.housenr || ''}, ${currentUser.zip || ''} ${currentUser.city || ''}`.trim();
            if (!userAddress) {
                toastStore.warning("Ihre Adresse ist nicht vollständig hinterlegt. Reisezeiten können nicht berechnet werden.");
            }

            // 2. Fetch appointments for the selected month/year for the current user
            let startDate: Date;
            let endDate: Date;

            if (viewMode === 'monthly') {
                startDate = new Date(selectedYear, selectedMonth - 1, 1);
                endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
            } else {
                startDate = new Date(selectedYear, 0, 1);
                endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
            }

            const appointments = await pb.collection('appointments').getFullList({
                filter: `user = "${currentUser.id}" && appointment >= "${startDate.toISOString()}" && appointment <= "${endDate.toISOString()}"`,
                sort: 'appointment',
                expand: 'time_record,client,drive_record,expenditures', // Lade alle relevanten Kosten-Daten
                requestKey: null
            });

            // 3. Filterung: Ignoriere allgemeine Sperrzeiten ODER Termine ohne Leistungen (Tasks) & Klienten
            const validAppointments = appointments.filter(app => {
                const desc = (app.description || "").toLowerCase();
                const isBlocked = desc.includes('[block]');
                const isExclusion = desc.includes('wochenende') || desc.includes('geschlossen');
                const hasTasks = app.tasks && (Array.isArray(app.tasks) ? app.tasks.length > 0 : !!app.tasks);
                const hasClient = app.client && (Array.isArray(app.client) ? app.client.length > 0 : !!app.client);
                
                // Nur Termine mit tatsächlich erfasster Arbeitszeit (Dauer) berücksichtigen
                const hasDuration = app.expand?.time_record && app.expand.time_record.some((tr: any) => tr.start && tr.end);
                
                // Bedingung: Ignoriere explizite Schließzeiten. 
                // Termine ohne Leistungen UND ohne Klienten werden ignoriert.
                if ((isBlocked && isExclusion) || (!hasTasks && !hasClient)) return false;

                return hasDuration;
            }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());

            // 4. Trip-Erkennung basierend auf Titel und aufeinanderfolgenden Tagen
            const trips: any[][] = [];
            if (validAppointments.length > 0) {
                let currentTrip: any[] = [];
                for (let i = 0; i < validAppointments.length; i++) {
                    const app = validAppointments[i];
                    if (currentTrip.length === 0) {
                        currentTrip.push(app);
                    } else {
                        const lastApp = currentTrip[currentTrip.length - 1];
                        
                        // Ermittle das tatsächliche Ende des letzten Termins für die Lücken-Berechnung
                        let lastEnd = new Date(lastApp.appointment);
                        if (lastApp.expand?.time_record?.length > 0) {
                            const latest = lastApp.expand.time_record.reduce((max: any, curr: any) => 
                                (curr.end && new Date(curr.end).getTime() > new Date(max.end || 0).getTime()) ? curr : max
                            );
                            if (latest.end) lastEnd = new Date(latest.end);
                        } else {
                            lastEnd.setHours(lastEnd.getHours() + 1);
                        }

                        const lastDateStr = new Date(lastApp.appointment).toLocaleDateString('en-CA');
                        const currDateStr = new Date(app.appointment).toLocaleDateString('en-CA');
                        
                        const isSameDay = lastDateStr === currDateStr;
                        const lastDate = new Date(lastDateStr);
                        const currDate = new Date(currDateStr);
                        const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        const isNextDay = diffDays === 1;
                        const isSameTitle = app.description === lastApp.description;

                        // Lücke berechnen: Wenn mehr als 12h Pause zwischen Terminen liegt, ist man meist zu Hause.
                        // AUSNAHME: Der Titel deutet explizit auf eine Reise hin (Reise, Begleitung, Aufenthalt).
                        const gapMs = new Date(app.appointment).getTime() - lastEnd.getTime();
                        const gapHours = gapMs / (1000 * 60 * 60);
                        const descLower = (app.description || "").toLowerCase();
                        const isTravelKeyword = descLower.includes('reise') || descLower.includes('begleitung') || descLower.includes('aufenthalt') || descLower.includes('übernachtung');
                        
                        const isContinuousTrip = isSameTitle && isNextDay && (gapHours < 12 || isTravelKeyword);

                        if (isSameDay || (isNextDay && isContinuousTrip)) {
                            currentTrip.push(app);
                        } else {
                            trips.push(currentTrip);
                            currentTrip = [app];
                        }
                    }
                }
                if (currentTrip.length > 0) trips.push(currentTrip);
            }

            const processedReports: any[] = [];

            for (const trip of trips) {
                const firstApp = trip[0];
                const lastApp = trip[trip.length - 1];

                // Start- und Endzeit des gesamten Trips inkl. Fahrtzeit berechnen
                let departureTime = new Date(firstApp.appointment);

                // Bestimme die Adresse für die Berechnung der Anfahrt (Klient vs. Zielort)
                let departureCalcAddr = firstApp.location_address;
                if (firstApp.use_client_address && firstApp.expand?.client?.[0]) {
                    const c = firstApp.expand.client[0];
                    const cAddr = `${c.street || ''} ${c.housenr || ''}, ${c.zip || ''} ${c.city || ''}`.trim();
                    if (cAddr && cAddr.length > 5) departureCalcAddr = cAddr;
                }

                if (userAddress && departureCalcAddr) {
                    // Fahrtzeit via TravelTime API berechnen und auf 15 Min aufrunden
                    const travelMinsRaw = await estimateTravelDurationMinutes(userAddress, departureCalcAddr);
                    const travelMins = Math.ceil(travelMinsRaw / 15) * 15;
                    departureTime = new Date(departureTime.getTime() - travelMins * 60 * 1000);
                }

                let lastAppEndTime = new Date(lastApp.appointment);
                if (lastApp.expand?.time_record?.length > 0) {
                    // Tatsächliches Ende aus Zeiterfassung nehmen
                    const latest = lastApp.expand.time_record.reduce((max: any, curr: any) =>
                        (curr.end && new Date(curr.end).getTime() > new Date(max.end || 0).getTime()) ? curr : max
                    );
                    if (latest.end) lastAppEndTime = new Date(latest.end);
                } else {
                    lastAppEndTime.setHours(lastAppEndTime.getHours() + 1);
                }

                let arrivalTime = lastAppEndTime;

                // Bestimme die Adresse für die Berechnung der Rückfahrt (Klient vs. Zielort)
                let arrivalCalcAddr = lastApp.location_address;
                if (lastApp.use_client_address && lastApp.expand?.client?.[0]) {
                    const c = lastApp.expand.client[0];
                    const cAddr = `${c.street || ''} ${c.housenr || ''}, ${c.zip || ''} ${c.city || ''}`.trim();
                    if (cAddr && cAddr.length > 5) arrivalCalcAddr = cAddr;
                }

                if (userAddress && arrivalCalcAddr) {
                    // Rückfahrtzeit via TravelTime API berechnen und auf 15 Min aufrunden
                    const travelMinsRaw = await estimateTravelDurationMinutes(arrivalCalcAddr, userAddress);
                    const travelMins = Math.ceil(travelMinsRaw / 15) * 15;
                    arrivalTime = new Date(arrivalTime.getTime() + travelMins * 60 * 1000);
                }

                const isMultiDay = arrivalTime.toLocaleDateString('en-CA') !== departureTime.toLocaleDateString('en-CA');
                const startDayTs = new Date(departureTime).setHours(0,0,0,0);
                const endDayTs = new Date(arrivalTime).setHours(0,0,0,0);
                const tripDaysCount = Math.round((endDayTs - startDayTs) / (1000 * 60 * 60 * 24)) + 1;

                for (let i = 0; i < tripDaysCount; i++) {
                    const currentDay = new Date(departureTime);
                    currentDay.setDate(currentDay.getDate() + i);
                    const currentDayStr = currentDay.toLocaleDateString('en-CA');

                    let perDiem = 0;
                    if (!isMultiDay) {
                        const hours = (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
                        if (hours > 8) perDiem = PER_DIEM_RATES.SINGLE_DAY_OVER_8H;
                    } else {
                        if (i === 0) perDiem = PER_DIEM_RATES.MULTI_DAY_BOUND; // Anreisetag
                        else if (i === tripDaysCount - 1) perDiem = PER_DIEM_RATES.MULTI_DAY_BOUND; // Abreisetag
                        else perDiem = PER_DIEM_RATES.FULL_DAY; // Zwischentag
                    }

                    if (perDiem === 0 && !isMultiDay) continue;

                    const dayApps = trip.filter(a => new Date(a.appointment).toLocaleDateString('en-CA') === currentDayStr);
                    const totalKm = dayApps.flatMap(a => a.expand?.drive_record || []).reduce((sum, dr) => sum + (dr.km || 0), 0);
                    
                    // Kosten aufschlüsseln nach Hotel vs. Nebenkosten (Schritt 4 & 5)
                    const dayExpenditures = dayApps.flatMap(a => a.expand?.expenditures || []);
                    const hotelCosts = dayExpenditures
                        .filter(e => (e.titel || '').toLowerCase().includes('hotel') || (e.titel || '').toLowerCase().includes('übernachtung'))
                        .reduce((sum, exp) => sum + (exp.sum || 0), 0);
                    
                    const incidentalCosts = dayExpenditures
                        .filter(e => !((e.titel || '').toLowerCase().includes('hotel') || (e.titel || '').toLowerCase().includes('übernachtung')))
                        .reduce((sum, exp) => sum + (exp.sum || 0), 0);

                    // Automatische Privat-Übernachtungspauschale, wenn kein Hotel-Beleg da ist (Schritt 4)
                    let accommodation = hotelCosts;
                    const isNightBeforeDeparture = isMultiDay && i < tripDaysCount - 1;
                    if (accommodation === 0 && isNightBeforeDeparture) {
                        accommodation = ACCOMMODATION_LUMP_SUM;
                    }

                    // Berechnung der tatsächlichen Abwesenheitsstunden für diesen spezifischen Tag
                    let dayAbsenceHours = 0;
                    if (!isMultiDay) {
                        dayAbsenceHours = (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
                    } else {
                        if (i === 0) {
                            // Anreisetag: Abfahrt bis Mitternacht
                            const endOfDay = new Date(currentDay); endOfDay.setHours(23, 59, 59, 999);
                            dayAbsenceHours = (endOfDay.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
                        } else if (i === tripDaysCount - 1) {
                            // Abreisetag: Mitternacht bis Ankunft
                            const startOfDay = new Date(currentDay); startOfDay.setHours(0, 0, 0, 0);
                            dayAbsenceHours = (arrivalTime.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
                        } else {
                            dayAbsenceHours = 24;
                        }
                    }

                    const dayTotal = perDiem + (totalKm * KM_RATE) + incidentalCosts + accommodation;
                    
                    processedReports.push({
                        date: currentDay,
                        departure: (i === 0) ? departureTime : null,
                        arrival: (i === tripDaysCount - 1) ? arrivalTime : null,
                        destination: dayApps.map(a => {
                            if (!a.location_address) return null;
                            const parts = a.location_address.split(',');
                            const lastPart = parts[parts.length - 1].trim();
                            return lastPart.replace(/^\d+\s+/, '').trim(); // Extrahiert nur den Ortsnamen (entfernt PLZ)
                        }).filter(Boolean).filter((v, i, a) => v && a.indexOf(v) === i).join('; ') || (isMultiDay ? 'Auswärtiger Aufenthalt' : 'Einsatzort'),
                        purpose: dayApps.flatMap(a => a.expand?.client || []).map(c => `${c.name_first} ${c.name_last}`).filter((v, i, a) => v && a.indexOf(v) === i).join('; ') || (isMultiDay ? trip[0].description : 'Betreuung'),
                        perDiem,
                        mileageCosts: totalKm * KM_RATE,
                        incidentalCosts,
                        accommodation,
                        dayTotal,
                        totalAbsenceHours: dayAbsenceHours,
                        totalKm
                    });
                }
            }
            travelReports = processedReports.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
        } catch (e) {
            console.error("Fehler beim Laden der Reisekostenabrechnungen:", e);
            toastStore.error("Fehler beim Laden der Reisekostenabrechnungen.");
        } finally {
            isLoading = false;
        }
    }

    // Cache für Fahrtzeiten, um API-Kosten zu sparen und Ladezeiten zu verkürzen
    const travelCache = new Map<string, number>();

    /**
     * Berechnet die reale Fahrtzeit zwischen zwei Adressen via TravelTime API.
     */
    async function estimateTravelDurationMinutes(origin: string, destination: string): Promise<number> {
        if (!origin || !destination || origin.trim().length < 3 || destination.trim().length < 3) return 30;
        
        const cacheKey = `${origin}|${destination}`;
        if (travelCache.has(cacheKey)) return travelCache.get(cacheKey)!;

        try {
            // Aufruf des spezifischen TravelTime Proxy Endpunkts
            // Nutzt /api/emails/ Präfix für korrektes Nginx-Routing in Produktion
            const res = await fetch(`${microserviceUrl}/api/emails/traveltime/duration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({ origin, destination })
            });

            const contentType = res.headers.get("content-type");
            if (res.ok && contentType && contentType.includes("application/json")) {
                const data = await res.json();
                travelCache.set(cacheKey, data.duration);
                return data.duration;
            }
            
            return 30; 
        } catch (e) {
            console.error("Microservice TravelTime Fehler:", e);
            return 30; 
        }
    }

    function formatTime(date: Date | null): string {
        if (!date) return "";
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDuration(hours: number): string {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    }

    function getMonthName(month: number): string {
        const date = new Date(selectedYear, month - 1, 1);
        return date.toLocaleString('de-DE', { month: 'long' });
    }

    function prevPeriod() {
        if (viewMode === 'monthly') {
            if (selectedMonth === 1) {
                selectedMonth = 12;
                selectedYear--;
            } else {
                selectedMonth--;
            }
        } else {
            selectedYear--;
        }
        loadTravelReports();
    }

    function nextPeriod() {
        if (viewMode === 'monthly') {
            if (selectedMonth === 12) {
                selectedMonth = 1;
                selectedYear++;
            } else {
                selectedMonth++;
            }
        } else {
            selectedYear++;
        }
        loadTravelReports();
    }

    async function downloadPdf() {
        if (travelReports.length === 0) return;
        isGenerating = true;
        
        try {
            const user = pb.authStore.model;
            const userName = `${user?.name_first} ${user?.name_last}`;
            const period = viewMode === 'monthly' 
                ? `${getMonthName(selectedMonth)} ${selectedYear}`
                : `Gesamtjahr ${selectedYear}`;
            
            let companyId = user?.company;
            if (Array.isArray(companyId)) companyId = companyId[0];
 
            const payload = {
                userName,
                period,
                companyId,
                reports: travelReports.map(r => ({
                    date: r.date.toLocaleDateString('de-DE'),
                    times: r.departure && r.arrival 
                        ? `${formatTime(r.departure)} - ${formatTime(r.arrival)}`
                        : (r.departure ? `${formatTime(r.departure)} - 24:00` : (r.arrival ? `00:00 - ${formatTime(r.arrival)}` : '00:00 - 24:00')),
                    destination: r.destination,
                    purpose: r.purpose,
                    absence: formatDuration(r.totalAbsenceHours),
                    perDiem: `${r.perDiem.toFixed(2).replace('.', ',')} €`,
                    accommodation: `${r.accommodation.toFixed(2).replace('.', ',')} €`,
                    total: `${r.dayTotal.toFixed(2).replace('.', ',')} €`
                })),
                totalSum: travelReports.reduce((sum, r) => sum + r.dayTotal, 0).toFixed(2).replace('.', ',') + " €", // This is the overall total displayed under the main table and in the breakdown
                totalAbsenceSum: formatDuration(totals.absence),
                totalVMASum: totals.vma.toFixed(2).replace('.', ','),
                totalAccommodationSum: totals.accommodation.toFixed(2).replace('.', ',')
            };

            // PDF-Generierung über den Microservice Endpunkt
            // Nutzt /api/emails/ Präfix für korrektes Nginx-Routing in Produktion
            const response = await fetch(`${microserviceUrl}/api/emails/vma/pdf`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Fehler bei der PDF-Generierung");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            pdfPreviewModal?.open(url, "Reisekostenabrechnung", `Reisekosten_${userName.replace(/\s/g, '_')}_${period.replace(/\s/g, '_')}.pdf`);
            
            toastStore.success("PDF wurde erfolgreich generiert.");
        } catch (err) {
            console.error(err);
            toastStore.error("PDF konnte nicht erstellt werden.");
        } finally {
            isGenerating = false;
        }
    }
</script>

<PdfPreviewModal bind:this={pdfPreviewModal} />

<div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b print:border-b-2 border-neutral-100 print:border-neutral-900 pb-4">
        <div>
            <h1 class="text-xl sm:text-3xl font-black text-neutral-900 flex items-center gap-2 sm:gap-3 print:text-4xl">
                <Car class="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 print:hidden" /> 
                <span class="uppercase tracking-tight print:tracking-tighter">Reisekosten</span>
            </h1>
            <p class="text-xs sm:text-sm text-neutral-500 font-medium mt-1 no-print">Übersicht Ihrer Verpflegungsmehraufwendungen & Kilometerpauschalen.</p>
        </div>
        
        <div class="flex flex-col items-stretch sm:items-end gap-2">
            <div class="hidden print:block text-right mb-2">
                <p class="text-lg font-bold text-neutral-900">{pb.authStore.model?.name_first} {pb.authStore.model?.name_last}</p>
                <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Erstellt am {new Date().toLocaleDateString('de-DE')}</p>
            </div>
            
            <div class="flex flex-wrap items-center gap-2">
            <div class="flex flex-1 sm:flex-none bg-neutral-100 p-1 rounded-xl no-print shadow-inner">
                <button 
                    onclick={() => { viewMode = 'monthly'; loadTravelReports(); }}
                    class="flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all {viewMode === 'monthly' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-400 hover:text-neutral-600'}"
                >
                    Monat
                </button>
                <button 
                    onclick={() => { viewMode = 'yearly'; loadTravelReports(); }}
                    class="flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all {viewMode === 'yearly' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-400 hover:text-neutral-600'}"
                >
                    Jahr
                </button>
            </div>

            <div class="flex flex-1 sm:flex-none items-center bg-white border-2 border-neutral-100 rounded-xl p-0.5 shadow-sm shrink-0">
                <button onclick={prevPeriod} class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors no-print" aria-label="Vorheriger Zeitraum">
                    <ChevronLeft class="w-5 h-5" />
                </button>
                <span class="flex-1 sm:w-32 text-center font-black text-neutral-800 text-xs sm:text-sm tracking-tight print:text-lg">
                    {viewMode === 'monthly' ? getMonthName(selectedMonth) : ''} {selectedYear}
                </span>
                <button onclick={nextPeriod} class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors no-print" aria-label="Nächster Zeitraum">
                    <ChevronRight class="w-5 h-5" />
                </button>
            </div>
            
            <div class="flex gap-2 w-full sm:w-auto">
                <button onclick={downloadPdf} disabled={isLoading || isGenerating || travelReports.length === 0} class="flex-1 sm:flex-none justify-center bg-white border-2 border-neutral-100 text-neutral-600 hover:bg-neutral-50 hover:text-indigo-600 rounded-xl shadow-sm transition-all active:scale-95 px-4 py-2.5 text-xs font-bold flex items-center gap-2 no-print">
                {#if isGenerating}
                    <Loader2 class="w-4 h-4 animate-spin" /> <span class="hidden sm:inline">Wird erstellt...</span>
                {:else}
                    <FileText class="w-4 h-4" /> PDF-Export
                {/if}
                </button>
                <button onclick={loadTravelReports} disabled={isLoading} class="w-11 sm:w-auto justify-center bg-white border-2 border-neutral-100 text-neutral-600 hover:bg-neutral-50 hover:text-indigo-600 rounded-xl shadow-sm transition-all active:scale-95 px-4 py-2.5 text-xs font-bold flex items-center gap-2 no-print" title="Aktualisieren">
                    <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" /> <span class="hidden sm:inline">Aktualisieren</span>
                </button>
            </div>
        </div>
        </div>
    </div>

    <div class="space-y-4">
        {#if isLoading}
            <div class="flex flex-col items-center justify-center py-20 text-neutral-400">
                <Loader2 class="w-8 h-8 animate-spin mb-4" />
                <p class="font-medium">Lade Reisekostenabrechnung...</p>
            </div>
        {:else if travelReports.length === 0}
            <div class="flex flex-col items-center justify-center py-20 text-neutral-400 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                <CalendarDays class="w-12 h-12 mb-4 opacity-50" />
                <p class="font-bold text-neutral-600">Keine Reisekosten für diesen Zeitraum.</p>
                <p class="text-sm mt-1">Stellen Sie sicher, dass Termine mit Zieladressen und Zeiterfassungen vorliegen.</p>
                {#if !userAddress}
                    <p class="text-xs text-rose-500 mt-4">Ihre Adresse ist nicht vollständig hinterlegt. Bitte ergänzen Sie diese in Ihrem Profil.</p>
                {/if}
            </div>
        {:else}
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse text-sm min-w-max">
                    <thead class="sticky top-0 bg-neutral-100 z-10 shadow-sm border-b border-neutral-200">
                        <tr>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap">Datum</th>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap">Abfahrt / Ankunft</th>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap">Ziel</th>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap">Zweck</th>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap text-right">Abwesenheit</th>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap text-right">VMA</th>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap text-right">Übernachtung</th>
                            <th class="p-3 font-bold text-neutral-800 whitespace-nowrap text-right">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-100 bg-white">
                        {#each travelReports as report (report.date.toISOString())}
                            <tr class="hover:bg-indigo-50/50 transition-colors">
                                <td class="p-3 text-neutral-600 whitespace-nowrap">
                                    {report.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </td>
                                <td class="p-3 text-neutral-600 whitespace-nowrap">
                                    {#if report.departure && report.arrival}
                                        {formatTime(report.departure)} - {formatTime(report.arrival)}
                                    {:else if report.departure}
                                        {formatTime(report.departure)} - 24:00
                                    {:else if report.arrival}
                                        00:00 - {formatTime(report.arrival)}
                                    {:else}
                                        00:00 - 24:00
                                    {/if}
                                </td>
                                <td class="p-3 text-neutral-600 max-w-xs truncate" title={report.destination}>
                                    {report.destination}
                                </td>
                                <td class="p-3 text-neutral-600 max-w-xs truncate" title={report.purpose}>
                                    {report.purpose}
                                </td>
                                <td class="p-3 text-neutral-600 whitespace-nowrap text-right">
                                    {formatDuration(report.totalAbsenceHours)} 
                                    {#if report.totalKm > 0}<br><span class="text-[10px] text-neutral-400">({report.totalKm} km)</span>{/if}
                                </td>
                                <td class="p-3 text-neutral-600 whitespace-nowrap text-right">
                                    {report.perDiem.toFixed(2).replace('.', ',')} €
                                </td>
                                <td class="p-3 text-neutral-600 whitespace-nowrap text-right">
                                    {report.accommodation.toFixed(2).replace('.', ',')} €
                                </td>
                                <td class="p-3 text-indigo-600 font-bold whitespace-nowrap text-right">
                                    {report.dayTotal.toFixed(2).replace('.', ',')} €
                                </td>
                            </tr>
                        {/each}
                        <tr class="bg-neutral-50 border-t border-neutral-200">
                            <td colspan="7" class="p-3 font-bold text-neutral-900 text-right">Auszahlung Gesamt:</td>
                            <td class="p-3 font-black text-indigo-700 text-lg text-right">
                                {travelReports.reduce((sum, r) => sum + r.dayTotal, 0).toFixed(2).replace('.', ',')} €
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>

<style>
    @media print {
        :global(aside, header, nav, .no-print) {
            display: none !important;
        }
        :global(body) {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .orga-card-white {
            border: 1px solid #f1f5f9 !important;
            box-shadow: none !important;
        }
        table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8.5pt !important;
        }
        th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px 6px !important;
        }
        th {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    }
</style>