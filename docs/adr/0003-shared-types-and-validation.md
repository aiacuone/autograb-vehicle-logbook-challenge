# 0003. Shared types and validation

Status: accepted

## Context

The client and server exchange a small set of payloads: the dropdown option lists, the submit request, the success response and an error shape. If the two sides disagree about these, the bugs are silent. The server also needs to check what it receives. The question is how both sides agree on the shapes, and how the server validates requests.

Facts that shaped the choice:

- The repo has a `shared/` workspace for code both sides use ([0001](0001-repo-structure.md)), and the server is Express 5 ([0002](0002-server-framework.md)).
- The submission is a file upload, which is not JSON, so a shared definition covers the text fields and the response, and the file itself is checked separately on the server.

## Options considered

### Option 1: shared `zod` schemas, with types inferred from them

Pros:
- Types and validation come from one schema, so they cannot drift apart.
- A schema change breaks the build on whichever side no longer matches.

Cons:
- Needs a workspace package and build wiring for the server to import it.
- Adds `zod` to the client bundle.

### Option 2: shared plain TypeScript types

Pros:
- A compile-time contract with no extra library.
- The simplest to read.

Cons:
- Server validation is written separately and can drift from the types.
- Types vanish at runtime, so a bad request is not caught by them.

### Option 3: the client imports types straight from `server/`

Pros:
- Zero setup.
- A compile-time contract.

Cons:
- It couples the client build to the server's source.
- It breaks if the repos are ever split.

### Option 4: an OpenAPI spec with generated types

Pros:
- A standard way to document the API.

Cons:
- A spec file and a generation step to maintain.
- The spec and the server can still disagree.
- More tooling than a handful of endpoints need.

### Option 5: tRPC

Pros:
- End-to-end types with nothing to share by hand.

Cons:
- It replaces REST with a different API style.
- File upload is awkward.
- It hides the mechanics that would need explaining.

## Decision

Option 1: shared `zod` schemas in `shared/`, with the types inferred from them. Both sides import from the same schema, and the server parses incoming requests against it. The client uses the inferred types and does not re-check responses.

The strongest alternative is Option 2, plain shared types, which is the fallback if the build wiring proves too awkward.

## Consequences

- One change to a schema fails the type check on whichever side no longer matches. CI runs a single type check across all workspaces.
- The uploaded file is checked separately on the server, for type and size.
- The vehicle data stays on the server. Only the response shapes and a small map of make display names are shared.
- Types only protect code built together. If the client and server were ever deployed separately, an old client could meet a new server. That is a next-steps note for the README.
- The API shape decision builds on these schemas.
