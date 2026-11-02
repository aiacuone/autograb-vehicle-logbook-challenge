# 0015. Client build tool

Status: draft, awaiting owner review

## Context

The client is a React and TypeScript app, and the task names no build tool. A build tool compiles the client for production and runs a dev server during development. The question is which one to use.

Facts that shaped the choice:

- The server is a separate Express 5 server ([0002](0002-server-framework.md)). In production Express serves the built client on one port, and in development the client's dev server runs beside Express ([0010](0010-how-reviewers-run-it.md)).
- The dev server forwards API requests to Express, which [0014](0014-security-hardening.md) relies on to avoid cross-origin calls in development.
- Tests use Vitest ([0006](0006-testing-approach.md)).
- Next.js was ruled out because it brings its own server, which clashes with the separate Express server. Create React App was ruled out because it is no longer maintained.

## Options considered

### Option 1: Vite

The standard modern tool for a small React and TypeScript app, with a ready template, a fast dev server and a production build.

Pros:
- The dev server forwards API requests to Express with one setting.
- Vitest reads the same configuration, so tests and build agree.
- Fast start and rebuilds.

Cons:
- The dev server and the production build are different tools inside, so they can behave slightly differently.

### Option 2: webpack

The long-established bundler, configured by hand with loaders for TypeScript and CSS, a dev server and the production build.

Pros:
- Very configurable, with a long track record.

Cons:
- A long hand-written configuration to maintain and explain.
- Slower dev feedback.
- Vitest needs a separate configuration.

## Decision

Option 1: Vite.

Two reasons decided it:

- Vitest reads the same configuration, so the tests and the build agree.
- Fast start and rebuilds.

The strongest alternative is Option 2, webpack, which would be the choice only if its extra configuration were needed, and nothing in the task asks for that.

## Consequences

- The client uses the Vite React and TypeScript template. Its configuration forwards API requests to Express in development, and the Vitest configuration is shared with it.
- The production build produces static files that Express serves, as described in [0010](0010-how-reviewers-run-it.md).
- The dev server and the production build can differ slightly, so the end-to-end test ([0006](0006-testing-approach.md)) and CI run against the production build and not only the dev server.
- The Vite version is pinned by the lockfile.
