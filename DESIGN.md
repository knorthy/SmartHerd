---
name: SmartHerd
description: Scale-free goat weight estimation for Filipino goat cooperatives — formal, minimalist, measured.
colors:
  paper: "#F2F5F3"
  surface: "#FFFFFF"
  surface-2: "#E8EEEA"
  ink: "#111614"
  ink-2: "#4A5651"
  rule: "#D9E4DE"
  green: "#0F5C45"
  on-green: "#FFFFFF"
  green-pressed: "#0B4634"
  green-tint: "#E7EFEA"
  hero: "#0F5C45"
  on-hero: "#FFFFFF"
  ochre: "#8A5710"
  ochre-tint: "#F6EBD3"
  error: "#A3302A"
  inverse-accent: "#7FD3AF"
  dark-paper: "#0A0E0C"
  dark-surface: "#141B18"
  dark-surface-2: "#1D2621"
  dark-ink: "#E6ECE8"
  dark-ink-2: "#9DABA4"
  dark-green: "#5CC29A"
  dark-on-green: "#06120D"
  dark-hero: "#123B2E"
  dark-on-hero: "#E6F3EC"
  dark-ochre: "#E2AA4E"
typography:
  display:
    fontFamily: "system-ui (Roboto on Android, SF Pro on iOS)"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: "60px"
    letterSpacing: "-1.5px"
  title:
    fontFamily: "system-ui"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "38px"
    letterSpacing: "-0.8px"
  heading:
    fontFamily: "system-ui"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.2px"
  body:
    fontFamily: "system-ui"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  meta:
    fontFamily: "system-ui"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "system-ui"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "18px"
rounded:
  sm: "12px"
  md: "18px"
  lg: "26px"
  pill: "26px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.pill}"
    height: "52px"
    padding: "0 24px"
  button-primary-pressed:
    backgroundColor: "{colors.green-pressed}"
  button-tonal:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
    rounded: "{rounded.pill}"
    height: "52px"
  button-danger:
    textColor: "{colors.error}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  hero-panel:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.on-hero}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "52px"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
  ear-tag:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
    width: "56px"
    height: "60px"
  ear-tag-ready:
    backgroundColor: "{colors.ochre}"
    textColor: "{colors.surface}"
---

# Design System: SmartHerd

## Overview

A field instrument for goat cooperatives, styled like a well-made agricultural extension bulletin brought onto a phone: formal, minimalist and quietly modern. The interface is a pale green-grey page holding soft white panels; separation comes from space and tone, never from rules. One deep green does the work of the brand (primary action, selection, measurement), and one ochre is reserved for a single meaning: **this goat is ready to sell**.

The product's own measuring language carries the identity: the goat-and-dimension-line mark, the measuring tape under every goat, dimension lines on the photo figures, the ear-tag badge. Anything new should reach for those before reaching for decoration. Light mode is the default for outdoor use; dark mode is a full second palette, not an inversion.

## Colors

### Primary
- **Bulletin Green** `#0F5C45` (dark `#5CC29A`): primary buttons, selection, links, dimension lines, the tape fill. Text on it uses `on-green`.
- **Hero Green** `#0F5C45` (dark `#123B2E`): only the Sale board summary panel. Darker than primary in dark mode so the panel never glows.

### Secondary
- **Sale Ochre** `#8A5710` (dark `#E2AA4E`) with **Ochre Tint** `#F6EBD3`: exclusively "at or above sale weight" — the ready ear tag, status text, tape fill, sale-weight notch and line. Never decoration.

### Neutral
- **Paper** `#F2F5F3` page ground; **Surface** `#FFFFFF` panels and tiles; **Surface 2** `#E8EEEA` inputs, chips, tracks, empty frames.
- **Ink** `#111614` text; **Ink 2** `#4A5651` secondary text (≥7:1 on paper); **Rule** `#D9E4DE` only as a disabled/track tone.
- **Error** `#A3302A` (dark `#F08074`): validation and destructive text actions.

### Named Rules
- **One ochre meaning.** If it is ochre, it is about sale weight.
- **No divider lines.** Group with panels and spacing; a 1px rule between content is a regression.

## Typography

System faces only (Roboto / SF Pro) — readable outdoors, sized in sp, honoring the OS font scale. Numbers that are measured (kg, cm, days, tags) always use tabular figures.

### Hierarchy
- **Display** 56/60 bold, −1.5 tracking: the Estimated Weight on result and record.
- **Title** 32/38 bold, −0.8: screen titles.
- **Heading** 18/24 semibold: section titles, goat names (17 in tiles).
- **Body** 16/22, **Meta** 14/20, **Label** 13/18 semibold, **Caption** 12/16 italic (figure captions, prototype notes).
- **Tile figure** 30/32 bold for a goat's weight on the Sale board.

## Layout

Single column, max content width 720, 16px side gutters. Tab screens open with a brand line (mark + "SmartHerd" + sync status), then a large title, then panels separated by 32px. Lists use 8px gaps between tiles. Primary actions sit at the bottom in the thumb zone: the centre Weigh action in the tab bar, a pinned footer button on stack screens, a floating "Register goat" on Goats. Content always clears the floating tab bar (`useTabBarSpace`).

## Elevation & Depth

Light mode: panels and tiles carry a whisper shadow `0 1px 2px rgba(10,30,20,.04), 0 4px 16px rgba(10,30,20,.04)`. Floating chrome (tab bar, register button, snackbar, tour card) uses a stronger lift `0 10px 30px rgba(0,0,0,.14–.28)`. Dark mode relies on surface tone, not shadow.

The tab bar is the one glass surface: frosted blur (iOS/web), near-opaque pane on Android, hairline edge and a bright top sheen.

## Shapes

Radii: 12 (inputs, thumbnails, small tiles), 18 (panels, tiles), 26 (hero panel, pills, buttons, tab bar). Buttons and chips are full pills. The ear tag is the one non-rectangular shape: rounded-top tag with a punched hole.

## Components

### Buttons
Filled green for the single primary action on a screen; tonal (green tint) for secondary; text for quiet actions; danger text for destructive. 52px tall, pressed state darkens and scales to 0.98.

### Chips
Surface-2 pills, 44px (36px small). Selected: green tint with a 1.5px inset green ring.

### Cards / Containers
`Panel` for grouped content under a `Section` title. Goat tiles: surface, ear tag left, name/stage/member/status centre, weight figure right, the **edge tape** full-bleed along the bottom.

### Inputs / Fields
Filled surface-2, no border; error state adds a 1.5px error border and message below. Search is a white pill with a 2px green focus ring.

### Navigation
Floating glass tab bar, five equal slots: Board, Goats, **Weigh** (green circle, centre), Co-op, Profile. A green-tint pill springs to the active tab.

### Signature: the Measuring Tape
`Tape` in three forms: `edge` (5px tile base), `compact` (3px strip), full (graduated kg scale with labelled majors and an ochre sale notch, animated fill on new results). It is the product's visual signature; use it wherever a weight relates to the sale target.

### Signature: Bulletin Figures
Photos on the result plate are set as captioned figures ("Fig. 1 — Side view") with green dimension lines and end ticks in the margins, plus zoom/rotate/pan controls.

### Feedback
Snackbar on ink with an inverse-accent check and action ("Undo", 8s; confirmations 3.5s). Spotlight tour: scrim with a rounded cut-out, pulsing green ring, tooltip card with segmented progress.

## Do's and Don'ts

### Do:
- Say "Estimated Weight", cm and kg, growth stages young / grower / adult.
- Reuse the tape, ear tag, dimension lines and mark before adding new visuals.
- Keep one filled primary action per screen, in thumb reach.
- Label demo data and simulated estimates.

### Don't:
- Draw divider lines between content.
- Use ochre for anything but sale readiness.
- Add gradients, glow, or glass beyond the tab bar.
- Stack cards inside cards, or add eyebrow labels above headings.
- Hard-code colours in screens; use theme tokens so dark mode stays whole.
