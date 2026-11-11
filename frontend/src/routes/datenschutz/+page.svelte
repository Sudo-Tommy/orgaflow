<script lang="ts">
    import { getLegalContent } from "$lib/services/landingContentService";
    import { ArrowLeft, ShieldCheck, ExternalLink } from "lucide-svelte";

    const legal = getLegalContent();
</script>

<svelte:head>
    <title
        >Datenschutzerklärung | Seniorenassistenz OrgaFlow – Ihre
        Seniorenassistenz</title
    >
    <meta
        property="og:title"
        content="Datenschutzerklärung | Seniorenassistenz OrgaFlow"
    />
    <meta
        name="description"
        content="Datenschutzerklärung für Seniorenassistenz OrgaFlow (Ihre Seniorenassistenz) sowie Informationen zur Nutzung von Google API Services (Google Calendar, Google Drive, Gmail)."
    />
    <meta name="robots" content="index, follow" />
</svelte:head>

<div
    class="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans"
>
    <header
        class="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs"
    >
        <div
            class="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between"
        >
            <a
                href="/"
                class="inline-flex items-center gap-2 text-sm font-bold text-neutral-700 hover:text-indigo-600 transition-colors"
            >
                <ArrowLeft class="w-4 h-4" />
                Zurück zur Startseite
            </a>
            <div class="flex items-center gap-4 text-xs font-semibold">
                <a
                    href="/impressum"
                    class="text-neutral-500 hover:text-neutral-900 transition-colors"
                    >Impressum</a
                >
                <span class="text-neutral-300">|</span>
                <a
                    href="/portal"
                    class="text-indigo-600 hover:text-indigo-700 transition-colors"
                    >Klienten-Portal 🔐</a
                >
            </div>
        </div>
    </header>

    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div
            class="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm space-y-8"
        >
            <div class="border-b border-neutral-100 pb-6">
                <div
                    class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-3 border border-emerald-100"
                >
                    <ShieldCheck class="w-3.5 h-3.5" /> DSGVO &amp; Google API konform
                    · Seniorenassistenz OrgaFlow
                </div>
                <h1
                    class="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight"
                >
                    Datenschutzerklärung – Seniorenassistenz OrgaFlow
                </h1>
                <p class="text-sm text-neutral-500 mt-2">
                    Gültig für den Dienst <strong
                        >Seniorenassistenz OrgaFlow</strong
                    >
                    / <strong>Ihre Seniorenassistenz</strong> (ihre-seniorenassistenz.com).
                </p>
            </div>

            <div
                class="prose prose-neutral max-w-none text-sm leading-relaxed text-neutral-700 space-y-6"
            >
                {@html legal.datenschutz}
            </div>

            <div
                class="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-6 sm:p-8 space-y-4"
            >
                <div class="flex items-center gap-2.5">
                    <span class="text-xl">🌐</span>
                    <h3
                        class="text-base sm:text-lg font-bold text-neutral-900 m-0"
                    >
                        Zusatzvereinbarung für Seniorenassistenz OrgaFlow:
                        Google API Services User Data Policy
                    </h3>
                </div>

                <p
                    class="text-xs sm:text-sm text-neutral-700 leading-relaxed m-0"
                >
                    Die Nutzung und Übertragung von Informationen, die durch die
                    Anwendung <strong>Seniorenassistenz OrgaFlow</strong> (über
                    <strong>ihre-seniorenassistenz.com</strong>) von Google APIs
                    empfangen werden, unterliegt in vollem Umfang den
                    Bestimmungen der
                    <a
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                    >
                        Google API Services User Data Policy <ExternalLink
                            class="w-3 h-3"
                        />
                    </a>, einschließlich der darin festgelegten
                    <strong
                        >Limited Use-Anforderungen (Eingeschränkte Nutzung)</strong
                    >.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div
                        class="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs"
                    >
                        <span
                            class="text-xs font-bold text-indigo-950 block mb-1"
                            >🔑 Authentifizierung &amp; E-Mail</span
                        >
                        <p class="text-xs text-neutral-600 m-0 leading-normal">
                            E-Mail-Adresse und Basis-Profildaten dienen der
                            eindeutigen Kontozuordnung sowie dem autorisierten
                            Versand von Dokumenten via Gmail API.
                        </p>
                    </div>
                    <div
                        class="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs"
                    >
                        <span
                            class="text-xs font-bold text-indigo-950 block mb-1"
                            >📅 Kalender-Synchronisation</span
                        >
                        <p class="text-xs text-neutral-600 m-0 leading-normal">
                            Kalenderberechtigungen dienen ausschließlich dem
                            Abgleich und der Anzeige vereinbarter
                            Betreuungstermine im persönlichen Google Kalender.
                        </p>
                    </div>
                    <div
                        class="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs"
                    >
                        <span
                            class="text-xs font-bold text-indigo-950 block mb-1"
                            >📁 Google Drive Dateiimport</span
                        >
                        <p class="text-xs text-neutral-600 m-0 leading-normal">
                            Der Lesezugriff auf Google Drive dient
                            ausschließlich dazu, vom Nutzer ausgewählte
                            Dokumente in Termine oder Klientenakten zu
                            übertragen.
                        </p>
                    </div>
                </div>

                <div
                    class="p-3.5 bg-white/80 rounded-xl border border-indigo-100 text-xs text-neutral-600"
                >
                    <strong>Garantie:</strong> Es findet keinerlei Weitergabe oder
                    Verkauf von Google-Nutzerdaten an Dritte, Werbenetzwerke oder
                    Analyseunternehmen statt. Google-Nutzerdaten werden unter keinen
                    Umständen für das Training von künstlicher Intelligenz (KI) oder
                    maschinellen Lernmodellen verwendet.
                </div>
            </div>
        </div>
    </main>

    <footer class="bg-white border-t border-neutral-200 py-6 mt-12">
        <div
            class="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-3"
        >
            <p>
                &copy; {new Date().getFullYear()} Seniorenassistenz OrgaFlow – Ihre
                Seniorenassistenz. Alle Rechte vorbehalten.
            </p>
            <div class="flex gap-4 font-medium">
                <a
                    href="/impressum"
                    class="hover:text-neutral-800 transition-colors"
                    >Impressum</a
                >
                <a href="/" class="hover:text-neutral-800 transition-colors"
                    >Startseite</a
                >
            </div>
        </div>
    </footer>
</div>
