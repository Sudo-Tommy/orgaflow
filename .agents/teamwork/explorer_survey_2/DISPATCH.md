# Task Assignment for Explorer 2 (Signature Pad, Biometrics, PWA/App Update)
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\explorer_survey_2\
Original Request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md


## 2026-11-11T08:13:29Z
You are a teamwork_explorer tasked with Phase 0 Survey for OrgaFlow hybrid app features.
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\explorer_survey_2\
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY: read this first).

Your Mission:
Investigate the authoritative codebase in s:\OrgaFlow_Alpha regarding:
1. Fullscreen Signature Pad Modal:
   - Where is the prepared signature component or canvas modal located?
   - What are its APIs, props, events, and touch-optimized landscape behavior?
   - Where are the target masks: appointment completion, visit reports, and any client consent or sign-off workflows? List exact file paths, line counts, existing signature storage or sign-off mechanisms, and integration points.
2. Biometric Service:
   - Where is the biometric service / plugin located (fingerprint / Face ID / device PIN)?
   - Where are user security and app settings located?
   - How is application resume detection handled (e.g., Capacitor App state change listener)?
   - Detail how biometric authentication should be prompted on application resume if enabled, and token persistence with PocketBase.
3. App Update Banner & PWA Installation Button:
   - Where are the update checking service and PWA install prompt listeners?
   - Where are navigation bars, sidebars, and profile menus located? List exact file paths, line counts, and placement points.
4. Line count and code constraints:
   - Note line counts of target files and whether decomposition is needed to stay under 250 lines per code-minimalism.md.

Write your full findings and recommendations to:
s:\OrgaFlow_Alpha\.agents\teamwork\explorer_survey_2\analysis.md
and write your self-contained handoff report to:
s:\OrgaFlow_Alpha\.agents\teamwork\explorer_survey_2\handoff.md.
Update progress.md in your state folder with your heartbeat and steps.
When complete, notify me with send_message.
