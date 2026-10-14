# 02 — Functional Requirements

## P0 — Feasibility and foundation
- [ ] Test selecting one audio file in iOS Safari.
- [ ] Test selecting multiple audio files in iOS Safari.
- [ ] Test whether selected file references remain usable after navigation/reload and after closing/reopening the installed PWA.
- [ ] Test whether Safari supports a user-selected directory workflow on the target iOS version. Do not assume it does.
- [ ] Test Android local file/folder selection with the proposed native bridge.
- [ ] Test Android playback with screen locked and app backgrounded.
- [ ] Record actual results, device/OS versions, and reproducible steps.
- [ ] If iOS PWA cannot meet the owner's folder-access requirement, present alternatives before full implementation.

## P1 — Library
- [ ] Import/select locally available audio files without uploading them.
- [ ] Show available metadata such as title, artist, album, duration, file name, and file size when it can be read.
- [ ] Handle missing metadata gracefully.
- [ ] Search and sort the available library.
- [ ] Detect when a file is no longer accessible and show a recoverable state.
- [ ] Avoid silently treating metadata as proof that the underlying audio file still exists.
- [ ] Support an expected library size of approximately 1,000 tracks / 3 GB without loading all audio bytes into memory at once.

## P1 — Playback
- [ ] Play, pause, resume, seek, previous, and next.
- [ ] Shuffle and repeat modes.
- [ ] Queue management.
- [ ] Preserve playback position/settings where technically possible.
- [ ] Handle unsupported, unreadable, or removed files without crashing.
- [ ] Android: evaluate lock-screen/media notification controls and background playback.
- [ ] iOS PWA: document actual background/lock-screen behavior from tests; do not promise unsupported behavior.

## P1 — Playlists and metadata
- [ ] Create, rename, reorder, and delete playlists.
- [ ] Add/remove tracks from playlists.
- [ ] Store playlist references using stable identifiers where possible; do not depend only on display names.
- [ ] Export library metadata/playlist data to a user-accessible backup format.
- [ ] Import and validate a backup before replacing current metadata.
- [ ] Do not include audio files in metadata backups unless the owner explicitly requests this.

## P1 — Resilience
- [ ] Request persistent browser storage where the browser exposes the API; record whether the request was granted.
- [ ] Never claim that persistent storage prevents all data loss.
- [ ] Keep original music files separate from browser cache/metadata storage where possible.
- [ ] Provide a way to rebuild the library by reselecting files if file references are lost.
- [ ] Show a clear warning when permissions or references are no longer valid.
- [ ] Validate imported backup structure and handle malformed data safely.

## P2 — Convenience
- [ ] Remember sort order, theme, and playback preferences.
- [ ] Recently played tracks.
- [ ] Optional album/artist grouping.
- [ ] Optional metadata editing only after safe persistence and backup behavior is tested.

## Explicit constraints
- Do not require sign-in.
- Do not require an internet connection for normal playback after setup, within tested platform capabilities.
- Do not upload audio or metadata to a remote service.
- Do not copy the full collection into IndexedDB or Cache Storage without explicit owner approval.
- Detailed visual behavior will be defined in a separate UI/UX package.
