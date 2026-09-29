# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite, plain JavaScript (JSX, no TypeScript). The user asked for JS and then for the framework that best supports Apple-like visual components. React was chosen for Motion (`motion/react`: spring physics, shared-layout transitions, gestures) and Radix primitives (accessible menus, selects, switches, tooltips skinned in-house). Static build served by an nginx Docker container on `192.168.100.99:80`, which proxies `/api/` to the backend on `:8000`. The host is getting an SSD, and the user values refinement over minimal footprint.

## Users

People on the home LAN who need to print something from any device on the network (phone, laptop, desktop) to the single Canon PIXMA MG5350. Each person has their own account; history and saved settings are per user.

## Product Purpose

A local print station: sign in, drop a file, see exactly what will print, set the output, print, and follow the job until it finishes. Success is printing without guessing whether the printer is ready, the file was accepted, the options are valid, or the job went through.

## Positioning

A front end for one specific printer on one LAN, driven by `local_printer_api`. It shows real page previews, dry-run validation (`/print/validate`) before submission, and live CUPS job state, so the user sees what the printer will do before and after pressing print.

## Operating Context

- Backend: `local_printer_api` at `http://192.168.100.99:8000` (LAN only). Contract: `openapi.yaml` in that repo.
- Auth: open signup, username/password, HttpOnly session cookie (`local_printer_session`, 30 days). All data scoped per user.
- Files: PDF, PNG, JPEG, TXT native; DOCX/XLSX/PPTX/ODT/ODS/ODP converted to PDF on upload (2–4 s, 503 when busy). 50 MB max. Uploads expire after 7 days, history after 90 days.
- Print options come from `GET /options` at runtime (paper sizes are raw PPD names; media types have friendly aliases plain/photo/glossy/matte; quality draft/normal/high; duplex; color; orientation; fit-to-page). Collate is currently unsupported by the queue.
- Printer powered off: `/status` and `/print` take ~1.5 s and `/print` returns 503.
- CUPS hides job name/user; filenames come from upload and history records.

## Capabilities and Constraints

- Auth flow: signup, login, logout, session restore via `/auth/me`.
- Upload with progress, conversion wait, and retry on 503.
- Lazy page previews, full PDF download.
- Print options, page ranges, copies; dry-run validation; submission; strict options by default.
- Jobs: active polling (~5 s only while active), cancel, forget (purge terminal record).
- History list and detail; reprint from history while the upload has not expired.
- Preferences stored server-side as free-form JSON (default print settings, theme, palette).
- Host is modest (i3-6100); keep the app light.

## Brand Commitments

- Name: Print Studio.
- User-pinned look: modern neumorphic surfaces with liquid-metal (chrome) accents, light and dark themes, switchable color palette. References: dark pill composer with a chrome ring send button, soft folder/upload card with glass file chip, light neumorphic stepper with a chrome plus key.
- Composition: left sidebar with print history, profile and settings at its foot; main panel for drop, preview, and print settings (ChatGPT/Cursor-like). Should feel like a well-organised tool panel, not a plain page.
- Motion: subtle, smooth, well placed.
- Bans (from the user): no cream or off-white background, no italic accent words in headings, no numbered "01 / 02 / 03" section labels, no monospace labels, no pill-shaped buttons.

## Evidence on Hand

Live backend, live printer status, and the user's four reference screenshots (in the session, not in the repo). No brand assets or logo exist.

## Product Principles

1. Show state before asking for action: printer readiness, file acceptance, and option validity are always visible.
2. What you see is what prints: the preview and the dry-run result reflect the exact submission.
3. One calm surface: everything for a print fits in one workspace without page changes.
4. Honest failure: offline printer, busy converter, expired upload, and rejected options each get a plain explanation and a next step.

## Accessibility & Inclusion

Keyboard operable throughout, visible focus, labelled icon buttons, state never conveyed by color alone, reduced-motion respected, works on phone widths.
