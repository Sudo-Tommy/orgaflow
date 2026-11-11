import { pb } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import { notifyAppointmentRequestAsync } from "$lib/services/notificationClientService";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { hasDoctorOrAuthorityKeyword } from "./landingAppointmentTypes";

export function applyAppointmentCategory(
    catLabel: string, 
    state: any, 
    openDoctorAuthorityPicker: () => void
) {
    const prefix = `${catLabel}: `;
    if (["Arzt- & Therapiebegleitung", "Behördengang & Anträge", "Pflegekassen-Beratung"].includes(catLabel)) {
        state.isDoctorAppointmentManual = true;
        if (!state.selectedDoctorOrAuthority) {
            openDoctorAuthorityPicker();
        }
    } else if (state.isDoctorAppointmentManual && !state.selectedDoctorOrAuthority && !hasDoctorOrAuthorityKeyword(state.request_text.replace(/^[A-Za-z0-9äöüÄÖÜ &-]+:\s*/, ""))) {
        state.isDoctorAppointmentManual = null;
    }
    if (state.request_text.startsWith(prefix)) return;
    state.request_text = state.request_text.trim() ? `${prefix}${state.request_text.replace(/^[A-Za-z0-9äöüÄÖÜ &-]+:\s*/, "")}` : prefix;
}

export async function linkDoctorToClient(selectedPortalClient: string, docId: string) {
    if (!selectedPortalClient || !docId) return;
    try {
        const client = orgaStore.clients?.data?.find((c: any) => c.id === selectedPortalClient);
        if (client) {
            const currentContacts = Array.isArray(client.contacts) ? [...client.contacts] : (client.contacts ? [client.contacts] : []);
            if (!currentContacts.includes(docId)) {
                currentContacts.push(docId);
                await pb.collection('clients').update(client.id, { contacts: currentContacts }, { requestKey: null });
                client.contacts = currentContacts;
                if (orgaStore.clients) orgaStore.clients.optimisticUpdate(client.id, { contacts: currentContacts });
            }
        }
    } catch (cErr) {
        console.warn("Konnte Arztkontakt nicht mit Klient verknüpfen:", cErr);
    }
}

export async function submitLandingAppointment(state: any, closeCallback: () => void): Promise<boolean> {
    if (state.isLoading) return false;
    if (state.website) {
        state.successMsg = "Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt.";
        return true;
    }

    state.isLoading = true;
    state.errorMsg = "";
    state.successMsg = "";

    if (!state.selectedDate) {
        state.errorMsg = "Bitte wählen Sie ein Wunschdatum im Kalender aus.";
        state.isLoading = false;
        return false;
    }

    if (state.isDoctorAppointment && !state.time.trim()) {
        state.errorMsg = "Für Termine mit Bezug zu einem Arzt oder einer Behörde ist die Angabe einer genauen Uhrzeit zwingend erforderlich. Bitte tragen Sie die Uhrzeit ein.";
        toastStore.warning("Bitte geben Sie die Uhrzeit des Arzt- oder Behördentermins an.");
        state.isLoading = false;
        if (typeof document !== "undefined") {
            const timeInput = document.getElementById("req-time") as HTMLInputElement;
            timeInput?.scrollIntoView({ behavior: "smooth", block: "center" });
            timeInput?.focus();
        }
        return false;
    }

    const formattedDate = new Date(state.selectedDate.getTime() - state.selectedDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];

    if (!state.isPortalUser) {
        if (state.preferredContact === "email" && !state.email.trim()) { state.errorMsg = "Bitte geben Sie Ihre E-Mail-Adresse an."; state.isLoading = false; return false; }
        if (state.preferredContact === "phone" && !state.phone.trim()) { state.errorMsg = "Bitte geben Sie Ihre Telefonnummer an."; state.isLoading = false; return false; }
        if (state.preferredContact === "mail" && (!state.street.trim() || !state.zip_city.trim())) { state.errorMsg = "Bitte geben Sie Ihre vollständige Postadresse an."; state.isLoading = false; return false; }
    }

    let contactMethod = state.preferredContact === "email" ? "e-mail-address" : state.preferredContact === "mail" ? "mail-adress" : "telephone";
    let clientHeader = "";
    if (state.userRole === "client") clientHeader = `[PORTAL-ANFRAGE: KLIENT DIREKT]\nKlient: ${state.sender_name}\n\n`;
    else if (state.userRole === "caregiver") {
        const cName = state.portalClients.find((c: any) => c.id === state.selectedPortalClient)?.name || state.activeClientName || "Zugeordneter Klient";
        clientHeader = `[PORTAL-ANFRAGE: BETREUER]\nBetreuer: ${state.sender_name}\nBetrifft Klient: ${cName}\n\n`;
    } else if (state.userRole === "contact") {
        const cName = state.portalClients.find((c: any) => c.id === state.selectedPortalClient)?.name || state.activeClientName || "Angehöriger";
        clientHeader = `[PORTAL-ANFRAGE: ANGEHÖRIGER / KONTAKT]\nKontakt: ${state.sender_name}\nBetrifft Klient: ${cName}\n\n`;
    } else if (state.selectedPortalClient) {
        const cName = state.portalClients.find((c: any) => c.id === state.selectedPortalClient)?.name || state.selectedPortalClient;
        clientHeader = `Betrifft Klient: ${cName}\n\n`;
    }

    let doctorHeader = "";
    if (state.selectedDoctorOrAuthority) {
        const docName = state.selectedDoctorOrAuthority.company_name || `${state.selectedDoctorOrAuthority.name_first || ''} ${state.selectedDoctorOrAuthority.name_last || ''}`.trim();
        const docAddr = `${state.selectedDoctorOrAuthority.street || ''} ${state.selectedDoctorOrAuthority.housenr || ''}, ${state.selectedDoctorOrAuthority.zip || ''} ${state.selectedDoctorOrAuthority.city || ''}`.replace(/^,\s*|,\s*$/g, '').trim();
        const docPhone = state.selectedDoctorOrAuthority.phone ? `Tel: ${state.selectedDoctorOrAuthority.phone}` : '';
        const docInfo = [docName, docAddr, docPhone].filter(Boolean).join(' | ');
        doctorHeader = `[ZIEL / ARZT-BEHÖRDE: ${docInfo}]\n\n`;
        if (state.selectedPortalClient && state.selectedDoctorOrAuthority.id) {
            await linkDoctorToClient(state.selectedPortalClient, state.selectedDoctorOrAuthority.id);
        }
    }

    const readableTime = state.time && state.time.trim() ? `${state.time.trim()} Uhr` : "Keine feste Uhrzeit";
    const final_request_text = `${clientHeader}${doctorHeader}${state.request_text.trim()}\n\n--- Termindetails ---\nWunschtermin: ${state.selectedDate.toLocaleDateString("de-DE")} um ${readableTime}\n\n--- Kontaktdaten ---\nE-Mail: ${state.email || "-"}\nTelefon: ${state.phone || "-"}\nAdresse: ${state.street || "-"}, ${state.zip_city || "-"}`;

    const formData = new FormData();
    formData.append("company", state.company_id);
    formData.append("sender_name", state.sender_name || "Portal-Nutzer");
    formData.append("request_text", final_request_text);

    let timeIso = "";
    if (state.time && state.time.trim()) {
        try {
            const [th, tm] = state.time.trim().split(":").map(Number);
            const d = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), state.selectedDate.getDate(), th, tm, 0);
            timeIso = d.toISOString();
        } catch {}
    }

    formData.append("date", timeIso || `${formattedDate} 12:00:00.000Z`);
    if (timeIso) formData.append("time", timeIso);
    formData.append("contact_method", contactMethod);
    formData.append("email", state.email);
    formData.append("phone", state.phone);
    formData.append("street", state.street);
    formData.append("zip_city", state.zip_city);
    formData.append("status", "requested");
    if (state.selectedPortalClient) formData.append("client_id", state.selectedPortalClient);
    state.attachments.forEach((file: File) => formData.append("attachments", file));

    try {
        const newRecord = await pb.collection("appointment_requests").create(formData);
        notifyAppointmentRequestAsync({
            appointmentRequestId: newRecord.id,
            senderName: state.sender_name,
            email: state.email,
            phone: state.phone,
            requestText: final_request_text,
            date: formattedDate,
            time: readableTime,
            honeypot: state.website || undefined,
            formToken: state.formToken || undefined
        }).catch((e) => console.warn("[LandingAppointmentModal] Benachrichtigungstrigger:", e));

        state.successMsg = "Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns umgehend bei Ihnen.";
        toastStore.success("Anfrage erfolgreich übermittelt! Wir melden uns in Kürze.");
        state.request_text = "";
        state.time = "";
        state.selectedDate = null;
        state.attachments = [];
        state.isDoctorAppointmentManual = null;

        if (!state.isPortalUser) {
            state.sender_name = "";
            state.email = "";
            state.phone = "";
            state.street = "";
            state.zip_city = "";
            state.preferredContact = "phone";
        }

        if (typeof window !== "undefined" && "ontouchstart" in window) {
            setTimeout(() => closeCallback(), 2200);
        }
        return true;
    } catch (err) {
        console.error(err);
        state.errorMsg = "Es gab einen Fehler beim Senden. Bitte rufen Sie uns direkt an.";
        toastStore.error("Fehler beim Senden der Anfrage. Bitte kontaktieren Sie uns direkt.");
        return false;
    } finally {
        state.isLoading = false;
    }
}
