---
version: alpha
name: Zisify Design System
description: Design system for Zisify — a SaaS platform connecting clients, intermediaries, and providers. Inspired by syzygy (the astronomical alignment of three celestial bodies). Dark-first, magenta-led, premium and purposeful.
colors:
  primary: "#C30364"
  primary-hover: "#E8368A"
  primary-active: "#A30254"
  primary-subtle: "#FFF0F7"
  primary-disabled: "#FFA8D4"
  primary-glow: "#C30364"
  secondary: "#1A0A2E"
  secondary-raised: "#221638"
  secondary-card: "#221638"
  secondary-border: "#31204F"
  secondary-border-hover: "#432D6A"
  accent: "#5A3D88"
  text-primary-dark: "#FAF8FB"
  text-secondary-dark: "#9D96A8"
  text-placeholder: "#52465E"
  text-primary-light: "#252030"
  text-secondary-light: "#716A7D"
  text-on-brand: "#FFFFFF"
  surface: "#1A0A2E"
  surface-raised: "#221638"
  page-bg: "#0D0518"
  white: "#FFFFFF"
  black: "#0D0518"
  success: "#16A34A"
  warning: "#D97706"
  error: "#DC2626"
  info: "#2563EB"
typography:
  h1:
    fontFamily: Inknut Antiqua
    fontSize: 60px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: Inknut Antiqua
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.01em
  h3:
    fontFamily: Inknut Antiqua
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  h4:
    fontFamily: Inknut Antiqua
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
  body-lg:
    fontFamily: Epilogue
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: Epilogue
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
  body-sm:
    fontFamily: Epilogue
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  label-lg:
    fontFamily: Epilogue
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.2
  label-md:
    fontFamily: Epilogue
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
  label-sm:
    fontFamily: Epilogue
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.02em
  caption:
    fontFamily: Epilogue
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  full: 9999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
  20: 80px
  24: 96px
  gutter: 24px
  margin: 32px
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, {colors.primary} 0%, {colors.primary-hover} 100%)"
    textColor: "{colors.text-on-brand}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    padding: 12px 24px
  button-primary-hover:
    backgroundColor: "linear-gradient(135deg, {colors.primary-hover} 0%, #FF6DB5 100%)"
    textColor: "{colors.text-on-brand}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    padding: 12px 24px
  button-secondary-hover:
    backgroundColor: "linear-gradient(135deg, rgba(195,3,100,0.08) 0%, rgba(232,54,138,0.08) 100%)"
  button-inverted:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 12px 24px
  button-inverted-hover:
    backgroundColor: "{colors.primary-subtle}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    typography: "{typography.body-md}"
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary-dark}"
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
  card:
    backgroundColor: "linear-gradient(145deg, {colors.secondary-card} 0%, {colors.secondary} 100%)"
    rounded: "{rounded.xl}"
    padding: 24px
  card-hover:
    backgroundColor: "linear-gradient(145deg, {colors.secondary-raised} 0%, {colors.secondary-card} 100%)"
  navbar:
    backgroundColor: "rgba(26, 10, 46, 0.80)"
  badge-level:
    backgroundColor: "linear-gradient(135deg, {colors.primary} 0%, {colors.accent} 100%)"
    textColor: "{colors.text-on-brand}"
    rounded: "{rounded.full}"
    typography: "{typography.label-sm}"
  progress-bar-fill:
    backgroundColor: "linear-gradient(90deg, {colors.primary} 0%, {colors.primary-hover} 100%)"
  progress-bar-track:
    backgroundColor: "{colors.secondary-border}"
    rounded: "{rounded.full}"
---

## Overview

Zisify is a dark-first SaaS platform whose visual identity is anchored in the concept of **syzygy** — the perfect astronomical alignment of three bodies. The UI must evoke precision, depth, and premium energy. Every design decision should reinforce the idea that Zisify is the exact point where clients, the platform, and providers converge.

The dominant aesthetic is **dark cosmic premium**: deep navy/violet backgrounds, a single magenta accent that commands attention, and generous negative space that lets content breathe. The brand is rooted in Huancayo, Peru — local, confident, and building outward.

Emotional targets: trust, momentum, clarity. Never cold or sterile — always warm in the sense of purposeful energy.

## Colors

The palette is built around two foundational colors and their derived scales.

- **Primary (#C30364):** Magenta Zisify. The sole driver for all interactive and brand elements. CTAs, active states, progress fills, badges, links. Used as a gradient from #C30364 to #E8368A on buttons and interactive elements.
- **Secondary (#1A0A2E):** Azul Noche. The foundation for all dark surfaces, backgrounds, and cards. Deep violet-navy that reads as premium dark without being flat black.
- **Accent (#5A3D88):** Mid-violet. Used in gradients alongside primary for gamification elements and decorative highlights. Never used alone as a CTA.
- **Neutrals:** All text and border colors carry a subtle violet undertone to stay harmonious with the dark background system. Never use pure gray.
- **Semantic colors:** Success #16A34A, Warning #D97706, Error #DC2626, Info #2563EB. These are functional-only and never used decoratively.

## Typography

Two Google Fonts define the Zisify voice.

- **Inknut Antiqua:** Used exclusively for H1–H4. Carries historical weight and distinctiveness — it grounds the brand in something meaningful, not generic. It creates immediate contrast with modern UI elements and makes the brand memorable.
- **Epilogue:** Used for all body text, labels, captions, button text, inputs, and any UI copy. Clean, highly legible, modern. Handles all sizes without losing personality.

Never use system fonts, Inter, or Roboto in any Zisify interface.

## Layout

The layout follows a **fluid-to-fixed** model: fluid on mobile, max-width 1280px on desktop, centered with 32px horizontal margins. Internal section padding is 80px vertical on desktop, 48px on mobile.

An 8px base grid governs all spacing. Cards use 24px internal padding. Section separators use a 1px gradient line: transparent → #C30364 → transparent.

The hero section always uses a full-viewport background (image or gradient), a multi-layer overlay ending in solid #0D0518 at the bottom, and content centered vertically in the top 70% of the viewport.

## Elevation & Depth

Depth is communicated through **tonal layering and brand-colored glows**, not heavy drop shadows.

- Page background: #0D0518
- Surface (cards, panels): linear-gradient(145deg, #221638, #1A0A2E)
- Raised surface (dropdowns, tooltips): #221638
- Hover state elevation: brighter gradient + box-shadow: 0 8px 24px rgba(26,10,46,0.16)
- Brand glow (primary buttons on hover): box-shadow: 0 4px 20px rgba(195,3,100,0.40)
- Modal overlay: rgba(13,5,24,0.85) with backdrop-filter blur(8px)
- Navbar: rgba(26,10,46,0.80) with backdrop-filter blur(12px) and 1px border-bottom #31204F

## Shapes

The shape language is **modern rounded** — soft enough to feel approachable, structured enough to feel professional. Corner radii are consistent across component types:

- Badges, chips, tags: 4px or full pill (9999px)
- Inputs and small buttons: 8px
- Primary buttons: 12px
- Cards and panels: 16px
- Modals and large surfaces: 24px
- Avatars and toggles: 9999px (full circle/pill)

Never mix sharp (0px) corners with rounded components in the same view.

## Components

### Buttons

**Primary:** Gradient background linear-gradient(135deg, #C30364, #E8368A). White text. 12px radius. On hover: lighter gradient + brand glow shadow. On active: #A30254, scale 0.98. On disabled: #FFA8D4 background, cursor not-allowed.

**Secondary (Outlined):** Transparent background, 1.5px solid #C30364 border, #C30364 text. On hover: subtle magenta fill rgba(195,3,100,0.08).

**Inverted:** White background, #C30364 text. On hover: #FFF0F7 background. Used on dark hero sections where the gradient button needs a visual counterpart.

### Inputs

Dark surface background (#1A0A2E), 1.5px border #31204F at rest. On focus: border becomes #C30364, ring 2px offset rgba(195,3,100,0.3). Error state: border #DC2626, helper text below in Epilogue 12px error color. Placeholder text #52465E.

### Cards

Gradient surface background. 1px border #31204F at rest. On hover: border upgrades to #432D6A, shadow increases. Transition 200ms ease on all properties. Internal padding 24px. 16px border radius.

### Navbar

Sticky. Background rgba(26,10,46,0.80) with backdrop-filter blur(12px). Bottom border 1px solid #31204F. Logo left, nav links center or right, CTA button rightmost. Nav links in Epilogue label-md, color #9D96A8, hover color #FAF8FB.

### Progress Bars (Gamification)

Track: #31204F, full pill radius. Fill: linear-gradient(90deg, #C30364, #E8368A). Height 6px for compact, 10px for featured. Animated fill on mount.

### Badges / Level Indicators

Gradient background linear-gradient(135deg, #C30364, #5A3D88). White text. Epilogue label-sm. Full pill shape. Used for gamification levels: Satélite, Planeta, Estrella, Gigante, Nova.

## Do's and Don'ts

- Do use #C30364 only for the primary action or brand emphasis — never as a background for large surfaces
- Do apply the brand glow shadow exclusively on primary interactive elements on hover
- Don't use pure black (#000000) or pure gray anywhere — all darks must come from the night scale
- Don't use Inknut Antiqua below H4 size — it breaks readability at small sizes
- Do maintain WCAG AA contrast: white text on #C30364 passes at ~4.8:1, use it freely on buttons
- Don't use magenta text on the night background — contrast is insufficient; use magenta-300 (#FF6DB5) minimum for text on dark surfaces
- Do use gradient separators (transparent → #C30364 → transparent, 1px height) between major page sections
- Don't mix outlined and filled buttons in the same action group — pick one style per context
- Do animate progress bars and level badges on first render — motion signals life in the gamification system
- Don't add more than two font weights visible simultaneously in a single UI section