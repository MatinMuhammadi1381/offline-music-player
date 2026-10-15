# Changelog

## 1.4.2 - 2026-10-14 (mobile panel and navigation edge joins)

- Joined each open mobile panel's side lines to the outer side edges of the bottom navigation capsule without drawing a horizontal connector or changing the navigation's rounded shape.
- Preserved the fixed header and internal scrolling; keyboard focus highlights the panel top and sides without drawing a closing line along the open bottom edge.
- Incremented Android `versionCode` to 10 for the shared WebView styling update.

## 1.4.1 - 2026-10-14 (open mobile library and playlist panels)

- Extended mobile scroll panels to the top edge of the fixed bottom navigation; removed the lower border and rounded bottom corners, then joined the side lines to the capsule's top-border tangents without changing its rounded outline.
- Kept the section headers and filters in place and confined list scrolling to the space above the navigation, accounting for the mobile safe-area inset in portrait and landscape.
- Updated Android `versionCode` to 9 for the shared WebView UI refinement.

## 1.4.0 - 2026-10-14 (fixed app layout and contained library scrolling)

- Kept the application shell anchored to the visible viewport with mobile-safe `100dvh` sizing and a stable fallback.
- Presented the music library, playlists, queue, and settings contents in visually distinct panels; library and playlist lists scroll inside their own panels without visible scrollbars or page scroll chaining.
- Kept navigation, search, sort, and playlist controls outside the scrolling lists and made the scroll regions keyboard-focusable.
- Opened the iOS Safari/PWA audio picker synchronously from the Add music and Reselect files gestures before requesting storage persistence, preserving the browser's user activation.
- Added regression coverage for synchronous picker opening, multi-file selection, cancellation, and input cleanup.
- Updated the shared web experience used by the Android WebView and incremented Android `versionCode` to 8.

## 1.3.0 - 2026-10-14 (iPhone offline audio persistence)

- Copy audio selected in the iOS PWA into the app origin's private IndexedDB storage and restore playable file references after reopening the app.
- Request browser storage persistence during an explicit add-music action where supported; report storage failures instead of saving metadata without its audio.
- Delete the app's stored audio copy when its track is removed. Metadata backups remain audio-free; original files should be kept separately.
- iOS/WebKit storage remains best-effort and may be removed by the user or operating system; Android retains its existing session-only WebView behavior.
- Added restart/restore, deletion, and storage-quota failure regression coverage. Real iPhone retention testing is still required.

## 1.2.0 - 2026-10-14 (artwork, playlists, and queue fixes)

- Read embedded MP3 ID3 front-cover artwork locally and display it in the library, player, and mini-player without uploading artwork or adding it to persistent library metadata.
- Made queue row actions target a specific queue position so duplicate tracks can be played, reordered, and removed independently.
- Added regression tests for artwork extraction and index-addressed queue playback.
- Real-device validation remains outstanding; embedded artwork extraction currently supports MP3 ID3 APIC tags.

## 1.1.1 - 2026-10-14 (GitHub Actions Android SDK setup)

- Corrected the GitHub Actions Android SDK setup to install `platform-tools` explicitly without requesting the obsolete SDK `tools` package, which prevented the first Pages build from starting.
- Updated the GitHub-maintained checkout, Node.js, and Java setup actions to current major versions.
- Incremented Android `versionCode` to 5 for the rebuilt APK.

## 1.1.0 - 2026-10-14 (rounded responsive sort picker)

- Replaced the library sort field's oversized platform-native dropdown with a compact rounded custom picker that matches the dark app surfaces.
- Added keyboard-accessible selection and constrained the mobile menu height and width so options remain within the phone viewport.

## 1.0.1 - 2026-10-14 (development service-worker cache fix)

- Prevented the PWA service worker from intercepting Vite development requests; an existing app worker and its shell cache are removed in development mode to avoid stale scripts after code changes.
- Kept service-worker registration enabled for production PWA builds.
- Versioned this compatible development fix as a patch release; real-device and production acceptance remain outstanding.

## 1.0.0 - 2026-10-14 (owner-requested project version)

- Set the current project, PWA, workspace package, Android APK, and Settings → About version to `1.0.0` at the owner's direction.
- Increased Android `versionCode` to `2` so the rebuilt APK can be recognized as an upgrade from the prior development APK.
- This version change does not claim production readiness or completed real-device acceptance; see the development handoff for outstanding release blockers.

## Versioning policy

- Follow Semantic Versioning: PATCH for compatible fixes, MINOR for backward-compatible features, and MAJOR for breaking changes.
- Keep `VERSION`, workspace packages, Android `versionName`, app display, README, changelog, handoff metadata, and regenerated build checksums aligned. Increment Android `versionCode` for each distributable APK.

## 0.0.1 - 2026-10-14 (development baseline)

- Added repository hygiene, project overview, and a single authoritative development version file.
- Recorded the existing project and UI/UX specification packs in the root README.
- No application code, dependencies, platform tests, or release artifacts are included in this baseline.

## 0.0.1 - 2026-10-14 (iOS file-access feasibility harness)

- Added a dependency-free local test page for selecting and playing audio files in a browser/PWA.
- Added app-shell-only offline caching, storage API diagnostics, and a local-only test report.
- No device feasibility results have been recorded; an owner-approved HTTPS test origin and target iPhone are still required.
- No audio is uploaded, copied to browser storage, or included in test reports. No dependencies were added.

## 0.0.1 - 2026-10-14 (Android file-access feasibility harness)

- Added a temporary Android test APK harness using the system document picker, persisted user-granted URIs, a media playback foreground service, and a media-session notification.
- The APK has no Internet permission and uses no third-party runtime libraries. The Android Gradle Plugin is a build-only dependency.
- Recorded mobile-first responsive acceptance widths and landscape/text-scaling checks for the shared production UI.
- The test APK builds locally, but no Android phone/emulator is connected; picker, URI-retention, reboot, and screen-locked playback results remain unverified.

## 0.0.1 - 2026-10-14 (shared domain core)

- Added shared TypeScript track, playlist, queue, and metadata models; platform file/storage/playback/backup interfaces; and immutable search/sorting/queue/playlist logic.
- Added 16 built-in Node.js domain tests and a strict shared-source TypeScript check.
- No platform adapter, metadata persistence, backup import/export, production UI, or production playback engine is included in this phase.

## 0.0.1 - 2026-10-14 (metadata persistence and recovery)

- Added a session-only browser file-selection adapter with an explicit reselect path when page-local `File` references are lost.
- Added a strict, versioned, size-limited metadata-only JSON backup format with cross-reference validation and restore-after-validation semantics.
- Added transactional browser IndexedDB library and player-settings persistence, truthful browser persistent-storage status/request adapters, and a validated sort/repeat/shuffle settings model.
- Added atomic Android SQLite library and settings persistence, validated SAF-based metadata-only backup export/import, and track access/metadata recovery summaries in the Android feasibility harness.
- Expanded unit tests for valid and invalid backup data, restore safety, settings validation, and browser-storage outcomes.
- The user reports completing Android/iPhone feasibility checks without issues; no model/OS-level evidence is recorded, and the updated Android backup UI/database requires rechecking on a physical device.
- No audio files or file-picker permissions are included in backups; no audio bytes are persisted in IndexedDB/SQLite by these adapters.

## 0.0.1 - 2026-10-14 (core playback implementation)

- Added a shared playback controller that drives queue navigation, automatic end-of-track advance, repeat, shuffle, previous-track restart behavior, and recoverable missing-file errors.
- Added a browser HTML audio adapter that streams selected files through temporary object URLs, reports progress and playback failures, and releases URLs when playback stops.
- Extended the Android feasibility service with seek, queue next/previous, repeat/shuffle application, and lock-screen/media-notification transport controls.
- Added unit coverage for queue playback, repeat modes, error recovery, browser progress, object-URL cleanup, and autoplay blocks.
- Node tests, strict TypeScript check, Android debug APK build, and Android lint pass. No Android device is connected; physical playback, codec, queue, and lock-screen acceptance remains unverified. The production UI has not yet integrated these adapters.

## 0.0.1 - 2026-10-14 (library workflow implementation)

- Added a shared library controller for persisted selected-file additions, case/accent-insensitive search, sorting, playlist CRUD/order, and cleanup of playlist references when a track is removed.
- Added explicit file relinking by unique filename-and-size match, session-only access recovery checks, and safe reporting of ambiguous or unmatched files.
- Serialized library writes to prevent overlapping metadata mutations from silently overwriting each other; added tests for CRUD, concurrent writes, relink recovery, ambiguous matches, and invalid playlist members.
- The library controller is core infrastructure, not a finished user-facing library screen; production UI integration and physical-device acceptance remain pending.

## 0.0.1 - 2026-10-14 (shared React player UI)

- Added the phone-first React PWA with library, playback, queue, playlist, settings, recovery, storage diagnostics, and metadata backup workflows.
- Added an Android launcher activity that packages and renders the same production UI through a secure offline WebView asset origin and forwards audio file selection to Android's system picker.
- Added responsive styling, safe-area support, keyboard focus treatment, reduced-motion behavior, offline app-shell caching, and Android asset-sync build wiring.
- Expanded validation for relinking and tightened explicit file matching to filename and size.
- Android foreground-service/media-session playback is still a feasibility harness and is not wired to the shared UI. iPhone/Android device acceptance, accessibility/performance acceptance, and release handoff remain incomplete.

## 0.0.1 - 2026-10-14 (phase 9 local validation)

- Added synthetic 1,000-track responsiveness and 3 GB file-reference tests that guard against reading audio bytes into memory.
- Checked production responsive layouts, app-shell offline reload, keyboard focus, reduced-motion behavior, accessible button names, and button contrast in headless Edge.
- Increased mobile primary-button touch targets to 44 px and darkened their blue gradient to meet a 4.5:1 text contrast target.
- Routed Android WebView metadata-backup import and export through the correctly filtered SAF document pickers after review exposed an audio-only picker path.
- Core tests, strict TypeScript checks, PWA production build, and Android APK build/lint pass locally.
- Phase 9 remains open pending iPhone and Android real-device, audio, safe-area, and system-control acceptance; see `music-player-agent-docs/07-TESTING-AND-ACCEPTANCE.md`.

## 0.0.1 - 2026-10-14 (phase 10 development handoff preparation)

- Recorded reproducible local build commands, tool versions, development artifact checksums, install/deploy instructions, and explicit release blockers in `music-player-agent-docs/10-DEVELOPMENT-HANDOFF.md`.
- Prepared a zipped static PWA build and a debug-signed Android APK as local development handoff artifacts; the APK is not production-signed.
- Added `npm run package:development` to rerun tests/typechecks, build and lint Android (including the shared PWA bundle), verify the PWA archive structure, and write artifact SHA-256 checksums.
- Recorded the owner's authorization to defer real-device checks until later; this deferral is not described as passed device acceptance.
- No production-signed release candidate, release tag, public deployment, or real-device acceptance is claimed. Production release remains deferred pending later device testing, owner review, and production signing.

## 0.0.1 - 2026-10-14 (floating mobile navigation)

- Reworked the phone bottom navigation into a centered floating capsule with full rounded corners, a clear gap above the screen edge, and spacing adjusted to stay above the safe-area inset.
- Raised the mini-player and content clearance to prevent overlap with the floating navigation.
- PWA UI typecheck and production build pass.

## 0.0.1 - 2026-10-14 (version format correction)

- Corrected the current app/project version to the semantic version `0.0.1` across the authoritative version file, workspace packages, Android APK metadata, and Settings → About.
- Bundled the displayed web version from the root `VERSION` file during the Vite build to keep the website aligned with the project version.
- Rebuilt development artifacts and refreshed their checksums after the version correction.
