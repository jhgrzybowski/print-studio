# Print Studio

A web front end for [local_printer_api](https://github.com/jhgrzybowski/local_printer_api): one place on the home LAN to sign in, drop a file, see exactly what will print, set the output, print, and follow the job to the end.

The look is neumorphic with a few liquid-metal (chrome) details: the print key, the copies `+` key, and the printer gauge. It has light and dark themes and five accent palettes (Cobalt, Iris, Jade, Ember, Graphite).

## What it does

It covers every endpoint that `local_printer_api` serves:

| Area | In the app | API |
| --- | --- | --- |
| Auth | Sign in, create an account, session restore, sign out | `POST /auth/signup`, `/auth/login`, `/auth/logout`, `GET /auth/me` |
| Printer | Live gauge and status in the sidebar, details in Settings | `GET /status`, `/health`, `/options`, `/capabilities` |
| Upload | Drop, paste, or browse. Shows upload progress and the Office→PDF conversion wait, and retries automatically on 503 | `POST /files` |
| Preview | Real page renders on a sheet sized to the chosen paper and orientation. A thumbnail rail lets you include or exclude pages, and a B&W preview is available | `GET /files/{id}`, `/files/{id}/preview`, `/files/{id}/preview/{page}`, `/files/{id}/pdf` |
| Options | Copies, pages, paper, orientation, color, two-sided, quality, paper type, and fit to page. The choices come from the printer at runtime | `GET /options` |
| Check | A dry run on every change, showing sheet count, warnings, and unsupported options | `POST /print/validate` |
| Print | Chrome print key (also Ctrl/⌘+Enter), then a live job tracker (Sent → Queued → Printing → Done) | `POST /print`, `GET /jobs/{id}` |
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
  components/          Sidebar, DropZone, PreviewStage, ToolPane, Composer, HistoryDetail, SettingsView, AuthScreen, controls
  styles/              tokens (OKLCH palettes, elevation, chrome), base, controls, layout, sidebar, compose, views
deploy/nginx.conf.template
Dockerfile, docker-compose.yml
```

## Current state

Version 0.1.0 is the first working version, deployed on this machine at http://192.168.100.99/.

Verified:
- The production build.
- Unit tests.
- The container health check.
- An API smoke test through the nginx proxy: signup, login, me, upload of PDF and TXT, preview pages, PDF download, validate, jobs, history, preferences, logout.

Not yet done:
- **Visual and design check in a browser.** No browser was available on the build machine, so the UI hasn't been reviewed on screen yet: layout at desktop and phone widths, animation feel, and light/dark on each palette.
- **A real printed page.** The print and job-tracking flow was exercised only up to validation, so no paper was used.
- Code splitting. The JS bundle is about 170 kB gzipped.

Design notes are in [DESIGN.md](DESIGN.md); product context is in [PRODUCT.md](PRODUCT.md).
