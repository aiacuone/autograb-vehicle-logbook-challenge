# 0027. Two ways to run the project

Status: accepted

Supersedes [0010](0010-how-reviewers-run-it.md).

## Context

[0010](0010-how-reviewers-run-it.md) chose Docker as the only way for a reviewer to run the project. While building the Docker setup, the owner pointed out a cost: a reviewer must install Docker just to try the app. The question is whether to keep Docker as the only way, add a way that needs only Node, or drop Docker.

Facts that shaped the choice:

- The finished project is one process on one port: Express serves the built client ([0007](0007-result-page-and-saved-results.md)). That build is what a reviewer should see, and it is what the Docker image runs. `npm run dev` is for development, with Vite beside Express.
- The project already needs Node 24 for development, so a way that needs only Node adds no new requirement.
- The server package already has a `start` script that runs the built server. The root has no script that builds and then starts it.
- The owner's machine has no Docker installed. The Docker path has so far only been checked by a dry run, and CI ([0021](0021-ci.md)) is the first real check.

## Options considered

### Option 1: no Docker

The README says `npm install`, then `npm start`. The Dockerfile, compose file and CI Docker job are dropped.

Pros:
- Nothing to install beyond Node.
- One way to run it, and no Dockerfile to explain.

Cons:
- Gives up the Docker and CI practice.
- It depends on the reviewer's Node version matching. `engines`, `.nvmrc` and npm's message state the version but cannot force it.
- The Docker files already written, and the ADRs that mention them, have to be removed or rewritten.

### Option 2: Docker only (the previous decision)

The README says `docker compose up`.

Pros:
- The same environment for every reviewer, with Node 24 inside the image.

Cons:
- A reviewer without Docker installed and running cannot start the project.
- Installing Docker is a larger step than the project otherwise asks for.

### Option 3: both

The README gives two routes: `npm install` then `npm start`, and `docker compose up`.

Pros:
- A reviewer without Docker is never blocked.
- A reviewer with Docker still gets the pinned environment.
- The Dockerfile and its CI job stay.
- Cheapest of the changes, since the Docker files are already written.

Cons:
- The route nobody uses can quietly break. The CI Docker job covers the Docker route, and the Playwright test covers the build that `npm start` runs.
- A longer README with two sets of steps.

## Decision

Option 3: both. A reviewer can run `npm install` then `npm start`, or `docker compose up`.

The deciding reason: a reviewer without Docker is not blocked.

The strongest alternative is Option 1, which is the simplest repo but gives up the Docker route.

`npm start` runs the build, not the development server: it builds all packages and starts the single server on port 3000, the same thing the Docker image runs. `npm run dev` stays as the way to work on the code.

## Consequences

- A root `start` script is added. It builds, then starts the server.
- The README leads with the npm route and gives Docker as the second route. The README is written in the README item.
- The Docker files and the CI Docker job ([0021](0021-ci.md)) stay as planned.
- The Docker route is still unproven until CI runs it. If the Docker job fails there, the Dockerfile is fixed in that item.
- [0010](0010-how-reviewers-run-it.md) is superseded. Other records that say reviewers run the project with `docker compose up` describe the Docker route, which still exists.
