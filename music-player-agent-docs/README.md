# Offline Music Player — Agent Project Pack

> Purpose: Build a personal offline music player for iPhone (PWA) and Android (installable APK), prioritizing shared React/TypeScript code while respecting platform-specific file access and playback requirements.

## Current decisions

- Product is for personal use first; public App Store distribution is not a requirement.
- iPhone delivery target: installable PWA launched from the Home Screen.
- Android delivery target: installable APK.
- Preferred shared stack: React + TypeScript + Vite; evaluate Capacitor for Android packaging.
- Keep original audio files in user-managed local storage (e.g. Files on iOS, selected local folder/files on Android). Do not silently import/copy the entire library into browser storage.
- Target library: approximately 1,000 tracks / approximately 3 GB.
- Library metadata (track names, references/handles where available, playlists, playback settings) is separate from original audio files.
- No cloud account or mandatory online backend. Core playback must work offline after setup.
- iOS PWA file access is a critical feasibility risk and must be tested before full implementation.
- UI/UX specifications will be supplied separately by the project owner later. Do not invent or finalize detailed UI design before that package is received.

## How the agent must use this pack

1. Read `00-AGENT-EXECUTION-PROTOCOL.md` first.
2. Read all requirements and constraints before proposing implementation.
3. Produce a phased plan and wait for approval before coding.
4. Do not skip the feasibility prototype phase.
5. Establish Git and versioning before feature implementation.
6. After each phase, report changed files, tests, known limitations, version change, and the exact approval needed to continue.
7. UI/UX details are intentionally out of scope until the separate UI/UX package is provided.

## Document index

- `00-AGENT-EXECUTION-PROTOCOL.md` — mandatory agent behavior and approval gates
- `01-PRODUCT-VISION.md` — product goals and non-goals
- `02-FUNCTIONAL-REQUIREMENTS.md` — expected capabilities
- `03-TECHNICAL-ARCHITECTURE.md` — proposed shared architecture
- `04-PLATFORM-CONSTRAINTS.md` — iOS PWA and Android realities
- `05-PHASE-ROADMAP.md` — phased development sequence and gates
- `06-VERSIONING-AND-RELEASES.md` — version control and release rules
- `07-TESTING-AND-ACCEPTANCE.md` — test strategy and acceptance criteria
- `08-DEPENDENCY-POLICY.md` — dependency approval policy
- `09-PRIVACY-AND-SECURITY.md` — local-first privacy and permission handling
- `10-AGENT-REPORT-TEMPLATE.md` — required phase report template
- `11-DECISION-LOG.md` — decisions and unresolved questions
- `12-INITIAL-AGENT-TASK.md` — first task: inspect, plan, and propose feasibility tests only
