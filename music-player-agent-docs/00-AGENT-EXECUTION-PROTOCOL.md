# 00 — Agent Execution Protocol (Mandatory)

## Highest-priority rule

**Do not begin implementation immediately.** First inspect the repository and this documentation, then provide a phased execution plan. Wait for explicit approval from the project owner before coding or changing files.

## Required workflow

### Step 0 — Read and assess
- Read this entire documentation pack.
- Inspect the current repository, existing files, package manager, Git status, and current app state.
- Do not overwrite, delete, rename, or restructure existing work without explaining why and receiving approval.
- Identify assumptions, blockers, platform-specific risks, and missing information.
- The separate UI/UX specification package has not been provided yet. Do not invent detailed visual design.

### Step 1 — Plan only
Return a plan containing:
1. Current repository assessment.
2. Proposed architecture and repository structure.
3. Phases with small, reviewable tasks.
4. Tests and verification for each phase.
5. Proposed version number and Git tag strategy.
6. Dependencies proposed, grouped according to `08-DEPENDENCY-POLICY.md`.
7. The exact feasibility tests needed for iOS PWA file access and Android local playback.
8. Risks and decisions requiring owner input.

**Stop and wait for approval.** Do not code in the same step.

### Step 2 — Baseline and version control
After approval:
- Confirm Git repository exists; initialize only if absent and owner has approved.
- Check `.gitignore`, secrets handling, README, and a minimal change log.
- Establish the initial version before feature work, following `06-VERSIONING-AND-RELEASES.md`.
- Record the starting repository state and any existing tests.
- Add a lightweight test/check runner (such as an approved `.bat` for Windows) before feature implementation, if appropriate to the repo.
- Run baseline checks and report green/red results.
- Stop for approval before starting the next phase.

### Step 3 — Execute one phase at a time
For every phase:
1. State the goal and files expected to change.
2. Confirm any new dependency before installing it.
3. Implement only the approved scope.
4. Run relevant tests/checks.
5. Inspect `git diff` and ensure unrelated changes are absent.
6. Update version/change log only when the phase meets its exit criteria.
7. Report results using `10-AGENT-REPORT-TEMPLATE.md`.
8. Show a clear green check for passing checks and red mark for failures.
9. Stop and wait for explicit approval before the next phase.

### Step 4 — Error and test cadence
- Run checks before coding, after each meaningful task, and at the end of each phase.
- During longer phases, run checks roughly every 2–3 hours of work or after a coherent feature slice.
- Never hide a failed test. Report the command, observed error, impact, and proposed next step.
- Do not claim a check passed unless it was actually run.

## Scope discipline
- No bulk dependency installation.
- No unrelated refactors.
- No cloud service or backend unless the owner explicitly approves it.
- No uploading audio files, personal data, secrets, or test media to public repositories.
- Do not treat a browser file picker as proof of persistent directory access.
- Do not assume that a PWA can behave exactly like a native file manager.
- Do not copy the entire music collection into IndexedDB/cache as a workaround without explicit approval.
- Never make the UI/UX package on behalf of the owner; wait for their separate instructions.

## Owner approval gate
The owner must explicitly approve:
- the initial plan;
- architecture changes that affect platform feasibility;
- new runtime dependencies or native plugins;
- each phase before work begins;
- any migration, deletion, bulk file change, or behavior that copies music files;
- release/version milestones.

A message such as “continue” or “approved, start Phase N” counts as approval only for the named next phase, not all future phases.
