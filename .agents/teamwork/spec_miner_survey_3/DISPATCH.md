# Task Assignment for Spec Miner 3 (Architecture, Capacitor Setup, Build Pipeline & Rule Constraints)
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\spec_miner_survey_3\
Original Request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md


## 2026-11-11T08:13:40Z
You are a teamwork_spec_miner tasked with Phase 0 Survey for OrgaFlow hybrid app features.
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\spec_miner_survey_3\
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY: read this first).

Your Mission:
Investigate authoritative project configuration, dependencies, build pipelines, and project design rules in s:\OrgaFlow_Alpha:
1. Capacitor & Hybrid Setup:
   - Check capacitor.config.ts (or json), plugins installed in frontend/package.json, Android setup in android/.
   - Verify Capacitor 7 dependencies, native platform configurations, permissions (Camera, Geolocation, Biometrics) in AndroidManifest.xml and iOS Info.plist.
2. Build & Verification Pipelines:
   - Check how npm run check and npm run build work in frontend/. What is the output directory (e.g., pb_public or build)?
   - Check how npx cap sync executes and if there are any current warnings or discrepancies.
3. Design Rules & Constraint Specifications:
   - Review rule files in .agents/rules/:
     - code-minimalism.md (<= 250 lines strict limit)
     - zero-inner-scroll.md (no nested scroll containers)
     - mobile-landscape-mode.md (landscape optimization)
     - no-brainer-design.md (clear German UI, feedback)
     - alphabetical-select.md (alphabetical sorting)
     - layer-stacking.md (z-index hierarchy)
   - Audit the PocketBase collections and field schemas related to drive records, documents, visit reports/appointments, and user settings.
4. Test Infrastructure:
   - Check existing test setups (vitest, playwright, etc.) in frontend/ to inform the E2E Testing Track.

Write your full findings and recommendations to:
s:\OrgaFlow_Alpha\.agents\teamwork\spec_miner_survey_3\analysis.md
and write your self-contained handoff report to:
s:\OrgaFlow_Alpha\.agents\teamwork\spec_miner_survey_3\handoff.md.
Update progress.md in your state folder with your heartbeat and steps.
When complete, notify me with send_message.
