# 06 — Versioning and Releases

## Required from day zero
- Use Git from the beginning.
- Do not overwrite the only copy of important project state.
- Keep a human-readable `CHANGELOG.md`.
- Keep version metadata in a single authoritative place where practical; explain if web and Android require separate build version fields.
- Use annotated Git tags for approved milestones.
- Record the source commit for every tested build.
- Never call an untested build “stable” or “production-ready.”

## Project version
- The current project version is `1.1.1`. Preserve this semantic version consistently in the `VERSION` file, package metadata, Android APK metadata, and user-visible About screen. The version label alone does not certify release acceptance or production readiness.
- The PWA's About-screen version is injected from the root `VERSION` file at build time. Do not hardcode a separate display value.
- Android's `versionName` must use the same display identifier. Increment its integer `versionCode` for each distributable APK so Android can distinguish upgrades.

## Semantic versioning policy
Use `MAJOR.MINOR.PATCH` and apply the smallest component that communicates the change:
- **PATCH** (`1.0.0` → `1.0.1`): backward-compatible bug fixes, security fixes, and small corrections that do not add user-facing functionality.
- **MINOR** (`1.0.0` → `1.1.0`): backward-compatible features or meaningful enhancements. Reset PATCH to zero.
- **MAJOR** (`1.0.0` → `2.0.0`): intentional breaking changes to supported behavior, data/backup compatibility, or public interfaces. Reset MINOR and PATCH to zero.
- Before `1.0.0`, `0.y.z` denotes pre-stable development; increment MINOR for features and PATCH for compatible fixes. Do not label a build `1.0.0` as production-ready merely because of its version number.

For every version change, update the root `VERSION`, all workspace package versions, Android `versionName`, README, changelog, and current handoff metadata. Rebuild and verify the PWA and APK; refresh their checksums and record test outcomes and outstanding limitations. Keep historical changelog entries intact. Do not create a release tag or claim a production release without explicit owner approval and completed acceptance criteria.

The agent must propose the exact initial version during Phase 0. Do not claim that a version is released before the owner approves the milestone.

## Suggested milestone tags
Examples only; adjust to the actual work:
- `v0.0.1-baseline`
- `v0.1.0-ios-file-spike`
- `v0.2.0-android-spike`
- `v0.3.0-shared-core`
- `v0.4.0-library`
- `v0.5.0-playback`
- `v0.9.0-release-candidate`
- `v1.0.0-personal-release`

Do not create tags for phases that have not completed and been approved.

## Changelog
Each entry should state:
- version/date;
- added/changed/fixed;
- platform(s) affected;
- tests run and outcomes;
- known limitations;
- migration or backup implications.

## Build identity
For each PWA/APK build record:
- semantic version;
- Git commit;
- build date;
- target platform/OS;
- build command and toolchain version;
- tests/checks run;
- known limitations.

## Recovery
Before a destructive migration:
1. export current metadata if possible;
2. verify backup is readable;
3. explain migration and rollback options;
4. obtain owner approval.
