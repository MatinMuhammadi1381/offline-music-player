# 08 — Dependency Policy

## Rule: no bulk installation
Do not install a large group of packages because they might be useful. Every dependency must have a purpose, and the owner must approve new runtime dependencies before installation.

## Categories
### A. Stage 0 — Existing tools
Inspect what is already installed and used before proposing anything:
- Node.js / package manager
- Git
- existing React/Vite setup
- Android Studio / Android SDK if available
- existing Capacitor or PWA tooling

### B. Current approved task
Only dependencies required for the explicitly approved phase may be considered. Prefer native platform APIs or existing project dependencies when reasonable.

### C. Proof-of-concept evaluation
For an optional library/plugin, document:
- exact feature it provides;
- whether a built-in API can do the job;
- active maintenance and recent releases;
- platform/OS compatibility;
- license;
- bundle size and native permissions;
- known issues and fallback plan;
- whether it introduces network services or data collection.

### D. Later feature
Do not preinstall packages for features that are not part of the approved phase.

## PWA and Capacitor
Potential candidates, not pre-approved installations:
- a Vite PWA plugin for service worker/manifest generation;
- Capacitor core and Android platform;
- a suitable audio/background-media plugin or a small native bridge if required;
- a test runner appropriate to the existing repository.

The agent must compare options and propose only what the current phase needs. Do not assume a plugin can provide iOS directory access if the underlying Safari API does not support it.

## Native plugins
Before adopting an audio or file plugin:
- verify Android target SDK compatibility;
- verify iOS PWA versus native iOS distinctions;
- inspect repository health and issues;
- test a minimal proof of concept;
- check license and permissions;
- obtain owner approval.

## Security and maintenance
- Commit lockfiles.
- Avoid unpinned or floating dependencies in release builds.
- Review install scripts and permissions.
- Do not commit credentials, signing keys, certificates, personal audio, or private metadata.
- Explain dependency updates and potential breaking changes.
