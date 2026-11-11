# Original User Request

## Initial Request — 2026-11-11T08:11:04Z

Complete the comprehensive integration and finalization of installable hybrid app features ("Seniorenassistenz" for Android, iOS, and PWA via Capacitor 7) across all relevant views and detail masks in OrgaFlow.

Working directory: s:\OrgaFlow_Alpha
Integrity mode: development

## Requirements

### R1. Comprehensive Native Feature Integration Across All Relevant Views
Seamlessly integrate the prepared native hardware services and components into both primary views and all relevant secondary masks and detail areas:
- Document scanner service: integrate multi-page receipt and document scanning into receipt management, document archives, client record uploads, and message/chat attachments.
- Location service: integrate 1-click GPS capture with reverse geocoding into Fahrtenbuch (`drive_records`), tour/appointment logging, and address validation.
- Fullscreen signature pad modal: integrate touch-optimized landscape signature capture into appointment completion, visit reports, and any client consent or sign-off workflows.
- Biometric service: wire up biometric authentication (fingerprint/Face ID/device PIN) in user security and app settings, with prompt on application resume if enabled.
- App update banner & PWA installation button: ensure proper placement and triggering in navigation bars, sidebars, and profile menus.

### R2. Strict Adherence to Project Architecture and Design Rules
Every modified or newly created component and service must strictly conform to project rules:
- Code minimalism (`code-minimalism.md`): strict hard limit of 250 lines per file/component; decompose into modular subcomponents or helper modules whenever approaching the limit.
- Zero inner scroll (`zero-inner-scroll.md`): dynamic full-height growth with no nested scroll containers or internal scrollbars.
- Mobile landscape mode (`mobile-landscape-mode.md`): responsive landscape layouts for signature capture and screen-intensive mobile interactions.
- No-brainer design (`no-brainer-design.md`): accessible plain German terminology, clear touch targets, proactive status feedback, and safe deletion confirmations.
- Alphabetical select (`alphabetical-select.md`): case-insensitive alphabetical sorting on all dropdowns, selectors, and option lists.
- Layer stacking (`layer-stacking.md`): clean z-index hierarchy ensuring overlays, modals, and toasts never collide or obscure interactions.
- PocketBase: consistent data storage, token persistence, and synchronization with the PocketBase backend.

### R3. Build Verification and Synchronization
Verify that all TypeScript types, SvelteKit production builds, and Capacitor Android synchronization execute cleanly without errors.

## Acceptance Criteria

### Build & Platform Synchronization
- [ ] `npm run check` in `frontend/` completes with 0 errors.
- [ ] `npm run build` in `frontend/` completes successfully and produces the production assets in `pb_public`.
- [ ] `npx cap sync` in `frontend/` runs without errors, synchronizing web assets and plugins to `android/`.

### Code Standards & Rule Compliance
- [ ] Every modified or created `.svelte` and `.ts` file is <= 250 lines.
- [ ] No nested scrollbars exist in updated dialogs, modals, or view containers.
- [ ] Native action triggers (document scanner, GPS capture, fullscreen signature) are wired up and accessible in all target masks.
