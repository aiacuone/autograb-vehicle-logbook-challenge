# 0010. How reviewers run the project

Status: draft, awaiting owner review

## Context

The task asks for a README that tells reviewers how to run the project, and says reviewers test with their own logbook file. It names no tools, so what a reviewer has installed is unknown. The question is how a reviewer starts the finished project.

Facts that shaped the choice:

- The project is a React client and an Express server in one npm workspaces repo ([0001](0001-repo-structure.md), [0002](0002-server-framework.md)).
- Express serves the built client and answers unknown paths with the app ([0007](0007-result-page-and-saved-results.md)), so the finished project runs as one process on one port.
- Development is separate from running it: it uses `npm run dev`, with Vite serving the client beside Express, and needs Node on the developer's machine in every option.

## Options considered

### Option 1: no Docker

The README says `npm install`, then `npm start`. The client is built and Express serves everything on one port.

Pros:
- Nothing to install beyond Node, which the project needs anyway.
- The same npm commands run locally, in CI and for reviewers.

Cons:
- It depends on the reviewer's Node version matching. An `engines` field, an `.nvmrc` and a clear message from npm state the version needed, but cannot force it.
- Different operating systems can behave differently.

### Option 2: Docker only

The README says `docker compose up`. The image builds the client and runs the server, with the Node version pinned inside it.

Pros:
- The same environment for every reviewer, with no Node install and no version to match.

Cons:
- A reviewer without Docker installed and running cannot start it.
- A Dockerfile and a compose file to write and keep working.
- A slower first start, while the image is downloaded and built.

### Option 3: both

The npm steps as the main path, plus a Dockerfile and compose file as a second path.

Pros:
- Reviewers pick the path that suits them.

Cons:
- The path nobody uses can quietly break.
- A longer README with two sets of steps.

## Decision

Option 2: Docker only. The reviewer runs `docker compose up`.

Two reasons decided it:

- The image contains its own Node version, so every reviewer runs the same environment.
- The extra resources are small for an app this size: some disk for the image and a slower first start.

The strongest alternative is Option 1, which needs only Node and avoids the risk of a reviewer without Docker.

## Consequences

- A Dockerfile builds the client and runs the server with a pinned Node version, with a compose file and a `.dockerignore`. The pinned version is Node 24, listed in the README's technical choices.
- The README states that Docker is required and gives one command.
- A reviewer without Docker running cannot start the project. This is the main risk accepted.
- Development still uses `npm run dev`, with Node on the developer's machine. CI and the end-to-end test ([0006](0006-testing-approach.md)) still run npm scripts.
- The first start downloads the base image and builds the app, which takes longer than later starts.
