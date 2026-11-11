import type { ContactRecord } from "$lib/types/orgaTypes";
import { toastStore } from "$lib/services/toastService.svelte";
import { formatFullName, parseContactNotes } from "./contactDetailHelpers";

/**
 * Erzeugt eine standardkonforme vCard (VCF 3.0) für einen Kontakt
 */
export function generateVCard(contact: Partial<ContactRecord>): string {
    const lines: string[] = [
        "BEGIN:VCARD",
        "VERSION:3.0"
    ];

    const lastName = contact.name_last || "";
    const firstName = contact.name_first || "";
    const formattedName = formatFullName(firstName, lastName, contact.salutation) || contact.company_name || "Kontakt";

    lines.push(`FN:${formattedName}`);
    lines.push(`N:${lastName};${firstName};;;`);

    if (contact.company_name) {
        lines.push(`ORG:${contact.company_name}`);
    }

    if (contact.phone) {
        lines.push(`TEL;TYPE=VOICE,PREF:${contact.phone}`);
    }

    if (contact.email) {
        lines.push(`EMAIL;TYPE=INTERNET,PREF:${contact.email}`);
    }

    const street = [contact.street, contact.housenr].filter(Boolean).join(" ");
    if (street || contact.zip || contact.city) {
        lines.push(`ADR;TYPE=WORK,PREF:;;${street};${contact.city || ""};;${contact.zip || ""};Deutschland`);
    }

    const parsedNotes = parseContactNotes(contact.notes);
    if (parsedNotes.text) {
        const noteText = parsedNotes.text.replace(/\r?\n/g, "\\n");
        lines.push(`NOTE:${noteText}`);
    }

    lines.push("END:VCARD");
    return lines.join("\r\n");
}

/**
 * Löst den Download einer einzelnen vCard-Datei aus
 */
export function downloadVCard(contact: Partial<ContactRecord>): void {
    const vcardContent = generateVCard(contact);
    const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const safeName = (contact.company_name || `${contact.name_first || ""}_${contact.name_last || ""}` || "kontakt")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
        
    link.href = url;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastStore.success(`Visitenkarte heruntergeladen`);
}

/**
 * Löst den Sammel-Download mehrerer Kontakte als eine vCard-Datei aus
 */
export function downloadAllVCards(contacts: Partial<ContactRecord>[], filename = "OrgaFlow_Kontakte.vcf"): void {
    if (!contacts.length) {
        toastStore.warning("Keine Kontakte zum Exportieren vorhanden.");
        return;
    }
    const fullContent = contacts.map((c) => generateVCard(c)).join("\r\n\r\n");
    const blob = new Blob([fullContent], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastStore.success(`${contacts.length} Kontakte als Visitenkarten-Datei exportiert`);
}
