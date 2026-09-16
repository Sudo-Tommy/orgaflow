<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { slide } from "svelte/transition";
    import {
        UserCircle,
        Calendar,
        FileText,
        Phone,
        Mail,
        MapPin,
        ExternalLink,
        Edit3,
        Trash2,
        Plus,
        Check,
        Clock,
        Car,
        Shield,
        HeartHandshake,
        X,
        File as FileIcon,
        Download,
        UploadCloud,
        Share2,
        Search,
        Building2,
        UserCheck,
        Sparkles,
        AlertTriangle,
        Link2Off,
        CheckCircle2,
        DollarSign,
        Users,
        Printer,
        RefreshCw
    } from "lucide-svelte";

    // Sub-Modals
    import ClientEditModal from "$lib/components/clients/ClientEditModal.svelte";
    import AiReportModal from "$lib/components/AiReportModal.svelte";
    import ClientPortalAccessModal from "$lib/components/portal/ClientPortalAccessModal.svelte";
    import QuickAccessMailModal from "$lib/components/portal/QuickAccessMailModal.svelte";
    import ClientBudgetModal from "$lib/components/clients/ClientBudgetModal.svelte";
    import ClientLinkInsuranceModal from "$lib/components/clients/ClientLinkInsuranceModal.svelte";
    import ClientLinkContactModal from "$lib/components/clients/ClientLinkContactModal.svelte";
    import ClientLinkHomeModal from "$lib/components/clients/ClientLinkHomeModal.svelte";
    import ClientEditContactRelationModal from "$lib/components/clients/ClientEditContactRelationModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";
    import RetirementHomeModal from "$lib/components/RetirementHomeModal.svelte";
    import MultiAppointmentReminderModal from "$lib/components/MultiAppointmentReminderModal.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceDetailModal from "$lib/components/invoices/InvoiceDetailModal.svelte";
    import InheritorWidget from "$lib/components/clients/InheritorWidget.svelte";
    import ClientDocumentsTab from "$lib/components/clients/ClientDocumentsTab.svelte";
    import { getClientCompletionStatus } from "$lib/services/clientCompletionService";
    import { employeeService } from "$lib/services/employeeService.svelte";

    // Dialog reference
    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;

    let clientId = $state<string | null>(null);
    let activeTab = $state<'overview' | 'budget' | 'appointments' | 'documents' | 'network'>('overview');

    // Sub-modal references
    // svelte-ignore non_reactive_update
    let editModal: ReturnType<typeof ClientEditModal>;
    // svelte-ignore non_reactive_update
    let aiModal: ReturnType<typeof AiReportModal>;
    // svelte-ignore non_reactive_update
    let portalAccessModal: ReturnType<typeof ClientPortalAccessModal>;
    // svelte-ignore non_reactive_update
    let quickMailModal: ReturnType<typeof QuickAccessMailModal>;
    // svelte-ignore non_reactive_update
    let budgetModal: ReturnType<typeof ClientBudgetModal>;
    // svelte-ignore non_reactive_update
    let linkInsuranceModal: ReturnType<typeof ClientLinkInsuranceModal>;
    // svelte-ignore non_reactive_update
    let linkContactModal: ReturnType<typeof ClientLinkContactModal>;
    // svelte-ignore non_reactive_update
    let linkHomeModal: ReturnType<typeof ClientLinkHomeModal>;
    // svelte-ignore non_reactive_update
    let relationEditModal: ReturnType<typeof ClientEditContactRelationModal>;
    // svelte-ignore non_reactive_update
    let appointmentModal: ReturnType<typeof AppointmentModal>;
    // svelte-ignore non_reactive_update
    let appointmentDetailModal: ReturnType<typeof AppointmentDetailModal>;
    // svelte-ignore non_reactive_update
    let contactModal: ReturnType<typeof ContactModal>;
    // svelte-ignore non_reactive_update
    let homeModal: ReturnType<typeof RetirementHomeModal>;
    // svelte-ignore non_reactive_update
    let multiReminderModal: ReturnType<typeof MultiAppointmentReminderModal>;
    // svelte-ignore non_reactive_update
    let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
    // svelte-ignore non_reactive_update
    let emailModal: ReturnType<typeof InvoiceEmailModal>;
    // svelte-ignore non_reactive_update
    let docGenModal: ReturnType<typeof DocumentGeneratorModal>;
    // svelte-ignore non_reactive_update
    let invoiceDetailModal: ReturnType<typeof InvoiceDetailModal>;

    // Derived Client
    let client = $derived(clientId ? orgaStore.clients?.getById(clientId) : null);
    let clientCompletion = $derived(client ? getClientCompletionStatus(client) : null);

    // Permission
    let canDelete = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');
    let isDeleting = $state(false);

    // Notes State
    let notes = $state("");
    let isNotesSaving = $state(false);
    let currentClientIdForNotes = $state<string | null>(null);

    // Mailing List State
    let mailingList = $state<string[]>([]);
    let newEmailInput = $state("");
    let isMailingListSaving = $state(false);
    let currentClientIdForMailingList = $state<string | null>(null);
    let showContactDropdown = $state(false);



    // Filters for Appointments Tab
    let appointmentFilter = $state<'all' | 'upcoming' | 'open' | 'settled'>('all');
    let appointmentSearch = $state("");

    // Filters for Invoices Tab
    let invoiceFilter = $state<'all' | 'Abgeschlossen' | 'Eingereicht' | 'Entwurf'>('all');

    // Year
    let currentYear = new Date().getFullYear();

    // -------------------------------------------------------------
    // DATA DERIVATIONS
    // -------------------------------------------------------------
    let appointments = $derived.by(() => {
        if (!clientId) return [];
        return (orgaStore.appointments?.data || [])
            .filter((a: any) => Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId)
            .sort((a: any, b: any) => new Date(b.appointment || 0).getTime() - new Date(a.appointment || 0).getTime());
    });

    let upcomingAppointments = $derived.by(() => {
        const now = Date.now();
        return appointments
            .filter((a: any) => a.appointment && new Date(a.appointment).getTime() >= now)
            .sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    });

    let nextAppointment = $derived(upcomingAppointments.length > 0 ? upcomingAppointments[0] : null);

    let filteredAppointments = $derived.by(() => {
        let list = appointments;
        const now = Date.now();

        if (appointmentFilter === 'upcoming') {
            list = list.filter((a: any) => a.appointment && new Date(a.appointment).getTime() >= now);
        } else if (appointmentFilter === 'open') {
            list = list.filter((a: any) => !a.settled);
        } else if (appointmentFilter === 'settled') {
            list = list.filter((a: any) => a.settled);
        }

        if (appointmentSearch.trim()) {
            const q = appointmentSearch.toLowerCase().trim();
            list = list.filter((a: any) =>
                (a.description || '').toLowerCase().includes(q) ||
                (a.notes || '').toLowerCase().includes(q)
            );
        }

        return list;
    });

    let contacts = $derived.by(() => {
        if (!client) return [];
        const ids = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);
        return (orgaStore.contacts?.data || []).filter((c: any) => ids.includes(c.id));
    });

    let retirementHomes = $derived.by(() => {
        if (!client) return [];
        const ids = Array.isArray(client.retirement_homes) ? client.retirement_homes : (client.retirement_homes ? [client.retirement_homes] : []);
        return (orgaStore.retirement_homes?.data || []).filter((h: any) => ids.includes(h.id));
    });

    let systemDocuments = $derived.by(() => {
        if (!clientId) return [];
        return (orgaStore.document_templates?.data || []).filter((d: any) => d.client === clientId);
    });

    let uploadedDocuments = $derived(Array.isArray(client?.documents) ? client.documents : []);
    let totalDocumentsCount = $derived(uploadedDocuments.length + systemDocuments.length);

    let clientInvoices = $derived.by(() => {
        if (!client || !orgaStore.invoices?.data) return [];
        return orgaStore.invoices.data.filter((inv: any) => {
            return (Array.isArray(inv.client) ? inv.client.includes(client.id) : inv.client === client.id) && inv.issue_date !== undefined;
        }).sort((a: any, b: any) => {
            const dateA = a.issue_date ? new Date(a.issue_date).getTime() : 0;
            const dateB = b.issue_date ? new Date(b.issue_date).getTime() : 0;
            return dateB - dateA;
        });
    });

    let filteredInvoices = $derived.by(() => {
        if (invoiceFilter === 'all') return clientInvoices;
        return clientInvoices.filter((inv: any) => (inv.status || 'Entwurf') === invoiceFilter);
    });

    let openInvoices = $derived(clientInvoices.filter((i: any) => i.status !== 'Abgeschlossen' && i.status !== 'Storniert'));
    let openInvoicesTotal = $derived(openInvoices.reduce((sum: number, i: any) => sum + (i.brutto || 0), 0));

    // -------------------------------------------------------------
    // BUDGET & LEISTUNGEN BERECHNUNG
    // -------------------------------------------------------------
    let careLevel = $derived(parseInt(client?.level_of_care || '0', 10) || 0);

    // Gemeinsamer Jahresbetrag (VHP): 3.539 € ab PG 2
    let annualMaxVHP = $derived(careLevel >= 2 && careLevel <= 5 ? 3539 : 0);

    // Entlastungsbetrag § 45b SGB XI: 131 € * 12 = 1.572 € ab PG 1
    let annualMaxEntlastung = $derived(careLevel >= 1 && careLevel <= 5 ? 1572 : 0);

    function calculateAppointmentCost(appointment: any, clientData: any): number {
        let appCost = 0;
        if (appointment.expand?.time_record) {
            for (const tr of appointment.expand.time_record) {
                if (tr.start && tr.end) {
                    const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                    if (diffMs > 0) appCost += (diffMs / 3600000) * (clientData.hourly_rate ?? 40);
                }
            }
        }
        if (appointment.expand?.drive_record) {
            for (const dr of appointment.expand.drive_record) {
                appCost += (dr.km ?? 0) * (clientData.km_rate ?? 0.3);
                appCost += (dr.lump_sum ?? 0);
            }
        }
        if (appointment.expand?.expenditures) {
            for (const exp of appointment.expand.expenditures) {
                appCost += (exp.sum ?? 0);
            }
        }
        return appCost;
    }

    const usedBudgets = $derived.by(() => {
        let vhp = 0;
        let elb = 0;
        if (!client || !orgaStore.invoices?.data || !orgaStore.appointments?.data) return { usedGemeinsamerJahresbetrag: 0, usedEntlastungsleistungen: 0 };

        // 1. Abgeschlossene Rechnungen im aktuellen Jahr
        const currentYearInvoices = orgaStore.invoices.data.filter((inv: any) =>
            (Array.isArray(inv.client) ? inv.client.includes(client.id) : inv.client === client.id) &&
            inv.status === 'Abgeschlossen' &&
            (inv.issue_date ? new Date(inv.issue_date).getFullYear() === currentYear : false)
        );

        for (const inv of currentYearInvoices) {
            let invoiceAssigned = false;
            const invoiceTaxRate = parseFloat(inv.tax_rate || '0');

            for (const pos of (inv.table_positions || [])) {
                if (invoiceAssigned) break;
                const title = pos.title?.toLowerCase() || '';

                if (title.includes('verhinderungspflege') || title.includes('kurzzeitpflege')) {
                    vhp += inv.brutto || 0;
                    invoiceAssigned = true;
                } else if (title.includes('entlastungsleistung') || title.includes('betreuungsleistung')) {
                    elb += inv.brutto || 0;
                    invoiceAssigned = true;
                }
            }

            if (!invoiceAssigned && invoiceTaxRate === 0) {
                vhp += inv.brutto || 0;
            }
        }

        // 2. Nicht abgerechnete Termine im aktuellen Jahr
        const currentYearAppointments = orgaStore.appointments.data.filter((app: any) =>
            (Array.isArray(app.client) ? app.client.includes(client.id) : app.client === client.id) &&
            !app.settled &&
            app.appointment &&
            new Date(app.appointment).getFullYear() === currentYear
        );

        for (const app of currentYearAppointments) {
            const cost = calculateAppointmentCost(app, client);
            const tasks: string[] = app.expand?.tasks?.map((t: any) => t.title.toLowerCase()) || [];

            let appointmentAssigned = false;
            if (tasks.some(t => t.includes('verhinderungspflege') || t.includes('kurzzeitpflege'))) {
                vhp += cost;
                appointmentAssigned = true;
            } else if (!appointmentAssigned && tasks.some(t => t.includes('entlastungsleistung') || t.includes('betreuungsleistung'))) {
                elb += cost;
            }
        }

        return { usedGemeinsamerJahresbetrag: vhp, usedEntlastungsleistungen: elb };
    });

    let usedGemeinsamerJahresbetrag = $derived(usedBudgets.usedGemeinsamerJahresbetrag);
    let usedEntlastungsleistungen = $derived(usedBudgets.usedEntlastungsleistungen);

    let remainingVHP = $derived(Math.max(0, annualMaxVHP - usedGemeinsamerJahresbetrag));
    let remainingEntlastung = $derived(Math.max(0, annualMaxEntlastung - usedEntlastungsleistungen));

    let previousYearRemainingBudget = $derived.by(() => {
        const today = new Date();
        const isAfterJune30 = today.getMonth() > 5 || (today.getMonth() === 5 && today.getDate() > 30);
        return isAfterJune30 ? 0 : (client?.restbudget_vorjahr ?? 0);
    });

    let totalAvailableBudget = $derived(remainingVHP + remainingEntlastung + previousYearRemainingBudget);

    let vhpPercent = $derived(annualMaxVHP > 0 ? Math.min(100, Math.round((usedGemeinsamerJahresbetrag / annualMaxVHP) * 100)) : 0);
    let entlastungPercent = $derived(annualMaxEntlastung > 0 ? Math.min(100, Math.round((usedEntlastungsleistungen / annualMaxEntlastung) * 100)) : 0);

    let hasBudgetWarning = $derived(usedGemeinsamerJahresbetrag > 0 && annualMaxVHP === 0);

    // Alter & Datumshelfer
    let clientAge = $derived.by(() => {
        if (!client?.birthdate) return null;
        try {
            const birthDate = new Date(client.birthdate);
            if (isNaN(birthDate.getTime())) return null;
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
            return calculatedAge;
        } catch { return null; }
    });

    function safeFormatDate(val?: string) {
        if (!val) return '—';
        const clean = val.trim().replace(' ', 'T');
        const d = new Date(clean);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}.${match[2]}.${match[1]}`;
        return val.split(' ')[0];
    }

    function formatCurrency(amount: number) {
        return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    // -------------------------------------------------------------
    // ADDRESS BOOK FOR CC MAILING
    // -------------------------------------------------------------
    let availableContacts = $derived.by(() => {
        let list: any[] = [];
        const add = (name: string, email: string) => {
            if (email) list.push({ name, email });
        };
        orgaStore.clients?.data?.forEach((c: any) => {
            if (c.id !== client?.id) add(`${c.name_first} ${c.name_last} (Klient)`, c.email);
        });
        orgaStore.contacts?.data?.forEach((c: any) => {
            add(`${c.name_first} ${c.name_last} (${c.company_name || 'Kontakt'})`, c.email);
        });
        orgaStore.retirement_homes?.data?.forEach((h: any) => {
            add(`${h.name} (Pflegeheim)`, h.email);
        });
        orgaStore.insurancies?.data?.forEach((i: any) => {
            add(`${i.name} (Krankenkasse)`, i.email);
        });
        const unique: any[] = [];
        const seen = new Set();
        for (const item of list) {
            if (!seen.has(item.email)) { seen.add(item.email); unique.push(item); }
        }
        return unique.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Hauptansprechpartner (Primary Contact)
    function getContactRelationData(contactId: string) {
        const rels = client?.contact_relations;
        if (!rels || !rels[contactId]) return null;
        const data = rels[contactId];
        if (typeof data === 'string') return { relation: data, is_primary: false, has_power_of_attorney: false };
        return data;
    }

    let primaryContactInfo = $derived.by(() => {
        for (const c of contacts) {
            const rel = getContactRelationData(c.id);
            if (rel?.is_primary) return { contact: c, relation: rel };
        }
        return contacts.length > 0 ? { contact: contacts[0], relation: getContactRelationData(contacts[0].id) } : null;
    });

    // -------------------------------------------------------------
    // EFFECTS & LIFECYCLE
    // -------------------------------------------------------------
    $effect(() => {
        if (client && client.id !== currentClientIdForNotes) {
            notes = client.notes || "";
            currentClientIdForNotes = client.id;
        }

        if (client && client.id !== currentClientIdForMailingList) {
            mailingList = Array.isArray(client.mailing_list) ? [...client.mailing_list] : [];
            currentClientIdForMailingList = client.id;
        }
    });

    // -------------------------------------------------------------
    // EXPORTED METHODS
    // -------------------------------------------------------------
    export function open(id: string, initialTab: 'overview' | 'budget' | 'appointments' | 'documents' | 'network' = 'overview') {
        clientId = id;
        activeTab = initialTab;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        clientId = null;
    }

    // -------------------------------------------------------------
    // ACTIONS
    // -------------------------------------------------------------
    async function saveNotes() {
        if (!client) return;
        isNotesSaving = true;
        try {
            await pb.collection('clients').update(client.id, { notes }, { requestKey: null });

            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, {
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor',
                    requestKey: null
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            toastStore.success("Notizen gespeichert.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern der Notizen.");
        } finally {
            isNotesSaving = false;
        }
    }

    function handleAiSave(newText: string, type: 'family' | 'internal') {
        const dateHeader = `\n\n--- ${type === 'internal' ? 'Interne Notiz' : 'Bericht'} vom ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ---\n`;
        notes = (notes ? notes.trim() : '') + dateHeader + newText.trim();
        saveNotes();
    }

    async function updateMailingList(newList: string[]) {
        if (!client) return;
        isMailingListSaving = true;
        try {
            await pb.collection('clients').update(client.id, { mailing_list: newList }, { requestKey: null });
            mailingList = newList;
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, {
                    expand: 'insurance,retirement_homes,contacts,caregiver,inheritor',
                    requestKey: null
                }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            toastStore.success("Mailing-Liste aktualisiert.");
        } catch (err) {
            toastStore.error("Fehler beim Aktualisieren der Mailing-Liste.");
        } finally {
            isMailingListSaving = false;
        }
    }

    function removeEmail(email: string) {
        updateMailingList(mailingList.filter(e => e !== email));
    }

    function addEmail(email: string) {
        const clean = email.trim();
        if (!clean || mailingList.includes(clean)) return;
        updateMailingList([...mailingList, clean]);
        newEmailInput = "";
        showContactDropdown = false;
    }



    // Unlinking Relations
    async function unlinkInsurance() {
        if (!client) return;
        const insName = client.expand?.insurance?.name || "Krankenkasse";
        if (!(await confirmStore.ask(`Möchten Sie die Verknüpfung zu "${insName}" wirklich aufheben?`, "Krankenkasse trennen?", "Verknüpfung aufheben", "Abbrechen", true))) return;
        try {
            await pb.collection('clients').update(client.id, { insurance: null }, { requestKey: null });
            setTimeout(async () => {
                const updated = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updated;
            }, 300);
            toastStore.success("Krankenkasse getrennt.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Trennen der Krankenkasse.");
        }
    }

    async function unlinkCaregiver() {
        if (!client) return;
        const cgName = `${client.expand?.caregiver?.name_first || ''} ${client.expand?.caregiver?.name_last || ''}`.trim() || "gesetzliche Betreuung";
        if (!(await confirmStore.ask(`Möchten Sie die Verknüpfung zur gesetzlichen Betreuung ("${cgName}") aufheben?`, "Betreuung trennen?", "Verknüpfung aufheben", "Abbrechen", true))) return;
        try {
            await pb.collection('clients').update(client.id, { caregiver: null }, { requestKey: null });
            setTimeout(async () => {
                const updated = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updated;
            }, 300);
            toastStore.success("Betreuung getrennt.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Trennen der Betreuung.");
        }
    }

    let assignedEmployee = $derived.by(() => {
        if (!client?.id) return null;
        return employeeService.getAssignedEmployeeForClient(client.id);
    });

    let availableEmployees = $derived.by(() => {
        const users = orgaStore.users.data || [];
        return users.filter(u => u.role !== 'client');
    });

    async function handleAssignEmployee(empId: string) {
        if (!client?.id) return;
        if (!empId) {
            await handleUnlinkEmployee();
            return;
        }
        await employeeService.assignEmployeeToClient(client.id, empId, true);
    }

    async function handleUnlinkEmployee() {
        if (!client?.id) return;
        const currentEmp = assignedEmployee;
        const name = currentEmp ? `${currentEmp.name_first} ${currentEmp.name_last}` : 'Mitarbeiter';
        if (!(await confirmStore.ask(`Möchten Sie die Zuweisung zu "${name}" wirklich aufheben?`, "Zuweisung aufheben?", "Zuweisung aufheben", "Abbrechen", true))) return;
        await employeeService.assignEmployeeToClient(client.id, null, false);
    }

    async function unlinkContact(contactId: string, contactName: string) {
        if (!client) return;
        if (!(await confirmStore.ask(`Möchten Sie die Verknüpfung zu "${contactName}" wirklich aufheben? Der Kontakt bleibt im Adressbuch erhalten.`, "Verknüpfung aufheben?", "Verknüpfung aufheben", "Abbrechen", true))) return;
        try {
            const existingIds = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);
            const updatedContacts = existingIds.filter((id: string) => id !== contactId);
            const currentRelations = { ...(client.contact_relations || {}) };
            delete currentRelations[contactId];

            await pb.collection('clients').update(client.id, {
                contacts: updatedContacts,
                contact_relations: currentRelations
            }, { requestKey: null });

            setTimeout(async () => {
                const updated = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updated;
            }, 300);

            toastStore.success(`Verknüpfung zu "${contactName}" aufgehoben.`);
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Aufheben der Verknüpfung.");
        }
    }

    async function unlinkRetirementHome(homeId: string, homeName: string) {
        if (!client) return;
        if (!(await confirmStore.ask(`Möchten Sie die Verknüpfung zum Pflegeheim "${homeName}" wirklich aufheben?`, "Verknüpfung aufheben?", "Verknüpfung aufheben", "Abbrechen", true))) return;
        try {
            const existingIds = Array.isArray(client.retirement_homes) ? client.retirement_homes : (client.retirement_homes ? [client.retirement_homes] : []);
            const updatedHomes = existingIds.filter((id: string) => id !== homeId);

            await pb.collection('clients').update(client.id, {
                retirement_homes: updatedHomes
            }, { requestKey: null });

            setTimeout(async () => {
                const updated = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updated;
            }, 300);

            toastStore.success(`Verknüpfung zum Pflegeheim aufgehoben.`);
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Trennen des Pflegeheims.");
        }
    }

    async function deleteClient() {
        if (!client) return;
        if (!(await confirmStore.ask(`Möchten Sie die Akte von ${client.name_first} ${client.name_last} wirklich unwiderruflich löschen?`, "Klienten löschen?", "Löschen", "Abbrechen", true))) return;

        isDeleting = true;
        try {
            await pb.collection('clients').delete(client.id);
            toastStore.success("Klient erfolgreich gelöscht.");
            if (orgaStore.clients) await orgaStore.clients.init();
            close();
        } catch (err: any) {
            console.error("Fehler beim Löschen:", err);
            toastStore.error("Fehler beim Löschen des Klienten.");
        } finally {
            isDeleting = false;
        }
    }

    function getCareLevelBadgeClass(level: number) {
        switch (level) {
            case 1: return 'bg-sky-50 text-sky-700 border-sky-200';
            case 2: return 'bg-blue-50 text-blue-700 border-blue-200';
            case 3: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 4: return 'bg-purple-50 text-purple-700 border-purple-200';
            case 5: return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-neutral-100 text-neutral-600 border-neutral-200';
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-7xl mx-auto my-auto rounded-3xl"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col relative shadow-2xl border border-slate-200/80 dark:border-slate-800">

        <!-- ============================================================ -->
        <!-- HEADER: CLIENT HERO & QUICK ACTIONS                          -->
        <!-- ============================================================ -->
        <div class="bg-white dark:bg-slate-900 px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-t-3xl">
            
            <!-- Left: Avatar, Name, Status, Badges -->
            <div class="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div class="relative shrink-0">
                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 text-xl sm:text-2xl">
                        {#if client}
                            {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                        {:else}
                            <UserCircle class="w-8 h-8" />
                        {/if}
                    </div>
                    {#if client}
                        <span
                            class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-500' : ((client.status || '').toLowerCase() === 'verstorben' ? 'bg-neutral-800' : 'bg-neutral-400')}"
                            title={`Status: ${client.status || 'Aktiv'}`}
                        ></span>
                    {/if}
                </div>

                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <h2 class="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white leading-tight truncate">
                            {#if client}
                                {client.name_first} {client.name_last}
                            {:else if orgaStore.clients?.isLoading}
                                <span class="inline-block h-6 w-48 bg-neutral-200 dark:bg-slate-700 rounded-lg animate-pulse"></span>
                            {:else}
                                Klient nicht gefunden
                            {/if}
                        </h2>

                        {#if client}
                            <!-- Pflegegrad Badge -->
                            {#if careLevel > 0}
                                <span class="px-2.5 py-0.5 text-xs font-black rounded-full border shadow-2xs {getCareLevelBadgeClass(careLevel)}">
                                    PG {careLevel}
                                </span>
                            {/if}

                            <!-- Status Badge -->
                            <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full border {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : ((client.status || '').toLowerCase() === 'verstorben' ? 'bg-neutral-900 dark:bg-black text-neutral-100 border-neutral-800' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border-neutral-200 dark:border-slate-700')}">
                                {(client.status || '').toLowerCase() === 'aktiv' ? 'Aktiv' : ((client.status || '').toLowerCase() === 'verstorben' ? 'Verstorben 🕊️' : 'Inaktiv')}
                            </span>
                        {/if}
                    </div>

                    <div class="flex items-center gap-3 text-xs text-neutral-500 dark:text-slate-400 mt-1 font-medium flex-wrap">
                        <span class="flex items-center gap-1">
                            <span class="text-neutral-400 dark:text-slate-400">ID:</span>
                            <span class="font-mono text-neutral-600 dark:text-slate-300 font-bold">{clientId?.slice(0, 8) || '—'}</span>
                        </span>
                        {#if client?.birthdate}
                            <span class="text-neutral-300 dark:text-slate-600">•</span>
                            <span class="flex items-center gap-1 text-neutral-700 dark:text-slate-200 font-semibold">
                                🎂 {safeFormatDate(client.birthdate)}
                                {#if clientAge !== null}
                                    <span class="text-neutral-400 dark:text-slate-400 font-normal">({clientAge} Jahre)</span>
                                {/if}
                            </span>
                        {/if}
                        {#if client?.phone}
                            <span class="text-neutral-300 dark:text-slate-600">•</span>
                            <a href={`tel:${client.phone}`} class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 hover:underline">
                                <Phone class="w-3 h-3" /> {client.phone}
                            </a>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Right: Quick Action Bar -->
            <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-end shrink-0">
                {#if client}
                    <!-- Call -->
                    {#if client.phone}
                        <a
                            href={`tel:${client.phone}`}
                            class="orga-button-ghost py-1.5 px-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                            title={`Anrufen: ${client.phone}`}
                        >
                            <Phone class="w-3.5 h-3.5" />
                            <span class="hidden sm:inline">Anrufen</span>
                        </a>
                    {/if}

                    <!-- Quick Mail -->
                    <button
                        type="button"
                        onclick={() => quickMailModal?.open(client)}
                        class="orga-button-ghost py-1.5 px-2.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 hover:text-orange-800 border border-orange-200 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                        title="E-Mail Vorlage öffnen"
                    >
                        <Mail class="w-3.5 h-3.5" />
                        <span class="hidden md:inline">Quick-Mail</span>
                    </button>

                    <!-- Neuer Termin -->
                    <button
                        type="button"
                        onclick={() => appointmentModal?.open({ preselectedClient: client.id })}
                        class="orga-button-ghost py-1.5 px-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Neuen Termin anlegen"
                    >
                        <Calendar class="w-3.5 h-3.5" />
                        <span>Termin</span>
                    </button>

                    <!-- Neue Rechnung -->
                    <button
                        type="button"
                        onclick={() => {
                            const empId = Array.isArray(client.assigned_employee) ? client.assigned_employee[0] : client.assigned_employee;
                            docGenModal?.open('', 1, client.id, 'rechnung', empId);
                        }}
                        class="orga-button-ghost py-1.5 px-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Neue Rechnung erstellen"
                    >
                        <FileText class="w-3.5 h-3.5" />
                        <span>Rechnung</span>
                    </button>

                    <!-- Portal Access -->
                    <button
                        type="button"
                        onclick={() => portalAccessModal?.open(client)}
                        class="orga-button-ghost py-1.5 px-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 border border-purple-200 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Portal-Zugangsdaten verwalten & Druckkarte generieren"
                    >
                        <UserCheck class="w-3.5 h-3.5" />
                        <span class="hidden lg:inline">Portal</span>
                    </button>

                    <!-- Edit Client -->
                    <button
                        type="button"
                        onclick={() => editModal?.open()}
                        class="orga-button-ghost py-1.5 px-2.5 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Stammdaten bearbeiten"
                    >
                        <Edit3 class="w-3.5 h-3.5" />
                        <span class="hidden sm:inline">Bearbeiten</span>
                    </button>

                    <!-- Delete Client (Admin/Superuser only) -->
                    {#if canDelete}
                        <button
                            type="button"
                            onclick={deleteClient}
                            disabled={isDeleting}
                            class="orga-button-ghost py-1.5 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl flex items-center gap-1 transition-all"
                            title="Klienten löschen"
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                        </button>
                    {/if}
                {/if}

                <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                <!-- Close Button -->
                <button
                    type="button"
                    aria-label="Schließen"
                    onclick={close}
                    class="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>
        </div>

        <!-- ============================================================ -->
        <!-- TAB STRIP NAVIGATION                                         -->
        <!-- ============================================================ -->
        <div class="bg-white dark:bg-slate-900 px-5 sm:px-8 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar">
            <button
                type="button"
                onclick={() => activeTab = 'overview'}
                class="py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer {activeTab === 'overview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}"
            >
                <span>🗂️</span> Übersicht
            </button>

            <button
                type="button"
                onclick={() => activeTab = 'budget'}
                class="py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer {activeTab === 'budget' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}"
            >
                <span>💰</span> Budget & Finanzen
                {#if hasBudgetWarning}
                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                {/if}
            </button>

            <button
                type="button"
                onclick={() => activeTab = 'appointments'}
                class="py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer {activeTab === 'appointments' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}"
            >
                <span>📅</span> Termine ({appointments.length})
            </button>

            <button
                type="button"
                onclick={() => activeTab = 'documents'}
                class="py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer {activeTab === 'documents' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}"
            >
                <span>📂</span> Dokumente ({totalDocumentsCount})
            </button>

            <button
                type="button"
                onclick={() => activeTab = 'network'}
                class="py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer {activeTab === 'network' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}"
            >
                <span>👥</span> Netzwerk & Betreuung ({contacts.length + retirementHomes.length})
            </button>
        </div>

        <!-- ============================================================ -->
        <!-- TAB CONTENT AREA                                             -->
        <!-- ============================================================ -->
        <div class="p-4 sm:p-6 md:p-8 flex-1 bg-slate-50/70 dark:bg-slate-950/70 text-slate-800 dark:text-slate-100">
            {#if !client && orgaStore.clients?.isLoading}
                <div class="flex flex-col items-center justify-center py-24 animate-pulse">
                    <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p class="text-neutral-500 font-semibold">Lade Klienten-Akte...</p>
                </div>
            {:else if !client}
                <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-200 shadow-sm max-w-lg mx-auto my-8">
                    <p class="text-lg font-bold text-neutral-900 mb-2">Die angeforderte Akte existiert nicht</p>
                    <p class="text-sm mb-6">Der Klient wurde möglicherweise gelöscht oder Sie verfügen nicht über die nötigen Leserechte.</p>
                    <button onclick={close} class="orga-button-primary px-6 py-2.5">Schließen</button>
                </div>
            {:else}

                <!-- ==================================================== -->
                <!-- REITER 1: ÜBERSICHT                                  -->
                <!-- ==================================================== -->
                {#if activeTab === 'overview'}
                    <div class="space-y-6 animate-enter">

                        <!-- UNVOLLSTÄNDIGE STAMMDATEN BANNER -->
                        {#if clientCompletion && !clientCompletion.isComplete}
                            <div class="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-enter">
                                <div class="flex items-start gap-3.5">
                                    <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold text-xl shadow-inner">
                                        ⚠️
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <p class="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100">Klientendaten noch unvollständig</p>
                                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">Schnellerfassung ({clientCompletion.score}%)</span>
                                        </div>
                                        <p class="text-xs text-amber-900/85 dark:text-amber-300/85 mt-1 leading-relaxed">
                                            Folgende Angaben fehlen noch: <strong class="text-amber-950 dark:text-amber-100">{clientCompletion.missingSections.join(" · ")}</strong> ({clientCompletion.missingDetails.join(", ")}).
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onclick={() => editModal?.open(client)}
                                    class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shrink-0 shadow-sm flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                                >
                                    <Edit3 class="w-4 h-4" />
                                    <span>Jetzt vervollständigen</span>
                                </button>
                            </div>
                        {/if}

                        <!-- TOP KPI GLANCE BAR -->
                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <!-- Next Appointment -->
                            <button
                                type="button"
                                onclick={() => activeTab = 'appointments'}
                                class="orga-card-white p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div class="flex items-center justify-between text-neutral-500 mb-1.5">
                                    <span class="text-[11px] font-bold uppercase tracking-wider">Nächster Termin</span>
                                    <Calendar class="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                                </div>
                                {#if nextAppointment}
                                    <p class="text-sm font-black text-neutral-900 truncate">{nextAppointment.description || 'Termin'}</p>
                                    <p class="text-xs text-indigo-600 font-bold mt-0.5">
                                        {new Date(nextAppointment.appointment || '').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}, {new Date(nextAppointment.appointment || '').toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                    </p>
                                {:else}
                                    <p class="text-sm font-bold text-neutral-400 italic">Kein Termin geplant</p>
                                    <span class="text-[11px] text-indigo-600 font-semibold group-hover:underline mt-0.5 inline-block">+ Jetzt planen</span>
                                {/if}
                            </button>

                            <!-- Budget Snapshot -->
                            <button
                                type="button"
                                onclick={() => activeTab = 'budget'}
                                class="orga-card-white p-4 text-left hover:border-emerald-300 hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div class="flex items-center justify-between text-neutral-500 mb-1.5">
                                    <span class="text-[11px] font-bold uppercase tracking-wider">Restbudget ({currentYear})</span>
                                    <DollarSign class="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                </div>
                                <p class="text-lg font-black text-emerald-600 truncate">{formatCurrency(totalAvailableBudget)}</p>
                                <p class="text-[10px] text-neutral-400 truncate">§ 45b & § 39 SGB XI verfügbar</p>
                            </button>

                            <!-- Open Invoices -->
                            <button
                                type="button"
                                onclick={() => activeTab = 'budget'}
                                class="orga-card-white p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div class="flex items-center justify-between text-neutral-500 mb-1.5">
                                    <span class="text-[11px] font-bold uppercase tracking-wider">Offene Rechnungen</span>
                                    <FileText class="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                </div>
                                <p class="text-lg font-black text-blue-700 truncate">{openInvoices.length} offen</p>
                                <p class="text-[10px] text-neutral-400 truncate">{formatCurrency(openInvoicesTotal)} ausstehend</p>
                            </button>

                            <!-- Documents -->
                            <button
                                type="button"
                                onclick={() => activeTab = 'documents'}
                                class="orga-card-white p-4 text-left hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div class="flex items-center justify-between text-neutral-500 mb-1.5">
                                    <span class="text-[11px] font-bold uppercase tracking-wider">Dokumente & Akten</span>
                                    <FileIcon class="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                                </div>
                                <p class="text-lg font-black text-neutral-900 truncate">{totalDocumentsCount} hinterlegt</p>
                                <p class="text-[10px] text-neutral-400 truncate">{uploadedDocuments.length} Dateien • {systemDocuments.length} Vorlagen</p>
                            </button>
                        </div>

                        <!-- 2-COLUMN MAIN OVERVIEW -->
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            <!-- LEFT: STAMMDATEN CARD (7 Cols) -->
                            <div class="lg:col-span-7 space-y-6">

                                <!-- Master Data Card -->
                                <div class="orga-card-white p-5 sm:p-7 space-y-6">
                                    <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
                                        <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                                            <span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">📋</span>
                                            Stammdaten & Anschrift
                                        </h3>
                                        <button
                                            type="button"
                                            onclick={() => editModal?.open()}
                                            class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            <Edit3 class="w-3.5 h-3.5" /> Bearbeiten
                                        </button>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <!-- Birthday & Age -->
                                        <div class="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">🎂</div>
                                            <div>
                                                <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Geburtsdatum</p>
                                                <p class="text-sm font-black text-neutral-900 mt-0.5">{safeFormatDate(client.birthdate)}</p>
                                                {#if clientAge !== null}
                                                    <span class="text-[10px] font-bold text-neutral-500 bg-white border border-neutral-200 px-1.5 py-0.5 rounded-md mt-1 inline-block">{clientAge} Jahre</span>
                                                {/if}
                                            </div>
                                        </div>

                                        <!-- Pflegegrad -->
                                        <div class="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">❤️</div>
                                            <div>
                                                <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Pflegegrad</p>
                                                <p class="text-sm font-black text-neutral-900 mt-0.5">
                                                    {careLevel > 0 ? `Pflegegrad ${careLevel}` : 'Nicht eingestuft'}
                                                </p>
                                                {#if careLevel >= 2}
                                                    <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md mt-1 inline-block">Anspruch VHP & ELB</span>
                                                {:else if careLevel === 1}
                                                    <span class="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md mt-1 inline-block">Nur Entlastungsbetrag</span>
                                                {/if}
                                            </div>
                                        </div>

                                        <!-- Phone -->
                                        <div class="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">📞</div>
                                            <div class="min-w-0">
                                                <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Telefon</p>
                                                {#if client.phone}
                                                    <a href={`tel:${client.phone}`} class="text-sm font-black text-blue-700 hover:underline mt-0.5 block truncate">
                                                        {client.phone}
                                                    </a>
                                                {:else}
                                                    <p class="text-sm text-neutral-400 italic mt-0.5">Nicht hinterlegt</p>
                                                {/if}
                                            </div>
                                        </div>

                                        <!-- Email -->
                                        <div class="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">✉️</div>
                                            <div class="min-w-0">
                                                <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">E-Mail</p>
                                                {#if client.email}
                                                    <a href={`mailto:${client.email}`} class="text-sm font-black text-emerald-700 hover:underline mt-0.5 block truncate" title={client.email}>
                                                        {client.email}
                                                    </a>
                                                {:else}
                                                    <p class="text-sm text-neutral-400 italic mt-0.5">Nicht hinterlegt</p>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Address with Google Maps Button -->
                                    <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div class="flex items-start gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">🏠</div>
                                            <div>
                                                <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Wohnadresse</p>
                                                <p class="text-sm font-bold text-neutral-900 mt-0.5">
                                                    {#if client.street || client.city}
                                                        {client.street || ''} {client.housenr || ''}, {client.zip || ''} {client.city || ''}
                                                    {:else}
                                                        <span class="text-neutral-400 italic font-normal">Keine Adresse hinterlegt</span>
                                                    {/if}
                                                </p>
                                            </div>
                                        </div>

                                        {#if client.street || client.city}
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.street || ''} ${client.housenr || ''}, ${client.zip || ''} ${client.city || ''}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl transition-all shadow-2xs shrink-0 self-start sm:self-center"
                                            >
                                                <MapPin class="w-3.5 h-3.5 text-blue-600" />
                                                Google Maps Route
                                            </a>
                                        {/if}
                                    </div>

                                    <!-- Insurance & Legal Guardian -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <!-- Insurance -->
                                        <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                            <div class="flex items-center justify-between mb-2">
                                                <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                                                    <Shield class="w-3 h-3 text-teal-600" /> Krankenkasse
                                                </span>
                                                <div class="flex items-center gap-2">
                                                    {#if client.insurance || client.expand?.insurance}
                                                        <button type="button" onclick={unlinkInsurance} class="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Trennen</button>
                                                        <span class="text-neutral-300">·</span>
                                                    {/if}
                                                    <button type="button" onclick={() => linkInsuranceModal?.open()} class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">Ändern</button>
                                                </div>
                                            </div>
                                            <p class="text-sm font-bold text-neutral-900 truncate">{client.expand?.insurance?.name || 'Keine verknüpft'}</p>
                                            {#if client.insurance_nr}
                                                <p class="text-xs text-neutral-600 mt-1">Vers-Nr: <span class="font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-200 font-bold">{client.insurance_nr}</span></p>
                                            {/if}
                                        </div>

                                        <!-- Caregiver -->
                                        <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                            <div class="flex items-center justify-between mb-2">
                                                <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                                                    ⚖️ Gesetzl. Betreuung
                                                </span>
                                                {#if client.expand?.caregiver}
                                                    <button type="button" onclick={unlinkCaregiver} class="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Trennen</button>
                                                {/if}
                                            </div>
                                            {#if client.expand?.caregiver}
                                                <p class="text-sm font-bold text-neutral-900 truncate">{client.expand.caregiver.name_first} {client.expand.caregiver.name_last}</p>
                                                {#if client.expand.caregiver.phone}
                                                    <p class="text-xs text-neutral-600 mt-1">Tel: {client.expand.caregiver.phone}</p>
                                                {/if}
                                            {:else}
                                                <p class="text-sm text-neutral-400 italic">Keine Betreuung hinterlegt</p>
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- Zuständige Pflegekraft / Mitarbeiter (Außendienst-Zuweisung) -->
                                    <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 mt-4">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                                                🩺 Zuständige Pflegekraft / Mitarbeiter
                                            </span>
                                            {#if assignedEmployee}
                                                <button 
                                                    type="button" 
                                                    onclick={handleUnlinkEmployee} 
                                                    class="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                                                >
                                                    Zuweisung aufheben
                                                </button>
                                            {/if}
                                        </div>
                                        
                                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div class="min-w-0">
                                                {#if assignedEmployee}
                                                    <p class="text-sm font-bold text-neutral-900 truncate">
                                                        {assignedEmployee.name_first} {assignedEmployee.name_last}
                                                    </p>
                                                    <p class="text-xs text-neutral-500 mt-0.5">
                                                        {assignedEmployee.role === 'employee' ? 'Pflegefachkraft / Außendienst' : assignedEmployee.role}
                                                        {#if assignedEmployee.handy || assignedEmployee.tel}
                                                            • Tel: {assignedEmployee.handy || assignedEmployee.tel}
                                                        {/if}
                                                    </p>
                                                {:else}
                                                    <p class="text-sm text-neutral-400 italic">Noch kein Mitarbeiter zugewiesen</p>
                                                    <p class="text-xs text-neutral-400 mt-0.5">Weisen Sie eine Pflegekraft zu, damit Termine im Mitarbeiterportal erscheinen.</p>
                                                {/if}
                                            </div>

                                            <div class="shrink-0 flex items-center gap-2">
                                                <select
                                                    aria-label="Mitarbeiter zuweisen"
                                                    value={assignedEmployee?.id || ''}
                                                    onchange={(e) => handleAssignEmployee(e.currentTarget.value)}
                                                    class="text-xs font-bold px-3 py-2 rounded-xl border border-indigo-200 bg-white text-indigo-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                                                >
                                                    <option value="">-- {assignedEmployee ? 'Mitarbeiter wechseln' : 'Mitarbeiter zuweisen'} --</option>
                                                    {#each availableEmployees as emp}
                                                        <option value={emp.id}>
                                                            {emp.name_last}, {emp.name_first} ({emp.role === 'employee' ? 'Pflege' : emp.role})
                                                        </option>
                                                    {/each}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Signature Preview (if exists) -->
                                    {#if client.sign}
                                        <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between gap-4">
                                            <div>
                                                <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Hinterlegte Klienten-Unterschrift</p>
                                                <p class="text-xs text-neutral-600 mt-0.5">Wird automatisch in Rechnungen & Leistungsnachweisen eingefügt</p>
                                            </div>
                                            <div class="bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs shrink-0">
                                                {#if client.sign.toLowerCase().endsWith('.pdf')}
                                                    <a href={pb.files.getURL(client, client.sign)} target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                                        📄 PDF öffnen
                                                    </a>
                                                {:else}
                                                    <img src={pb.files.getURL(client, client.sign)} alt="Unterschrift" class="max-h-12 object-contain" />
                                                {/if}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- RIGHT: PRIMARY CONTACT, NOTES & CC MAILING (5 Cols) -->
                            <div class="lg:col-span-5 space-y-6">

                                <!-- Primary Contact / Emergency Contact Highlight -->
                                <div class="orga-card-white p-5 sm:p-6 border-l-4 border-l-amber-500">
                                    <div class="flex items-center justify-between mb-3 border-b border-neutral-100 pb-3">
                                        <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                            ⭐ Wichtigste Bezugsperson
                                        </h4>
                                        <button
                                            type="button"
                                            onclick={() => activeTab = 'network'}
                                            class="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                                        >
                                            Alle Kontakte ({contacts.length}) &rarr;
                                        </button>
                                    </div>

                                    {#if primaryContactInfo}
                                        {@const c = primaryContactInfo.contact}
                                        {@const rel = primaryContactInfo.relation}
                                        <div class="space-y-3">
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {(c.name_first?.charAt(0) || c.company_name?.charAt(0) || 'K').toUpperCase()}
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <p class="text-sm font-bold text-neutral-900 truncate">
                                                        {`${c.name_first || ''} ${c.name_last || ''}`.trim() || c.company_name}
                                                    </p>
                                                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        {#if rel?.relation}
                                                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                                                {rel.relation}
                                                            </span>
                                                        {/if}
                                                        {#if rel?.has_power_of_attorney}
                                                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                📜 Vollmacht
                                                            </span>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="flex items-center gap-2 pt-1">
                                                {#if c.phone}
                                                    <a href={`tel:${c.phone}`} class="flex-1 text-center py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                                                        <Phone class="w-3 h-3" /> {c.phone}
                                                    </a>
                                                {/if}
                                                {#if c.email}
                                                    <a href={`mailto:${c.email}`} class="flex-1 text-center py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                                                        <Mail class="w-3 h-3" /> Mail
                                                    </a>
                                                {/if}
                                            </div>
                                        </div>
                                    {:else}
                                        <div class="text-center py-4 text-neutral-400">
                                            <p class="text-xs italic mb-2">Noch keine Bezugsperson verknüpft.</p>
                                            <button
                                                type="button"
                                                onclick={() => linkContactModal?.open()}
                                                class="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
                                            >
                                                + Bezugsperson verknüpfen
                                            </button>
                                        </div>
                                    {/if}
                                </div>

                                <!-- Klienten-Notizen Card with AI Voice Dictation -->
                                <div class="orga-card-white p-5 sm:p-6 space-y-3">
                                    <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
                                        <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                            📝 Klienten-Notizen & Aktenvermerk
                                        </h4>
                                        <button
                                            type="button"
                                            onclick={() => aiModal?.open('internal')}
                                            class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                        >
                                            <span>🎙️</span> KI-Diktat
                                        </button>
                                    </div>

                                    <textarea
                                        bind:value={notes}
                                        rows="4"
                                        class="orga-input-clear resize-y min-h-[100px] text-xs leading-relaxed"
                                        placeholder="Besondere Hinweise, Diagnosen, Absprachen oder Vorlieben des Klienten..."
                                        disabled={isNotesSaving}
                                    ></textarea>

                                    <div class="flex justify-end">
                                        <button
                                            type="button"
                                            onclick={saveNotes}
                                            disabled={isNotesSaving || notes === (client.notes || '')}
                                            class="orga-button-primary py-1.5 px-4 text-xs font-bold cursor-pointer"
                                        >
                                            {isNotesSaving ? 'Speichert...' : 'Notizen speichern'}
                                        </button>
                                    </div>
                                </div>

                                <!-- CC-Verteiler (Mailing-Liste) -->
                                <div class="orga-card-white p-5 sm:p-6 space-y-3">
                                    <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
                                        <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                            📧 CC-Mailing-Verteiler
                                        </h4>
                                        <span class="text-[10px] text-neutral-400 font-semibold">{mailingList.length} Empfänger</span>
                                    </div>

                                    {#if mailingList.length > 0}
                                        <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                            {#each mailingList as email}
                                                <div class="flex items-center gap-1.5 bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-lg text-xs font-medium border border-neutral-200 shadow-2xs">
                                                    <span class="truncate max-w-[180px]">{email}</span>
                                                    <button
                                                        type="button"
                                                        onclick={() => removeEmail(email)}
                                                        disabled={isMailingListSaving}
                                                        class="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            {/each}
                                        </div>
                                    {:else}
                                        <p class="text-xs text-neutral-400 italic">Keine zusätzlichen E-Mail-Empfänger für Berichte hinterlegt.</p>
                                    {/if}

                                    <div class="relative pt-1">
                                        <div class="flex gap-2">
                                            <input
                                                type="email"
                                                bind:value={newEmailInput}
                                                placeholder="E-Mail hinzufügen..."
                                                class="orga-input-clear flex-1 py-1.5 text-xs"
                                                disabled={isMailingListSaving}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(newEmailInput); } }}
                                            />
                                            <button
                                                type="button"
                                                onclick={() => showContactDropdown = !showContactDropdown}
                                                class="orga-button-ghost px-2.5 py-1.5 text-xs font-bold cursor-pointer"
                                                title="Aus Kontakten wählen"
                                            >
                                                📖
                                            </button>
                                            <button
                                                type="button"
                                                onclick={() => addEmail(newEmailInput)}
                                                disabled={isMailingListSaving || !newEmailInput.trim()}
                                                class="orga-button-primary px-3 py-1.5 text-xs font-bold cursor-pointer"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {#if showContactDropdown}
                                            <button
                                                type="button"
                                                class="fixed inset-0 z-40 w-full h-full cursor-default"
                                                onclick={() => showContactDropdown = false}
                                                tabindex="-1"
                                                aria-label="Auswahl schließen"
                                            ></button>
                                            <div class="absolute bottom-full left-0 right-0 mb-1 bg-white border border-neutral-200 shadow-xl rounded-xl z-50 max-h-56 overflow-y-auto custom-scrollbar p-1">
                                                {#each availableContacts as c}
                                                    <button
                                                        type="button"
                                                        onclick={() => addEmail(c.email)}
                                                        class="w-full flex items-center gap-2 p-2 hover:bg-neutral-50 rounded-lg text-left text-xs cursor-pointer"
                                                    >
                                                        <div class="min-w-0">
                                                            <p class="font-bold text-neutral-900 truncate">{c.name}</p>
                                                            <p class="text-[10px] text-neutral-500 truncate">{c.email}</p>
                                                        </div>
                                                    </button>
                                                {/each}
                                                {#if availableContacts.length === 0}
                                                    <p class="text-xs text-neutral-500 p-2 text-center">Keine Kontakte gefunden</p>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                {/if}

                <!-- ==================================================== -->
                <!-- REITER 2: BUDGET & FINANZEN                          -->
                <!-- ==================================================== -->
                {#if activeTab === 'budget'}
                    <div class="space-y-6 animate-enter">

                        <!-- BUDGET TOTAL HERO BANNER -->
                        <div class="orga-card-white p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-indigo-950 to-neutral-950 text-white rounded-3xl relative overflow-hidden shadow-xl">
                            <div class="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                            <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <span class="text-xs font-black uppercase tracking-wider text-indigo-300">Pflegekassen-Budget ({currentYear})</span>
                                    <h3 class="text-3xl sm:text-4xl font-black text-white mt-1">
                                        {formatCurrency(totalAvailableBudget)}
                                    </h3>
                                    <p class="text-xs text-indigo-200/80 mt-1 max-w-xl">
                                        Aktuell verfügbares Restguthaben aus gesetzlichen Leistungsansprüchen (§ 45b SGB XI Entlastungsbetrag, § 39 SGB XI Verhinderungspflege und verbleibendem Vorjahresbudget).
                                    </p>
                                </div>

                                <div class="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onclick={() => budgetModal?.open(client)}
                                        class="px-4 py-2.5 bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Edit3 class="w-3.5 h-3.5" />
                                        Budget manuell anpassen
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- BUDGET WARNING IF VHP WITH PG 1 OR 0 -->
                        {#if hasBudgetWarning}
                            <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs font-medium">
                                <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p class="font-bold">Achtung: Eingetragene Verhinderungspflege ohne Anspruch</p>
                                    <p class="mt-0.5">Für Pflegegrad {careLevel} besteht kein gesetzlicher Anspruch auf den Gemeinsamen Jahresbetrag (§ 39 SGB XI). Diese Kosten müssen privat oder über andere Träger getragen werden.</p>
                                </div>
                            </div>
                        {/if}

                        <!-- PROGRESS METERS -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <!-- § 45b Entlastungsbetrag -->
                            <div class="orga-card-white p-6 space-y-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">§ 45b SGB XI</span>
                                        <h4 class="text-base font-black text-neutral-900 mt-1">Entlastungsbetrag</h4>
                                    </div>
                                    <span class="text-sm font-black text-emerald-600">
                                        {formatCurrency(remainingEntlastung)} Rest
                                    </span>
                                </div>

                                <!-- Progress bar -->
                                <div>
                                    <div class="flex items-center justify-between text-xs text-neutral-500 mb-1.5 font-medium">
                                        <span>Genutzt: {formatCurrency(usedEntlastungsleistungen)} ({entlastungPercent}%)</span>
                                        <span>Max: {formatCurrency(annualMaxEntlastung)}</span>
                                    </div>
                                    <div class="w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
                                        <div
                                            class="h-full rounded-full transition-all duration-500 {entlastungPercent >= 90 ? 'bg-rose-500' : (entlastungPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500')}"
                                            style={`width: ${entlastungPercent}%`}
                                        ></div>
                                    </div>
                                </div>

                                <p class="text-[11px] text-neutral-400">
                                    Gesetzlicher Anspruch von monatlich 131,00 € (1.572,00 € pro Kalenderjahr). Berechnet aus abgeschlossenen Rechnungen und geplanten Terminen.
                                </p>
                            </div>

                            <!-- § 39 Verhinderungspflege / Gemeinsamer Jahresbetrag -->
                            <div class="orga-card-white p-6 space-y-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">§ 39 SGB XI</span>
                                        <h4 class="text-base font-black text-neutral-900 mt-1">Gemeinsamer Jahresbetrag (VHP)</h4>
                                    </div>
                                    <span class="text-sm font-black text-blue-700">
                                        {formatCurrency(remainingVHP)} Rest
                                    </span>
                                </div>

                                <!-- Progress bar -->
                                <div>
                                    <div class="flex items-center justify-between text-xs text-neutral-500 mb-1.5 font-medium">
                                        <span>Genutzt: {formatCurrency(usedGemeinsamerJahresbetrag)} ({vhpPercent}%)</span>
                                        <span>Max: {formatCurrency(annualMaxVHP)}</span>
                                    </div>
                                    <div class="w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
                                        <div
                                            class="h-full rounded-full transition-all duration-500 {vhpPercent >= 90 ? 'bg-rose-500' : (vhpPercent >= 75 ? 'bg-amber-500' : 'bg-blue-600')}"
                                            style={`width: ${vhpPercent}%`}
                                        ></div>
                                    </div>
                                </div>

                                <p class="text-[11px] text-neutral-400">
                                    Ab Pflegegrad 2: Gemeinsamer Jahresbetrag für Verhinderungs- und Kurzzeitpflege bis zu 3.539,00 € pro Kalenderjahr.
                                </p>
                            </div>

                        </div>

                        <!-- VORJAHRES-RESTBUDGET HINWEIS -->
                        {#if (client.restbudget_vorjahr ?? 0) > 0}
                            <div class="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">⏳</div>
                                    <div>
                                        <p class="text-xs font-bold text-purple-900">Übertragener Restbetrag aus dem Vorjahr: {formatCurrency(client.restbudget_vorjahr)}</p>
                                        <p class="text-[11px] text-purple-700 mt-0.5">Gemäß gesetzlicher Regelung verfällt dieses Restbudget zum 30. Juni des aktuellen Jahres.</p>
                                    </div>
                                </div>
                                <span class="px-2.5 py-1 bg-white text-purple-800 border border-purple-200 rounded-xl text-xs font-bold shrink-0">
                                    {previousYearRemainingBudget > 0 ? 'Noch aktiv' : 'Abgelaufen am 30.06.'}
                                </span>
                            </div>
                        {/if}

                        <!-- ABRECHNUNGSKONDITIONEN -->
                        <div class="orga-card-white p-6">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Hinterlegte Abrechnungskonditionen</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Stundensatz</p>
                                    <p class="text-xl font-black text-neutral-900 mt-0.5">{client.hourly_rate ?? 40} € / Std.</p>
                                </div>
                                <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Fahrtkosten</p>
                                    <p class="text-xl font-black text-neutral-900 mt-0.5">{client.km_rate ?? 0.3} € / km</p>
                                </div>
                                <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Umsatzsteuer</p>
                                    <p class="text-xl font-black text-neutral-900 mt-0.5">{client.tax_rate != null ? client.tax_rate : '0'} %</p>
                                </div>
                            </div>
                        </div>

                        <!-- RECHNUNGEN SECTION -->
                        <div class="orga-card-white p-6 space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                                <div>
                                    <h4 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                                        <FileText class="w-4 h-4 text-blue-600" />
                                        Rechnungen ({clientInvoices.length})
                                    </h4>
                                    <p class="text-xs text-neutral-500 mt-0.5">Alle für diesen Klienten gestellten und offenen Rechnungen</p>
                                </div>

                                <div class="flex items-center gap-2 flex-wrap">
                                    <!-- Filter pills -->
                                    <div class="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-bold">
                                        <button
                                            type="button"
                                            onclick={() => invoiceFilter = 'all'}
                                            class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {invoiceFilter === 'all' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}"
                                        >
                                            Alle ({clientInvoices.length})
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() => invoiceFilter = 'Abgeschlossen'}
                                            class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {invoiceFilter === 'Abgeschlossen' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}"
                                        >
                                            Bezahlt
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() => invoiceFilter = 'Eingereicht'}
                                            class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {invoiceFilter === 'Eingereicht' ? 'bg-white text-blue-700 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}"
                                        >
                                            Offen
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onclick={() => {
                                            const empId = Array.isArray(client.assigned_employee) ? client.assigned_employee[0] : client.assigned_employee;
                                            docGenModal?.open('', 1, client.id, 'rechnung', empId);
                                        }}
                                        class="orga-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus class="w-3.5 h-3.5" /> Neue Rechnung
                                    </button>
                                </div>
                            </div>

                            {#if filteredInvoices.length === 0}
                                <div class="text-center py-8 text-neutral-400 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                                    <p class="text-sm font-semibold">Keine Rechnungen in dieser Kategorie vorhanden.</p>
                                </div>
                            {:else}
                                <div class="grid grid-cols-1 gap-2.5">
                                    {#each filteredInvoices as invoice}
                                        <button
                                            type="button"
                                            onclick={() => invoiceDetailModal?.open(invoice.id)}
                                            class="w-full flex items-center justify-between bg-white border border-neutral-200 hover:border-blue-400 p-4 rounded-2xl shadow-2xs hover:shadow-md transition-all group text-left cursor-pointer"
                                        >
                                            <div class="min-w-0 pr-4">
                                                <div class="flex items-center gap-2">
                                                    <p class="text-sm font-black text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                                                        {invoice.invoice_nr || 'Rechnung (Entwurf)'}
                                                    </p>
                                                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full {invoice.status === 'Abgeschlossen' ? 'bg-emerald-100 text-emerald-700' : (invoice.status === 'Eingereicht' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600')}">
                                                        {invoice.status || 'Entwurf'}
                                                    </span>
                                                </div>
                                                <p class="text-xs text-neutral-500 mt-1">
                                                    Datum: {safeFormatDate(invoice.issue_date)}
                                                    {#if invoice.due_date}
                                                        • Fällig: {safeFormatDate(invoice.due_date)}
                                                    {/if}
                                                </p>
                                            </div>

                                            <div class="flex items-center gap-3 shrink-0">
                                                <span class="text-base font-black text-neutral-900">{formatCurrency(invoice.brutto || 0)}</span>
                                                <ExternalLink class="w-4 h-4 text-neutral-400 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                    </div>
                {/if}

                <!-- ==================================================== -->
                <!-- REITER 3: TERMINE & EINSÄTZE                         -->
                <!-- ==================================================== -->
                {#if activeTab === 'appointments'}
                    <div class="space-y-6 animate-enter">

                        <!-- TOP BAR ACTIONS & SEARCH -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <!-- Filters -->
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onclick={() => appointmentFilter = 'all'}
                                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'}"
                                >
                                    Alle ({appointments.length})
                                </button>
                                <button
                                    type="button"
                                    onclick={() => appointmentFilter = 'upcoming'}
                                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'upcoming' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'}"
                                >
                                    Anstehend ({upcomingAppointments.length})
                                </button>
                                <button
                                    type="button"
                                    onclick={() => appointmentFilter = 'open'}
                                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'open' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'}"
                                >
                                    Nicht abgerechnet
                                </button>
                                <button
                                    type="button"
                                    onclick={() => appointmentFilter = 'settled'}
                                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'settled' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'}"
                                >
                                    Abgerechnet ✓
                                </button>
                            </div>

                            <!-- Actions -->
                            <div class="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onclick={() => multiReminderModal?.open(appointments, client)}
                                    class="orga-button-ghost py-1.5 px-3 text-xs font-bold border border-neutral-200 cursor-pointer"
                                    title="Terminübersicht per E-Mail senden"
                                >
                                    <Share2 class="w-3.5 h-3.5" />
                                    <span>Übersicht senden</span>
                                </button>

                                <button
                                    type="button"
                                    onclick={() => appointmentModal?.open({ preselectedClient: client.id })}
                                    class="orga-button-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus class="w-3.5 h-3.5" />
                                    <span>Neuer Termin</span>
                                </button>
                            </div>
                        </div>

                        <!-- SEARCH INPUT -->
                        <div class="relative">
                            <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                bind:value={appointmentSearch}
                                placeholder="Termine nach Titel oder Notizen durchsuchen..."
                                class="orga-input-clear pl-10 pr-4 py-2.5 text-xs w-full bg-white border border-neutral-200 rounded-2xl"
                            />
                        </div>

                        <!-- APPOINTMENTS LIST -->
                        {#if filteredAppointments.length === 0}
                            <div class="text-center py-16 border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50/50">
                                <Calendar class="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                                <p class="text-neutral-600 font-bold text-sm">Keine Termine gefunden</p>
                                <p class="text-neutral-400 text-xs mt-1">Passen Sie Ihre Suchfilter an oder planen Sie einen neuen Termin.</p>
                                <button
                                    type="button"
                                    onclick={() => appointmentModal?.open({ preselectedClient: client.id })}
                                    class="orga-button-primary mt-4 px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus class="w-3.5 h-3.5" /> Ersten Termin anlegen
                                </button>
                            </div>
                        {:else}
                            <div class="space-y-3">
                                {#each filteredAppointments as app}
                                    <button
                                        type="button"
                                        onclick={() => appointmentDetailModal?.open(app.id)}
                                        class="w-full text-left bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                                    >
                                        <div class="flex items-start gap-3.5 min-w-0 flex-1">
                                            <!-- Indicator Dot -->
                                            <div class="w-3 h-3 mt-1.5 rounded-full {app.settled ? 'bg-emerald-500' : 'bg-amber-400'} group-hover:scale-125 transition-transform shadow-2xs shrink-0"></div>

                                            <div class="min-w-0 flex-1">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <p class="text-sm font-black text-neutral-900 group-hover:text-indigo-600 transition-colors truncate">
                                                        {app.description || 'Termin ohne Beschreibung'}
                                                    </p>
                                                    {#if app.is_series}
                                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            🔁 Serie
                                                        </span>
                                                    {/if}
                                                    {#if app.is_private}
                                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                                            🔒 Privat
                                                        </span>
                                                    {/if}
                                                </div>

                                                <div class="flex items-center gap-3 text-xs text-neutral-500 mt-1 font-medium flex-wrap">
                                                    <span class="flex items-center gap-1 font-semibold text-neutral-800">
                                                        🕒 {app.appointment ? new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum'}
                                                        {app.appointment ? `• ${new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                                                    </span>

                                                    {#if app.expand?.time_record}
                                                        {@const totalMins = app.expand.time_record.reduce((acc: number, tr: any) => {
                                                            if (tr.start && tr.end) {
                                                                return acc + Math.round((new Date(tr.end).getTime() - new Date(tr.start).getTime()) / 60000);
                                                            }
                                                            return acc;
                                                        }, 0)}
                                                        {#if totalMins > 0}
                                                            <span class="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                                                <Clock class="w-3 h-3" /> {Math.floor(totalMins / 60)}h {totalMins % 60}m
                                                            </span>
                                                        {/if}
                                                    {/if}

                                                    {#if app.expand?.drive_record}
                                                        {@const totalKm = app.expand.drive_record.reduce((acc: number, dr: any) => acc + (dr.km || 0), 0)}
                                                        {#if totalKm > 0}
                                                            <span class="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                                                <Car class="w-3 h-3" /> {totalKm} km
                                                            </span>
                                                        {/if}
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3 self-end sm:self-center shrink-0">
                                            {#if app.settled}
                                                <span class="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200">
                                                    ✓ Abgerechnet
                                                </span>
                                            {:else}
                                                <span class="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                                                    Offen
                                                </span>
                                            {/if}
                                            <ExternalLink class="w-4 h-4 text-neutral-400 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        {/if}

                    </div>
                {/if}

                <!-- ==================================================== -->
                <!-- REITER 4: DOKUMENTE & AKTEN                          -->
                <!-- ==================================================== -->
                {#if activeTab === 'documents'}
                    <ClientDocumentsTab
                        {client}
                        clientId={clientId || ''}
                        {systemDocuments}
                        {pdfPreviewModal}
                        {docGenModal}
                    />
                {/if}

                <!-- ==================================================== -->
                <!-- REITER 5: NETZWERK & INSTITUTIONEN                   -->
                <!-- ==================================================== -->
                {#if activeTab === 'network'}
                    <div class="space-y-6 animate-enter">

                        <!-- VERHINDERUNGSPFLEGE PERSON WIDGET -->
                        <InheritorWidget {client} />

                        <!-- BEZUGSPERSONEN / KONTAKTE -->
                        <div class="orga-card-white p-6 space-y-4">
                            <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
                                <div>
                                    <h4 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                                        <Users class="w-4 h-4 text-emerald-600" />
                                        Bezugspersonen & Angehörige ({contacts.length})
                                    </h4>
                                    <p class="text-xs text-neutral-500 mt-0.5">Angehörige, Bevollmächtigte, Pflegedienste und Ärzte</p>
                                </div>
                                <button
                                    type="button"
                                    onclick={() => linkContactModal?.open()}
                                    class="orga-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus class="w-3.5 h-3.5" /> Kontakt verknüpfen
                                </button>
                            </div>

                            {#if contacts.length === 0}
                                <div class="text-center py-8 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                                    <p class="text-sm font-semibold text-neutral-500">Noch keine Bezugspersonen verknüpft.</p>
                                    <button
                                        type="button"
                                        onclick={() => linkContactModal?.open()}
                                        class="mt-2 text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                                    >
                                        + Jetzt Kontakt aus dem Adressbuch verknüpfen
                                    </button>
                                </div>
                            {:else}
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {#each contacts as contact}
                                        {@const relData = getContactRelationData(contact.id)}
                                        {@const contactDisplayName = `${contact.name_first || ''} ${contact.name_last || ''}`.trim() || contact.company_name || 'Kontakt'}
                                        <div class="p-4 bg-white rounded-2xl border border-neutral-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between gap-3">
                                            <div class="flex items-start gap-3">
                                                <div class="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {(contact.name_first?.charAt(0) || contact.company_name?.charAt(0) || '?').toUpperCase()}
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <p class="text-sm font-bold text-neutral-900 truncate">
                                                        {contactDisplayName}
                                                    </p>
                                                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        {#if relData?.relation}
                                                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                {relData.relation}
                                                            </span>
                                                        {/if}
                                                        {#if relData?.is_primary}
                                                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                                                ⭐ Hauptkontakt
                                                            </span>
                                                        {/if}
                                                        {#if relData?.has_power_of_attorney}
                                                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                📜 Vollmacht
                                                            </span>
                                                        {/if}
                                                    </div>

                                                    <p class="text-xs text-neutral-500 mt-2 truncate">
                                                        {contact.phone || contact.email || 'Keine Direktkontaktdaten'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div class="flex items-center justify-between border-t border-neutral-100 pt-2.5">
                                                <div class="flex items-center gap-1">
                                                    {#if contact.phone}
                                                        <a href={`tel:${contact.phone}`} class="p-1.5 text-neutral-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors" title="Anrufen">
                                                            <Phone class="w-3.5 h-3.5" />
                                                        </a>
                                                    {/if}
                                                    {#if contact.email}
                                                        <a href={`mailto:${contact.email}`} class="p-1.5 text-neutral-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors" title="E-Mail">
                                                            <Mail class="w-3.5 h-3.5" />
                                                        </a>
                                                    {/if}
                                                </div>

                                                <div class="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onclick={() => relationEditModal?.open(contact, relData)}
                                                        class="p-1.5 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                                                        title="Rolle / Vollmacht bearbeiten"
                                                    >
                                                        <Edit3 class="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onclick={() => contactModal?.open(contact)}
                                                        class="text-xs font-bold text-indigo-600 hover:underline px-1.5 py-1 cursor-pointer"
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onclick={() => unlinkContact(contact.id, contactDisplayName)}
                                                        class="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="Trennen"
                                                    >
                                                        <Link2Off class="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <!-- PFLEGEHEIME & EINRICHTUNGEN -->
                        <div class="orga-card-white p-6 space-y-4">
                            <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
                                <div>
                                    <h4 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                                        <Building2 class="w-4 h-4 text-teal-600" />
                                        Pflegeheime & Residenzen ({retirementHomes.length})
                                    </h4>
                                    <p class="text-xs text-neutral-500 mt-0.5">Seniorenresidenzen und stationäre Einrichtungen</p>
                                </div>
                                <button
                                    type="button"
                                    onclick={() => linkHomeModal?.open()}
                                    class="orga-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus class="w-3.5 h-3.5" /> Pflegeheim verknüpfen
                                </button>
                            </div>

                            {#if retirementHomes.length === 0}
                                <div class="text-center py-8 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                                    <p class="text-sm font-semibold text-neutral-500">Kein Pflegeheim verknüpft (Klient wohnt ambulant/zu Hause).</p>
                                </div>
                            {:else}
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {#each retirementHomes as home}
                                        <div class="p-4 bg-white rounded-2xl border border-neutral-200 hover:border-teal-300 hover:shadow-md transition-all flex items-center justify-between gap-3">
                                            <button
                                                type="button"
                                                onclick={() => homeModal?.open(home)}
                                                class="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                                            >
                                                <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
                                                    🏥
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <p class="text-sm font-bold text-neutral-900 truncate">{home.name}</p>
                                                    <p class="text-xs text-neutral-500 mt-0.5 truncate">{home.address || 'Keine Adresse'}</p>
                                                </div>
                                            </button>

                                            <div class="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onclick={() => homeModal?.open(home)}
                                                    class="text-xs font-bold text-teal-700 hover:underline px-2 py-1 cursor-pointer"
                                                >
                                                    Details
                                                </button>
                                                <button
                                                    type="button"
                                                    onclick={() => unlinkRetirementHome(home.id, home.name || 'Pflegeheim')}
                                                    class="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                                    title="Trennen"
                                                >
                                                    <Link2Off class="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                    </div>
                {/if}

            {/if}
        </div>

    </div>
</dialog>

<!-- ============================================================ -->
<!-- SUB-MODAL INSTANCES                                          -->
<!-- ============================================================ -->
{#if client}
    <ClientEditModal bind:this={editModal} {client} />
    <AiReportModal bind:this={aiModal} onSave={handleAiSave} />
    <ClientPortalAccessModal bind:this={portalAccessModal} />
    <QuickAccessMailModal bind:this={quickMailModal} />
    <ClientBudgetModal bind:this={budgetModal} usedGemeinsamerJahresbetrag={usedGemeinsamerJahresbetrag} usedEntlastungsleistungen={usedEntlastungsleistungen} />
    <ClientLinkInsuranceModal bind:this={linkInsuranceModal} client={client} />
    <ClientLinkContactModal bind:this={linkContactModal} client={client} />
    <ClientLinkHomeModal bind:this={linkHomeModal} client={client} />
    <ClientEditContactRelationModal bind:this={relationEditModal} clientId={client.id} />
    <AppointmentModal bind:this={appointmentModal} />
    <AppointmentDetailModal bind:this={appointmentDetailModal} />
    <ContactModal bind:this={contactModal} />
    <RetirementHomeModal bind:this={homeModal} />
    <MultiAppointmentReminderModal bind:this={multiReminderModal} />
    <PdfPreviewModal bind:this={pdfPreviewModal} />
    <InvoiceEmailModal bind:this={emailModal} />
    <DocumentGeneratorModal bind:this={docGenModal} />
    <InvoiceDetailModal bind:this={invoiceDetailModal} />
{/if}
