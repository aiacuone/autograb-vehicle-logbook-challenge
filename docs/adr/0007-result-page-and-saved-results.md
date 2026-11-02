# 0007. Where the result is shown

Status: accepted

## Context

After the user uploads a logbook, the server answers with the make, model, badge and the logbook text, and the page shows them. The question is where the page shows that reply.

Facts that shaped the choice:

- The server only echoes back what the user just sent. The user already has the file and made the selections, so the reply is a check that the upload worked, not data the user needs to come back to.
- The task asks only for the reply to be shown on the page. It does not ask for anything to be kept, so storing uploads is out of scope.
- The task sets no size for the logbook. A typical service logbook is expected to be 20 to 40 short lines, which fits about one screen, but a longer file must still be readable.
- The client is React with TypeScript and the server is Express ([0002](0002-server-framework.md)). Form state is a reducer ([0005](0005-form-state.md)), and the end-to-end test covers the main flow ([0006](0006-testing-approach.md)).

## Options considered

### Option 1: a modal

The reply opens in a dialog over the form.

Pros:
- The result stays on the page, and the form keeps its selections underneath.
- The native `<dialog>` with `showModal()` gives focus trapping and Escape to close with little code.
- No routing and nothing stored.

Cons:
- A long logbook scrolls inside the dialog, apart from the page.
- The reply is lost if the dialog closes, including by an accidental tap outside it.
- The rendered-test environment does not implement `showModal()`, so those tests need a small stand-in.

### Option 2: a separate result page, nothing stored

After the upload the page moves to a result page that shows the reply. Nothing is stored, so a refresh or a direct visit to the result address returns the user to the form.

Pros:
- The whole page is the result, which reads best for a long logbook.
- Nothing can close the result by accident.
- The result page is a plain component that takes the reply as input, so it can be tested on its own without a browser feature missing from the test environment.

Cons:
- It needs a routing library in the client, and a server catch-all so a direct visit to the result address opens the app.
- The form state must live above the router, or the selections are lost when the user goes back.
- A refresh loses the result and sends the user back to the form.
- Uploading another logbook means navigating back.

### Option 3: the result below the form on the same page

Pros:
- The least code, and the form and result are visible together.

Cons:
- The form takes the top of the screen, so even a one-screen logbook placed below it can run past the bottom, and a long one pushes the form down.
- A refresh loses the result.

## Decision

Option 2: a separate result page, with nothing stored.

Two reasons decided it:

- A long logbook scrolls badly in a modal, mostly because a tap outside the modal could close it by accident and lose the reply.
- Testing: the result page is a plain component, so it is easier to test than the modal.

The strongest alternative is Option 1, which keeps the user on the form and needs no routing.

## Consequences

- The client needs routing, and the server needs a catch-all so a direct visit to the result address opens the app. If the page is opened with no reply to show, it sends the user to the form.
- The form's reducer state lives above the router, so going back keeps the selections.
- Nothing is stored. Persisting uploads is a README next step, together with a database.
- The rendered tests wrap the result page in a router, and one extra case covers opening it with no reply.
- The end-to-end test ([0006](0006-testing-approach.md)) covers submit, the move to the result address, and the reply shown.
- A refresh on the result page returns the user to the form, and the reply is lost.
