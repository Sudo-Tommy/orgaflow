# Handoff Report — Explorer 3: Client Document & Archive Views Integration

## 1. Observation
1. **Measured Line Counts**:
   - `frontend/src/lib/components/clients/document/ClientDocumentFilesSection.svelte`: **86 lines**
   - `frontend/src/lib/components/clients/ClientDocumentUploadZone.svelte`: **157 lines**
   - `frontend/src/lib/components/portal/PortalDocumentUploadCard.svelte`: **198 lines**
   - `frontend/src/lib/components/appointmentDetail/AppointmentDocumentsCard.svelte`: **236 lines**
   Verified via PowerShell `Get-Content <path> | Measure-Object -Line`.
2. **Critical Architectural Risk**:
   `AppointmentDocumentsCard.svelte` at 236 lines is only 14 lines away from the strict 250-line limit mandated by `code-minimalism.md`.
3. **Existing Upload Mechanics**:
   - `ClientDocumentFilesSection.svelte`: lines 16-22 manage `uploadFiles: File[]` via `<input type="file" id="doc-files" multiple>`.
   - `ClientDocumentUploadZone.svelte`: lines 51-68 contain an HTML `<input type="file" accept="image/*" capture="environment">` label for camera capture that does not bundle multi-page PDFs or use native Capacitor camera capabilities.
   - `PortalDocumentUploadCard.svelte`: lines 34-109 provide `handleFileUpload(files: FileList | File[])` with Base64 encoding and category tagging, but only expose a file picker button (`Datei auswählen`) at line 175.
   - `AppointmentDocumentsCard.svelte`: lines 143-157 contain a single camera input label `<label ...><input type="file" accept="image/*" capture="environment"><span>Kamera</span></label>` alongside Google Drive and local file buttons. Lines 24-40 contain pure helper routines `getCleanFileName`, `getFileIcon`, and `checkIsDuplicate`.
4. **Clean Code & Type Check Baseline**:
   Execution of `npm --prefix frontend run check` returned:
   `svelte-check found 0 errors and 0 warnings`.
5. **Inner Scroll Rule Audit**:
   Pattern search for `overflow-y`, `overflow-scroll`, and `max-h-` across all 4 files returned 0 matches, confirming strict compliance with `zero-inner-scroll.md`.

---

## 2. Logic Chain
1. *From Observation 1 & 2*: `AppointmentDocumentsCard.svelte` (236 lines) cannot accommodate additional UI elements, imports, or handlers without risking immediate violation of `code-minimalism.md` (<= 250 lines).
2. *From Observation 3*: Lines 24-40 in `AppointmentDocumentsCard.svelte` consist of pure filename formatting (`getCleanFileName`), icon mapping (`getFileIcon`), and duplicate detection (`checkIsDuplicate`). Extracting these 3 functions to `frontend/src/lib/components/appointmentDetail/appointmentDocumentsHelper.ts` removes ~25 lines of logic from the component and fits the established folder architecture (which already contains `appointmentDetailService.ts`, `appointmentChecklistService.ts`, etc.).
3. *From Logic 2*: With helper extraction, `AppointmentDocumentsCard.svelte` line count drops from 236 lines down to **~195 lines**, creating 55 lines of safe headroom. The new helper file is **~35 lines**, well within the 250-line boundary.
4. *From Observation 3*: In `ClientDocumentUploadZone.svelte`, replacing the existing HTML camera input `<label>` (19 lines) with `<DocumentScanButton variant="card" ... />` directly enhances functionality to multi-page PDF scanning and reduces file length from 157 lines to **~147 lines**.
5. *From Observation 3*: In `ClientDocumentFilesSection.svelte` and `PortalDocumentUploadCard.svelte`, embedding `<DocumentScanButton>` into the existing button bars increases line counts by only 8-10 lines (resulting in **~96 lines** and **~206 lines** respectively), well within the 250-line ceiling without requiring subcomponent extraction.
6. *From Observation 5*: All proposed integrations maintain dynamic vertical growth and zero inner scrollbars per `zero-inner-scroll.md`.

---

## 3. Caveats
- `DocumentScanButton.svelte` is currently being designed and implemented by Explorer/Implementer 1. This analysis assumes `DocumentScanButton` conforms to the contract in `PROJECT.md` (`onScanComplete: (file: File) => void`, `label?: string`, `disabled?: boolean`) and strongly recommends adding `variant="card"` or passing a `class` prop to support the 3-tile grid in `ClientDocumentUploadZone.svelte`.
- No source files have been modified (Explorer read-only investigation). Implementer agents will execute the changes.

---

## 4. Conclusion
The four target views are ready for `DocumentScanButton.svelte` integration with concrete code placements and zero line-limit violations:
- **`ClientDocumentFilesSection.svelte`**: Embed `<DocumentScanButton variant="secondary" label="Dokument scannen" />` next to file picker button. (Projected: ~96 lines).
- **`ClientDocumentUploadZone.svelte`**: Replace HTML camera label with `<DocumentScanButton variant="card" label="Foto / Beleg scannen" subLabel="Kamera auf Smartphone öffnen" />`. (Projected: ~147 lines).
- **`PortalDocumentUploadCard.svelte`**: Add `<DocumentScanButton variant="secondary" label="Scannen" />` into the action bar beside category dropdown and upload button. (Projected: ~206 lines).
- **`AppointmentDocumentsCard.svelte`**: Extract `appointmentDocumentsHelper.ts` (~35 lines) and replace HTML camera label with `<DocumentScanButton variant="compact" label="Kamera" />`. (Projected: ~195 lines).

---

## 5. Verification Method
1. **Line Count Verification Command**:
   ```powershell
   $files = @(
       "frontend/src/lib/components/clients/document/ClientDocumentFilesSection.svelte",
       "frontend/src/lib/components/clients/ClientDocumentUploadZone.svelte",
       "frontend/src/lib/components/portal/PortalDocumentUploadCard.svelte",
       "frontend/src/lib/components/appointmentDetail/AppointmentDocumentsCard.svelte",
       "frontend/src/lib/components/appointmentDetail/appointmentDocumentsHelper.ts"
   )
   foreach ($f in $files) {
       if (Test-Path $f) {
           $count = (Get-Content $f).Count
           Write-Output "$f : $count lines"
           if ($count -gt 250) { Write-Error "VIOLATION: $f exceeds 250 lines!" }
       }
   }
   ```
2. **Type and Svelte Diagnostics**:
   ```powershell
   npm --prefix frontend run check
   ```
   *Expected Result*: 0 errors, 0 warnings.
3. **Inner Scroll Audit**:
   ```powershell
   Select-String -Path $files -Pattern "overflow-y|overflow-scroll|max-h-"
   ```
   *Expected Result*: No matches found.
