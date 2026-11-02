# 0014. Security hardening

Status: draft, awaiting owner review

## Context

The server already checks every input ([0011](0011-where-validation-happens.md)), keeps internal details out of error replies ([0009](0009-api-error-handling.md)), holds uploads in memory with a 3 MB cap and shows them as plain text ([0008](0008-upload-handling.md)), and runs in Docker as one process on one port ([0010](0010-how-reviewers-run-it.md)). The question is which protections to add beyond those.

Facts that shaped the choice:

- The task does not mention security. It asks for a realistic design that is not heavy.
- Login and authentication are out of scope.
- Each upload can be up to 3 MB and is held in memory while it is processed, so a flood of uploads could exhaust the server's memory.
- A rate limiter counts requests per visitor address. Behind a proxy, every request can look like it comes from one address unless the server is told how many proxies sit in front of it. In this project's Docker setup there is no proxy of our own, so the default is correct. A real deployment behind a load balancer would need the setting.

## Options considered

### Option 1: minimal

Nothing beyond what is already decided. The README lists the gaps.

Pros:
- No new dependencies.
- Nothing extra to explain.

Cons:
- No security work, and the gaps are only listed in the README.

### Option 2: core hardening

Security headers with a content policy (`helmet`), no cross-origin access, and a container that runs without admin rights. Rate limiting is a README next step.

Pros:
- Stops injected scripts through the content policy.
- The container cannot take over the host if the app is flawed.

Cons:
- A wrong content policy can break the page.
- No protection against upload floods until the README next step.

### Option 3: core hardening plus rate limiting

Everything in Option 2, plus a limiter on the upload endpoint that counts requests per visitor in memory.

Pros:
- Slows upload floods, and one heavy visitor cannot block the others.
- Uses a standard, documented library, so there is little hand-written code.

Cons:
- Counters can be wrong behind a proxy unless the proxy setting is right.
- Counters live in memory, so they reset on restart and do not combine across several server copies.
- More to configure, test and explain than Option 2.

### Option 4: core hardening plus an upload cap

Everything in Option 2, plus a cap on how many uploads run at the same time.

Pros:
- Limits memory use during a flood, with no visitor addresses and no proxy setting.

Cons:
- One heavy visitor can take every slot and block others.
- Hand-written code with edge cases, such as releasing a slot when an upload is cancelled or fails.

## Decision

Option 3: core hardening plus rate limiting.

Options 1 and 2 were set aside because they leave the upload flood unaddressed in code and rely on a README note.

Three reasons decided it:

- It limits each visitor separately, so one heavy user cannot block the others.
- It uses a standard, documented library, so there is less hand-written code than in Option 4.
- The proxy counting problem is manageable. In Docker with no proxy of ours the counts are correct, and in a real deployment the setting comes from an environment variable, with a README note and a test.

The strongest alternative is Option 4, which avoids the proxy setting but protects only the memory and lets one heavy user block others.

## Consequences

- The server sends security headers with a content policy, accepts no cross-origin calls, and the container runs as a non-root user. In production the client and server share one origin, and in development the client's dev server forwards API requests.
- A limiter on the upload endpoint counts requests per visitor address in memory. The limit values are set in configuration and chosen during the build.
- A refused request returns HTTP 429 in the error shape from [0009](0009-api-error-handling.md), with a new code for it. That list of statuses and codes gains one entry.
- The number of proxies in front of the server is read from an environment variable and defaults to none. The README says to set it when deploying behind a proxy.
- Tests cover the limiter, and a fake forwarded address must not be trusted when no proxy is configured.
- The counters live in memory, so they reset when the server restarts and are not shared between server copies. If the app ever runs as several copies, the counters move to a shared store, as a README next step.
- A wrong content policy can break the page, so the end-to-end test ([0006](0006-testing-approach.md)) loads the real page under the policy.
