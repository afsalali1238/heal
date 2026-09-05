# Unified Design System

## Audience

Patients may be older, in pain, using one hand, on a small screen, or reading English as a second language. The UI must feel calm, obvious, and trustworthy rather than technical.

## Foundations

- Base text: 17px with a real fallback stack.
- Minimum interactive target: 44px.
- Content width: readable measure; map may use the full viewport.
- Light and dark themes are designed independently, not inverted blindly.
- Use logical CSS properties for RTL readiness.
- Never communicate meaning by color alone.

## Typography

Use Archivo for headings, Source Sans 3 for body copy, and IBM Plex Mono for dosage values and technical metadata. Every font has a system fallback. Text scale multiplies all UI type through a `--scale` custom property.

## Color semantics

Use a restrained neutral surface, one primary action color, one selection color, and a dedicated warning color. Warning styling always includes a heading and text, not color alone. Avoid gradients and decorative clinical imagery.

## Layout

Home cards are large, whole-card targets. Section pages use head-to-toe area ordering. Area pages stack complete cards. The locator keeps map, controls, and semantic list visibly related at mobile widths.

## Exercise card

Image 4:3; number/type; name; bordered dosage cells; labelled instruction steps; target-muscle line; persistent safety line; local completion control. Cards use stable IDs and `scroll-margin-top` for deep links.

## Locator

The map is an orientation tool, not a game. Selected regions receive outline, tint, label, and a text announcement. Front/back state is explicit. Semantic region buttons remain available beside or below the visual map.

## Accessibility

Skip link, landmarks, visible focus, keyboard-complete flow, screen-reader announcements, reduced-motion support, 200% zoom, no tiny hotspots, and an immediate simple-map fallback.

## Print

Hide navigation, controls, completion buttons, and interactive map chrome. Force black-on-white, avoid card splits, print disclaimer and source URL, and retain image alt/context.

## Motion

Updated 2026-09-05 (`docs/IMPROVEMENTS-2026-09-05.md`). The standing rule is still **almost none**: no page
transitions, no carousels, no motion that competes with a dosage number. What is allowed, in `src/styles/motion.css`:

- **State feedback** — hover lift, press, focus-ring fade. ≤220 ms.
- **Orientation** — one-shot entrances on card groups, implemented with scroll-driven CSS inside
  `@supports (animation-timeline: view())`. No JavaScript ships for it, and there is no `opacity: 0` base
  state, because an unsupported browser must show the finished page rather than a blank one.
- **The pacer** — the movement guide's glyph and countdown ring. The only animation that carries information,
  and it starts only on an explicit press.

Everything motion says, text also says. `prefers-reduced-motion` removes the animation, never the information.
Concretely, in the one place motion carries information: the countdown ring is not slowed down but removed, and
the rail under the guide head becomes the progress display — fed by the same per-second tick, with every number
in its usual place. Nothing is stored to make motion work: the guide holds its counts in the page and loses them
on close.
