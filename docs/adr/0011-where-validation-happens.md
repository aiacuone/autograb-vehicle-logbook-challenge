# 0011. Where validation happens

Status: accepted

## Context

The form sends a make, a model, a badge and a logbook file. Some of that must be checked: the make, model and badge must be a valid combination from the vehicle data, and the file must be present, within the size cap and plain text ([0008](0008-upload-handling.md)). The shared schemas ([0003](0003-shared-types-and-validation.md)) define the shape of the request. The question is where each check runs, on the server, in the browser, or both.

Facts that shaped the choice:

- Anyone can send a request without using the page, so the server must check everything. A check in the browser alone is not enough, and that option was ruled out.
- The dropdowns are built from the vehicle data, and changing the make or model clears the ones below it, so a user using the page cannot pick a mismatched combination.
- A file over the 3 MB cap is rejected by the server only after it has been sent.
- Failed checks are reported in the error shape from [0009](0009-api-error-handling.md).

## Options considered

### Option 1: server only

The server checks everything and the client does no checks.

Pros:
- No rules are copied into the browser, so they cannot drift apart.
- The least code to explain.

Cons:
- A file over 3 MB is fully sent before it is rejected.
- The user learns about a missing badge only after the request.

### Option 2: the server checks everything, with light checks in the client

The server stays the source of truth. The client checks only what the dropdowns do not prevent: a badge must be chosen, and the file must be under 3 MB before it is sent.

Pros:
- The server stays the single source of truth.
- The user gets feedback before the upload, and a file over the cap is never sent.

Cons:
- The size limit appears on both sides, so the constant is shared from `shared/`.

### Option 3: the full shared rules on both sides

The same rules, including the make, model and badge combination, run in the browser and again on the server.

Pros:
- The same function answers on both sides, so they cannot disagree.

Cons:
- The browser needs the vehicle data for the combination check.
- The dropdowns already prevent invalid combinations, so the check would rarely fail.
- More shared code and tests to keep in step.

## Decision

Option 2: the server checks everything, with light checks in the client.

Three reasons decided it:

- The user gets feedback before the upload, so a file over 3 MB is never sent.
- The server remains the single source of truth, so the rules cannot be bypassed.
- The make, model and badge rule does not need to be copied into the browser, because the dropdowns already stop invalid combinations.

The strongest alternative is Option 1, which is the simplest and has no rules in the browser, but gives no feedback before the upload.

## Consequences

- The server checks every submission: the make exists, the model belongs to the make, the badge belongs to the model, and a file is present, within the 3 MB cap and valid UTF-8 text with no binary bytes. A failure returns the error body from [0009](0009-api-error-handling.md) with a code, a message and the field.
- The client checks that a badge is chosen and that the file is under 3 MB before sending. These checks are a convenience, and the server rejects anything invalid whether or not they ran.
- The 3 MB limit is a constant in `shared/`, used by both the client check and the server setting.
- Server tests cover each rejection. Rendered tests cover the client's two checks.
- The upload field is shown only once a badge is chosen ([0005](0005-form-state.md)), so the client's badge check is a safety net on the submit button.