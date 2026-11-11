# Scope: Milestone 2 — Location Service & Address Validation Integration

## Architecture
Integrate 1-click GPS capture with OpenStreetMap Nominatim reverse geocoding and German address validation into Fahrtenbuch, appointment scheduling, and client/contact master address forms.
Utilize the verified reusable component `frontend/src/lib/components/common/GpsAddressButton.svelte` and `frontend/src/lib/services/addressValidationService.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 6 | Fahrtenbuch 1-Click GPS | 1-click GPS capture with geocoded address in `DriveRecordModal.svelte` | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Tour / Appointment GPS | 1-click GPS address prefill in `AppointmentLocationTab.svelte` | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Address Validation & GPS | Address validation & GPS prefill in `ClientMasterDataTab`, `ClientMasterTab`, `ContactBasicInfoFields` | M2 | ORIGINAL_REQUEST §R1 |

## Interface Contracts
### `GpsAddressButton.svelte`
- Props:
  - `onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void`
  - `label?: string` (default: "Standort erfassen")
  - `variant?: 'button' | 'icon'` (default: 'button')
- Output: Resolves location via `locationService.getCurrentPosition()` and passes address string + coordinates.

### `addressValidationService.ts`
- Exports:
  - `validateGermanAddress(street, housenr, zip, city): { isValid: boolean; errors: string[] }`
  - `areAddressesDuplicate(a, b): boolean`

## Code Layout & File Ownership
- `frontend/src/lib/components/DriveRecordModal.svelte` (Modify: wire GpsAddressButton)
- `frontend/src/lib/components/appointmentModal/AppointmentLocationTab.svelte` (Modify: wire GpsAddressButton)
- `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte` (Modify: wire GpsAddressButton & validateGermanAddress)
- `frontend/routes/clients/new/components/ClientMasterTab.svelte` (Modify: wire GpsAddressButton & validateGermanAddress)
- `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte` (Modify: wire GpsAddressButton & validateGermanAddress)

## Governance Rules
- Strict <= 250 lines per file per `code-minimalism.md`.
- No nested scrollbars per `zero-inner-scroll.md`.
- No-brainer design per `no-brainer-design.md`: simple German button text ("📍 Standort erfassen", "Standort übernehmen"), clear feedback.
- Strict alphabetical ordering on any dropdown lists per `alphabetical-select.md`.
- Verification: `npm --prefix frontend run check` MUST pass with 0 errors/0 warnings. `npm test` MUST pass 75/75 tests.
