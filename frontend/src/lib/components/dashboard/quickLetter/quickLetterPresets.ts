export interface QuickLetterPreset {
    id: string;
    icon: string;
    title: string;
    subject: string;
    body: string;
}

export const QUICK_LETTER_PRESETS: QuickLetterPreset[] = [
    {
        id: 'info',
        icon: '📄',
        title: 'Allgemein',
        subject: 'Information zu unseren Betreuungs- und Entlastungsleistungen',
        body: 'wir bedanken uns herzlich für das entgegengebrachte Vertrauen.\n\nAnbei erhalten Sie die gewünschten Unterlagen zu unseren Unterstützungs- und Betreuungsleistungen nach dem Sozialgesetzbuch (SGB XI).\n\nSollten Sie Fragen haben oder eine persönliche Beratung wünschen, stehen wir Ihnen jederzeit gern telefonisch oder per E-Mail zur Verfügung.'
    },
    {
        id: 'appointment',
        icon: '📅',
        title: 'Termin',
        subject: 'Ankündigung unseres nächsten Betreuungseinsatzes',
        body: 'wir freuen uns auf unseren nächsten gemeinsamen Betreuungstermin.\n\nGerne bestätigen wir Ihnen die geplante Durchführung unserer vereinbarten Unterstützungsleistungen. Sollten sich Ihrerseits zeitliche Änderungen ergeben, bitten wir Sie um eine kurze Rückmeldung bis 24 Stunden vor dem Termin.\n\nWir freuen uns auf das persönliche Wiedersehen!'
    },
    {
        id: 'insurance',
        icon: '🛡️',
        title: 'Kasse / SGB XI',
        subject: 'Antrag auf Kostenübernahme für Entlastungsleistungen (§ 45b SGB XI)',
        body: 'hiermit übersenden wir Ihnen im Auftrag unseres/r Klienten/in die Unterlagen zur Abrechnung bzw. Kostenübernahme der erbrachten Entlastungs- und Unterstützungsleistungen gemäß § 45b SGB XI.\n\nDie entsprechenden Leistungsnachweise und Abtretungserklärungen liegen diesem Schreiben bei. Wir bitten um Prüfung und Freigabe auf das hinterlegte Geschäftskonto.'
    },
    {
        id: 'blank',
        icon: '✍️',
        title: 'Leeres Blatt',
        subject: '',
        body: ''
    }
];
