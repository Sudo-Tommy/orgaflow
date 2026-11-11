export type MarketingFormat = 'flyer' | 'poster' | 'social_sheet' | 'insert' | 'factsheet' | 'voucher';
export type TargetAudience = 'Angehörige' | 'Senioren' | 'Ärzte' | 'Allgemein';

export const DEFAULT_FORMAT_DATA = {
    poster: {
        headline: "Liebevolle Unterstützung für Senioren & Angehörige",
        subheadline: "Selbstbestimmt im eigenen Zuhause leben",
        bulletpoints: [
            "Begleitung zum Arzt, zu Behörden & Einkäufen",
            "Hilfe beim lästigen Papierkram & Anträgen",
            "Entlastung für pflegende Angehörige",
            "Kostenübernahme über die Pflegekasse (ab Pflegegrad 1)"
        ],
        highlight_box: "131 € mtl. Entlastungsbetrag nach § 45b SGB XI sicher nutzen!",
        cta: "Jetzt kostenloses Kennenlernen vereinbaren",
        contacts: "Tommy Jenzsch (Halle): 0151 57515432 · Doreen Jenzsch (Wittenberg): 0160 7303830\ninfo@ihre-seniorenassistenz.com · www.ihre-seniorenassistenz.com"
    },
    social_sheet: [
        {
            platform: "Instagram & Facebook (Beitrag 1: Entlastungsbetrag)",
            hook: "Wussten Sie, dass Ihnen jeden Monat 131 € für Alltagsunterstützung zustehen? 💶",
            text: "Viele Pflegebedürftige und Angehörige wissen nicht: Ab Pflegegrad 1 zahlt die Pflegekasse 131 € monatlich für Entlastungsleistungen nach § 45b SGB XI!\n\nWir begleiten Sie zu Arztterminen, helfen bei Anträgen oder gehen gemeinsam spazieren. Das Beste: Wir rechnen auf Wunsch direkt mit der Kasse ab.",
            cta: "Schreiben Sie uns eine Nachricht oder buchen Sie ein Kennenlernen unter ihre-seniorenassistenz.com!",
            hashtags: "#Seniorenassistenz #HalleSaale #Wittenberg #Pflegegrad #Pflegekasse #Entlastungsbetrag #Angehörige"
        },
        {
            platform: "Instagram & Facebook (Beitrag 2: Persönliche Nähe)",
            hook: "Kein anonymes Callcenter – Bei uns zählt das persönliche Gespräch bei einer Tasse Kaffee. ☕",
            text: "Hilfe anzunehmen ist Vertrauenssache. Deshalb lernen wir uns zuerst ganz unverbindlich bei Ihnen zu Hause kennen.\n\nOb Doreen in Wittenberg oder Tommy in Halle: Wir sind an Ihrer Seite, wenn der Alltag zu schwer wird.",
            cta: "Rufen Sie uns unverbindlich an: 0345 / 213 895 20",
            hashtags: "#Alltagsbegleitung #MitHerz #Seniorenhilfe #Vertrauen #Familie"
        }
    ],
    insert: {
        title: "Ihre verlässliche Seniorenassistenz",
        subtitle: "Wir sind für Sie da – persönlich, herzlich und kompetent.",
        benefits: [
            "Begleitung zu Ärzten & Terminen",
            "Unterstützung bei Behördenpost",
            "Kostenlose Beratung zum Pflegegrad"
        ],
        footer: "Seniorenassistenz Jenzsch · Dreyhauptstr. 2, 06108 Halle · Tel: 0345 / 213 895 20"
    },
    factsheet: {
        title: "Übersicht: Finanzierung & Entlastungsleistungen (§ 45b SGB XI)",
        section1_title: "1. Was ist der Entlastungsbetrag?",
        section1_text: "Versicherte ab Pflegegrad 1 haben einen gesetzlichen Anspruch auf 131 € monatlich (1.572 € pro Jahr). Nicht genutzte Beträge können bis zum 30. Juni des Folgejahres angespart werden.",
        section2_title: "2. Wofür kann der Betrag verwendet werden?",
        section2_items: [
            "Alltagsbegleitung und Begleitdienste (Einkäufe, Arztbesuche, Kultur)",
            "Unterstützung im Haushalt und bei der Organisation",
            "Entlastung von pflegenden Angehörigen"
        ],
        section3_title: "3. Wie erfolgt die Abrechnung?",
        section3_text: "Wir verfügen über die Anerkennung nach Landesrecht Sachsen-Anhalt. Wir können die erbrachten Leistungen direkt mit allen Pflegekassen abrechnen (Abtretungserklärung), sodass Sie keine Vorkasse leisten müssen."
    },
    voucher: {
        title: "Gutschein für ein persönliches Kennenlernen",
        value: "100% Kostenfrei & Unverbindlich",
        description: "Wir laden Sie zu einem unverbindlichen Beratungs- und Kennenlerngespräch bei einer Tasse Kaffee bei Ihnen zu Hause ein.",
        code: "GUTSCHEIN-KENNENLERNEN-2026",
        validity: "Gültig für Neukunden in Halle (Saale), Wittenberg und Umgebung."
    }
};

export function getMarketingFormatMeta(format: MarketingFormat): { filename: string; docTitle: string } {
    switch (format) {
        case 'flyer':
            return { filename: 'Flyer-Seniorenassistenz-Wickelfalz.pdf', docTitle: '6-Seiter Flyer (Wickelfalz)' };
        case 'poster':
            return { filename: 'Plakat-Aushang-A4.pdf', docTitle: 'Aushang / Plakat (DIN A4)' };
        case 'factsheet':
            return { filename: 'Infoblatt-Pflegekassen-A4.pdf', docTitle: 'Infoblatt Pflegekassen (DIN A4)' };
        case 'insert':
            return { filename: 'Beileger-Postkarte-A6.pdf', docTitle: 'Beileger / Postkarte (DIN A6)' };
        case 'voucher':
            return { filename: 'Gutschein-Kennenlernen-A6.pdf', docTitle: 'Gutschein-Karte (DIN A6)' };
        default:
            return { filename: 'Werbemittel.pdf', docTitle: 'Werbemittel' };
    }
}
