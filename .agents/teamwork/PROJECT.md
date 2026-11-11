# Project: OrgaFlow Hybrid App Native Features Integration

## Architecture
OrgaFlow is a modern SvelteKit & Capacitor 7 hybrid application ("Seniorenassistenz") backed by PocketBase. The frontend runs as a Single Page Application (SPA) deployed to `pb_public` (served by PocketBase and packaged natively for Android via Capacitor 7).
The native integration layer provides:
- Hardware Camera & Document Scanning (`documentScannerService.ts`, `@capacitor/camera`, `pdf-lib`)
- Hardware Geolocation & Reverse Geocoding (`locationService.ts`, `@capacitor/geolocation`, OpenStreetMap Nominatim)
- Touch & Pen Fullscreen Signature Capture with Landscape Locking (`FullscreenSignatureModal.svelte`, `@capacitor/screen-orientation`)
- Biometric & Device PIN Resume Security (`biometricService.svelte.ts`, `@capacitor/preferences`, `@capacitor/app`)
- PWA Installation & In-App Update Prompts (`PwaInstallButton.svelte`, `AppUpdateBanner.svelte`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Reusable Action Triggers | Reusable `DocumentScanButton.svelte` & `GpsAddressButton.svelte` components | M1 | Survey |
| 2 | Budget Receipt Decomposition | Extract `BudgetReceiptField.svelte` from `BudgetEntryModal.svelte` to adhere to <= 250 lines | M1 | Survey |
| 3 | Receipt Document Scanning | Multi-page scanning into `ExpenditureReceiptCard`, `PersonalTransactionModal`, `BudgetReceiptField` | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Client & Archive Scanning | Multi-page scanning into `ClientDocumentFilesSection`, `ClientDocumentUploadZone`, `PortalDocumentUploadCard`, `AppointmentDocumentsCard` | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Chat Attachment Scanning | PDF-bundled scan attachment in `ChatWidget.svelte` | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Fahrtenbuch 1-Click GPS | 1-click GPS capture with geocoded address in `DriveRecordModal.svelte` | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Tour / Appointment GPS | 1-click GPS address prefill in `AppointmentLocationTab.svelte` | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Address Validation & GPS | Address validation & GPS prefill in `ClientMasterDataTab`, `ClientMasterTab`, `ContactBasicInfoFields` | M2 | ORIGINAL_REQUEST §R1 |
| 9 | Signature Lifecycle Fix | Svelte 5 `$effect` reactive orientation lock & back-button unregister in `FullscreenSignatureModal` | M3 | Survey |
| 10 | Appointment Completion Signature | Decompose `AppointmentCompleteModal` (`AppointmentCompleteTasks.svelte`), wire fullscreen signature & GPS | M3 | ORIGINAL_REQUEST §R1 |
| 11 | Caregiver Appointment Signature | Connect fullscreen landscape signature trigger to `CaregiverAppointmentSignature.svelte` | M3 | ORIGINAL_REQUEST §R1 |
| 12 | Biometric Resume Security | Reactive `biometricService.svelte.ts` (`$state`), `NativeAppManager` resume lock, and `ProfileSecurityCard` PIN toggle UI | M3 | ORIGINAL_REQUEST §R1 |
| 13 | Mobile PWA Install Button | Add PWA install trigger to `MobileNavActions.svelte` | M3 | ORIGINAL_REQUEST §R1 |
| 14 | E2E Test Suite (Tiers 1-4) | Comprehensive test harness covering all features across Tiers 1-4, publishing `TEST_READY.md` | E2E-TEST | ORIGINAL_REQUEST §R1-R3 |
| 15 | Adversarial Hardening (Tier 5) | White-box stress testing and edge-case verification | M4 | Dual-Track Final |
| 16 | Build & Synchronization Gate | Full verification: `npm run check` (0 errors), `npm run build` (pb_public), `npx cap sync`, file line audit <= 250 | M5 | ORIGINAL_REQUEST §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Document Scanner Integration | Reusable triggers, Budget decomposition, Receipt & Archive & Chat scanning | none | DONE |
| M2 | Location & Address Validation | Fahrtenbuch GPS, Appointment location GPS, Client & Contact address validation | M1 | IN_PROGRESS |
| M3 | Signature, Biometrics & PWA | Signature modal lifecycle, Appointment completion signature, Caregiver signature, Biometrics resume lock & UI, Mobile PWA install | M1 | PLANNED |
| E2E | E2E Test Suite Development | Requirement-driven test harness, Tiers 1-4 tests, publishes `TEST_READY.md` | none (parallel track) | DONE |
| M4 | Final E2E Test Pass & Hardening | Pass 100% of E2E tests (Tiers 1-4) + Tier 5 adversarial stress testing | M1, M2, M3, E2E | PLANNED |
| M5 | Build & Sync Verification Gate | Clean `npm run check`, `npm run build`, `npx cap sync`, <= 250 lines rule audit, Forensic audit | M4 | PLANNED |

## Interface Contracts

### `DocumentScanButton.svelte`
- Props:
  - `onScanComplete: (file: File) => void`
  - `label?: string` (default: "Dokument scannen")
  - `variant?: 'primary' | 'secondary' | 'compact' | 'icon'` (default: 'secondary')
  - `disabled?: boolean`
- Flow: Invokes `documentScannerService.capturePage()`, prompts to add further pages or finish, calls `documentScannerService.bundleToPdf()`, returns standard `File` (MIME: `application/pdf`).

### `GpsAddressButton.svelte`
- Props:
  - `onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void`
  - `label?: string` (default: "Standort erfassen")
  - `variant?: 'button' | 'icon'` (default: 'button')
- Flow: Calls `locationService.getCurrentPosition()`, displays spinner while acquiring, calls reverse geocoder, and passes formatted address to callback.

### `FullscreenSignatureModal.svelte`
- Props:
  - `isOpen: boolean` ($bindable)
  - `title?: string`
  - `signerName?: string`
  - `onSave: (dataUrl: string) => void`
  - `onCancel?: () => void`
- Lifecycle: Bound via `$effect` when `isOpen` becomes true -> triggers `ScreenOrientation.lock({ orientation: 'landscape' })` and registers Capacitor back-button handler. On close -> unlocks orientation and unregisters back-button.

### `biometricService.svelte.ts`
- State:
  - `isLockActive: boolean` (reactive Svelte 5 `$state`)
  - `isEnabled: boolean` (reactive Svelte 5 `$state`)
- Methods:
  - `init(): Promise<void>`
  - `enable(pin: string): Promise<boolean>`
  - `disable(pin: string): Promise<boolean>`
  - `verifyPin(pin: string): Promise<boolean>`
  - `lock(): void`
  - `unlock(pin: string): Promise<boolean>`

## Code Layout
- `frontend/src/lib/components/common/DocumentScanButton.svelte` (New - owned by M1)
- `frontend/src/lib/components/common/GpsAddressButton.svelte` (New - owned by M2)
- `frontend/src/lib/components/budget/BudgetReceiptField.svelte` (New - owned by M1)
- `frontend/src/lib/components/budget/BudgetEntryModal.svelte` (Owned by M1)
- `frontend/src/lib/components/expenditure/ExpenditureReceiptCard.svelte` (Owned by M1)
- `frontend/src/lib/components/finances/PersonalTransactionModal.svelte` (Owned by M1)
- `frontend/src/lib/components/clients/document/ClientDocumentFilesSection.svelte` (Owned by M1)
- `frontend/src/lib/components/clients/ClientDocumentUploadZone.svelte` (Owned by M1)
- `frontend/src/lib/components/portal/PortalDocumentUploadCard.svelte` (Owned by M1)
- `frontend/src/lib/components/appointmentDetail/AppointmentDocumentsCard.svelte` (Owned by M1)
- `frontend/src/lib/components/ChatWidget.svelte` (Owned by M1)
- `frontend/src/lib/components/DriveRecordModal.svelte` (Owned by M2)
- `frontend/src/lib/components/appointmentModal/AppointmentLocationTab.svelte` (Owned by M2)
- `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte` (Owned by M2)
- `frontend/src/routes/clients/new/components/ClientMasterTab.svelte` (Owned by M2)
- `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte` (Owned by M2)
- `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` (Owned by M3)
- `frontend/src/lib/components/appointmentDetail/AppointmentCompleteTasks.svelte` (New - owned by M3)
- `frontend/src/lib/components/appointmentDetail/AppointmentCompleteModal.svelte` (Owned by M3)
- `frontend/src/lib/components/mitarbeiter/CaregiverAppointmentSignature.svelte` (Owned by M3)
- `frontend/src/lib/services/biometricService.svelte.ts` (Renamed / upgraded - owned by M3)
- `frontend/src/lib/components/app/NativeAppManager.svelte` (Owned by M3)
- `frontend/src/lib/components/profile/ProfileSecurityCard.svelte` (Owned by M3)
- `frontend/src/lib/components/sidebar/MobileNavActions.svelte` (Owned by M3)
- `frontend/tests/` (Owned by E2E Testing Track)
