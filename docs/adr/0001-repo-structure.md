# 0001. Repo structure

Status: accepted

## Context

The project has a React front end, a Node back end and some code both sides use (the shape of the data they exchange). The question is how to lay this out so the three sit together and a reviewer can run it easily.

Facts that shaped the choice:

- The task allows one public repo or two, and asks for a README on how to run it.
- The role is full-stack and mentions CI, so a clear split with shared code reads well.
- The code has to be easy to explain line by line.

## Options considered

### Option 1: one repo with npm workspaces (`client`, `server`, `shared`)

Pros:
- The shared package imports cleanly from both sides.
- A reviewer needs one install and one command to run everything.

Cons:
- Three workspaces, and the server build needs wiring to import `shared`.
- More folders than a small app strictly needs.

### Option 2: one repo, two plain folders (`client`, `server`)

Pros:
- No workspace tooling to learn.
- Simple to picture.

Cons:
- Sharing types means relative imports or copying, which is fragile.
- Two installs and two lockfiles.

### Option 3: one repo, one `package.json`

Pros:
- Least setup, with a single install and one set of scripts.

Cons:
- Client and server dependencies share one file, so their builds can fight over it.
- It does not look like a real full-stack split.

### Option 4: two repos

Pros:
- Clean separation between front end and back end.

Cons:
- Sharing types needs a published package, a git dependency or duplication.
- Two READMEs, two CI setups and two links to submit.
- It gains nothing at this size.

## Decision

Option 1: one repo using npm workspaces, with `client/`, `server/` and `shared/`. It keeps the shared code importable from both sides, and a reviewer needs only one install and one command.

The strongest alternative is Option 3, which is simpler if the workspace wiring proves too awkward.

## Consequences

- The next decision (how shared types and validation work) builds on the `shared/` workspace.
- The README explains how to install once at the root and run both sides.
- CI runs lint, type checks and tests across all workspaces.
- The server build needs to import `shared` as well as its own code.
- There are more folders than a small app needs, which is a small cost for the clearer split.
