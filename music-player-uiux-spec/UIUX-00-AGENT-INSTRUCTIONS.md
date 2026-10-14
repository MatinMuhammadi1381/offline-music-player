# UIUX-00 — Mandatory UI/UX Agent Instructions

## Timing and scope
This package is for the final UI/UX phase only. Do not begin detailed UI implementation before:
- file-access and playback feasibility has been tested;
- the shared core and essential playback/library behavior are accepted;
- the owner explicitly approves starting the UI/UX phase.

## Required workflow
1. Inspect the current application, existing design/components, package manager, and platform adapters.
2. Read every file in this UI/UX package and the main project documentation.
3. Read the `frontend-design` skill and `web-design-guidelines` skill. Use `react-best-practices` where relevant to React implementation/performance.
4. Before changing code, propose:
   - screen inventory;
   - component map;
   - design tokens;
   - responsive/safe-area plan;
   - animation plan and reduced-motion behavior;
   - exact dependencies/tools to add and why;
   - implementation sequence and UI tests.
5. Wait for owner approval before making UI changes or installing new dependencies, unless the owner has explicitly approved this phase and its listed dependencies.
6. Implement the same shared UI for iPhone PWA and Android APK. Platform-specific native file access and playback code must not leak into or fork the visual design.
7. Validate the app at narrow phone widths and larger phone widths, in portrait and landscape where applicable.
8. Run the `web-design-guidelines` skill against the implemented UI and fix important findings.
9. Report changed files, screenshots/preview instructions, tests, accessibility results, version change, and remaining gaps.
10. Stop and wait for approval before release packaging or unrelated follow-up work.

## Non-negotiable requirements
- All visible UI copy is English.
- No Persian strings in UI, placeholders, validation, onboarding, or error messages.
- Use the system font stack for a standard, familiar, native-feeling appearance.
- Apple Music-inspired blue palette and restrained futuristic styling.
- Liquid Glass-inspired treatment is selective and functional, not applied to every surface.
- Keep the iPhone PWA and Android app visually consistent.
- Do not replace working file-access/playback logic just to make styling easier.
- Do not use mock controls that look functional but do nothing.
- Do not introduce network-dependent assets that break offline use.
- Do not add unnecessary dependencies or download random UI kits.
- Respect `prefers-reduced-motion`, keyboard access, contrast, and touch target size.
- Do not claim exact native Apple Liquid Glass rendering; this is a web-compatible visual interpretation.

## Consistency rule
Create a shared design system and shared React components. Both apps should use the same component implementation whenever possible. The Android shell may add native functionality, but must render the same React UI. Platform differences should be limited to technical capabilities and OS insets, not branding or screen design.
