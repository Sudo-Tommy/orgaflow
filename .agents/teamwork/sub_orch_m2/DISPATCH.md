## 2026-11-11T09:19:00Z

# Dispatch Assignment: Milestone 2 Sub-Orchestrator
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_m2\
Scope document: s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_m2\SCOPE.md
Project plan: s:\OrgaFlow_Alpha\PROJECT.md
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md

Mission:
Execute Milestone 2 (Location Service & Address Validation Integration) following the Sub-Orchestrator procedure:
1. Run the iteration loop: Explorer (3) -> Worker (1) -> Reviewer (2) -> Challenger (2) -> Forensic Auditor (1) -> Gate check.
2. Deliverables:
   - Wire 1-click GPS capture via `GpsAddressButton` into `DriveRecordModal.svelte` for Fahrtenbuch tour and mileage logging.
   - Wire 1-click GPS capture via `GpsAddressButton` into `AppointmentLocationTab.svelte` for automatic appointment location prefill.
   - Wire 1-click GPS capture and `addressValidationService.ts` validation into `ClientMasterDataTab.svelte`, `ClientMasterTab.svelte`, and `ContactBasicInfoFields.svelte`.
3. Strict Governance:
   - Every file modified must remain strictly <= 250 lines.
   - Zero inner scrollbars.
   - `npm --prefix frontend run check`: 0 errors, 0 warnings.
   - `npm --prefix frontend test`: 75/75 tests passing.
   - `npm --prefix frontend run build`: Clean production build.
4. When all gate criteria PASS, write handoff.md in your state folder and notify parent with send_message.
