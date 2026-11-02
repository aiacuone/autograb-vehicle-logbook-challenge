# 0016. Client routing

Status: accepted

## Context

The result is shown on a separate page, nothing is stored, and opening or refreshing the result page returns to the form ([0007](0007-result-page-and-saved-results.md)). The question is how the client moves between the form and the result page, and what address the result page has.

Facts that shaped the choice:

- The task shows the response to the user on the page, and its demo uses a separate result page.
- Express serves the built client and returns the app for unknown paths ([0010](0010-how-reviewers-run-it.md)). The client is a Vite app ([0015](0015-client-build-tool.md)).
- The form state lives above the router ([0007](0007-result-page-and-saved-results.md)), so going back to the form keeps the user's choices.
- TanStack Router was ruled out because it brings typed routes and more machinery than two screens need.

## Options considered

### Option 1: React Router with normal addresses

The result page has a normal address such as `/result`. The server returns the app for unknown paths, so a direct visit works, and opening the result with no reply returns to the form.

Pros:
- Clean addresses and a working Back button.
- Matches the server catch-all rule already assumed in [0010](0010-how-reviewers-run-it.md).
- Every unknown address gets the same answer: the app loads and the router sends the user to the form.

Cons:
- The server must return the app for unknown paths, and that rule must come after the API routes so it does not swallow API calls.

### Option 2: React Router with hash addresses

The result page has an address such as `/#/result`. The part after the `#` never reaches the server, so no catch-all rule is needed.

Pros:
- No server catch-all rule.
- The Back button works.

Cons:
- Addresses look dated.
- A plain unknown path without a `#` still gets a bare "not found" from the server.

### Option 3: no router

One component switches between the form and the result using state. The address never changes.

Pros:
- The least machinery, and no server rule.

Cons:
- The Back button leaves the app and the user loses the form.
- It does not match the demo's separate result page.

## Decision

Option 1: React Router with normal addresses.

Three reasons decided it:

- Unknown addresses should all get the same answer, a reroute to the form. Option 1 does that for every path, while Option 2 leaves a plain "not found" for paths without the `#`.
- Clean addresses and a working Back button.
- It matches the catch-all rule that [0010](0010-how-reviewers-run-it.md) already assumes.

The strongest alternative is Option 2, which avoids the server rule at the cost of dated-looking addresses.

## Consequences

- The client uses React Router with two routes: the form and the result page. A catch-all route sends any unknown address to the form.
- Opening the result page with no reply, by refresh or direct visit, redirects to the form.
- The server returns the app's main page for any path that is not an API call and not a real file. That rule sits after the API routes, and a missing script or image still returns "not found".
- Tests cover the redirect when the result is opened with no reply, and that an API path is not answered with the app.
