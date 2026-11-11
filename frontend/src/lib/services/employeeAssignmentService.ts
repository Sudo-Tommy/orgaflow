import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import type { UserRecord } from '$lib/types/orgaTypes';

export class EmployeeAssignmentService {
    /**
     * Weist einem Mitarbeiter Klienten zu und synchronisiert optional anstehende Termine
     */
    async assignClients(employeeId: string, clientIds: string[], syncAppointments: boolean = true): Promise<boolean> {
        try {
            const targetUser = (orgaStore.users.data || []).find(u => u.id === employeeId) ||
                await pb.collection('users').getOne(employeeId).catch(() => null);
            const previousClientIds: string[] = Array.isArray(targetUser?.assigned_clients) ? [...targetUser.assigned_clients] : [];

            await pb.collection('users').update(employeeId, {
                assigned_clients: clientIds
            });

            // Entfernte Klienten zurücksetzen
            const removedIds = previousClientIds.filter(id => !clientIds.includes(id));
            for (const remId of removedIds) {
                try {
                    const cl = orgaStore.clients.getById(remId);
                    if (!cl || cl.assigned_employee === employeeId || (Array.isArray(cl.assigned_employee) && cl.assigned_employee.includes(employeeId))) {
                        await pb.collection('clients').update(remId, { assigned_employee: '' });
                    }
                } catch {}
            }

            // Neu / aktuell zugewiesene Klienten setzen
            for (const cId of clientIds) {
                try {
                    await pb.collection('clients').update(cId, { assigned_employee: employeeId });
                } catch (cErr) {
                    console.warn(`Konnte assigned_employee für Klient ${cId} nicht setzen:`, cErr);
                }
            }

            if (syncAppointments && clientIds.length > 0) {
                try {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const allAppts = orgaStore.appointments.data || [];
                    const relevantAppts = allAppts.filter(a => {
                        const apptDate = (a.appointment || '').slice(0, 10);
                        const isUpcomingOrOpen = apptDate >= todayStr || a.status !== 'Erledigt';
                        const belongsToClient = Array.isArray(a.client)
                            ? a.client.some(cid => clientIds.includes(cid))
                            : clientIds.includes(a.client as any);
                        return isUpcomingOrOpen && belongsToClient;
                    });

                    for (const a of relevantAppts) {
                        if (a.assigned_to !== employeeId) {
                            try {
                                await pb.collection('appointments').update(a.id, {
                                    assigned_to: employeeId,
                                    user: employeeId
                                });
                            } catch (aErr) {
                                console.warn(`Konnte Termin ${a.id} nicht synchronisieren:`, aErr);
                            }
                        }
                    }
                } catch (syncErr) {
                    console.warn('Fehler bei Termin-Synchronisation:', syncErr);
                }
            }

            const currentAuth = pb.authStore.record || pb.authStore.model;
            if (currentAuth?.id === employeeId) {
                pb.authStore.save(pb.authStore.token, { ...currentAuth, assigned_clients: clientIds } as any);
            }

            await Promise.allSettled([
                orgaStore.users.refresh(),
                orgaStore.clients.refresh(),
                orgaStore.appointments.refresh()
            ]);

            toastStore.success(`${clientIds.length} Klient(en) erfolgreich zugewiesen.`);
            return true;
        } catch (err: any) {
            console.error('Fehler bei Klientenzuweisung:', err);
            toastStore.error(err?.message || 'Klientenzuweisung fehlgeschlagen.');
            return false;
        }
    }

    /**
     * Weist einen Mitarbeiter direkt aus der Klientenansicht zu (oder hebt die Zuweisung auf)
     */
    async assignEmployeeToClient(clientId: string, employeeId: string | null, syncAppointments: boolean = true): Promise<boolean> {
        try {
            const allUsers = orgaStore.users.data || [];

            for (const u of allUsers) {
                const currentAssigned = Array.isArray(u.assigned_clients) ? [...u.assigned_clients] : [];
                if (u.id !== employeeId && currentAssigned.includes(clientId)) {
                    const updated = currentAssigned.filter(id => id !== clientId);
                    try {
                        await pb.collection('users').update(u.id, { assigned_clients: updated });
                    } catch (uErr) {
                        console.warn(`Konnte Klient ${clientId} nicht von Mitarbeiter ${u.id} entfernen:`, uErr);
                    }
                }
            }

            if (employeeId) {
                const targetEmp = allUsers.find(u => u.id === employeeId) || await pb.collection('users').getOne(employeeId).catch(() => null);
                if (targetEmp) {
                    const currentAssigned = Array.isArray(targetEmp.assigned_clients) ? [...targetEmp.assigned_clients] : [];
                    if (!currentAssigned.includes(clientId)) {
                        currentAssigned.push(clientId);
                        await pb.collection('users').update(employeeId, { assigned_clients: currentAssigned });
                    }
                    const currentAuth = pb.authStore.record || pb.authStore.model;
                    if (currentAuth?.id === employeeId) {
                        pb.authStore.save(pb.authStore.token, { ...currentAuth, assigned_clients: currentAssigned } as any);
                    }
                }

                try {
                    await pb.collection('clients').update(clientId, { assigned_employee: employeeId });
                } catch (cErr) {
                    console.warn(`Konnte assigned_employee für Klient ${clientId} nicht setzen:`, cErr);
                }

                if (syncAppointments) {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const appts = orgaStore.appointments.data || [];
                    const relevantAppts = appts.filter(a => {
                        const apptDate = (a.appointment || '').slice(0, 10);
                        const isUpcomingOrOpen = apptDate >= todayStr || a.status !== 'Erledigt';
                        const belongsToClient = Array.isArray(a.client)
                            ? a.client.includes(clientId)
                            : a.client === clientId;
                        return isUpcomingOrOpen && belongsToClient;
                    });

                    for (const a of relevantAppts) {
                        if (a.assigned_to !== employeeId) {
                            try {
                                await pb.collection('appointments').update(a.id, {
                                    assigned_to: employeeId,
                                    user: employeeId
                                });
                            } catch (apptErr) {
                                console.warn(`Konnte Termin ${a.id} nicht umhängen:`, apptErr);
                            }
                        }
                    }
                }
            } else {
                try {
                    await pb.collection('clients').update(clientId, { assigned_employee: '' });
                } catch (clientErr) {
                    console.warn(`Konnte assigned_employee nicht leeren:`, clientErr);
                }
            }

            await Promise.allSettled([
                orgaStore.users.refresh(),
                orgaStore.clients.refresh(),
                orgaStore.appointments.refresh()
            ]);

            const targetName = employeeId ? (allUsers.find(u => u.id === employeeId)?.name_first || 'Mitarbeiter') : null;
            toastStore.success(targetName ? `Klient erfolgreich ${targetName} zugewiesen.` : 'Mitarbeiter-Zuweisung aufgehoben.');
            return true;
        } catch (err: any) {
            console.error('Fehler bei Mitarbeiter-Zuweisung:', err);
            toastStore.error(err?.message || 'Zuweisung fehlgeschlagen.');
            return false;
        }
    }

    /**
     * Ermittelt den aktuell zugewiesenen Mitarbeiter für einen Klienten
     */
    getAssignedEmployeeForClient(clientId: string): UserRecord | null {
        const allUsers = orgaStore.users.data || [];
        const client = orgaStore.clients.getById(clientId);

        if (client?.assigned_employee) {
            const empId = Array.isArray(client.assigned_employee) ? client.assigned_employee[0] : client.assigned_employee;
            if (typeof empId === 'object' && empId?.id) return empId;
            const byEmp = allUsers.find(u => u.id === empId);
            if (byEmp) return byEmp;
        }
        if (client?.expand?.assigned_employee) {
            const exp = Array.isArray(client.expand.assigned_employee) ? client.expand.assigned_employee[0] : client.expand.assigned_employee;
            if (exp) return exp;
        }

        const found = allUsers.find(u => Array.isArray(u.assigned_clients) && u.assigned_clients.includes(clientId));
        if (found) return found;

        if (client?.caregiver) {
            const byCg = allUsers.find(u => u.id === client.caregiver);
            if (byCg) return byCg;
        }
        return null;
    }

    /**
     * Weist einem Mitarbeiter Kontakte zu
     */
    async assignContacts(employeeId: string, contactIds: string[]): Promise<boolean> {
        try {
            await pb.collection('users').update(employeeId, {
                assigned_contacts: contactIds
            });

            for (const cId of contactIds) {
                try {
                    const contact = orgaStore.contacts.data.find(c => c.id === cId) || await pb.collection('contacts').getOne(cId).catch(() => null);
                    if (!contact) continue;
                    const currentAssignees = Array.isArray(contact.assigned_employees) ? [...contact.assigned_employees] : [];
                    if (!currentAssignees.includes(employeeId)) {
                        currentAssignees.push(employeeId);
                        await pb.collection('contacts').update(cId, { assigned_employees: currentAssignees });
                    }
                } catch (cErr) {
                    console.warn(`Fehler beim Zuweisen von Kontakt ${cId}:`, cErr);
                }
            }

            await Promise.allSettled([
                orgaStore.users.refresh(),
                orgaStore.contacts.refresh()
            ]);

            toastStore.success(`${contactIds.length} Kontakt(e) erfolgreich zugewiesen.`);
            return true;
        } catch (err: any) {
            console.error('Fehler bei Kontaktzuweisung:', err);
            toastStore.error(err?.message || 'Kontaktzuweisung fehlgeschlagen.');
            return false;
        }
    }

    /**
     * Weist einen bestehenden Termin einem Mitarbeiter zu
     */
    async assignAppointment(appointmentId: string, employeeId: string): Promise<boolean> {
        try {
            await pb.collection('appointments').update(appointmentId, {
                assigned_to: employeeId,
                user: employeeId
            });
            await orgaStore.appointments.refresh();
            toastStore.success('Termin erfolgreich zugewiesen.');
            return true;
        } catch (err: any) {
            console.error('Fehler bei Terminzuweisung:', err);
            toastStore.error(err?.message || 'Terminzuweisung fehlgeschlagen.');
            return false;
        }
    }
}

export const employeeAssignmentService = new EmployeeAssignmentService();
