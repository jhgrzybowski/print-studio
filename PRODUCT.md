# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 and Vite in plain JavaScript (JSX). Motion (`motion/react`) handles animation, Radix handles accessible primitives (menu, select, tooltip), and lucide provides the base icons, with a few custom glyphs drawn to match. The static build is served by an nginx container on `192.168.100.99:80`, which proxies `/api/` to the backend on `:8000`.

## Users

Everyone in one household, on any device on the home network. Each person has their own account, history and saved defaults. Most sessions are short: open, drop a file, check it, print, leave. Many of them start on a phone, with a file that just arrived in a chat or a mail, so printing from a phone must be as quick as from a desk.

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
- Page previews and a PDF download. Text files preview as monospace text.
- Settings: copies, page range and print options, all checked by a dry run. Pages can be skipped by toggling their thumbnails, and a range that doesn't fit the file is flagged before printing.
- On phones and narrow tablets, a print dock (settings summary plus a large Print button) and a settings sheet that can be swiped away.
- Print, then track the job live in a job chip. Cancel an active job, or clear a finished one from the queue.
- Browse and search history, and reprint any upload that hasn't expired.
- Per-user print defaults stored on the server. Theme and accent are stored per browser.

## Brand Commitments

These come from the user:

- **Name.** Print Studio.
- **Material.** A modern liquid-metal printing studio: polished chrome on a graphite desk (a cool steel grey in light mode), light and dark themes, and a changeable accent palette.
- **Composition.** It should feel like a studio app.
  - A print-history sidebar on the left, with the printer status and profile at its foot.
  - A main pane with the print preview.
  - A toolbar of printing preferences above the preview.
  - Phones keep the same order: a top bar, the preview, and a print dock at the bottom.
- **Type.** A distinctive typeface: Funnel Display for titles and the wordmark, Funnel Sans for everything else.
- **Identity.** A chrome drop as the brand mark, a designed sign-in screen, and an initials avatar in a chrome bezel as the account icon.
- **Feel.** Clean, calm and premium. Motion is refined, subtle, smooth and deliberate.
- **Components.** Minimal components and icons.
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
5. **Phone printing is first-class.** On a phone, the path from file to print is two taps, Print is always within thumb reach, and every setting is one tap away in the sheet.

## Accessibility

- Fully keyboard operable, with visible focus.
- Every icon button has an `aria-label` and a tooltip.
- Status is never shown by color alone.
- Reduced motion is respected.
- Works down to 360 px wide.
- On touch screens, tap targets are at least 40 px, and the dock and sheet respect the device safe areas.
