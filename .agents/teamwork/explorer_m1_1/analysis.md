# Technical Analysis: Reusable Action Triggers & Receipt Management Integration (Milestone 1)

**Investigator**: Explorer 1 (`explorer_m1_1`)  
**Parent Orchestrator**: `7b38f35e-79e8-480a-a359-e111f6a8f6ed`  
**Date**: 2026-11-11  
**Scope**: Action Triggers (`DocumentScanButton.svelte`, `GpsAddressButton.svelte`) & Receipt Management (`ExpenditureReceiptCard.svelte`, `PersonalTransactionModal.svelte`).

---

## 1. Action Trigger 1: `DocumentScanButton.svelte`

### 1.1 Underlying Service Inspection (`documentScannerService.ts`)
- **Path**: `frontend/src/lib/services/documentScannerService.ts` (122 lines)
- **Relevant Signatures**:
  ```typescript
  export interface ScannedPage {
      dataUrl: string;
      blob: Blob;
  }

  export interface DocumentScanResult {
      pdfBlob: Blob;
      fileName: string;
      pageCount: number;
      pages: ScannedPage[];
  }

  // Camera capture: uses @capacitor/camera with CameraResultType.DataUrl
  // Returns ScannedPage or null when user cancels
  capturePage(): Promise<ScannedPage | null>

  // Multi-page bundling: embeds PNG/JPG into PDF via pdf-lib scaled to DIN A4
  bundleToPdf(pages: ScannedPage[], documentTitle?: string): Promise<DocumentScanResult>

  // Check hardware availability
  isCameraAvailable(): boolean
  ```

### 1.2 Interface Contract
- **File**: `frontend/src/lib/components/common/DocumentScanButton.svelte`
- **Props**:
  ```typescript
  interface Props {
      onScanComplete: (file: File) => void;
      label?: string; // Default: "Dokument scannen"
      variant?: 'primary' | 'secondary' | 'compact' | 'icon'; // Default: 'secondary'
      disabled?: boolean; // Default: false
      documentTitle?: string; // Default: "Beleg"
  }
  ```

### 1.3 Interactive Workflow & Multi-Page Loop
1. **User click**: `startScan()` triggered.
2. **First capture**: Calls `await documentScannerService.capturePage()`.
   - If user cancels without taking a picture (`null`), gracefully exit with zero notifications.
3. **Multi-page prompt**:
   - Push first page into `capturedPages: ScannedPage[]`.
   - Ask user via `confirmStore.ask(...)`:
     `confirmStore.ask("Bereits " + capturedPages.length + " Seite(n) erfasst. Möchten Sie eine weitere Seite scannen?", "Dokumentenscan", "Weitere Seite hinzufügen", "Fertigstellen & Bündeln")`
   - If user confirms: call `capturePage()` again. If successful, append and re-prompt. If user cancels camera, break loop and proceed with already captured pages.
   - If user chooses "Fertigstellen & Bündeln": break loop.
4. **PDF Bundling**:
   - Call `const result = await documentScannerService.bundleToPdf(capturedPages, documentTitle);`.
   - Wrap `result.pdfBlob` in standard web `File`:
     `new File([result.pdfBlob], result.fileName, { type: 'application/pdf' });`
5. **Callback & Feedback**:
   - Invoke `onScanComplete(file)`.
   - Show `toastStore.success(`${capturedPages.length} ${capturedPages.length === 1 ? 'Seite' : 'Seiten'} erfolgreich als PDF erfasst.`);`
   - Briefly display success state (Check icon) for 2s.
6. **Error handling**:
   - Catch errors, log to console, and show `toastStore.error(err?.message || "Fehler beim Scannen.");`.
   - Ensure `isScanning = false` and `isBundling = false` in `finally` block.

### 1.4 Visual Variants & Styling (Svelte 5 Runes)
- **Icons**: `Scan`, `Plus`, `Loader2`, `Check` from `lucide-svelte`.
- **Variants**:
  - `primary`: Violet theme button (`bg-violet-600 hover:bg-violet-700 text-white min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm`)
  - `secondary`: Clean slate card button (`bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xs`)
  - `compact`: Inline toolbar button (`bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 min-h-[44px] px-3 py-1.5 rounded-lg font-semibold text-xs`)
  - `icon`: Square button (`min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700`)
- **Estimated Line Count**: ~95 lines (strictly <= 250 lines).

---

## 2. Action Trigger 2: `GpsAddressButton.svelte`

### 2.1 Underlying Service Inspection (`locationService.ts`)
- **Path**: `frontend/src/lib/services/locationService.ts` (110 lines)
- **Relevant Signatures**:
  ```typescript
  export interface LocationCoordinates {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
      address?: string;
  }

  // Acquires single GPS fix (10s timeout), checks permissions, calls reverseGeocode automatically
  getCurrentPosition(): Promise<LocationCoordinates>

  // Resolves lat/lon to German street/city string via OpenStreetMap Nominatim
  reverseGeocode(lat: number, lon: number): Promise<string | null>
  ```

### 2.2 Interface Contract
- **File**: `frontend/src/lib/components/common/GpsAddressButton.svelte`
- **Props**:
  ```typescript
  interface Props {
      onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void;
      label?: string; // Default: "Standort erfassen"
      variant?: 'button' | 'icon'; // Default: 'button'
      disabled?: boolean; // Default: false
  }
  ```

### 2.3 Acquisition Workflow
1. **User click**: `captureLocation()` triggered.
2. **State**: Set `isLocating = true`.
3. **Location acquisition**:
   - Call `const pos = await locationService.getCurrentPosition()`.
   - `getCurrentPosition()` already runs `reverseGeocode` and populates `pos.address` if online.
   - Format address string: `pos.address || `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}``.
4. **Callback & Feedback**:
   - Invoke `onAddressCaptured(formattedAddress, { latitude: pos.latitude, longitude: pos.longitude })`.
   - Show `toastStore.success(`Standort übernommen: ${formattedAddress}`);`
   - Briefly display success state for 2s.
5. **Error handling**:
   - Catches permission rejection or signal timeout (`err.message`).
   - Shows `toastStore.error(err?.message || "Standort konnte nicht ermittelt werden.");`.
   - Always resets `isLocating = false` in `finally`.

### 2.4 Visual Variants & Styling (Svelte 5 Runes)
- **Icons**: `MapPin`, `Loader2`, `Check` from `lucide-svelte`.
- **Variants**:
  - `button`: Emerald pill button (`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs gap-2`)
  - `icon`: Emerald icon square (`min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs`)
- **Estimated Line Count**: ~75 lines (strictly <= 250 lines).

---

## 3. Receipt Management Integration

### 3.1 `ExpenditureReceiptCard.svelte`
- **Path**: `frontend/src/lib/components/expenditure/ExpenditureReceiptCard.svelte`
- **Current Line Count**: 138 lines.
- **Existing Mechanism**:
  - Two states: `hasActiveReceipt` vs empty state.
  - Empty state currently provides:
    - `onOpenCameraScanner` ("Kamera-Scan") which opens `ExpenditureCameraScannerModal` (single canvas frame capture).
    - `onOpenFilePicker` ("Datei / PDF") which triggers hidden HTML file input.
  - `hasActiveReceipt` displays preview image/PDF icon, file name, delete button, and "Neu scannen" button.
- **Proposed Enhancement**:
  1. Add `onScanComplete?: (file: File) => void` to component props.
  2. Import `DocumentScanButton` from `$lib/components/common/DocumentScanButton.svelte`.
  3. In empty state (`{:else}`), add `DocumentScanButton` with `label="Beleg scannen (Multi-Page PDF)"` and `variant="primary"`. Keep quick "Kamera-Scan" and "Datei / PDF" in a secondary 2-column grid beneath it.
  4. In `hasActiveReceipt` state, wire `DocumentScanButton` with `variant="compact"` and `label="Neu scannen"` into the bottom action bar.
- **Line Count Impact**:
  - Current: 138 lines.
  - Post-integration: ~152 lines.
  - Limit: 250 lines.
  - Compliance: **152 <= 250 lines (OK)**.
- **Parent Modal (`ExpenditureModal.svelte`)**:
  - Current line count: 233 lines.
  - Passing `onScanComplete={(file) => { expState.receiptFile = file; expState.removeReceipt = false; expState.cleanupPreview(); }}` adds 1-2 lines.
  - Post-integration: ~235 lines <= 250 lines (OK).

### 3.2 `PersonalTransactionModal.svelte`
- **Path**: `frontend/src/lib/components/finances/PersonalTransactionModal.svelte`
- **Current Line Count**: 225 lines.
- **Existing Mechanism**:
  - Header: Top "KI-Scan" button triggering hidden file input (`receiptFileInput`), calling `processAndScanReceipt`.
  - Body (lines 207-217): Optional manual receipt file input `<input id="trans-receipt" type="file" ... />`.
- **Proposed Enhancement**:
  1. Import `DocumentScanButton` from `$lib/components/common/DocumentScanButton.svelte`.
  2. In the Beleg attachment section (lines 207-217), arrange the file picker and `DocumentScanButton` side-by-side using flex layout (`flex flex-col sm:flex-row items-stretch sm:items-center gap-2`).
  3. Wire `onScanComplete={(file) => { receiptFile = file; }}` with `variant="compact"` and `label="Dokument scannen"`.
  4. When `receiptFile` is present, display a clear success badge (`✓ [receiptFile.name]`) with an "Entfernen" button.
- **Line Count Impact**:
  - Current: 225 lines.
  - Post-integration: ~233 lines.
  - Limit: 250 lines.
  - Compliance: **233 <= 250 lines (OK)**.
  - *Note*: If any future fields are added to `PersonalTransactionModal.svelte`, the receipt section should be extracted into `PersonalTransactionReceiptField.svelte`. For Milestone 1, inline integration at 233 lines is strictly compliant.

---

## 4. Rule Compliance Verification

| Rule | Requirement | Verification in Proposed Design |
|---|---|---|
| `code-minimalism.md` | All files <= 250 lines | `DocumentScanButton.svelte` (~95 lines)<br>`GpsAddressButton.svelte` (~75 lines)<br>`ExpenditureReceiptCard.svelte` (~152 lines)<br>`PersonalTransactionModal.svelte` (~233 lines)<br>`ExpenditureModal.svelte` (~235 lines) |
| `zero-inner-scroll.md` | No nested/internal scrollbars | No internal overflow containers used; components adapt dynamically to content height in document flow. |
| `no-brainer-design.md` | Plain German labels, clear states | Labels: "Dokument scannen", "Standort erfassen", "Neu scannen", "Liest Beleg...", "Bündelt PDF...". Touch targets >= 44px (`min-h-[44px]`). Active spinners during async tasks. |
| `style-layout.md` | Consistent dark/light theming | Slate/white backgrounds, violet primary, emerald GPS accents, dark mode prefixes (`dark:bg-slate-800`, `dark:text-slate-200`, `dark:border-slate-700`). |
| `mobile-landscape-mode.md` | Responsive mobile & landscape layout | Flex containers collapse/expand gracefully (`flex-col sm:flex-row`). Touch manipulation classes enabled. |
