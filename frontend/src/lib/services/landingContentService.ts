export function getServices() {
    return [
        {
            iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
            title: "Alltagsbegleitung mit Herz",
            description: "Ob Arztbesuch, Bankgeschäft oder der Gang zur Behörde: Wir sind Ihr sicherer Anker und kennen glücklicherweise die besten Abkürzungen durch den deutschen Formular-Dschungel."
        },
        {
            iconPath: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
            title: "Zuhause wohlfühlen",
            description: "Wir übernehmen den Einkauf, gießen die Blumen und sorgen für Ordnung. So können Sie endlich mal wieder entspannt die Füße hochlegen (was Sie ohnehin viel zu selten tun!)."
        },
        {
            iconPath: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
            title: "Organisationstalent inklusive",
            description: "Krankenkasse, Pflegedienst, störrische Handwerker... wer soll da noch durchblicken? Wir übernehmen das Telefon-Ping-Pong für Sie und übersetzen das Fachchinesisch in entspanntes Normal-Deutsch."
        },
        {
            iconPath: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
            title: "Pflegegrad-Kompass",
            description: "Wir lotsen Sie sicher durch den Antragswald der Pflegekasse. Wir helfen dabei, dass Sie die Unterstützung bekommen, die Ihnen zusteht – ohne dass Sie dabei graue Haare bekommen."
        }
    ];
}

export function getProcessSteps() {
    return [
        {
            step: "1. Tasse Kaffee",
            title: "Unverbindliches Kennenlernen",
            text: "Wir plaudern ganz entspannt darüber, wo der Schuh drückt. Wir kommen zu Ihnen nach Hause und schnüren ein Hilfe-Paket, das genau zu Ihnen passt."
        },
        {
            step: "2. Vorbereitung",
            title: "Gemeinsam sortieren",
            text: "Steht ein wichtiger Arztbesuch an? Wir sortieren das Zettelchaos, notieren Ihre Fragen an den Doktor und sorgen dafür, dass wir pünktlich loskommen (auch wenn der Haustürschlüssel mal wieder Verstecken spielt)."
        },
        {
            step: "3. Begleitung",
            title: "Wir sind an Ihrer Seite",
            text: "Wir navigieren Sie sicher von A nach B. Im Sprechzimmer schreiben wir auf Wunsch fleißig mit, damit absolut nichts vergessen wird. Der Boss im Ring bleiben dabei aber natürlich immer Sie."
        },
        {
            step: "4. Durchatmen",
            title: "Abheften & Entspannen",
            text: "Wieder daheim, heften wir alle Unterlagen sofort ordentlich ab. Dann gibt's einen gemütlichen Plausch und wir planen den nächsten Schritt. Zettel-Chaos hat bei uns ab sofort strenges Hausverbot."
        }
    ];
}

export function getQualityFeatures() {
    return [
        {
            title: "Verschwiegen wie ein Tresor",
            text: "Ihre Daten und Familiengeschichten sind bei uns so sicher wie das streng gehütete Geheimrezept für Omas Apfelkuchen. Ohne Ihr ausdrückliches Nicken geht keine einzige Information nach draußen."
        },
        {
            title: "Sicherheitsnetz für alle Fälle",
            text: "Wir haben immer einen Plan B in der Tasche. Ob Hausarzt oder die Tochter in München – wir wissen exakt, wen wir anrufen müssen, falls der Kreislauf mal unerwartet meckert."
        },
        {
            title: "Klipp & Klar dokumentiert",
            text: "Keine versteckten Klauseln, keine Überraschungen. Wir dokumentieren unsere Besuche für Sie und Ihre Angehörigen. So wissen Ihre Liebsten immer, was wir so treiben (Spoiler: meistens helfen, oft auch einfach nur zuhören)."
        }
    ];
}

export function getCooperationScenarios() {
    return [
        {
            tag: "Clever vorsorgen",
            title: "Hilfe, bevor es stressig wird",
            text: "Warum erst warten, bis der Papierstapel auf dem Tisch umkippt? Wir steigen ein, wenn es anfängt zu knirschen. So behalten Sie souverän das Ruder in der Hand."
        },
        {
            tag: "Teamwork",
            title: "Wir arbeiten Hand in Hand",
            text: "Sie haben schon einen Betreuer? Wunderbar! Der kümmert sich um die trockenen Paragraphen, und wir bringen die menschliche Wärme in den Alltag. Ein echtes Traumteam."
        },
        {
            tag: "Sondersituationen",
            title: "Die Spezialeinheit für Akutes",
            text: "Plötzlich muss es schnell gehen: Ein Krankenhausaufenthalt oder ein Umzug steht an. Wir packen sofort mit an, erledigen die endlosen To-Do-Listen und bewahren für Sie die rettende Übersicht."
        }
    ];
}

export function getTeamMembers() {
    return [
        { 
            name: "Tommy Jenzsch", 
            initial: "T", 
            region: "Halle (Saale)", 
            phone: "0151 57515432",
            avatar: "/team/tommy.jpg",
            avatarUrl: "/team/tommy.jpg"
        },
        { 
            name: "Doreen Jenzsch", 
            initial: "D", 
            region: "Lutherstadt Wittenberg", 
            phone: "0160 7303830",
            avatar: "/team/doreen.jpg",
            avatarUrl: "/team/doreen.jpg"
        }
    ];
}

export function getFaqs() {
    return [
        {
            question: "Was ist Seniorenassistenz eigentlich?",
            answerLines: [
                "Wir nehmen Ihnen nicht das Steuer aus der Hand. <strong>Sie sind der Kapitän, wir sind der Navigator.</strong>",
                "Wir sind Ihre motivierte rechte Hand: Wir organisieren, begleiten und unterstützen Sie bei genau den Vorhaben, die Sie sich wünschen."
            ]
        },
        {
            question: "Übernimmt die Pflegekasse die Kosten für die Seniorenassistenz?",
            answerLines: [
                "<strong>Ja, in den allermeisten Fällen vollständig!</strong> Liegt ein Pflegegrad (1 bis 5) vor, haben Sie gesetzlichen Anspruch auf den monatlichen Entlastungsbetrag von <strong>131 Euro (§ 45b SGB XI)</strong>.",
                "Ab Pflegegrad 2 kann zudem das jährliche Budget der <strong>Verhinderungspflege (§ 39 SGB XI)</strong> genutzt werden. Als anerkannter Dienstleister rechnen wir direkt mit Ihrer Pflegekasse ab – Sie müssen nicht in Vorkasse gehen. Haben Sie noch keinen Pflegegrad, begleiten wir Sie gerne kostenfrei bei der Antragstellung!"
            ]
        },
        {
            question: "Kommen Sie auch zu mir nach Hause?",
            answerLines: [
                "<strong>Aber natürlich!</strong> Unsere Dienstleistung findet genau dort statt, wo das Leben gerade spielt.",
                "Wir kommen zu Ihnen nach Hause an den Küchentisch, treffen uns im Café um die Ecke, begleiten Sie zum Arzt oder gehen gemeinsam einkaufen."
            ]
        },
        {
            question: "Was passiert, wenn mal was schiefgeht?",
            answerLines: [
                "Falls uns mal eine wertvolle Ming-Vase aus der Hand rutscht (was wir natürlich nicht hoffen!): Zu Ihrer und unserer Sicherheit verfügen wir über eine umfassende Betriebshaftpflichtversicherung. So können wir alle stets ruhig schlafen."
            ]
        }
    ];
}

export function getLegalContent() {
    return {
        impressum: `
            <h3>Impressum</h3>
            <p><strong>Angaben gemäß § 5 TMG:</strong></p>
            <p>Ihre Seniorenassistenz<br>
            Dreyhauptstraße 2<br>
            06108 Halle (Saale)</p>
            
            <p><strong>Vertreten durch:</strong><br>
            Tommy Jenzsch</p>
            
            <p><strong>Kontakt:</strong><br>
            Telefon: 0151 / 57515432<br>
            E-Mail: info@ihre-seniorenassistenz.com</p>

            <!-- <p><strong>Berufshaftpflichtversicherung:</strong><br>
            [Name und Sitz der Versicherung] (Bitte anpassen)<br>
            Geltungsraum der Versicherung: Deutschland</p> -->

        `,
        datenschutz: `
            <h3>Datenschutzerklärung</h3>
            <h4>1. Datenschutz auf einen Blick</h4>
            <p><strong>Allgemeine Hinweise</strong><br>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen oder unsere Dienstleistungen in Anspruch nehmen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>

            <h4>2. Datenerfassung auf dieser Website</h4>
            <p><strong>Wer ist verantwortlich für die Datenerfassung?</strong><br>
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum entnehmen.</p>
            <p><strong>Wie erfassen wir Ihre Daten?</strong><br>
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie uns per E-Mail oder Telefon übermitteln. Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).</p>

            <h4>3. Zwecke der Datenverarbeitung & Rechtsgrundlagen</h4>
            <p>Wir verarbeiten Ihre Daten für die Anbahnung und Durchführung unserer Assistenzleistungen. Rechtsgrundlagen hierfür sind Art. 6 Abs. 1 lit. a (Einwilligung), b (Vertragserfüllung) sowie für Gesundheitsdaten Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung).</p>

            <h4>4. Ihre Rechte</h4>
            <p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese jederzeit für die Zukunft widerrufen.</p>

            <h4>5. Nutzung von Google-Nutzerdaten &amp; Google API Services User Data Policy</h4>
            <p>Unsere Anwendung bietet optionale Funktionen zur Authentifizierung via Google OAuth („Über Google anmelden“) sowie zur Kalendersynchronisation über die Google Calendar API an.</p>
            <p><strong>Welche Daten erfasst werden:</strong> Bei der Anmeldung über Google fragen wir grundlegende Profildaten (Ihre E-Mail-Adresse und Ihren Namen) ab, um Ihr Nutzerkonto eindeutig zu identifizieren. Sofern Sie die Kalender-Synchronisation aktivieren, synchronisieren wir Ihre bei uns gebuchten Seniorenassistenz-Termine mit Ihrem Google Kalender.</p>
            <p><strong>Zweck der Datenverarbeitung:</strong> Die Nutzung der Google-Daten dient ausschließlich der sicheren Benutzeranmeldung sowie der ordnungsgemäßen Bereitstellung und Koordination Ihrer Assistenztermine.</p>
            <p><strong>Schutz und Weitergabe Ihrer Daten:</strong> Ihre Google-Nutzerdaten werden von uns niemals an Dritte weitergegeben, niemals für Werbe- oder Marketingzwecke verwendet und unter keinen Umständen für das Training von künstlicher Intelligenz (KI) oder Machine-Learning-Modellen genutzt.</p>
            <p><strong>Google Limited Use Erklärung:</strong> Die Verwendung von Informationen, die von Google APIs empfangen werden, entspricht vollständig der <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline">Google API Services User Data Policy</a>, einschließlich der Anforderungen für die eingeschränkte Nutzung (Limited Use requirements).</p>
        `
    };
}