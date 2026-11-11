import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import type { AppointmentRecord, ClientRecord } from '$lib/types/orgaTypes';

export type PortalTabType = 'appointments' | 'clients' | 'timesheet' | 'contacts' | 'profile';
export type DateFilterType = 'today' | 'tomorrow' | 'week' | 'all';

export interface CompleteAppointmentOptions {
    status?: string;
    report?: string;
    notes?: string;
    checklist?: any[];
    signatureDataUrl?: string;
    signerName?: string;
    photos?: Array<{ name: string; dataUrl: string }>;
    durationMinutes?: number;
    kilometers?: number;
}

class CaregiverPortalService {
    activeTab = $state<PortalTabType>('appointments');
    filterMode = $state<DateFilterType>('today');
    selectedDateStr = $state<string>(new Date().toISOString().slice(0, 10));
    selectedClientId = $state<string | null>(null);
    selectedAppointment = $state<AppointmentRecord | null>(null);
    isSaving = $state(false);

    readonly reportTemplates = [
        'Klient wohlauf. Allgemeine Betreuung und Unterstützung im Haushalt durchgeführt.',
        'Mahlzeit zubereitet, Klient hat gut gegessen und ausreichend getrunken.',
        'Medikation nach ärztlichem Plan verabreicht und dokumentiert.',
        'Mobilisation und Spaziergang im Nahbereich erfolgreich durchgeführt.',
        'Begleitung zum Arzt- / Behördentermin, Übergabe erfolgte ohne Auffälligkeiten.',
        'Gesprächsführung, kognitives Gedächtnistraining und Aktivierung durchgeführt.'
    ];

    get currentUserId(): string | undefined {
        return pb.authStore.model?.id;
    }

    get assignedClientIds(): Set<string> {
        const clients = pb.authStore.model?.assigned_clients;
        return new Set(Array.isArray(clients) ? clients : []);
    }

    isBlockAppointment(appt: AppointmentRecord): boolean {
        const title = (appt.title || '').toLowerCase();
        const desc = (appt.description || '').toLowerCase();
        return title.includes('[block]') || desc.includes('[block]') || title.includes('geschlossen') || title.includes('wochenende');
    }

    async toggleStatus(appt: AppointmentRecord): Promise<void> {
        const nextStatus = appt.status === 'Erledigt' ? 'Offen' : 'Erledigt';
        try {
            await pb.collection('appointments').update(appt.id, {
                status: nextStatus,
                settled: nextStatus === 'Erledigt'
            });
            await orgaStore.appointments.init();
            toastStore.success(`Status auf "${nextStatus}" gesetzt.`);
        } catch (err: any) {
            console.error('Fehler beim Statuswechsel:', err);
            toastStore.error('Status konnte nicht geändert werden.');
        }
    }

    async completeAppointment(appointmentId: string, options: CompleteAppointmentOptions): Promise<boolean> {
        this.isSaving = true;
        try {
            const appt = orgaStore.appointments.getById(appointmentId);
            const patchData: Record<string, any> = {};

            if (options.status) {
                patchData.status = options.status;
                patchData.settled = options.status === 'Erledigt';
            }
            if (options.report !== undefined) patchData.report = options.report.trim();
            if (options.notes !== undefined) patchData.notes = options.notes.trim();

            const normalizedChecklist = {
                items: Array.isArray(options.checklist) ? options.checklist : [],
                signature: options.signatureDataUrl || null,
                signed_by: options.signerName?.trim() || null,
                signed_at: options.signatureDataUrl ? new Date().toISOString() : null,
                photos: Array.isArray(options.photos) ? options.photos : [],
                recorded_minutes: options.durationMinutes || null,
                recorded_km: options.kilometers || null
            };
            patchData.checklist = normalizedChecklist;

            // Optional: Zeiterfassung als Datensatz anlegen
            if (options.durationMinutes && options.durationMinutes > 0 && appt?.appointment) {
                try {
                    const startDt = new Date(appt.appointment);
                    const endDt = new Date(startDt.getTime() + options.durationMinutes * 60 * 1000);
                    const timeRecord = await pb.collection('time_records').create({
                        start: startDt.toISOString(),
                        end: endDt.toISOString()
                    });
                    const existingTimeIds = Array.isArray(appt.time_record) ? [...appt.time_record] : [];
                    patchData.time_record = [...existingTimeIds, timeRecord.id];
                } catch (tErr) {
                    console.warn('Zeiterfassungseintrag konnte nicht erstellt werden:', tErr);
                }
            }

            // Optional: Fahrtenbuch-Eintrag anlegen
            if (options.kilometers && options.kilometers > 0) {
                try {
                    const driveRecord = await pb.collection('drive_records').create({
                        type: 'Anfahrt',
                        km: options.kilometers
                    });
                    const existingDriveIds = Array.isArray(appt?.drive_record) ? [...appt.drive_record] : [];
                    patchData.drive_record = [...existingDriveIds, driveRecord.id];
                } catch (dErr) {
                    console.warn('Fahrtendatensatz konnte nicht erstellt werden:', dErr);
                }
            }

            await pb.collection('appointments').update(appointmentId, patchData);
            await Promise.allSettled([
                orgaStore.appointments.init(),
                orgaStore.time_records.init(),
                orgaStore.drive_records.init()
            ]);

            toastStore.success('Einsatz erfolgreich dokumentiert!');
            return true;
        } catch (err: any) {
            console.error('Fehler bei der Dokumentation:', err);
            toastStore.error(err?.message || 'Dokumentation konnte nicht gespeichert werden.');
            return false;
        } finally {
            this.isSaving = false;
        }
    }

    getClientFullName(client?: ClientRecord | null): string {
        if (!client) return 'Unbekannter Klient';
        return `${client.name_last || ''}, ${client.name_first || ''}`.trim() || 'Klient';
    }

    getClientAddress(client?: ClientRecord | null): string {
        if (!client) return '';
        const street = `${client.street || ''} ${client.housenr || ''}`.trim();
        const city = `${client.zip || ''} ${client.city || ''}`.trim();
        return [street, city].filter(Boolean).join(', ');
    }
}

export const caregiverPortal = new CaregiverPortalService();
