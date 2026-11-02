# 0024. Logging

Status: accepted

## Context

The server needs to record what happens, especially errors. The question is how it logs.

Facts that shaped the choice:

- Unexpected errors are logged with full details, while clients get only a generic message ([0009](0009-api-error-handling.md)).
- Requests refused by the rate limiter should be visible ([0014](0014-security-hardening.md)).
- Docker collects standard output ([0010](0010-how-reviewers-run-it.md)), and there is no database.
- Uploads are a user's service logbook, so their contents must never reach the logs ([0008](0008-upload-handling.md)).
- The task does not mention logging. It asks for a realistic design that is not heavy.
- No logging was ruled out, because unexpected errors must be logged with details.

## Options considered

### Option 1: pino

A small structured logger. It writes one JSON line per request and per error to standard output, through its HTTP middleware. A redaction setting keeps upload contents and headers out of the logs, and the log level comes from an environment variable.

Pros:
- Structured JSON lines are easy to search and filter.
- A redaction setting keeps uploads and headers out of the logs.
- A request logger comes built in, and it can add a request id that links a request to its error.

Cons:
- One dependency and a configuration to explain.

### Option 2: `console.log`

Plain text lines from `console.log` and `console.error`, with no dependency and a request line written by hand.

Pros:
- No dependency, and the simplest option.

Cons:
- Plain text is hard to search and filter.
- No redaction safety net, so uploads could be logged by accident.
- A request line to write and maintain by hand.

### Option 3: winston

A fuller logging library with transports and formats, configured to write to standard output.

Pros:
- Flexible outputs and formats.

Cons:
- More library than a small app needs.
- Redaction needs a custom format.
- A heavier setup than the other two.

## Decision

Option 1: pino.

Three reasons decided it:

- It is the easiest to track and resolve an issue, because of searchable fields and a request id that links a request to its error.
- A redaction setting keeps a user's uploaded logbook out of the logs.
- It is a small tool, with less setup than winston.

The strongest alternative is Option 2, which has no dependency but no safety net against logging an upload by accident.

## Consequences

- The server uses pino with its HTTP middleware. Each request and each error is one JSON line on standard output, and Docker collects it.
- Redaction removes upload contents and sensitive headers from every line. A test checks that a submitted logbook never appears in the log output.
- Each line carries a request id, so a failure can be followed from its request to its error. Error lines carry the same stable code as the error reply from [0009](0009-api-error-handling.md).
- Requests refused by the rate limiter are logged with their status ([0014](0014-security-hardening.md)).
- The log level comes from an environment variable, with a default of "info".
- A dependency and a small configuration are added, and both have to be explained in a walkthrough.
