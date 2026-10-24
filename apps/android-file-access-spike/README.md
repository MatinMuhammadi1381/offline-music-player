# Android Shared UI and Native Playback

The launcher APK packages the shared React player UI as local assets and serves it from a restricted HTTPS-shaped WebView asset origin. Audio selection and the library UI are shared with the PWA; playback uses an Android-only foreground media service and Android MediaSession. The older native file-access screen remains in the project as a feasibility harness.

The APK has no network permission; the packaged app shell and library metadata work offline after installation. Selected audio is copied into app-private WebView IndexedDB storage and restored after app restarts. Android also retains the system picker's persistable read grant for native service playback. Clearing app data or uninstalling removes the audio, metadata, and URI mapping. Audio and metadata are not uploaded. The system renders the media notification and lock-screen controls; the app supplies metadata, embedded MP3 artwork when available, progress, and transport controls. Android 13+ notification permission is requested on first playback.

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
8. Lock the screen and verify the Android media notification/lock-screen metadata, artwork, progress, pause/resume, previous/next, and seek controls. Test both permission-granted and notification-permission-denied behavior on Android 13+.

## Data and permissions

- Manual selection uses Android's system document picker. The first-launch MediaStore scan requests `READ_MEDIA_AUDIO` on Android 13+ or `READ_EXTERNAL_STORAGE` on Android 6–12; the APK has no network permission.
- Selected audio bytes are copied into the app's private WebView IndexedDB store, keyed by track ID. Runtime `File` objects are restored from that store after app restart. The Android bridge separately persists the matching system picker URI and read grant for native playback.
- Track, playlist, and settings metadata use the WebView's IndexedDB storage. Audio bytes and Android content URIs are not copied into metadata backups.
- The shared UI's JSON backup import uses the Android document picker; export uses Android's create-document picker and writes only the metadata JSON to the user-selected location. Backups never include audio or picker permissions; restoring one still requires selecting the original files again.
- The older native SQLite/preferences screen remains a feasibility harness; the foreground playback service is now used by the shared player.

## Shared UI integration

- Gradle builds the web app and syncs `apps/player-web/dist` into `app/src/main/assets/player`.
- `SharedPlayerActivity` serves only packaged app assets at its secure local origin, blocks external resources/navigation, and delegates file selection to the Android system picker.
- The WebView uses app-private IndexedDB for library metadata, settings, and audio copies, and restores audio into in-memory `File` references at launch. The Android-only playback engine sends track IDs and metadata to `PlaybackService`; the service reads the separately persisted content URI, publishes MediaSession state and system media controls, and broadcasts playback progress and transport actions back to the WebView.
- Validate 320, 360, 390, and 430 CSS px widths, portrait and short landscape, safe areas, enlarged text, and absence of clipped controls or horizontal overflow on real devices.

## Android library scanner

The shared player starts a MediaStore scan on first launch after requesting `READ_MEDIA_AUDIO` (Android 13+) or `READ_EXTERNAL_STORAGE` (Android 6–12). It imports audio bytes and metadata into the same WebView IndexedDB library used by manual selection, using the scanner's stable MediaStore ID as each track ID so retries skip already imported tracks. The native bridge transfers one file at a time through asynchronous 64 KiB content-URI reads and sends metadata in acknowledged pages of at most 100 tracks; it does not send whole audio payloads through one WebView call or retain a full collection in JavaScript. The initial-scan marker is committed only after the final page's audio and track metadata are durable. On failure the marker remains unset; reopening the app retries, and stable IDs prevent duplicate imports. Audio is queried and copied locally, never uploaded.

## Current limitations

- No Android phone or emulator is connected in the current environment.
- Build success cannot prove picker behavior, permission survival across reboot, notification controls, or playback while locked.
- Directory child enumeration is limited to top-level audio files and is provider-dependent.
- Device/emulator testing is still required for notification permission prompts, lock-screen presentation, provider-specific persistent URI grants, OEM battery restrictions, and behavior after reboot or force-stop. Reboot recovery is not claimed.
- Android WebView file inputs and media behavior vary with Android System WebView versions and require device testing.
