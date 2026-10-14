# UIUX-03 — Screens and States

This document defines the minimum screen inventory, not a final wireframe. The owner expects detailed visual implementation in the final UI/UX phase after core behavior is accepted.

## Required screens
1. **Library**
   - Main music collection
   - Search entry
   - Sort/filter entry where supported
   - Clear state when no tracks are added
   - File access / reselect-files recovery state when references are unavailable

2. **Now Playing**
   - Large album artwork or placeholder
   - Track title and artist when known
   - Progress and elapsed/remaining time
   - Previous, play/pause, next
   - Shuffle and repeat states
   - Queue access
   - Clear playback error state

3. **Queue**
   - Current track and upcoming tracks
   - Reorder/remove actions if supported by the accepted functionality
   - Empty queue state

4. **Playlists**
   - Playlist list
   - Create/rename/delete flows where supported
   - Playlist detail and track list
   - Empty playlist state

5. **Search**
   - Search field
   - Results state
   - No-results state
   - Clear-search action

6. **Settings / Library Recovery**
   - Persistent-storage status where relevant and available
   - Backup export/import for library metadata if implemented
   - Re-link/reselect files flow
   - About/version and platform limitations
   - No cloud sync/account settings unless later approved

## Shared persistent controls
- Shared bottom navigation for primary destinations.
- Shared mini-player when a track is active.
- Shared playback actions and iconography.
- Clear feedback for file permission loss, unsupported formats, missing metadata, and playback failure.

## State coverage
For every screen, implement and review:
- loading (only where real work is pending);
- populated;
- empty;
- error;
- unavailable permission/reference;
- pressed/focused/selected;
- reduced-motion behavior where motion exists.

## Copy and language
All visible copy must be English. Keep labels concise and consistent. Use plain, standard wording; avoid slang, long marketing copy, and unexplained technical terms. Error messages must state what happened and what the user can do next.

## Do not invent unsupported capabilities
The UI must only expose functionality implemented and accepted in the core phases. If a platform cannot support a behavior, show an honest platform limitation or recovery path rather than a decorative nonfunctional control.
