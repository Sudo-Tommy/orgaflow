import { Router } from 'express';
import { getAdminPb } from '../../services/pb.js';
import { resolvePortalAuth } from '../../middleware/portalAuth.js';
import { verifyFormToken } from '../../utils/security.js';
import { processNotifyRequest } from '../../services/portal/portalNotificationService.js';

const router = Router();

router.post(['/api/emails/portal/new-client', '/portal/new-client'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    const { 
        company, salutation, name_first, name_last, birthdate, marital_status, nationality,
        street, housenr, zip, city, email, phone, handy, 
        level_of_care, insurance_nr, insurance, notes, retirement_homes,
        other_insurance_name, other_insurance_street, other_insurance_zip, other_insurance_city,
        // Caregiver / Betreuer
        has_caregiver, caregiver_relation, caregiver_salutation, caregiver_company,
        caregiver_name_first, caregiver_name_last, caregiver_phone, caregiver_email,
        caregiver_street, caregiver_housenr, caregiver_zip, caregiver_city,
        caregiver_has_power_of_attorney, caregiver_notes,
        // Terminwunsch
        request_appointment, appointment_service, appointment_date, appointment_time, appointment_notes
    } = req.body;

    if (!name_first || !name_last || !company) return res.status(400).json({ error: "Pflichtfelder fehlen." });

    try {
        const pb = auth.pb || await getAdminPb();

        // 1. Betreuer-Kontakt anlegen, falls angegeben
        let caregiverContactId = null;
        if (has_caregiver || (caregiver_name_first && caregiver_name_last)) {
            try {
                const contactPayload = {
                    salutation: caregiver_salutation || 'Keine Angabe',
                    name_first: (caregiver_name_first || '').trim(),
                    name_last: (caregiver_name_last || '').trim(),
                    company_name: (caregiver_company || '').trim(),
                    phone: caregiver_phone || '',
                    email: caregiver_email || '',
                    street: caregiver_street || '',
                    housenr: caregiver_housenr || '',
                    zip: caregiver_zip || '',
                    city: caregiver_city || '',
                    notes: {
                        contact_type: 'caregiver',
                        relation: caregiver_relation || 'Gesetzlicher Betreuer',
                        has_power_of_attorney: !!caregiver_has_power_of_attorney,
                        notes: caregiver_notes || ''
                    }
                };
                const createdContact = await pb.collection('contacts').create(contactPayload);
                caregiverContactId = createdContact.id;
            } catch (cErr) {
                console.warn("[new-client] Betreuer-Kontakt konnte nicht angelegt werden:", cErr.message);
            }
        }

        // 2. Notizen strukturieren
        let formattedNotes = `⚠️ NEUAUFNAHME-ANFRAGE:\n${notes || ''}`.trim();
        if (other_insurance_name) {
            const insObj = {
                name: other_insurance_name,
                street: other_insurance_street || '',
                zip: other_insurance_zip || '',
                city: other_insurance_city || ''
            };
            formattedNotes += `\n[NEUE_KRANKENKASSE: ${JSON.stringify(insObj)}]`;
        }
        if (caregiver_name_first || caregiver_name_last) {
            formattedNotes += `\n\n📋 GESETZLICHER BETREUER / BEVOLLMÄCHTIGTE(R):\n` +
                `Name: ${caregiver_salutation || ''} ${caregiver_name_first || ''} ${caregiver_name_last || ''}\n` +
                `Rolle: ${caregiver_relation || 'Gesetzlicher Betreuer'}\n` +
                (caregiver_company ? `Organisation: ${caregiver_company}\n` : '') +
                (caregiver_phone ? `Tel: ${caregiver_phone}\n` : '') +
                (caregiver_email ? `E-Mail: ${caregiver_email}\n` : '') +
                (caregiver_street ? `Adresse: ${caregiver_street} ${caregiver_housenr || ''}, ${caregiver_zip || ''} ${caregiver_city || ''}\n` : '') +
                `Vollmacht liegt vor: ${caregiver_has_power_of_attorney ? 'Ja' : 'Nein'}`;
        }
        if (auth.contactId) {
            formattedNotes += `\nEingereicht über Betreuer-Portal von Kontakt: ${auth.name || auth.email || auth.contactId}`;
        }

        // 3. Klientendaten zusammenstellen
        const clientData = { 
            company: [company], 
            salutation: salutation || 'Keine Angabe', 
            name_first, 
            name_last, 
            birthdate: birthdate ? `${birthdate} 12:00:00.000Z` : '', 
            marital_status: marital_status || '',
            nationality: nationality || '',
            street: street || '', 
            housenr: housenr || '', 
            zip: zip || '', 
            city: city || '', 
            email: email || '', 
            phone: phone || '', 
            handy: handy || '', 
            level_of_care: level_of_care || '', 
            insurance_nr: insurance_nr || '', 
            notes: formattedNotes,
            status: 'Inaktiv'
        };

        if (insurance && insurance !== 'other') clientData.insurance = [insurance];
        if (retirement_homes) clientData.retirement_homes = [retirement_homes];

        // Kontakte und Betreuer verknüpfen
        const linkedContactIds = new Set();
        if (auth.type === 'contact' && auth.contactId) linkedContactIds.add(auth.contactId);
        if (caregiverContactId) linkedContactIds.add(caregiverContactId);
        if (linkedContactIds.size > 0) clientData.contacts = Array.from(linkedContactIds);

        if (caregiverContactId) {
            clientData.caregiver = caregiverContactId;
        } else if (auth.type === 'contact' && auth.contactId) {
            clientData.caregiver = auth.contactId;
        }

        // Zusätzliche Betreuer-/Bevollmächtigtenfelder auf Klientenebene füllen
        if (caregiver_name_first || caregiver_name_last) {
            clientData.inheritor_name = `${caregiver_name_first || ''} ${caregiver_name_last || ''}`.trim();
            clientData.inheritor_relation = caregiver_relation || 'Gesetzlicher Betreuer';
            clientData.inheritor_phone = caregiver_phone || '';
            clientData.inheritor_email = caregiver_email || '';
            clientData.inheritor_has_power_of_attorney = !!caregiver_has_power_of_attorney;
            clientData.inheritor_notes = caregiver_notes || '';
            clientData.inheritor_info = {
                company: caregiver_company || '',
                street: caregiver_street || '',
                housenr: caregiver_housenr || '',
                zip: caregiver_zip || '',
                city: caregiver_city || ''
            };
        }

        const newClient = await pb.collection('clients').create(clientData);

        // 4. Direkter Terminwunsch anlegen, falls ausgewählt
        let appReqRecord = null;
        if (request_appointment && (appointment_date || appointment_service)) {
            try {
                let appTimeIso = null;
                if (appointment_date && appointment_time) {
                    try {
                        const [th, tm] = appointment_time.split(':').map(Number);
                        const [y, m, d] = appointment_date.split('-').map(Number);
                        appTimeIso = new Date(Date.UTC(y, m - 1, d, th, tm)).toISOString();
                    } catch {}
                }
                const appDateIso = appointment_date 
                    ? new Date(`${appointment_date}T12:00:00.000Z`).toISOString()
                    : new Date().toISOString();

                const readableTime = appointment_time ? `${appointment_time} Uhr` : "Nach Absprache";
                const reqText = `[NEUAUFNAHME-TERMINWUNSCH: ${appointment_service || 'Kennenlerngespräch / Erstberatung'}]\n` +
                    `Klient: ${name_first} ${name_last}\n` +
                    `Wunschtermin: ${appointment_date || 'Flexibel'} (${readableTime})\n` +
                    (appointment_notes ? `Hinweise: ${appointment_notes}\n` : '') +
                    `Adresse: ${street || ''} ${housenr || ''}, ${zip || ''} ${city || ''}\n` +
                    `Telefon: ${phone || handy || '-'}\n` +
                    `E-Mail: ${email || '-'}`;

                const appPayload = {
                    company: company,
                    sender_name: `${name_first} ${name_last}`.trim(),
                    request_text: reqText,
                    date: appDateIso,
                    time: appTimeIso || appDateIso,
                    contact_method: email ? 'e-mail-address' : 'telephone',
                    status: 'requested',
                    ai_summary: `Neuaufnahme-Termin: ${appointment_service || 'Erstberatung'} (${name_first} ${name_last})`
                };

                appReqRecord = await pb.collection('appointment_requests').create(appPayload);
                processNotifyRequest(appReqRecord.id, appPayload).catch((e) => {
                    console.warn("[new-client] Notification Error:", e.message);
                });
            } catch (appErr) {
                console.error("[new-client] Terminanfrage-Erstellung fehlgeschlagen:", appErr.message);
            }
        }

        res.json({ 
            success: true, 
            clientId: newClient.id, 
            client: newClient,
            caregiverContactId,
            appointmentRequestId: appReqRecord?.id || null 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/notify-request', '/portal/notify-request'], async (req, res) => {
    const { appointmentRequestId, formToken, honeypot } = req.body;
    if (honeypot) return res.json({ success: true, queued: true });

    if (formToken) {
        const elapsed = verifyFormToken(formToken);
        if (elapsed === null || elapsed < 3) return res.json({ success: true, queued: true });
        if (elapsed > 7200) return res.status(400).json({ error: 'Sitzung abgelaufen.' });
    }

    if (!appointmentRequestId) return res.status(400).json({ error: "appointmentRequestId fehlt." });
    res.json({ success: true, queued: true });
    processNotifyRequest(appointmentRequestId, req.body).catch(() => {});
});

export default router;
