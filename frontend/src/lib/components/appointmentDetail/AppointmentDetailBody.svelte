<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import * as appService from "./appointmentDetailService";
    import * as trackService from "./appointmentTrackingService";
    import AppointmentOverviewSection from "./AppointmentOverviewSection.svelte";
    import AppointmentTimeTasksSection from "./AppointmentTimeTasksSection.svelte";
    import AppointmentReportSection from "./AppointmentReportSection.svelte";
    import AppointmentTravelSection from "./AppointmentTravelSection.svelte";
    import AppointmentBillingSection from "./AppointmentBillingSection.svelte";
    import AppointmentClientCard from "./AppointmentClientCard.svelte";
    import AppointmentClientPicker from "./AppointmentClientPicker.svelte";
    import { UserPlus } from "lucide-svelte";

    let { s, modals }: { s: any; modals: any } = $props();
    let isAssigningClient = $state(false);
</script>

<div class="max-w-4xl mx-auto w-full">
    <!-- 1. Übersicht (Standard-Dashboard) -->
    {#if s.currentTab === 'overview' || s.currentTab === 'all'}
        <AppointmentOverviewSection
            appointment={s.appointment} client={s.client} fullClient={s.fullClient} assignedUser={s.assignedUser}
            onOpenClientModal={(cid) => modals?.openClient(cid)}
            onOpenReminder={() => modals?.openReminder(s.appointment, s.fullClient || s.client)}
            onOpenCancel={() => modals?.openCancel()}
            onSaveNotes={(n) => appService.saveAppointmentNotes(s.appointment.id, n)}
            onSaveDescription={(d) => appService.saveAppointmentDescription(s.appointment.id, d, Boolean(s.appointment.description?.includes('[BLOCK]')))}
            onSaveDateTime={async (d, st, et) => {
                const ok = await appService.saveAppointmentDateTime(s.appointment.id, d, st, et);
                if (ok) await s.openAppointment(s.appointment.id);
                return ok;
            }}
            onSaveUser={async (uid) => {
                const ok = await appService.saveAppointmentUser(s.appointment.id, uid);
                if (ok) await s.openAppointment(s.appointment.id);
                return ok;
            }}
            onSaveClient={async (cid) => {
                const ok = await appService.saveAppointmentClient(s.appointment.id, cid);
                if (ok) await s.openAppointment(s.appointment.id);
                return ok;
            }}
            onSaveAddress={async (addr, cid) => {
                const ok = await appService.saveAppointmentAddress(s.appointment.id, addr, cid);
                if (ok) {
                    await s.openAppointment(s.appointment.id);
                    await s.route.updateRoute(true);
                }
                return ok;
            }}
            onSavePickupAddress={async (pAddr) => {
                const ok = await appService.saveAppointmentPickupAddress(s.appointment.id, pAddr);
                if (ok) {
                    await s.openAppointment(s.appointment.id);
                    await s.route.updateRoute(true);
                }
                return ok;
            }}
            onSelectTab={(t) => s.currentTab = t}
        />
    {/if}

    <!-- 2. Zeiten & Aufgaben kombiniert -->
    {#if s.currentTab === 'time_tasks' || s.currentTab === 'time' || s.currentTab === 'tasks'}
        <AppointmentTimeTasksSection
            timeRecords={s.timeRecords} runningTimeRecord={s.runningTimeRecord} elapsedSeconds={s.elapsedSeconds}
            totalRecordedMinutes={s.totalRecordedMinutes} isTimeLoading={s.isTimeLoading}
            isAssignedCaregiver={s.isAssignedCaregiver}
            tasks={s.tasks} allTasks={orgaStore.tasks?.data || []}
            onStartTracking={async () => { s.isTimeLoading = true; await trackService.startTimeTracking(s.appointment.id, s.timeRecords.map((r: any) => r.id)); await s.loadTimeRecords(); s.isTimeLoading = false; s.startTimer(); }}
            onStopTracking={async (rid) => { s.isTimeLoading = true; await trackService.stopTimeTracking(rid, s.appointment.id); await s.loadTimeRecords(); s.isTimeLoading = false; s.startTimer(); }}
            onDeleteTime={async (rid) => { s.isTimeLoading = true; await trackService.removeTimeRecord(rid, s.appointment.id); await s.loadTimeRecords(); s.isTimeLoading = false; }}
            onOpenTimeModal={(rec) => modals?.openTime(rec)}
            onToggleTask={async (tid) => {
                await trackService.toggleAppointmentTask(tid, s.appointment.id, s.tasks.map((t: any) => t.id));
                await s.loadTasks();
            }}
            onCreateTask={async (title) => {
                const nt = await pb.collection('tasks').create({ title });
                if (orgaStore.tasks?.data) orgaStore.tasks.data = [nt as any, ...orgaStore.tasks.data];
                await trackService.toggleAppointmentTask(nt.id, s.appointment.id, s.tasks.map((t: any) => t.id));
                await s.loadTasks();
            }}
        />
    {/if}

    <!-- 3. Besuchsbericht & Sprachmemos -->
    {#if s.currentTab === 'report'}
        <AppointmentReportSection
            appointment={s.appointment} client={s.fullClient || s.client} bind:report={s.report} isReportSaving={s.isReportSaving}
            onSaveReport={async (rep) => { s.isReportSaving = true; const ok = await appService.saveVisitReport(s.appointment.id, rep); s.isReportSaving = false; return ok; }}
            onOpenAi={() => modals?.openAi('family', s.appointment, s.fullClient)}
            onDeleteVoiceRecord={(vr) => trackService.deleteVoiceRecord(s.appointment.id, s.appointment.voice_records, vr)}
            onUploadAudio={(e) => trackService.uploadVoiceRecords(s.appointment.id, s.appointment.voice_records, (e.target as HTMLInputElement).files)}
            onSendReport={() => modals?.openReminder(s.appointment, s.fullClient || s.client, 'report')}
            onRefreshAppointment={async () => { await s.openAppointment(s.appointment.id); }}
        />
    {/if}

    <!-- 4. Fahrt & Route -->
    {#if s.currentTab === 'travel' || s.currentTab === 'map'}
        <AppointmentTravelSection
            appointmentId={s.appointment?.id} clientId={s.client?.id}
            driveRecords={s.driveRecords} totalKm={s.totalKm} routeEmbedUrl={s.route.routeEmbedUrl} googleMapsNavUrl={s.route.googleMapsNavUrl}
            activeDestinationTitle={s.route.activeDestinationTitle} activeDestinationAddress={s.route.activeDestinationAddress}
            targetLocationAddress={s.targetLocationAddress} clientAddress={s.clientAddress} routeTargetMode={s.route.routeTargetMode}
            isMobile={s.route.isMobile} isLocatingUser={s.route.isLocatingUser} userLocation={s.route.userLocation} locationError={s.route.locationError}
            routeDistance={s.route.routeDistance} routeDuration={s.route.routeDuration} isCalculatingRoute={s.route.isCalculatingRoute}
            onFetchDeviceLocation={s.route.fetchGps} onSetRouteTargetMode={(m) => s.route.routeTargetMode = m}
            onOpenDriveModal={(d) => modals?.openDrive(d)} onDeleteDrive={(id) => trackService.removeDriveRecord(id, s.appointment.id)}
            onSaveAddress={async (addr) => {
                const ok = await appService.saveAppointmentAddress(s.appointment.id, addr);
                if (ok) {
                    await s.openAppointment(s.appointment.id);
                    await s.route.updateRoute(true);
                }
                return ok;
            }}
        />
    {/if}

    <!-- 5. Abrechnung (nur für Finanzen/Admins) -->
    {#if (s.currentTab === 'billing' || s.currentTab === 'expenditures') && rbacService.canAccessFinances}
        <AppointmentBillingSection
            appointment={s.appointment}
            expenditures={s.expenditures}
            totalExpenditure={s.totalExpenditure}
            totalRecordedMinutes={s.totalRecordedMinutes}
            totalKm={s.totalKm}
            driveRecords={s.driveRecords}
            onToggleSettled={() => s.appointment && appService.toggleAppointmentSettled(s.appointment.id, Boolean(s.appointment.settled))}
            onSaveBillingType={(type) => s.appointment ? appService.saveBillingType(s.appointment.id, type) : Promise.resolve(false)}
            onOpenExpenditureModal={(exp) => modals?.openExpenditure(exp)}
            onOpenPdfPreview={(url, title, fn) => modals?.openPdf(url, title, fn)}
            onDeleteExpenditure={(id) => trackService.removeExpenditure(id, s.appointment.id)}
        />
    {/if}

    <!-- 6. Ausführliches Klienten-Dossier -->
    {#if s.currentTab === 'client'}
        {#if s.fullClient || s.client}
            <AppointmentClientCard
                client={s.fullClient || s.client}
                onOpenClientModal={(cid) => modals?.openClient(cid)}
                onOpenReminder={() => modals?.openReminder(s.appointment, s.fullClient || s.client)}
                onSaveClient={async (cid) => {
                    const ok = await appService.saveAppointmentClient(s.appointment.id, cid);
                    if (ok) await s.openAppointment(s.appointment.id);
                    return ok;
                }}
            />
        {:else}
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Kein Klient zugeordnet</p>
                <p class="text-xs text-slate-500">Diesem Termin ist aktuell kein Klient zugewiesen.</p>
                {#if !isAssigningClient}
                    <button type="button" onclick={() => isAssigningClient = true} class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                        <UserPlus class="w-4 h-4" /> Klient zuweisen
                    </button>
                {:else}
                    <div class="max-w-md mx-auto text-left">
                        <AppointmentClientPicker
                            onSelect={async (cid) => {
                                const ok = await appService.saveAppointmentClient(s.appointment.id, cid);
                                if (ok) {
                                    isAssigningClient = false;
                                    await s.openAppointment(s.appointment.id);
                                }
                            }}
                            onClose={() => isAssigningClient = false}
                        />
                    </div>
                {/if}
            </div>
        {/if}
    {/if}
</div>
