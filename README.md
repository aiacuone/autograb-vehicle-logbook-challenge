# Vehicle logbook

A React and TypeScript form to pick a vehicle and upload its service logbook, backed by an Express server.

This README is being written as decisions are made. How to run it, the trade-offs and the next steps are added when the project is built.

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

Collected from the decisions so far:

- Persist uploads. Nothing from an upload is stored today.
- Keep the rate-limit counters in a shared store if the app ever runs as several copies.
- Set the trusted-proxy variable when deploying behind a proxy.
- Run a manual screen reader session on the form.
- Move the vehicle data to PostgreSQL if it needs to change without a deploy.
- Plan for the client and server being deployed separately, which could leave them on different versions.
