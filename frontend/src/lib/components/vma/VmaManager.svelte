<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { vmaSettlementService, type VmaSettlementRecord } from "$lib/services/vmaSettlementService.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import type { TravelReport, TravelMealState } from "./vmaTypes";
    import { 
        calculateTotals, recalculateReportWithMeals, estimateTravel, 
        getMonthName, loadStoredMeals, saveStoredMeals, loadCompanyData 
    } from "./vmaCalculationService";
    import { processAppointmentsToReports } from "./vmaAppointmentProcessor";
    import { buildPdfPayload, requestPdfBlob } from "./vmaPdfHelper";
    import VmaHeader from "./VmaHeader.svelte";
    import VmaStatusBanner from "./VmaStatusBanner.svelte";
    import VmaPillarsInfo from "./VmaPillarsInfo.svelte";
    import VmaSummaryCards from "./VmaSummaryCards.svelte";
    import VmaReportTable from "./VmaReportTable.svelte";
    import VmaHistoryModal from "./VmaHistoryModal.svelte";

    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedYear = $state(new Date().getFullYear());
    let viewMode = $state<'monthly' | 'yearly'>('monthly');
    let isLoading = $state(false);
    let isGenerating = $state(false);
    let isCalculating = $state(false);
    let travelReports = $state<TravelReport[]>([]);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let userAddress = $state<string | null>(null);
    let companyData = $state<any>(null);

    let savedRecord = $state<VmaSettlementRecord | null>(null);
    let savedRecordId = $derived(savedRecord?.id || null);
    let savedRecordStatus = $derived(savedRecord?.status || 'entwurf');
    let savedRecordUpdated = $derived(savedRecord?.updated || null);
    let savedRecordPdfUrl = $derived(savedRecord ? vmaSettlementService.getPdfUrl(savedRecord) : null);

    let allSavedReports = $state<VmaSettlementRecord[]>([]);
    let showHistoryModal = $state(false);

    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || pb.authStore.model?.role === 'admin' || rbacService.isOwner);
    let usersList = $state<any[]>([]);
    let selectedUserId = $state<string>("");

    let mealDeductions = $state<Record<string, TravelMealState>>({});
    let totals = $derived.by(() => calculateTotals(travelReports));
    const microserviceUrl = (import.meta as any).env?.DEV ? 'http://localhost:3000' : '';

    function getEffectiveUser() {
        return (isSuperAdmin && selectedUserId && usersList.length > 0)
            ? (usersList.find(u => u.id === selectedUserId) || pb.authStore.model)
            : pb.authStore.model;
    }

    onMount(async () => {
        selectedUserId = pb.authStore.model?.id || "";
        mealDeductions = loadStoredMeals(selectedUserId);
        companyData = await loadCompanyData(getEffectiveUser());
        if (isSuperAdmin) {
            try { usersList = await pb.collection('users').getFullList({ sort: 'name_first', requestKey: null }); } catch {}
        }
        await loadSavedReports();
    });

    async function loadSavedReports() {
        isLoading = true;
        try {
            const effectiveUser = getEffectiveUser();
            if (!effectiveUser) return;
            userAddress = `${effectiveUser.street || ''} ${effectiveUser.housenr || ''}, ${effectiveUser.zip || ''} ${effectiveUser.city || ''}`.trim();
            if (!userAddress || userAddress.length < 5) userAddress = null;

            allSavedReports = await vmaSettlementService.loadSettlements(effectiveUser.id);
            const monthVal = viewMode === 'monthly' ? selectedMonth : 0;
            const matching = await vmaSettlementService.checkExistingSettlement(effectiveUser.id, selectedYear, monthVal);

            if (matching && Array.isArray(matching.details) && matching.details.length > 0) {
                savedRecord = matching;
                travelReports = matching.details.map((item: any) => ({
                    ...item,
                    date: new Date(item.date),
                    departure: item.departure ? new Date(item.departure) : null,
                    arrival: item.arrival ? new Date(item.arrival) : null
                }));
            } else {
                savedRecord = null;
                travelReports = [];
            }
        } catch (e) {
            console.error("[VMA] Fehler beim Laden:", e);
        } finally {
            isLoading = false;
        }
    }

    async function toggleMeal(reportKey: string, meal: 'breakfast' | 'lunch' | 'dinner') {
        const current = mealDeductions[reportKey] || { breakfast: false, lunch: false, dinner: false };
        mealDeductions[reportKey] = { ...current, [meal]: !current[meal] };
        saveStoredMeals(selectedUserId || pb.authStore.model?.id || 'default', mealDeductions);
        travelReports = travelReports.map(r => r.key === reportKey ? recalculateReportWithMeals(r, mealDeductions[reportKey]) : r);

        if (savedRecord?.id) {
            try {
                await pb.collection('vma_settlements').update(savedRecord.id, {
                    total_vma: totals.vma,
                    total_amount: totals.total,
                    details: travelReports.map(r => ({
                        ...r,
                        date: r.date.toISOString(),
                        departure: r.departure ? r.departure.toISOString() : null,
                        arrival: r.arrival ? r.arrival.toISOString() : null
                    }))
                });
            } catch (err) { console.warn("[VMA] PocketBase Sync fehlgeschlagen:", err); }
        }
    }

    async function generateAndSaveVma() {
        isCalculating = true;
        try {
            const effectiveUser = getEffectiveUser();
            if (!effectiveUser) { toastStore.error("Bitte Benutzer auswählen oder anmelden."); return; }
            const startDate = viewMode === 'monthly' ? new Date(selectedYear, selectedMonth - 1, 1) : new Date(selectedYear, 0, 1);
            const endDate = viewMode === 'monthly' ? new Date(selectedYear, selectedMonth, 0, 23, 59, 59) : new Date(selectedYear, 11, 31, 23, 59, 59);

            const appointments = await pb.collection('appointments').getFullList({
                filter: `user = "${effectiveUser.id}" && appointment >= "${startDate.toISOString()}" && appointment <= "${endDate.toISOString()}"`,
                sort: 'appointment',
                expand: 'time_record,client,drive_record,expenditures',
                requestKey: null
            });

            const compAddr = companyData ? `${companyData.street || ''} ${companyData.housenr || ''}, ${companyData.zip || ''} ${companyData.city || ''}`.trim() : null;
            travelReports = await processAppointmentsToReports({
                appointments, effectiveUser, userAddress,
                companyAddress: (compAddr && compAddr.length > 5) ? compAddr : null,
                mealDeductions,
                estimateTravelFn: (orig, dest) => estimateTravel(orig, dest, pb.authStore.token, microserviceUrl)
            });

            if (travelReports.length === 0) {
                toastStore.info("Keine abrechenbaren Termine im Zeitraum gefunden.");
                return;
            }

            const periodTitle = viewMode === 'monthly' ? `${getMonthName(selectedMonth, selectedYear)} ${selectedYear}` : `Gesamtjahr ${selectedYear}`;
            const userName = `${effectiveUser?.name_first || ''} ${effectiveUser?.name_last || ''}`.trim() || 'Mitarbeiter';
            const fileName = `Reisekosten_${userName.replace(/\s+/g, '_')}_${periodTitle.replace(/\s+/g, '_')}.pdf`;
            const payload = buildPdfPayload(effectiveUser, periodTitle, userName, userAddress, companyData, travelReports, totals);
            const pdfBlob = await requestPdfBlob(payload, pb.authStore.token, microserviceUrl);

            savedRecord = await vmaSettlementService.saveSettlement({
                id: savedRecord?.id, userId: effectiveUser.id, period: periodTitle,
                year: selectedYear, month: viewMode === 'monthly' ? selectedMonth : 0, totals,
                details: travelReports.map(r => ({ ...r, date: r.date.toISOString(), departure: r.departure ? r.departure.toISOString() : null, arrival: r.arrival ? r.arrival.toISOString() : null })),
                status: savedRecord?.status || 'entwurf', pdfBlob, fileName
            });
            allSavedReports = vmaSettlementService.allSettlements;
            toastStore.success(`Abrechnung für ${periodTitle} GoBD-konform gesichert.`);
        } catch (e: any) {
            console.error("[VMA] Fehler:", e);
            toastStore.error(e?.message || "Fehler bei der Berechnung.");
        } finally { isCalculating = false; }
    }

    async function downloadPdf() {
        if (travelReports.length === 0) return;
        if (savedRecordPdfUrl) {
            pdfPreviewModal?.open(savedRecordPdfUrl, "Reisekostenabrechnung (Archiv)", `Reisekosten_${(savedRecord?.period || 'Abrechnung').replace(/\s+/g, '_')}.pdf`);
            return;
        }
        isGenerating = true;
        try {
            const effectiveUser = getEffectiveUser();
            const userName = `${effectiveUser?.name_first || ''} ${effectiveUser?.name_last || ''}`.trim() || 'Mitarbeiter';
            const period = viewMode === 'monthly' ? `${getMonthName(selectedMonth, selectedYear)} ${selectedYear}` : `Gesamtjahr ${selectedYear}`;
            const payload = buildPdfPayload(effectiveUser, period, userName, userAddress, companyData, travelReports, totals);
            const blob = await requestPdfBlob(payload, pb.authStore.token, microserviceUrl);
            if (!blob) throw new Error("PDF-Generierung fehlgeschlagen");
            pdfPreviewModal?.open(window.URL.createObjectURL(blob), "Reisekostenabrechnung", `Reisekosten_${userName.replace(/\s/g, '_')}.pdf`);
        } catch { toastStore.error("PDF konnte nicht erstellt werden."); } finally { isGenerating = false; }
    }

    function changePeriod(delta: number) {
        if (viewMode === 'monthly') {
            const nextM = selectedMonth + delta;
            if (nextM < 1) { selectedMonth = 12; selectedYear--; }
            else if (nextM > 12) { selectedMonth = 1; selectedYear++; }
            else selectedMonth = nextM;
        } else selectedYear += delta;
        loadSavedReports();
    }
</script>

<PdfPreviewModal bind:this={pdfPreviewModal} />
<VmaHistoryModal 
    bind:show={showHistoryModal} {allSavedReports} savedRecordId={savedRecordId}
    onSelectReport={(r) => { 
        if (r.month > 0) { viewMode = 'monthly'; selectedMonth = r.month; selectedYear = r.year; } 
        else { viewMode = 'yearly'; selectedYear = r.year; }
        savedRecord = r;
        travelReports = (r.details || []).map((i: any) => ({ ...i, date: new Date(i.date), departure: i.departure ? new Date(i.departure) : null, arrival: i.arrival ? new Date(i.arrival) : null }));
        showHistoryModal = false;
    }}
    onUpdateStatus={async (r, st) => { savedRecord = await vmaSettlementService.updateStatus(r.id, st); allSavedReports = vmaSettlementService.allSettlements; }} 
    onPreviewPdf={(r) => { const url = vmaSettlementService.getPdfUrl(r); if (url) pdfPreviewModal?.open(url, `Reisekosten (${r.period})`, `Reisekosten_${r.period}.pdf`); }} 
    onDeleteReport={async (id) => { if (confirm("Archivierte Abrechnung wirklich löschen?")) { await vmaSettlementService.deleteSettlement(id, getEffectiveUser()?.id); allSavedReports = vmaSettlementService.allSettlements; if (savedRecord?.id === id) { savedRecord = null; travelReports = []; } } }}
/>

<div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5">
    <VmaHeader 
        bind:selectedMonth bind:selectedYear bind:viewMode bind:selectedUserId
        {usersList} {isSuperAdmin} {savedRecordId} {savedRecordStatus} {savedRecordPdfUrl}
        reportsCount={travelReports.length} archiveCount={allSavedReports.length}
        {isLoading} {isCalculating} {isGenerating}
        onPrevPeriod={() => changePeriod(-1)} onNextPeriod={() => changePeriod(1)}
        onPeriodChange={loadSavedReports} onUserChange={loadSavedReports}
        onShowHistory={() => showHistoryModal = true}
        onPrint={() => window.print()} onDownloadPdf={downloadPdf} onGenerate={generateAndSaveVma}
    />

    {#if savedRecord && savedRecordUpdated}
        <VmaStatusBanner 
            {savedRecord} {selectedMonth} {selectedYear} {viewMode} {isCalculating}
            onUpdateStatus={async (r, st) => { savedRecord = await vmaSettlementService.updateStatus(r.id, st); allSavedReports = vmaSettlementService.allSettlements; }}
            onOpenPdf={downloadPdf} onRecalculate={generateAndSaveVma}
        />
    {/if}

    <VmaPillarsInfo />
    <VmaSummaryCards {totals} reportsCount={travelReports.length} />

    <VmaReportTable 
        {travelReports} {totals} {isLoading} {isCalculating} {userAddress}
        {selectedMonth} {selectedYear} {viewMode}
        allSavedReportsCount={allSavedReports.length}
        onGenerate={generateAndSaveVma}
        onShowHistory={() => showHistoryModal = true}
        onToggleMeal={toggleMeal}
    />
</div>