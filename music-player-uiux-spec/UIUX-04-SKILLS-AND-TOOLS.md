# UIUX-04 — Agent Skills and UI Tools

## Required agent skills

Use the official upstream skill sources below. Review their contents before installing; follow the installer's supported syntax and choose the current agent (OpenCode, Codex, Claude Code, or other supported agent) rather than assuming a global path.

### 1. `frontend-design` — required for visual implementation
Source: https://github.com/anthropics/skills/tree/main/skills/frontend-design

Purpose: deliberate visual direction, typography, layout, polish, and avoiding generic template-like UI.

Suggested install command:
```bash
npx skills add anthropics/skills --skill frontend-design
```

### 2. `web-design-guidelines` — required for UI review
Source: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines

Purpose: audit implemented UI for accessibility, interaction states, performance, and web-interface quality. Use it after implementation and fix high-priority findings.

Suggested install command:
```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

### 3. `react-best-practices` — recommended for React quality/performance
Source: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices

Purpose: avoid unnecessary re-renders, oversized bundles, and poor React patterns while implementing shared UI.

Suggested install command:
```bash
npx skills add vercel-labs/agent-skills --skill react-best-practices
```

## Skill installation rules
- Check whether each skill is already installed before adding it.
- Review the source repository and skill instructions before installation.
- Use the agent's supported installation method and project-local scope where possible.
- Do not use `-g`/global installation unless necessary and approved.
- If `npx skills` is not available, report that and offer the exact source URL and alternative procedure instead of guessing.
- Do not install unrelated skills.
- Record installed skill names, versions/commit if available, and locations in the phase report.

## Official design reference
Apple Human Interface Guidelines — Materials / Liquid Glass:
https://developer.apple.com/design/human-interface-guidelines/materials

Use this as a design reference. It explains Liquid Glass as a functional layer for navigation and controls, while normal content should remain clear. The project is a web/PWA/Capacitor UI, so implement a compatible approximation rather than claiming to reproduce Apple's native material exactly.

## Tools and dependencies
Inspect the existing repository first. Add only what is actually needed:
- Existing React/TypeScript/Vite stack should be reused.
- CSS variables and modern CSS should be preferred for design tokens and glass-like materials.
- `lucide-react` is a candidate only if a consistent icon library is missing.
- A motion library is optional; prefer CSS transitions for simple transitions and avoid adding animation packages unless the UI truly needs them.
- Do not add Tailwind, a component kit, icon packs, animation packages, or a second styling system if the project already has a suitable solution.
- No paid design tools are required by this specification.
- Do not download a third-party “Liquid Glass package” without auditing maintenance, license, security, compatibility, and actual value. The effect should primarily be implemented with small, maintainable CSS styles.
- Do not install a font package; use the system font stack.
- Do not add external image/font dependencies that impair offline operation.

## Required installation report
Before/after installation, report:
- tool/skill name;
- official source;
- exact command;
- why needed;
- existing or newly installed;
- files changed;
- license/compatibility notes;
- any failure or skipped item.
