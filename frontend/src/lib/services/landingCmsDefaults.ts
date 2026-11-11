import type { CmsData, SectionMeta } from './landingCmsTypes';

export const DEFAULT_CMS_DATA: CmsData = {
    hero: {
        title: "Zuhause wohlfühlen. Selbstbestimmt leben.",
        subtitle: "Ihre verlässliche und herzliche Seniorenassistenz in Halle (Saale) und der Lutherstadt Wittenberg. Wir unterstützen Sie und Ihre Angehörigen bei Behördengängen, Arztbesuchen und im Alltag.",
        cta_primary: "Kostenloses Kennenlernen",
        cta_primary_link: "#terminanfrage",
        cta_secondary: "Was wir für Sie tun können",
        cta_secondary_link: "#leistungen",
        badge: "Anerkannter Partner aller Pflegekassen nach § 45b SGB XI",
        trust_points: ["Keine Vertragsbindung", "Arbeit nach Auftrag", "Einzelabrechnung möglich"],
        eyecatcher_badge: "💡",
        eyecatcher_title: "Verlässliche Hilfe, die Ihnen zusteht: Die Pflegekasse zahlt!",
        eyecatcher_text: "Ob monatlicher Entlastungsbetrag (131 € ab Pflegegrad 1) oder Verhinderungspflege (§ 39 SGB XI): Als anerkannter Dienstleister rechnen wir direkt mit Ihrer Pflegekasse ab – meist ohne einen einzigen Cent Zuzahlung.",
        eyecatcher_button: "Anspruch prüfen"
    },
    services: {
        headline: "Ihre persönliche Task-Force für den Alltag",
        subtitle: "Egal ob Formular-Dschungel, Großeinkauf oder einfach nur jemand, der zuhört. Wir passen uns voll und ganz Ihren Wünschen an.",
        items: [
            { id: "1", title: "Alltagsbegleitung mit Herz", desc: "Begleitung zu Arztterminen, Einkäufen, Banken, kulturellen Veranstaltungen und gemeinsamen Spaziergängen.", icon: "🤝" },
            { id: "2", title: "Bürokratie & Schriftverkehr", desc: "Unterstützung beim Sortieren von Unterlagen, Ausfüllen von Pflege- und Behördenanträgen sowie Telefonaten.", icon: "📑" },
            { id: "3", title: "Haushaltsnahe Entlastung", desc: "Kleine Handgriffe, Pflanzenpflege, Einkaufsplanung und Strukturierung des häuslichen Umfelds.", icon: "🏡" },
            { id: "4", title: "Entlastungsbetrag §45b", desc: "Vollständige Abrechnungsmöglichkeit mit Ihrer Pflegekasse über das monatliche Budget von 131 €.", icon: "💶" }
        ]
    },
    process: {
        headline: "Unser gemeinsamer Weg",
        subtitle: "Ganz entspannt und völlig ohne Hektik: So sieht ein typischer Ablauf aus, wenn wir zum Beispiel gemeinsam Ihren Arztbesuch oder den Formular-Dschungel meistern.",
        steps: [
            { id: "1", step: "1. Tasse Kaffee", title: "Unverbindliches Kennenlernen", text: "Wir plaudern ganz entspannt darüber, wo der Schuh drückt. Wir kommen zu Ihnen nach Hause und schnüren ein Hilfe-Paket, das genau zu Ihnen passt." },
            { id: "2", step: "2. Vorbereitung", title: "Gemeinsam sortieren", text: "Steht ein wichtiger Arztbesuch an? Wir sortieren das Zettelchaos, notieren Ihre Fragen an den Doktor und sorgen dafür, dass wir pünktlich loskommen." },
            { id: "3", step: "3. Begleitung", title: "Wir sind an Ihrer Seite", text: "Wir navigieren Sie sicher von A nach B. Im Sprechzimmer schreiben wir auf Wunsch fleißig mit, damit absolut nichts vergessen wird." },
            { id: "4", step: "4. Durchatmen", title: "Abheften & Entspannen", text: "Wieder daheim, heften wir alle Unterlagen sofort ordentlich ab. Dann gibt's einen gemütlichen Plausch und wir planen den nächsten Schritt." }
        ]
    },
    team: {
        headline: "Die Gesichter hinter der Hilfe",
        subtitle: "Kein unpersönliches Callcenter, keine nervige Warteschleifen-Musik. Bei uns landen Sie direkt bei Menschen, die Ihnen wirklich zuhören.",
        members: [
            {
                id: "tommy",
                name: "Tommy Jenzsch",
                role: "Inhaber & Seniorenassistent",
                location: "Standort Halle (Saale)",
                phone: "0151 57515432",
                email: "tommy@ihre-seniorenassistenz.com",
                desc: "Verlässlicher Partner mit Fokus auf Organisation, Mobilität und strukturierte Betreuung im Alltag.",
                avatarUrl: "/team/tommy.jpg"
            },
            {
                id: "doreen",
                name: "Doreen Jenzsch",
                role: "Inhaberin & Seniorenassistentin",
                location: "Standort Lutherstadt Wittenberg",
                phone: "0160 7303830",
                email: "doreen@ihre-seniorenassistenz.com",
                desc: "Einfühlsame Alltagsbegleiterin mit Herz, Geduld und viel Freude am gemeinsamen Austausch.",
                avatarUrl: "/team/doreen.jpg"
            }
        ]
    },
    cooperation: {
        headline: "Das Dreamteam für Angehörige & Betreuer",
        subtitle: "Wir drängen uns nicht auf, sondern springen genau da ein, wo der Schuh drückt. So wird aus Familie endlich wieder echte Familienzeit.",
        text: "Wir arbeiten Hand in Hand mit allen gesetzlichen und privaten Pflegekassen. Durch unsere offizielle Anerkennung schöpfen Sie Ihre Ansprüche – vor allem den Entlastungsbetrag (§ 45b SGB XI, 131 €/Monat) und die Verhinderungspflege (§ 39 SGB XI) – voll aus.",
        partner_badges: ["AOK PLUS", "Barmer", "DAK Gesundheit", "IKK gesund plus", "Knappschaft", "Private Pflegekassen", "Techniker Krankenkasse"].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })),
        scenarios: [
            { id: "1", tag: "Clever vorsorgen", title: "Hilfe, bevor es stressig wird", text: "Warum erst warten, bis der Papierstapel auf dem Tisch umkippt? Wir steigen ein, wenn es anfängt zu knirschen. So behalten Sie souverän das Ruder in der Hand." },
            { id: "2", tag: "Teamwork", title: "Wir arbeiten Hand in Hand", text: "Sie haben schon einen Betreuer? Wunderbar! Der kümmert sich um die trockenen Paragraphen, und wir bringen die menschliche Wärme in den Alltag." },
            { id: "3", tag: "Sondersituationen", title: "Die Spezialeinheit für Akutes", text: "Plötzlich muss es schnell gehen: Ein Krankenhausaufenthalt oder ein Umzug steht an. Wir packen sofort mit an und erledigen die To-Do-Listen." }
        ]
    },
    quality: {
        headline: "Auf uns können Sie bauen",
        subtitle: "Ihre Sicherheit, Ihr Lächeln und Ihr gutes Gefühl sind unser wichtigster Antrieb.",
        features: [
            { id: "1", title: "Verschwiegen wie ein Tresor", text: "Ihre Daten und Familiengeschichten sind bei uns so sicher wie ein wohlgehütetes Geheimnis. Ohne Ihr ausdrückliches Nicken geht keine einzige Information nach draußen." },
            { id: "2", title: "Sicherheitsnetz für alle Fälle", text: "Wir haben immer einen Plan B in der Tasche. Ob Hausarzt oder Angehörige – wir wissen exakt, wen wir anrufen müssen, falls nötig." },
            { id: "3", title: "Klipp & Klar dokumentiert", text: "Keine versteckten Klauseln, keine Überraschungen. Wir dokumentieren unsere Besuche für Sie und Ihre Angehörigen transparent und nachvollziehbar." }
        ]
    },
    faq: {
        headline: "Häufige Fragen kurz erklärt",
        subtitle: "Alles Wichtige rund um Kosten, Termine und unsere Betreuung auf einen Blick.",
        items: [
            { id: "1", q: "Was ist Seniorenassistenz eigentlich?", a: "Wir nehmen Ihnen nicht das Steuer aus der Hand. Sie sind der Kapitän, wir sind der Navigator. Wir sind Ihre motivierte rechte Hand im Alltag." },
            { id: "2", q: "Übernimmt die Pflegekasse die Kosten für die Seniorenassistenz?", a: "Ja, in den allermeisten Fällen vollständig! Ab Pflegegrad 1 steht Ihnen der monatliche Entlastungsbetrag (131 €/Monat) zu. Ab Pflegegrad 2 kann zusätzlich das Budget der Verhinderungspflege (§ 39 SGB XI) genutzt werden." },
            { id: "3", q: "Muss ich einen langfristigen Vertrag abschließen?", a: "Nein, bei uns gibt es keine starren Knebelverträge. Wir arbeiten nach konkreter Vereinbarung und Bedarf." },
            { id: "4", q: "Kommen Sie auch zu mir nach Hause?", a: "Aber natürlich! Unsere Dienstleistung findet genau dort statt, wo das Leben gerade spielt – direkt bei Ihnen zu Hause oder unterwegs." }
        ]
    },
    appointment: {
        headline: "Kaffee steht bereit! Wann dürfen wir kommen?",
        subtitle: "Suchen Sie sich ganz entspannt einen Wunschtermin im Kalender aus. Wir beißen nicht – und freuen uns darauf, Sie kennenzulernen!",
        button_text: "📅 Termin online anfragen"
    },
    contact: {
        headline: "Kontakt & Erreichbarkeit",
        subtitle: "Ihre guten Helfer für den Alltag – sprechen Sie uns gerne unverbindlich an.",
        address_halle: "Dreyhauptstr. 2, 06108 Halle (Saale)",
        address_wittenberg: "Lutherstadt Wittenberg & Umgebung",
        phone_central: "0345 / 213 895 20",
        email_central: "info@ihre-seniorenassistenz.com",
        opening_hours_halle: "Mo - Fr: 08:00 - 18:00 Uhr",
        opening_hours_wittenberg: "Mo - Fr: 08:00 - 18:00 Uhr",
        note: "Termine an Wochenenden oder außerhalb der Bürozeiten nach vorheriger Vereinbarung möglich."
    }
};

export const DEFAULT_METAS: Record<keyof CmsData, SectionMeta> = {
    hero: { is_active: true, order: 1, title: 'Hero & Startbereich' },
    services: { is_active: true, order: 2, title: 'Leistungsbausteine' },
    process: { is_active: true, order: 3, title: 'Ablauf & Unser Weg' },
    team: { is_active: true, order: 4, title: 'Team & Standorte' },
    cooperation: { is_active: true, order: 5, title: 'Kassen & Kooperation' },
    quality: { is_active: true, order: 6, title: 'Qualität & Vertrauen' },
    faq: { is_active: true, order: 7, title: 'Häufig gestellte Fragen' },
    appointment: { is_active: true, order: 8, title: 'Terminanfrage-Box' },
    contact: { is_active: true, order: 9, title: 'Kontaktdaten & Zeiten' }
};
