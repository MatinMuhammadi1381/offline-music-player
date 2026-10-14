# UIUX-02 — Shared Design System

## Goal
Create one shared design system consumed by both the iPhone PWA and Android APK. The interface should look the same on both platforms. Responsive layout may adapt to available width and safe areas but should not introduce separate platform-specific visual themes.

## Suggested design-system files
Adapt to the existing repository; do not restructure it without approval.
```text
packages/player-ui/
├── src/
│   ├── tokens/
│   │   ├── colors.css
│   │   ├── spacing.css
│   │   ├── typography.css
│   │   ├── materials.css
│   │   └── motion.css
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── GlassSurface.tsx
│   │   ├── IconButton.tsx
│   │   ├── TrackRow.tsx
│   │   ├── AlbumArtwork.tsx
│   │   ├── MiniPlayer.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── BottomNavigation.tsx
│   │   ├── SearchField.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   └── LoadingState.tsx
│   └── index.ts
```
This is a suggested organization; reuse existing conventions when present.

## Shared tokens
Define tokens for:
- color palette;
- spacing scale;
- font sizes/line heights/weights;
- border radii;
- elevation/shadows;
- glass materials;
- animation durations/easing;
- minimum interactive target sizes;
- safe-area offsets.

Use CSS variables and semantic names, e.g. `--color-accent`, `--surface-glass`, `--text-primary`, not component-specific hard-coded colors.

## Component principles
- Prefer semantic buttons and inputs over clickable generic containers.
- Every icon-only control needs an accessible name.
- Every button must have a real action and a visible focus/pressed state.
- Shared components must have explicit props and predictable behavior.
- Avoid styling that depends on browser-specific quirks.
- Include solid fallback styles when `backdrop-filter` is unsupported or disabled.
- Use a single icon library only if needed; inspect current dependencies first. If no icon library exists, propose `lucide-react` and get approval before adding it.
- Avoid emoji as primary navigation or playback icons.

## Platform consistency
- Same labels, icons, hierarchy, component sizes, and behavior across platforms.
- Same bottom navigation and mini-player design.
- Same player screen, queue, library, playlists, search, and settings visual language.
- Use safe-area insets such as `env(safe-area-inset-bottom)` for iPhone; these insets must not create a different design.
- Do not imitate Android Material Design on Android or introduce iOS-only layouts on iPhone.
- The Android system status bar/navigation bar may be configured to complement the shared design, but the application UI remains shared.
- Ensure the web viewport uses a proper mobile viewport configuration and avoids accidental zoom/layout overflow.

## Responsive rules
- Phone-first layout.
- The production interface must remain usable at 320 CSS px viewport width; validate at 320, 360, 390, and 430 CSS px without horizontal scrolling or clipped primary controls.
- Keep essential playback controls reachable with one hand where practical.
- Use consistent side padding and a stable content width.
- Handle notched devices and home-indicator safe areas.
- Do not allow the mini-player or navigation to cover the last library row; reserve bottom content padding.
- Landscape must remain usable; do not force a desktop layout onto a narrow phone.
- Test a short-height phone in landscape, including expanded player and persistent controls.
- Verify text resizing/enlargement without clipped labels or unreachable controls.
- Tablet/desktop web layouts may use more space without changing the design language.

## Accessibility
- Text contrast should meet WCAG AA where practical.
- Use at least 44×44 CSS px touch targets for primary touch controls where feasible.
- Do not convey state by color alone.
- Provide focus indicators and semantic labels.
- Support text scaling and reduced motion.
