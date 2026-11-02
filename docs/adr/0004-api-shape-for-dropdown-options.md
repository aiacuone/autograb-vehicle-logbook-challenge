# 0004. API shape for the dropdown options

Status: draft, awaiting owner review

## Context

The page has three dependent dropdowns: Make, then Model, then Badge. Picking a Make has to show that make's models, and picking a Model has to show its badges. Changing an earlier choice clears the later ones and loads the right options for the new choice. The question is where the page gets each list from: the server on every choice, or one copy of all the data up front.

Facts that shaped the choice:

- The server is Express 5 ([0002](0002-server-framework.md)), and the response shapes live in the shared `zod` package ([0003](0003-shared-types-and-validation.md)) in the `shared/` workspace ([0001](0001-repo-structure.md)).
- The vehicle data for this task is tiny (three makes with a handful of models each) and is held in memory on the server.
- The task asks for a realistic design that is not heavy, and the role stresses scalable, data-rich systems.
- The submit request itself (the form POST) is the same in every option and is not part of this decision.

A real vehicle catalogue is much larger: a single market's full history could be thousands of models and tens of thousands of badge and year combinations, though any one make stays small, at most a few hundred models. That gap between the brief's data and a real catalogue is what the options trade off.

## Options considered

### Option 1: cascading requests

The page asks for makes, then for the chosen make's models, then for the chosen model's badges (`GET /api/makes`, `/api/makes/:make/models`, `/api/makes/:make/models/:model/badges`).

Pros:
- Each URL answers one question, one per dropdown.
- Responses are small and carry only what the next dropdown needs.
- Resource-style nesting reads like a real REST API.
- The server applies the cascading rules, so the page stays a thin client.
- It keeps working unchanged if the catalogue grows.

Cons:
- Filling a quick-select vehicle needs up to three requests.
- Quick changes can leave stale responses, so old requests need cancelling.
- Each dropdown needs a loading state and an error message.
- Three routes and more tests to write and explain.

### Option 2: everything in one request

The page loads the whole vehicle tree once and filters it in the browser.

Pros:
- No loading states or stale responses per dropdown.
- Quick-select is just setting three values.
- One route on the server, and only the first load can fail.
- It fits the size of this data.

Cons:
- The cascading rules (filter, clear dependents) live in the browser.
- It sends every make, model and badge to every user, so a much larger catalogue would need Option 1 later.
- The copy in the browser can go out of date until reload.

### Option 3: makes first, then models with their badges

The page asks for makes, then for the chosen make's models with all their badges (`GET /api/makes`, `/api/makes/:make`).

Pros:
- Two requests, so fewer calls overall.
- Quick-select needs only one call.

Cons:
- The models response carries every model's badges, a bigger and less obvious shape.
- Picking a model makes no request, so the two dropdowns behave differently.

### Option 4: one endpoint with query parameters

Every step calls the same URL, such as `/api/options?make=ford&model=falcon-ute`.

Pros:
- One URL and one client hook.
- One route to validate and document.

Cons:
- The response shape changes with the query, so the shared type is a union.
- It is not resource-style, and invalid combinations need extra checks.

## Decision

Option 1: cascading requests. Each dropdown's options are fetched when its parent choice changes, using the three endpoints above, with `fetch` and an `AbortController` in a small hook so a stale response never overwrites a newer one.

The reason is response size. Option 2 is simpler and fits the brief's tiny data, but it sends every make, model and badge in one response, and with a real catalogue that adds up to large responses. Per-choice requests keep every response small however large the data gets.

The strongest alternative is Option 2, which would be the fallback if the loading and cancelling logic proves too awkward to explain.

## Consequences

- Three response schemas go in `shared/` (makes, models, badges), plus the error shape.
- The hook owns loading, error and stale-response handling, and needs its own tests, including a quick change of Make.
- Changing a Make or Model clears the later selections and their options before the new request is sent.
- A quick-select button sets all three values and the dependent dropdowns load their options. The form has to avoid clearing a preset's values while it does so.
- Explaining it takes more than Option 2: three endpoints, three loading states and the cancellation logic.
- Moving to Option 2 later would delete code. Moving the other way would not be needed, since this already scales.
- The makes reply is a list of keys such as `ford`. The client shows readable names from a small map in `shared/` and sends the key back. The vehicle data itself stays on the server.