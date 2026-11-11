/**
 * Client Completion Service
 * Prüft Klienten auf Vollständigkeit der Stammdaten und liefert strukturierte
 * Informationen für Badges, Tooltips und Vervollständigungs-Aufforderungen.
 */

export interface ClientCompletionStatus {
    isComplete: boolean;
    missingSections: string[];
    missingDetails: string[];
    score: number; // 0 bis 100
}

export function getClientCompletionStatus(client: any): ClientCompletionStatus {
    if (!client) {
        return {
            isComplete: false,
            missingSections: ["Stammdaten"],
            missingDetails: ["Keine Klientendaten vorhanden"],
            score: 0
        };
    }

    const missingSections: string[] = [];
    const missingDetails: string[] = [];
    let passedPoints = 0;
    const totalPoints = 5;

    // 1. Name & Identität
    const firstName = (client.name_first || "").trim();
    const lastName = (client.name_last || "").trim();
    const isPlaceholderName = (firstName === "Neuer" && lastName === "Klient") || (!firstName && !lastName);

    if (isPlaceholderName) {
        missingSections.push("Vollständiger Name");
        missingDetails.push("Vor- und Nachname noch nicht erfasst");
    } else {
        passedPoints++;
    }

    // 2. Geburtsdatum
    const birthdate = (client.birthdate || "").trim();
    if (!birthdate) {
        missingSections.push("Geburtsdatum");
        missingDetails.push("Geburtsdatum fehlt");
    } else {
        passedPoints++;
    }

    // 3. Anschrift
    const hasStreet = !!(client.street || "").trim();
    const hasCity = !!(client.city || "").trim();
    const hasZip = !!(client.zip || "").trim();
    if (!hasStreet || !hasCity || !hasZip) {
        missingSections.push("Wohnadresse");
        const missingAddr = [];
        if (!hasStreet) missingAddr.push("Straße/Hausnr.");
        if (!hasZip || !hasCity) missingAddr.push("PLZ/Ort");
        missingDetails.push(`Adresse unvollständig (${missingAddr.join(", ")})`);
    } else {
        passedPoints++;
    }

    // 4. Kontaktmöglichkeit
    const hasPhone = !!(client.phone || "").trim();
    const hasHandy = !!(client.handy || "").trim();
    const hasEmail = !!(client.email || "").trim();
    if (!hasPhone && !hasHandy && !hasEmail) {
        missingSections.push("Kontaktdaten");
        missingDetails.push("Keine Telefonnummer oder E-Mail hinterlegt");
    } else {
        passedPoints++;
    }

    // 5. Pflegegrad oder Krankenkasse
    const hasCareLevel = !!(client.level_of_care || "").trim();
    const hasInsurance = !!(client.insurance || "").trim() || !!(client.insurance_nr || "").trim();
    if (!hasCareLevel && !hasInsurance) {
        missingSections.push("Pflege / Kasse");
        missingDetails.push("Weder Pflegegrad noch Krankenkasse eingetragen");
    } else {
        passedPoints++;
    }

    const score = Math.round((passedPoints / totalPoints) * 100);
    const isComplete = missingSections.length === 0;

    return {
        isComplete,
        missingSections,
        missingDetails,
        score
    };
}
