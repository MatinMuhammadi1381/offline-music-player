# UIUX-01 — Visual Direction

## Design intent
Create a premium, modern, music-first interface that feels at home on an iPhone and remains visually identical in the Android APK. Take inspiration from Apple Music's confident blue accents, clean hierarchy, album-art emphasis, and Apple's Liquid Glass language for floating controls. Do not copy Apple Music branding, logos, proprietary artwork, or exact screen assets. The product has its own name and identity.

## Visual keywords
- Blue-led
- Premium
- Futuristic but restrained
- Smooth and tactile
- High legibility
- Album-art-forward
- Minimal clutter
- Layered depth
- Native-feeling
- Consistent across platforms

## Color direction
Use a deep near-black/dark navy base for the main app canvas, layered neutral surfaces, and a confident blue accent. Define all colors as tokens rather than scattering hex values throughout the code.

Suggested initial tokens (adjust only after previewing real screens):
- `--color-bg: #070B14`
- `--color-surface: #101827`
- `--color-surface-raised: #172338`
- `--color-accent: #0A84FF`
- `--color-accent-bright: #36A3FF`
- `--color-accent-soft: rgba(10,132,255,0.18)`
- `--color-text-primary: #F5F7FB`
- `--color-text-secondary: #A7B2C4`
- `--color-separator: rgba(220,232,255,0.12)`
- `--color-glass: rgba(18,29,48,0.62)`
- `--color-glass-border: rgba(220,235,255,0.16)`

These are starting points, not permission to make every surface blue or translucent. Verify contrast and tune with screenshots.

## Liquid Glass-inspired material
Use translucent, layered material selectively on:
- floating bottom navigation;
- mini-player dock;
- transient overlays and sheets;
- selected floating controls where the content behind remains legible.

Use techniques such as:
- `backdrop-filter: blur(...)` with a solid-color fallback;
- low-opacity tinted surfaces;
- subtle 1px highlights/borders;
- restrained layered shadows;
- smooth, short opacity/transform transitions.

Do not apply glass to every list row, album tile, or text surface. Do not place important text over busy album art without a contrast layer. Avoid excessive blur, glow, neon outlines, and stacked glass panels.

## Album art
- Album artwork should be visually prominent and maintain its correct aspect ratio.
- Use `object-fit: cover` only for artwork thumbnails where cropping is acceptable.
- Use a clear placeholder when artwork is missing.
- Never download copyrighted album artwork into the repository as a design asset. Use neutral local placeholders or user-provided assets.
- The player screen can use a subtle, low-contrast color wash derived from the current artwork only if it is performant and does not reduce readability.

## Typography
Use a standard system font stack:
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

- Do not download a custom font unless the owner approves a clear reason.
- Use a consistent type scale, readable body text, clear track title hierarchy, and restrained weights.
- Avoid ultra-thin text, overly wide tracking, all-caps for long labels, and tiny low-contrast metadata.
- Use tabular numerals for timers/durations where useful.

## Shape and depth
- Use consistent corner-radius tokens.
- Keep cards, buttons, sheets, and artwork aligned to a spacing system.
- Use depth to clarify hierarchy, not as decoration everywhere.
- Avoid excessive gradients, ornamental particles, fake 3D visualizers, and generic AI-dashboard patterns.

## Motion
- Use short, purposeful transitions for opening sheets, changing tabs, queue changes, and player expansion.
- Prefer transform and opacity animations.
- Avoid continuous animation when music is paused or the app is idle.
- Respect `prefers-reduced-motion: reduce`.
- Do not animate every list item or use motion that delays basic interactions.

## Product identity
The visible product language is English only. The visual identity is Apple Music-inspired, but do not use Apple's logo or imply the app is an official Apple product.
