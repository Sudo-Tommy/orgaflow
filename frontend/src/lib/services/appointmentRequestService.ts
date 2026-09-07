import { pb } from "./pocketbase";

export interface AppointmentRequestInput {
    company: string;
    sender_name: string;
    request_text: string;
    date: string;
    time: string;
    contact_method: string;
}

export async function submitAppointmentRequest(data: AppointmentRequestInput) {
    // PocketBase erwartet bei Date-Feldern gültige ISO-Strings
    let dateIso = null;
    if (data.date) {
        // Ohne das 'Z' am Ende wird die Zeit als lokale Zeit (Deutschland) interpretiert!
        dateIso = new Date(`${data.date}T12:00:00`).toISOString();
    }

    let timeIso = null;
    if (data.time) {
        // Holen des aktuellen lokalen Datums als Fallback (YYYY-MM-DD) ohne UTC-Verschiebung
        const baseDate = data.date ? data.date : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        timeIso = new Date(`${baseDate}T${data.time}:00`).toISOString();
    }

    const payload = {
        company: data.company,
        sender_name: data.sender_name,
        request_text: data.request_text,
        date: dateIso,
        time: timeIso,
        contact_method: data.contact_method,
        status: "requested" // Standard-Status laut deinem Schema
    };

    return await pb.collection('appointment_requests').create(payload);
}