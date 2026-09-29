# Print Studio

A web front end for [local_printer_api](https://github.com/jhgrzybowski/local_printer_api): one place on the home LAN to sign in, drop a file, see exactly what will print, set the output, print, and follow the job to the end.

The look is one quiet plane: no cards or nested panes, structure from space and hairlines, soft neumorphic depth only on the paper and the keys, and a single liquid-metal object, the print key. Controls are minimal icons with tooltips. It has light and dark themes and five accent palettes (Cobalt, Iris, Jade, Ember, Graphite).

## What it does

It covers every endpoint that `local_printer_api` serves:

| Area | In the app | API |
| --- | --- | --- |
| Auth | Sign in, create an account, session restore, sign out | `POST /auth/signup`, `/auth/login`, `/auth/logout`, `GET /auth/me` |
| Printer | A status dot and one word in the sidebar and dock, details in Settings | `GET /status`, `/health`, `/options`, `/capabilities` |
| Upload | Drop, paste, or browse. Shows upload progress and the Office→PDF conversion wait, and retries automatically on 503 | `POST /files` |
| Preview | Real page renders on a sheet sized to the chosen paper and orientation. A thumbnail rail lets you include or exclude pages, and B&W, copies and fit to page show on the sheet | `GET /files/{id}`, `/files/{id}/preview`, `/files/{id}/preview/{page}`, `/files/{id}/pdf` |
| Options | Copies, pages, paper, orientation, color, two-sided, quality, paper type, and fit to page. The choices come from the printer at runtime | `GET /options` |
| Check | A dry run on every change, showing sheet count, warnings, and unsupported options | `POST /print/validate` |
| Print | Chrome print key (also Ctrl/⌘+Enter), then a slim job line above the dock (Sent, Queued, Printing, Done) | `POST /print`, `GET /jobs/{id}` |
| Jobs | Cancel an active job, or clear a finished one from the queue | `DELETE /jobs/{id}`, `POST /jobs/{id}/forget`, `GET /jobs?scope=all` |
| History | Sidebar grouped by day, with search and infinite scroll. The detail view has a read-only preview and a "Print again" action | `GET /history`, `/history/{id}` |
| Preferences | Saved print defaults, stored per user | `GET/PUT /me/preferences` |

## Run it

The backend must already be running at `http://192.168.100.99:8000`.

### Production (Docker, port 80)

```bash
docker compose up -d --build
```

This serves the app at http://192.168.100.99/. nginx in the container serves the static build and proxies `/api/` to the backend. That keeps the session cookie same-origin, so no CORS setup is needed. To point at a different backend, set `PRINTER_API_UPSTREAM` (for example `http://local-printer-api:8000` on a shared Docker network).

The port binds to the LAN address only. Don't expose it, or the API, to the internet.

### Development

```bash
npm install
npm run dev
```

Open http://192.168.100.99:5173, not `localhost`: the session cookie isn't sent cross-site, so auth would fail. Vite proxies `/api` to the backend. Use `PRINTER_API_TARGET` to override the target.

### Checks

```bash
npm run check
```

This runs the unit tests for page ranges and the print-settings model (`node --test`). The Docker build runs them too, before building.

## Layout

```
src/
  api/client.js        fetch wrapper, XHR upload with progress, 401 handling
  hooks/               session, printer status, options, history + job polling, preferences, appearance, print flow
  lib/                 page ranges, settings model, printer status interpretation, formatting
  components/          Sidebar, DropZone, PreviewStage, Dock, Inspector, HistoryDetail, SettingsView, AuthScreen, PrinterStatus, controls, glyphs
  styles/              tokens (OKLCH palettes, elevation, metal), base, controls, shell, work, pages
deploy/nginx.conf.template
Dockerfile, docker-compose.yml
```

## Current state

Version 0.2.0 is a full redesign of the interface. The functionality is the same as 0.1.0.

The screens:
- **Canvas:** the preview, with a floating dock (attach, file and state, print key) under it.
- **Inspector:** output settings beside the preview, with one-word labels and icon controls.
- **Settings:** a single column.

Verified:
- The production build and unit tests.
- A check in Chrome of the empty, loaded and settings views, the menus and the narrow-width drawer, in both themes, at desktop, tablet and phone widths.

Not yet done:
- **A real printed page.** The print and job-tracking flow was exercised only up to validation.
- **History detail and sign-in in a browser.** The test account had no history, and the sign-in screen was not opened because that would mean signing out and back in.
- **Code splitting.** The JS bundle is about 170 kB gzipped.

Design notes are in [DESIGN.md](DESIGN.md); product context is in [PRODUCT.md](PRODUCT.md).
