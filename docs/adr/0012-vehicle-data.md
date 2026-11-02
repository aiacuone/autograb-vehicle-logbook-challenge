# 0012. Vehicle data

Status: accepted

## Context

The dropdowns, the quick-select buttons and the server's checks all depend on the vehicle data: a set of makes, each with models, each with badges. The question is how the server holds that data.

Facts that shaped the choice:

- The data is supplied with the task, which allows it to be held either as a map in the code or as a JSON file that is read into memory. A database is not offered.
- The data ships with the project and changes only when a developer edits it.
- The dropdown endpoints ([0004](0004-api-shape-for-dropdown-options.md)) and the server's checks ([0011](0011-where-validation-happens.md)) read from it.
- The finished project runs in a container ([0010](0010-how-reviewers-run-it.md)).
- PostgreSQL is out of scope and appears in the README as a next step.

## Options considered

### Option 1: a hard-coded map

The data is a TypeScript constant in the server code.

Pros:
- TypeScript checks it when the project is built, so a malformed map cannot reach a running server.
- Nothing to read at runtime: no file path, no loader and no startup check.
- Nothing extra to copy into the Docker image.

Cons:
- Changing the data means editing code and rebuilding.
- It looks less like data from an outside source.

### Option 2: a JSON file, validated at startup

The data is a JSON file that the server reads at startup, checks with `zod` and keeps in memory.

Pros:
- The data is separate from the code, and the file can be replaced without editing code.
- A malformed file stops the server at startup with a message naming the part that is wrong.
- It is the same shape as the supplied data, so it can be used as given.

Cons:
- A file path to get right, including copying the file into the Docker image.
- Validation code to write and test.
- A malformed file means the server does not start.

### Option 3: PostgreSQL

The data lives in a database table.

Pros:
- A real schema and queries, with room to grow.

Cons:
- An extra service in the compose file that must start before the server.
- A schema, seed data and migrations for three makes.
- Server tests need a database.
- It goes beyond what the task asks and is a README next step.

## Decision

Option 2: a JSON file, validated at startup.

The reason that decided it: the data is separate from the code and looks more like real data.

The strongest alternative is Option 1, which is simpler and is checked when the project is built, but keeps the data inside the code.

## Consequences

- The server reads the JSON file at startup, checks it with a `zod` schema and keeps the result in memory. The dropdown endpoints and the server's checks read from that copy.
- If the file is malformed, the server prints which part is wrong and exits. This applies only to the project's own data file. A bad uploaded logbook is rejected for that one request and the server keeps running.
- The Dockerfile copies the data file into the image.
- A test loads the real file and checks it passes the schema, so a mistake in the file is caught before it ships.
- If the data ever needs to change at runtime or is edited by people who are not developers, the data moves to a database, as a README next step.
