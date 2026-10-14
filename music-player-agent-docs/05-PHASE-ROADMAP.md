# 05 — Phase Roadmap

The agent must propose and receive approval for this plan before implementation. Each phase is independently reviewable and must end with a report and approval gate.

## Phase 0 — Repository audit and plan (no code changes)
**Goal:** Understand the current repository and propose the plan.
- Inspect repo, tools, Git status, existing code and documentation.
- Map requirements to platform capabilities.
- List proposed dependencies without installing them.
- Identify unanswered questions and test devices needed.
**Exit:** Owner approves the plan.

## Phase 1 — Project baseline and versioning
**Goal:** Create a reproducible, traceable baseline.
- Configure Git if not already configured and approved.
- Establish `.gitignore`, README, version metadata, changelog, and initial tag.
- Add a lightweight test/check runner before feature work, where appropriate.
- Record baseline test results.
**Exit:** Baseline checks run; initial version/tag documented; owner approves.

## Phase 2 — iOS PWA file-access spike
**Goal:** Prove what Safari can actually do before building the app.
- Minimal test page for one-file and multi-file selection.
- Test audio playback from selected `File` objects.
- Test reload, closing/reopening Safari, and Home Screen PWA behavior.
- Test persistent-storage request and record result.
- Do not copy full music collection into browser storage.
- Publish to a temporary/private or approved test URL; never publish personal music.
**Exit:** Evidence-based report and owner decision. If requirements fail, stop and discuss alternatives.

## Phase 3 — Android file-access and playback spike
**Goal:** Validate the APK path.
- Minimal Capacitor app.
- Test Android file/folder picker and URI permissions.
- Test restart/reboot access and playback with screen locked.
- Evaluate native media playback plugin/implementation.
**Exit:** Evidence-based report and owner approval.

## Phase 4 — Shared core and data model
**Goal:** Implement tested, platform-neutral logic.
- Define typed models and stable track IDs.
- Implement search, sorting, queues, playlist logic.
- Define adapter interfaces for file access, metadata persistence, playback and backups.
- Unit tests for domain logic.
**Exit:** Tests pass and platform interfaces are agreed.

## Phase 5 — Metadata persistence and recovery
**Goal:** Make library metadata resilient.
- Persist metadata/settings per platform.
- Request browser persistent storage when available and show actual grant status in diagnostics.
- Implement metadata backup export/import and validation.
- Implement missing-file/access-lost states.
**Exit:** Recovery tests pass; owner approves.

## Phase 6 — Core playback
**Goal:** Deliver reliable local playback.
- Play/pause/seek/previous/next.
- Queue, shuffle, repeat.
- Error recovery for unsupported/missing files.
- Android background playback/notification controls as approved.
- Document iOS PWA background limitations.
**Exit:** Playback acceptance tests pass.

## Phase 7 — Library and playlists
**Goal:** Deliver the core library workflows.
- Add/relink files, browse/search/sort.
- Playlist management.
- Library integrity checks and recovery path.
**Exit:** Acceptance tests pass on both platforms within supported capabilities.

## Phase 8 — UI/UX implementation
**Goal:** Apply the owner's separate UI/UX specification package.
- Do not begin detailed visual design until the owner provides the separate UI/UX package.
- Review the package, map it to reusable components, and identify platform-specific differences.
- Ask approval for material deviations.
**Exit:** UI/UX checklist accepted by owner.

## Phase 9 — Performance, resilience, accessibility and device testing
**Goal:** Validate realistic usage.
- Use synthetic metadata for 1,000 tracks and a representative audio subset.
- Test 3 GB collection workflows without loading all audio bytes into memory.
- Test app relaunch, permission loss, file movement/deletion, backup restore, offline launch and error states.
- Record performance on real devices.
**Exit:** No unresolved critical issues; owner approves.

## Phase 10 — Release candidate and handoff
**Goal:** Prepare personal-use releases.
- Build PWA and Android APK.
- Verify offline behavior and install instructions.
- Record version, commit, build commands, known limitations and recovery instructions.
- Provide checksums where practical.
- No App Store release unless separately requested.
**Exit:** Owner accepts the release candidate.

## Phase changes
A phase may be split into smaller approved tasks. Do not combine phases just to move faster. The agent must stop at each phase boundary and wait for approval.
