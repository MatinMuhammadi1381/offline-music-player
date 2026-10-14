# 11 — Decision Log

Record material decisions here. Add a dated entry whenever a choice affects architecture, platform behavior, data storage, dependencies, or releases.

## Confirmed decisions
- [Confirmed] The product is a personal offline music player.
- [Confirmed] Initial target collection is approximately 1,000 tracks / 3 GB.
- [Confirmed] iPhone delivery target is a PWA.
- [Confirmed] Android delivery target is an installable APK.
- [Confirmed] Maximize shared React/TypeScript code where practical.
- [Confirmed] Original audio files should remain in user-managed local storage rather than being copied wholesale into browser storage.
- [Confirmed] Metadata/playlist backup and recovery are important.
- [Confirmed] Version control and versioning must start from the beginning.
- [Confirmed] UI/UX details will be supplied later in a separate package.
- [Confirmed] Prove iOS PWA file access before implementing the full product.
- [Confirmed 2026-10-14] The complete production app must be fully responsive and phone-first on iPhone and Android, with one shared visual design that adapts to device size/orientation and platform safe areas.
- [Confirmed 2026-10-14] Phase 4 is authorized to proceed based on the owner's report that iOS and Android feasibility testing found no issues; specific device/OS versions and reproducible findings still need to be recorded before a release decision.

## Proposed technical direction (not yet fully approved)
- React + TypeScript + Vite.
- Capacitor for Android packaging.
- pnpm workspaces/monorepo if justified by the existing repo.
- Platform adapters for file access, persistence, and playback.

## Open decisions
- [Confirmed owner-reported 2026-10-14] The owner completed the iPhone and Android feasibility checks without encountering issues and approved proceeding to Phase 4. Device/OS versions, reproducible steps, and test records have not yet been added to the repository and must be collected before a release decision; later Android metadata changes also require a device retest.
- [Open] Exact behavior of multi-file selection on the target iOS version.
- [Open] Whether the installed iOS PWA can meet the desired persistence/relinking workflow without importing audio into browser storage.
- [Open] Whether the iOS PWA must support background playback with the screen locked.
- [Open] Android playback implementation/plugin after a proof of concept.
- [Open] Exact UI/UX design and interaction details (await separate owner-provided UI/UX package).
- [Open] Repository/package manager details after inspection.
- [Open] Initial version/tag to create after owner approves the Phase 0 plan.

## Decision entry template
### YYYY-MM-DD — Short title
- Status: Proposed / Approved / Rejected / Superseded
- Context:
- Options considered:
- Decision:
- Consequences:
- Owner approval:
