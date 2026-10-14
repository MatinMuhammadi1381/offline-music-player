# 09 — Privacy, Security, and Data Integrity

## Local-first guarantee
- Do not upload audio, playlists, library metadata, or listening history to a server.
- Do not add analytics, telemetry, crash-reporting upload, ads, or account systems without explicit owner approval.
- Any optional network request must be documented and justified.
- Keep personal music out of public GitHub repositories and public test deployments.

## File access
- Ask only for the file access the user needs to grant.
- Explain what the platform picker is granting.
- Handle revoked or expired access.
- Never pretend that a file name in metadata means the file remains accessible.
- Avoid broad storage permissions when a system document picker is sufficient.

## Persistence
- Persistent browser storage is best-effort and not an absolute data-loss guarantee.
- Original audio should remain in user-managed storage.
- Metadata backup must be accessible to the user.
- Validate a backup before applying it.
- Never overwrite the current library metadata with an invalid backup.
- Offer clear recovery steps if references are lost.

## Secrets and repository hygiene
- No API keys, tokens, passwords, private certificates, or signing material in source control.
- Keep generated build artifacts and personal audio out of Git unless explicitly required.
- Review `.gitignore` before adding files.
- Do not publish private data while deploying the PWA.

## User-facing honesty
Communicate platform limitations and permission states accurately. Do not claim:
- that iOS PWA can permanently retain access to any selected folder;
- that `persist()` prevents all storage deletion;
- that PWA caching preserves music files stored elsewhere;
- that Android background playback works before device testing.
