# 0006. Testing approach

Status: draft, awaiting owner review

## Context

The project needs tests that give real confidence in the form, without turning into a testing project of its own. The main behaviour is the dependent dropdowns, the quick-select buttons, and the logbook upload from the page to the server. The question is which test runner to use, and which levels of testing to include.

Facts that shaped the choice:

- The client is built with Vite, the server is Express, and the code lives in npm workspaces ([0001](0001-repo-structure.md), [0002](0002-server-framework.md)).
- Form state is a reducer ([0005](0005-form-state.md)), which already commits the project to reducer unit tests for the rules and a few rendered tests for the wiring.
- The page and the server talk over the network, and the upload is not JSON, so the shared schemas ([0003](0003-shared-types-and-validation.md)) do not cover it.
- Unit, rendered (against a fake server) and server route tests each cover one side of that link, so none shows the two sides agree.

The owner's standard for this project is a realistic system that is not heavy, with tests that include one across the page-to-server link. That is the owner's standard, not a requirement of the task.

## Options considered

### Option 1: Vitest only, no test across the link

Reducer tests, rendered tests with a fake server, and server route tests, all run by Vitest.

Pros:
- One runner, with one config shared with the Vite client.
- Fast, with a watch mode.
- Works with TypeScript and ESM across the workspaces without extra transforms.

Cons:
- The upload could break while every test passes, because nothing runs the page against the real server.

### Option 2: Vitest plus one Playwright end-to-end test

Everything in Option 1, plus one test that opens the real app in a real browser, fills the form and uploads a logbook.

Pros:
- One test proves the whole app works in a real browser: the form, the server and the upload.
- Fits a CI pipeline with an automated end-to-end check.

Cons:
- Needs a browser install and slows CI.
- Browser tests can be flaky and are slower to debug.
- A second tool to explain.

### Option 3: Jest only, no test across the link

The same tests as Option 1, run by Jest.

Pros:
- The most widely known runner, with many examples.

Cons:
- Needs its own TypeScript and ESM transform config next to Vite.
- The upload could break while every test passes.

### Option 4: Vitest plus one integration test against the real server

Everything in Option 1, plus one test that renders the page in a test environment against the real Express app started in the same process.

Pros:
- Covers the link between page and server, including the real upload code.
- No browser to install, and it runs fast in the same runner.
- One runner, as in Option 1.

Cons:
- Not a real browser: file and form handling in the test environment differ, so browser-only bugs can slip through.
- Starting a real server inside a test needs port and cleanup handling.

## Decision

Option 2: Vitest for the unit, rendered and server tests, plus one Playwright end-to-end test of the main flow.

Two reasons decided it:

- A real system would have an end-to-end test of its main flow, and this project aims to be realistic.
- The link between the page and the server, especially the file upload, is the part that unit, rendered and server tests cannot show working, because each covers only one side.

The strongest alternative is Option 4, which covers the same link without a second tool or a browser, and is the fallback if browser tests prove flaky or slow in CI.

## Consequences

- Vitest runs in all workspaces: reducer tests for the rules, a few rendered tests for the wiring, and server route tests with supertest.
- There is one Playwright test of the main flow: pick a vehicle, upload a sample logbook, and see the response on the page. It is the only end-to-end test, so more can be added only for flows that must never break.
- The test runs against the production build, where Express serves the built client on one port ([0010](0010-how-reviewers-run-it.md), [0015](0015-client-build-tool.md)), so the test setup starts that one process.
- CI installs a browser and runs the end-to-end test in its own job ([0021](0021-ci.md)), so it does not delay the faster checks.
- Browser tests can be flaky. If that happens, the test is fixed or moved down to an integration test (Option 4) rather than left failing or ignored.
- There are two tools to explain in the walkthrough: Vitest and Playwright.
