# 01 — Product Vision

## Product summary
Build a reliable, offline-first personal music player for a local music collection. The product should feel like a practical music library rather than a cloud streaming service.

## Target platforms
- **iPhone:** installable PWA opened from the iOS Home Screen.
- **Android:** installable APK, preferably reusing the shared React/TypeScript application through Capacitor plus native integrations where necessary.

## Primary use case
The owner has around 1,000 songs totaling approximately 3 GB and wants to play them locally without uploading them to a server or copying the entire collection into browser-managed storage.

## Product principles
1. **Local-first:** audio stays on the user's device and is not uploaded.
2. **Offline-first:** core playback and library browsing should work without an internet connection after the initial app load/setup, within each platform's capabilities.
3. **No silent data loss:** communicate permission loss, missing files, corrupted metadata, or unavailable storage clearly.
4. **Honest platform behavior:** explain platform restrictions instead of pretending web and native APIs are equivalent.
5. **Shared code where sensible:** reuse UI, domain logic, types, playlists, sorting, and search; keep file access and background playback platform-specific when needed.
6. **Small phases:** prove risky assumptions before building the full product.
7. **Version from day zero:** keep a traceable Git history and version each approved milestone.

## Non-goals for the initial version
- Public App Store release.
- Accounts, social features, music streaming, cloud sync, or mandatory backend.
- Uploading or distributing copyrighted audio.
- Building a full desktop music player.
- Automatically copying the whole music library into web storage.
- Promising uninterrupted background playback on iOS PWA before testing.

## Success definition
A successful initial release allows the owner to select locally stored music, browse a usable library, play tracks offline within tested platform limits, manage playlists, and recover library metadata from a backup. It must accurately explain any platform-specific limitations.
