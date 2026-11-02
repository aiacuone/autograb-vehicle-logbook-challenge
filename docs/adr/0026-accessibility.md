# 0026. Accessibility

Status: draft, awaiting owner review

## Context

The client is a small React form with three dependent dropdowns, quick-select buttons, a file input, a submit button, error messages and a result page. The question is how much accessibility work the form gets.

Facts that shaped the choice:

- The form uses native controls and plain CSS. The dropdowns are disabled until the one above is chosen, and the file input appears once a badge is chosen.
- Errors come back with a stable code and the name of the field, and show beside the input ([0009](0009-api-error-handling.md)). The result page has its own route ([0016](0016-client-routing.md)). One Playwright test runs in CI ([0006](0006-testing-approach.md), [0021](0021-ci.md)).
- The task does not mention accessibility. The task puts user experience ahead of visual polish, which supports accessibility only indirectly.
- The disabled controls, the error messages and the page change are the places where a form like this commonly fails.
- An accessible component library was ruled out, because plain CSS is already decided.

## Options considered

### Option 1: the basics

Native controls with a label tied to each one, full keyboard use and visible focus. Error messages are linked to their inputs and announced to screen readers. Focus moves to the result page heading after the form is sent. One automated accessibility check (axe) runs inside the Playwright test.

Pros:
- Covers the common failures: labels, keyboard, focus and errors.
- An automated check stops it from regressing.
- Mostly attributes and one check, so little code.

Cons:
- Disabled dropdowns cannot be focused, so they need a visible reason.
- An automated check finds only some of the problems.

### Option 2: native controls only

The browser's own controls and nothing else, with no extra work and no automated check.

Pros:
- Nothing extra to build.
- Native controls already give a lot for free.

Cons:
- Errors are not announced, and focus is not moved to the result.
- Nothing checks it.

### Option 3: a full pass

Everything in Option 1, plus manual testing with a screen reader, a colour contrast review, and a written conformance statement against WCAG 2.2 level AA.

Pros:
- The strongest assurance.
- A real screen reader finds what automation misses.

Cons:
- Manual testing and a written statement take real time.
- Large for one small form.

## Decision

Option 1: the basics.

Four reasons decided it:

- It avoids Option 3's manual screen reader session, because most of the checking can be automated with role queries, accessibility tree snapshots and the axe check.
- It covers the places where this form commonly fails: the disabled dropdowns, the error messages and the page change.
- An automated check stops it from regressing, and it is mostly attributes and little code.
- Accessibility is part of user experience, which the task puts ahead of polish.

The strongest alternative is Option 2, which has nothing extra to build but leaves errors and focus unmanaged.

## Consequences

- Every control has a label tied to it, and the whole form works from the keyboard with a visible focus outline. The outline is never removed in the stylesheet.
- A disabled dropdown shows a short visible reason, so keyboard and screen reader users know what to do first.
- An error message is linked to its input and announced to screen readers. Focus moves to the first input with an error.
- After a successful send, focus moves to the result page heading, which is announced.
- The rendered tests find controls by their role and label, and the Playwright test checks the page's accessibility tree and runs the axe check.
- An automated check finds only some problems, and no manual screen reader session is done. The README says so, and lists a manual session as a next step.
