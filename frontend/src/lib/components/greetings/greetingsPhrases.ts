export interface HolidayGreeting {
    name: string;
    emoji: string;
    phrases: string[];
}

export const HOLIDAY_PHRASES: Record<string, HolidayGreeting> = {
    christmas: {
        name: "Fröhliche Weihnachten",
        emoji: "🎄",
        phrases: [
            "Weihnachten: Das Fest der Liebe und der überfüllten Postfächer.",
            "Plätzchen essen ist auch eine Leistung. Mach weiter so!",
            "Wenn du das hier liest, flüchtest du wohl gerade vor der Verwandtschaft.",
            "Frohes Fest! Hoffentlich war dein Geschenk besser als deine To-Do-Liste.",
            "Arbeiten an Weihnachten? Das Christkind notiert sich das auf der roten Liste.",
            "Ho, ho, hol mich hier raus!",
            "Stille Nacht? Von wegen, die Deadlines schreien noch.",
            "Spekulatiuskrümel in der Tastatur sind ein legitimer Kündigungsgrund.",
            "Der Baum brennt, die Server hoffentlich nicht.",
            "Glühwein in der Kaffeetasse? Ich verrate dich nicht."
        ]
    },
    silvester: {
        name: "Guten Rutsch",
        emoji: "🥂",
        phrases: [
            "Guten Rutsch! Aber bitte nicht auf der Tastatur ausrutschen.",
            "Das Jahr ist fast rum. Du kannst jetzt aufhören, so zu tun, als würdest du arbeiten.",
            "Vorsätze für nächstes Jahr: Weniger E-Mails, mehr Kaffee.",
            "Lass die Korken knallen – aber bitte nicht die Server!",
            "Heute noch arbeiten? Respekt. Oder einfach nur mein Beileid.",
            "Das alte Jahr loggt sich aus. Und du solltest das auch bald tun!",
            "Ein weiteres Jahr erfolgreich so getan, als wüssten wir, was wir tun."
        ]
    },
    newYear: {
        name: "Frohes Neues Jahr",
        emoji: "🍀",
        phrases: [
            "Frohes Neues! Die Kopfschmerzen ignorieren wir heute einfach.",
            "Neues Jahr, neue Klienten-Dramen. Auf geht's!",
            "Tag 1 von 365. Zeit, die Vorsätze von gestern direkt wieder zu brechen.",
            "Willkommen im neuen Jahr! Der Kaffee schmeckt leider immer noch wie gestern.",
            "Dieses Jahr wird alles besser. Außer dem Papierkram, der bleibt."
        ]
    },
    halloween: {
        name: "Happy Halloween",
        emoji: "🎃",
        phrases: [
            "Süßes oder Saures? Das System hat sich für Saures entschieden.",
            "Das Einzige, was gruseliger ist als Geister, ist deine heutige To-Do-Liste.",
            "Versteck dich lieber, die Deadline kommt verkleidet als Zombie!",
            "Happy Halloween! Zeit, die Leichen aus dem Aktenkeller zu holen.",
            "Buh! Keine Sorge, es ist nur eine neue Terminanfrage."
        ]
    },
    valentine: {
        name: "Schönen Valentinstag",
        emoji: "💘",
        phrases: [
            "Rosen sind rot, Veilchen sind blau, dein Kalender ist voll, oh wow.",
            "Heute schon dem Server gesagt, dass du ihn liebst? Nein? Dann wunder dich nicht.",
            "Ein guter Tag, um eine innige Beziehung mit dem Kaffeevollautomaten zu beginnen.",
            "Happy Valentinstag! Dein wahrer Seelenverwandter ist ohnehin dein Bürostuhl."
        ]
    },
    aprilFools: {
        name: "April, April",
        emoji: "🤡",
        phrases: [
            "April, April! Alle deine Daten wurden soeben gelöscht... Spaß.",
            "Dein Chef hat gerade dein Gehalt verdoppelt. April, April!",
            "Heute keine dummen Scherze. Der Papierkram ist schon Scherz genug.",
            "Vertraue heute absolut niemandem. Nicht mal dieser Begrüßung."
        ]
    },
    starWars: {
        name: "May the 4th",
        emoji: "⚔️",
        phrases: [
            "Möge die Macht mit dir sein. Du wirst sie heute brauchen.",
            "Das Imperium schlägt zurück, aber deine To-Do-Liste ist schlimmer.",
            "Komm auf die dunkle Seite. Wir haben Kekse und keine Termine.",
            "May the 4th be with you! Auf in den intergalaktischen Aktenkampf."
        ]
    }
};

export const TIME_PHRASES = {
    morning: {
        greeting: "Guten Morgen",
        emoji: "☕",
        phrases: [
            "Guten Morgen! Der Kaffee läuft, der Wille noch nicht so ganz.",
            "Willkommen zurück! Der alltägliche Wahnsinn hat dich schon vermisst.",
            "Früher Vogel und so weiter. Hol dir erstmal Koffein, bevor du etwas kaputt machst.",
            "Morgen! Keine Sorge, ich bin auch noch nicht richtig hochgefahren.",
            "Schön, dass du da bist. Die Probleme haben sich über Nacht leider nicht selbst gelöst."
        ]
    },
    lunch: {
        greeting: "Mahlzeit",
        emoji: "🍽️",
        phrases: [
            "Mahlzeit! Zeit für Kalorien, damit das Gehirn wieder anspringt.",
            "Mittagstief? Ein perfekter Zeitpunkt, um wichtige Entscheidungen auf morgen zu verschieben.",
            "Iss was Vernünftiges, du musst den Rest des Tages irgendwie noch überleben.",
            "Zeit für das Food-Koma. Danach wird nur noch blind auf die Tastatur gehackt."
        ]
    },
    afternoon: {
        greeting: "Guten Nachmittag",
        emoji: "🚀",
        phrases: [
            "Guten Nachmittag! Nur noch ein paar Stunden so tun, als wärst du beschäftigt.",
            "Das Nachmittagstief schlägt unerbittlich zu. Zeit für den dritten Espresso.",
            "Endspurt! Schieb einfach alles, was heute nervt, elegant auf morgen.",
            "Halt durch, der Feierabend ist theoretisch bereits in Sichtweite."
        ]
    },
    evening: {
        greeting: "Guten Abend",
        emoji: "🌙",
        phrases: [
            "Guten Abend! Dass du noch hier bist, grenzt leicht an Workoholismus.",
            "Überstunden? Ich hoffe, die werden wenigstens mit Pizza bezahlt.",
            "Feierabend ist, wenn man aufhört zu tippen. Denk mal in Ruhe drüber nach.",
            "Lass den Laptop in Frieden. Er hat heute auch schon genug gelitten."
        ]
    },
    night: {
        greeting: "Gute Nacht",
        emoji: "🦉",
        phrases: [
            "Bist du ein Vampir oder hast du einfach kein Privatleben?",
            "Schlaf wird sowieso völlig überbewertet. Weiter geht's!",
            "Die Eulen sind los. Geh ins Bett, bevor du aus Müdigkeit Fehler einbaust.",
            "Gute Nacht! Schalt ab, morgen ist auch noch ein Tag."
        ]
    }
};

export const WEEKDAY_PHRASES: Record<number, string[]> = {
    1: [
        "Montag. Der Tag, an dem der Kaffee immer am schwächsten zu sein scheint.",
        "Neuer Montag, neue Probleme. Tun wir alle mal so, als wären wir motiviert.",
        "Überlebenstipp für Montage: Tief durchatmen und unnötigen Augenkontakt vermeiden.",
        "Möge dein Kaffee heute besonders stark und dein Montag besonders kurz sein."
    ],
    2: [
        "Dienstag: Der hässliche, ignorierte kleine Bruder vom Montag.",
        "Noch nicht mal Bergfest. Das ist zutiefst deprimierend.",
        "Immerhin ist es nicht mehr Montag. Man muss sich auch über die kleinen Dinge freuen."
    ],
    3: [
        "Bergfest! Ab jetzt geht es nur noch bergab. Hoffentlich nicht im wörtlichen Sinn.",
        "Mittwoch: Zu spät, um krank zu feiern, zu früh für's Wochenende.",
        "Die Hälfte ist geschafft. Der Rest der Woche ist reines Durchhaltevermögen."
    ],
    4: [
        "Vize-Freitag! Wir können das Wochenende schon fast riechen.",
        "Donnerstag: Der Tag, an dem man plant, was man am Freitag alles auf Montag schiebt.",
        "Fast geschafft. Lass uns den Donnerstag einfach getrost ignorieren."
    ],
    5: [
        "Freitag ab eins macht jeder seins. Außer du, du arbeitest anscheinend noch.",
        "Das Wochenende riecht schon fast so gut wie frischer Kaffee.",
        "Hoch die Hände, Wochenende! Aber erst nach diesem allerletzten Ticket.",
        "TGIF! Und jetzt ab in den Feierabend, bevor noch jemand auf dumme Ideen kommt!"
    ],
    6: [
        "Es ist Wochenende. Was genau machst du hier? Hast du gar keine Hobbys?",
        "Wochenendarbeit? Ich hoffe, dein Chef weiß das zu schätzen... oh warte, du bist der Chef.",
        "Geh raus in die Natur. Das Ding mit den Bäumen und dem echten Licht."
    ],
    0: [
        "Es ist Sonntag. Schließ den Browser-Tab und genieß den Tag!",
        "Die Server brauchen auch mal ihre Ruhepause. Und du erst recht.",
        "Solltest du nicht eigentlich auf dem Sofa liegen und extrem produktiv nichts tun?"
    ]
};
