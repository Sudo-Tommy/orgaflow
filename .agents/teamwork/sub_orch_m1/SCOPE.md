# Scope: Milestone 1 — Document Scanner & Reusable Triggers

## Status: DONE

## Architecture
Integrate native document scanning across receipt management, client document uploads, archives, and chat attachments.
Create reusable trigger components and decompose high-line-count modals to enforce code minimalism (<= 250 lines).

## Feature Inventory
| # | Feature | Description | Milestone | Status | Source |
|---|---------|-------------|-----------|--------|--------|
| 1 | Reusable Action Triggers | Reusable `DocumentScanButton.svelte` & `GpsAddressButton.svelte` components | M1 | DONE | Survey |
| 2 | Budget Receipt Decomposition | Extract `BudgetReceiptField.svelte` from `BudgetEntryModal.svelte` to adhere to <= 250 lines | M1 | DONE | Survey |
| 3 | Receipt Document Scanning | Multi-page scanning into `ExpenditureReceiptCard`, `PersonalTransactionModal`, `BudgetReceiptField` | M1 | DONE | ORIGINAL_REQUEST §R1 |
| 4 | Client & Archive Scanning | Multi-page scanning into `ClientDocumentFilesSection`, `ClientDocumentUploadZone`, `PortalDocumentUploadCard`, `AppointmentDocumentsCard` | M1 | DONE | ORIGINAL_REQUEST §R1 |
| 5 | Chat Attachment Scanning | PDF-bundled scan attachment in `ChatWidget.svelte` | M1 | DONE | ORIGINAL_REQUEST §R1 |

## Interface Contracts
### `DocumentScanButton.svelte`
- Props:
  - `onScanComplete: (file: File) => void`
  - `label?: string` (default: "Dokument scannen")
  - `variant?: 'primary' | 'secondary' | 'compact' | 'icon' | 'card'` (default: 'secondary')
  - `disabled?: boolean`
- Flow: Invokes `documentScannerService.capturePage()`, handles multi-page adding, bundles with `documentScannerService.bundleToPdf()`, returns standard `File` (MIME: `application/pdf`).

### `GpsAddressButton.svelte`
- Props:
  - `onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void`
  - `label?: string` (default: "Standort erfassen")
  - `variant?: 'button' | 'icon'` (default: 'button')
- Flow: Calls `locationService.getCurrentPosition()`, displays loading spinner, and returns formatted address string.

## Code Layout & Verified File Line Counts
- `frontend/src/lib/components/common/DocumentScanButton.svelte` (New - 175 lines <= 250)
- `frontend/src/lib/components/common/GpsAddressButton.svelte` (New - 76 lines <= 250)
- `frontend/src/lib/components/budget/BudgetReceiptField.svelte` (New - 63 lines <= 250)
- `frontend/src/lib/components/budget/BudgetEntryModal.svelte` (Refactored - 233 lines <= 250)
- `frontend/src/lib/components/expenditure/ExpenditureReceiptCard.svelte` (Refactored - 165 lines <= 250)
- `frontend/src/lib/components/ExpenditureModal.svelte` (Refactored - 238 lines <= 250)
- `frontend/src/lib/components/finances/PersonalTransactionModal.svelte` (Refactored - 228 lines <= 250)
- `frontend/src/lib/components/clients/document/ClientDocumentFilesSection.svelte` (Refactored - 95 lines <= 250)
- `frontend/src/lib/components/clients/ClientDocumentUploadZone.svelte` (Refactored - 148 lines <= 250)
- `frontend/src/lib/components/portal/PortalDocumentUploadCard.svelte` (Refactored - 208 lines <= 250)
- `frontend/src/lib/components/appointmentDetail/appointmentDocumentsHelper.ts` (New - 20 lines <= 250)
- `frontend/src/lib/components/appointmentDetail/AppointmentDocumentsCard.svelte` (Refactored - 213 lines <= 250)
- `frontend/src/lib/components/chat/useChatAudioRecorder.svelte.ts` (New - 74 lines <= 250)
- `frontend/src/lib/components/ChatWidget.svelte` (Refactored - 204 lines <= 250)

## Verification Status
- Svelte typecheck: `npm --prefix frontend run check` -> 0 errors, 0 warnings.
- Production build: `npm --prefix frontend run build` -> clean build in `pb_public`.
- Android sync: `npm --prefix frontend run cap:sync` -> 9 plugins & assets synced.
- Test suites: Master automated suite (75/75 passed), empirical stress suites (100% passed).
- Gate Result: PASS.
