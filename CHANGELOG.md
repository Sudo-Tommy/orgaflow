# OrgaFlow - Update-Log & Changelog

## [Version 1.9.1] - 2026-09-03

Dieses Wartungs- und Stabilitäts-Release bringt eine vollständige Härtung der PDF-Export- und Druck-Infrastruktur im gesamten System:
- **Server PDF-Engine (`/api/generate-pdf`):**
  - Promise-Catching gegen Server-Hänger bei fehlerhaften Vorlagen oder leeren Positionen.
  - Sichere Verarbeitung von Positionsnummern (`pos.pos.toString()` gegen `undefined` abgesichert).
  - Bereinigung von Base64-Data-URL-Headern vor der Übergabe an PDFKit-Buffer (keine verschwundenen Logos/Signaturen mehr).
  - Text-Sanitisierung zur Vermeidung von Glyphen-Fehlern in der Standard-Helvetica-Schriftart.
- **Token-Authentifizierung bei PDF-Dateien:**
  - Automatische Anbindung des PocketBase-Auth-Tokens an alle PDF-URLs in `invoiceHelpers.ts`, `ClientRelations.svelte`, `InvoiceEmailModal.svelte` und `documentGeneratorService.svelte.ts` zur Vermeidung von 403-Fehlern bei geschützten Dateien.
- **Rechnungsdetail (`InvoiceDetailModal`):**
  - Direkter, robuster Blob-Download für Rechnungen **und** Arbeitszeitnachweise.
- **Globale Druckstile (`app.css` & `bwa/+page.svelte`):**
  - Umfassende `@media print`-Regeln zum sauberen Ausblenden der Anwendungsnavigation (Sidebar, TopNav, BottomNav, Toast-Layer).
  - Aufhebung von `overflow: hidden` und `h-screen` für sauberen, unbeschnittenen mehrseitigen BWA- und Tabellendruck.

---

## [Version 1.9.0] - 2026-09-03

Dieses Release bringt wesentliche funktionale Erweiterungen, GoBD-Konformität im Rechnungswesen, ein KI-Studio mit strikter API-Sparsamkeit und persistentem Caching, mobile Workflows für den Pflegealltag sowie die gesetzliche Ausrichtung auf den **Antrag auf Verhinderungspflege (§ 39 SGB XI)**.

---

### 1. 🤝 Verhinderungspflege (§ 39 SGB XI) & Pflegeperson-Erfassung
*Vollständige Überarbeitung der bisherigen Erben-Erfassung hin zur eingetragenen privaten Hauptpflegeperson für Kassenanträge.*
- **Klienten-Stammdaten (`ClientEditModal`):**
  - Neue Sektion **4. Antrag Verhinderungspflege (§ 39 SGB XI) / Pflegeperson**.
  - **1-Klick-Übernahme:** Button `📋 Anschrift vom Klienten übernehmen` überträgt Straße, Hausnummer, PLZ und Stadt direkt vom Klienten in die Adressfelder der Pflegeperson.
  - Erfassung von: Name, Verwandtschaftsverhältnis, Geburtsdatum, Telefon/Notfallnummer, E-Mail und Wohnanschrift.
  - Antragsrelevante Parameter: Verhinderungsgrund (Erholungsurlaub, Krankheit/AU, Reha, Überlastung, Termine), Art der Pflege (stundenweise `< 8h` vs. tageweise `> 8h`), Checkboxen für Vorpflegezeit ($\ge$ 6 Monate) und Pflegegeldbezug sowie Aktenzeichen der Kasse.
- **Klienten-Übersicht (`ClientInfoCard`):**
  - Neue Informationskarte mit Kassen-Badges (`🤝 Antrag Verhinderungspflege`, Verhinderungsgrund, `✓ Vorpflegezeit ≥ 6 Mon.`, Stundenweise/Tageweise).
- **Pflegeperson-Widget (`InheritorWidget`):**
  - Automatisches Einblenden bei allen Klienten mit Pflegegrad $\ge 2$ oder hinterlegter Pflegeperson.
  - Verknüpfung bestehender Kontakte oder Schnellneuanlage mit automatischer Zuordnung.
- **Dokumentengenerator & Vorlagen-Editor:**
  - Neue Platzhaltergruppe: `{{careperson.name}}`, `{{careperson.relation}}`, `{{careperson.birthdate}}`, `{{careperson.street}} {{careperson.housenr}}`, `{{careperson.zip}} {{careperson.city}}`, `{{careperson.phone}}`, `{{careperson.email}}`, `{{careperson.reason}}`, `{{careperson.care_type}}`, `{{careperson.pre_care}}`, `{{careperson.signature}}`.
  - Vollständige Abwärtskompatibilität für bestehende Vorlagen (`{{inheritor.*}}` fungiert als automatischer Alias).

---

### 2. 🧾 GoBD-konformes Rechnungswesen & Stornosystem
*Rechtskonforme Stornierung und Korrektur von Rechnungen ohne Datenverlust.*
- **GoBD-Storno-Dialog (`InvoiceDetailModal`):**
  - Pflichtauswahl des Stornogrunds (*Rechnungsfehler, Falsche Anschrift, Kundenstorno, Doppelberechnung, Sonstiges*) und Freitextbegründung.
- **Automatische Stornobeleg-Erstellung:**
  - Generierung einer fortlaufenden Stornonummer (z. B. `SR-2026-0001`).
  - Mathematisch exakte Vorzeichen-Invertierung aller Positionen, Netto-, MwSt- und Bruttowerte (z. B. `-131,00 €`), um die Buchhaltung glattzustellen.
  - Feste Referenzierung der Originalrechnung (`reference_invoice_id`, `cancellation_reason`).
  - Status der Ursprungsrechnung wechselt auf `Storniert`; Stornobeleg wird GoBD-konform archiviert.
- **Listen-Visualisierung (`InvoiceList`):**
  - Farbcodierte Badges `STORNO` und `Rechnungskorrektur`.
  - Negative Beträge in auffälligem Rot/Rose hervorgehoben.
  - Sperre gegen Mehrfachstornierung bereits stornierter Belege.

---

### 3. 🤖 KI-Integration mit persistentem PocketBase-Caching (Gemini 2.5 Flash)
*Extrem API-effiziente Verarbeitung unstrukturierter Terminanfragen ohne doppelte externe Kosten.*
- **Strukturierte Inhaltsanalyse (`/api/ai/process-inquiry`):**
  - Nutzung des `@google/genai`-SDKs mit Structured Outputs (JSON-Schema) für deterministische Extraktion von Klientendaten, Dringlichkeit, Wunschtermin und Leistungskategorie.
- **Persistentes Caching:**
  - Errechnung eines SHA-256-Hashes (`content_hash`) über den Nachrichtentext.
  - Identische Anfragen werden direkt aus der PocketBase-Collection `inquiries` beantwortet (0 externe Gemini-Calls).
- **Automatischer Terminentwurf:**
  - Bei erkanntem Terminwunsch wird im selben Zug ein abgleichbarer Terminentwurf im System angelegt.

---

### 4. ⚡ Mobile-First Folgetermin-Erstellung (`FollowUpAppointmentModal`)
*Einhand-bedienbares Bottom-Sheet für schnelle Terminbuchungen vor Ort beim Klienten.*
- **Touch-optimierte Ergonomie:** Alle Touch-Targets $\ge 48\text{px}$ mit klarem Kontrast und haptischem Feedback.
- **1-Tap Rhythmus-Auswahl:** Schnellauswahl für `+1 Woche`, `+2 Wochen`, `+3 Wochen`, `+4 Wochen`, `Morgen`, `In 2 Tagen`.
- **Schnell-Slots & Dauer:** Direktauswahl von `09:00`, `13:00`, `15:00` sowie Zeitdauer (`1.0h`, `1.5h`, `2.0h`, `3.0h`).
- **Echtzeit-Kollisionsprüfung:** Prüft bei Zeitanpassung sofort gegen bestehende Termine des zuständigen Mitarbeiters.
- **Vorbefüllung:** Automatische Übernahme von Klient, Anschrift, Ansprechpartner und Leistungsinhalt des vorigen Termins.

---

### 5. ✉️ Quick-Mail Direkt-Zugang für das Angehörigen-Portal
*1-Klick-Versand von Zugangsdaten an Angehörige und Betreuer.*
- **Komponente `QuickAccessMailModal`:**
  - Hochwertiges, responsives HTML-Mail-Template mit OrgaFlow-Branding, persönlicher Klienten-PIN und direktem Anmelde-Button.
  - Gleichzeitiges Kopieren von formatiertem `text/html` und Fallback-`text/plain` in die Zwischenablage via `navigator.clipboard.write([new ClipboardItem(...)])`.
  - Kompatibel mit allen gängigen Desktop- und Web-Clients (Outlook, Apple Mail, Thunderbird, Gmail).

---

### 6. 🎨 Marketing- & Werbemittel-Studio (`MarketingGeneratorTab`)
*Vollständige Suite zur Generierung lokaler Marketingmaterialien mit Druck- und PDF-Export.*
- **6 Formate integriert:**
  1. **Flyer (Wickelfalz DIN Lang 6 Seiten):** Inklusive interaktivem Bogen-Editor (`FlyerGenerator.svelte`) für Vorder- und Rückseite.
  2. **Aushang / Plakat (DIN A4):** Für Wartezimmer, Praxen und Apotheken.
  3. **Social-Media-Post-Sheet:** Vorformulierter Redaktionsplan mit Hooks, Mehrwert-Texten und CTAs inklusive 1-Klick-Kopierfunktion.
  4. **Beileger / Postkarte (DIN A6):** Kompakte Übergabekarte für Klientenbesuche.
  5. **Infoblatt (DIN A4):** Erläuterung der Pflegegrade 1–5 und des Entlastungsbetrags (§ 45b SGB XI).
  6. **Gutschein / Kennenlern-Karte:** Hochwertiges Erstgespräch-Kennenlernangebot.
- **Persistentes Asset-Caching:** Generierte Vorlagen werden in PocketBase (`marketing_assets`) gespeichert und lokal vorgehalten.
- **Print & PDF:** Integriertes Print-Styling (`@media print`) für pixelgenauen Papierausdruck und PDF-Download.

---

### 7. 🌐 Landing Page Content Management System (`LandingCmsTab`)
*Zentrale Verwaltung der öffentlichen Webseiteninhalte im geschützten Admin-Bereich.*
- Modulare Inhaltsblöcke:
  - **Hero & Intro:** Hauptslogan, Subline, CTAs und Vertrauens-Siegel.
  - **Leistungsbereiche:** 4 strukturierte Leistungsbausteine mit Icons und Beschreibungstexten.
  - **Team & Standorte:** Standort- und Kontaktdaten (Halle / Wittenberg).
  - **Kassenabrechnung:** Hinweise zum Entlastungsbetrag (§ 45b SGB XI) und Kassenlogos.
  - **FAQ-Bereich:** Häufige Fragen für Pflegebedürftige und Angehörige.
  - **Kontakt & Erreichbarkeit:** Telefonnummern, E-Mails, Bürozeiten.
- Persistierung in PocketBase-Collection `landing_page_content`.

---

### 8. 📊 Dashboard-Redesign mit Quick-Access & Terminkarten
*Optimierte Informationsarchitektur für den täglichen Start in die Arbeit.*
- **Quick-Access Toolbar:** Prominente Schnellaktionen für *Schneller Folgetermin*, *Quick-Mail Portal*, *Werbemittel*, *Landing-CMS* und *KI-Anfragen* (inkl. Notification-Badge für ungelesene Anfragen).
- **Interaktives Termin-Widget:**
  - Tab-Umschaltung zwischen **„📅 Heute“** und **„🗓️ Nächste 7 Tage“**.
  - Schnellaktionen direkt auf jeder Terminkarte:
    - ⚡ **Folgetermin:** Öffnet das mobile Schnellbuchungs-Modal.
    - 🔍 **Details:** Öffnet die Termin-Vollansicht.
    - 🗺️ **Route:** Öffnet die Anschrift mit einem Klick in Google Maps zur Navigation.

---

### 9. 🛡️ Resilienz & Crash-Schutz im Microservice
*Beseitigung von Service-Abstürzen und Einfrieren der Benutzeroberfläche bei Terminanfragen.*
- **Globale Exception-Handler:** `uncaughtException` und `unhandledRejection` im Node.js-Microservice fangen unvorhergesehene Fehler global ab.
- **Non-blocking Request Handling:** Der Endpunkt `/api/emails/portal/notify-request` quittiert die Anfrage sofort und delegiert die Mail-Zustellung an einen isolierten Hintergrund-Worker.
- **Netzwerk-Timeouts:** Anhangs-Downloads sind über `AbortSignal.timeout(6000)` abgesichert; SMTP-Verbindungsfehler bringen den Prozess nicht mehr zum Absturz.
- **Frontend-Schutz:** Der Aufruf schließt das Buchungsmodal sofort mit visuellem Erfolgsfeedback und entkoppelt den Netzwerk-Zyklus.

---

### 10. 🏗️ Codequalität & Build-Status
- **Statische Typanalyse (`npm run check`):** **0 Fehler** (100 % typsicher).
- **Produktions-Build (`npm run build`):** Erfolgreich kompiliert und via `@sveltejs/adapter-static` nach `pb_public` geschrieben.
