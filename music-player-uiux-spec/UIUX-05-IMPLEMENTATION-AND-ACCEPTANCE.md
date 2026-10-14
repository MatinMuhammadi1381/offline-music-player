# UIUX-05 — Implementation and Acceptance Checklist

## Before coding
- [ ] Read all UI/UX documents and main project docs.
- [ ] Inspect current repository and existing UI.
- [ ] Install/use required skills according to `UIUX-04-SKILLS-AND-TOOLS.md`.
- [ ] Propose screen inventory, component map, tokens, animation, responsive behavior, and dependency plan.
- [ ] Receive owner approval to begin this phase.
- [ ] Confirm no earlier functionality will be broken by visual changes.

## Design system
- [ ] All visible text is English.
- [ ] Standard system font stack is used.
- [ ] Blue accent and dark music-focused palette are consistent.
- [ ] Design tokens are centralized.
- [ ] Liquid Glass-like surfaces are selective and legible.
- [ ] Solid fallbacks exist for unsupported `backdrop-filter`.
- [ ] Album art remains clear and content is readable.
- [ ] No unapproved external assets or fonts.

## Cross-platform consistency
- [ ] iPhone PWA and Android APK use the same shared React components.
- [ ] Same screens, labels, icons, colors, spacing, hierarchy, and interactions.
- [ ] No separate iOS and Android visual themes.
- [ ] Safe-area handling is correct on iPhone.
- [ ] Android system bars complement the app without creating a separate visual language.
- [ ] Compare screenshots from both platforms at similar viewport sizes and resolve unintended differences.

## Functional integrity
- [ ] Playback controls connect to real playback logic.
- [ ] File selection/relinking states connect to actual platform adapters.
- [ ] Queue and playlist controls are functional where implemented.
- [ ] Empty/error/loading states are real and understandable.
- [ ] No placeholder controls are presented as finished features.
- [ ] Styling changes do not move music files or change storage strategy.
- [ ] Offline app launch and asset loading are still verified.

## Quality
- [ ] Test at 320, 360, 390, and 430 CSS px phone viewport widths with no horizontal overflow or clipped primary controls.
- [ ] Test short-height portrait/landscape layouts and enlarged text.
- [ ] Test iPhone safe-area/insets and Android system bars.
- [ ] Test portrait and relevant landscape states.
- [ ] Test keyboard focus and icon accessible names.
- [ ] Check contrast and text scaling.
- [ ] Respect `prefers-reduced-motion`.
- [ ] Check layout overflow and content obscured by bottom navigation/mini-player.
- [ ] Run project typecheck, lint, tests, and production build.
- [ ] Run the `web-design-guidelines` skill and fix high-priority findings.
- [ ] Record actual test results; do not invent passes.

## Phase report
Include:
- version before/after;
- files changed;
- skills/tools installed or reused;
- screen-by-screen status;
- iPhone and Android test environment;
- screenshots/preview instructions;
- tests and actual results;
- accessibility/performance issues;
- known limitations;
- exact next step requiring owner approval.
