# iOS PWA File-Access Spike

A dependency-free feasibility page for testing local file selection, audio playback, and browser storage APIs. It does not upload files, save audio to browser storage, or retain file references. The service worker caches only the page's app-shell assets.

## Run a local desktop check

From the repository root:

```powershell
python -m http.server 4173 --directory apps/ios-file-access-spike --bind 127.0.0.1
```

Open `http://localhost:4173` on the same computer. Localhost is a secure context for service-worker testing. This desktop check is not evidence of iOS behavior.

## Test on iPhone

The installed Home Screen PWA test requires serving this folder from an HTTPS origin. Deploy only this synthetic test page to a private, owner-approved HTTPS origin; do not use personal audio, private library metadata, or an unapproved public deployment. No deployment URL or iPhone device was supplied, so this project does not publish the page.

On the target iPhone:

1. Record the iPhone model and iOS version in the observations form.
2. In Safari, select one supported local audio file and play it. Repeat with multiple files selected in one action, then choose different selected files from the playback selector.
3. Record whether a directory picker is exposed by Safari. A multiple-file picker is not proof of directory access.
4. Record whether playback succeeds, including any unsupported-format error.
5. Reload the page and note whether selected file references remain usable.
6. Add the HTTPS page to the Home Screen, launch it, and repeat selection/playback.
7. Close and reopen the Home Screen app; record whether file references survive. Select files again to test the recovery path.
8. Optionally request persistent storage and record the actual grant result. This does not test retention of the selected music files.
9. Use **Copy test report** to copy diagnostics and manually recorded observations. The report excludes selected filenames and audio data.

## Acceptance evidence

This page reports the browser APIs and observed selection count but cannot establish persistence across reload/relaunch on its own. Acceptance requires actual device/OS details and manually observed results for Safari and the installed Home Screen PWA. Do not infer folder access, persistent file references, or reliable lock-screen playback from desktop testing.

## Limitations

- This is a test harness, not the music player or the final UI.
- Selection and playback are in-memory browser operations. The page does not persist or cache the selected audio.
- The standalone test page does not integrate the shared queue/playback controller; queue, repeat, shuffle, playlists, and seek acceptance are now available in the shared production UI and still require target-device testing.
- Files selected by the native picker may be available only during the current page session; the actual iOS result must be recorded.
- The Android picker/background-playback spike is a separate phase and is not included here.
- No app dependencies were added.
