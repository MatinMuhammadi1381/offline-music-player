# Android Shared UI and Native Playback Spike

The launcher APK packages the shared React player UI as local assets and serves it from a restricted HTTPS-shaped WebView asset origin. Its file input is handled by Android's system audio picker, and its current playback path is the shared HTML audio adapter. The older native screen/service remains in the project as a feasibility harness and is not yet connected to the shared UI.

The APK has no network permission; the packaged app shell and library metadata work offline after installation. Selected audio is copied into app-private WebView IndexedDB storage and restored after app restarts. Clearing app data or uninstalling removes the audio and metadata. Audio and metadata are not uploaded. Screen-locked playback, Android media notifications, and native service integration are not yet accepted.

## Build and install

Requirements: Node.js, pnpm dependencies installed from the repository root, JDK 17, and Android SDK Platform 34 / Build-Tools 34.0.0. The Gradle build runs the shared UI production build and copies its assets into the APK.

From this folder:

```powershell
.\gradlew.bat assembleDebug
```

Install on a USB-connected Android phone with USB debugging enabled:

```powershell
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

If Gradle reports that the Android Gradle Plugin or a build artifact is missing from the local cache, stop. Do not change plugin versions or install packages without reviewing and approving the proposed tool/dependency change.

## Shared UI and device test procedure

Record the manufacturer, model, Android version, and build number shown by the phone. Test a small number of local audio files; never copy a music collection into this project or Git.

1. Install the APK and confirm the same library, player, queue, playlist, and settings screens render as the PWA.
2. Test the audio file picker with one and multiple audio files; add, search, sort, and play selected files.
3. Exercise queue controls, seek, repeat, shuffle, playlist management, and missing-file relinking.
4. Force-stop and reopen the app. Confirm metadata and audio persist, then play a previously selected track without opening the picker again.
5. Import a valid metadata backup, then try a malformed backup; confirm validation rejects bad data. Export a backup and inspect the user-selected JSON file for track/playlist metadata only.
6. Test the packaged app shell with network disabled. Verify install-time assets load and audio is never copied into browser storage.
7. Repeat the UI tests at 320, 360, 390, and 430 CSS px widths, short landscape, and enlarged text; record screenshots and any clipping or horizontal overflow.
8. Separately test the native feasibility screen/service before claiming Android background playback, notification controls, persisted URI access, or reboot recovery. These are not currently connected to the shared UI.

## Data and permissions

- The shared UI requests audio through Android's system document picker and does not request broad storage or network permission.
- Selected audio bytes are copied into the app's private WebView IndexedDB store, keyed by track ID. Runtime `File` objects and playback references are restored from that store after app restart; they are not persisted as Android content URI grants.
- Track, playlist, and settings metadata use the WebView's IndexedDB storage. Audio bytes and Android content URIs are not copied into the database or metadata backups.
- The shared UI's JSON backup import uses the Android document picker; export uses Android's create-document picker and writes only the metadata JSON to the user-selected location. Backups never include audio or picker permissions; restoring one still requires selecting the original files again.
- The older native SQLite/preferences and foreground-service code is retained as feasibility source only. It is not launched or integrated with the shared UI, so its persisted URI and lock-screen behavior cannot currently be tested through the production APK.

## Shared UI integration

- Gradle builds the web app and syncs `apps/player-web/dist` into `app/src/main/assets/player`.
- `SharedPlayerActivity` serves only packaged app assets at its secure local origin, blocks external resources/navigation, and delegates file selection to the Android system picker.
- The WebView uses app-private IndexedDB for library metadata, settings, and audio copies, and restores audio into in-memory `File` references at launch. It does not use the native SQLite library or `PlaybackService` for the shared UI.
- Validate 320, 360, 390, and 430 CSS px widths, portrait and short landscape, safe areas, enlarged text, and absence of clipped controls or horizontal overflow on real devices.

## Current limitations

- No Android phone or emulator is connected in the current environment.
- Build success cannot prove picker behavior, permission survival across reboot, notification controls, or playback while locked.
- Directory child enumeration is limited to top-level audio files and is provider-dependent.
- The shared UI copies audio into WebView storage instead of retaining persistent Android URI permissions. Android's native background service remains disconnected from it.
- Android WebView file inputs and media behavior vary with Android System WebView versions and require device testing.
