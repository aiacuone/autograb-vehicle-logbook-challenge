# 0002. Server framework

Status: accepted

## Context

The project needs a Node server that serves the dropdown options and accepts the form submission with a file upload. The task requires the server to be built with Express or Koa, which rules out other Node frameworks such as Fastify, NestJS or Hono, so the choice is between those two.

Facts that shaped the choice:

- The server sits in the `server/` workspace of the repo layout chosen in [0001](0001-repo-structure.md).
- Every route, middleware and test depends on the framework, so changing it later means rewriting the server.
- The code has to be easy to explain line by line.

## Options considered

### Option 1: Express 5

Pros:
- Routing, body parsing and uploads each have well-known packages and plenty of examples.
- Errors thrown in async handlers reach the error handler without extra code.

Cons:
- The API style is older, and some patterns, such as changing `req` and `res` directly, feel dated.
- Many examples online are for Express 4 and do not match version 5.

### Option 2: Koa

Pros:
- A smaller core with a modern `async`/`await` style from the start.
- The `ctx` object keeps handlers short.

Cons:
- Routing, body parsing and uploads each need a separate package.
- Fewer examples and answers online when something goes wrong.

## Decision

Option 1: Express 5. It is the most widely used choice, so reviewers will read it fluently, and the packages we need for routing and uploads are mature and well documented.

The strongest alternative is Koa, which is smaller and more modern but needs more packages put together by hand.

## Consequences

- Uploads are handled with `multer`, and the server uses the Express 5 error handling for async routes.
- When looking for help online, check that examples are for Express 5 and not 4.
- The next decision (how shared types and validation work) has to fit Express request and response handling.
- Moving to Koa later would mean rewriting the server's routing and middleware.
