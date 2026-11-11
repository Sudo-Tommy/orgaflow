# Handoff Report: Milestone 2 System Integration, Typing, Tests & Verification

**Author**: Explorer 3 (`explorer_m2_3`)  
**Mission**: Investigate overall system integration, existing tests, typing, and verification for Milestone 2 (Location Service & Address Validation Integration).  
**Target Date**: 2026-11-11  

---

## 1. Observation

### 1.1 Service Signatures, Exports & Mockability

1. **`frontend/src/lib/services/locationService.ts`** (110 lines):
   - **Exports**:
     - `export interface LocationCoordinates { latitude: number; longitude: number; accuracy: number; timestamp: number; address?: string; }`
     - `export const locationService = new LocationService();`
   - **Methods**:
     - `checkOrRequestPermissions(): Promise<boolean>`: Lines 20–36. On native platforms (`Capacitor.isNativePlatform()`), delegates to `@capacitor/geolocation` `checkPermissions()` and `requestPermissions()`. On web, checks `'geolocation' in navigator`. Returns `boolean`.
     - `getCurrentPosition(): Promise<LocationCoordinates>`: Lines 41–77. Verifies permissions, calls `Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 })`, then attempts reverse geocoding via `this.reverseGeocode()`. Handles timeout (`error?.message?.includes('Timeout') || error?.code === 3`) by throwing user-facing error `"Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten."`.
     - `reverseGeocode(lat: number, lon: number): Promise<string | null>`: Lines 82–107. Queries OpenStreetMap Nominatim endpoint (`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`). Returns formatted string `"${street} ${houseNo}, ${postcode} ${city}"` or `data.display_name` or `null`. Fails silently and safely on offline or network errors.
   - **Mockability**:
     - Fully mocked in `frontend/tests/mocks/mockCapacitorBridge.ts` via `mockCapacitorBridge.coords`, `mockCapacitorBridge.locationPermission`, `mockCapacitorBridge.locationError`.
     - Reverse geocode HTTP call is intercepted in `frontend/tests/mocks/mockBrowserGlobals.ts` (`setupBrowserGlobals()`, `setNominatimMock()`).

2. **`frontend/src/lib/services/addressValidationService.ts`** (67 lines):
   - **Exports**:
     - `export interface AddressValidationResult { isValid: boolean; errors: string[]; warnings: string[]; formattedAddress: string; }`
     - `export function validateGermanAddress(street: string, housenr: string, zip: string, city: string): AddressValidationResult`: Lines 13–60.
       - Validates presence of street and city.
       - Validates German postal code format via `/^[0-9]{5}$/` (exactly 5 digits).
       - Emits warning if street contains digits while house number is empty, or if street is provided without house number.
       - Returns `formattedAddress` as `"${street} ${housenr}, ${zip} ${city}"`.
     - `export function areAddressesDuplicate(addressA: string, addressB: string): boolean`: Lines 62–67. Normalizes whitespace, punctuation, and casing.
   - **Line Count**: Currently 67 lines, leaving 183 lines under the 250-line ceiling (`code-minimalism.md`).

3. **`frontend/src/lib/components/common/GpsAddressButton.svelte`** (75 lines):
   - **Props Contract**:
     - `onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void;`
     - `label?: string` (default: `"Standort erfassen"`)
     - `variant?: 'button' | 'icon'` (default: `'button'`)
     - `disabled?: boolean` (default: `false`)
     - `class?: string` (default: `""`)
   - **Behavior**:
     - State `isLocating` prevents double triggering.
     - Invokes `locationService.getCurrentPosition()`.
     - Falls back to coordinate string `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}` if reverse geocoding did not resolve a named address.
     - Notifies user via `toastStore.success("Standort erfolgreich übernommen.")` or `toastStore.error(...)`.

### 1.2 Target Components & Line Counts

| Component | Path | Current Lines | Limit | Headroom |
|---|---|---|---|---|
| `DriveRecordModal.svelte` | `frontend/src/lib/components/DriveRecordModal.svelte` | 119 | 250 | 131 lines |
| `AppointmentLocationTab.svelte` | `frontend/src/lib/components/appointmentModal/AppointmentLocationTab.svelte` | 168 | 250 | 82 lines |
| `ClientMasterDataTab.svelte` | `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte` | 112 | 250 | 138 lines |
| `ClientMasterTab.svelte` | `frontend/src/routes/clients/new/components/ClientMasterTab.svelte` | 105 | 250 | 145 lines |
| `ContactBasicInfoFields.svelte` | `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte` | 189 | 250 | 61 lines |

### 1.3 PocketBase Schema Constraints

- Inspected `backend/pb_schema.json` lines 4560–4651 and `backend/pb_migrations/1778500123_updated_drive_records.js`:
  - `drive_records` collection has fields: `id` (text), `type` (select: "Anfahrt" | "Auftragsfahrt"), `km` (number), `lump_sum` (number), `created` (autodate), `updated` (autodate).
  - Passing undeclared fields in `create()` or `update()` causes PocketBase 400 validation failures.
  - Therefore, location capture in `DriveRecordModal.svelte` must be presented as an on-site verification badge / visual check without modifying the PocketBase payload schema, or must update the parent appointment.

### 1.4 Test Suite Status & Baseline Execution

- **Command**: `npm --prefix frontend test`
  - Result: **75/75 tests passed** across Tiers 1–4 in 115ms.
  - Verified tests covering location:
    - `T1-LOC-01` through `T1-LOC-05` (`tier1-location.test.ts`)
    - `T2-LOC-01` through `T2-LOC-05` (`tier2-location.test.ts`)
    - `T3-INT-01`, `T3-INT-02`, `T3-INT-07`, `T3-INT-10` (`tier3-pairwise-part1.test.ts` & `part2`)
    - `T4-E2E-01` (Fahrtenbuch 1-Click GPS Logging), `T4-E2E-05` (Client Master Data Onboarding)
- **Command**: `npm --prefix frontend run check`
  - Result: **0 errors and 0 warnings** found by `svelte-check`.

---

## 2. Logic Chain

### 2.1 Multi-Field Address Prefill Challenge & Solution
- **Premise 1**: `GpsAddressButton` passes `(address: string, coords: { latitude: number; longitude: number })`.
- **Premise 2**: In `AppointmentLocationTab.svelte`, the input is a single text field (`state.location_address`). Populating this is a direct assignment: `state.location_address = address`.
- **Premise 3**: In `ClientMasterDataTab.svelte`, `ClientMasterTab.svelte`, and `ContactBasicInfoFields.svelte`, address data is divided into 4 individual fields: `street`, `housenr`, `zip`, `city`.
- **Premise 4**: If each of these three components writes its own regex parser for splitting German addresses, we duplicate logic and risk exceeding line count limits or introducing parsing inconsistencies.
- **Deduction**: `addressValidationService.ts` is the central German address domain service and currently only has 67 lines. It should export a helper:
  ```typescript
  export function parseGermanAddress(address: string): {
      street: string;
      housenr: string;
      zip: string;
      city: string;
  }
  ```
  This parses Nominatim strings (e.g. `"Marienplatz 1, 80331 München"` or `"Hauptstraße 42a, 10115 Berlin"`) into `{ street: "Marienplatz", housenr: "1", zip: "80331", city: "München" }`, with graceful fallback to coordinates if unparsed.

### 2.2 Reactive Validation & UI Ergonomics
- **Premise 1**: Project rule `no-brainer-design.md` requires plain German terminology, accessible warnings, and immediate feedback without blocking the user unnecessarily.
- **Premise 2**: `validateGermanAddress(street, housenr, zip, city)` produces `errors` (e.g. invalid 5-digit PLZ) and `warnings` (e.g. missing house number).
- **Deduction**: In the 3 address forms, validation should be reactive via Svelte 5 `$derived`:
  ```typescript
  const addressValidation = $derived(
      validateGermanAddress(formData.street, formData.housenr, formData.zip, formData.city)
  );
  ```
  If `formData.zip` is entered with fewer than 5 digits (e.g. "1234"), display an inline indicator:
  `<span class="text-xs text-rose-500 font-medium">PLZ muss 5 Ziffern haben</span>`.
  If house number is missing but street is filled, show an unobtrusive warning badge rather than hard-blocking save, accommodating non-standard addresses (e.g. rural plots or named facilities).

### 2.3 PocketBase Payload Protection in `DriveRecordModal`
- **Premise 1**: `backend/pb_schema.json` defines only `type`, `km`, `lump_sum` for `drive_records`.
- **Premise 2**: Sending unexpected keys in PocketBase REST calls causes immediate 400 Bad Request responses.
- **Deduction**: In `DriveRecordModal.svelte`, `GpsAddressButton` captures the current location for caregiver on-site transparency. The component displays:
  ```svelte
  {#if capturedLocation}
      <div class="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
          <span>📍</span>
          <span class="font-medium truncate">{capturedLocation}</span>
      </div>
  {/if}
  ```
  The submission payload to `pb.collection('drive_records')` must strictly remain `{ type, km, lump_sum }`, preserving database integrity while delivering the native 1-click GPS feature.

---

## 3. Caveats

1. **OpenStreetMap Nominatim Rate Limits**:
   Nominatim has an upstream usage policy (maximum 1 request per second). In normal caregiver usage ("Standort erfassen" button clicks), this threshold is never reached. In automated test environments, all Nominatim calls are intercepted by `setNominatimMock()`, so no actual HTTP requests hit OSM.
2. **Offline Mode Address Resolution**:
   When offline, `locationService.getCurrentPosition()` returns GPS coordinates without an address string. The UI must cleanly handle this by displaying the coordinate pair rather than failing or showing "undefined".
3. **Leading Zeros in German Postal Codes**:
   German ZIP codes can have leading zeros (e.g., Dresden `01067`). Form input fields must always bind to string values (`type="text" inputmode="numeric"`), never number inputs, to prevent truncation of leading zeros.

---

## 4. Conclusion

1. **System Readiness**: Both `locationService.ts` and `addressValidationService.ts` are fully typed, tested, and mockable. The test suite currently passes 100% (75/75 tests), and `svelte-check` is clean (0 errors, 0 warnings).
2. **Decomposition & Line Limits**: All 5 target components have sufficient line headroom (between 61 and 145 lines) to accommodate `GpsAddressButton` and validation wiring without needing decomposition or violating `code-minimalism.md` (<= 250 lines).
3. **Recommended Implementation Plan**:
   - Step 1: Augment `addressValidationService.ts` with `parseGermanAddress()` and export it.
   - Step 2: Wire `GpsAddressButton` into `DriveRecordModal.svelte` and `AppointmentLocationTab.svelte`.
   - Step 3: Wire `GpsAddressButton` and reactive `validateGermanAddress` into `ClientMasterDataTab.svelte`, `ClientMasterTab.svelte`, and `ContactBasicInfoFields.svelte`.
   - Step 4: Run Challenger / Adversarial tests for M2 (`frontend/tests/challenger_m2.test.ts`) covering address parsing, duplicate detection, invalid postal codes, and mock GPS failure modes.

---

## 5. Verification Method

To independently verify the Milestone 2 deliverables, execute the following commands and checks:

### 5.1 Automated Test Execution

```bash
# 1. Verify TypeScript types and Svelte diagnostics across all components
npm --prefix frontend run check

# 2. Run standard 4-tier E2E test suite
npm --prefix frontend test

# 3. Audit line count of all modified files (MUST be <= 250 lines each)
powershell -Command "Get-ChildItem -Path frontend/src/lib/services/addressValidationService.ts, frontend/src/lib/components/DriveRecordModal.svelte, frontend/src/lib/components/appointmentModal/AppointmentLocationTab.svelte, frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte, frontend/src/routes/clients/new/components/ClientMasterTab.svelte, frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte | ForEach-Object { Write-Host `$_.Name (Get-Content `$_.FullName | Measure-Object -Line).Lines }"
```

### 5.2 Specific Challenger Test Criteria for Milestone 2

Reviewers and Challengers must verify that the following edge cases pass:

| ID | Category | Test Condition | Expected Result |
|---|---|---|---|
| **CH-M2-01** | `validateGermanAddress` | 4-digit ZIP (`"1234"`), 6-digit ZIP (`"123456"`), alphanumeric (`"1234A"`) | `isValid === false`, error: `"Die Postleitzahl muss genau 5 Ziffern haben."` |
| **CH-M2-02** | `validateGermanAddress` | Valid German ZIP with leading zero (`"01067"`, Dresden) | `isValid === true`, no errors |
| **CH-M2-03** | `validateGermanAddress` | Street with house number included (`"Hauptstr. 12"`, housenr empty) | `warnings` contains `"Die Straße scheint bereits eine Hausnummer zu enthalten."` |
| **CH-M2-04** | `parseGermanAddress` | Standard Nominatim output (`"Marienplatz 1, 80331 München"`) | `{ street: "Marienplatz", housenr: "1", zip: "80331", city: "München" }` |
| **CH-M2-05** | `parseGermanAddress` | Complex street name & suffix (`"Dr.-Külz-Ring 15b, 01067 Dresden"`) | `{ street: "Dr.-Külz-Ring", housenr: "15b", zip: "01067", city: "Dresden" }` |
| **CH-M2-06** | `parseGermanAddress` | Raw coordinates fallback (`"52.520008, 13.404954"`) | Does not crash; street receives coordinates, zip/city empty |
| **CH-M2-07** | `areAddressesDuplicate` | Differing casing, whitespace, and punctuation (`"Hauptstr. 1, 10115 Berlin"` vs `"hauptstr 1  10115 berlin"`) | Returns `true` |
| **CH-M2-08** | `GpsAddressButton` | GPS permission denied (`mockCapacitorBridge.locationPermission = 'denied'`) | Shows toast error, button resets `isLocating = false`, no crash |
| **CH-M2-09** | `GpsAddressButton` | GPS hardware timeout (`mockCapacitorBridge.locationError = { code: 3 }`) | Shows toast error: `"Standort-Signal zu schwach..."`, resets state |
| **CH-M2-10** | `DriveRecordModal` | Save with captured GPS location | PocketBase `drive_records.create` payload only receives `{ type, km, lump_sum }` (no 400 error) |

### 5.3 Invalidation Conditions
- Any component exceeding 250 lines invalidates compliance with `code-minimalism.md`.
- Any error reported by `npm --prefix frontend run check` invalidates type safety.
- Any regression breaking the 75 existing tests invalidates the milestone.
