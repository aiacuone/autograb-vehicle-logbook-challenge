# Vehicle logbook

A React and TypeScript form to pick a vehicle and upload its service logbook, backed by an Express server.

## Run it

You need Node 24 (see `.nvmrc`). The server serves the built client, so the whole app is one process on one port.

```
npm install
npm start
```

Then open http://localhost:3000. `npm start` builds every package and starts the server.

- The line `../.env not found. Continuing without it.` is harmless. The settings are optional.
- If port 3000 is already in use, the server says so and exits. Stop the other program, or choose another port with `PORT=3001 npm start`. In Windows PowerShell, use `$env:PORT=3001; npm start`. For Docker, change the left side of `'3000:3000'` in `compose.yaml`.

If you have Docker instead:

```
docker compose up
```

Then open http://localhost:3000. The image uses Node 24, runs as a non-root user and has a health check.

### Try it

1. Pick a make, a model and a badge, or use one of the two quick-select buttons.
2. Upload [sample-logbook.txt](sample-logbook.txt). The file picker offers `.txt`, `.log` and plain text files. The server accepts any non-empty UTF-8 text up to 3 MB, whatever the file is called.
3. The result page shows the make, model, badge and the logbook text.

### Develop and test

| Command | What it does |
|---|---|
| `npm run dev` | Express and Vite side by side, with reloading |
| `npm run check` | Lint, build and the unit tests |
| `npm run typecheck` | Type-check every package |
| `npm run test:e2e` | The Playwright test of the main flow against the built app (run `npx playwright install --with-deps chromium` once on Linux, or `npx playwright install chromium` elsewhere) |

Server settings are optional and listed in [.env.example](.env.example). Copy it to `.env` to change them. CI runs on every push and pull request with three jobs: the checks, the end-to-end test, and a Docker build with a smoke request ([0021](docs/adr/0021-ci.md)).

## How it works

- `shared/` holds the zod schemas and types that both sides use.
- `server/` is Express 5. It serves the dropdown options (`/api/makes`, models per make, badges per model) and takes the upload at `POST /api/logbooks`. The server checks everything; the client only does light checks for quick feedback ([0011](docs/adr/0011-where-validation-happens.md)).
- `client/` is React and TypeScript built with Vite. One reducer holds the form state and clears the dependent dropdowns when the make or model changes ([0005](docs/adr/0005-form-state.md)).
- The decisions are in [docs/adr](docs/adr/README.md), one record each with the options considered.

## Trade-offs

- **Nothing is stored.** The upload is read into memory, checked and returned. This keeps the server simple and avoids storing users' files, but results are lost on reload ([0007](docs/adr/0007-result-page-and-saved-results.md)).
- **Vehicle data is a JSON file in memory.** It is validated at startup and needs no database, but changing it needs a deploy ([0012](docs/adr/0012-vehicle-data.md)).
- **The server judges uploads by content, not name.** Any valid UTF-8 text up to 3 MB is accepted, because file names and type labels come from the client. The file picker still suggests `.txt` and `.log` for convenience, but it is not a check. Empty files, control characters and other encodings, such as UTF-16, are rejected ([0008](docs/adr/0008-upload-handling.md)).
- **Rate limiting is per visitor and in memory.** It protects the upload route on one server but resets on restart ([0014](docs/adr/0014-security-hardening.md)).
- **Accessibility is the basics plus an automated check.** It uses native controls and axe in the end-to-end test, with no manual screen reader session ([0026](docs/adr/0026-accessibility.md)).
- **One end-to-end test.** It covers the main flow only, and the logic is covered by unit tests ([0006](docs/adr/0006-testing-approach.md)).
- **Two ways to run it.** Node alone is enough, and Docker is the pinned alternative. That is a longer README and a Docker route that could quietly break, so CI runs it on every push ([0027](docs/adr/0027-two-ways-to-run-it.md)).

## Technical choices

The larger decisions have their own records, listed in [docs/adr](docs/adr/README.md). These smaller choices are recorded here.

| Choice | What was chosen | Why |
|---|---|---|
| Package manager | npm workspaces | Follows the repo structure in [0001](docs/adr/0001-repo-structure.md) and needs no extra tool |
| Library versions | Express 5 and multer 2 | The current major versions of the libraries chosen in [0002](docs/adr/0002-server-framework.md) and [0008](docs/adr/0008-upload-handling.md) |
| Commit trailer | No co-author trailer on commits | The owner's choice |
| Database | None. The vehicle data is a JSON file kept in memory ([0012](docs/adr/0012-vehicle-data.md)) | PostgreSQL is a next step |
| Node version | Node 24, pinned in the Dockerfile, in CI and in `.nvmrc` | Node 26 became long-term support only days before the decision, so its libraries have had little time on it. Node 24 also matches the development machine |
| Data fetching | Plain `fetch` with `AbortController` in one small hook, with no query library | Caching would help only a little here and can be added without a library. No new dependency, and the hook is small and tested |
| Styling | Plain CSS in one stylesheet | Nothing to install or configure, and the task puts function ahead of looks |
| Lint and format | ESLint with the TypeScript and React hooks rules, and Prettier | The standard setup reviewers know, and it catches the most mistakes |
| Quick-select vehicles | Two buttons, Ford Ranger Raptor and Tesla Model 3 Long Range, as a shared constant checked against the data by a test | Defining them in the data file needs an extra API call, and usage-based buttons are difficult to test |
| Make display names | A small map in `shared/`: ford to Ford, bmw to BMW, tesla to Tesla | Keeps the data file exactly as supplied |
| Configuration | One module reads the environment once at startup and validates it with `zod`, with a `.env.example` file. The settings are the port, the log level, the proxy count, and the rate limit window and maximum | A bad value stops the server with a clear message, and it reuses `zod` with no new dependency |

## Next steps

With more time:

- Persist uploads. Nothing from an upload is stored today.
- Keep the rate-limit counters in a shared store if the app ever runs as several copies.
- Set the trusted-proxy variable when deploying behind a proxy.
- Run a manual screen reader session on the form.
- Move the vehicle data to PostgreSQL if it needs to change without a deploy.
- Plan for the client and server being deployed separately, which could leave them on different versions.
