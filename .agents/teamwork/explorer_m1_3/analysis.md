# Milestone 1 — Document Scanner & Reusable Triggers: Client Document & Archive Views Analysis

## Executive Summary
This report presents the architectural inspection, line count audit, and integration design for embedding native multi-page document scanning (`DocumentScanButton.svelte`) into OrgaFlow's four client document, archive, and appointment view components:
1. `frontend/src/lib/components/clients/document/ClientDocumentFilesSection.svelte` (86 lines -> ~96 lines)
2. `frontend/src/lib/components/clients/ClientDocumentUploadZone.svelte` (157 lines -> ~147 lines)
3. `frontend/src/lib/components/portal/PortalDocumentUploadCard.svelte` (198 lines -> ~206 lines)
4. `frontend/src/lib/components/appointmentDetail/AppointmentDocumentsCard.svelte` (236 lines -> ~195 lines via modularization)

Crucially, **`AppointmentDocumentsCard.svelte` is currently at 236 lines**, dangerously close to the strict 250-line limit mandated by `code-minimalism.md` (only 14 lines headroom). An immediate modularization plan has been designed: extracting file helper utilities into `appointmentDocumentsHelper.ts` (35 lines), which reduces `AppointmentDocumentsCard.svelte` to ~195 lines, securing 55 lines of safe headroom.

---

## 1. Line Count & Architecture Audit

| Target Component | Initial Line Count | Post-Scan Integration (Direct) | Modularization Action | Final Projected Lines | Headroom to 250 Limit | Rule Compliance (`code-minimalism.md`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ClientDocumentFilesSection.svelte` | 86 | ~96 | None required | **~96** | 154 lines | PASS (<= 250) |
| `ClientDocumentUploadZone.svelte` | 157 | ~147 | Replace HTML camera label | **~147** | 103 lines | PASS (<= 250) |
| `PortalDocumentUploadCard.svelte` | 198 | ~206 | None required | **~206** | 44 lines | PASS (<= 250) |
| `AppointmentDocumentsCard.svelte` | 236 | ~228 | Extract `appointmentDocumentsHelper.ts` | **~195** | 55 lines | PASS (<= 250) |
| *New:* `appointmentDocumentsHelper.ts` | — | — | Extract from Card | **~35** | 215 lines | PASS (<= 250) |

---

## 2. Component Deep Dive & Integration Plans

### 2.1 `ClientDocumentFilesSection.svelte`
- **Location**: `frontend/src/lib/components/clients/document/ClientDocumentFilesSection.svelte`
- **Current Line Count**: 86 lines
- **Parent Container**: Used in `ClientDocumentModal.svelte` (which manages editing / creating client documents).
- **Existing File Upload Mechanism**:
  - Bound props: `uploadFiles = $bindable([]): File[]`, `existingFiles = $bindable([]): string[]`, `filesToDelete = $bindable([]): string[]`.
  - A hidden `<input type="file" id="doc-files" multiple accept="*/*" ... />` is triggered by a button `<button onclick={() => document.getElementById('doc-files')?.click()}> Durchsuchen & Auswählen </button>`.
  - Selected files are added directly to `uploadFiles = [...uploadFiles, ...Array.from(target.files)]`.
- **Integration Design**:
  - Import `DocumentScanButton`:
    ```svelte
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";
    ```
  - Add scan completion handler:
    ```typescript
    function handleScanComplete(scannedFile: File) {
        uploadFiles = [...uploadFiles, scannedFile];
    }
    ```
  - Place `<DocumentScanButton>` directly beside the existing "Durchsuchen & Auswählen" button in the button flex container (lines 36-46):
    ```svelte
    <div class="flex items-center gap-3 flex-wrap">
        <input type="file" id="doc-files" multiple accept="*/*" class="hidden" onchange={handleFileSelect} disabled={isLoading} />
        <button 
            type="button" 
            onclick={() => document.getElementById('doc-files')?.click()} 
            class="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-4 min-h-11 rounded-xl flex items-center gap-2 transition-all shadow-2xs active:scale-95 cursor-pointer touch-manipulation" 
            disabled={isLoading}
        >
            <Upload class="w-4 h-4" /> Durchsuchen & Auswählen
        </button>
        <DocumentScanButton
            onScanComplete={handleScanComplete}
            disabled={isLoading}
            variant="secondary"
            label="Dokument scannen"
        />
    </div>
    ```
- **Post-Refactor Lines**: ~96 lines.
- **Inner Scroll Check**: Fully responsive; file items list dynamically expands container height with zero inner scrollbars.

---

### 2.2 `ClientDocumentUploadZone.svelte`
- **Location**: `frontend/src/lib/components/clients/ClientDocumentUploadZone.svelte`
- **Current Line Count**: 157 lines
- **Parent Container**: Used in `ClientDocumentsTab.svelte` (client master record documents tab).
- **Existing File Upload Mechanism**:
  - Exposes callback: `onupload: (files: FileList | File[]) => void`.
  - Top action grid (`grid-cols-1 sm:grid-cols-3 gap-2.5 landscape:grid-cols-3`) with 3 cards:
    1. "Foto / Beleg scannen" — currently an HTML `<input type="file" accept="image/*" capture="environment">` inside a `<label>`. This is a single-photo browser fallback, lacking PDF conversion and multi-page capture.
    2. "Dateien auswählen" — local file picker.
    3. "Google Drive" — opens Google Drive modal.
  - Drag & drop zone below.
- **Integration Design**:
  - Replace Card 1 (lines 51-68) with `DocumentScanButton`.
  - When `DocumentScanButton` finishes scanning, it passes the compiled PDF `File` to `onupload([file])`.
  - To maintain the 3-column quick-action visual parity:
    `DocumentScanButton` should support either `variant="card"` or accept a `class` prop so it styles identically to the other two quick-action tiles:
    ```svelte
    <DocumentScanButton
        onScanComplete={(file) => onupload([file])}
        disabled={isUploading}
        variant="card"
        label="Foto / Beleg scannen"
        subLabel="Kamera auf Smartphone öffnen"
    />
    ```
    If `variant="card"` is rendered by `DocumentScanButton`, its template outputs:
    ```svelte
    <button
        type="button"
        onclick={startScan}
        disabled={disabled}
        class="flex items-center justify-center gap-2.5 p-3.5 sm:p-4 landscape:p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:bg-emerald-200 text-emerald-900 dark:text-emerald-100 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/80 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer select-none touch-manipulation {disabled ? 'opacity-50 pointer-events-none' : ''}"
    >
        <Camera class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div class="text-left">
            <span class="block leading-tight font-black">Foto / Beleg scannen</span>
            <span class="text-[11px] font-normal text-emerald-700/80 dark:text-emerald-300/80">Kamera auf Smartphone öffnen</span>
        </div>
    </button>
    ```
  - Unused `cameraInput` state variable can be removed from `ClientDocumentUploadZone.svelte`.
- **Post-Refactor Lines**: ~147 lines (net reduction of 10 lines).
- **Inner Scroll Check**: Dynamic height growth, no inner scroll.

---

### 2.3 `PortalDocumentUploadCard.svelte`
- **Location**: `frontend/src/lib/components/portal/PortalDocumentUploadCard.svelte`
- **Current Line Count**: 198 lines
- **Parent Container**: Used in `PortalDocumentList.svelte` (external customer / caregiver portal document exchange).
- **Existing File Upload Mechanism**:
  - `handleFileUpload(files: FileList | File[])`:
    - Checks file size (<= 25 MB).
    - Converts file to Base64 data string.
    - Sends POST to `${getApiBaseUrl()}/documents/upload` with JSON `{ clientId, fileName, fileBase64, mimeType, category: uploadCategory }`.
    - Handles progress bar and feedback toasts.
  - UI header states "Dokument oder Scan hochladen", but currently only has a single file input button ("Datei auswählen").
- **Integration Design**:
  - Import `DocumentScanButton`:
    ```svelte
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";
    ```
  - In the action controls flex bar (lines 150-189):
    Beside category selection and "Datei auswählen", add:
    ```svelte
    <DocumentScanButton
        onScanComplete={(file) => handleFileUpload([file])}
        disabled={isUploading}
        variant="secondary"
        label="Scannen"
    />
    ```
  - When scanning finishes: `handleFileUpload([file])` handles Base64 encoding, passes the selected `uploadCategory` (e.g. "Scans & Nachweise" or "Pflegekassenbescheide"), and securely uploads to the portal backend.
- **Post-Refactor Lines**: ~206 lines.
- **Alphabetical Select Check**: Dropdown categories and sorted clients are strictly sorted alphabetically per `alphabetical-select.md`.
- **Inner Scroll Check**: No inner scroll containers.

---

### 2.4 `AppointmentDocumentsCard.svelte` (Architecture & Modularization Focus)
- **Location**: `frontend/src/lib/components/appointmentDetail/AppointmentDocumentsCard.svelte`
- **Current Line Count**: 236 lines (**CRITICAL**: 14 lines below 250-line maximum).
- **Parent Container**: Used in `AppointmentReportSection.svelte`.
- **Existing File Upload Mechanism**:
  - Upload triggers: Drive button, Camera `<input capture="environment">` label, File upload label, and Drag & drop area.
  - Logic contains:
    - `getCleanFileName`: cleans PocketBase hash suffixes.
    - `getFileIcon`: maps file extension to Lucide icons.
    - `checkIsDuplicate`: prompts user if duplicate is detected before uploading.
    - `uploadSingleFile`: uploads atomically to appointment via `documents+` and syncs to client record.
    - `handleDeleteDoc`: removes from appointment via `documents-`.
- **Identified Problem**:
  Adding `DocumentScanButton` without modularization leaves this file at ~228 lines. While technically <= 250, any minor addition, styling update, or error handler will violate `code-minimalism.md`.
- **Modularization Plan**:
  Extract the pure utility and file evaluation functions to a dedicated helper module:
  `frontend/src/lib/components/appointmentDetail/appointmentDocumentsHelper.ts` (~35 lines).

  #### Extracted Helper (`appointmentDocumentsHelper.ts`):
  ```typescript
  import { FileText, Image, File as FileIcon } from "lucide-svelte";
  import type { Component } from "svelte";

  export function getCleanFileName(fn: string): string {
      return fn ? fn.replace(/_[a-zA-Z0-9]{10}\./, '.') : '';
  }

  export function getFileIcon(fn: string): Component {
      const lower = fn.toLowerCase();
      if (lower.endsWith('.pdf')) return FileText;
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return Image;
      return FileIcon;
  }

  export function checkIsDuplicate(file: File, clientDocs: string[], appointmentDocs: string[]): boolean {
      const baseName = file.name.toLowerCase();
      const existsInClient = clientDocs.some(d => d.toLowerCase().includes(baseName) || getCleanFileName(d).toLowerCase() === baseName);
      const existsInApp = appointmentDocs.some(d => d.toLowerCase().includes(baseName) || getCleanFileName(d).toLowerCase() === baseName);
      return existsInClient || existsInApp;
  }
  ```

  #### Refactored `AppointmentDocumentsCard.svelte`:
  - Imports:
    ```svelte
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";
    import { getCleanFileName, getFileIcon, checkIsDuplicate } from "./appointmentDocumentsHelper";
    ```
  - Replace lines 143-157 (old HTML camera label):
    ```svelte
    <DocumentScanButton
        onScanComplete={(file) => handleFiles([file])}
        disabled={isUploading}
        variant="compact"
        label="Kamera"
    />
    ```
  - `checkIsDuplicate` call simplified:
    ```typescript
    const isDup = checkIsDuplicate(file, clientDocs, appointmentDocs);
    ```
- **Post-Refactor Lines**:
  - `AppointmentDocumentsCard.svelte`: **~195 lines** (Headroom: 55 lines!).
  - `appointmentDocumentsHelper.ts`: **~35 lines** (Headroom: 215 lines!).
  - Fully compliant with `code-minimalism.md`.

---

## 3. `DocumentScanButton.svelte` Interface Requirements

To ensure smooth integration across all views, `DocumentScanButton.svelte` should support the following contract:

```typescript
export interface DocumentScanButtonProps {
    onScanComplete: (file: File) => void;
    label?: string; // Default: "Dokument scannen"
    subLabel?: string; // Optional subtitle (e.g., "Kamera auf Smartphone öffnen")
    variant?: 'primary' | 'secondary' | 'compact' | 'icon' | 'card'; // Default: 'secondary'
    disabled?: boolean;
    class?: string;
}
```

### Variant Styling Guide:
- `'secondary'` (default, used in `ClientDocumentFilesSection`, `PortalDocumentUploadCard`):
  Indigo/neutral soft pill button with Camera/Scan icon and 44px min-height.
- `'compact'` (used in `AppointmentDocumentsCard` header action bar):
  Compact header button (`px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl`).
- `'card'` (used in `ClientDocumentUploadZone` quick-action grid):
  Tile layout matching `FolderOpen` and `GoogleDrive` tiles (`p-3.5 sm:p-4 landscape:p-3 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950/40`).

---

## 4. Rule Compliance Summary

1. **`code-minimalism.md`**:
   - Every file stays strictly under 250 lines.
   - `AppointmentDocumentsCard.svelte` modularization guarantees long-term compliance (195 lines vs. 250 max).
2. **`zero-inner-scroll.md`**:
   - All 4 inspected components verified clean of `overflow-y-auto`, `overflow-scroll`, or restrictive `max-h-` containers.
   - All file lists and drop zones expand naturally within page flow.
3. **`no-brainer-design.md`**:
   - Clear, accessible German terms: "Dokument scannen", "Foto / Beleg scannen", "Kamera", "Dateien auswählen".
   - Clear loading feedback spinners and progress updates.
   - Deletions and duplicate files are safeguarded by `confirmStore.ask(...)`.
4. **`alphabetical-select.md`**:
   - All client and category selectors in `PortalDocumentUploadCard.svelte` are verified alphabetical.
5. **`mobile-landscape-mode.md`**:
   - Grid layouts maintain `landscape:grid-cols-3` and compact paddings on mobile landscape.
