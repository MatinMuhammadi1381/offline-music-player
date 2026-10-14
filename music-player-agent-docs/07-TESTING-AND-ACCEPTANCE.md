# 07 — Testing and Acceptance

## Testing principles
- Test actual platform behavior, not only desktop browser emulation.
- Run checks before feature work and after each coherent change.
- Separate unit tests, browser tests, Android device tests, and manual iOS tests.
- Never invent passing results.
- Keep tests proportionate; avoid adding heavy test dependencies without approval.

## Required baseline checks
Choose the actual commands after repository inspection. Common examples include:
- type checking;
- linting;
- unit tests;
- production build;
- Android debug build once the Android project exists.

A Windows `.bat` runner may be added if useful. It should print clear success/failure status, stop or return a non-zero exit code on failure, and never conceal errors.

## Feasibility acceptance
### iOS PWA
- [ ] Can select and play one supported audio file.
- [ ] Can select multiple files in one action, if Safari permits it.
- [ ] Does not claim whole-folder support unless verified.
- [ ] Reports behavior after reload and after app/browser relaunch.
- [ ] Reports persistent-storage request result if API exists.
- [ ] No full-library copy to browser storage.
- [ ] Results recorded with OS/device and reproducible steps.

### Android APK
- [ ] Can select approved local audio files/folder.
- [ ] Can reopen file references after app restart, if permissions were persisted.
- [ ] Can play while screen is locked, according to approved scope.
- [ ] Handles removed or inaccessible files.
- [ ] Build can be reproduced using documented steps.

## Functional acceptance
- [ ] Playback controls behave correctly.
- [ ] Queue, shuffle, repeat, and playlists have tests.
- [ ] Missing/corrupt metadata does not crash the app.
- [ ] Backup export/import round-trip passes.
- [ ] Invalid backup is rejected safely without silently destroying current data.
- [ ] Library of 1,000 metadata records remains responsive in representative tests.
- [ ] No code path eagerly reads all 3 GB of audio into memory.
- [ ] App assets can load offline after successful setup where supported.
- [ ] No audio is sent to external services.

## Resilience scenarios
Test at least:
- close and reopen app;
- restart device where practical;
- remove or rename a selected file;
- revoke or lose file access;
- deny a permission;
- clear website data (document expected impact; do not assume recovery);
- import malformed backup;
- restore a valid backup;
- interrupt playback and resume;
- unsupported audio format;
- storage pressure and low-memory conditions where practical.

## Phase exit criteria
A phase is complete only when:
1. approved scope is implemented;
2. relevant checks are actually run;
3. failures and known gaps are documented;
4. no unapproved dependencies or unrelated edits remain;
5. report is delivered;
6. owner approves the next phase.

## Phase 9 local results — 2026-10-14

### Completed local checks
- `npm test`: 48 tests passed, including a synthetic 1,000-track metadata search/sort test (about 7–9 ms in this Node run).
- A synthetic 1,000-file collection with a declared aggregate size of 3,000,000,000 bytes passed through the file-reference and IndexedDB-repository paths. The test files contain no audio bytes; their `arrayBuffer()` and `stream()` methods fail if called. Serialized metadata remained under 1 MB.
- `npm run typecheck` and `pnpm --filter @offline-music-player/player-web typecheck` passed.
- `pnpm --filter @offline-music-player/player-web build` passed.
- Android `.\gradlew.bat assembleDebug lintDebug` passed; the generated APK packages the production web build. No device installation was possible.
- Microsoft Edge 155.0.4283.45 headless desktop-browser checks against the production build found no horizontal overflow or clipped controls at 320, 360, 390, or 430 CSS px, 844×390 short landscape, or 390×600. The library used synthetic 300-track metadata; visual screen checks included library, playlists, queue, settings, and player at 320 and 390 CSS px. Visible buttons had accessible names and at least 44×44 CSS px hit boxes in the checked states.
- A production service-worker reload succeeded with the browser network disabled after the first online load; the cached shell reopened with the library UI and its seeded metadata.
- Keyboard Tab reached the skip link with a visible 3 px focus outline. Reduced-motion emulation reduced transitions to 0.01 ms. Calculated white-on-primary-button contrast was at least 5.0:1; primary, secondary, muted, and placeholder text tokens against the app background were at least 5.11:1.

### Not verified / phase remains open
- The 3 GB scenario is a metadata and reference simulation, not 3 GB of actual music or an audio-decode, storage-pressure, or low-memory test.
- Desktop responsive emulation is not iPhone Safari, Android WebView, installed-PWA, or native-system-bar evidence. Text enlargement at 200%, real safe-area insets, and a visual screenshot comparison between real devices have not been tested.
- No Android phone/emulator is connected. The Android foreground playback service and persisted native picker permissions remain separate from the shared WebView UI; background/lock-screen audio, restart behavior, moved-file recovery, and actual codec support remain unverified.
- No iPhone or approved HTTPS test origin is available. Safari selection, installed Home Screen PWA behavior, iOS audio playback/lock screen, and file-reference recovery therefore remain unverified.
- Browser malformed/valid metadata backup cases are covered by unit tests, but app-level clear-site-data, low-storage, and actual interruption/relaunch recovery still need device/browser acceptance.
- The `web-design-guidelines` skill requested by the UI checklist was not available in the installed skill set and was not run.
- The owner subsequently requested a detached, fully rounded floating mobile bottom navigation. The live Vite preview was updated and the PWA typecheck/build passed; the detached capsule's visual QA after this specific change remains pending.

**Phase 9 device validation:** Not run; no device evidence is claimed. The project owner authorized deferring the real-device matrix and proceeding with Phase 10 handoff preparation.

### Owner-directed device-test deferral — 2026-10-14

The project owner explicitly authorized proceeding with later phases and asked that the real-device tests be recorded for testing later. The device matrix above is therefore **owner-deferred for this handoff**, not represented as executed or passed. Keep the device evidence checklist outstanding for the owner's later iPhone/Android testing; do not infer device compatibility from this approval.
