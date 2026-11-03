# Architecture decision records

One record per decision, with the options considered, the choice, and its consequences. All records are accepted, or superseded by a later one. Smaller choices, such as the package manager, the Node version, styling and lint tooling, are listed in the README's technical choices section.

## Key decisions

| # | Decision | Outcome |
|---|---|---|
| [0001](0001-repo-structure.md) | Repo structure | One repo with npm workspaces: `client`, `server`, `shared` |
| [0002](0002-server-framework.md) | Server framework | Express 5 |
| [0003](0003-shared-types-and-validation.md) | Shared types and validation | Shared `zod` schemas, with types inferred |
| [0004](0004-api-shape-for-dropdown-options.md) | API shape for the dropdown options | Cascading requests: makes, models per make, badges per model |
| [0007](0007-result-page-and-saved-results.md) | Where the result is shown | A separate result page, with nothing stored |
| [0008](0008-upload-handling.md) | Upload handling | multer with memory storage, a 3 MB cap, any valid UTF-8 text |
| [0009](0009-api-error-handling.md) | API error handling and response shape | One error body with a code, a message and an optional field, from one central handler |
| [0010](0010-how-reviewers-run-it.md) | How reviewers run the project | Docker only, with `docker compose up`. Superseded by 0027 |
| [0027](0027-two-ways-to-run-it.md) | Two ways to run the project | `npm install` then `npm start`, or `docker compose up` |
| [0011](0011-where-validation-happens.md) | Where validation happens | The server checks everything, with light checks in the client |
| [0012](0012-vehicle-data.md) | Vehicle data | A JSON file read and validated at startup, kept in memory |
| [0014](0014-security-hardening.md) | Security hardening | Security headers, no cross-origin access, a non-root container, per-visitor rate limiting |

## Supporting choices

| # | Decision | Outcome |
|---|---|---|
| [0005](0005-form-state.md) | Form state in the client | One reducer for the whole form |
| [0006](0006-testing-approach.md) | Testing approach | Vitest, plus one Playwright end-to-end test |
| [0015](0015-client-build-tool.md) | Client build tool | Vite |
| [0016](0016-client-routing.md) | Client routing | React Router with normal addresses |
| [0021](0021-ci.md) | Continuous integration | GitHub Actions with three jobs: checks, end-to-end, Docker |
| [0024](0024-logging.md) | Logging | pino, with redaction |
| [0026](0026-accessibility.md) | Accessibility | The basics on native controls, with an automated check |
