<script lang="ts">
    import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
    import { onMount, onDestroy } from "svelte";
    import { sendEmail, MICROSERVICE_URL } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import RequestReplyModal from "./RequestReplyModal.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte"; // Import the PdfPreviewModal
    import AppointmentModal from "$lib/components/AppointmentModal.svelte"; // Pfad zum Termin-Modal ggf. anpassen
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";
    import GoogleContactSelectionModal from "$lib/components/contacts/GoogleContactSelectionModal.svelte";
    import { Paperclip, Eye, FolderDown, X } from "lucide-svelte";

    const reqService = useRequestAdmin();
    let showAll = $state(false);
    let activeTab = $state<'requests' | 'changes' | 'feedbacks' | 'admissions'>('requests');
    let replyModal: any = $state();
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    // svelte-ignore non_reactive_update
    let clientDetailModal: any;
    let appointmentModal: any = $state();
    let googleContactModal = $state<ReturnType<typeof GoogleContactSelectionModal>>();

    let currentUser = $state(pb.authStore.model);
    pb.authStore.onChange(() => currentUser = pb.authStore.model);
    let isGodMode = $derived(pb.authStore.isSuperuser || currentUser?.role === 'superadmin');
    let isAdmin = $derived(isGodMode || currentUser?.role === 'admin');

    // --- KI-Zusammenfassung Ansichts-Modus pro Anfrage (Standard: 'ai') ---
    let reqViewModes = $state<Record<string, 'ai' | 'original'>>({});
    let summarizingReqIds = $state<Record<string, boolean>>({});
    // Schutz gegen doppelte Terminübernahme / Mehrfachklicks
    let transferringReqIds = $state<Record<string, boolean>>({});

    function getViewMode(reqId: string): 'ai' | 'original' {
        return reqViewModes[reqId] || 'ai';
    }

    function setViewMode(reqId: string, mode: 'ai' | 'original') {
        reqViewModes[reqId] = mode;
    }

    async function loadAiSummaryForRequest(req: any, force = false) {
        if (!req?.id || (!force && req.ai_summary) || summarizingReqIds[req.id]) return;
        summarizingReqIds[req.id] = true;
        try {
            const apiEndpoint = `${MICROSERVICE_URL}/ai/summarize-request`;
            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({ id: req.id, force })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.summary) {
                    req.ai_summary = data.summary;
                }
            } else {
                console.warn('[AI Summary] Server antwortete mit Status:', res.status, res.statusText);
            }
        } catch (err) {
            console.warn('[AI Summary] Fehler beim Laden:', err);
        } finally {
            summarizingReqIds[req.id] = false;
        }
    }

    // --- Modals State ---
    let changesDialog: HTMLDialogElement | undefined = $state();
    let feedbacksDialog: HTMLDialogElement | undefined = $state();
    let admissionsDialog: HTMLDialogElement | undefined = $state();

    // --- Feedbacks State ---
    let feedbacks = $state<any[]>([]);
    let isFeedbacksLoading = $state(false);
    let showAllFeedbacks = $state(false);

    let newFeedbacksCount = $derived(feedbacks.filter(f => f.status === 'Neu').length);
    let visibleFeedbacks = $derived(feedbacks.filter(f => showAllFeedbacks || f.status !== 'Archieviert'));

    async function loadFeedbacks() {
        isFeedbacksLoading = true;
        try {
            let filter = 'id != ""';
            if (!isGodMode) {
                const userCompanyId = currentUser?.company;
                if (userCompanyId) {
                    // Filtert Feedbacks, bei denen der verknüpfte Klient zur Firma des Admins gehört
                    filter = `client.company = "${userCompanyId}"`;
                } else {
                    // Nutzer ohne Firma (sollte nicht vorkommen) sehen keine Feedbacks
                    feedbacks = [];
                    isFeedbacksLoading = false;
                    return;
                }
            }
            feedbacks = await pb.collection('feedbacks').getFullList({ filter, sort: '-created', expand: 'client', requestKey: null });
        } catch (e) {
            console.error("Fehler beim Laden der Feedbacks:", e);
        } finally {
            isFeedbacksLoading = false;
        }
    }
    
    const feedbackCallback = (e: any) => {
        if (e.action === 'create') {
            feedbacks = [e.record, ...feedbacks];
        } else if (e.action === 'update') {
            feedbacks = feedbacks.map(f => f.id === e.record.id ? e.record : f);
        } else if (e.action === 'delete') {
            feedbacks = feedbacks.filter(f => f.id !== e.record.id);
        }
    };

    const requestsCallback = () => {
        reqService.init(); // Lädt die Anfragen bei jeder Änderung sofort neu
    };

    onMount(() => {
        reqService.init();
        loadFeedbacks();
        
        pb.collection('feedbacks').subscribe('*', feedbackCallback, { requestKey: null });
        pb.collection('appointment_requests').subscribe('*', requestsCallback);
    });
    onDestroy(() => {
        reqService.cleanup();
        pb.collection('feedbacks').unsubscribe('*');
        pb.collection('appointment_requests').unsubscribe('*');
    });

    const isRequestOpen = (r: any) => r.status !== 'accepted' && r.status !== 'denied';

    let visibleRequests = $derived.by(() => {
        let list = reqService.requests.filter(r => showAll || isRequestOpen(r));
        if (isGodMode) return list;

        const userComp = currentUser?.company;
        const userCompanyIds: string[] = Array.isArray(userComp) ? userComp : (userComp ? [userComp] : []);
        if (userCompanyIds.length === 0) return list;

        // Filtert Anfragen, die direkt der Firma des Admins zugeordnet sind oder unzugeordnet sind
        return list.filter(r => {
            if (!r.company || (Array.isArray(r.company) && r.company.length === 0)) return true;
            const reqComps = Array.isArray(r.company) ? r.company : [r.company];
            return reqComps.some((rc: any) => userCompanyIds.includes(rc));
        });
    });
    let pendingCount = $derived(visibleRequests.filter(isRequestOpen).length);

    let requestsWithoutSummaryCount = $derived(
        visibleRequests.filter(r => !r.ai_summary).length
    );
    let isBatchGenerating = $state(false);

    async function batchGenerateAllSummaries() {
        if (isBatchGenerating) return;
        const targets = visibleRequests.filter(r => !r.ai_summary);
        if (targets.length === 0) {
            toastStore.info("Alle sichtbaren Anfragen haben bereits eine KI-Zusammenfassung.");
            return;
        }
        isBatchGenerating = true;
        toastStore.info(`Starte KI-Generierung für ${targets.length} frühere Anfrage(n)...`);
        let count = 0;
        for (const r of targets) {
            try {
                await loadAiSummaryForRequest(r, true);
                count++;
            } catch (e) {}
        }
        isBatchGenerating = false;
        toastStore.success(`KI-Zusammenfassungen für ${count} frühere Anfrage(n) erfolgreich generiert!`);
    }

    // Automatische KI-Zusammenfassung im Hintergrund für alle Anfragen ohne bisherigen KI-Text
    $effect(() => {
        if (activeTab === 'requests') {
            for (const r of visibleRequests) {
                if (!r.ai_summary && !summarizingReqIds[r.id]) {
                    loadAiSummaryForRequest(r);
                }
            }
        }
    });

    // --- Änderungswünsche (Appointments mit requestet_changes) ---
    let changeRequests = $derived.by(() => {
        let list = (orgaStore.appointments?.data || []).filter((a: any) => a.requestet_changes && a.requestet_changes.status === 'pending');

        if (!isGodMode) {
            const userCompanyId = currentUser?.company;
            if (isAdmin && userCompanyId) {
                // Admins sehen alle Änderungen, deren Termine einem Mitarbeiter ihrer Firma gehören
                list = list.filter((a: any) => a.expand?.user?.company === userCompanyId);
            } else { // Normale Mitarbeiter sehen nur ihre eigenen
                list = list.filter((a: any) => a.user === currentUser?.id);
            }
        }
        return list.sort((a: any, b: any) => new Date(b.requestet_changes.created).getTime() - new Date(a.requestet_changes.created).getTime());
    });
    
    let pendingChangesCount = $derived(changeRequests.length);

    // --- Neuaufnahmen (Inaktive Klienten mit speziellem Notiz-Text) ---
    let newClients = $derived.by(() => {
        let list = (orgaStore.clients?.data || []).filter((c: any) => c.status === 'Inaktiv' && c.notes && c.notes.includes('NEUAUFNAHME-ANFRAGE'));
        if (!isGodMode) {
            const userCompanyId = currentUser?.company;
            if (isAdmin && userCompanyId) {
                list = list.filter((c: any) => {
                    const comp = c.company;
                    if (Array.isArray(comp)) return comp.includes(userCompanyId);
                    if (typeof comp === 'string' && comp.startsWith('[')) {
                        try { return JSON.parse(comp).includes(userCompanyId); } catch { return false; }
                    }
                    return comp === userCompanyId || (comp && comp.includes(userCompanyId));
                });
            } else {
                list = []; // Normale Mitarbeiter sehen keine Aufnahmen, es sei denn sie haben Admin-Rechte für ihren Standort
            }
        }
        return list.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    });
    
    let pendingAdmissionsCount = $derived(newClients.length);

    async function acceptClient(id: string) {
        try {
            const client = await pb.collection('clients').getOne(id, { requestKey: null });
            let updatedNotes = client.notes || '';
            let newInsuranceId: string | null = null;
            let newInsName = '';

            // Prüfe, ob bei der Aufnahme eine neue Krankenkasse angegeben wurde
            const match = updatedNotes.match(/\[NEUE_KRANKENKASSE:\s*({.*?})\]/);
            if (match) {
                try {
                    const insData = JSON.parse(match[1]);
                    newInsName = (insData.name || '').trim();
                    if (newInsName) {
                        // Prüfen ob bereits vorhanden
                        const existingList = await pb.collection('insurancies').getFullList({
                            filter: `name ~ "${newInsName}"`,
                            requestKey: null
                        }).catch(() => []);
                        
                        const exactMatch = existingList.find((i: any) => i.name.toLowerCase().trim() === newInsName.toLowerCase().trim());
                        if (exactMatch) {
                            newInsuranceId = exactMatch.id;
                        } else {
                            // Neue Krankenkasse direkt anlegen
                            const created = await pb.collection('insurancies').create({
                                name: newInsName,
                                street: insData.street || '',
                                zip: insData.zip || '',
                                city: insData.city || '',
                                type: 'GKV (Gesetzlich)'
                            });
                            newInsuranceId = created.id;
                            if (orgaStore.insurancies) {
                                orgaStore.insurancies.data = [created as any, ...orgaStore.insurancies.data];
                            }
                        }
                    }
                    // Steuer-Tag aus Notizen entfernen
                    updatedNotes = updatedNotes.replace(/\[NEUE_KRANKENKASSE:\s*{.*?}\]\n?/g, '').trim();
                } catch (err) {
                    console.error("Fehler beim Verarbeiten der neuen Krankenkasse:", err);
                }
            }

            const updatePayload: any = {
                status: 'Aktiv',
                notes: updatedNotes
            };
            if (newInsuranceId) {
                updatePayload.insurance = [newInsuranceId];
            }

            const updatedClient = await pb.collection('clients').update(id, updatePayload, {
                expand: 'insurance,contacts,caregiver,retirement_homes',
                requestKey: null
            });

            // OrgaStore aktualisieren
            if (orgaStore.clients) {
                const idx = orgaStore.clients.data.findIndex((c: any) => c.id === id);
                if (idx !== -1) {
                    orgaStore.clients.data[idx] = updatedClient as any;
                }
            }

            if (newInsuranceId && newInsName) {
                toastStore.success(`Klient aufgenommen und Krankenkasse "${newInsName}" direkt neu angelegt!`);
            } else {
                toastStore.success("Klient wurde erfolgreich aufgenommen (Status: Aktiv).");
            }
        } catch (e: any) {
            console.error(e);
            toastStore.error("Fehler beim Aufnehmen des Klienten: " + (e.message || ''));
        }
    }

    async function deleteNewClient(id: string) {
        if (await confirmStore.ask("Möchten Sie diese Anfrage und den dazugehörigen Klienten-Datensatz wirklich unwiderruflich löschen?", "Anfrage löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('clients').delete(id);
                toastStore.info("Aufnahme-Anfrage gelöscht.");
            } catch (e) { toastStore.error("Fehler beim Löschen."); }
        }
    }

    function previewAttachment(req: any, filename: string) {
        if (pdfPreviewModal) {
            pdfPreviewModal.open(pb.files.getURL(req, filename), filename, filename);
        }
    }

    let attachDropdownOpen = $state<{ reqId: string, filename: string } | null>(null);
    let attachSearchQuery = $state("");

    let filteredAttachClients = $derived.by(() => {
        const query = attachSearchQuery.toLowerCase();
        let list = orgaStore.clients?.data || [];
        if (query) {
            list = list.filter((c: any) => `${c.name_first} ${c.name_last}`.toLowerCase().includes(query));
        }
        // Wichtig: Eine Kopie des Arrays erstellen (`[...list]`), bevor es sortiert wird, um "unsafe mutation" zu vermeiden.
        return [...list].sort((a: any, b: any) => a.name_first.localeCompare(b.name_first)).slice(0, 15);
    });

    async function copyToClient(req: any, filename: string, clientId: string, silent = false) {
        attachDropdownOpen = null;
        try {
            if (!silent) toastStore.info("Übertrage Datei...");
            const url = pb.files.getURL(req, filename);
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], filename, { type: blob.type });

            const formData = new FormData();
            formData.append('documents', file);

            await pb.collection('clients').update(clientId, formData);
            if (!silent) toastStore.success("Datei wurde erfolgreich in der Klienten-Akte gespeichert.");
        } catch (e) {
            if (!silent) toastStore.error("Fehler beim Speichern der Datei.");
            console.error(e);
        }
    }

    function formatContact(method: string) {
        switch(method) {
            case 'telephone': return '📞 Telefonrückruf';
            case 'e-mail-address': return '✉️ E-Mail';
            case 'whatsapp': return '💬 WhatsApp';
            case 'mail-adress': return '📮 Postbrief';
            default: return '📞 Unbekannt';
        }
    }

    function escapeRegex(str: string): string {
        return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function cleanPersonName(raw: string): string {
        return (raw || '')
            .replace(/^(herr|frau|herrn|dr\.|prof\.|familie|dr\. med\.)\s+/i, '')
            .replace(/\((.*?)\)/g, '')
            .trim();
    }

    function normalizePhone(p: string): string {
        return (p || '').replace(/\D+/g, '').replace(/^49/, '0');
    }

    async function findOrCreateClientForRequest(req: any): Promise<{ client: any, isNew: boolean }> {
        const clientList: any[] = orgaStore.clients?.data || [];

        // 1. Direkt nach verknüpfter client_id suchen
        let directId = Array.isArray(req.client_id) ? req.client_id[0] : req.client_id;
        if (directId) {
            const found = clientList.find(c => c.id === directId);
            if (found) return { client: found, isNew: false };
            try {
                const c = await pb.collection('clients').getOne(directId, { requestKey: null });
                if (c) return { client: c, isNew: false };
            } catch {}
        }

        // Sammle alle Texte der Anfrage für Tiefenscan
        const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const rawText = req.request_text || '';
        const fullContextText = `${aiTitle}\n${aiTask}\n${rawText}\n${req.ai_summary || ''}`;

        // Hilfsfunktion zum Namensabgleich
        const matchesClientName = (client: any, candidate: string) => {
            const clean = cleanPersonName(candidate).toLowerCase();
            if (!clean || clean.length < 2) return false;
            const fName = (client.name_first || '').toLowerCase().trim();
            const lName = (client.name_last || '').toLowerCase().trim();
            const full1 = `${fName} ${lName}`.trim();
            const full2 = `${lName} ${fName}`.trim();
            const full3 = `${lName}, ${fName}`.trim();

            if (clean === full1 || clean === full2 || clean === full3) return true;
            if (fName && lName && clean.includes(fName) && clean.includes(lName)) return true;
            if (lName && clean.length > 3 && (clean === lName || (clean.includes(lName) && fName && clean.includes(fName)))) return true;
            return false;
        };

        // 2. Explizite Marker im Anfragetext ("Betrifft Klient: Rainer Spreer", "Klient: ...")
        const explicitClientMatch = fullContextText.match(/(?:Betrifft Klient|Klient|Kunde|Patient):\s*([^\n\r,]+)/i);
        if (explicitClientMatch && explicitClientMatch[1]) {
            const explicitName = cleanPersonName(explicitClientMatch[1].trim());
            const found = clientList.find(c => matchesClientName(c, explicitName));
            if (found) return { client: found, isNew: false };
        }

        // 3. Scan nach Klienten-Namen im KI-Titel (z. B. "Anfrage Herr Spreer (Arzt Dr. Wiermann)")
        // Höchste Priorität: Ein Klienten-Nachname steht im Titel oder Anliegen
        if (aiTitle || aiTask) {
            const titleTaskText = `${aiTitle}\n${aiTask}`;
            for (const c of clientList) {
                const lName = (c.name_last || '').trim();
                if (lName.length >= 3) {
                    const salutationRegex = new RegExp(`(?:Herr|Herrn|Frau|Klient|Patient)\\s+${escapeRegex(lName)}\\b`, 'i');
                    if (salutationRegex.test(titleTaskText)) {
                        return { client: c, isNew: false };
                    }
                }
            }
            // Auch ohne Anrede als ganzes Wort im Titel/Anliegen prüfen
            for (const c of clientList) {
                const lName = (c.name_last || '').trim();
                if (lName.length >= 4) {
                    const wordRegex = new RegExp(`\\b${escapeRegex(lName)}\\b`, 'i');
                    if (wordRegex.test(titleTaskText)) {
                        return { client: c, isNew: false };
                    }
                }
            }
        }

        // 4. Salutation-Matches aus dem gesamten Text ("Herr Spreer", "Frau Müller")
        const salutationMatches = fullContextText.matchAll(/(?:Herr|Herrn|Frau|Klient|Klientin|Patient|Patientin)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/gi);
        for (const m of salutationMatches) {
            if (m[1]) {
                const cand = cleanPersonName(m[1].trim());
                if (!/^Dr\.?\s+/i.test(m[0]) && cand.length >= 3) {
                    const found = clientList.find(c => matchesClientName(c, cand) || (c.name_last && c.name_last.toLowerCase() === cand.toLowerCase()));
                    if (found) return { client: found, isNew: false };
                }
            }
        }

        // 5. Allgemeiner Abgleich aller Klienten-Namen gegen den Gesamttext
        for (const c of clientList) {
            const lName = (c.name_last || '').trim();
            const fName = (c.name_first || '').trim();
            if (lName.length >= 3) {
                if (fName && fullContextText.toLowerCase().includes(`${fName.toLowerCase()} ${lName.toLowerCase()}`)) {
                    return { client: c, isNew: false };
                }
                const salutationRegex = new RegExp(`(?:Herr|Herrn|Frau|Klient|Patient)\\s+${escapeRegex(lName)}\\b`, 'i');
                if (salutationRegex.test(fullContextText)) {
                    return { client: c, isNew: false };
                }
            }
        }

        // 6. Abgleich über Betreuer oder Kontakte des Klienten
        // Wenn ein Betreuer (z. B. "Hannes Knop" / "info@rb-knop.de") anfragt, prüfe welcher Klient verknüpft ist!
        const senderClean = cleanPersonName(req.sender_name || '');
        const senderEmail = (req.email || '').toLowerCase().trim();
        const reqPhoneClean = normalizePhone(req.phone);

        if (senderClean || senderEmail || reqPhoneClean.length >= 6) {
            const matchedByCaregiver = clientList.find(c => {
                if (c.expand?.caregiver) {
                    const cg = Array.isArray(c.expand.caregiver) ? c.expand.caregiver[0] : c.expand.caregiver;
                    if (cg) {
                        if (senderClean && `${cg.name_first || ''} ${cg.name_last || ''}`.toLowerCase().includes(senderClean.toLowerCase())) return true;
                        if (senderEmail && cg.email && cg.email.toLowerCase().trim() === senderEmail) return true;
                        if (reqPhoneClean.length >= 6 && cg.phone && normalizePhone(cg.phone) === reqPhoneClean) return true;
                    }
                }
                if (c.expand?.contacts && Array.isArray(c.expand.contacts)) {
                    const match = c.expand.contacts.some((ct: any) => {
                        if (senderClean && `${ct.name_first || ''} ${ct.name_last || ''}`.toLowerCase().includes(senderClean.toLowerCase())) return true;
                        if (senderClean && ct.company_name && ct.company_name.toLowerCase().includes(senderClean.toLowerCase())) return true;
                        if (senderEmail && ct.email && ct.email.toLowerCase().trim() === senderEmail) return true;
                        return false;
                    });
                    if (match) return true;
                }
                if (c.notes) {
                    if (senderClean && senderClean.length > 4 && c.notes.toLowerCase().includes(senderClean.toLowerCase())) return true;
                    if (senderEmail && c.notes.toLowerCase().includes(senderEmail)) return true;
                }
                return false;
            });

            if (matchedByCaregiver) {
                return { client: matchedByCaregiver, isNew: false };
            }
        }

        // 7. Abgleich per E-Mail des Klienten
        if (req.email && req.email.includes('@')) {
            const targetEmail = req.email.toLowerCase().trim();
            const found = clientList.find(c => c.email && c.email.toLowerCase().trim() === targetEmail);
            if (found) return { client: found, isNew: false };
            try {
                const c = await pb.collection('clients').getFirstListItem(`email="${targetEmail}"`, { requestKey: null });
                if (c) return { client: c, isNew: false };
            } catch {}
        }

        // 8. Abgleich per Telefonnummer
        if (reqPhoneClean.length >= 6) {
            const found = clientList.find(c => {
                const cp = normalizePhone(c.phone);
                const ch = normalizePhone(c.handy);
                return (cp && (cp === reqPhoneClean || cp.endsWith(reqPhoneClean) || reqPhoneClean.endsWith(cp))) ||
                       (ch && (ch === reqPhoneClean || ch.endsWith(reqPhoneClean) || reqPhoneClean.endsWith(ch)));
            });
            if (found) return { client: found, isNew: false };
        }

        // 9. Abgleich per Absendername
        if (senderClean) {
            const found = clientList.find(c => matchesClientName(c, senderClean));
            if (found) return { client: found, isNew: false };

            const parts = senderClean.split(/[,\s]+/).filter(Boolean);
            if (parts.length >= 2) {
                try {
                    const c = await pb.collection('clients').getFirstListItem(
                        `(name_first~"${parts[0]}" && name_last~"${parts[1]}") || (name_first~"${parts[1]}" && name_last~"${parts[0]}")`,
                        { requestKey: null }
                    );
                    if (c) return { client: c, isNew: false };
                } catch {}
            }
        }

        // 10. Abgleich per Adresse (Straße + Stadt)
        if (req.street && req.zip_city) {
            const reqSt = req.street.toLowerCase().replace(/\s+/g, ' ').trim();
            const found = clientList.find(c => {
                const cSt = `${c.street || ''} ${c.housenr || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
                return cSt && (cSt.includes(reqSt) || reqSt.includes(cSt));
            });
            if (found) return { client: found, isNew: false };
        }

        // 11. Kein bestehender Klient gefunden -> Automatisch neuen Klienten anlegen
        let salutation: "Herr" | "Frau" | "Divers" | "Keine Angabe" = "Keine Angabe";
        const lowerRaw = (req.sender_name || '').toLowerCase();
        if (lowerRaw.startsWith('frau')) salutation = 'Frau';
        else if (lowerRaw.startsWith('herr')) salutation = 'Herr';

        const cleanName = cleanPersonName(req.sender_name || 'Neuer Klient');
        let firstName = "";
        let lastName = cleanName;

        if (cleanName.includes(',')) {
            const p = cleanName.split(',');
            lastName = p[0].trim();
            firstName = p.slice(1).join(' ').trim();
        } else {
            const p = cleanName.split(' ').filter(Boolean);
            if (p.length === 2) {
                firstName = p[0];
                lastName = p[1];
            } else if (p.length > 2) {
                firstName = p.slice(0, -1).join(' ');
                lastName = p[p.length - 1];
            }
        }

        let streetName = (req.street || '').trim();
        let houseNr = '';
        const houseNrMatch = streetName.match(/^(.*?)\s+(\d+[\s\w\-\/]*)$/);
        if (houseNrMatch) {
            streetName = houseNrMatch[1].trim();
            houseNr = houseNrMatch[2].trim();
        }

        let zip = '';
        let city = (req.zip_city || '').trim();
        const zipMatch = city.match(/^(\d{5})\s+(.*)$/);
        if (zipMatch) {
            zip = zipMatch[1];
            city = zipMatch[2].trim();
        }

        const newClientPayload: any = {
            salutation,
            name_first: firstName || 'Neuer',
            name_last: lastName || 'Klient',
            street: streetName,
            housenr: houseNr,
            zip,
            city,
            email: req.email || '',
            phone: req.phone || '',
            status: 'Aktiv',
            company: req.company || currentUser?.company || '',
            assigned_employee: currentUser?.id || '',
            notes: `Automatisch aus Terminanfrage übernommen.\n\nOriginalanfrage:\n${req.request_text || ''}`
        };

        try {
            const created = await pb.collection('clients').create(newClientPayload, { requestKey: null });
            if (orgaStore.clients) {
                orgaStore.clients.data = [created as any, ...orgaStore.clients.data];
            }
            return { client: created, isNew: true };
        } catch (err) {
            console.error("Fehler beim automatischen Anlegen des Klienten:", err);
            throw err;
        }
    }

    function resolveLocationAndContact(req: any, client: any) {
        const matchedContact = getDetectedContact(req, client);

        let aiLocation = '';
        if (req.ai_summary) {
            const locMatch = req.ai_summary.match(/📍\s*Ort:\s*([^\n\r]+)/i);
            if (locMatch && locMatch[1]) aiLocation = locMatch[1].trim();
        }

        let addressText = '';
        if (req.street && req.zip_city) {
            addressText = `${req.street}, ${req.zip_city}`.trim();
        } else if (req.request_text) {
            const m = req.request_text.match(/(?:Adresse|Ort):\s*([^\n\r]+)/i);
            if (m && m[1] && m[1].trim() !== '-') addressText = m[1].trim();
        }

        const rawLoc = aiLocation || addressText;
        const isNonPhysical = /telefonisch|intern|telefon|online|zoom|videocall/i.test(aiLocation) ||
                              /telefonisch|intern|telefon|online|zoom|videocall/i.test(rawLoc);

        // 1. Wenn ein Arzt/Praxis/Partner-Kontakt ermittelt wurde:
        // Seine Praxisadresse ist der Zielort des Termins (z.B. Dr. Wiermann -> Steinweg 28, 06108 Halle)
        if (matchedContact) {
            const addrPart = `${matchedContact.street || ''} ${matchedContact.housenr || ''}`.trim();
            const cityPart = `${matchedContact.zip || ''} ${matchedContact.city || ''}`.trim();

            let namePart = '';
            if (matchedContact.company_name) {
                namePart = matchedContact.company_name.trim();
            } else if (matchedContact.name_first || matchedContact.name_last) {
                namePart = `${matchedContact.name_first || ''} ${matchedContact.name_last || ''}`.trim();
            }

            let formattedContactAddress = '';
            if (addrPart && cityPart) {
                formattedContactAddress = namePart ? `${namePart}, ${addrPart}, ${cityPart}` : `${addrPart}, ${cityPart}`;
            } else if (addrPart) {
                formattedContactAddress = namePart ? `${namePart}, ${addrPart}` : addrPart;
            } else {
                formattedContactAddress = namePart || '';
            }

            return {
                useClientAddress: false,
                locationAddress: formattedContactAddress || (isNonPhysical ? '' : rawLoc),
                contactId: matchedContact.id,
                executionMode: isNonPhysical ? (aiLocation || rawLoc) : ''
            };
        }

        // 2. Prüfen, ob Termin beim Klienten stattfindet
        const isBeimKlienten = 
            /beim klienten|zuhause|beim kunden|beim patienten|vor ort|wohnung des klienten/i.test(aiLocation) ||
            (!isNonPhysical && client && client.street && client.street.length >= 4 && (
                (rawLoc && rawLoc.toLowerCase().includes(client.street.toLowerCase())) ||
                (req.street && req.street.toLowerCase().includes(client.street.toLowerCase()))
            ));

        if (isBeimKlienten) {
            const cStreet = `${client?.street || ''} ${client?.housenr || ''}`.trim();
            const cCity = `${client?.zip || ''} ${client?.city || ''}`.trim();
            const fullClientAddr = [cStreet, cCity].filter(Boolean).join(', ');

            return {
                useClientAddress: true,
                locationAddress: fullClientAddr,
                contactId: '',
                executionMode: isNonPhysical ? (aiLocation || rawLoc) : ''
            };
        }

        // 3. Explizite Adresse im Text (z.B. "Arzt: Dr. Winert, Ernst-Kamieth-Straße 11, 06112 Halle")
        const explicitAddressMatch = (req.ai_summary || req.request_text || '').match(/(?:Arzt|Praxis|Zielort|Adresse):\s*([^,\n\r]+,\s*[0-9]{5}\s+[^\n\r]+)/i);
        if (explicitAddressMatch && explicitAddressMatch[1]) {
            return {
                useClientAddress: false,
                locationAddress: explicitAddressMatch[1].trim(),
                contactId: '',
                executionMode: isNonPhysical ? (aiLocation || rawLoc) : ''
            };
        }

        return {
            useClientAddress: false,
            locationAddress: isNonPhysical ? '' : (rawLoc || (addressText || '')),
            contactId: '',
            executionMode: isNonPhysical ? (aiLocation || rawLoc) : ''
        };
    }

    function resolveAppointmentTiming(req: any) {
        let appDateStr = "";
        let appTimeStr = "";

        if (req.date) {
            const d = new Date(req.date);
            if (!isNaN(d.getTime())) {
                const pad = (n: number) => n.toString().padStart(2, '0');
                appDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            }
        }
        if (!appDateStr) {
            const today = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            appDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        }

        if (req.time) {
            if (typeof req.time === 'string' && req.time.includes('T')) {
                const t = new Date(req.time);
                if (!isNaN(t.getTime())) {
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    appTimeStr = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
                }
            } else if (typeof req.time === 'string' && /^\d{1,2}:\d{2}/.test(req.time)) {
                const m = req.time.match(/^(\d{1,2}):(\d{2})/);
                if (m) {
                    appTimeStr = `${m[1].padStart(2, '0')}:${m[2]}`;
                }
            }
        }
        if (!appTimeStr) {
            appTimeStr = "10:00"; // Standard: 10:00 Uhr
        }

        // Standard-Dauer: 1 Stunde
        const [h, min] = appTimeStr.split(':').map(Number);
        const endH = (h + 1) % 24;
        const appEndTimeStr = `${endH.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        const startLocalIso = `${appDateStr}T${appTimeStr}:00`;
        const endLocalIso = `${appDateStr}T${appEndTimeStr}:00`;
        const appointmentUtc = new Date(startLocalIso).toISOString();
        const endUtc = new Date(endLocalIso).toISOString();

        return {
            appointmentUtc,
            endUtc,
            appDateStr,
            appStartTimeStr: appTimeStr,
            appEndTimeStr
        };
    }

    function resolveTitleAndNotes(req: any, client: any, executionMode = '') {
        let title = "";
        if (req.ai_summary) {
            const titleMatch = req.ai_summary.match(/📌\s*Titel:\s*([^\n\r]+)/i);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
            }
            if (!title) {
                const taskMatch = req.ai_summary.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i);
                if (taskMatch && taskMatch[1]) {
                    title = taskMatch[1].trim();
                }
            }
        }
        if (!title && req.title) {
            title = req.title.trim();
        }
        if (!title) {
            title = `Termin mit ${client.name_first || ''} ${client.name_last || ''}`.trim();
        }

        const noteParts: string[] = [];

        // Nicht-physische Angaben wie "Intern / Telefonisch" direkt prominent in den internen Notizen erfassen
        if (executionMode) {
            noteParts.push(`📞 DURCHFÜHRUNG / ORT: ${executionMode}`);
        } else if (req.ai_summary) {
            const locMatch = req.ai_summary.match(/📍\s*Ort:\s*([^\n\r]+)/i);
            if (locMatch && locMatch[1] && /telefonisch|intern|online|zoom|videocall/i.test(locMatch[1])) {
                noteParts.push(`📞 DURCHFÜHRUNG / ORT: ${locMatch[1].trim()}`);
            }
        }

        if (req.ai_summary) {
            noteParts.push(`📌 KI-ZUSAMMENFASSUNG:\n${req.ai_summary}`);
        }
        if (req.request_text) {
            noteParts.push(`💬 KUNDENNACHRICHT:\n${req.request_text}`);
        }
        noteParts.push(`📞 KONTAKTDATEN AUS ANFRAGE:\nName: ${req.sender_name || '-'}\nTelefon: ${req.phone || '-'}\nE-Mail: ${req.email || '-'}\nAdresse: ${req.street || ''} ${req.zip_city || ''}\nKontaktweg: ${formatContact(req.contact_method)}`);

        if (req.id) {
            noteParts.push(`📌 ANFRAGE-REFERENZ:\n[ANFRAGE_ID: ${req.id}]`);
        }

        return {
            title,
            notes: noteParts.join('\n\n---\n\n')
        };
    }

    async function handlePropose(id: string) {
        const req = reqService.requests.find((r) => r.id === id);
        if (req) {
            const emailMatch = req.request_text ? req.request_text.match(/E-Mail:\s*([^\n]+)/) : null;
            const clientEmail = (req.email && req.email.includes('@')) ? req.email : (emailMatch ? emailMatch[1].trim() : null);
            
            if (clientEmail && clientEmail !== '-' && clientEmail.includes('@')) {
                replyModal?.open(req, 'propose', clientEmail);
            } else {
                toastStore.warning("Dieser Klient hat keine E-Mail-Adresse hinterlegt.");
            }
        }
    }

    let activeClientPickerReqId = $state<string | null>(null);
    let clientPickerSearch = $state('');

    function getDetectedClient(req: any) {
        const clientList: any[] = orgaStore.clients?.data || [];
        let directId = Array.isArray(req.client_id) ? req.client_id[0] : req.client_id;
        if (directId) {
            const found = clientList.find(c => c.id === directId);
            if (found) return found;
        }

        const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const titleTask = `${aiTitle}\n${aiTask}`;

        if (aiTitle || aiTask) {
            for (const c of clientList) {
                const lName = (c.name_last || '').trim();
                if (lName.length >= 3) {
                    const sal = new RegExp(`(?:Herr|Herrn|Frau|Klient|Patient)?\\s*\\b${escapeRegex(lName)}\\b`, 'i');
                    if (sal.test(titleTask)) return c;
                }
            }
            for (const c of clientList) {
                const lName = (c.name_last || '').trim();
                if (lName.length >= 4) {
                    const word = new RegExp(`\\b${escapeRegex(lName)}\\b`, 'i');
                    if (word.test(titleTask)) return c;
                }
            }
        }

        const fullText = `${aiTitle}\n${aiTask}\n${req.request_text || ''}\n${req.ai_summary || ''}`;
        for (const c of clientList) {
            const lName = (c.name_last || '').trim();
            const fName = (c.name_first || '').trim();
            if (lName.length >= 3) {
                if (fName && fullText.toLowerCase().includes(`${fName.toLowerCase()} ${lName.toLowerCase()}`)) return c;
                const sal = new RegExp(`(?:Herr|Herrn|Frau|Klient|Patient)\\s+${escapeRegex(lName)}\\b`, 'i');
                if (sal.test(fullText)) return c;
            }
        }

        if (req.email && req.email.includes('@')) {
            const found = clientList.find(c => c.email && c.email.toLowerCase().trim() === req.email.toLowerCase().trim());
            if (found) return found;
        }

        const senderClean = cleanPersonName(req.sender_name || '');
        if (senderClean) {
            const found = clientList.find(c => {
                const f = (c.name_first || '').toLowerCase();
                const l = (c.name_last || '').toLowerCase();
                return senderClean.toLowerCase() === `${f} ${l}`.trim() || senderClean.toLowerCase() === `${l} ${f}`.trim();
            });
            if (found) return found;
        }

        return null;
    }

    function isSenderOrCaregiverContact(ct: any, req: any, client?: any): boolean {
        if (!ct) return false;
        const sEmail = (req?.email || '').toLowerCase().trim();
        const sName = cleanPersonName(req?.sender_name || '').toLowerCase().trim();
        const ctEmail = (ct.email || '').toLowerCase().trim();
        const ctFirst = (ct.name_first || '').toLowerCase().trim();
        const ctLast = (ct.name_last || '').toLowerCase().trim();
        const ctComp = (ct.company_name || '').toLowerCase().trim();

        // 1. E-Mail-Abgleich mit Absender (z.B. info@rb-knop.de)
        if (sEmail && ctEmail && sEmail === ctEmail) return true;

        // 2. Absender-Name (z.B. "Hannes Knop" -> Nachname "Knop")
        if (sName) {
            if (ctLast && ctLast.length >= 3 && (sName === ctLast || sName.includes(ctLast))) {
                if (ctFirst && sName.includes(ctFirst)) return true;
                if (ctComp && (ctComp.includes('betreuer') || ctComp.includes('beistand') || ctComp.includes('kanzlei') || ctComp.includes('pflege'))) return true;
            }
            if (ctComp && sName.length >= 4 && ctComp.includes(sName)) return true;
        }

        // 3. Gesetzlicher Betreuer / Bezugsperson des Klienten
        if (client) {
            const cGiverId = client.caregiver?.id || client.caregiver || client.expand?.caregiver?.id;
            if (cGiverId && ct.id === cGiverId) return true;
            if (client.expand?.caregiver?.email && ctEmail && client.expand.caregiver.email.toLowerCase().trim() === ctEmail) return true;
        }

        return false;
    }

    function extractDoctorOrTargetQuery(req: any): { query: string; cleanKeyword: string; isDoctor: boolean } | null {
        const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const rawLoc = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const fullText = `${aiTitle}\n${aiTask}\n${rawLoc}\n${req.request_text || ''}\n${req.ai_summary || ''}`;

        // 1. Titel-Klammer: z.B. "(Arzt Dr. Wiermann)", "(Praxis Dr. Müller)", "(Augenklinik Halle)"
        const parenMatch = aiTitle.match(/\(((?:Arzt|Ärztin|Hausarzt|Hausärztin|Facharzt|Fachärztin|Zahnarzt|Zahnärztin|Frauenarzt|Frauenärztin|Kardiologe|Orthopäde|Augenarzt|Dr\.|Praxis|Klinik|Klinikum|Therapie|Physio)[^\)]+)\)/i);
        if (parenMatch && parenMatch[1]) {
            const raw = parenMatch[1].trim();
            const cleaned = raw.replace(/^(?:Arzt|Ärztin|Hausarzt|Hausärztin|Facharzt|Fachärztin|Zahnarzt|Zahnärztin|Frauenarzt|Frauenärztin|Dr\.\s*med\.?|Dr\.|Praxis|Herr|Hr\.|Frau|Fr\.)\s*/gi, '').trim();
            return { query: raw, cleanKeyword: cleaned.toLowerCase(), isDoctor: true };
        }

        // 2. Explizite Zielort-/Arzt-Zeile: z.B. "Arzt: Dr. Winert, Ernst-Kamieth-Straße 11"
        const arztPrefixMatch = fullText.match(/(?:Arzt|Praxis|Klinik|Therapie|Zielort):\s*([^\n\r,\.]+)/i);
        if (arztPrefixMatch && arztPrefixMatch[1]) {
            const raw = arztPrefixMatch[1].trim();
            const cleaned = raw.replace(/^(?:Arzt|Ärztin|Hausarzt|Hausärztin|Facharzt|Dr\.\s*med\.?|Dr\.|Praxis|Herr|Hr\.|Frau|Fr\.)\s*/gi, '').trim();
            if (cleaned.length >= 3) {
                return { query: raw, cleanKeyword: cleaned.toLowerCase(), isDoctor: true };
            }
        }

        // 3. Erwähnung im Fließtext: z.B. "Hausarzt Fr. Dr. Wiermann", "Arzt Dr. Wiermann", "Dr. Winert"
        const docMatch = fullText.match(/(?:Hausarzt|Hausärztin|Facharzt|Fachärztin|Zahnarzt|Zahnärztin|Frauenarzt|Frauenärztin|Kardiologe|Kardiologin|Orthopäde|Orthopädin|Augenarzt|Augenärztin|Neurologe|Neurologin|Hautarzt|Hautärztin|HNO|Arzt|Ärztin|Praxis|Dr\.\s*med\.?|Dr\.)\s+(?:(?:Fr\.|Frau|Hr\.|Herr)\s+)?(?:Dr\.\s*)?([A-ZÄÖÜ][a-zäöüß]+)/i);
        if (docMatch && docMatch[1]) {
            const docName = docMatch[1].trim();
            return { query: docMatch[0].trim(), cleanKeyword: docName.toLowerCase(), isDoctor: true };
        }

        // 4. Institution / Klinik / Therapie
        const instMatch = fullText.match(/(?:Klinikum|Klinik|Krankenhaus|Pflegeheim|Seniorenresidenz|Therapiezentrum|Physiotherapie|Ergotherapie|Logopädie|Apotheke|Zentrum|MVZ)\s+([A-ZÄÖÜ][a-zäöüß\.\-]+)/i);
        if (instMatch && instMatch[1]) {
            return { query: instMatch[0].trim(), cleanKeyword: instMatch[1].toLowerCase(), isDoctor: false };
        }

        return null;
    }

    function getDetectedContact(req: any, client?: any): any {
        const allContacts: any[] = orgaStore.contacts?.data || [];
        if (!allContacts.length) return null;

        const effectiveClient = client || getDetectedClient(req);

        // 1. Klienten-Kontakte sammeln (höchste Priorität für Arztzuordnung des Klienten)
        const clientContacts: any[] = [];
        if (effectiveClient) {
            if (Array.isArray(effectiveClient.expand?.contacts) && effectiveClient.expand.contacts.length > 0) {
                clientContacts.push(...effectiveClient.expand.contacts);
            } else if (Array.isArray(effectiveClient.contacts) && effectiveClient.contacts.length > 0) {
                for (const cId of effectiveClient.contacts) {
                    const found = allContacts.find(c => c.id === cId);
                    if (found) clientContacts.push(found);
                }
            }
        }

        const target = extractDoctorOrTargetQuery(req);

        // 2. Gezielte Suche nach dem Ziel-Arzt / der Ziel-Praxis in Klienten-Kontakten
        if (target && target.cleanKeyword && target.cleanKeyword.length >= 3) {
            for (const ct of clientContacts) {
                if (isSenderOrCaregiverContact(ct, req, effectiveClient)) continue;
                const lName = (ct.name_last || '').toLowerCase().trim();
                const comp = (ct.company_name || '').toLowerCase().trim();
                if (lName && (lName === target.cleanKeyword || lName.includes(target.cleanKeyword) || target.cleanKeyword.includes(lName))) {
                    return ct;
                }
                if (comp && comp.includes(target.cleanKeyword)) {
                    return ct;
                }
            }

            // 3. Gezielte Suche in allen Kontakten (Absender/Betreuer ausgeschlossen!)
            for (const ct of allContacts) {
                if (isSenderOrCaregiverContact(ct, req, effectiveClient)) continue;
                const lName = (ct.name_last || '').toLowerCase().trim();
                const comp = (ct.company_name || '').toLowerCase().trim();
                if (lName && lName.length >= 3 && (lName === target.cleanKeyword || lName.includes(target.cleanKeyword) || target.cleanKeyword.includes(lName))) {
                    return ct;
                }
                if (comp && comp.length >= 4 && comp.includes(target.cleanKeyword)) {
                    return ct;
                }
            }
        }

        // 4. Volltext-Abgleich (unter striktem Ausschluss des Absenders/Betreuers!)
        const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const searchPool = `${aiTitle}\n${aiTask}\n${req.request_text || ''}`.toLowerCase();

        for (const ct of clientContacts) {
            if (isSenderOrCaregiverContact(ct, req, effectiveClient)) continue;
            const lName = (ct.name_last || '').toLowerCase().trim();
            const comp = (ct.company_name || '').toLowerCase().trim();
            if (lName && lName.length >= 3 && searchPool.includes(lName)) return ct;
            if (comp && comp.length >= 4 && searchPool.includes(comp)) return ct;
        }

        for (const ct of allContacts) {
            if (isSenderOrCaregiverContact(ct, req, effectiveClient)) continue;
            const lName = (ct.name_last || '').toLowerCase().trim();
            const comp = (ct.company_name || '').toLowerCase().trim();
            if (lName && lName.length >= 3 && searchPool.includes(lName)) return ct;
            if (comp && comp.length >= 4 && searchPool.includes(comp)) return ct;
        }

        return null;
    }

    function getDetectedLocation(req: any, client?: any, contact?: any): string {
        const ct = contact || getDetectedContact(req, client);
        if (ct && ct.street) {
            const addr = `${ct.street} ${ct.housenr || ''}`.trim();
            const city = `${ct.zip || ''} ${ct.city || ''}`.trim();
            return [addr, city].filter(Boolean).join(', ');
        }

        let aiLocation = '';
        if (req.ai_summary) {
            const locMatch = req.ai_summary.match(/📍\s*Ort:\s*([^\n\r]+)/i);
            if (locMatch && locMatch[1]) aiLocation = locMatch[1].trim();
        }
        // "Intern / Telefonisch" ist kein physischer Ort, sondern ein Durchführungsmodus
        if (aiLocation && /telefonisch|intern|online|zoom|videocall/i.test(aiLocation)) {
            return '';
        }
        if (aiLocation) return aiLocation;
        if (req.street && req.zip_city) return `${req.street}, ${req.zip_city}`.trim();
        return '';
    }

    function getDetectedExecutionMode(req: any) {
        if (req.ai_summary) {
            const locMatch = req.ai_summary.match(/📍\s*Ort:\s*([^\n\r]+)/i);
            if (locMatch && locMatch[1] && /telefonisch|intern|online|zoom|videocall/i.test(locMatch[1])) {
                return locMatch[1].trim();
            }
        }
        return '';
    }

    function findExistingAppointmentForRequest(req: any, clientId?: string, appointmentUtc?: string): any | null {
        const apps = orgaStore.appointments?.data || [];
        if (!apps.length || !req) return null;

        // 1. Priorität: Exakte Anfrage-ID in den Notizen
        if (req.id) {
            const byTag = apps.find((a: any) => a.notes && a.notes.includes(`[ANFRAGE_ID: ${req.id}]`));
            if (byTag) return byTag;
            const byRawId = apps.find((a: any) => a.notes && a.notes.includes(req.id));
            if (byRawId) return byRawId;
        }

        // 2. Priorität: Selber Klient und exakter Startzeitpunkt
        if (clientId && appointmentUtc) {
            const reqTime = new Date(appointmentUtc).getTime();
            const byExactTime = apps.find((a: any) => {
                const hasClient = a.client && (Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId);
                if (!hasClient || !a.appointment) return false;
                return new Date(a.appointment).getTime() === reqTime;
            });
            if (byExactTime) return byExactTime;
        }

        // 3. Priorität: Selber Klient am selben Tag (sofern Anfragedatum vorhanden)
        if (clientId && req.date) {
            const reqDateStr = new Date(req.date).toISOString().split('T')[0];
            const byDate = apps.find((a: any) => {
                const hasClient = a.client && (Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId);
                if (!hasClient || !a.appointment) return false;
                const appDateStr = new Date(a.appointment).toISOString().split('T')[0];
                return appDateStr === reqDateStr;
            });
            if (byDate) return byDate;
        }

        return null;
    }

    function getLinkedAppointments(req: any): any[] {
        const client = getDetectedClient(req);
        const apps = orgaStore.appointments?.data || [];
        if (!apps.length || !req) return [];
        return apps.filter((a: any) => {
            // 1. Direkte Referenz über Anfrage-ID im Notizfeld
            if (req.id && a.notes && (a.notes.includes(`[ANFRAGE_ID: ${req.id}]`) || a.notes.includes(req.id))) {
                return true;
            }
            // 2. Klient + Datum
            if (!client) return false;
            const hasClient = a.client && (Array.isArray(a.client) ? a.client.includes(client.id) : a.client === client.id);
            if (!hasClient) return false;
            if (req.date) {
                const reqD = new Date(req.date).toISOString().split('T')[0];
                const appD = a.appointment ? new Date(a.appointment).toISOString().split('T')[0] : '';
                return reqD === appD;
            }
            return false;
        });
    }

    async function assignClientToRequest(req: any, client: any) {
        req.client_id = client.id;
        activeClientPickerReqId = null;
        try {
            await pb.collection('appointment_requests').update(req.id, { client_id: client.id }, { requestKey: null });
            toastStore.success(`Klient "${client.name_first} ${client.name_last}" erfolgreich zugeordnet.`);
        } catch (e) {
            console.error(e);
            toastStore.error("Fehler beim Zuordnen des Klienten.");
        }
    }

    function detectMissingContactQuery(req: any, client?: any): string | null {
        // Falls bereits ein Kontakt zugeordnet ist, keine Suche nötig
        if (getDetectedContact(req, client)) return null;

        const target = extractDoctorOrTargetQuery(req);
        if (target?.query) {
            return target.query;
        }

        return null;
    }

    function detectMissingLocationQuery(req: any, contact?: any): string | null {
        if (contact) return null;
        const loc = getDetectedLocation(req);
        if (!loc) return null;
        if (/telefonisch|intern|online|zoom|videocall|beim klienten|zuhause/i.test(loc)) return null;

        // Prüfen, ob bereits ein Kontakt zu dieser Adresse oder Praxis existiert
        const existing = orgaStore.contacts?.data?.find((ct: any) => {
            const fullAddr = `${ct.street || ''} ${ct.housenr || ''}`.trim();
            const comp = ct.company_name || '';
            return (fullAddr && fullAddr.length >= 5 && loc.toLowerCase().includes(fullAddr.toLowerCase())) ||
                   (comp && comp.length >= 4 && loc.toLowerCase().includes(comp.toLowerCase()));
        });
        if (existing) return null;

        return loc;
    }

    async function handleGoogleContactSearch(req: any, type: 'doctor' | 'location') {
        const client = getDetectedClient(req);
        const locationContext = client?.city ? `${client.zip || ''} ${client.city}`.trim() : (req.zip_city || 'Halle (Saale)');
        let query = '';
        if (type === 'doctor') {
            query = detectMissingContactQuery(req) || 'Arzt';
        } else {
            query = detectMissingLocationQuery(req) || req.street || '';
        }

        const createdContact = await googleContactModal?.open({
            query,
            location: locationContext,
            type,
            context: `${req.ai_summary || ''}\n${req.request_text || ''}`
        });

        if (createdContact) {
            // Falls Klient vorhanden, Kontakt direkt mit Klient verknüpfen
            if (client?.id) {
                try {
                    let currentContacts = Array.isArray(client.contacts) ? [...client.contacts] : (client.contacts ? [client.contacts] : []);
                    if (!currentContacts.includes(createdContact.id)) {
                        currentContacts.push(createdContact.id);
                        await pb.collection('clients').update(client.id, { contacts: currentContacts }, { requestKey: null });
                        client.contacts = currentContacts;
                    }
                } catch (cErr) {
                    console.warn("Konnte Kontakt nicht mit Klient verknüpfen:", cErr);
                }
            }

            // Anfrage sofort als erledigt/angenommen markieren, damit die Benachrichtigungszahl verschwindet!
            if (req?.id && req.status !== 'accepted') {
                await reqService.updateStatus(req.id, 'accepted');
            }
        }
        return createdContact;
    }

    async function createContactFromRequest(req: any) {
        if (!req) return;
        const rawName = (req.sender_name || '').trim();
        let fName = '';
        let lName = rawName;
        if (rawName.includes(' ')) {
            const parts = rawName.split(' ');
            fName = parts.slice(0, -1).join(' ');
            lName = parts[parts.length - 1];
        }

        let salutation: "Herr" | "Frau" | "Divers" | "Keine Angabe" = "Keine Angabe";
        if (/^Frau\b/i.test(rawName)) salutation = "Frau";
        else if (/^Herr\b/i.test(rawName)) salutation = "Herr";

        fName = fName.replace(/^(Herr|Frau)\s+/i, '').trim();

        let streetName = (req.street || '').trim();
        let houseNr = '';
        const houseNrMatch = streetName.match(/^(.*?)\s+(\d+[\s\w\-\/]*)$/);
        if (houseNrMatch) {
            streetName = houseNrMatch[1].trim();
            houseNr = houseNrMatch[2].trim();
        }

        let zip = '';
        let city = (req.zip_city || '').trim();
        const zipMatch = city.match(/^(\d{5})\s+(.*)$/);
        if (zipMatch) {
            zip = zipMatch[1];
            city = zipMatch[2].trim();
        }

        const payload: any = {
            salutation,
            company_name: '',
            name_first: fName,
            name_last: lName || rawName || 'Unbekannt',
            street: streetName,
            housenr: houseNr,
            zip,
            city,
            phone: req.phone || '',
            email: req.email || '',
            notes: `Aus Kundenanfrage übernommen:\n${req.request_text || req.ai_summary || ''}`
        };

        try {
            const created = await pb.collection('contacts').create(payload, { requestKey: null });
            if (orgaStore.contacts?.data) {
                orgaStore.contacts.data = [created as any, ...orgaStore.contacts.data];
            }

            const client = getDetectedClient(req);
            if (client?.id) {
                try {
                    let currentContacts = Array.isArray(client.contacts) ? [...client.contacts] : (client.contacts ? [client.contacts] : []);
                    if (!currentContacts.includes(created.id)) {
                        currentContacts.push(created.id);
                        await pb.collection('clients').update(client.id, { contacts: currentContacts }, { requestKey: null });
                        client.contacts = currentContacts;
                    }
                } catch (cErr) {
                    console.warn("Konnte Kontakt nicht mit Klient verknüpfen:", cErr);
                }
            }

            // Anfrage auf 'accepted' setzen, damit die Benachrichtigungszahl sofort verschwindet!
            if (req.id) {
                await reqService.updateStatus(req.id, 'accepted');
            }

            const displayName = [created.name_first, created.name_last].filter(Boolean).join(' ') || created.company_name;
            toastStore.success(`Kontakt "${displayName}" erfolgreich erstellt & Anfrage erledigt!`);
        } catch (err: any) {
            console.error("Fehler beim Anlegen des Kontakts:", err);
            toastStore.error("Kontakt konnte nicht erstellt werden: " + (err.message || ''));
        }
    }

    async function transferRequestToAppointment(req: any, options: { openModal?: boolean, forceNew?: boolean } = { openModal: false, forceNew: false }) {
        if (!req?.id) return;

        // 0. Doppel-Klick- & Concurrency-Schutz
        if (transferringReqIds[req.id]) {
            console.warn(`[transferRequestToAppointment] Anfrage ${req.id} wird bereits verarbeitet.`);
            return;
        }
        transferringReqIds[req.id] = true;

        try {
            // 1. Klient ermitteln oder neu anlegen und direkt verknüpfen
            const { client: linkedClient, isNew: isNewClient } = await findOrCreateClientForRequest(req);

            // 2. Datum & Zeit auflösen
            const { appointmentUtc, endUtc } = resolveAppointmentTiming(req);

            // 3. DUPLIKAT-PRÜFUNG: Gibt es bereits einen passenden Termin für diese Anfrage?
            if (!options.forceNew) {
                const existingApp = findExistingAppointmentForRequest(req, linkedClient?.id, appointmentUtc);
                if (existingApp) {
                    // Anfrage idempotent auf 'accepted' setzen und Klient verknüpfen
                    if (req.status !== 'accepted') {
                        await reqService.updateStatus(req.id, 'accepted');
                    }
                    if (req.client_id !== linkedClient.id) {
                        await pb.collection('appointment_requests').update(req.id, { client_id: linkedClient.id }, { requestKey: null }).catch(() => {});
                        req.client_id = linkedClient.id;
                    }

                    const formattedDate = new Date(existingApp.appointment || appointmentUtc).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const formattedTime = new Date(existingApp.appointment || appointmentUtc).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                    if (options.openModal) {
                        appointmentModal?.open(existingApp);
                        toastStore.info(`Bestehender Termin (${formattedDate} um ${formattedTime} Uhr) geöffnet. Kein Duplikat erstellt.`);
                    } else {
                        toastStore.warning(`Termin existiert bereits im Kalender (${formattedDate} um ${formattedTime} Uhr). Es wurde kein Duplikat erstellt.`);
                    }
                    return existingApp;
                }
            }

            if (!options.openModal) {
                toastStore.info("Erstelle Termin mit 1-Click...");
            } else {
                toastStore.info("Übernehme Anfrage in Kalender...");
            }

            // 4. Ort und ggf. Arzt/Partner aus Kontakten auflösen
            let { useClientAddress, locationAddress, contactId, executionMode } = resolveLocationAndContact(req, linkedClient);

            // Falls noch kein Kontakt ermittelt werden konnte, aber ein Arzt / Partner in der Anfrage genannt wurde:
            // Google Kontaktabfrage mit Bestätigung anbieten!
            if (!contactId && !useClientAddress) {
                const missingContact = detectMissingContactQuery(req, linkedClient);
                if (missingContact) {
                    const promptResult = await handleGoogleContactSearch(req, 'doctor');
                    if (promptResult?.id) {
                        contactId = promptResult.id;
                        if (promptResult.street && promptResult.city) {
                            const namePart = [promptResult.company_name, `${promptResult.name_first || ''} ${promptResult.name_last || ''}`.trim()].filter(Boolean).join(' - ');
                            const addrPart = `${promptResult.street || ''} ${promptResult.housenr || ''}`.trim();
                            const cityPart = `${promptResult.zip || ''} ${promptResult.city || ''}`.trim();
                            locationAddress = [namePart, addrPart, cityPart].filter(Boolean).join(', ');
                        }
                    }
                }
            }

            // 5. TimeRecord anlegen
            let trId: string | null = null;
            try {
                const tr = await pb.collection('time_records').create({
                    start: appointmentUtc,
                    end: endUtc
                }, { requestKey: null });
                trId = tr.id;
            } catch (trErr) {
                console.warn("Time-Record konnte nicht angelegt werden:", trErr);
            }

            // 6. Titel & Interne Notizen
            const { title, notes } = resolveTitleAndNotes(req, linkedClient, executionMode);

            // 7. Anhänge in Klienten-Akte ablegen
            if (req.attachments && req.attachments.length > 0 && linkedClient?.id) {
                for (const attachment of req.attachments) {
                    try {
                        await copyToClient(req, attachment, linkedClient.id, true);
                    } catch (copyErr) {
                        console.warn("Anhang konnte nicht kopiert werden:", copyErr);
                    }
                }
            }

            // 8. Termin-Datensatz erstellen
            const appointmentData: any = {
                appointment: appointmentUtc,
                description: title,
                notes: notes,
                location_address: locationAddress,
                client: [linkedClient.id],
                user: linkedClient.assigned_employee || currentUser?.id || '',
                is_private: false,
                is_visible: true,
                settled: false,
                is_series: false
            };
            if (contactId) {
                appointmentData.appointment_at = [contactId];
            }
            if (trId) {
                appointmentData.time_record = [trId];
            }

            const createdApp = await pb.collection('appointments').create(appointmentData, {
                expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at',
                requestKey: null
            });

            // Anfrage direkt mit dem Klienten verknüpfen & Status auf 'accepted' setzen (falls noch 'requested')
            const updatePayload: any = { client_id: linkedClient.id };
            if (req.status !== 'accepted') {
                updatePayload.status = 'accepted';
                await reqService.updateStatus(req.id, 'accepted');
            } else {
                await pb.collection('appointment_requests').update(req.id, updatePayload, { requestKey: null }).catch(() => {});
            }
            req.client_id = linkedClient.id;

            // OrgaStore idempotent aktualisieren
            if (orgaStore.appointments) {
                const existingIdx = orgaStore.appointments.data.findIndex((a: any) => a.id === createdApp.id);
                if (existingIdx !== -1) {
                    orgaStore.appointments.data[existingIdx] = createdApp as any;
                } else {
                    orgaStore.appointments.data = [createdApp as any, ...(orgaStore.appointments.data || [])];
                }
            }

            // Modal öffnen oder 1-Click Erfolgsmeldung anzeigen
            if (options.openModal) {
                createdApp.use_client_address = useClientAddress;
                appointmentModal?.open(createdApp);
                if (isNewClient) {
                    toastStore.success(`Klient "${linkedClient.name_first} ${linkedClient.name_last}" neu angelegt & Termin geöffnet!`);
                } else {
                    toastStore.success(`Termin für "${linkedClient.name_first} ${linkedClient.name_last}" geöffnet!`);
                }
            } else {
                // 1-Click Modus: Direkte Erfolgsmeldung
                const formattedDate = new Date(appointmentUtc).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formattedTime = new Date(appointmentUtc).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                toastStore.success(`⚡ 1-Click: Termin für "${linkedClient.name_first} ${linkedClient.name_last}" am ${formattedDate} um ${formattedTime} Uhr erstellt!`);

                // Angebot E-Mail Bestätigung
                const emailMatch = req.request_text ? req.request_text.match(/E-Mail:\s*([^\n]+)/) : null;
                const clientEmail = (req.email && req.email.includes('@')) ? req.email : (emailMatch ? emailMatch[1].trim() : null);
                if (clientEmail && clientEmail !== '-' && clientEmail.includes('@')) {
                    replyModal?.open(req, 'accepted', clientEmail);
                }
            }

            return createdApp;
        } catch (e: any) {
            console.error("Fehler beim Übernehmen des Termins:", e);
            toastStore.error("Termin konnte nicht erstellt werden: " + (e.message || ''));
        } finally {
            transferringReqIds[req.id] = false;
        }
    }

    let syncingAppIds = $state<Record<string, boolean>>({});

    async function syncAppointmentFromRequest(req: any, targetApp: any) {
        if (!req || !targetApp?.id) return;
        if (syncingAppIds[targetApp.id]) return;

        syncingAppIds[targetApp.id] = true;
        try {
            toastStore.info("Aktualisiere Termindaten mit Anfrage...");

            // 1. Klient ermitteln oder neu verknüpfen
            const { client: linkedClient } = await findOrCreateClientForRequest(req);

            // 2. Datum & Uhrzeiten auflösen
            const { appointmentUtc, endUtc } = resolveAppointmentTiming(req);

            // 3. Ort & Kontakt auflösen
            const { useClientAddress, locationAddress, contactId, executionMode } = resolveLocationAndContact(req, linkedClient);

            // 4. Titel & Notizen
            const { title, notes } = resolveTitleAndNotes(req, linkedClient, executionMode);

            // 5. TimeRecord abgleichen
            let trId = Array.isArray(targetApp.time_record) ? targetApp.time_record[0] : targetApp.time_record;
            if (trId) {
                try {
                    await pb.collection('time_records').update(trId, {
                        start: appointmentUtc,
                        end: endUtc
                    }, { requestKey: null });
                } catch (trErr) {
                    console.warn("Konnte verknüpften TimeRecord nicht aktualisieren:", trErr);
                }
            } else {
                try {
                    const newTr = await pb.collection('time_records').create({
                        start: appointmentUtc,
                        end: endUtc
                    }, { requestKey: null });
                    trId = newTr.id;
                } catch (newTrErr) {
                    console.warn("Konnte neuen TimeRecord nicht erstellen:", newTrErr);
                }
            }

            // 6. Termin aktualisieren
            const updatePayload: any = {
                appointment: appointmentUtc,
                description: title,
                notes: notes,
                location_address: locationAddress
            };
            if (linkedClient?.id) {
                updatePayload.client = [linkedClient.id];
            }
            if (contactId) {
                updatePayload.appointment_at = [contactId];
            }
            if (trId) {
                updatePayload.time_record = [trId];
            }

            const updatedApp = await pb.collection('appointments').update(targetApp.id, updatePayload, {
                expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at',
                requestKey: null
            });

            // 7. Anfrage synchronisieren & ggf. auf 'accepted' setzen
            if (req.status !== 'accepted') {
                await reqService.updateStatus(req.id, 'accepted');
            }
            if (linkedClient?.id && req.client_id !== linkedClient.id) {
                await pb.collection('appointment_requests').update(req.id, { client_id: linkedClient.id }, { requestKey: null }).catch(() => {});
                req.client_id = linkedClient.id;
            }

            // 8. OrgaStore aktualisieren
            if (orgaStore.appointments) {
                const idx = orgaStore.appointments.data.findIndex((a: any) => a.id === targetApp.id);
                if (idx !== -1) {
                    orgaStore.appointments.data[idx] = updatedApp as any;
                }
            }

            const formattedDate = new Date(appointmentUtc).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = new Date(appointmentUtc).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            toastStore.success(`⚡ Daten im Termin aktualisiert: ${formattedDate} um ${formattedTime} Uhr!`);
        } catch (err: any) {
            console.error("Fehler beim Synchronisieren des Termins:", err);
            toastStore.error("Fehler beim Aktualisieren: " + (err.message || ''));
        } finally {
            syncingAppIds[targetApp.id] = false;
        }
    }

    async function handleStatus(id: string, status: 'accepted' | 'denied' | 'requested') {
        const req = reqService.requests.find((r) => r.id === id);
        try {
            if (status === 'accepted' && req) {
                await transferRequestToAppointment(req, { openModal: true });
                return;
            }

            await reqService.updateStatus(id, status);

            // Direktbenachrichtigung via E-Mail anbieten
            if (req && status !== 'requested') {
                const emailMatch = req.request_text ? req.request_text.match(/E-Mail:\s*([^\n]+)/) : null;
                const clientEmail = (req.email && req.email.includes('@')) ? req.email : (emailMatch ? emailMatch[1].trim() : null);
                
                if (clientEmail && clientEmail !== '-' && clientEmail.includes('@')) {
                    replyModal?.open(req, status, clientEmail);
                } else {
                    toastStore.success(`Anfrage wurde auf '${status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}' gesetzt.`);
                }
            }
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Aktualisieren oder beim Senden der E-Mail.");
        }
    }

    async function handleDelete(id: string) {
        if (confirm("Möchten Sie diese Anfrage wirklich unwiderruflich löschen?")) {
            try {
                await reqService.deleteReq(id);
                toastStore.info("Anfrage wurde gelöscht.");
            } catch (err) {
                toastStore.error("Fehler beim Löschen der Anfrage.");
            }
        }
    }

    async function updateFeedbackStatus(id: string, status: string) {
        try {
            await pb.collection('feedbacks').update(id, { status });
            toastStore.success(`Feedback auf '${status}' gesetzt.`);
        } catch (e) {
            toastStore.error("Fehler beim Aktualisieren.");
        }
    }

    async function deleteFeedback(id: string) {
        if (await confirmStore.ask("Möchten Sie dieses Feedback wirklich löschen?", "Feedback löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('feedbacks').delete(id);
                toastStore.info("Feedback wurde gelöscht.");
            } catch (e) {
                toastStore.error("Fehler beim Löschen des Feedbacks.");
            }
        }
    }

    async function markChangeAsDone(id: string) {
        try {
            await pb.collection('appointments').update(id, { requestet_changes: null });
            toastStore.success("Änderungswunsch als erledigt markiert.");
        } catch (e) {
            toastStore.error("Fehler beim Aktualisieren des Termins.");
        }
    }

    function getRatingBadgeClass(val: number) {
        if (val <= 3) return "bg-rose-100 text-rose-700 border-rose-200";
        if (val <= 6) return "bg-amber-100 text-amber-700 border-amber-200";
        if (val <= 8) return "bg-emerald-100 text-emerald-700 border-emerald-200";
        return "bg-teal-100 text-teal-700 border-teal-200";
    }
</script>

<div class="orga-card-white flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="px-4 sm:px-6 pt-4 sm:pt-5 border-b border-neutral-100 flex items-center gap-4 sm:gap-6 bg-neutral-50/50 overflow-x-auto custom-scrollbar">
        <button onclick={() => activeTab = 'requests'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'requests' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>📬</span> Anfragen
                {#if pendingCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] shadow-sm animate-pulse">{pendingCount}</span>
                {/if}
            </span>
            {#if activeTab === 'requests'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-t-full"></div>
            {/if}
        </button>

        <button onclick={() => activeTab = 'changes'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'changes' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>🔄</span> Änderungen
                {#if pendingChangesCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] shadow-sm animate-pulse">{pendingChangesCount}</span>
                {/if}
            </span>
            {#if activeTab === 'changes'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full"></div>
            {/if}
        </button>

        <button onclick={() => activeTab = 'feedbacks'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'feedbacks' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>⭐</span> Feedback
                {#if newFeedbacksCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] shadow-sm animate-pulse">{newFeedbacksCount}</span>
                {/if}
            </span>
            {#if activeTab === 'feedbacks'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full"></div>
            {/if}
        </button>

        <button onclick={() => activeTab = 'admissions'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'admissions' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>👤</span> Aufnahmen
                {#if pendingAdmissionsCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] shadow-sm animate-pulse">{pendingAdmissionsCount}</span>
                {/if}
            </span>
            {#if activeTab === 'admissions'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full"></div>
            {/if}
        </button>
    </div>

    {#if activeTab === 'requests'}
        <div class="flex flex-wrap items-center justify-between gap-2 bg-white p-1.5 rounded-xl border border-neutral-200 shadow-sm m-1">
            <div class="flex gap-1">
                <button onclick={() => showAll = false} class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors {!showAll ? 'bg-neutral-100 text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-700'}">Offen ({pendingCount})</button>
                <button onclick={() => showAll = true} class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors {showAll ? 'bg-neutral-100 text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-700'}">Alle</button>
            </div>

            {#if requestsWithoutSummaryCount > 0}
                <button 
                    type="button" 
                    onclick={batchGenerateAllSummaries}
                    disabled={isBatchGenerating}
                    class="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    title="Fehlende KI-Kalendertexte für frühere Anfragen automatisch nachgenerieren"
                >
                    <span class="{isBatchGenerating ? 'animate-spin' : ''}">✨</span>
                    <span>{isBatchGenerating ? 'Generiere frühere Anfragen...' : `Alle ${requestsWithoutSummaryCount} früheren Anfragen nachgenerieren`}</span>
                </button>
            {/if}
        </div>
    {:else if activeTab === 'changes'}
        <div class="flex bg-white p-1 rounded-lg border border-neutral-200 shadow-sm m-1">
            <button class="px-3 py-1 text-xs font-bold rounded-md transition-colors bg-neutral-100 text-neutral-900">Offen ({pendingChangesCount})</button>
        </div>
    {:else if activeTab === 'feedbacks'}
        <div class="flex bg-white p-1 rounded-lg border border-neutral-200 shadow-sm m-1">
            <button onclick={() => showAllFeedbacks = false} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {!showAllFeedbacks ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Aktuell</button>
            <button onclick={() => showAllFeedbacks = true} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {showAllFeedbacks ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Alle (inkl. Archiv)</button>
        </div>
    {/if}

    <!-- Content -->
    <div class="p-6 bg-white min-h-50 max-h-125 overflow-y-auto custom-scrollbar">
        {#if activeTab === 'requests'}
            {#if reqService.isLoading}
                <p class="text-neutral-500 text-sm text-center py-10">Lade Anfragen...</p>
            {:else if visibleRequests.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Alles erledigt!</p>
                    <p class="text-neutral-400 text-sm">Es liegen aktuell keine neuen Terminanfragen vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each visibleRequests as req (req.id)}
                        {@const detectedClient = getDetectedClient(req)}
                        {@const detectedContact = getDetectedContact(req, detectedClient)}
                        {@const detectedLoc = getDetectedLocation(req, detectedClient, detectedContact)}
                        {@const detectedMode = getDetectedExecutionMode(req)}
                        {@const linkedApps = getLinkedAppointments(req)}
                        {@const missingContact = detectMissingContactQuery(req, detectedClient)}
                        {@const missingLoc = detectMissingLocationQuery(req, detectedContact)}
                    <div class="border rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md {isRequestOpen(req) ? 'border-brand-200 bg-brand-50/30' : 'border-neutral-200 bg-white'}">
                        
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="font-bold text-neutral-900 text-lg">{req.sender_name}</h3>
                                <p class="text-xs font-semibold text-brand-600 bg-brand-100 inline-block px-2 py-0.5 rounded mt-1 border border-brand-200">{formatContact(req.contact_method)}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-neutral-500 font-medium">{new Date(req.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(req.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                                {#if req.status === 'accepted'}<span class="text-xs font-bold text-emerald-600 mt-1 block">✅ Angenommen</span>{/if}
                                {#if req.status === 'denied'}<span class="text-xs font-bold text-rose-600 mt-1 block">❌ Abgelehnt</span>{/if}
                                {#if isRequestOpen(req)}<span class="text-xs font-bold text-brand-600 mt-1 block">⏳ Offen</span>{/if}
                            </div>
                        </div>

                        <!-- Umschalter: KI-Kalenderfokus vs Originaltext & Nachgenerieren -->
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <div class="inline-flex p-0.5 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-bold shadow-xs">
                                <button 
                                    type="button" 
                                    onclick={() => setViewMode(req.id, 'ai')}
                                    class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer {getViewMode(req.id) === 'ai' ? 'bg-white shadow-xs text-brand-700 font-extrabold' : 'text-neutral-500 hover:text-neutral-800'}"
                                >
                                    <span>✨ Kalender-Fokus</span>
                                    <span class="text-[9px] px-1 py-0.2 rounded bg-brand-50 text-brand-600 border border-brand-200 uppercase font-mono font-bold">Standard</span>
                                </button>
                                <button 
                                    type="button" 
                                    onclick={() => setViewMode(req.id, 'original')}
                                    class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer {getViewMode(req.id) === 'original' ? 'bg-white shadow-xs text-neutral-900 font-extrabold' : 'text-neutral-500 hover:text-neutral-800'}"
                                >
                                    <span>📄 Original</span>
                                </button>
                            </div>

                            <button 
                                type="button" 
                                onclick={() => { setViewMode(req.id, 'ai'); loadAiSummaryForRequest(req, true); }}
                                disabled={summarizingReqIds[req.id]}
                                class="text-xs text-neutral-600 hover:text-brand-700 font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 bg-neutral-100/80 hover:bg-brand-50 px-2.5 py-1 rounded-lg border border-neutral-200 shadow-2xs"
                                title={req.ai_summary ? "KI-Kalenderfassung neu generieren" : "KI-Kalenderfassung jetzt nachgenerieren"}
                            >
                                <span class="{summarizingReqIds[req.id] ? 'animate-spin' : ''}">✨</span>
                                <span>{req.ai_summary ? 'Neu generieren' : 'Nachgenerieren'}</span>
                            </button>
                        </div>

                        <!-- Textfeld: Zusammenfassung oder Original -->
                        {#if getViewMode(req.id) === 'ai'}
                            {#if summarizingReqIds[req.id]}
                                <div class="bg-gradient-to-r from-brand-50/50 via-indigo-50/40 to-brand-50/50 border border-brand-200/60 p-4 rounded-xl text-xs text-brand-700 font-medium mb-4 flex items-center gap-2.5 animate-pulse shadow-xs">
                                    <span class="text-base animate-spin">✨</span>
                                    <span>Gemini formuliert den Text für Ihren Kalender auf das Wesentliche um...</span>
                                </div>
                            {:else if req.ai_summary}
                                <div class="bg-gradient-to-br from-brand-50/40 via-white to-indigo-50/30 p-3.5 rounded-xl border border-brand-200/80 text-sm text-neutral-800 mb-4 flex-1 whitespace-pre-wrap shadow-xs leading-relaxed font-sans">
                                    {req.ai_summary}
                                </div>
                            {:else}
                                <div class="bg-neutral-50/90 border border-dashed border-neutral-300 rounded-xl p-4 mb-4 text-center">
                                    <p class="text-xs font-semibold text-neutral-600 mb-2">Für diese frühere Anfrage liegt noch keine KI-Kalenderfassung vor.</p>
                                    <button 
                                        type="button" 
                                        onclick={() => loadAiSummaryForRequest(req, true)}
                                        disabled={summarizingReqIds[req.id]}
                                        class="orga-button-primary py-1.5 px-4 text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer mx-auto"
                                    >
                                        <span>✨</span>
                                        <span>Jetzt mit Gemini nachgenerieren</span>
                                    </button>
                                </div>
                            {/if}
                        {:else}
                            <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner">
                                "{req.request_text}"
                            </div>
                        {/if}

                        {#if req.attachments && req.attachments.length > 0}
                            <div class="mb-4 flex flex-wrap gap-2">
                                {#each req.attachments as attachment}
                                    <div class="relative flex items-center group">
                                        <button type="button" onclick={() => previewAttachment(req, attachment)} class="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-l-lg text-xs font-bold text-neutral-600 hover:text-brand-600 transition-colors shadow-sm" title="Anhang ansehen: {attachment}">
                                            <Paperclip class="w-3.5 h-3.5" />
                                            <span class="truncate max-w-40">{attachment}</span>
                                        </button>
                                        <button type="button" onclick={() => { attachDropdownOpen = (attachDropdownOpen?.reqId === req.id && attachDropdownOpen?.filename === attachment) ? null : { reqId: req.id, filename: attachment }; attachSearchQuery = ""; }} class="px-2 py-1.5 bg-neutral-50 hover:bg-brand-50 border-y border-r border-neutral-200 rounded-r-lg text-neutral-400 hover:text-brand-600 transition-colors shadow-sm border-l-0" title="In Klienten-Akte (Dokumente) speichern">
                                            <FolderDown class="w-3.5 h-3.5" />
                                        </button>
                                        
                                        {#if attachDropdownOpen?.reqId === req.id && attachDropdownOpen?.filename === attachment}
                                            <!-- svelte-ignore a11y_consider_explicit_label -->
                                            <button type="button" class="fixed inset-0 w-full h-full cursor-default z-30" onclick={() => attachDropdownOpen = null} tabindex="-1"></button>
                                            <div class="absolute top-full left-0 mt-1 w-64 bg-white border border-neutral-200 shadow-xl rounded-xl z-40 overflow-hidden flex flex-col">
                                                <div class="p-2 border-b border-neutral-100 bg-neutral-50/50">
                                                    <!-- svelte-ignore a11y_autofocus -->
                                                    <input type="text" bind:value={attachSearchQuery} placeholder="Klient suchen..." class="w-full text-xs px-2 py-1.5 rounded bg-white border border-neutral-200 focus:border-brand-300 focus:ring-1 focus:ring-brand-300 outline-none" autofocus />
                                                </div>
                                                <div class="max-h-40 overflow-y-auto custom-scrollbar p-1">
                                                    {#if filteredAttachClients.length === 0}
                                                        <p class="text-xs text-neutral-500 text-center py-2">Keine Klienten gefunden</p>
                                                    {:else}
                                                        {#each filteredAttachClients as c}
                                                            <button type="button" onclick={() => copyToClient(req, attachment, c.id)} class="w-full text-left px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-brand-50 hover:text-brand-700 rounded transition-colors truncate">
                                                                {c.name_first} {c.name_last}
                                                            </button>
                                                        {/each}
                                                    {/if}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        <!-- Smart-Vorschau der erkannten Daten & Schnellzuweisung -->
                        <div class="mb-3 p-2.5 bg-gradient-to-r from-neutral-50 to-neutral-100/70 rounded-xl border border-neutral-200/80 text-xs shadow-2xs">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">Erkannt:</span>

                                    <!-- Klient Badge & Picker -->
                                    <div class="relative inline-block">
                                        {#if detectedClient}
                                            <span class="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-2xs">
                                                <span>👤</span>
                                                <span class="font-bold">{detectedClient.name_first} {detectedClient.name_last}</span>
                                                <button 
                                                    type="button" 
                                                    onclick={() => { activeClientPickerReqId = activeClientPickerReqId === req.id ? null : req.id; clientPickerSearch = ''; }} 
                                                    class="ml-1 text-emerald-600 hover:text-emerald-900 cursor-pointer p-0.5 rounded hover:bg-emerald-100" 
                                                    title="Anderen Klienten zuweisen"
                                                >✏️</button>
                                            </span>
                                        {:else}
                                            <button 
                                                type="button" 
                                                onclick={() => { activeClientPickerReqId = activeClientPickerReqId === req.id ? null : req.id; clientPickerSearch = ''; }} 
                                                class="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold cursor-pointer hover:bg-amber-100 transition-colors"
                                                title="Klient aus Datenbank wählen"
                                            >
                                                <span>👤</span>
                                                <span>Klient wählen...</span>
                                            </button>
                                        {/if}

                                        <!-- Schnellauswahl Popup -->
                                        {#if activeClientPickerReqId === req.id}
                                            <div class="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in zoom-in-95">
                                                <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-100">
                                                    <span class="font-bold text-neutral-700 text-xs">Klient zuweisen</span>
                                                    <button type="button" onclick={() => activeClientPickerReqId = null} class="text-neutral-400 hover:text-neutral-600 text-xs cursor-pointer">✕</button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    bind:value={clientPickerSearch} 
                                                    placeholder="Klient suchen..." 
                                                    class="w-full px-2 py-1 text-xs border border-neutral-200 rounded-lg mb-1.5 focus:outline-hidden focus:border-brand-500"
                                                />
                                                <div class="max-h-40 overflow-y-auto space-y-0.5">
                                                    {#each (orgaStore.clients?.data || []).filter((c: any) => {
                                                        if (!clientPickerSearch) return true;
                                                        const q = clientPickerSearch.toLowerCase();
                                                        return (c.name_first || '').toLowerCase().includes(q) || (c.name_last || '').toLowerCase().includes(q);
                                                    }).slice(0, 15) as clientOption}
                                                        <button 
                                                            type="button" 
                                                            onclick={() => assignClientToRequest(req, clientOption)} 
                                                            class="w-full text-left px-2 py-1 text-xs rounded hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span class="font-medium">{clientOption.name_first} {clientOption.name_last}</span>
                                                            {#if detectedClient?.id === clientOption.id}
                                                                <span class="text-emerald-600 text-[10px] font-bold">✓</span>
                                                            {/if}
                                                        </button>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Kontakt / Arzt Badge -->
                                    {#if detectedContact}
                                        <span class="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold shadow-2xs" title="Aus Kontakten erkannt">
                                            <span>🩺</span>
                                            <span>{detectedContact.name_first ? `${detectedContact.name_first} ` : ''}{detectedContact.name_last || detectedContact.company_name}</span>
                                        </span>
                                    {:else if missingContact}
                                        <button 
                                            type="button" 
                                            onclick={() => handleGoogleContactSearch(req, 'doctor')}
                                            class="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-2xs hover:bg-blue-100 transition-colors cursor-pointer"
                                            title="Diesen Arzt/Kontakt über Google ermitteln und in OrgaFlow anlegen"
                                        >
                                            <span>🌐</span>
                                            <span>Google: "{missingContact}"</span>
                                        </button>
                                    {/if}

                                    <!-- Durchführungsmodus Badge (z.B. Intern / Telefonisch) -->
                                    {#if detectedMode}
                                        <span class="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-semibold shadow-2xs" title="Wird als Information in den Internen Notizen vermerkt">
                                            <span>📞</span>
                                            <span>{detectedMode}</span>
                                        </span>
                                    {/if}

                                    <!-- Ort Badge -->
                                    {#if detectedLoc}
                                        <span class="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-neutral-200/70 text-neutral-700 border border-neutral-300 font-medium shadow-2xs truncate max-w-[200px]" title={detectedLoc}>
                                            <span>📍</span>
                                            <span class="truncate">{detectedLoc}</span>
                                        </span>
                                        {#if missingLoc && !detectedContact}
                                            <button 
                                                type="button" 
                                                onclick={() => handleGoogleContactSearch(req, 'location')}
                                                class="inline-flex items-center gap-1 px-1.5 py-0.8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                                                title="Aus dieser Adresse / diesem Ort einen Kontakt via Google ermitteln & anlegen"
                                            >
                                                <span>🌐</span>
                                                <span>Als Kontakt</span>
                                            </button>
                                        {/if}
                                    {/if}
                                </div>

                                <!-- Bereits verknüpfte Kalender-Termine -->
                                {#if linkedApps.length > 0}
                                    <div class="flex items-center gap-1.5">
                                        <button 
                                            type="button" 
                                            onclick={() => appointmentModal?.open(linkedApps[0])}
                                            class="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors cursor-pointer shadow-2xs"
                                            title="Bereits erstellten Termin im Kalender anzeigen"
                                        >
                                            <span>📅</span>
                                            <span>{linkedApps.length === 1 ? 'Termin im Kalender öffnen' : `${linkedApps.length} Termine im Kalender`}</span>
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100">
                            <div class="text-xs text-neutral-500 w-full sm:w-auto">
                                {#if req.date || req.time}
                                    <span class="font-bold">Wunsch:</span> 
                                    {req.date ? new Date(req.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum'} 
                                    {req.time ? `um ${new Date(req.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                                {:else}
                                    <span class="italic">Kein Terminwunsch</span>
                                {/if}
                            </div>
                            
                            <div class="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                                {#if req.status === 'requested'}
                                    <button onclick={() => handleStatus(req.id, 'denied')} class="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 text-center whitespace-nowrap cursor-pointer">Ablehnen</button>
                                    <button onclick={() => handlePropose(req.id)} class="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 text-center whitespace-nowrap cursor-pointer">Vorschlag</button>
                                    <button 
                                        type="button" 
                                        onclick={() => createContactFromRequest(req)} 
                                        class="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 text-center whitespace-nowrap shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                                        title="Diesen Absender als Kontakt in OrgaFlow anlegen & Anfrage als erledigt markieren"
                                    >
                                        <span>👤</span>
                                        <span>Als Kontakt anlegen</span>
                                    </button>
                                    
                                    {#if linkedApps.length > 0}
                                        <!-- Falls bereits ein Termin existiert: 1-Click Synchronisation & Termin öffnen -->
                                        <button 
                                            type="button"
                                            disabled={syncingAppIds[linkedApps[0].id]}
                                            onclick={() => syncAppointmentFromRequest(req, linkedApps[0])}
                                            class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:scale-95 rounded-lg transition-all border border-amber-300 text-center whitespace-nowrap shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            title="Daten des verknüpften Termins (Datum, Uhrzeit, Beschreibung, Notizen, Ort) automatisch mit dieser Anfrage überschreiben"
                                        >
                                            {#if syncingAppIds[linkedApps[0].id]}
                                                <span class="inline-block animate-spin">⏳</span>
                                                <span>Wird synchronisiert...</span>
                                            {:else}
                                                <span>🔄</span>
                                                <span>Daten im Termin aktualisieren</span>
                                            {/if}
                                        </button>

                                        <button 
                                            onclick={() => appointmentModal?.open(linkedApps[0])} 
                                            class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-lg transition-all border border-emerald-300 text-center whitespace-nowrap shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                                            title="Bestehenden Termin im Kalender öffnen & prüfen"
                                        >
                                            <span>📅</span>
                                            <span>Termin öffnen & anpassen</span>
                                        </button>
                                    {:else}
                                        <!-- ⚡ 1-Click Übernahme -->
                                        <button 
                                            disabled={transferringReqIds[req.id]}
                                            onclick={() => transferRequestToAppointment(req, { openModal: false })} 
                                            class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-600 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed" 
                                            title="1-Click: Termin sofort mit Klient, Ort und Zeiten in den Kalender eintragen"
                                        >
                                            {#if transferringReqIds[req.id]}
                                                <span class="inline-block animate-spin">⏳</span>
                                                <span>Wird erstellt...</span>
                                            {:else}
                                                <span>⚡</span>
                                                <span>1-Click Übernehmen</span>
                                            {/if}
                                        </button>

                                        <!-- 📅 Öffnen & Anpassen -->
                                        <button 
                                            disabled={transferringReqIds[req.id]}
                                            onclick={() => transferRequestToAppointment(req, { openModal: true })} 
                                            class="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 text-center whitespace-nowrap shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed" 
                                            title="Termin anlegen und im Bearbeitungsfenster prüfen"
                                        >
                                            {#if transferringReqIds[req.id]}
                                                <span class="inline-block animate-spin">⏳</span>
                                                <span>Wird geladen...</span>
                                            {:else}
                                                <span>📅</span>
                                                <span>Prüfen & Öffnen</span>
                                            {/if}
                                        </button>
                                    {/if}
                                {:else}
                                    <!-- Bereits angenommene oder abgelehnte Anfragen -->
                                    {#if req.status === 'accepted'}
                                        <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <span>✅</span> Angenommen
                                        </span>

                                        {#if linkedApps.length > 0}
                                            <button 
                                                type="button"
                                                disabled={syncingAppIds[linkedApps[0].id]}
                                                onclick={() => syncAppointmentFromRequest(req, linkedApps[0])}
                                                class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:scale-95 rounded-lg transition-all border border-amber-300 text-center whitespace-nowrap shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                title="Daten des verknüpften Termins (Datum, Uhrzeit, Beschreibung, Notizen, Ort) automatisch mit dieser Anfrage überschreiben"
                                            >
                                                {#if syncingAppIds[linkedApps[0].id]}
                                                    <span class="inline-block animate-spin">⏳</span>
                                                    <span>Wird synchronisiert...</span>
                                                {:else}
                                                    <span>🔄</span>
                                                    <span>Daten im Termin aktualisieren</span>
                                                {/if}
                                            </button>

                                            <button 
                                                onclick={() => appointmentModal?.open(linkedApps[0])} 
                                                class="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 text-center whitespace-nowrap shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1" 
                                                title="Zugehörigen Termin im Kalender anzeigen"
                                            >
                                                <span>📅</span>
                                                <span>Termin im Kalender</span>
                                            </button>
                                            
                                            <button 
                                                disabled={transferringReqIds[req.id]}
                                                onclick={async () => {
                                                    if (await confirmStore.ask("Für diese Anfrage existiert bereits ein Termin. Möchten Sie wirklich einen zusätzlichen weiteren Termin anlegen?", "Weiteren Termin anlegen?", "Termin anlegen", "Abbrechen", false)) {
                                                        transferRequestToAppointment(req, { openModal: true, forceNew: true });
                                                    }
                                                }}
                                                class="text-[11px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer px-1 py-1"
                                                title="Ausdrücklich einen zweiten separaten Termin zu dieser Anfrage erstellen"
                                            >
                                                + Weiterer Termin
                                            </button>
                                        {:else}
                                            <!-- Falls Status 'accepted', aber noch kein Termin existiert -->
                                            <button 
                                                disabled={transferringReqIds[req.id]}
                                                onclick={() => transferRequestToAppointment(req, { openModal: false })} 
                                                class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-600 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed" 
                                                title="Termin für diese angenommene Anfrage anlegen"
                                            >
                                                {#if transferringReqIds[req.id]}
                                                    <span class="inline-block animate-spin">⏳</span>
                                                    <span>Wird erstellt...</span>
                                                {:else}
                                                    <span>⚡</span>
                                                    <span>Termin anlegen</span>
                                                {/if}
                                            </button>
                                        {/if}
                                    {/if}

                                    <button onclick={() => handleStatus(req.id, 'requested')} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-700 transition-colors text-center whitespace-nowrap cursor-pointer">Zurücksetzen</button>
                                {/if}
                                <button onclick={() => handleDelete(req.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer" title="Löschen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
            {/if}
        {:else if activeTab === 'changes'}
            {#if changeRequests.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Alles aktuell!</p>
                    <p class="text-neutral-400 text-sm">Es liegen keine Änderungswünsche für Termine vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each changeRequests as req (req.id)}
                        <div class="border border-blue-200 bg-blue-50/30 rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <h3 class="font-bold text-neutral-900 text-lg">{req.expand?.client?.[0]?.name_first || ''} {req.expand?.client?.[0]?.name_last || 'Unbekannter Klient'}</h3>
                                    <p class="text-xs font-semibold text-blue-600 bg-blue-100 inline-block px-2 py-0.5 rounded mt-1 border border-blue-200">
                                        Termin: {req.appointment ? new Date(req.appointment).toLocaleDateString('de-DE') : '-'} um {req.appointment ? new Date(req.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'} Uhr
                                    </p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-neutral-500 font-medium">Angefragt am {new Date(req.requestet_changes.created).toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                            <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner">
                                "{req.requestet_changes.text}"
                            </div>
                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100 mt-auto">
                                <button onclick={() => markChangeAsDone(req.id)} class="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 shadow-sm active:scale-95">Als erledigt markieren</button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else if activeTab === 'feedbacks'}
            {#if isFeedbacksLoading}
                <p class="text-neutral-500 text-sm text-center py-10">Lade Feedbacks...</p>
            {:else if visibleFeedbacks.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Keine neuen Feedbacks!</p>
                    <p class="text-neutral-400 text-sm">Aktuell liegen in dieser Ansicht keine Bewertungen vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each visibleFeedbacks as f (f.id)}
                        <div class="border rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md {f.status === 'Neu' ? 'border-amber-200 bg-amber-50/30' : 'border-neutral-200 bg-white'}">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    {#if f.name_first || f.name_last}
                                        <h3 class="font-bold text-neutral-900 text-lg">{f.name_first} {f.name_last}</h3>
                                    {:else}
                                        <h3 class="font-bold text-neutral-500 text-lg italic">Anonymes Feedback</h3>
                                    {/if}
                                    <div class="flex items-center gap-1 mt-1">
                                        <span class="text-xs font-black {getRatingBadgeClass(f.rating)} px-2 py-0.5 rounded-md border">{f.rating} / 10</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-neutral-500 font-medium">{new Date(f.created).toLocaleDateString('de-DE')} {new Date(f.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <span class="text-xs font-bold mt-1 block {f.status === 'Neu' ? 'text-amber-600' : (f.status === 'Gelesen' ? 'text-emerald-600' : 'text-neutral-400')}">{f.status}</span>
                                </div>
                            </div>
                            
                            {#if f.message}
                                <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner">
                                    "{f.message}"
                                </div>
                            {/if}

                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100 mt-auto">
                                {#if f.status === 'Neu'}
                                    <button onclick={() => updateFeedbackStatus(f.id, 'Gelesen')} class="px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">Gelesen</button>
                                {/if}
                                {#if f.status !== 'Archieviert'}
                                    <button onclick={() => updateFeedbackStatus(f.id, 'Archieviert')} class="px-2 py-1.5 text-xs font-bold text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200">Archivieren</button>
                                {/if}
                                <button onclick={() => deleteFeedback(f.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors shrink-0" title="Löschen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else if activeTab === 'admissions'}
            {#if newClients.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Alles aktuell!</p>
                    <p class="text-neutral-400 text-sm">Es liegen keine Anfragen zur Neuaufnahme vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each newClients as client (client.id)}
                        <div class="border border-emerald-200 bg-emerald-50/30 rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md">
                            <div class="flex justify-between items-start mb-3">
                                <div class="min-w-0 pr-4">
                                    <h3 class="font-bold text-neutral-900 text-lg truncate">{client.name_first} {client.name_last}</h3>
                                    <div class="flex flex-wrap gap-2 mt-1">
                                        <span class="text-xs font-semibold text-emerald-700 bg-emerald-100 inline-block px-2 py-0.5 rounded border border-emerald-200">Neuaufnahme</span>
                                        {#if client.notes && client.notes.includes('[NEUE_KRANKENKASSE:')}
                                            {@const match = client.notes.match(/\[NEUE_KRANKENKASSE:\s*({.*?})\]/)}
                                            {#if match && match[1]}
                                                {@const newInsName = (() => { try { return JSON.parse(match[1]).name; } catch(e) { return 'Neu'; } })()}
                                                <span class="text-xs font-semibold text-teal-700 bg-teal-100 inline-block px-2 py-0.5 rounded border border-teal-200" title="Neue Krankenkasse wird bei Aufnahme automatisch angelegt">🏥 Kasse: {newInsName}</span>
                                            {/if}
                                        {/if}
                                        {#if client.expand?.caregiver}
                                            {@const caregiver = Array.isArray(client.expand.caregiver) ? client.expand.caregiver[0] : client.expand.caregiver}
                                            <span class="text-xs font-semibold text-neutral-600 bg-neutral-100 inline-block px-2 py-0.5 rounded border border-neutral-200 truncate max-w-50" title="Betreuer">👤 {caregiver.name_first} {caregiver.name_last}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-xs text-neutral-500 font-medium">Angefragt am {new Date(client.created).toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                            
                            <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner custom-scrollbar overflow-y-auto max-h-32">
                                {(client.notes || '').replace(/\[NEUE_KRANKENKASSE:\s*{.*?}\]/g, '').replace('⚠️ NEUAUFNAHME-ANFRAGE:', '').trim()}
                            </div>
                            
                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100 mt-auto">
                                <button onclick={() => clientDetailModal?.open(client.id)} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 rounded-lg transition-colors border border-neutral-200 shadow-sm">Details ansehen</button>
                                <button onclick={() => acceptClient(client.id)} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 shadow-sm">Aufnehmen (Aktivieren)</button>
                                <button onclick={() => deleteNewClient(client.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors shrink-0" title="Ablehnen / Löschen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
</div>

<RequestReplyModal bind:this={replyModal} />
<ClientDetailModal bind:this={clientDetailModal} />
<PdfPreviewModal bind:this={pdfPreviewModal} />
<AppointmentModal bind:this={appointmentModal} />
<GoogleContactSelectionModal bind:this={googleContactModal} />