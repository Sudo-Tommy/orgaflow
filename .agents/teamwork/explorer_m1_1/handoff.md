# Handoff Report: Milestone 1 — Action Triggers & Receipt Management Integration

**Agent**: Explorer 1 (`explorer_m1_1`)  
**Recipient**: Milestone 1 Sub-Orchestrator (`7b38f35e-79e8-480a-a359-e111f6a8f6ed`)  
**Type**: Hard Handoff (Investigation Complete)  
**Date**: 2026-11-11  

---

## 1. Observation

1. **Underlying Services**:
   - `frontend/src/lib/services/documentScannerService.ts` (122 lines):
     - Line 5: `export interface ScannedPage { dataUrl: string; blob: Blob; }`
     - Line 10: `export interface DocumentScanResult { pdfBlob: Blob; fileName: string; pageCount: number; pages: ScannedPage[]; }`
     - Line 25: `async capturePage(): Promise<ScannedPage | null>` captures camera/gallery image via `@capacitor/camera` and returns `null` if user cancelled.
     - Line 60: `async bundleToPdf(pages: ScannedPage[], documentTitle = 'Beleg'): Promise<DocumentScanResult>` scales pages proportionally to A4 dimensions (595.28 x 841.89 pt) and returns a bundled PDF `Blob`.
     - Line 116: `isCameraAvailable(): boolean` checks for native platform or `navigator.mediaDevices.getUserMedia`.
   - `frontend/src/lib/services/locationService.ts` (110 lines):
     - Line 4: `export interface LocationCoordinates { latitude: number; longitude: number; accuracy: number; timestamp: number; address?: string; }`
     - Line 41: `async getCurrentPosition(): Promise<LocationCoordinates>` acquires position via `@capacitor/geolocation` (10s timeout) and automatically invokes `reverseGeocode` (Line 82) using OpenStreetMap Nominatim with `Accept-Language: de`.

2. **Existing Receipt Components**:
   - `frontend/src/lib/components/expenditure/ExpenditureReceiptCard.svelte` (138 lines):
     - Line 4: Destructures props `{ receiptFile, existingReceiptUrl, existingReceiptName, localPreviewUrl, removeReceipt, isLoading, isScanningReceipt, onPreviewReceipt, onOpenCameraScanner, onOpenFilePicker, onRemoveReceipt }`.
     - Line 30: `let hasActiveReceipt = $derived(receiptFile || (existingReceiptUrl && !removeReceipt));`
     - Lines 44-108: Renders receipt details, preview thumbnail, remove button, and "Neu scannen" button (`onOpenCameraScanner`).
     - Lines 109-137: Empty state with 2-column grid offering `onOpenCameraScanner` ("Kamera-Scan") and `onOpenFilePicker` ("Datei / PDF").
   - `frontend/src/lib/components/finances/PersonalTransactionModal.svelte` (225 lines):
     - Lines 168-175: Top "KI-Scan" button for quick AI parsing via `processAndScanReceipt`.
     - Lines 207-217: Optional receipt file input `<input id="trans-receipt" type="file" ... />`.
     - Total line count is 225 lines, leaving 25 lines of headroom under the 250-line maximum before decomposition is required.
   - `frontend/src/lib/components/ExpenditureModal.svelte` (233 lines):
     - Lines 184-197: Invokes `<ExpenditureReceiptCard ... />`.
     - Lines 88-93: Attaches PDF files directly to `expState.receiptFile` and clears preview.

3. **Global Styling & Icon Ground Truth**:
   - `frontend/package.json` Line 51: `"lucide-svelte": "^1.0.1"`.
   - Icons `Scan`, `Plus`, `Loader2`, `Check`, `MapPin` are fully available in `lucide-svelte`.
   - `frontend/src/app.css` Lines 451-463: Establishes base button classes (`.orga-button-primary`, `.orga-button-ghost`, `.orga-button-danger`).
   - Project rules:
     - `code-minimalism.md`: all files must be <= 250 lines.
     - `zero-inner-scroll.md`: zero nested scrollbars.
     - `no-brainer-design.md`: clear German labels and loading states.
     - `mobile-landscape-mode.md`: mobile touch targets >= 44px (`min-h-[44px]`).

---

## 2. Logic Chain

1. **`DocumentScanButton.svelte` Design**:
   - *Observation 1* shows that `documentScannerService.capturePage()` captures a single page and returns `null` on cancel, while `bundleToPdf(pages, title)` bundles an array of pages into a single PDF `Blob`.
   - *Logic*: To provide a multi-page scanning experience, `DocumentScanButton` must manage an internal page array (`capturedPages: ScannedPage[]`). After the first page is captured, it uses `confirmStore.ask(...)` to prompt the user if they wish to add another page or finish. Once finished, it bundles pages to PDF, constructs a standard web `File` (`new File([pdfBlob], fileName, { type: 'application/pdf' })`), and calls `onScanComplete(file)`.
   - *Logic*: By handling the scanning and bundling cycle internally, consumers only receive a standard PDF `File`, making it drop-in compatible with file inputs.
   - *Rule Compliance*: Svelte 5 runes (`$props()`, `$state()`) and 4 styling variants ('primary', 'secondary', 'compact', 'icon') will produce a component of ~95 lines, well below the 250-line limit.

2. **`GpsAddressButton.svelte` Design**:
   - *Observation 1* shows that `locationService.getCurrentPosition()` returns `{ latitude, longitude, address }`, already reverse-geocoded to a German address string.
   - *Logic*: The button only needs to set a loading state (`isLocating = true`), invoke `locationService.getCurrentPosition()`, format the fallback coordinates if address is absent, and call `onAddressCaptured(address, { latitude, longitude })`.
   - *Rule Compliance*: The component requires only ~75 lines, uses Lucide `MapPin`/`Loader2`, has 44px touch targets, and complies with all project rules.

3. **Integration into `ExpenditureReceiptCard.svelte`**:
   - *Observation 2* shows that `ExpenditureReceiptCard` is currently 138 lines.
   - *Logic*: Adding an optional `onScanComplete?: (file: File) => void` prop and embedding `DocumentScanButton` in both the empty state (`variant="primary"`, label="Beleg scannen (Multi-Page PDF)") and the active state (`variant="compact"`, label="Neu scannen") will increase line count from 138 to ~152 lines.
   - *Conclusion*: 152 lines is safely <= 250 lines. In `ExpenditureModal.svelte`, passing `onScanComplete={(file) => { expState.receiptFile = file; expState.removeReceipt = false; expState.cleanupPreview(); }}` adds 1 line (233 -> 234 lines <= 250).

4. **Integration into `PersonalTransactionModal.svelte`**:
   - *Observation 2* shows that `PersonalTransactionModal` is 225 lines.
   - *Logic*: Replacing the simple file input at lines 207-217 with a flex row containing the file input and `<DocumentScanButton onScanComplete={(file) => { receiptFile = file; }} variant="compact" label="Dokument scannen" disabled={isLoading || isScanningReceipt} />` adds ~7 lines.
   - *Conclusion*: 225 + 7 = 232 lines, which remains under the 250-line threshold. Decomposition of `PersonalTransactionModal` is not strictly necessary for this step, though an extraction into `PersonalTransactionReceiptSection.svelte` remains available if further fields are added later.

---

## 3. Caveats

1. **Camera Permissions on Mobile vs Browser**:
   - On native Android/iOS, `Camera.getPhoto` prompts native OS permissions. On desktop browsers without a webcam, `isCameraAvailable()` returns false or prompts file picker fallback. The implementation handles user cancellation gracefully.
2. **Reverse Geocoding Rate Limits**:
   - `locationService.ts` uses OpenStreetMap Nominatim. In high-frequency offline scenarios, network geocoding may fail; the fallback string `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}` ensures coordinates are never lost.
3. **No Direct Source Changes**:
   - As an explorer, no modifications to `.svelte` or `.ts` files have been made in this turn. All code structures provided are blueprints for the implementation agent.

---

## 4. Conclusion

1. **`DocumentScanButton.svelte`** is ready for creation in `frontend/src/lib/components/common/DocumentScanButton.svelte` (~95 lines, Svelte 5 runes, multi-page loop, PDF bundling).
2. **`GpsAddressButton.svelte`** is ready for creation in `frontend/src/lib/components/common/GpsAddressButton.svelte` (~75 lines, Svelte 5 runes, 1-click GPS + reverse geocoding).
3. **`ExpenditureReceiptCard.svelte`** can directly embed `DocumentScanButton` without exceeding line limits (138 -> ~152 lines <= 250).
4. **`PersonalTransactionModal.svelte`** can directly embed `DocumentScanButton` into its Beleg section (225 -> ~232 lines <= 250).
5. All designs strictly comply with `code-minimalism.md`, `zero-inner-scroll.md`, `no-brainer-design.md`, and `mobile-landscape-mode.md`.

---

## 5. Verification Method

### 5.1 Verification Commands
```powershell
# 1. Typecheck frontend
npm --prefix frontend run check

# 2. Production build verification
npm --prefix frontend run build

# 3. Line count audit for affected files
(Get-Content "frontend/src/lib/components/common/DocumentScanButton.svelte").Length
(Get-Content "frontend/src/lib/components/common/GpsAddressButton.svelte").Length
(Get-Content "frontend/src/lib/components/expenditure/ExpenditureReceiptCard.svelte").Length
(Get-Content "frontend/src/lib/components/finances/PersonalTransactionModal.svelte").Length
(Get-Content "frontend/src/lib/components/ExpenditureModal.svelte").Length
```

### 5.2 Invalidation Conditions
- Any file exceeding 250 lines invalidates the plan (requires component extraction).
- Svelte 5 compilation warnings or errors regarding runes syntax (`$props()`, `$state()`, `$derived()`).
- Touch targets smaller than 44px in mobile viewports.
