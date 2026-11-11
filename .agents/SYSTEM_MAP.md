# OrgaFlow System-Architektur & Komponenten-Index (Fast-Path)

> **Zweck:** Schnelle, direkte Referenz für den Agenten zur sofortigen Lokalisierung von Integrationspunkten, Datenflüssen und Modulabhängigkeiten ohne zeitraubendes Durchsuchen des Gesamtsystems.

---

## 1. Kern-Architektur
- **Frontend:** SvelteKit 2 + Svelte 5 (Runes `$state`, `$derived`, `$props`, `$effect`), Tailwind CSS v4, Lucide-Svelte.
- **Backend:** PocketBase v0.26 (REST + Realtime EventStream SSE, Port 8090).
- **Microservice:** Node.js Express (Port 3000: IMAP/SMTP E-Mail Sync, PDFKit, Web-Push).
- **Webserver:** Nginx Reverse Proxy (SSL, Port 80/443).

---

## 2. Domain- und Modul-Register

### 👤 Klienten (Clients)
- **Hauptansicht:** `frontend/src/routes/clients/+page.svelte` (Tabelle, Filter, Kapseln)
- **Neu anlegen:** `frontend/src/routes/clients/new/+page.svelte` + `components/ClientWizardStepper.svelte`
- **Detail-Modal:** `frontend/src/lib/components/clients/ClientDetailModal.svelte`
  - **Header & Quick-Actions:** `ClientDetailHeader.svelte` & `ClientDetailHeaderActions.svelte` (Mobil optimiert)
  - **Tabs:** `ClientDetailTabBar.svelte` -> `ClientDetailOverviewTab.svelte`, `ClientDetailAppointmentsTab.svelte`, `ClientDetailBudgetTab.svelte`, `ClientDocumentsTab.svelte`, `ClientDetailNetworkTab.svelte`
  - **Mitarbeiter-Ansicht:** `frontend/src/lib/components/mitarbeiter/CaregiverClientDetailModal.svelte`
- **Services:** `clientDetailState.svelte.ts`, `clientDetailActions.ts`, `clientDetailHelper.ts`
- **PocketBase:** `clients`, `client_contacts`

### 📅 Kalender & Termine (Appointments)
- **Hauptansicht:** `frontend/src/routes/calendar/+page.svelte` & `frontend/src/routes/dashboard/+page.svelte`
- **Ansichten:** `CalendarMonthView.svelte`, `CalendarWeekView.svelte`, `CalendarDayView.svelte`, `CalendarDayItem.svelte`, `AppointmentCard.svelte`
- **Modale:**
  - `AppointmentDetailModal.svelte` (Termindetails, Bearbeitung, Notizen)
  - `AppointmentModal.svelte` (Terminerstellung / Planung)
  - `AppointmentCompleteModal.svelte` (Abschluss, Unterschrift, Leistungsnachweis)
  - `AppointmentRequestsModal.svelte` (Terminanfragen aus Portal / Landing)
  - `FollowUpAppointmentModal.svelte` (Folgetermine)
  - `GoogleCalendarModal.svelte` & `GoogleEventDetailModal.svelte` (Google-Sync)
  - `MissingFollowUpsModal.svelte` (Offene Folgetermine / Berichte)
- **Services:** `appointmentStatusHelper.ts`, `appointmentCompleteService.svelte.ts`, `googleCalendarSyncService.ts`
- **PocketBase:** `appointments`, `appointment_requests`, `follow_ups`

### 💰 Finanzen, Abrechnung & Buchhaltung (Billing & Invoices)
- **Berechtigungs-Gate:** `rbacService.canAccessFinances` / `canCreateInvoice` (Für normale Mitarbeiter/Betreuer strikt verborgen)
- **Hauptansichten:** `frontend/src/routes/invoices/+page.svelte`, `finances/+page.svelte`, `bwa/+page.svelte`
- **Modale:**
  - `InvoiceDetailModal.svelte` (Rechnungsdetails, GoBD-Storno, Mahnwesen)
  - `InvoiceEmailModal.svelte` (Rechnungsversand per Mail)
  - `InvoicePaymentSettlementModal.svelte` (Zahlungseingang / Ausgleich)
  - `DocumentGeneratorModal.svelte` (Rechnungserstellung / PDF)
  - `AdminUnifiedFinanceModal.svelte` (Finanzübersicht / Konten)
- **Services:** `invoiceService.svelte.ts`, `lexofficeService.ts` (Firmenspezifisch Halle/Wittenberg getrennt)
- **PocketBase:** `invoices`, `invoice_adjustments`, `accounting`, `lexoffice_integrations`

### ✉️ E-Mail & Kommunikation (Mail & Inbox)
- **Vollbild:** `frontend/src/routes/mail/+page.svelte`
- **Popup-Modal (Sidebar/Drawer):** `frontend/src/lib/components/MailModal.svelte` (Zero-Inner-Scroll)
- **Kernkomponenten:**
  - `MailLayout.svelte` (Layout mit Sticky Desktop-Sidebar & mobilem Schubfach)
  - `MailSidebar.svelte` (Ordner INBOX/Sent/Starred/Trash, Kontowechsel, Schreiben)
  - `MailMainPanels.svelte` (Umschaltung Liste vs. Detailansicht)
  - `MailList.svelte` + `mail/MailListToolbar.svelte` + `mail/MailListRow.svelte`
  - `MailDetail.svelte` (E-Mail Leseansicht mit Auto-Iframe-Höhe)
  - `MailComposer.svelte` (E-Mail verfassen mit Anhängen & Signatur)
  - `MassMailModal.svelte` (Personalisierte Massen-E-Mails)
  - `EingangszentraleModal.svelte` (Zentrale Inbox für alle eingehenden Dokumente/Mails)
- **Services:** `emailServiceStore.svelte.ts`, `mailboxServiceStore.svelte.ts`, `mailConfigServiceStore.svelte.ts`
- **PocketBase / API:** `emails`, `mailboxes`, Microservice Port 3000 (`/api/mail/...`)

### 👥 Mitarbeiter, Rollen & IAM (Employees & RBAC)
- **Hauptansichten:** `frontend/src/routes/admin/mitarbeiter/+page.svelte`, `admin/iam/+page.svelte`
- **Modale:** `EmployeeModal.svelte`, `CaregiverProfileTab.svelte`, `IamConsole.svelte`
- **Services:** `employeeService.svelte.ts`, `rbacService.svelte.ts` (Admin/Developer/Office vs. Caregiver), `impersonationService.svelte.ts`
- **PocketBase:** `users`, `employees`, `roles`

### 🧭 Navigation, Shell & Modale-Hubs
- **Shell:** `frontend/src/routes/+layout.svelte` (RBAC-Store-Initialisierung, Theme-Listener)
- **Navigation:**
  - `AppSidebar.svelte` + `sidebar/SidebarNavLinks.svelte` + `sidebar/SidebarActions.svelte` (Desktop)
  - `MobileNavDrawer.svelte` (Mobile Navigation)
  - `AppBottomNav.svelte` (Mobile Schnellzugriffsleiste)
- **Zentrale Modal-Registries:**
  - `frontend/src/lib/components/sidebar/SidebarModals.svelte` (Sidebar-Popups)
  - `frontend/src/lib/components/dashboard/DashboardModals.svelte` (Dashboard-Popups)

---

## 3. Zentrale Reactive Stores & Services
| Store / Service | Pfad | Hauptaufgabe |
| :--- | :--- | :--- |
| `orgaStore` | `$lib/stores/orgaStore.svelte.ts` | Globaler Zustand aller PB-Kollektionen mit Realtime-Sync |
| `rbacService` | `$lib/services/rbacService.svelte.ts` | Rollen- und Rechteprüfung (`isAdmin`, `isCaregiver`, `canAccessFinances`) |
| `employeeService` | `$lib/services/employeeService.svelte.ts` | Zuweisung Klienten <-> Mitarbeiter |
| `notificationStore`| `$lib/services/notificationStore.svelte.ts`| Zähler für ungelesene Mails, Anfragen, Anträge |
| `toastStore` | `$lib/services/toastService.svelte.ts` | Benachrichtigungs-Toasts (Success, Error, Info) |
| `confirmStore` | `$lib/services/confirmService.svelte.ts`| Universeller Bestätigungsdialog (Ja/Nein, Modal) |

---

## 4. Unverhandelbare Entwicklungs-Standards (Direkt-Check)
1. **Code-Minimalism (`code-minimalism.md`):** Maximal 250 Zeilen pro Datei. Bei Überschreitung sofort in Subkomponenten aufteilen. Vollständige Modulausgabe.
2. **Zero-Inner-Scroll (`zero-inner-scroll.md`):** Keine internen Scrollbalken in Karten oder Dialog-Content. Modale nutzen `<dialog class="zero-inner-scroll-modal">` (`max-height: 94dvh; overflow-y: auto !important`).
3. **No-Brainer-Design (`no-brainer-design.md`):** Alltagstaugliche deutsche Begriffe, großzügige Touch-Targets (`min-h-10` / `min-h-11`), kein horizontales Scrollen.
4. **Alphabetical Select (`alphabetical-select.md`):** Alle `<select>` Optionen und Dropdowns sprachsensitiv sortieren (`localeCompare('de')`).
5. **Layer Stacking (`layer-stacking.md`):** Modale über nativen HTML `<dialog>` Stack, Z-Index Disziplin.
