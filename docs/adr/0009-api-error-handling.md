# 0009. API error handling and response shape

Status: accepted

## Context

Requests can fail in several ways: the file is over the size cap, the file is not text ([0008](0008-upload-handling.md)), the make, model or badge is missing or invalid ([0003](0003-shared-types-and-validation.md)), or something unexpected goes wrong on the server. The question is what the server sends back in each case, and how the client shows it.

Facts that shaped the choice:

- The success reply is fixed by the task: the make, model, badge and logbook text, with its type in `shared/`.
- The HTTP statuses are the same for every option: 400 for a missing file or invalid choices, 413 for a file over the cap, 415 for a file that is not text, 429 for a visitor refused by the rate limiter ([0014](0014-security-hardening.md)), 404 for a make, model or `/api` path that does not exist, and a generic 500 for anything unexpected. Only the body of the error reply differs.
- The form has four inputs, so the client can show a message beside the input that failed if the reply says which one.
- Unexpected errors must not leak stack traces, file paths, library names or raw error text, which can help an attacker. The details stay in the server's logs.

## Options considered

### Option 1: a code, a message and a field

One JSON error body: a stable code (for example `FILE_TOO_LARGE`), a message for the user, and an optional field name. One central Express error handler turns multer, `zod` and unexpected errors into this shape.

Pros:
- One central handler produces every error reply and keeps internal details out of it.
- The error types live in `shared/`, so the client and server agree on the codes.
- It holds only what the form uses, so it is short to explain.
- It is ordinary JSON, with no special content type for the client to handle.

Cons:
- More setup than a plain message: the shape, the list of codes and the error classes.
- The list of codes must be kept in step on both sides, though the shared types make a mismatch show up when the project is built.
- It is a shape of our own, so a reviewer reads it from the code and may ask why not a standard.

### Option 2: the problem details standard

The same idea using RFC 9457: `application/problem+json` with a type, a title, a status, a detail, and an errors list.

Pros:
- One central handler, as in Option 1.
- A published standard that reviewers who know it recognise at once.
- The layout is given, so there is no shape to invent.

Cons:
- The standard has no field-level part, so the errors list would be our own addition anyway.
- It includes fields this form does not use (a title, a status that repeats the HTTP status, and an instance address), unless they are trimmed.
- The reply has a special content type, which the server must set by hand and the client must accept.
- More to explain: the standard and our addition to it.

### Option 3: a message only

A JSON body with just a message, and the HTTP status.

Pros:
- The least code, and the simplest to explain.

Cons:
- No code and no field name, so the client cannot tell which input failed.
- Tests and fault finding have only the message wording and the status to go on.
- Little room to add details later without changing the shape.

## Decision

Option 1: a code, a message and a field.

Option 3 was ruled out first: with no code or field in the reply, testing and fault finding are harder.

The reason for choosing Option 1 over a standard is the answer to "why not a standard?": the standard has no field-level part, so we would add our own anyway, and it has fields this form does not use.

The strongest alternative is Option 2, which would be the choice if reviewers recognising a published standard mattered more than a small shape that holds only what is used.

## Consequences

- The error type and the list of codes live in `shared/`, so the client and server agree on them. Examples are a missing file, a file over the cap, a file that is not text, an invalid field, a visitor refused by the rate limiter, something not found, and an unexpected error.
- One central handler produces every error reply. A multer size error becomes a 413, a `zod` error becomes a 400 with the field name, and anything unexpected becomes a 500 with a fixed generic message while the real error is logged on the server.
- The client shows the message beside the input named in the reply, and keeps the user's selections.
- Tests check the code and the status, not the wording of the message.
- The reply does not follow RFC 9457, so a reviewer may ask why. The answer above goes in the walkthrough.
- If a standard is wanted later, the change is limited to the handler and the client's error reading.
- A request for a make or model that is not in the data, or for an unknown `/api` path, gets a 404 with this error body, and not the app's main page ([0016](0016-client-routing.md)).