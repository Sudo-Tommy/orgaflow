<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { 
        CalendarDays, Car, RefreshCw, ChevronLeft, ChevronRight, Loader2, FileText, 
        Printer, MapPin, ExternalLink, User, ShieldCheck, CheckCircle2, AlertCircle, 
        Sparkles, Navigation, Clock, Building2, Wallet
    } from "lucide-svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";

    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedYear = $state(new Date().getFullYear());
    let viewMode = $state<'monthly' | 'yearly'>('monthly');
    let isLoading = $state(false);
    let isGenerating = $state(false);
    let travelReports = $state<any[]>([]);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let userAddress = $state<string | null>(null);

    // Multi-User Support für Administratoren und Inhaber
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin' || rbacService.isOwner);
    let usersList = $state<any[]>([]);
    let selectedUserId = $state<string>("");
    let activeProvider = $state<string>('google_routes');

    let totals = $derived.by(() => {
        return travelReports.reduce((acc, r) => {
            acc.absence += r.totalAbsenceHours;
            acc.vma += r.perDiem;
            acc.mileage += r.mileageCosts;
            acc.accommodation += r.accommodation;
            acc.incidental += r.incidentalCosts;
            acc.total += r.dayTotal;
            acc.km += r.totalKm;
            return acc;
        }, { absence: 0, vma: 0, mileage: 0, accommodation: 0, incidental: 0, total: 0, km: 0 });
    });

    // Zentrale Konfiguration für den Microservice
    const microserviceUrl = (import.meta as any).env?.DEV ? 'http://localhost:3000' : ''; 

    // Gesetzliche Pauschalen Deutschland (Verpflegungsmehraufwand & Reisekosten)
    const PER_DIEM_RATES = {
        SINGLE_DAY_OVER_8H: 14.00, // Eintägig > 8 Stunden
        MULTI_DAY_BOUND: 14.00,    // An- und Abreisetag bei Mehrtagesreisen
        FULL_DAY: 28.00            // Voller Zwischentag (24h)
    };

    const KM_RATE = 0.30; // Gesetzliche Kilometerpauschale PKW
    const ACCOMMODATION_LUMP_SUM = 20.00; // Privatübernachtungspauschale pro Nacht ohne Beleg

    let hasLoaded = $state(false);

    // Cache für Fahrtzeiten und Distanzen, um API-Kosten zu sparen
    const travelCache = new Map<string, { duration: number; distance: number; provider: string }>();

    onMount(() => {
        selectedUserId = pb.authStore.model?.id || "";
        if (isSuperAdmin) {
            pb.collection('users').getFullList({ sort: 'name_first', requestKey: null })
                .then(res => { usersList = res; })
                .catch(() => {});
        }
        loadTravelReports();
    });

    /**
     * Berechnet die reale Fahrtzeit und Distanz zwischen zwei Adressen via Google Routes API.
     */
    async function estimateTravel(origin: string, destination: string): Promise<{ duration: number; distance: number; provider: string }> {
        if (!origin || !destination || origin.trim().length < 3 || destination.trim().length < 3) {
            return { duration: 30, distance: 15, provider: 'fallback' };
        }
        
        const cleanOrigin = origin.trim();
        const cleanDest = destination.trim();
        const cacheKey = `${cleanOrigin.toLowerCase()}|${cleanDest.toLowerCase()}`;
        if (travelCache.has(cacheKey)) return travelCache.get(cacheKey)!;

        try {
            const res = await fetch(`${microserviceUrl}/api/emails/vma/duration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({ origin: cleanOrigin, destination: cleanDest })
            });

            if (res.ok) {
                const data = await res.json();
                const result = {
                    duration: data.duration || 30,
                    distance: data.distance || 15,
                    provider: data.provider || 'google_routes'
                };
                activeProvider = result.provider;
                travelCache.set(cacheKey, result);
                return result;
            }
        } catch (e) {
            console.warn("[VMA Google Routes API] Abruf fehlgeschlagen:", e);
        }

        const fallback = { duration: 30, distance: 15, provider: 'standard_estimate' };
        travelCache.set(cacheKey, fallback);
        return fallback;
    }

    async function loadTravelReports() {
        isLoading = true;
        travelReports = [];
        userAddress = null;

        try {
            const effectiveUser = (isSuperAdmin && selectedUserId && usersList.length > 0)
                ? (usersList.find(u => u.id === selectedUserId) || pb.authStore.model)
                : pb.authStore.model;

            if (!effectiveUser) {
                toastStore.error("Bitte Benutzer auswählen oder anmelden.");
                return;
            }

            // 1. Heimatadresse des Mitarbeiters ermitteln
            userAddress = `${effectiveUser.street || ''} ${effectiveUser.housenr || ''}, ${effectiveUser.zip || ''} ${effectiveUser.city || ''}`.trim();
            if (!userAddress || userAddress.length < 5) {
                userAddress = null;
            }

            // 2. Termine für den Zeitraum laden
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
                filter: `user = "${effectiveUser.id}" && appointment >= "${startDate.toISOString()}" && appointment <= "${endDate.toISOString()}"`,
                sort: 'appointment',
                expand: 'time_record,client,drive_record,expenditures',
                requestKey: null
            });

            // 3. Filterung relevanter Termine (echte Arbeitszeit / Einsätze)
            const validAppointments = appointments.filter(app => {
                const desc = (app.description || "").toLowerCase();
                const isBlocked = desc.includes('[block]');
                const isExclusion = desc.includes('wochenende') || desc.includes('geschlossen');
                const hasTasks = app.tasks && (Array.isArray(app.tasks) ? app.tasks.length > 0 : !!app.tasks);
                const hasClient = app.client && (Array.isArray(app.client) ? app.client.length > 0 : !!app.client);
                const hasDuration = app.expand?.time_record && app.expand.time_record.some((tr: any) => tr.start && tr.end);

                if ((isBlocked && isExclusion) || (!hasTasks && !hasClient)) return false;
                return hasDuration;
            }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());

            // 4. Trip-Erkennung (zusammenhängende Reisen oder Tageseinsätze)
            const trips: any[][] = [];
            if (validAppointments.length > 0) {
                let currentTrip: any[] = [];
                for (let i = 0; i < validAppointments.length; i++) {
                    const app = validAppointments[i];
                    if (currentTrip.length === 0) {
                        currentTrip.push(app);
                    } else {
                        const lastApp = currentTrip[currentTrip.length - 1];
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

                // Start- und Endzeit des Trips inkl. Google Routes Fahrtzeit
                let departureTime = new Date(firstApp.appointment);

                let departureCalcAddr = firstApp.location_address;
                if (firstApp.use_client_address && firstApp.expand?.client?.[0]) {
                    const c = firstApp.expand.client[0];
                    const cAddr = `${c.street || ''} ${c.housenr || ''}, ${c.zip || ''} ${c.city || ''}`.trim();
                    if (cAddr && cAddr.length > 5) departureCalcAddr = cAddr;
                }

                let outwardKm = 0;
                let outwardMinutes = 0;
                if (userAddress && departureCalcAddr) {
                    const outward = await estimateTravel(userAddress, departureCalcAddr);
                    outwardKm = outward.distance;
                    outwardMinutes = outward.duration;
                    const travelMins = Math.ceil(outward.duration / 15) * 15;
                    departureTime = new Date(departureTime.getTime() - travelMins * 60 * 1000);
                }

                let lastAppEndTime = new Date(lastApp.appointment);
                if (lastApp.expand?.time_record?.length > 0) {
                    const latest = lastApp.expand.time_record.reduce((max: any, curr: any) =>
                        (curr.end && new Date(curr.end).getTime() > new Date(max.end || 0).getTime()) ? curr : max
                    );
                    if (latest.end) lastAppEndTime = new Date(latest.end);
                } else {
                    lastAppEndTime.setHours(lastAppEndTime.getHours() + 1);
                }

                let arrivalTime = lastAppEndTime;

                let arrivalCalcAddr = lastApp.location_address;
                if (lastApp.use_client_address && lastApp.expand?.client?.[0]) {
                    const c = lastApp.expand.client[0];
                    const cAddr = `${c.street || ''} ${c.housenr || ''}, ${c.zip || ''} ${c.city || ''}`.trim();
                    if (cAddr && cAddr.length > 5) arrivalCalcAddr = cAddr;
                }

                let returnKm = 0;
                let returnMinutes = 0;
                if (userAddress && arrivalCalcAddr) {
                    const returnTrip = await estimateTravel(arrivalCalcAddr, userAddress);
                    returnKm = returnTrip.distance;
                    returnMinutes = returnTrip.duration;
                    const travelMins = Math.ceil(returnTrip.duration / 15) * 15;
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
                        if (i === 0) perDiem = PER_DIEM_RATES.MULTI_DAY_BOUND;
                        else if (i === tripDaysCount - 1) perDiem = PER_DIEM_RATES.MULTI_DAY_BOUND;
                        else perDiem = PER_DIEM_RATES.FULL_DAY;
                    }

                    const dayApps = trip.filter(a => new Date(a.appointment).toLocaleDateString('en-CA') === currentDayStr);
                    
                    // Manuelle Drive-Records abfragen
                    let manualKm = dayApps.flatMap(a => a.expand?.drive_record || []).reduce((sum, dr) => sum + (dr.km || 0), 0);
                    
                    // Falls kein manueller Drive-Record vorhanden, ermittelt Google Routes API die exakten Fahrtkilometer
                    let totalKm = manualKm;
                    let isGoogleEstimatedKm = false;
                    if (totalKm === 0 && (outwardKm > 0 || returnKm > 0)) {
                        totalKm = Math.round((outwardKm + returnKm) * 10) / 10;
                        isGoogleEstimatedKm = true;
                    }

                    const dayExpenditures = dayApps.flatMap(a => a.expand?.expenditures || []);
                    const hotelCosts = dayExpenditures
                        .filter(e => (e.titel || '').toLowerCase().includes('hotel') || (e.titel || '').toLowerCase().includes('übernachtung'))
                        .reduce((sum, exp) => sum + (exp.sum || 0), 0);
                    
                    const incidentalCosts = dayExpenditures
                        .filter(e => !((e.titel || '').toLowerCase().includes('hotel') || (e.titel || '').toLowerCase().includes('übernachtung')))
                        .reduce((sum, exp) => sum + (exp.sum || 0), 0);

                    let accommodation = hotelCosts;
                    const isNightBeforeDeparture = isMultiDay && i < tripDaysCount - 1;
                    if (accommodation === 0 && isNightBeforeDeparture) {
                        accommodation = ACCOMMODATION_LUMP_SUM;
                    }

                    let dayAbsenceHours = 0;
                    if (!isMultiDay) {
                        dayAbsenceHours = (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
                    } else {
                        if (i === 0) {
                            const endOfDay = new Date(currentDay); endOfDay.setHours(23, 59, 59, 999);
                            dayAbsenceHours = (endOfDay.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
                        } else if (i === tripDaysCount - 1) {
                            const startOfDay = new Date(currentDay); startOfDay.setHours(0, 0, 0, 0);
                            dayAbsenceHours = (arrivalTime.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
                        } else {
                            dayAbsenceHours = 24;
                        }
                    }

                    const dayTotal = perDiem + (totalKm * KM_RATE) + incidentalCosts + accommodation;

                    // Zieladressen ermitteln
                    const destinationsList = dayApps.map(a => {
                        if (a.use_client_address && a.expand?.client?.[0]) {
                            const cl = a.expand.client[0];
                            return `${cl.street || ''} ${cl.housenr || ''}, ${cl.zip || ''} ${cl.city || ''}`.trim();
                        }
                        return a.location_address || '';
                    }).filter(Boolean);

                    const targetAddress = destinationsList[0] || departureCalcAddr || '';

                    processedReports.push({
                        date: currentDay,
                        departure: (i === 0) ? departureTime : null,
                        arrival: (i === tripDaysCount - 1) ? arrivalTime : null,
                        destination: dayApps.map(a => {
                            if (!a.location_address) return null;
                            const parts = a.location_address.split(',');
                            const lastPart = parts[parts.length - 1].trim();
                            return lastPart.replace(/^\d+\s+/, '').trim();
                        }).filter(Boolean).filter((v, i, a) => v && a.indexOf(v) === i).join('; ') || (isMultiDay ? 'Auswärtiger Aufenthalt' : 'Einsatzort'),
                        destinationAddress: targetAddress,
                        purpose: dayApps.flatMap(a => a.expand?.client || []).map(c => `${c.name_first} ${c.name_last}`).filter((v, i, a) => v && a.indexOf(v) === i).join('; ') || (isMultiDay ? trip[0].description : 'Betreuung / Assistenz'),
                        perDiem,
                        mileageCosts: totalKm * KM_RATE,
                        incidentalCosts,
                        accommodation,
                        dayTotal,
                        totalAbsenceHours: dayAbsenceHours,
                        totalKm,
                        isGoogleEstimatedKm,
                        outwardMinutes,
                        returnMinutes
                    });
                }
            }
            travelReports = processedReports.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
        } catch (e) {
            console.error("Fehler beim Laden der Reisekostenabrechnung:", e);
            toastStore.error("Fehler beim Laden der Reisekostenabrechnung.");
        } finally {
            isLoading = false;
            hasLoaded = true;
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

    function triggerPrint() {
        window.print();
    }

    async function downloadPdf() {
        if (travelReports.length === 0) return;
        isGenerating = true;
        
        try {
            const effectiveUser = (isSuperAdmin && selectedUserId && usersList.length > 0)
                ? (usersList.find(u => u.id === selectedUserId) || pb.authStore.model)
                : pb.authStore.model;

            const userName = `${effectiveUser?.name_first} ${effectiveUser?.name_last}`;
            const period = viewMode === 'monthly' 
                ? `${getMonthName(selectedMonth)} ${selectedYear}`
                : `Gesamtjahr ${selectedYear}`;
            
            let companyId = effectiveUser?.company;
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
                totalSum: travelReports.reduce((sum, r) => sum + r.dayTotal, 0).toFixed(2).replace('.', ',') + " €",
                totalAbsenceSum: formatDuration(totals.absence),
                totalVMASum: totals.vma.toFixed(2).replace('.', ','),
                totalAccommodationSum: totals.accommodation.toFixed(2).replace('.', ',')
            };

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
            
            pdfPreviewModal?.open(url, "Reisekostenabrechnung (VMA)", `Reisekosten_${userName.replace(/\s/g, '_')}_${period.replace(/\s/g, '_')}.pdf`);
            toastStore.success("Reisekostenabrechnung als PDF erstellt.");
        } catch (err) {
            console.error(err);
            toastStore.error("PDF konnte nicht erstellt werden.");
        } finally {
            isGenerating = false;
        }
    }
</script>

<PdfPreviewModal bind:this={pdfPreviewModal} />

<div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
    <!-- Header-Bereich -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b print:border-b-2 border-neutral-200/80 print:border-neutral-900 pb-5">
        <div>
            <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 print:hidden shadow-xs">
                    <Car class="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                    <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                        <span>Reisekosten & VMA</span>
                        <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hidden sm:inline-flex items-center gap-1">
                            <Sparkles class="w-3 h-3 text-emerald-500" />
                            Google Routes API
                        </span>
                    </h1>
                    <p class="text-xs sm:text-sm text-neutral-500 font-medium mt-0.5 no-print">Verpflegungsmehraufwand (§ 9 EStG), präzise Fahrtzeiten & Kilometergeld.</p>
                </div>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <!-- Mitarbeiter-Filter für Admins & Inhaber -->
            {#if isSuperAdmin && usersList.length > 0}
                <div class="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 shadow-2xs no-print">
                    <User class="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <select 
                        bind:value={selectedUserId} 
                        onchange={() => loadTravelReports()} 
                        class="text-xs font-semibold text-neutral-800 bg-transparent border-none focus:ring-0 cursor-pointer pr-4"
                        aria-label="Mitarbeiter auswählen"
                    >
                        <option value={pb.authStore.model?.id}>Mein Account ({pb.authStore.model?.name_first} {pb.authStore.model?.name_last})</option>
                        {#each usersList as u (u.id)}
                            {#if u.id !== pb.authStore.model?.id}
                                <option value={u.id}>{u.name_first} {u.name_last}</option>
                            {/if}
                        {/each}
                    </select>
                </div>
            {/if}

            <!-- Zeitraum Umschalter -->
            <div class="flex bg-neutral-100 p-1 rounded-xl no-print shadow-inner">
                <button 
                    type="button"
                    onclick={() => { viewMode = 'monthly'; loadTravelReports(); }}
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer {viewMode === 'monthly' ? 'bg-white shadow-xs text-indigo-600' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    Monat
                </button>
                <button 
                    type="button"
                    onclick={() => { viewMode = 'yearly'; loadTravelReports(); }}
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer {viewMode === 'yearly' ? 'bg-white shadow-xs text-indigo-600' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    Jahr
                </button>
            </div>

            <!-- Monat/Jahr Vor-Zurück -->
            <div class="flex items-center bg-white border border-neutral-200 rounded-xl p-0.5 shadow-2xs">
                <button type="button" onclick={prevPeriod} class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-neutral-50 rounded-lg transition-colors no-print cursor-pointer" aria-label="Vorheriger Zeitraum">
                    <ChevronLeft class="w-4 h-4" />
                </button>
                <span class="px-2 sm:px-3 text-center font-bold text-neutral-800 text-xs sm:text-sm whitespace-nowrap">
                    {viewMode === 'monthly' ? getMonthName(selectedMonth) : ''} {selectedYear}
                </span>
                <button type="button" onclick={nextPeriod} class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-neutral-50 rounded-lg transition-colors no-print cursor-pointer" aria-label="Nächster Zeitraum">
                    <ChevronRight class="w-4 h-4" />
                </button>
            </div>
            
            <!-- Actions Buttons -->
            <div class="flex items-center gap-2 no-print">
                <button 
                    type="button"
                    onclick={triggerPrint} 
                    disabled={travelReports.length === 0} 
                    class="p-2 sm:px-3 sm:py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer" 
                    title="Druckansicht öffnen"
                >
                    <Printer class="w-4 h-4 text-neutral-500" />
                    <span class="hidden sm:inline">Drucken</span>
                </button>

                <button 
                    type="button"
                    onclick={downloadPdf} 
                    disabled={isLoading || isGenerating || travelReports.length === 0} 
                    class="p-2 sm:px-3 sm:py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                    {#if isGenerating}
                        <Loader2 class="w-4 h-4 animate-spin text-indigo-600" />
                        <span class="hidden sm:inline">Erstelle PDF...</span>
                    {:else}
                        <FileText class="w-4 h-4 text-indigo-600" />
                        <span class="hidden sm:inline">PDF-Export</span>
                    {/if}
                </button>

                <button 
                    type="button"
                    onclick={loadTravelReports} 
                    disabled={isLoading} 
                    class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Reisekosten neu berechnen"
                >
                    <RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin' : ''}" />
                    <span>Aktualisieren</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Adressen-Warnung falls Heimatadresse fehlt -->
    {#if !userAddress}
        <div class="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start sm:items-center justify-between gap-3 shadow-2xs animate-enter no-print">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <AlertCircle class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-bold text-amber-900">Keine vollständige Wohnanschrift hinterlegt</p>
                    <p class="text-[11px] text-amber-700 mt-0.5 leading-relaxed">Für die automatische Google Routes Fahrtzeitberechnung zwischen Wohnort und Klienten muss eine gültige Adresse (Straße, PLZ, Ort) im Mitarbeiterprofil gepflegt sein.</p>
                </div>
            </div>
            <a href="/profile" class="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 rounded-xl text-xs font-bold transition-colors shrink-0">
                Profil bearbeiten &rarr;
            </a>
        </div>
    {/if}

    <!-- KPI Dashboard Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <!-- Card 1: Einsatztage -->
        <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
            <div class="flex items-center justify-between text-neutral-400 mb-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Einsatztage</span>
                <CalendarDays class="w-4 h-4 text-indigo-500" />
            </div>
            <p class="text-xl sm:text-2xl font-black text-neutral-900">{travelReports.length}</p>
            <p class="text-[10px] text-neutral-400 mt-0.5">Fahrten im Zeitraum</p>
        </div>

        <!-- Card 2: Abwesenheitsdauer -->
        <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
            <div class="flex items-center justify-between text-neutral-400 mb-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Abwesenheit</span>
                <Clock class="w-4 h-4 text-sky-500" />
            </div>
            <p class="text-xl sm:text-2xl font-black text-neutral-900">{formatDuration(totals.absence)}</p>
            <p class="text-[10px] text-neutral-400 mt-0.5">Inkl. Google Routes An-/Rückfahrt</p>
        </div>

        <!-- Card 3: VMA Pauschale -->
        <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
            <div class="flex items-center justify-between text-neutral-400 mb-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">VMA Pauschale</span>
                <span class="text-xs">🍽️</span>
            </div>
            <p class="text-xl sm:text-2xl font-black text-emerald-600">{totals.vma.toFixed(2).replace('.', ',')} €</p>
            <p class="text-[10px] text-neutral-400 mt-0.5">14 € (>8h) / 28 € (24h)</p>
        </div>

        <!-- Card 4: Fahrtkosten -->
        <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
            <div class="flex items-center justify-between text-neutral-400 mb-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Kilometergeld</span>
                <Car class="w-4 h-4 text-amber-500" />
            </div>
            <p class="text-xl sm:text-2xl font-black text-neutral-900">{totals.mileage.toFixed(2).replace('.', ',')} €</p>
            <p class="text-[10px] text-neutral-400 mt-0.5">{totals.km.toFixed(1)} km à 0,30 €</p>
        </div>

        <!-- Card 5: Übernachtung -->
        <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
            <div class="flex items-center justify-between text-neutral-400 mb-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Übernachtung</span>
                <Building2 class="w-4 h-4 text-purple-500" />
            </div>
            <p class="text-xl sm:text-2xl font-black text-neutral-900">{totals.accommodation.toFixed(2).replace('.', ',')} €</p>
            <p class="text-[10px] text-neutral-400 mt-0.5">Hotel & Pauschalen</p>
        </div>

        <!-- Card 6: Gesamtauszahlung -->
        <div class="bg-linear-to-br from-indigo-600 to-indigo-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm col-span-2 lg:col-span-1">
            <div class="flex items-center justify-between text-indigo-200 mb-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider">Erstattung</span>
                <Wallet class="w-4 h-4 text-indigo-200" />
            </div>
            <p class="text-2xl font-black text-white">{totals.total.toFixed(2).replace('.', ',')} €</p>
            <p class="text-[10px] text-indigo-200/90 mt-0.5">Auszahlungsanspruch Gesamt</p>
        </div>
    </div>

    <!-- Hauptinhalt: Tabelle / Liste -->
    <div class="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {#if isLoading}
            <div class="flex flex-col items-center justify-center py-24 text-neutral-400">
                <Loader2 class="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                <p class="text-sm font-semibold text-neutral-700">Berechne Routen via Google Routes API...</p>
                <p class="text-xs text-neutral-400 mt-1">Ermittle Fahrtzeiten, Distanzen und Verpflegungsmehraufwand</p>
            </div>
        {:else if !hasLoaded}
            <div class="flex flex-col items-center justify-center py-20 text-neutral-400 p-6 text-center">
                <Car class="w-12 h-12 mb-3 text-indigo-400 opacity-60" />
                <p class="font-bold text-neutral-800 text-base">Reisekosten & VMA für {viewMode === 'monthly' ? getMonthName(selectedMonth) : ''} {selectedYear}</p>
                <p class="text-xs text-neutral-500 mt-1 max-w-md">Klicken Sie auf „Aktualisieren“, um die Termine dieses Zeitraums abzurufen und Fahrtzeiten per Google Routes API zu analysieren.</p>
                <button type="button" onclick={loadTravelReports} class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer">
                    <RefreshCw class="w-4 h-4" /> Jetzt analysieren
                </button>
            </div>
        {:else if travelReports.length === 0}
            <div class="flex flex-col items-center justify-center py-20 text-neutral-400 p-6 text-center">
                <CalendarDays class="w-12 h-12 mb-3 opacity-40 text-neutral-400" />
                <p class="font-bold text-neutral-700">Keine abrechenbaren Reisekosten für diesen Zeitraum.</p>
                <p class="text-xs text-neutral-500 mt-1 max-w-md">Es wurden keine Termine mit erfasster Arbeitszeit oder Klientenkontakt in diesem Monat/Jahr gefunden.</p>
            </div>
        {:else}
            <!-- Responsive Desktop Table -->
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse text-sm min-w-max tabular-nums">
                    <thead>
                        <tr class="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-xs">
                            <th class="py-3.5 px-4">Datum</th>
                            <th class="py-3.5 px-4">Reisezeit</th>
                            <th class="py-3.5 px-4">Einsatzort & Route</th>
                            <th class="py-3.5 px-4">Zweck / Klient</th>
                            <th class="py-3.5 px-4 text-right">Abwesenheit</th>
                            <th class="py-3.5 px-4 text-right">Distanz</th>
                            <th class="py-3.5 px-4 text-right">VMA Pauschale</th>
                            <th class="py-3.5 px-4 text-right">Fahrtkosten</th>
                            <th class="py-3.5 px-4 text-right">Übernachtung</th>
                            <th class="py-3.5 px-4 text-right font-black text-slate-900 dark:text-slate-100">Tagessumme</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                        {#each travelReports as report (report.date.toISOString())}
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                <td class="py-3.5 px-4 whitespace-nowrap">
                                    <div class="font-bold text-slate-900 dark:text-slate-100">
                                        {report.date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </div>
                                </td>
                                <td class="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-200 font-medium">
                                    {#if report.departure && report.arrival}
                                        <div class="flex items-center gap-1.5">
                                            <span>{formatTime(report.departure)}</span>
                                            <span class="text-slate-400">&rarr;</span>
                                            <span>{formatTime(report.arrival)}</span>
                                        </div>
                                    {:else if report.departure}
                                        <span>ab {formatTime(report.departure)}</span>
                                    {:else if report.arrival}
                                        <span>bis {formatTime(report.arrival)}</span>
                                    {:else}
                                        <span class="text-slate-400 dark:text-slate-500">Ganztägig (24h)</span>
                                    {/if}
                                </td>
                                <td class="py-3.5 px-4 max-w-xs">
                                    <div class="flex items-center gap-1.5">
                                        <span class="font-semibold text-slate-900 dark:text-slate-100 truncate" title={report.destinationAddress || report.destination}>
                                            {report.destination}
                                        </span>
                                        {#if report.destinationAddress}
                                            <a 
                                                href="https://www.google.com/maps/dir/?api=1&origin={encodeURIComponent(userAddress || '')}&destination={encodeURIComponent(report.destinationAddress)}" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                class="text-slate-400 hover:text-indigo-600 transition-colors print:hidden shrink-0" 
                                                title="Route in Google Maps öffnen"
                                            >
                                                <ExternalLink class="w-3.5 h-3.5" />
                                            </a>
                                        {/if}
                                    </div>
                                </td>
                                <td class="py-3.5 px-4 text-slate-700 dark:text-slate-200 font-medium max-w-xs truncate" title={report.purpose}>
                                    {report.purpose}
                                </td>
                                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                                    <span class="font-bold text-slate-800 dark:text-slate-100">{formatDuration(report.totalAbsenceHours)}</span>
                                </td>
                                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                                    {#if report.totalKm > 0}
                                        <span class="font-semibold text-slate-800 dark:text-slate-100">{report.totalKm} km</span>
                                        {#if report.isGoogleEstimatedKm}
                                            <span class="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Google Routes</span>
                                        {/if}
                                    {:else}
                                        <span class="text-slate-400 dark:text-slate-600">-</span>
                                    {/if}
                                </td>
                                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                                    {#if report.perDiem > 0}
                                        <span class="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60 text-xs">
                                            {report.perDiem.toFixed(2).replace('.', ',')} €
                                        </span>
                                    {:else}
                                        <span class="text-slate-400 dark:text-slate-600 font-medium">-</span>
                                    {/if}
                                </td>
                                <td class="py-3.5 px-4 text-right whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold">
                                    {report.mileageCosts > 0 ? `${report.mileageCosts.toFixed(2).replace('.', ',')} €` : '-'}
                                </td>
                                <td class="py-3.5 px-4 text-right whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold">
                                    {report.accommodation > 0 ? `${report.accommodation.toFixed(2).replace('.', ',')} €` : '-'}
                                </td>
                                <td class="py-3.5 px-4 text-right whitespace-nowrap font-black text-indigo-700 dark:text-indigo-400 text-sm sm:text-base">
                                    {report.dayTotal.toFixed(2).replace('.', ',')} €
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                    <tfoot>
                        <tr class="bg-slate-100/95 dark:bg-slate-800/95 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-slate-100">
                            <td colspan="4" class="py-4 px-4 uppercase tracking-wider">Gesamtergebnis ({travelReports.length} Einsätze):</td>
                            <td class="py-4 px-4 text-right">{formatDuration(totals.absence)}</td>
                            <td class="py-4 px-4 text-right">{totals.km.toFixed(1)} km</td>
                            <td class="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black">{totals.vma.toFixed(2).replace('.', ',')} €</td>
                            <td class="py-4 px-4 text-right">{totals.mileage.toFixed(2).replace('.', ',')} €</td>
                            <td class="py-4 px-4 text-right">{totals.accommodation.toFixed(2).replace('.', ',')} €</td>
                            <td class="py-4 px-4 text-right text-indigo-700 dark:text-indigo-400 font-black text-base">{totals.total.toFixed(2).replace('.', ',')} €</td>
                        </tr>
                    </tfoot>
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
        table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8pt !important;
        }
        th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 4px !important;
        }
        th {
            background-color: #f8fafc !important;
        }
    }
</style>