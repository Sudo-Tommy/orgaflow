# Handoff Report — Explorer 2 (Milestone 2)

**Mission**: Technical investigation of 1-click GPS capture and German address validation into:
1. `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte`
2. `frontend/src/routes/clients/new/components/ClientMasterTab.svelte`
3. `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte`
with `frontend/src/lib/components/common/GpsAddressButton.svelte` and `frontend/src/lib/services/addressValidationService.ts`.

---

## 1. Observation

### 1.1 Target File Line Counts & Baseline State
Direct inspection of file line counts using PowerShell `Get-Content`:
- `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte`: **117 lines**
- `frontend/src/routes/clients/new/components/ClientMasterTab.svelte`: **111 lines**
- `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte`: **189 lines**
- `frontend/src/lib/components/common/GpsAddressButton.svelte`: **75 lines**
- `frontend/src/lib/services/addressValidationService.ts`: **67 lines**
- `frontend/src/lib/services/locationService.ts`: **110 lines**

### 1.2 Data Modeling and Field Bindings in Target Components
All three target components model addresses using four distinct string fields:
1. `ClientMasterDataTab.svelte` (lines 92–110):
   ```svelte
   <input id="edit-street" type="text" bind:value={editState.formData.street} ... />
   <input id="edit-housenr" type="text" bind:value={editState.formData.housenr} ... />
   <input id="edit-zip" type="text" inputmode="numeric" bind:value={editState.formData.zip} ... />
   <input id="edit-city" type="text" bind:value={editState.formData.city} ... />
   ```
   Component receives: `let { editState } = $props<{ editState: any }>();`.
2. `ClientMasterTab.svelte` (lines 92–109):
   ```svelte
   <input id="new-street" type="text" bind:value={formData.street} ... />
   <input id="new-housenr" type="text" bind:value={formData.housenr} ... />
   <input id="new-zip" type="text" bind:value={formData.zip} ... />
   <input id="new-city" type="text" bind:value={formData.city} ... />
   ```
   Component receives: `let { formData = $bindable(), isLoading }: Props = $props();` with `ClientFormData`.
3. `ContactBasicInfoFields.svelte` (lines 171–188):
   ```svelte
   <input id="contact-street" type="text" bind:value={state.street} ... />
   <input id="contact-housenr" type="text" bind:value={state.housenr} ... />
   <input id="contact-zip" type="text" bind:value={state.zip} ... />
   <input id="contact-city" type="text" bind:value={state.city} ... />
   ```
   Component receives: `let { state, onGoogleLookup }: Props = $props();` with `ContactModalState`.

### 1.3 `locationService.ts` and `GpsAddressButton.svelte` Output Format
- In `frontend/src/lib/services/locationService.ts` (lines 82–107), reverse geocoding parses OpenStreetMap Nominatim JSON:
  ```ts
  const street = addr.road || addr.pedestrian || addr.street || '';
  const houseNo = addr.house_number || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || '';
  const postcode = addr.postcode || '';

  const parts = [];
  if (street) parts.push(`${street} ${houseNo}`.trim());
  if (postcode || city) parts.push(`${postcode} ${city}`.trim());

  return parts.length > 0 ? parts.join(', ') : data.display_name || null;
  ```
  Produces strings formatted as `"<Street> <Housenr>, <Zip> <City>"` (e.g. `"Marienplatz 1, 80331 München"` or `"Musterstraße 12a, 01067 Dresden"`). If reverse geocoding is offline, it falls back to `"${latitude.toFixed(6)}, ${longitude.toFixed(6)}"`.
- In `frontend/src/lib/components/common/GpsAddressButton.svelte` (lines 7–12 & 29–34):
  ```svelte
  interface Props {
      onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void;
      label?: string;
      variant?: 'button' | 'icon';
      disabled?: boolean;
      class?: string;
  }
  ```
  `onAddressCaptured` delivers the formatted address string plus `{ latitude, longitude }`.

### 1.4 `addressValidationService.ts` Contract
In `frontend/src/lib/services/addressValidationService.ts` (lines 6–20):
```ts
export interface AddressValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    formattedAddress: string;
}

export function validateGermanAddress(
    street: string,
    housenr: string,
    zip: string,
    city: string
): AddressValidationResult;
```
Checks:
- Error if `street` is empty.
- Warning if `street` contains numbers and `housenr` is empty.
- Warning if `housenr` is empty.
- Error if `zip` is empty or not exactly 5 digits (`/^[0-9]{5}$/`).
- Error if `city` is empty.

### 1.5 Code Minimalism Budget & Risk
- `ClientMasterDataTab.svelte`: 117 lines. Remaining budget: 133 lines.
- `ClientMasterTab.svelte`: 111 lines. Remaining budget: 139 lines.
- `ContactBasicInfoFields.svelte`: 189 lines. Remaining budget: 61 lines.
  `ContactBasicInfoFields.svelte` already contains 76 lines of category role buttons (lines 12–88) and 64 lines of personal inputs (lines 90–153). Adding GPS prefill logic, validation logic, badges, and button styling in-place would add ~50–65 lines, pushing the file to **239–254 lines**, violating or threatening the 250-line rule (`code-minimalism.md`).

---

## 2. Logic Chain

1. **Address Parsing Necessity**:
   - `locationService.getCurrentPosition()` and `GpsAddressButton` return a single combined address string (e.g. `"Marienplatz 1, 80331 München"`).
   - The master data models in `ClientMasterDataTab`, `ClientMasterTab`, and `ContactBasicInfoFields` store addresses across 4 separate fields (`street`, `housenr`, `zip`, `city`).
   - Therefore, a parser function `parseAddressString(rawAddress: string): { street: string; housenr: string; zip: string; city: string }` is required to translate the 1-click GPS output into the discrete form fields.
   - Placing `parseAddressString` in `addressValidationService.ts` keeps address parsing and validation co-located in a single domain service. `addressValidationService.ts` is only 67 lines, so adding 35 lines keeps it at ~102 lines (well below 250 lines).

2. **Validation Trigger Strategy**:
   - Running validation strictly on submit prevents real-time feedback after GPS prefill or typing.
   - Running validation on every keystroke with active red error messages on empty forms violates `no-brainer-design.md` ("Fehlermeldungen erklären verständlich das Problem und bieten direkt eine einfache Lösung. Niemals vorab mit Fehlern überfordern").
   - **Optimal Pattern**: In Svelte 5, compute validation reactively using `$derived`:
     ```ts
     let addressValidation = $derived(validateGermanAddress(street, housenr, zip, city));
     let hasAddressInput = $derived(Boolean(street?.trim() || housenr?.trim() || zip?.trim() || city?.trim()));
     ```
   - Gating visual alerts behind `hasAddressInput`:
     - If all fields are empty: No error banner shown (clean, non-intrusive).
     - As soon as GPS prefill sets the fields OR the user begins typing:
       - If valid with no warnings: Display green confirmation capsule (`🟢 Adresse vollständig: {addressValidation.formattedAddress}`).
       - If valid with warning (e.g. missing house number): Display amber advisory capsule (`🟡 Hinweis: {addressValidation.warnings.join(' • ')}`).
       - If invalid (e.g. 4-digit PLZ or missing city): Display rose guidance capsule (`🔴 Bitte prüfen: {addressValidation.errors.join(' • ')}`).

3. **Decomposition & Architecture Strategy**:
   - `ContactBasicInfoFields.svelte` is 189 lines. To comply with `code-minimalism.md` (<= 250 lines) and avoid code duplication across the three forms, a reusable component `AddressInputGroup.svelte` should be created in `frontend/src/lib/components/common/AddressInputGroup.svelte`.
   - `AddressInputGroup.svelte` encapsulates:
     - 4-column responsive grid (`sm:col-span-3` / `sm:col-span-1` layout, with `landscape:gap-2.5` and `landscape:min-h-[38px]`).
     - Header with title, Google Maps link, and `GpsAddressButton`.
     - Automatic parsing of reverse-geocoded GPS address via `parseAddressString`.
     - Live reactive validation feedback badge in German.
   - Impact on line counts:
     - `AddressInputGroup.svelte`: ~120 lines (<= 250 lines).
     - `ClientMasterDataTab.svelte`: reduces from 117 lines to ~95 lines.
     - `ClientMasterTab.svelte`: reduces from 111 lines to ~90 lines.
     - `ContactBasicInfoFields.svelte`: reduces from 189 lines to ~160 lines (safe by 90 lines).

---

## 3. Caveats

1. **Nominatim Format Variations**: Reverse geocoding from OpenStreetMap Nominatim generally produces `"<Road> <HouseNumber>, <Postcode> <City>"`. However, in rural or unmapped areas without house numbers, it returns `"<Road>, <Postcode> <City>"` or town names only. `parseAddressString` handles missing house numbers gracefully by returning `housenr: ''`.
2. **Offline Fallback**: When offline, `locationService.getCurrentPosition()` returns raw coordinates (`"${lat}, ${lon}"`). `parseAddressString` detects pure coordinates and assigns them to `street` without throwing, while `validateGermanAddress` flags missing PLZ/Ort so the user knows manual entry is needed.
3. **Existing Pre-flight Failure in Repo**: `svelte-check` currently reports 1 unrelated TypeScript error in `frontend/src/lib/services/appUpdateService.ts:105:30` (from Milestone 1). None of the address validation or client/contact components have errors.

---

## 4. Conclusion & Actionable Recommendations

### Recommendation 1: Enhance `addressValidationService.ts`
Add the export `parseAddressString(rawAddress: string)`:
```ts
export interface ParsedAddress {
    street: string;
    housenr: string;
    zip: string;
    city: string;
}

export function parseAddressString(raw: string): ParsedAddress {
    if (!raw || typeof raw !== 'string') {
        return { street: '', housenr: '', zip: '', city: '' };
    }
    const clean = raw.trim();
    if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(clean)) {
        return { street: clean, housenr: '', zip: '', city: '' };
    }

    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    let street = '';
    let housenr = '';
    let zip = '';
    let city = '';

    if (parts.length >= 2) {
        const streetPart = parts[0];
        const streetMatch = streetPart.match(/^(.+?)\s+(\d+[\s\w\-\/]*)$/);
        if (streetMatch) {
            street = streetMatch[1].trim();
            housenr = streetMatch[2].trim();
        } else {
            street = streetPart;
        }

        const zipCityPart = parts[1];
        const zipMatch = zipCityPart.match(/^(\d{5})\s+(.+)$/);
        if (zipMatch) {
            zip = zipMatch[1].trim();
            city = zipMatch[2].trim();
        } else if (/^\d{5}$/.test(zipCityPart)) {
            zip = zipCityPart;
        } else {
            city = zipCityPart;
        }
    } else if (parts.length === 1) {
        const match = clean.match(/^(.+?)\s+(\d+[\s\w\-\/]*)\s+(\d{5})\s+(.+)$/);
        if (match) {
            street = match[1].trim();
            housenr = match[2].trim();
            zip = match[3].trim();
            city = match[4].trim();
        } else {
            street = clean;
        }
    }

    return { street, housenr, zip, city };
}
```

### Recommendation 2: Create `frontend/src/lib/components/common/AddressInputGroup.svelte`
Create a unified, accessible component (~120 lines):
- **Props**:
  - `street = $bindable("")`
  - `housenr = $bindable("")`
  - `zip = $bindable("")`
  - `city = $bindable("")`
  - `idPrefix: string` (e.g. `"client-edit"`, `"client-new"`, `"contact"`)
  - `title?: string` (default: `"Wohnanschrift"`)
  - `disabled?: boolean`
  - `searchQueryName?: string`
  - `showGps?: boolean` (default: `true`)
- **Features**:
  - `GpsAddressButton` integrated in the section header alongside title and map button.
  - On GPS capture: calls `parseAddressString`, assigns to `$bindable` properties, and fires `toastStore.success("Standortadresse übernommen.")`.
  - Live validation pill using `validateGermanAddress(street, housenr, zip, city)`.
  - Mobile landscape styling (`landscape:gap-2.5`, `landscape:min-h-[38px]`).

### Recommendation 3: Integrate into Target Components
1. **`ClientMasterDataTab.svelte`**:
   Replace lines 83–110 with `<AddressInputGroup bind:street={editState.formData.street} bind:housenr={editState.formData.housenr} bind:zip={editState.formData.zip} bind:city={editState.formData.city} idPrefix="edit" title="3. Wohnanschrift" disabled={editState.isLoading} searchQueryName={`${editState.formData.name_first} ${editState.formData.name_last}`.trim()} />`.
2. **`ClientMasterTab.svelte`**:
   Replace lines 87–110 with `<AddressInputGroup bind:street={formData.street} bind:housenr={formData.housenr} bind:zip={formData.zip} bind:city={formData.city} idPrefix="new" title="Wohnanschrift" disabled={isLoading} searchQueryName={`${formData.name_first} ${formData.name_last}`.trim()} />`.
3. **`ContactBasicInfoFields.svelte`**:
   Replace lines 156–189 with `<AddressInputGroup bind:street={state.street} bind:housenr={state.housenr} bind:zip={state.zip} bind:city={state.city} idPrefix="contact" title="Anschrift" disabled={state.isLoading} searchQueryName={`${state.company_name ? state.company_name + ' ' : ''}${state.name_first || ''} ${state.name_last || ''}`.trim()} />`.
   This keeps `ContactBasicInfoFields.svelte` at ~160 lines (safely below 250).

---

## 5. Verification Method

To independently verify after implementation:
1. **Line Count Audit**:
   Execute in PowerShell:
   ```powershell
   @(
       "frontend/src/lib/services/addressValidationService.ts",
       "frontend/src/lib/components/common/AddressInputGroup.svelte",
       "frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte",
       "frontend/src/routes/clients/new/components/ClientMasterTab.svelte",
       "frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte"
   ) | ForEach-Object {
       [PSCustomObject]@{ Path = $_; Lines = (Get-Content $_).Length; Valid = (Get-Content $_).Length -le 250 }
   }
   ```
   *Pass Condition*: Every file has `Valid = True` (<= 250 lines).

2. **Test Suite Execution**:
   Run in workspace root:
   ```bash
   npm --prefix frontend test
   ```
   *Pass Condition*: All 74 existing passing tests remain green.

3. **GPS Prefill & Address Validation Functional Verification**:
   Inspect that:
   - Clicking `GpsAddressButton` populates `street`, `housenr`, `zip`, and `city`.
   - Entering invalid PLZ (e.g. `1234`) displays German warning `Die Postleitzahl muss genau 5 Ziffern haben.`.
   - Entering full valid address displays emerald badge `✓ Adresse vollständig`.
