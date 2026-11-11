## 2026-11-11T08:34:04Z

You are the Implementation Worker for Milestone 1 (Document Scanner & Reusable Triggers) of the OrgaFlow Hybrid App.

Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\worker_m1_1\
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY: read this first).
Project plan: s:\OrgaFlow_Alpha\PROJECT.md
Scope document: s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_m1\SCOPE.md

Prior Explorer Investigation Reports (MANDATORY: read these before implementing):
- Explorer 1 (Action Triggers & Receipts): `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m1_1\handoff.md` and `analysis.md`
- Explorer 2 (Budget Refactoring & Chat): `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m1_2\handoff.md` and `analysis.md`
- Explorer 3 (Client Archives & Uploads): `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m1_3\handoff.md` and `analysis.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Exclusive Write Ownership & Deliverables:
1. `frontend/src/lib/components/common/DocumentScanButton.svelte` (New component):
   - Svelte 5 runes. Props: `onScanComplete: (file: File) => void`, `label?: string`, `subLabel?: string`, `variant?: 'primary' | 'secondary' | 'compact' | 'icon' | 'card'`, `disabled?: boolean`, `documentTitle?: string`, `class?: string`.
   - Multi-page loop using `confirmStore.ask(...)`, calls `documentScannerService.capturePage()`, prompts to add further pages or finish, calls `documentScannerService.bundleToPdf()`, converts resulting Blob to `File` (`application/pdf`), invokes `onScanComplete(file)`. Shows feedback with `toastStore`.
   - Visual variants, Lucide icons (`Scan`, `Plus`, `Loader2`, `Check`), 44px min touch target.
2. `frontend/src/lib/components/common/GpsAddressButton.svelte` (New component):
   - Svelte 5 runes. Props: `onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void`, `label?: string`, `variant?: 'button' | 'icon'`, `disabled?: boolean`, `class?: string`.
   - 1-click GPS capture via `locationService.getCurrentPosition()`, spinner feedback, resolves German address, invokes `onAddressCaptured(address, coords)`, toast notification.
3. `frontend/src/lib/components/budget/BudgetReceiptField.svelte` (New component):
   - Svelte 5 runes. Props: `receiptFile = $bindable<File | null>()`, `existingReceipt?: string | null`.
   - Integrates file picker, `DocumentScanButton` (`variant="compact"`), file preview chip with remove button, existing receipt display. Must be < 70 lines.
4. `frontend/src/lib/components/budget/BudgetEntryModal.svelte` (Refactor):
   - Replace lines 201-217 with `<BudgetReceiptField bind:receiptFile={entryReceiptFile} existingReceipt={editingEntry?.receipt_file} />`.
   - Clean up unused imports. Line count must drop from 247 down to ~210 lines (strictly <= 250).
5. `frontend/src/lib/components/expenditure/ExpenditureReceiptCard.svelte` & `ExpenditureModal.svelte`:
   - Wire `DocumentScanButton` into empty state (`variant="primary"`, label="Beleg scannen (Multi-Page PDF)") and active state (`variant="compact"`, label="Neu scannen").
   - Wire `onScanComplete` callback in `ExpenditureModal.svelte`. Ensure line counts <= 250 lines.
6. `frontend/src/lib/components/finances/PersonalTransactionModal.svelte`:
   - Wire `DocumentScanButton` into receipt section alongside file picker. Ensure line count <= 250 lines.
7. `frontend/src/lib/components/clients/document/ClientDocumentFilesSection.svelte`:
   - Embed `<DocumentScanButton variant="secondary" label="Dokument scannen" ... />` beside file browse button. Ensure line count <= 250 lines.
8. `frontend/src/lib/components/clients/ClientDocumentUploadZone.svelte`:
   - Replace HTML camera label with `<DocumentScanButton variant="card" label="Foto / Beleg scannen" subLabel="Kamera auf Smartphone öffnen" ... />`. Ensure line count <= 250 lines.
9. `frontend/src/lib/components/portal/PortalDocumentUploadCard.svelte`:
   - Embed `<DocumentScanButton variant="secondary" label="Scannen" ... />` in action bar. Ensure line count <= 250 lines.
10. `frontend/src/lib/components/appointmentDetail/appointmentDocumentsHelper.ts` (New helper) & `AppointmentDocumentsCard.svelte`:
   - Extract `getCleanFileName`, `getFileIcon`, and `checkIsDuplicate` into `appointmentDocumentsHelper.ts`.
   - Replace HTML camera label with `<DocumentScanButton variant="compact" label="Kamera" ... />`.
   - Line count of `AppointmentDocumentsCard.svelte` must drop from 236 to ~195 lines (strictly <= 250).
11. `frontend/src/lib/components/chat/useChatAudioRecorder.svelte.ts` (New helper) & `ChatWidget.svelte`:
   - Extract `MediaRecorder` audio recording logic into `useChatAudioRecorder.svelte.ts` (or extract date formatting helper).
   - Embed `<DocumentScanButton variant="icon" ... />` adjacent to paperclip attachment button.
   - On scan completion, set `selectedFile = file`. Ensure `ChatWidget.svelte` is <= 250 lines (target ~185 lines).

Verification Requirements:
1. Verify line count of EVERY created or modified file using PowerShell `(Get-Content <file>).Length`. Every file MUST be <= 250 lines.
2. Verify zero inner scroll containers (`overflow-y`, `overflow-scroll`, `max-h-`).
3. Run `npm --prefix frontend run check`. It MUST pass with 0 errors and 0 warnings.
4. Run `npm --prefix frontend run build`. It MUST build cleanly.

Handoff:
- Write full details, changes, line count table, and command output logs in `s:\OrgaFlow_Alpha\.agents\teamwork\worker_m1_1\handoff.md`.
- Send a completion message to the sub-orchestrator.
