# Music Player — UI/UX Specification Pack

This is a separate UI/UX package for the Offline Music Player project. It is intentionally implemented only during the final UI/UX phase, after the technical feasibility work and core functionality are accepted.

## Owner's confirmed visual direction
- English-only product UI; no Persian localization is required.
- Visual direction inspired by iOS, Apple Music, and Apple's Liquid Glass design language.
- Blue is the dominant accent color.
- Futuristic, polished, premium, calm, and music-focused.
- Use a normal, highly readable system font rather than a decorative display font.
- The iPhone PWA and Android APK must have the same visual design, layout, component styling, navigation model, labels, and interaction patterns wherever technically possible.
- Do not create one design for iPhone and a different design for Android.
- Responsive adaptation is allowed to fit different screens and system safe areas; it must not change the product's design identity.
- The UI/UX phase is the final planned phase. Do not start it before the owner provides/approves this package and the earlier functionality is stable.

## Read first
1. `UIUX-00-AGENT-INSTRUCTIONS.md`
2. `UIUX-01-VISUAL-DIRECTION.md`
3. `UIUX-02-DESIGN-SYSTEM.md`
4. `UIUX-03-SCREENS-AND-STATES.md`
5. `UIUX-04-SKILLS-AND-TOOLS.md`
6. `UIUX-05-IMPLEMENTATION-AND-ACCEPTANCE.md`

## Important Liquid Glass rule
Use Liquid Glass-like translucent material selectively for functional floating controls and navigation (for example, the bottom navigation/player surface), not as a glass effect on every card or every content surface. Keep album art and music content visually clear, readable, and dominant. Follow the official Apple Human Interface Guidelines as a reference, while implementing a web-compatible visual approximation rather than claiming that CSS reproduces Apple's native system material exactly.

Official reference:
https://developer.apple.com/design/human-interface-guidelines/materials

## Implementation rule
Do not install every suggested package blindly. Read `UIUX-04-SKILLS-AND-TOOLS.md`, inspect the repository and existing dependencies, then install only the approved tools actually needed for the UI phase. Do not add a backend, analytics, remote fonts, paid service, or design tool subscription unless the owner explicitly approves it.
