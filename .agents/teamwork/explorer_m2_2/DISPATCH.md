## 2026-11-11T09:20:30Z
You are Explorer 2 for Milestone 2 of OrgaFlow Hybrid App.
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m2_2\
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY: read this first).
Project plan: s:\OrgaFlow_Alpha\PROJECT.md
Scope document: s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_m2\SCOPE.md

Your Mission:
Investigate the technical integration of 1-click GPS capture and address validation into:
1. `frontend/src/lib/components/clients/clientEdit/ClientMasterDataTab.svelte`
2. `frontend/src/routes/clients/new/components/ClientMasterTab.svelte`
3. `frontend/src/lib/components/contacts/ContactBasicInfoFields.svelte`
Also examine `frontend/src/lib/components/common/GpsAddressButton.svelte` and `frontend/src/lib/services/addressValidationService.ts`.

Tasks:
1. Read the target files and inspect their current line counts and structure. Files MUST stay <= 250 lines.
2. Examine how street, house number, zip code, and city fields are modeled and bound in each component.
3. Analyze how `addressValidationService.ts` (`validateGermanAddress(street, housenr, zip, city)`) should be triggered (e.g. on blur, on change, or on submit) and how validation feedback/badges should be displayed clearly in German.
4. Analyze how `GpsAddressButton` can parse the reverse-geocoded address string or coordinate to prefill street, house number, zip, city into these forms.
5. Identify any file decomposition needed if any component is near 250 lines.
6. Provide a concrete implementation plan for the Worker.
7. Write your complete analysis and recommendations to `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_m2_2\handoff.md`.
