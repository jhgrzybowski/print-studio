# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 and Vite in plain JavaScript (JSX). Motion (`motion/react`) handles animation, Radix handles accessible primitives (menu, select, tooltip), and lucide provides the base icons, with a few custom glyphs drawn to match. The static build is served by an nginx container on `192.168.100.99:80`, which proxies `/api/` to the backend on `:8000`.

## Users

Everyone in one household, on any device on the home network. Each person has their own account, history and saved defaults. Most sessions are short: open, drop a file, check it, print, leave.

## Product Purpose

Print one file to the Canon PIXMA MG5350 without guessing. Before printing, the user should know the printer is on, the file was accepted, and the settings will work. After printing, they should know the job finished.

## Operating Context

- **Backend.** `local_printer_api` runs at `http://192.168.100.99:8000`. It is LAN only and must never be exposed to the internet.
- **Auth.**
  - Open signup with username and password.
  - An HttpOnly session cookie lasts 30 days.
  - Every record is scoped to its user.
- **Files.**
  - Printed as-is: PDF, PNG, JPEG and TXT.
  - Converted to PDF on upload, taking 2 to 4 seconds (503 while the converter is busy): DOCX, XLSX, PPTX, ODT, ODS and ODP.
  - Uploads are capped at 50 MB and expire after 7 days. History entries expire after 90 days.
- **Options.**
  - Options come from `GET /options` at runtime: paper size, orientation (including the flipped variants), color, two-sided, quality, paper type and fit to page.
  - Every change is dry-run through `/print/validate`.
- **Printer off.** When the printer is off, `/status` and `/print` answer slowly and `/print` returns 503.

## Capabilities

- Sign up, sign in, restore the session, and sign out.
- Upload with a progress bar, wait while the file converts, and retry automatically on 503.
- Page previews and a PDF download.
- Settings: copies, page range and print options, all checked by a dry run.
- Print, then track the job live. Cancel an active job, or clear a finished one from the queue.
- Browse and search history, and reprint any upload that hasn't expired.
- Per-user print defaults stored on the server. Theme and accent are stored per browser.

## Brand Commitments

These come from the user:

- **Name.** Print Studio.
- **Material.** Soft neumorphic surfaces with liquid-metal detail, light and dark themes, and a changeable accent palette.
- **Composition.**
  - A history sidebar on the left, with the profile and settings at its foot.
  - A main workspace for dropping, previewing and setting up a print.
  - The workspace takes cues from AI chat apps, but it is not a copy of one.
- **Feel.** Clean, calm and premium. Motion is subtle, smooth and deliberate.
- **Density.** Few words. Icon-only controls wherever an icon is clear, and every icon has a tooltip and an accessible name. No pane-inside-pane stacking.
- **Bans.**
  - Cream or off-white backgrounds.
  - Italic accent words in headings.
  - Numbered "01 / 02 / 03" section labels.
  - Monospace labels.
  - Pill-shaped buttons.
  - Any design, code or copy borrowed from another app.

## Product Principles

1. **State is always visible, and never loud.** Printer readiness and job progress show as a dot and a short word.
2. **The preview is the truth.** Paper, orientation, color and copies change the sheet on screen, and the dry run confirms it.
3. **One surface.** The workspace is a single plane. Structure comes from space and alignment, not boxes.
4. **Quiet failures with a way out.** Each error says what happened and what to do next, in one sentence.

## Accessibility

- Fully keyboard operable, with visible focus.
- Every icon button has an `aria-label` and a tooltip.
- Status is never shown by color alone.
- Reduced motion is respected.
- Works down to 360 px wide.
