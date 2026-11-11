# Phase 0 Codebase Survey: Native & Hybrid App Features
**Explorer Agent**: `explorer_survey_2`  
**Date**: 2026-11-11  
**Project**: OrgaFlow Alpha Hybrid App (`frontend/`)  
**Scope**: Fullscreen Signature Pad Modal, Biometric Service & App Resume, App Update Banner & PWA Installation, Code Constraints (<= 250 lines)

---

## 1. Executive Summary

This survey provides an authoritative architectural analysis of the native hybrid capabilities of OrgaFlow (SvelteKit 2 + Svelte 5 runes + Capacitor 7). All investigated components, services, and integration targets have been mapped with exact paths, line numbers, and line counts.

Key survey findings:
1. **Fullscreen Signature Pad Modal**: A dedicated native/touch fullscreen signature modal is already implemented at `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` (205 lines). It supports screen orientation locking (landscape mode via `@capacitor/screen-orientation`), back button handling, high-DPI canvas scaling, and data URL generation. However, an architectural lifecycle bug was identified in its `onMount` hook where orientation locking and back button registration fail to execute if `isOpen` starts as `false`.
2. **Target Signature Masks**:
   - `AppointmentCompleteModal.svelte` (235 lines): Currently lacks signature collection. Adding signature capture requires careful line-count management (buffer: 15 lines) or subcomponent decomposition.
   - `CaregiverAppointmentModal.svelte` (189 lines) + `CaregiverAppointmentSignature.svelte` (154 lines): Currently uses a small fixed-height inline canvas. Needs a fullscreen expansion trigger to invoke `FullscreenSignatureModal` in landscape mode.
   - `AppointmentReportSection.svelte` (138 lines): Supports dictation and audio records; sign-off indicator / completion link is ready for integration.
   - Client consent and sign-off workflows: Established in `ClientSignatureDocumentsTab.svelte` (237 lines), `CarepersonSignatureModal.svelte` (245 lines), `ClientSignatureModal.svelte` (243 lines), `ContactSignaturePad.svelte` (215 lines), and `ProfileSignatureCard.svelte` (217 lines).
3. **Biometric & Device Security Service**:
   - Located at `frontend/src/lib/services/biometricService.ts` (96 lines).
   - Currently implements SHA-256 PIN hashing stored in `@capacitor/preferences` with an `App.addListener('appStateChange')` listener.
   - **Critical defect found**: `isLockedState` in `biometricService` is a non-reactive private variable. In `NativeAppManager.svelte` (97 lines), `isLocked` is only set in `onMount()`. As a result, when the app moves to background and resumes, the lock screen fails to appear reactively.
   - Security settings location: `frontend/src/lib/components/profile/ProfileSecurityCard.svelte` (27 lines) currently only has password reset; it is the ideal target to add biometric / PIN lock controls.
   - Token persistence: `pocketbase.ts` (lines 31-58) persists `pb_native_auth` in `@capacitor/preferences`.
4. **App Update Banner & PWA Installation**:
   - `AppUpdateBanner.svelte` (81 lines) checks `https://www.ihre-seniorenassistenz.com/api/mobile/version.json` for native APK updates and is rendered globally in `NativeAppManager.svelte`.
   - `PwaInstallButton.svelte` (76 lines) listens for Chromium `beforeinstallprompt`. It is integrated into the desktop sidebar (`SidebarActions.svelte:117`), but **missing** in the mobile drawer (`MobileNavActions.svelte`).
5. **Code Minimalism Compliance**:
   - All surveyed files currently respect the <= 250 line limit.
   - Five files are within 15 lines of the limit and require decomposition before substantial modifications.

---

## 2. Topic 1: Fullscreen Signature Pad Modal

### 2.1 Prepared Component Details
- **File Path**: `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\FullscreenSignatureModal.svelte`
- **Line Count**: 205 lines
- **Component Interface (Props & Events)**:
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
- **Orientation & Hardware Control**:
  - Uses `@capacitor/screen-orientation`:
    ```ts
    await ScreenOrientation.lock({ orientation: 'landscape' });
    ```
  - Unlocks orientation on exit:
    ```ts
    await ScreenOrientation.unlock();
    ```
  - Hardware back button handling via `backButtonHandler.register(...)`.
- **Canvas & Drawing Behavior**:
  - Touch-action: `touch-none cursor-crosshair`.
  - Supports mouse events (`mousedown`, `mousemove`, `mouseup`, `mouseleave`) and touch events (`touchstart`, `touchmove`, `touchend`).
  - Scales dimensions by `window.devicePixelRatio` for crisp retina/high-DPI signatures.
  - Line styling: `#0f172a`, round caps and joins, stroke width 3.
  - Outputs PNG base64 via `canvas.toDataURL('image/png')`.
- **Landscape Layout Structure**:
  - Top header (`pb-3 border-b border-slate-700/50`) displaying title, signer badge, and close button.
  - Body container using `flex-1 flex flex-col lg:flex-row gap-3 pt-3 min-h-0`.
  - On landscape screens / tablets (`lg:flex-row`), the canvas fills the viewport while action buttons (`Löschen`, `Bestätigen`) are docked vertically on the right side (`flex lg:flex-col justify-end gap-2.5 shrink-0`).

### 2.2 Critical Bug Identified in `FullscreenSignatureModal.svelte`
In lines 27–39:
```ts
onMount(() => {
    if (!isOpen) return;
    setupOrientation();
    const unregisterBack = backButtonHandler.register(() => {
        closeModal();
        return true;
    });
    ...
```
**Problem**: Modals are almost always rendered in the template with `isOpen = false` initially. Because `onMount` executes only once on mount, `if (!isOpen) return;` causes orientation lock and back-button registration to be permanently skipped when the user opens the modal later!  
**Recommended Fix**: Migrate orientation locking and back button registration to a Svelte 5 `$effect` that watches `isOpen`:
```ts
$effect(() => {
    if (isOpen) {
        setupOrientation();
        const unregisterBack = backButtonHandler.register(() => {
            closeModal();
            return true;
        });
        return () => {
            resetOrientation();
            unregisterBack();
        };
    }
});
```

---

### 2.3 Target Masks for Signature Integration

| Target Mask | File Path | Line Count | Current Mechanism | Storage Field & Backend Format | Integration Point & Strategy |
|---|---|---|---|---|---|
| **Appointment Completion (Admin/Web)** | `frontend/src/lib/components/appointmentDetail/AppointmentCompleteModal.svelte` | 235 lines | No signature captured. Form collects client, billing type, times, km, tasks, and report. | Saved via `appointmentCompleteService.svelte.ts` into `appointments` record (`status: 'beendet'`, `finished_at`, `report`, `time_record`, `drive_record`). | Add "✍️ Unterschrift erfassen" button triggering `FullscreenSignatureModal`. Store base64 / PNG into `checklist.signature` JSON. **Note**: Decompose tasks or timing into subcomponent to keep file <= 250 lines! |
| **Caregiver Mobile Appointment Modal** | `frontend/src/lib/components/mitarbeiter/CaregiverAppointmentModal.svelte` | 189 lines | Embeds `CaregiverAppointmentSignature.svelte` (154 lines) with a small inline canvas (`h-32 landscape:h-28`). | Saved into `appointments.checklist` JSON: `{ signature: dataUrl, signed_by: name, signed_at: ISO }` via `caregiverPortalService.completeAppointment()`. | Add an "⛶ Vollbild" button to `CaregiverAppointmentSignature.svelte` that opens `FullscreenSignatureModal` in landscape orientation and returns the signature to `signatureDataUrl`. |
| **Visit Report Section** | `frontend/src/lib/components/appointmentDetail/AppointmentReportSection.svelte` | 138 lines | Textarea with `autoGrow`, Web Speech API dictation (`Mic`), audio attachment upload (`voice_records`), and AI prompt generator (`AiReportModal`). | `appointments.report` (text), `appointments.voice_records` (audio files). | Add signature status badge (from `appointment.checklist?.signature`) with quick-action button to capture or re-sign via `FullscreenSignatureModal`. |
| **Client Signature & Consent Tab** | `frontend/src/lib/components/clients/clientEdit/ClientSignatureDocumentsTab.svelte` | 237 lines | Inline canvas + `ClientSignatureFullscreenModal.svelte` (119 lines). | PocketBase `clients.sign` (file field uploaded via FormData in `saveProfile` / client update). | Fully operational; can share the unified `FullscreenSignatureModal` or keep current customized modal. |
| **Careperson & Legal Sign-off** | `frontend/src/lib/components/clients/CarepersonSignatureModal.svelte` | 245 lines | Dialog with drawing canvas and file upload for careperson/heir representation. | Saved as file to `contacts.signature` in PocketBase. | Dedicated modal (245 lines). Buffer: only 5 lines. |
| **New Client Admission Modal** | `frontend/src/routes/clients/new/components/ClientSignatureModal.svelte` | 243 lines | Modal dialog with canvas for new client intake signature. | Saved to `clients.sign` upon client record creation. | Dedicated modal (243 lines). Buffer: 7 lines. |
| **Contact Signature Pad** | `frontend/src/lib/components/contacts/ContactSignaturePad.svelte` | 215 lines | Canvas pad in contact details for external signatures. | Saved to `contacts.signature`. | Operational (215 lines). |
| **User Profile Signature** | `frontend/src/lib/components/profile/ProfileSignatureCard.svelte` | 217 lines | Profile signature card for caregivers / team members. | Saved to `users.sign`. | Operational (217 lines). |
| **Portal Client Signature** | `frontend/src/lib/components/portal/profile/PortalSignatureSection.svelte` | 245 lines | Client self-service portal signature. | Saved to `clients.sign`. | Operational (245 lines). |

---

## 3. Topic 2: Biometric Service & App Resume

### 3.1 Existing Service Implementation
- **File Path**: `s:\OrgaFlow_Alpha\frontend\src\lib\services\biometricService.ts`
- **Line Count**: 96 lines
- **Dependencies**: `@capacitor/preferences`, `@capacitor/app`, `@capacitor/core`.
- **Stored Preferences**:
  - `orga_biometric_lock_enabled`: `'true'` | `'false'`
  - `orga_app_pin_hash`: SHA-256 hex string of user PIN
- **Hardware vs. Software Biometrics**:
  - Currently, no third-party native biometric plugin (e.g., `@aparajita/capacitor-biometric-auth` or `@pantrist/capacitor-native-biometric`) is present in `frontend/package.json`.
  - The service operates as an in-app Device PIN Lock service, designed to protect sensitive client data when handing the device or resuming the app.
  - If native hardware biometrics (Fingerprint / Face ID) are required, either the WebAuthn API (`navigator.credentials.get`) or a Capacitor biometric plugin can be integrated into `biometricService.ts`.

### 3.2 Application Resume Detection & Lifecycle Gap
In `biometricService.ts:29-36`:
```ts
if (Capacitor.isNativePlatform()) {
    App.addListener('appStateChange', (state) => {
        if (!state.isActive && this.isEnabled) {
            this.isLockedState = true;
        }
    });
}
```
In `NativeAppManager.svelte:17-23`:
```ts
onMount(async () => {
    if (Capacitor.isNativePlatform()) {
        backButtonHandler.init();
        await biometricService.init();
        isLocked = biometricService.isLockActive;
    }
});
```

**Critical Defect Found**:
1. When the app is minimized (`state.isActive === false`), `biometricService.isLockedState` is set to `true`.
2. When the user re-opens the app (`state.isActive === true`), `App.addListener('appStateChange')` fires, but `NativeAppManager` is NOT listening to state changes and `isLocked` in `NativeAppManager` is an isolated Svelte 5 `$state` variable initialized only once in `onMount()`.
3. Consequently, resuming the application **never triggers the lock dialog**!

**Recommended Architecture**:
Convert `biometricService` to a Svelte 5 reactive service (`biometricService.svelte.ts`) or use an event-based callback:
```ts
class BiometricService {
    isLocked = $state(false);
    isEnabled = $state(false);
    ...
    App.addListener('appStateChange', (state) => {
        if (!state.isActive && this.isEnabled) {
            this.isLocked = true;
        }
    });
}
```
And in `NativeAppManager.svelte`:
```svelte
let isLocked = $derived(biometricService.isLocked);
```

### 3.3 Target Security & App Settings Locations
1. **User Profile Security Card**:
   - `frontend/src/lib/components/profile/ProfileSecurityCard.svelte` (27 lines).
   - Currently only contains password change inputs.
   - Ideal location for adding the "App-Sperre & PIN" toggle switch, PIN input / change field, and biometric status indicator.
2. **Caregiver Profile Tab**:
   - `frontend/src/lib/components/mitarbeiter/CaregiverProfileTab.svelte` (242 lines).
   - Contains employee quick-settings (Theme, Google Sync, Logout).
   - Note: Because it has 242 lines, a dedicated subcomponent `CaregiverSecuritySection.svelte` should be created to avoid exceeding the 250-line limit.
3. **Sidebar / Drawer Options Modal**:
   - `frontend/src/lib/components/NotificationSettingsModal.svelte` (233 lines).
   - Currently accessible via the "Optionen" button in `SidebarActions.svelte` and `MobileNavActions.svelte`.

### 3.4 PocketBase Token Persistence & Unlock Flow
- **Persistence Mechanism**:
  `frontend/src/lib/services/pocketbase.ts:31-58`:
  - Token and user model are automatically synchronized to `@capacitor/preferences` under key `'pb_native_auth'`.
  - On app launch, `Preferences.get({ key: 'pb_native_auth' })` hydrates `pb.authStore` before network requests run.
  - `keepPocketBaseAlive()` (lines 61-81) runs every 5 minutes to refresh `pb.collection('users').authRefresh({ expand: 'company' })`.
- **Lock & Unlock Architecture**:
  - When locked, `pb.authStore` token is maintained in memory and storage; the UI is blocked by the z-[10000] modal overlay in `NativeAppManager.svelte`.
  - On PIN validation (`biometricService.verifyPin(pinInput)`), `isLocked` is dismissed and the user immediately resumes their current screen with full state preserved.
  - If an unauthenticated user or intruder attempts to dismiss the lock, the lock overlay does not provide a close button. An emergency "Abmelden" button clears `pb.authStore` and removes `'pb_native_auth'`.

---

## 4. Topic 3: App Update Banner & PWA Installation Button

### 4.1 Update Checking Service & APK Banner
- **Native APK Banner Component**:
  - `frontend/src/lib/components/app/AppUpdateBanner.svelte` (81 lines).
  - Uses `App.getInfo()` to compare the installed build against `https://www.ihre-seniorenassistenz.com/api/mobile/version.json`.
  - Displays a top notification card (`z-[9980] bg-indigo-600 text-white rounded-2xl p-4 shadow-xl`) with "Laden" button (`window.open(downloadUrl, '_system')`) and dismiss button.
  - Rendered globally in `NativeAppManager.svelte:51`, which is mounted in `routes/+layout.svelte:183`.
- **Changelog / Release Notes Service**:
  - `frontend/src/lib/services/updateService.svelte.ts` (84 lines).
  - Queries PocketBase collection `updates` and manages `UpdateLogModal.svelte`.

### 4.2 PWA Installation Button
- **Component**: `frontend/src/lib/components/app/PwaInstallButton.svelte` (76 lines).
- **Features**:
  - Supports `variant: 'compact' | 'full'`.
  - Hides automatically if running natively (`Capacitor.isNativePlatform()`) or already in standalone PWA mode (`window.matchMedia('(display-mode: standalone)').matches`).
  - Listens for `beforeinstallprompt` on `window` and captures the deferred prompt.
  - Automatically resets when `appinstalled` fires.
- **Current Locations**:
  - Desktop Sidebar: `frontend/src/lib/components/sidebar/SidebarActions.svelte:117` (`<PwaInstallButton variant="full" />`).
  - Dashboard: `frontend/src/routes/dashboard/+page.svelte:141` uses legacy `AppInstallButton.svelte` (143 lines).
- **Missing Placement Points**:
  - **Mobile Navigation Drawer** (`frontend/src/lib/components/sidebar/MobileNavActions.svelte` - 153 lines): Currently omitted! Placing `<PwaInstallButton variant="full" />` directly above the "Abmelden" button provides parity with the desktop sidebar.
  - **Profile / App Settings**: Can be embedded as a compact or full button in `ProfileSecurityCard.svelte` or `CaregiverProfileTab.svelte` for web users.

---

## 5. Line Count & Code Constraint Audit (<= 250 Lines)

Every file in the surveyed paths currently respects `code-minimalism.md` (<= 250 lines). However, several key integration targets are near the ceiling and require disciplined extension or decomposition:

| File Path | Current Lines | Remaining Buffer | Risk Assessment & Strategy |
|---|---|---|---|
| `AppointmentCompleteModal.svelte` | 235 | 15 lines | **HIGH RISK**: Direct inline addition of signature UI will breach 250 lines. Decompose `AppointmentCompleteTasks` into subcomponent. |
| `CaregiverProfileTab.svelte` | 242 | 8 lines | **HIGH RISK**: Cannot add biometric/PIN settings directly. Extract Google Calendar or Qualifications into separate subcomponent. |
| `CarepersonSignatureModal.svelte` | 245 | 5 lines | **HIGH RISK**: Do not add lines without extraction. |
| `ClientSignatureModal.svelte` | 243 | 7 lines | **HIGH RISK**: Existing standalone modal; avoid expanding. |
| `ClientSignatureDocumentsTab.svelte` | 237 | 13 lines | **MEDIUM RISK**: Maintain strict minimalism. |
| `FullscreenSignatureModal.svelte` | 205 | 45 lines | **SAFE**: Sufficient buffer to fix orientation reactive lifecycle. |
| `MobileNavActions.svelte` | 153 | 97 lines | **SAFE**: Can easily accommodate `<PwaInstallButton />`. |
| `ProfileSecurityCard.svelte` | 27 | 223 lines | **SAFE**: Plenty of room to implement full PIN & biometric toggle controls. |
| `NativeAppManager.svelte` | 97 | 153 lines | **SAFE**: Clean room to integrate reactive resume state. |
| `biometricService.ts` | 96 | 154 lines | **SAFE**: Can convert to reactive Svelte 5 rune service. |
| `AppUpdateBanner.svelte` | 81 | 169 lines | **SAFE**: Compact and stable. |
| `PwaInstallButton.svelte` | 76 | 174 lines | **SAFE**: Compact and stable. |
| `+layout.svelte` | 185 | 65 lines | **SAFE**: Root layout is properly separated into subcomponents. |

---

## 6. Synthesis & Concrete Recommendations for Phase 1

1. **Fix `FullscreenSignatureModal` Lifecycle**:
   Replace the `onMount` guard with a reactive `$effect` watching `isOpen`. Ensure `@capacitor/screen-orientation` locks to `'landscape'` upon opening and unlocks upon closing or destruction.
2. **Wire Fullscreen Signature into Appointment Completion**:
   - In `AppointmentCompleteModal.svelte`, extract tasks into `AppointmentCompleteTaskList.svelte` to free up ~30 lines. Add a signature trigger button that opens `FullscreenSignatureModal`, storing the signature in `checklist.signature`.
   - In `CaregiverAppointmentSignature.svelte`, add a "⛶ Vollbild" button that launches `FullscreenSignatureModal` and binds the result back to `signatureDataUrl`.
3. **Fix Biometric Resume Reactivity**:
   - Refactor `biometricService` to make `isLocked` reactive in Svelte 5.
   - When `App.addListener('appStateChange')` fires with `!state.isActive`, set `isLocked = true`.
   - When the user returns to the app, `NativeAppManager.svelte` will instantly display the PIN unlock dialog.
4. **Implement App-Sicherheit Controls in Settings**:
   - Expand `ProfileSecurityCard.svelte` to include an "App-Sicherheit & PIN-Sperre" section with toggle switch and 4-6 digit PIN setter.
   - For caregivers, create `CaregiverSecuritySection.svelte` and include it in `CaregiverProfileTab.svelte`.
5. **Add PWA Install Button to Mobile Navigation**:
   - Add `<PwaInstallButton variant="full" />` to `frontend/src/lib/components/sidebar/MobileNavActions.svelte` right above the footer actions.
