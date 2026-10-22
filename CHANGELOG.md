# Changelog

## 1.7.9 - 2026-10-22 (Search card spacing)

- Reduce the vertical spacing between Search category cards by another 10% across web, PWA, and Android layouts while preserving horizontal spacing and card size.
- Align the project, workspace packages, and Android version at `1.7.9`; increment Android `versionCode` to 42 and the PWA shell cache to v29. No library data or backup migration is required.

## 1.7.8 - 2026-10-22 (Search card spacing)

- Reduce the vertical spacing between Search category cards by about 5% while preserving horizontal spacing across web, PWA, and Android layouts.
- Align the project, workspace packages, and Android version at `1.7.8`; increment Android `versionCode` to 41 and the PWA shell cache to v28. No library data or backup migration is required.

## 1.7.7 - 2026-10-22 (mini-player opening motion)

- Expand the now-playing view from the mini-player's actual position with a 1.5-second motion-graphic animation; reduced-motion preferences remain respected.
- Align the project, workspace packages, and Android version at `1.7.7`; increment Android `versionCode` to 40 and the PWA shell cache to v27. No library data or backup migration is required.

## 1.7.6 - 2026-10-22 (search sizing and app motion)

- Reduce Search category cards visually by 5% while preserving their grid cells and touch targets.
- Add restrained entrance, selection, and interaction animations across app views, player surfaces, navigation, cards, menus, and empty states; honor reduced-motion preferences.
- Align the project, workspace packages, and Android version at `1.7.6`; increment Android `versionCode` to 39 and the PWA shell cache to v26. No library data or backup migration is required.

## 1.7.5 - 2026-10-22 (library panel and player control sizing)

- Reduce the now-playing control background width by about 5%.
- Extend the mobile Library track-list panel to the top of the mini-player while visible, then to the bottom navigation when dismissed; the list continues to scroll independently.
- Align the project, workspace packages, and Android version at `1.7.5`; increment Android `versionCode` to 38 and the PWA shell cache to v25. No library data or backup migration is required.

## 1.7.4 - 2026-10-22 (now-playing layout refinement)

- Remove the playback-status card below the now-playing controls, including its background and spacing.
- Enlarge the now-playing cover by about 10% and move the title, progress bar, and controls lower; widen the control background by about 15% across mobile and PWA layouts.
- Align the project, workspace packages, and Android version at `1.7.4`; increment Android `versionCode` to 37 and the PWA shell cache to v24. No library data or backup migration is required.

## 1.7.3 - 2026-10-22 (random categories and player polish)

- Assign every library track to exactly one random music category, preserve assignments between launches, and shuffle only the selected category.
- Remove the Up next link from the now-playing panel and refine its cover size, spacing, and glowing blue progress indicator.
- Align the project, workspace packages, and Android version at `1.7.3`; increment Android `versionCode` to 36 and the PWA shell cache to v23. No library data or backup migration is required.

## 1.7.2 - 2026-10-22 (search, playlists, and icon refresh)

- Make search results scroll in their own viewport-sized panel and restyle playlists as visual cards.
- Replace the shared application UI glyphs with ISC-licensed Lucide React icons.
- Align the project, workspace packages, and Android version at `1.7.2`; increment Android `versionCode` to 35 and the PWA shell cache to v22. No library data or backup migration is required.

## 1.7.1 - 2026-10-22 (search and mini-player polish)

- Keep Search focused on its browse categories until a query is entered; make category cards larger and approximately square across browser, PWA, and Android WebView.
- Reduce mini-player height by about 15%, lift it slightly above mobile navigation, and add an accessible dismiss control that stops playback and removes the current track from the queue without auto-playing the next one.
- Align the project, workspace packages, and Android version at `1.7.1`; increment Android `versionCode` to 34 and the PWA shell cache to v21. No library data or backup migration is required.

## 1.7.0 - 2026-10-22 (library and category redesign)

- Remove the inline search field from Library while keeping the dedicated Search screen and its song search.
- Redesign Browse Categories as larger cards, put Playlist first, and play a randomized queue when a music category is selected. Categories use matching track metadata when available and fall back to the full library when there are no matches.
- Align the project, workspace packages, and Android version at `1.7.0`; increment Android `versionCode` to 33 and the PWA shell cache to v20. No library data or backup migration is required.

## 1.6.10 - 2026-10-22 (library track-list panel corners)

- Round only the upper corners of the Library track-list panel; keep its lower corners square across the web app and Android WebView.
- Align the project, workspace packages, and Android version at `1.6.10`; increment Android `versionCode` to 32 and the PWA shell cache to v19. No library data or backup migration is required.

## 1.6.9 - 2026-10-22 (mobile PWA startup splash)

- Keep the installed mobile standalone PWA startup splash visible for three seconds and render it above the full app, including the iOS navigation dock and mini-player.
- Align the project, workspace packages, and Android version at `1.6.9`; increment Android `versionCode` to 31 and the PWA shell cache to v18. No library data or backup migration is required.

## 1.6.8 - 2026-10-22 (mobile PWA startup splash)

- Show the music-note logo and Offline Music name for one second when an installed mobile standalone PWA launches; regular browser tabs, tablets, and the Android WebView do not show the splash.
- Align the project, workspace packages, and Android version at `1.6.8`; increment Android `versionCode` to 30 and the PWA shell cache to v17. No library data or backup migration is required.

## 1.6.7 - 2026-10-22 (home and library header refinements)

- Place Add music beside Good evening on the home page, remove the Listen top header, and remove the Library header row above Listen offline while keeping the library controls below it.
- Align the project, workspace packages, and Android version at `1.6.7`; increment Android `versionCode` to 29 and the PWA shell cache to v16. No library data or backup migration is required.

## 1.6.6 - 2026-10-19 (version display and Android download correction)

- Align the user-visible web/PWA and Android WebView version with Android `versionName` `1.6.6`; the About screen reads the root `VERSION` file.
- Increment Android `versionCode` to 28 and the PWA shell cache to v15 so installed copies receive the updated app shell.
- Publish the debug-signed APK as a named GitHub Actions artifact and continue updating the existing GitHub Pages APK download.
- Local verification passed: 63 tests, both TypeScript checks, the PWA production build, Android `assembleDebug` and `lintDebug`; APK metadata reports `1.6.6` / versionCode 28. Android builds remain development builds, not production releases.

## 1.6.5 - 2026-10-19 (top spacing adjustment)

- Remove the added top band and 15% vertical offset. Keep the shared PWA/Android UI and Android light/dark theme synchronization unchanged.
- Bump the PWA shell cache to v14 and Android `versionCode` to 26. No library data or backup migration is required.

## 1.6.4 - 2026-10-19 (shared Android and PWA layout)

- Move mobile content below a responsive 15%-height top offset and add a flat, borderless 10%-height top band. The bottom navigation remains unchanged.
- Apply the same responsive PWA presentation to the Android WebView and synchronize Android system bars with the saved light/dark theme.
- Bump the PWA shell cache to v13 and Android `versionCode` to 25. No library data or backup migration is required.
- TypeScript and the web production build passed locally. The local Gradle APK build could not start because Gradle could not open its loopback connection; CI and real-device validation are pending.

## 1.6.3 - 2026-10-19 (iOS standalone PWA viewport fix)

- Use the full standalone iOS viewport height so the bottom navigation dock reaches the bottom edge of the display. This is limited to installed iOS PWAs; other browser and Android layouts are unchanged.
- Bump the PWA shell cache to v12 and Android `versionCode` to 24. No library data or backup migration is required.
- Root TypeScript check and PWA production build passed locally. The installed iPhone PWA still needs on-device confirmation after deployment.

## 1.6.2 - 2026-10-19 (PWA sizing and bottom navigation)

- Scale the PWA interface to 70% while keeping its bottom dock independently anchored full-width to the viewport; only the dock's top corners are rounded.
- Keep the Android WebView presentation and application logic unchanged. Bump the PWA shell cache to v11 and Android `versionCode` to 23; no library data or backup migration is required.
- Root TypeScript check and PWA production build passed locally. GitHub Actions run 25 passed tests, typechecks, PWA and APK builds, and GitHub Pages deployment. A 390×844 browser review confirmed the dock is full-width and flush to the viewport bottom with only its top corners rounded; real iPhone behavior remains unverified.

## 1.6.1 - 2026-10-19 (PWA theme initialization fix)

- Keep the dark palette as the PWA's pre-app default, then apply the saved theme once the player starts. This keeps the install guide readable before the app has initialized its theme.
- Bump the PWA shell cache to v10. Increment Android `versionCode` to 22 and the app/workspace version to `1.6.1`; no library data or backup migration is required.
- Root TypeScript check and PWA production build passed; the install guide and saved light theme were checked in the local browser preview.

## 1.6.0 - 2026-10-19 (PWA interface rebuild)

- Rebuilt the browser/PWA presentation and mobile navigation dock while preserving playback, library, and storage behavior. Android WebView keeps its existing interface.
- Replaced the iOS dock's negative bottom offset with a full-width, safe-area-aware surface fixed to the viewport floor; refreshed PWA layout and light-mode surfaces while preserving the commented dark-mode treatments.
- Bumped the PWA shell cache to v9. Incremented Android `versionCode` to 21 and the app/workspace version to `1.6.0`; no library data or backup migration is required.
- Root TypeScript check and PWA production build passed. Responsive browser review passed at 390×844 CSS pixels; real iPhone verification remains outstanding.

## 1.5.9 - 2026-10-19 (iOS dock and light player refinement)

- Move iPhone navigation about 10 CSS pixels farther down, into the Home Indicator inset, while retaining a separate full-width dock above page content.
- Use a solid light-mode background across the iOS status area to remove any page-gradient tint behind the clock.
- Increment Android `versionCode` to 20 and the app/workspace version to `1.5.9`; no library data or backup migration is required.
- Local TypeScript check and PWA production build pass; real iPhone verification remains outstanding.

## 1.5.8 - 2026-10-19 (iPhone dock anchoring and light player controls)

- Extend the independent iOS navigation dock into the bottom safe-area inset and raise it above page content; reserve navigation space in the player view.
- Restyle the playback timeline, transport controls, and player secondary actions for readable contrast in light mode.
- Increment Android `versionCode` to 19 and update the app/workspace version to `1.5.8`; no library data or backup migration is required.
- Local TypeScript check and PWA production build passed. CI will rebuild the Android APK and deploy Pages after push; real iPhone verification remains outstanding.

## 1.5.7 - 2026-10-19 (iPhone PWA bottom navigation and status bar fix)

- Replaced the floating iPhone navigation capsule with a full-width bar flush to the screen bottom; the home-indicator safe area now belongs to the bar itself.
- Use an opaque iOS status bar in light mode and a black status bar in dark mode to remove the translucent clock halo while keeping mode-appropriate contrast.
- Bumped the PWA shell cache so installed copies fetch the new shell. Incremented Android `versionCode` to 18 to keep APK upgrades aligned with the project version; no library data or backup migration is required.
- Updated the visible app and workspace version to `1.5.7`. TypeScript check and PWA production build passed locally; real-device iPhone verification remains outstanding.

## 1.5.6 - 2026-10-16 (player screen polish and pull-down navigation)

- Lowered and vertically balanced the now-playing layout on mobile, refined the artwork, timeline and playback-control surfaces, and added a visible keyboard-accessible return-to-library button.
- Added a deliberate vertical pull-down gesture to return from the player to the Library; horizontal gestures and interactive controls remain available.
- Incremented Android `versionCode` to 17. No library data or backup migration is required.
- Validation passed: 63 automated tests, root and web TypeScript checks, PWA production build, Android debug APK assembly and lint, plus a 390×844 CSS-pixel Chrome touch-emulation check confirming the pull-down returns to Library without horizontal overflow. Real iPhone/Safari gesture verification remains outstanding. GitHub Pages deploys from `main` on push.

## 1.5.5 - 2026-10-16 (iPhone navigation anchoring and PWA updates)

- Rendered mobile navigation outside the globally zoomed app tree and scaled its dimensions explicitly so fixed positioning reaches the actual viewport edge while retaining safe-area padding and the prior visual size.
- Changed PWA navigations to network-first with cached-shell offline fallback, bumped the shell cache, and reloads an already-controlled page once when an updated service worker takes control.
- Incremented Android `versionCode` to 16; no library data or backup migration is required.
- Browser viewport checks, automated tests, typechecks, PWA build, and Android build/lint results are recorded in the current development handoff; real-device iPhone verification remains outstanding.

## 1.5.4 - 2026-10-16 (iPhone bottom navigation refinement)

- Widened the iPhone bottom navigation by about 30%, enlarged its labels and icons by about 10%, and anchored the capsule to the viewport bottom while keeping controls above the home-indicator safe area.
- Incremented Android `versionCode` to 15; no library data or backup migration is required.
- Validation passed: 60 automated tests, root and web TypeScript checks, PWA production build, Android debug APK assembly, and Android lint. Real-device iPhone verification remains outstanding.

## 1.5.3 - 2026-10-16 (iPhone scale and navigation position)

- Restored the 30% smaller iPhone interface with stable small-viewport sizing, keeping the top and bottom safe areas intact.
- Lowered the iPhone bottom navigation by about 20% of its height while retaining clearance from the home indicator.
- Incremented Android `versionCode` to 14; no library data or backup migration is required.
- Validation passed: 60 automated tests, root and web TypeScript checks, PWA production build, Android debug APK assembly, and Android lint. Real-device iPhone verification remains outstanding.

## 1.5.2 - 2026-10-16 (iPhone layout stabilization)

- Removed the mobile brand strip and loading spinner from iPhone screens while retaining the brand heading for assistive technology.
- Temporarily disabled scaled desktop zoom on iPhone to stabilize its layout, used a stable small viewport height, lowered the bottom navigation, and matched the safe-area background to the app.
- Incremented Android `versionCode` to 13; no library data or backup migration is required.
- Validation passed: 60 automated tests, root and web TypeScript checks, PWA production build, Android debug APK assembly, and Android lint. Real-device iPhone verification remains outstanding.

## 1.5.1 - 2026-10-15 (mobile navigation and library header refinements)

- Widened the mobile bottom navigation by about 20% while retaining at least 4 px side margins, safe-area insets, and no horizontal overflow at 320, 360, and 390 CSS px.
- Kept the exact “Your device, your music” brand line as the shared player header, and moved Add music beside the library sort controls; the existing synchronous iOS file-picker activation is preserved.
- Incremented Android `versionCode` to 12; no library data or backup migration is required.
- Validation passed: 60 automated tests, root and web TypeScript checks, PWA production build, Android debug APK assembly and lint, and responsive browser checks at 320/360/390 px.
- Real-device iOS and Android acceptance remains outstanding as previously deferred.

## 1.5.0 - 2026-10-14 (PWA installation flow and playback layout)

- Added a platform-aware install landing page with browser installation guidance; the music player opens when launched as an installed PWA or in the Android packaged app.
- Kept the mini-player in the application layout instead of overlaying the library and playlist panels, and added scroll-end space so the final track rows can scroll fully into view.
- Refined mobile navigation icons and selected state, and added adaptive Android launcher icons.
- Advanced the offline shell cache so existing installs receive the updated launch flow and assets.
- Incremented Android `versionCode` to 11.

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
- Phase 9 remains open pending iPhone and Android real-device, audio, safe-area, and system-control acceptance.

## 0.0.1 - 2026-10-14 (phase 10 development handoff preparation)

- Recorded reproducible local build commands, tool versions, development artifact checksums, install/deploy instructions, and explicit release blockers during handoff preparation.
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
