# 04 — Platform Constraints and Risk Register

## iOS PWA
### Known constraints to verify
- A file picker can expose selected `File` objects without granting durable access to a whole directory.
- The standard `showDirectoryPicker()` File System Access API is not supported in iOS Safari at the time this project was planned; recheck on the actual target OS/browser.
- `input type=file` selection is not the same as persistent folder permission.
- File handles and permissions must never be assumed to survive relaunch unless demonstrated on the target platform.
- `navigator.storage.persist()` is a request, not a guarantee against all eviction or user deletion.
- PWA offline caching covers application resources, not a user's whole local music folder.
- Background playback and lock-screen behavior must be measured on the target iOS version.

### Required iOS experiment
Record:
- exact iPhone model and iOS version;
- Safari version if available;
- whether one file, multiple files, or a directory can be selected;
- whether audio plays;
- whether selected references work after page reload;
- whether references work after closing/reopening Safari;
- whether installed Home Screen PWA behaves differently;
- what happens after permission denial or file movement;
- whether any persistent-storage request is supported and granted.

## Android
### Expected capabilities, subject to validation
- Android's system document picker can let the user select files or a directory.
- Persistable URI permissions may allow access beyond the current activity/session if implemented correctly and granted by the system.
- Background audio may require native media playback, a media session, notification controls, and foreground service handling.
- Device vendors may apply battery/background restrictions.

### Required Android experiment
Record:
- device model and Android version;
- selected file/directory URI behavior;
- access after app restart and reboot;
- playback with screen locked;
- notification/media controls;
- behavior when a selected file is moved/deleted;
- behavior with 1,000 test metadata entries and a representative sample of real files.

## General risks
| Risk | Severity | Required response |
|---|---|---|
| iOS PWA cannot maintain required file access | Critical | Stop before full implementation; present options and wait for owner choice |
| Audio references disappear after relaunch | High | Test reselect/relink workflow; do not claim permanent access |
| Browser storage eviction/deletion | High | Keep audio outside browser storage; backup metadata |
| Large library causes memory pressure | High | Stream/play one track at a time; avoid reading all audio bytes at once |
| Android background playback unreliable | High | Evaluate native playback adapter/plugin |
| Plugin becomes unmaintained or incompatible | Medium/High | Check maintenance, compatibility, license, and fallback before adoption |
| UI is built before UI/UX package arrives | Medium | Keep detailed visual design out of scope until owner supplies the package |
| Unapproved dependency installation | Medium | Follow dependency approval policy |

## Decision rule
Do not downgrade a requirement silently. If a platform cannot meet a requirement, explain the gap and ask the owner to choose among supported alternatives.
