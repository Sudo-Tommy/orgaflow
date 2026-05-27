<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from 'svelte';

    let userName = $state('');
    let greeting = $state('');
    let subGreeting = $state('');
    let emoji = $state('👋');

    onMount(() => {
        const user = pb.authStore.record || pb.authStore.model;
        userName = user?.name_first || user?.name || 'Chef';
        generateGreeting();
    });

    function generateGreeting() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sonntag, ..., 6 = Samstag
        const month = now.getMonth() + 1; // 1-12
        const date = now.getDate();

        let phrases: string[] = [];

        // --- 1. FEIER- UND AKTIONSTAGE ---
        if (month === 12 && date >= 24 && date <= 26) {
            greeting = "Fröhliche Weihnachten";
            emoji = "🎄";
            phrases = [
                "Weihnachten: Das Fest der Liebe und der überfüllten Postfächer.",
                "Plätzchen essen ist auch eine Leistung. Mach weiter so!",
                "Wenn du das hier liest, flüchtest du wohl gerade vor der Verwandtschaft.",
                "Frohes Fest! Hoffentlich war dein Geschenk besser als deine To-Do-Liste.",
                "Arbeiten an Weihnachten? Das Christkind notiert sich das auf der roten Liste.",
                "Ho, ho, hol mich hier raus!",
                "Stille Nacht? Von wegen, die Deadlines schreien noch.",
                "Spekulatiuskrümel in der Tastatur sind ein legitimer Kündigungsgrund.",
                "Der Baum brennt, die Server hoffentlich nicht.",
                "Falls dich jemand fragt: Du 'optimierst' gerade den Weihnachtsmann-Workflow.",
                "Glühwein in der Kaffeetasse? Ich verrate dich nicht."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 12 && date === 31) {
            greeting = "Guten Rutsch";
            emoji = "🥂";
            phrases = [
                "Guten Rutsch! Aber bitte nicht auf der Tastatur ausrutschen.",
                "Das Jahr ist fast rum. Du kannst jetzt aufhören, so zu tun, als würdest du arbeiten.",
                "Vorsätze für nächstes Jahr: Weniger E-Mails, mehr Kaffee.",
                "Zeit, die Fehler dieses Jahres elegant unter den Teppich zu kehren.",
                "Lass die Korken knallen – aber bitte nicht die Server!",
                "Heute noch arbeiten? Respekt. Oder einfach nur mein Beileid.",
                "Das alte Jahr loggt sich aus. Und du solltest das auch bald tun!",
                "Gleich gibt's Raketen. Bis dahin gibt's noch Tickets und Termine.",
                "Das einzige, was heute noch abstürzen darf, ist die Hemmschwelle beim Sekt.",
                "Ein weiteres Jahr erfolgreich so getan, als wüssten wir, was wir tun."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 1 && date === 1) {
            greeting = "Frohes Neues Jahr";
            emoji = "🍀";
            phrases = [
                "Frohes Neues! Die Kopfschmerzen ignorieren wir heute einfach.",
                "Neues Jahr, neue Klienten-Dramen. Auf geht's!",
                "Tag 1 von 365. Zeit, die Vorsätze von gestern direkt wieder zu brechen.",
                "Bist du wirklich schon wach oder ist das nur ein Reflex?",
                "Willkommen im neuen Jahr! Der Kaffee schmeckt leider immer noch wie gestern.",
                "Hast du das Backup von letztem Jahr noch? Gut.",
                "Ich hoffe, dein Aspirinvorrat reicht für diesen Schichtbeginn.",
                "Neues Jahr, alte Passwörter. Wie immer.",
                "Dieses Jahr wird alles besser. Außer dem Papierkram, der bleibt.",
                "Das Neujahrsbaby weint. Dein Posteingang auch."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 10 && date === 31) {
            greeting = "Happy Halloween";
            emoji = "🎃";
            phrases = [
                "Süßes oder Saures? Das System hat sich für Saures entschieden.",
                "Das Einzige, was gruseliger ist als Geister, ist deine heutige To-Do-Liste.",
                "Versteck dich lieber, die Deadline kommt verkleidet als Zombie!",
                "Happy Halloween! Zeit, die Leichen aus dem Aktenkeller zu holen.",
                "Hoffentlich ist dein Kostüm besser als die Ausreden deiner Klienten.",
                "Buh! Keine Sorge, es ist nur eine neue Terminanfrage.",
                "Manche Akten sind echter Horror. Viel Spaß beim Wühlen.",
                "Heute darfst du auch mal wie ein Vampir vor dem Tageslicht fliehen.",
                "Kürbissuppe tröstet über den E-Mail-Berg hinweg.",
                "Keine Panik, die Spinnweben am Monitor sind nur Deko... hoffentlich.",
                "Der Server heult wie ein Werwolf. Ach nee, das war nur der Lüfter."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 2 && date === 14) {
            greeting = "Schönen Valentinstag";
            emoji = "💘";
            phrases = [
                "Rosen sind rot, Veilchen sind blau, dein Kalender ist voll, oh wow.",
                "Heute schon dem Server gesagt, dass du ihn liebst? Nein? Dann wunder dich nicht.",
                "Ein guter Tag, um eine innige Beziehung mit dem Kaffeevollautomaten zu beginnen.",
                "Wer braucht schon Pralinen, wenn man unerledigte Aufgaben haben kann?",
                "Verteile heute Liebe... oder zumindest keine knallharten Absagen.",
                "Happy Valentinstag! Dein wahrer Seelenverwandter ist ohnehin dein Bürostuhl.",
                "Echte Romantik ist, wenn niemand anruft und etwas will.",
                "Schicke eine Liebeserklärung an den IT-Support, die können es brauchen.",
                "Blumen verwelken, aber dieses Dashboard bleibt dir ewig treu.",
                "Liebe liegt in der Luft. Oder ist das nur brennender Kabelschmutz?"
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 4 && date === 1) {
            greeting = "April, April";
            emoji = "🤡";
            phrases = [
                "April, April! Alle deine Daten wurden soeben gelöscht... Spaß.",
                "Dein Chef hat gerade dein Gehalt verdoppelt. April, April!",
                "Heute keine dummen Scherze. Der Papierkram ist schon Scherz genug.",
                "Ich wollte dir heute frei geben. Aber leider ist ja der 1. April.",
                "Vertraue heute absolut niemandem. Nicht mal dieser Begrüßung.",
                "Hast du geprüft, ob der Kaffee heute echt ist?",
                "Glückwunsch zur Beförderung!... April, April, setz dich wieder hin.",
                "Alle Termine wurden storniert. Schön wär's, was?",
                "Heute ist Scherzkeks-Tag. Bitte lach wenigstens über deine eigenen Fehler.",
                "Dein System-Update löscht gleich die Festplatte... April, April, es passiert sowieso nichts!"
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 5 && date === 4) {
            greeting = "May the 4th";
            emoji = "⚔️";
            phrases = [
                "Möge die Macht mit dir sein. Du wirst sie heute brauchen.",
                "Das Imperium schlägt zurück, aber deine To-Do-Liste ist schlimmer.",
                "Ich bin dein Vater... äh, dein OrgaFlow-System.",
                "Nutze die Macht, um die E-Mails zu ignorieren.",
                "Komm auf die dunkle Seite. Wir haben Kekse und keine Termine.",
                "Fühle die Macht... oder den massiven Koffeinschock. Eins von beidem.",
                "Mögen die Server heute stabil bleiben, junger Padawan.",
                "Chewbacca hat angerufen. Er versteht deine Notizen auch nicht.",
                "Diese Droiden suchst du nicht. Such lieber den Weg in den Feierabend.",
                "May the 4th be with you! Auf in den intergalaktischen Aktenkampf."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }

        // --- 2. TAGESZEITEN ---
        if (hour >= 4 && hour < 11) {
            greeting = "Guten Morgen";
            emoji = "☕";
            phrases = [
                "Guten Morgen! Der Kaffee läuft, der Wille noch nicht so ganz.",
                "Willkommen zurück! Der alltägliche Wahnsinn hat dich schon vermisst.",
                "Gähn... lass uns einfach so tun, als wären wir heute hochproduktiv.",
                "Früher Vogel und so weiter. Hol dir erstmal Koffein, bevor du etwas kaputt machst.",
                "Morgen! Keine Sorge, ich bin auch noch nicht richtig hochgefahren.",
                "Schön, dass du da bist. Die Probleme haben sich über Nacht leider nicht selbst gelöst.",
                "Wer hat eigentlich die morgendliche Motivation erfunden? Ein Sadist vermutlich.",
                "Der frühe Vogel kann mich mal... aber so richtig.",
                "Ich sehe, du hast den Weg zum Rechner gefunden. Herzlichen Glückwunsch.",
                "Dein Kaffee weint schon, weil du ihn ignorierst.",
                "Morgenstund hat Gold im Mund. Und bei uns Augenringe bis zum Kinn."
            ];
        } else if (hour >= 11 && hour < 14) {
            greeting = "Mahlzeit";
            emoji = "🍽️";
            phrases = [
                "Mahlzeit! Zeit für Kalorien, damit das Gehirn wieder anspringt.",
                "Mittagstief? Ein perfekter Zeitpunkt, um wichtige Entscheidungen auf morgen zu verschieben.",
                "Iss was Vernünftiges, du musst den Rest des Tages irgendwie noch überleben.",
                "Nahrung aufnehmen, lächeln, weiterarbeiten. Du kennst das Spiel.",
                "Falls du es vergessen hast: Atmen und Essen stehen heute auch auf der To-Do-Liste.",
                "Zeit für das Food-Koma. Danach wird nur noch blind auf die Tastatur gehackt.",
                "Hunger macht böse. Iss was, bevor noch ein Klient anruft!",
                "Die beste Zeit des Tages: 60 Minuten legales Nichtstun.",
                "Mittagspause: Die kleine Illusion, dass der Nachmittag besser wird.",
                "Falls du das hier statt einer Mahlzeit liest: Bitte deine Prioritäten überdenken!"
            ];
        } else if (hour >= 14 && hour < 18) {
            greeting = "Guten Nachmittag";
            emoji = "🚀";
            phrases = [
                "Guten Nachmittag! Nur noch ein paar Stunden so tun, als wärst du beschäftigt.",
                "Das Nachmittagstief schlägt unerbittlich zu. Zeit für den dritten Espresso.",
                "Endspurt! Schieb einfach alles, was heute nervt, elegant auf morgen.",
                "Noch wach? Sehr gut. Dann können wir ja noch etwas wegarbeiten.",
                "Nachmittags-Motivation ist ein Mythos. Halt einfach durch.",
                "Willkommen im Tal der Tränen. Es ist Nachmittag.",
                "Der Moment, wenn der Kaffee aufhört zu wirken und die Realität zurückschlägt.",
                "Halt durch, der Feierabend ist theoretisch bereits in Sichtweite.",
                "Jetzt bloß keinen Blick mehr in den Posteingang werfen. Das verdirbt den Tag.",
                "Nachmittagstief? Ein kurzes Nickerchen unter dem Schreibtisch merkt niemand.",
                "Zeit für die wichtigste Frage des Tages: Wann kann ich gehen?"
            ];
        } else if (hour >= 18 && hour < 22) {
            greeting = "Guten Abend";
            emoji = "🌙";
            phrases = [
                "Guten Abend! Dass du noch hier bist, grenzt leicht an Workoholismus.",
                "Überstunden? Ich hoffe, die werden wenigstens mit Pizza bezahlt.",
                "Feierabend ist, wenn man aufhört zu tippen. Denk mal in Ruhe drüber nach.",
                "Lass den Laptop in Frieden. Er hat heute auch schon genug gelitten.",
                "Draußen wird es dunkel. Ein dezenter Hinweis, dass man nach Hause gehen sollte.",
                "Vampire und OrgaFlow-Mitarbeiter... beide werden anscheinend nachts aktiv.",
                "Die Sonne ist weg. Du solltest das langsam auch sein.",
                "Spätschicht? Ich hoffe, du bekommst eine Tapferkeitsmedaille.",
                "Das Büro ruft nicht mehr. Warum antwortest du ihm noch?",
                "Wer jetzt noch arbeitet, hat entweder Großes vor oder die Kontrolle verloren.",
                "Dein Privatleben hat vorhin eine Vermisstenanzeige aufgegeben."
            ];
        } else {
            greeting = "Gute Nacht";
            emoji = "🦉";
            phrases = [
                "Bist du ein Vampir oder hast du einfach kein Privatleben?",
                "Schlaf wird sowieso völlig überbewertet. Weiter geht's!",
                "Die Eulen sind los. Geh ins Bett, bevor du aus Müdigkeit Fehler einbaust.",
                "Mitten in der Nacht arbeiten? Der Server urteilt nicht, aber ich tue es schon.",
                "Gute Nacht! Schalt ab, morgen ist auch noch ein Tag zum Leiden.",
                "Schichtarbeiter oder akute Schlafstörung? Ich urteile nicht.",
                "Nachts sind alle Termine grau. Und nervig.",
                "Go to sleep! Dein Gehirn arbeitet eh nur noch auf 5%.",
                "Willst du jetzt noch was kaputt machen, damit die Frühschicht was zu tun hat?",
                "Ruhe bewahren, dunkel machen, Monitor aus. Los jetzt!",
                "Ich verrate niemanden, dass du um diese unheilige Uhrzeit noch online bist."
            ];
        }

        // --- 3. WOCHENTAGE (Ersetzen die tageszeitabhängigen Phrasen zur Abwechslung) ---
        if (day === 1 && hour < 14) {
            phrases = [
                "Montag. Der Tag, an dem der Kaffee immer am schwächsten zu sein scheint.",
                "Neuer Montag, neue Probleme. Tun wir alle mal so, als wären wir motiviert.",
                "Überlebenstipp für Montage: Tief durchatmen und unnötigen Augenkontakt vermeiden.",
                "Willkommen am Montag. Das Wochenende war wie gewohnt viel zu kurz.",
                "Lass uns den heutigen Montag einfach schnell und extrem schmerzlos hinter uns bringen.",
                "Montage sollten prinzipiell optional sein.",
                "Mein Beileid, es ist schon wieder passiert. Eine neue Woche.",
                "Wenn Montage Schuhe wären, wären sie definitiv Crocs.",
                "Kaffee intravenös, bitte! Es ist verdammt nochmal Montag.",
                "Möge dein Kaffee heute besonders stark und dein Montag besonders kurz sein.",
                "Ich würde dir ja einen schönen Montag wünschen, aber wir wissen beide, das wäre gelogen."
            ];
        }
        if (day === 2) {
            phrases = [
                "Dienstag: Der hässliche, ignorierte kleine Bruder vom Montag.",
                "Noch nicht mal Bergfest. Das ist zutiefst deprimierend.",
                "Dienstage sind eigentlich wie Montage, nur ohne das Wochenende als gute Ausrede.",
                "Willkommen zu Tag 2 der wöchentlichen Geiselhaft.",
                "Immerhin ist es nicht mehr Montag. Man muss sich auch über die kleinen Dinge freuen.",
                "Dienstag: Du bist noch immer hier. Meinen allergrößten Respekt.",
                "Die Woche zieht sich jetzt schon wie Kaugummi, oder?",
                "Dienstag ist der Tag, an dem man merkt, dass der Freitag noch verdammt ewig weg ist.",
                "Wer hat eigentlich den Dienstag erfunden? Völlig überflüssig.",
                "Halte durch. Irgendwann muss diese endlose Woche ja mal enden."
            ];
        }
        if (day === 3) {
            phrases = [
                "Bergfest! Ab jetzt geht es nur noch bergab. Hoffentlich nicht im wörtlichen Sinn.",
                "Mittwoch: Zu spät, um krank zu feiern, zu früh für's Wochenende.",
                "Die Hälfte ist geschafft. Der Rest der Woche ist reines Durchhaltevermögen.",
                "Herzlichen Glückwunsch, du hast bis zum ersehnten Mittwoch überlebt!",
                "Mittwoch ist wie der mittlere Sitz im Flugzeug. Keiner mag ihn, man muss da durch.",
                "Bergfest! Ab jetzt rollen wir nur noch entspannt bergab.",
                "Mittwoch: Das Wochenende ist am Horizont als winzig kleiner Punkt erkennbar.",
                "Die schlechte Nachricht: Erst Mittwoch. Die gute: Schon Mittwoch!",
                "Mittwoch ist wie ein Pflaster: Man klebt irgendwie so blöd dazwischen.",
                "Feier das Bergfest nicht zu hart, morgen ist leider immer noch ein Arbeitstag.",
                "Wusa! Die erste Hälfte des Wahnsinns liegt erfolgreich hinter dir."
            ];
        }
        if (day === 4) {
            phrases = [
                "Vize-Freitag! Wir können das Wochenende schon fast riechen.",
                "Donnerstag: Der Tag, an dem man plant, was man am Freitag alles auf Montag schiebt.",
                "Donnerstag ist auch nur ein Freitag, der sich absolut nicht richtig Mühe gibt.",
                "Vize-Freitag, Baby! Zeit, so langsam die Arbeit einzustellen.",
                "Halte durch, morgen darfst du völlig offiziell müde sein.",
                "Der Donnerstag bereitet dich mental schon mal auf den heiligen Freitag vor.",
                "Wenn heute schon Donnerstag ist... wo zur Hölle ist dann die Woche geblieben?",
                "Fast geschafft. Lass uns den Donnerstag einfach getrost ignorieren.",
                "Mach dir keinen Stress mehr, ist ja schließlich schon Vize-Freitag.",
                "Donnerstage sind super. Sie bedeuten schlichtweg, dass morgen Freitag ist."
            ];
        }
        if (day === 5 && hour >= 12) {
            emoji = "🎉";
            phrases = [
                "Freitag ab eins macht jeder seins. Außer du, du arbeitest anscheinend noch.",
                "Das Wochenende riecht schon fast so gut wie frischer Kaffee.",
                "Achtung: Beginne jetzt keine neuen Projekte mehr. Das ist ein ungeschriebenes Freitags-Gesetz.",
                "Nur noch ein bisschen durchhalten, dann darfst du auf dem heimischen Sofa zusammenbrechen.",
                "Hoch die Hände, Wochenende! Aber erst nach diesem allerletzten Ticket.",
                "Freitag! Mein zweitliebstes Wort mit F. Gleich nach Feierabend.",
                "Heute wird definitiv nur noch das Nötigste gemacht. Also eigentlich nichts.",
                "Freitag: Der Tag, an dem die Motivation offiziell ins Wochenende verabschiedet wird.",
                "Falls dich heute noch jemand was fragt: Du bist offiziell im Tunnel.",
                "TGIF! Und jetzt ab in den Feierabend, bevor noch jemand auf dumme Ideen kommt!",
                "Der Feierabend-Countdown läuft. Nicht jetzt noch aus Versehen alles kaputt machen!"
            ];
        }
        if (day === 0 || day === 6) {
            emoji = "🛋️";
            phrases = [
                "Es ist Wochenende. Was genau machst du hier? Hast du gar keine Hobbys?",
                "Wochenendarbeit? Ich hoffe, dein Chef weiß das zu schätzen... oh warte, du bist der Chef.",
                "Geh raus in die Natur. Das Ding mit den Bäumen und dem echten Licht.",
                "Solltest du nicht eigentlich auf dem Sofa liegen und extrem produktiv nichts tun?",
                "Respekt für deinen ungebremsten Fleiß! Aber ernsthaft, klapp das Ding nun zu.",
                "Es ist Wochenende. Schließ den Browser-Tab. Sofort!",
                "Arbeiten am Wochenende? Hast du irgendwie eine Wette verloren?",
                "Wochenende! Zeit, den Browserverlauf zu löschen und das Leben zu genießen.",
                "Die Server brauchen auch mal ihre Ruhepause. Und du erst recht.",
                "Ich tue jetzt einfach mal so, als hätte ich dich hier überhaupt nicht gesehen.",
                "Geh schleunigst offline, bevor es noch jemand merkt und dir neue Aufgaben gibt."
            ];
        }

        subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
    }
</script>

<div class="mt-3 inline-flex items-center gap-4 bg-linear-to-r from-white to-brand-50/50 border border-brand-100/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow w-full">
    <div class="text-3xl md:text-4xl animate-waving-hand origin-bottom-right drop-shadow-sm">
        {emoji}
    </div>
    <div class="flex flex-col">
        <span class="text-lg md:text-xl font-black text-neutral-800 tracking-tight">
            {greeting}, <span class="text-brand-600">{userName}</span>!
        </span>
        <span class="text-sm font-bold text-neutral-500 mt-0.5 max-w-sm leading-tight">
            {subGreeting}
        </span>
    </div>
</div>

<style>
    .animate-waving-hand {
        animation: wave 2.5s infinite;
    }

    @keyframes wave {
        0% { transform: rotate(0deg); }
        10% { transform: rotate(14deg); }
        20% { transform: rotate(-8deg); }
        30% { transform: rotate(14deg); }
        40% { transform: rotate(-4deg); }
        50% { transform: rotate(10deg); }
        60%, 100% { transform: rotate(0deg); }
    }
</style>