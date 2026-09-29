# Lebo — Personal Safety & Support Platform (PRD)

## Original problem statement
Build a production-ready, privacy-first personal safety, emergency response, check-in, support and incident-recording mobile platform for South Africa. The core architectural principle: VOICE + MANUAL + AUTOMATIC + PHYSICAL triggers all feed ONE central Emergency Response engine.

## Architecture
- **Frontend:** Expo (React Native) + expo-router, @tanstack/react-query, phosphor-react-native icons, reanimated + gesture-handler (slide-to-confirm), expo-location, expo-local-authentication.
- **Backend:** FastAPI (single `server.py`), MongoDB (motor). JWT auth (PyJWT) + server-side sessions, Argon2 password + PIN hashing.
- **AI chatbot:** Claude Sonnet 4.6 via Emergent LLM key (emergentintegrations).
- **Theme:** `src/theme.ts` light+dark tokens from design_guidelines.json (calm sage green everyday, signal-red emergency override).

## User personas
- Everyday user wanting quick help + check-ins (primary).
- An invited trusted/emergency contact.

## Core requirements (static)
Central emergency engine, emergency contacts + permissions, safety timers/check-ins/grace, escalation, modes (personal/work/event/custom), safe journey, location sharing with consent, find help nearby (SA directory), incident journal (private), safety plan, digital safety education, safety chatbot, app lock (biometric/PIN), privacy controls (export/delete), ownership-level API authorization.

## Implemented (2026-06)
- **Auth:** register/login/logout, JWT + sessions, /me profile, onboarding flag. Argon2 hashing.
- **Home dashboard:** color-independent safety status, slide-to-confirm "SLIDE FOR HELP", I'M SAFE, quick actions grid, current-safety info.
- **Emergency:** full-screen red mode; activates event, captures location (if permitted), notifies eligible contacts, CALL EMERGENCY SERVICES (10111), slide-to-cancel with confirm.
- **Contacts:** CRUD, per-contact permissions, priority, invite link (Share).
- **Safety timers + check-ins:** intervals + grace, I'm safe resets.
- **Safe Journey**, **Modes** (create/activate/delete), **Location sharing** with "who can see me" + revoke.
- **Find Help Nearby:** 14 seeded verified SA orgs, category chips, search, device-location distance sort, call/directions.
- **Incident Journal:** private categorized entries, soft-delete, edit.
- **Safety Plan builder**, **Digital Safety** education, **Ask Lebo** AI chatbot (Claude Sonnet 4.6).
- **App Lock:** biometric/PIN + timeout; **Privacy:** analytics + location default, data export, account delete.
- Ownership isolation verified (user B cannot access user A data). 24/24 backend tests pass.

## Backlog (prioritized)
- **P1:** Emergency contact invitation acceptance flow (two-account linking, contact acknowledgement UI back to user). Photo/audio/document attachments in Incident Journal via Emergent Object Storage. Real push/SMS notification delivery (currently recorded as "sent").
- **P1:** Background/scheduled escalation runner for missed check-ins (currently escalation modelled on activation; timer expiry runs client-triggered).
- **P2:** Area safety alerts with a real SafetyDataProvider (crime/official datasets). Voice/Siri/Assistant shortcuts. Wearables. Admin web dashboard for directory verification. Recurring mode schedules auto-activation.
- **P2:** Chat context: replay assistant turns too for longer conversations.

## Next tasks
1. Contact invitation accept + relationship linking across two accounts.
2. Object Storage for encrypted incident media.
3. Real notification delivery (push/SMS) with retries/fallback + delivery tracking.
