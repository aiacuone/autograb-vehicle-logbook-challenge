# 0005. Form state in the client

Status: draft, awaiting owner review

## Context

The page keeps track of what the user has picked: make, model, badge, the logbook file, and later the submit status. The choices depend on each other. If the user changes the Make or Model after later choices are made, the dependent choices must be cleared and the right options loaded for the new choice. The quick-select buttons are a second way into the same state, because they fill all three dropdowns at once. The question is how the page holds this state.

Facts that shaped the choice:

- The client is React with TypeScript.
- Each list of options is loaded per choice by a small fetch hook ([0004](0004-api-shape-for-dropdown-options.md)), so that loading state is kept apart from this decision, which covers only the selected values, the file and the submit status.
- The task asks for a realistic design that is not heavy, and the code has to be easy to explain line by line.

## Options considered

### Option 1: `useState` per field

Each value has its own `useState`, and each change handler clears the later fields by hand.

Pros:
- The least code, with nothing new to learn.
- Every line is obvious at a glance.
- Tests go through the real page, so they check the wiring as well as the behaviour.

Cons:
- The clearing rule is spread over several handlers, so a missed case is easy, such as quick-select or a model change.
- Several states must stay consistent with each other.
- The rule can only be tested by rendering the page, which is slower and needs the fetch hooks to answer with data.

### Option 2: `useReducer` for the whole form

One state object and one reducer function. Each change is an action (select make, select model, select badge, select vehicle, select file), and the reducer returns the new state with the dependents already cleared.

Pros:
- The clearing rule lives in one pure function.
- The rule can be tested without rendering: call the function with a starting state and an action.
- Every combination of changing make, model, badge or quick-select is a few lines to test.
- A failing test names the action that returned the wrong state.
- Quick-select is a single action.
- A TypeScript union of actions makes invalid states visible.

Cons:
- More boilerplate: action types, a reducer and a state type.
- The pattern needs explaining to anyone who hasn't used it.
- A few rendered tests are still needed to check each dropdown dispatches the right action.

### Option 3: React Hook Form

A library tracks the fields, and code watches Make and Model to reset the later fields.

Pros:
- It handles field wiring and touched or changed tracking.
- It is common in industry.

Cons:
- Dependent dropdowns still need your own code to watch and reset them, so it doesn't solve the main problem.
- It adds a dependency and its concepts to explain.
- Server-loaded options and the file input need extra wiring.
- The clearing rule runs inside the library's form state, so it can only be tested through the rendered form.

## Decision

Option 2: `useReducer` for the whole form. Two reasons decided it, both about testing:

- It is fast and cheap to cover. Every combination of changing make, model, badge or quick-select is a few lines, where the other options need a rendered test that clicks through the earlier steps for each one.
- Failures are specific. A failing reducer test names the action that returned the wrong state, where in the other options you only learn that the form is wrong somewhere.

The strongest alternative is Option 1, which is simpler to read and checks the real page every time, at the cost of the clearing rule being spread over handlers and only testable by rendering.

## Consequences

- The reducer is a plain exported function, tested on its own for every action, and the state and action types live next to it.
- A small number of rendered tests check that each dropdown, the quick-select buttons and the file input dispatch the right action.
- Two kinds of tests exist: reducer tests for the rules and rendered tests for the wiring. The testing approach decision builds on this.
- Adding a field means adding it to the state type, and the compiler then points to every place that builds a state.
- The file object is held in the reducer state. It can't be serialised, which does not matter for local component state.
- There is more code than with `useState` for four fields, and the pattern has to be explained in the walkthrough.
- A dropdown is disabled until the one above it has a choice, and the file input appears only once a badge is chosen. Both follow from the state, so the reducer decides them.