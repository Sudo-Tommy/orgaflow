# 5-Component Handoff Report: Hybrid App Architecture Survey (Signature, Biometrics, PWA/Updates)

**State Folder**: `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_survey_2\`  
**Date**: 2026-11-11  
**Investigator**: `explorer_survey_2` (Teamwork Explorer)  
**Parent Conversation**: `45f0a4d9-3ab1-4240-ac16-176095aa2a7f`

---

## 1. Observation

1. **Fullscreen Signature Component Location and Code**:
   - File: `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` (205 lines).
   - Props interface (lines 8–20):
     ```svelte
     let {
         title = "Unterschrift erfassen",
         signerName = "",
         isOpen = $bindable(false),
         onSave,
         onCancel
     }: {
         title?: string;
         signerName?: string;
         isOpen: boolean;
         onSave: (dataUrl: string) => void;
         onCancel?: () => void;
     } = $props();
     ```
   - Native Orientation and Back Button registration in `onMount` (lines 27–39):
     ```svelte
     onMount(() => {
         if (!isOpen) return;
         setupOrientation();
         const unregisterBack = backButtonHandler.register(() => {
             closeModal();
             return true;
         });
         return () => {
             resetOrientation();
             unregisterBack();
         };
     });
     ```
   - Landscape locking implementation (lines 41–55):
     ```svelte
     async function setupOrientation() {
         if (Capacitor.isNativePlatform()) {
             try {
                 await ScreenOrientation.lock({ orientation: 'landscape' });
             } catch (e) {}
         }
     }
     ```
   - Layout classes (lines 131–204):
     Uses `fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex flex-col p-3 sm:p-6 select-none` and `flex-1 flex flex-col lg:flex-row gap-3 pt-3 min-h-0`. Buttons are aligned right in landscape mode via `flex lg:flex-col justify-end gap-2.5 shrink-0`.

2. **Target Masks & Workflows**:
   - **Appointment Completion (Web/Admin)**:
     - `frontend/src/lib/components/appointmentDetail/AppointmentCompleteModal.svelte` (235 lines).
     - Submits through `frontend/src/lib/services/appointmentCompleteService.svelte.ts` (222 lines) updating `time_record`, `drive_record`, `report`, `tasks`, and setting `status: 'beendet'`, `finished_at: new Date().toISOString()`.
     - Has no signature capture element currently.
   - **Caregiver Mobile Appointment Modal**:
     - `frontend/src/lib/components/mitarbeiter/CaregiverAppointmentModal.svelte` (189 lines).
     - Subcomponent: `frontend/src/lib/components/mitarbeiter/CaregiverAppointmentSignature.svelte` (154 lines).
     - Storage: `caregiverPortalService.svelte.ts` lines 81–90 saves to PocketBase `appointments.checklist` JSON:
       ```ts
       const normalizedChecklist = {
           items: Array.isArray(options.checklist) ? options.checklist : [],
           signature: options.signatureDataUrl || null,
           signed_by: options.signerName?.trim() || null,
           signed_at: options.signatureDataUrl ? new Date().toISOString() : null,
           photos: Array.isArray(options.photos) ? options.photos : [],
           recorded_minutes: options.durationMinutes || null,
           recorded_km: options.kilometers || null
       };
       patchData.checklist = normalizedChecklist;
       ```
   - **Visit Reports**:
     - `frontend/src/lib/components/appointmentDetail/AppointmentReportSection.svelte` (138 lines). Dictation (`Mic`), audio records, AI report generator (`AiReportModal`), and text editing.
   - **Client Consent & Documents**:
     - `frontend/src/lib/components/clients/clientEdit/ClientSignatureDocumentsTab.svelte` (237 lines) & `ClientSignatureFullscreenModal.svelte` (119 lines). Saves signature to `clients.sign` via FormData.
     - `frontend/src/lib/components/clients/CarepersonSignatureModal.svelte` (245 lines). Saves signature to `contacts.signature`.
     - `frontend/src/routes/clients/new/components/ClientSignatureModal.svelte` (243 lines). New client admission signature.
     - `frontend/src/lib/components/profile/ProfileSignatureCard.svelte` (217 lines). User profile signature (`users.sign`).

3. **Biometric & Device PIN Lock Service**:
   - File: `frontend/src/lib/services/biometricService.ts` (96 lines).
   - Storage keys: `PREF_BIOMETRIC_KEY = 'orga_biometric_lock_enabled'` and `PREF_PIN_HASH_KEY = 'orga_app_pin_hash'` via `@capacitor/preferences`.
   - App state change listener in `biometricService.ts` lines 29–36:
     ```ts
     if (Capacitor.isNativePlatform()) {
         App.addListener('appStateChange', (state) => {
             if (!state.isActive && this.isEnabled) {
                 this.isLockedState = true;
             }
         });
     }
     ```
   - Integration in `frontend/src/lib/components/app/NativeAppManager.svelte` (97 lines):
     ```svelte
     let isLocked = $state(false);
     onMount(async () => {
         if (Capacitor.isNativePlatform()) {
             backButtonHandler.init();
             await biometricService.init();
             isLocked = biometricService.isLockActive;
         }
     });
     ```
   - PocketBase persistence: `frontend/src/lib/services/pocketbase.ts` lines 31–58 synchronizes auth token and model to `@capacitor/preferences` under key `'pb_native_auth'`.
   - Security Settings view: `frontend/src/lib/components/profile/ProfileSecurityCard.svelte` (27 lines). Only contains password modification fields.

4. **App Update Banner & PWA Installation**:
   - `frontend/src/lib/components/app/AppUpdateBanner.svelte` (81 lines): Compares `App.getInfo().version` with `https://www.ihre-seniorenassistenz.com/api/mobile/version.json`. Rendered inside `NativeAppManager.svelte:51`.
   - `frontend/src/lib/components/app/PwaInstallButton.svelte` (76 lines): Listens to `window.beforeinstallprompt`.
   - Placements:
     - Embedded in `frontend/src/lib/components/sidebar/SidebarActions.svelte:117` (`<PwaInstallButton variant="full" />`).
     - Absent in `frontend/src/lib/components/sidebar/MobileNavActions.svelte` (153 lines).

5. **Type Check Baseline**:
   - Command `npm --prefix frontend run check` executed with result: `svelte-check found 0 errors and 0 warnings`.

---

## 2. Logic Chain

1. **Orientation Locking Lifecycle in `FullscreenSignatureModal`**:
   - *Observation 1* shows `setupOrientation()` is wrapped in `onMount(() => { if (!isOpen) return; ... })`.
   - When consumers instantiate `<FullscreenSignatureModal bind:isOpen={showModal} />`, `showModal` defaults to `false`.
   - Because `onMount` executes once on component mount, `!isOpen` evaluates to `true` and the function returns immediately.
   - Therefore, when `isOpen` becomes `true` later on user interaction, neither `setupOrientation()` nor `backButtonHandler.register()` are ever called.
   - *Inference*: The lifecycle must be reactive using a Svelte 5 `$effect` bound to `isOpen`.

2. **Touch/Landscape Fullscreen Integration in Target Masks**:
   - *Observation 2* shows `AppointmentCompleteModal.svelte` has 235 lines and currently has no signature capture.
   - Per `code-minimalism.md`, components must not exceed 250 lines. Adding an inline canvas and drawing handlers will immediately breach the 250-line limit (235 + ~30 = 265 lines).
   - In contrast, delegating signature capture to `FullscreenSignatureModal.svelte` requires only a trigger button, an `isOpen` boolean, and an `onSave` handler (approx 8 lines of code), or moving task selection to a subcomponent `AppointmentCompleteTasks.svelte`.
   - In `CaregiverAppointmentModal.svelte`, `CaregiverAppointmentSignature.svelte` (154 lines) already captures signatures into `appointments.checklist.signature`. Adding a fullscreen expand button to open `FullscreenSignatureModal` provides optimal landscape touch signing without changing the backend format.

3. **Biometric / PIN Resume Reactivity Gap**:
   - *Observation 3* demonstrates that `biometricService.ts` maintains `isLockedState` as a private property without Svelte 5 reactivity or event emission.
   - In `NativeAppManager.svelte`, `isLocked` is only set once during `onMount()`.
   - When the user pauses and resumes the native app, `App.addListener('appStateChange')` sets `this.isLockedState = true`, but `NativeAppManager` receives no signal and does not re-evaluate `isLocked`.
   - *Inference*: `biometricService` must be made reactive (e.g., Svelte 5 `$state` in `biometricService.svelte.ts`) so that `NativeAppManager` derives `isLocked` reactively and shows the lock screen upon resume.

4. **Settings Placement & Token Security**:
   - *Observation 3* identifies `ProfileSecurityCard.svelte` (27 lines) as the primary user security component, with ample room (buffer: 223 lines) to host PIN lock configuration and biometrics toggle.
   - Because `pocketbase.ts` persists `pb_native_auth` in `@capacitor/preferences`, locking the UI behind `NativeAppManager.svelte` avoids logging the user out of PocketBase while preventing unauthorized access to the application in the field.

5. **PWA Button Placement**:
   - *Observation 4* shows `PwaInstallButton.svelte` is properly placed in the desktop sidebar (`SidebarActions.svelte`), but missing in the mobile drawer (`MobileNavActions.svelte` - 153 lines).
   - Adding `<PwaInstallButton variant="full" />` to `MobileNavActions.svelte` restores feature parity on mobile browsers.

---

## 3. Caveats

- **Hardware Biometrics**: `frontend/package.json` currently has `@capacitor/preferences` and `@capacitor/app`, but does not include a native biometric plugin such as `@pantrist/capacitor-native-biometric` or `@aparajita/capacitor-biometric-auth`. The existing implementation in `biometricService.ts` uses SHA-256 PIN verification. If true fingerprint / Face ID hardware prompts are required, the corresponding Capacitor plugin or WebAuthn Credential API must be added.
- **Android Manifest & Permissions**: Android orientation lock requires standard Capacitor configuration in `android/app/src/main/AndroidManifest.xml` (which is already standard in Capacitor projects).
- **Offline Signature Storage**: Signatures are serialized as PNG Data URLs (base64 string). Storing multiple high-resolution signatures directly in PocketBase JSON fields (`checklist`) increases record size; keeping the canvas dimension trimmed via `trimSignatureCanvas` (as in `signatureUtils.ts`) is recommended.

---

## 4. Conclusion

1. **Fullscreen Signature Pad Modal**: `FullscreenSignatureModal.svelte` is already well-designed with landscape flex and Capacitor screen orientation locking. Fixing its `isOpen` reactive lifecycle in `$effect` is required before connecting it to `AppointmentCompleteModal.svelte` (via subcomponent decomposition) and `CaregiverAppointmentSignature.svelte` (via fullscreen expand trigger).
2. **Biometric & App Resume Service**: `biometricService.ts` needs Svelte 5 rune reactivity so that `NativeAppManager.svelte` immediately shows the lock overlay on app resume. `ProfileSecurityCard.svelte` is the ideal location to expose the PIN setup and biometric toggle.
3. **PWA Install Button**: Needs to be inserted into `MobileNavActions.svelte` above the footer actions.
4. **Line Count Health**: The codebase is in excellent shape (0 `svelte-check` errors), but five components are close to 250 lines (`AppointmentCompleteModal`, `CarepersonSignatureModal`, `CaregiverProfileTab`, `ClientSignatureModal`, `ClientSignatureDocumentsTab`) and must be decomposed before substantial additions.

---

## 5. Verification Method

1. **Type & Rule Verification**:
   - Run type check in `frontend/`:
     ```powershell
     npm --prefix frontend run check
     ```
     *Expected Result*: 0 errors, 0 warnings.
2. **Line Count Limit Check**:
   - Run line count audit across modified targets:
     ```powershell
     Get-ChildItem -Path frontend\src\lib\components\app, frontend\src\lib\components\appointmentDetail, frontend\src\lib\components\profile, frontend\src\lib\components\sidebar, frontend\src\lib\services | Where-Object { $_.Extension -match "\.(svelte|ts)$" } | ForEach-Object { [PSCustomObject]@{ File = $_.Name; Lines = (Get-Content $_.FullName).Count } } | Where-Object { $_.Lines -gt 250 }
     ```
     *Expected Result*: Zero files returned with lines > 250.
3. **Modal Lifecycle & Landscape Inspection**:
   - Inspect `FullscreenSignatureModal.svelte`: ensure orientation lock and back button unregister are handled inside `$effect(() => { if (isOpen) { ... return () => { ... } } })`.
   - Verify modal opens properly when triggered with `isOpen = true` after initial mount.
4. **Biometric Resume Verification**:
   - Inspect `NativeAppManager.svelte` and `biometricService`: verify that toggling app state to inactive triggers `isLocked` in `NativeAppManager` and unlocks cleanly upon entering the valid PIN.
