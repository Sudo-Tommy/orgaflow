import { pb } from "./pocketbase";

export interface ParsedRequestData {
    id?: string;
    source: 'appointment_requests' | 'inquiries' | 'notes';
    sender_name: string;
    email?: string;
    phone?: string;
    street?: string;
    zip_city?: string;
    contact_method?: string;
    request_text?: string;
    ai_summary?: string;
    status?: string;
    created?: string;
    date?: string;
    time?: string;
    attachments?: any[];
    raw?: any;
}

export function getAppointmentRequestId(appointment: any): string | null {
    if (!appointment) return null;
    
    // 1. Tag [ANFRAGE_ID: xxx] in notes
    const tagMatch = appointment.notes?.match(/\[ANFRAGE_ID:\s*([a-zA-Z0-9_-]+)\]/i);
    if (tagMatch && tagMatch[1]) return tagMatch[1].trim();

    // 2. Format ANFRAGE_ID: xxx in notes
    const rawMatch = appointment.notes?.match(/ANFRAGE[-_]ID[:\s]+([a-zA-Z0-9_-]+)/i);
    if (rawMatch && rawMatch[1]) return rawMatch[1].trim();

    // 3. Direct fields if present
    if (appointment.request_id) return appointment.request_id;
    if (appointment.inquiry_id) return appointment.inquiry_id;

    return null;
}

export function isAppointmentFromRequest(appointment: any): boolean {
    if (!appointment) return false;
    if (getAppointmentRequestId(appointment)) return true;
    
    const notes = appointment.notes || '';
    if (notes.includes('KI-ZUSAMMENFASSUNG') && notes.includes('KUNDENNACHRICHT')) return true;
    if (notes.includes('KONTAKTDATEN AUS ANFRAGE')) return true;
    if (notes.includes('Aus Kundenanfrage übernommen')) return true;
    if (notes.includes('ANFRAGE-REFERENZ')) return true;
    if (appointment.inquiry_id || appointment.request_id) return true;

    return false;
}

export function parseRequestFromNotes(notes: string): ParsedRequestData {
    const data: ParsedRequestData = {
        source: 'notes',
        sender_name: 'Unbekannt'
    };

    if (!notes) return data;

    // 1. ANFRAGE_ID
    const idMatch = notes.match(/\[ANFRAGE_ID:\s*([a-zA-Z0-9_-]+)\]/i) || notes.match(/ANFRAGE[-_]ID[:\s]+([a-zA-Z0-9_-]+)/i);
    if (idMatch) data.id = idMatch[1].trim();

    // 2. KI-ZUSAMMENFASSUNG
    const kiMatch = notes.match(/📌\s*KI-ZUSAMMENFASSUNG:\s*([\s\S]*?)(?=(?:\n---|\n\n💬|\n\n📞|\n\n📌\s*ANFRAGE|$))/i);
    if (kiMatch) {
        data.ai_summary = kiMatch[1].trim();
    }

    // 3. KUNDENNACHRICHT
    const msgMatch = notes.match(/💬\s*KUNDENNACHRICHT:\s*([\s\S]*?)(?=(?:\n---|\n\n📞|\n\n📌\s*ANFRAGE|$))/i);
    if (msgMatch) {
        data.request_text = msgMatch[1].trim();
    }

    // 4. KONTAKTDATEN
    const contactBlock = notes.match(/KONTAKTDATEN AUS ANFRAGE:\s*([\s\S]*?)(?=(?:\n---|\n\n📌|$))/i);
    if (contactBlock) {
        const text = contactBlock[1];
        const nameM = text.match(/Name:\s*([^\n\r]+)/i);
        if (nameM && nameM[1] && nameM[1].trim() !== '-') data.sender_name = nameM[1].trim();

        const phoneM = text.match(/Telefon:\s*([^\n\r]+)/i);
        if (phoneM && phoneM[1] && phoneM[1].trim() !== '-') data.phone = phoneM[1].trim();

        const emailM = text.match(/E-Mail:\s*([^\n\r]+)/i);
        if (emailM && emailM[1] && emailM[1].trim() !== '-') data.email = emailM[1].trim();

        const addrM = text.match(/Adresse:\s*([^\n\r]+)/i);
        if (addrM && addrM[1] && addrM[1].trim() !== '-') data.street = addrM[1].trim();

        const methodM = text.match(/Kontaktweg:\s*([^\n\r]+)/i);
        if (methodM && methodM[1]) data.contact_method = methodM[1].trim();
    }

    // Fallback falls sender_name noch nicht gefunden
    if (!data.sender_name || data.sender_name === 'Unbekannt') {
        const altName = notes.match(/(?:Anfrager|Kontakt|Absender):\s*([^\n\r,]+)/i);
        if (altName && altName[1] && altName[1].trim() !== '-') {
            data.sender_name = altName[1].trim();
        }
    }

    // Fallback E-Mail aus request_text oder Notizen
    if (!data.email) {
        const emailM = notes.match(/E-Mail:\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i) || notes.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailM) data.email = emailM[1].trim();
    }

    // Fallback Telefon
    if (!data.phone) {
        const phoneM = notes.match(/Telefon(?:\s*oder\s*Mobil)?:\s*([+\d\s\/\-\(\)]{6,})/i) || notes.match(/Tel:\s*([+\d\s\/\-\(\)]{6,})/i);
        if (phoneM) data.phone = phoneM[1].trim();
    }

    return data;
}

export async function fetchRequestForAppointment(appointment: any): Promise<ParsedRequestData | null> {
    if (!appointment) return null;

    const reqId = getAppointmentRequestId(appointment);

    if (reqId) {
        // 1. Try appointment_requests
        try {
            const r = await pb.collection('appointment_requests').getOne(reqId, { requestKey: null });
            if (r) {
                return {
                    id: r.id,
                    source: 'appointment_requests',
                    sender_name: r.sender_name || 'Kundenanfrage',
                    email: r.email,
                    phone: r.phone,
                    street: r.street,
                    zip_city: r.zip_city,
                    contact_method: r.contact_method,
                    request_text: r.request_text,
                    ai_summary: r.ai_summary,
                    status: r.status,
                    created: r.created,
                    date: r.date,
                    time: r.time,
                    attachments: r.attachments || [],
                    raw: r
                };
            }
        } catch (e) {
            // Not in appointment_requests, try inquiries
        }

        // 2. Try inquiries
        try {
            const i = await pb.collection('inquiries').getOne(reqId, { requestKey: null });
            if (i) {
                return {
                    id: i.id,
                    source: 'inquiries',
                    sender_name: i.sender_name || 'Web-Anfrage',
                    email: i.sender_email || i.email,
                    phone: i.sender_phone || i.phone,
                    street: i.sender_address || i.street,
                    contact_method: 'Web-Anfrage',
                    request_text: i.raw_text,
                    ai_summary: i.summary,
                    status: i.status === 'converted' ? 'accepted' : i.status,
                    created: i.created,
                    attachments: [],
                    raw: i
                };
            }
        } catch (e) {
            // Not in inquiries either
        }
    }

    // 3. Try finding inquiry by appointment_id if appointment.id exists
    if (appointment.id) {
        try {
            const inqMatch = await pb.collection('inquiries').getFirstListItem(`appointment_id = "${appointment.id}"`, { requestKey: null });
            if (inqMatch) {
                return {
                    id: inqMatch.id,
                    source: 'inquiries',
                    sender_name: inqMatch.sender_name || 'Web-Anfrage',
                    email: inqMatch.sender_email || inqMatch.email,
                    phone: inqMatch.sender_phone || inqMatch.phone,
                    street: inqMatch.sender_address || inqMatch.street,
                    contact_method: 'Web-Anfrage',
                    request_text: inqMatch.raw_text,
                    ai_summary: inqMatch.summary,
                    status: inqMatch.status === 'converted' ? 'accepted' : inqMatch.status,
                    created: inqMatch.created,
                    attachments: [],
                    raw: inqMatch
                };
            }
        } catch (e) {}
    }

    // 4. Fallback to parsing from notes if appointment has request notes
    if (isAppointmentFromRequest(appointment)) {
        return parseRequestFromNotes(appointment.notes || '');
    }

    return null;
}
