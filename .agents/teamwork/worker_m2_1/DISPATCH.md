## 2026-11-11T09:29:30Z
You are Worker 1 for Milestone 2 of OrgaFlow Hybrid App.
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\worker_m2_1\
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY: read this first).
Project plan: s:\OrgaFlow_Alpha\PROJECT.md
Scope document: s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_m2\SCOPE.md

Explorer Reports:
- s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m2_1\handoff.md (DriveRecordModal & AppointmentLocationTab wiring)
- s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m2_2\handoff.md (AddressInputGroup, ClientMasterDataTab, ClientMasterTab, ContactBasicInfoFields)
- s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m2_3\handoff.md (Integration, Tests, Edge cases)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership (You have EXCLUSIVE write permission for these files):
1. `frontend/src/lib/services/addressValidationService.ts`
2. `frontend/src/lib/components/common/AddressInputGroup.svelte` (New component)
3. `frontend/src/lib/components/DriveRecordModal.svelte`
4. `frontend/src/lib/components/appointmentModal/AppointmentLocationTab.svelte`
5. `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte`
6. `frontend/src/routes/clients/new/components/ClientMasterTab.svelte`
7. `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte`

Your Tasks:
1. In `frontend/src/lib/services/addressValidationService.ts`:
   - Add and export `parseGermanAddress(address: string): { street: string; housenr: string; zip: string; city: string }` (alias `parseAddressString`).
   - Handles standard Nominatim format `"<Street> <Housenr>, <Zip> <City>"`, handles missing housenr, and falls back cleanly if raw coordinates or unparseable text.
   - Ensure file remains <= 250 lines.

2. Create `frontend/src/lib/components/common/AddressInputGroup.svelte`:
   - Reusable Svelte 5 component with `$bindable` street, housenr, zip, city.
   - Header with title, map link button, and `GpsAddressButton`.
   - On GPS capture: parses address via `parseGermanAddress`, populates `$bindable` properties, and emits success toast.
   - Reactive `$derived` German address validation badge via `validateGermanAddress`, gated behind `hasAddressInput` (no aggressive error on clean forms; shows green confirmation capsule on complete valid address, yellow on warning like missing housenr, rose guidance on invalid zip).
   - Responsive grid (`sm:col-span-3`, `sm:col-span-1`), zero inner scroll, mobile landscape support.
   - Must be <= 250 lines.

3. In `frontend/src/lib/components/DriveRecordModal.svelte`:
   - Integrate `GpsAddressButton`.
   - On capture: displays captured address badge, and if appointment destination is known, calculates route metrics via `fetchRouteMetrics` and pre-fills `km`.
   - When creating/saving to `drive_records` in PocketBase, ensure payload ONLY contains declared fields `{ type, km, lump_sum }` so PocketBase does not reject the record.
   - Must stay <= 250 lines.

4. In `frontend/src/lib/components/appointmentModal/AppointmentLocationTab.svelte`:
   - Add `GpsAddressButton` adjacent to location input.
   - On capture: sets `state.location_address = address`, resets `state.useClientAddress = false`, `state.selectedContactId = ""`.
   - Must stay <= 250 lines.

5. In `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte`, `frontend/src/routes/clients/new/components/ClientMasterTab.svelte`, and `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte`:
   - Replace manual 4-field address inputs with `<AddressInputGroup>`.
   - Verify `ContactBasicInfoFields.svelte` line count decreases to ~160 lines (strictly <= 250 lines!).

6. Verification:
   - Run line count audit on all modified/created files to ensure EVERY file is <= 250 lines.
   - Run `npm --prefix frontend run check` to ensure 0 errors.
   - Run `npm --prefix frontend test` to ensure tests pass.
   - Write your comprehensive handoff report to `s:\OrgaFlow_Alpha\.agents\teamwork\worker_m2_1\handoff.md`.
