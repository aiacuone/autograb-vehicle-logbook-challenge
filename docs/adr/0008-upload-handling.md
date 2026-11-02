# 0008. Upload handling

Status: draft, awaiting owner review

## Context

The user picks a make, model and badge and uploads their service logbook as a plain text file. The form posts to the server, which answers with the make, model, badge and the logbook text ([0007](0007-result-page-and-saved-results.md)). The question is how the Express server ([0002](0002-server-framework.md)) receives the file together with the three choices.

Facts that shaped the choice:

- The task sets no size for the logbook. A typical service logbook is expected to be 20 to 40 short lines, a few kilobytes, and nothing is stored after the reply, so the server needs only the file's text.
- Every approach below can enforce a size cap. They differ in how much code it takes and how closely the request matches a normal file upload.
- The shared `zod` schemas ([0003](0003-shared-types-and-validation.md)) can check the make, model and badge. The end-to-end test ([0006](0006-testing-approach.md)) covers the upload from the page to the server.

## Options considered

### Option 1: multer with memory storage

The browser sends a standard multipart form with the three choices and the file. multer reads it and hands the server the file's bytes held in memory.

Pros:
- It is the standard Express middleware for file uploads, widely known, with a built-in size limit and file filter.
- The file arrives in memory, so nothing is written to disk and there is nothing to clean up.
- Server tests attach a file with supertest in one line.

Cons:
- multer sets no size limit unless one is configured, so a cap is required to keep the whole file from filling memory.
- The make, model and badge arrive as strings, so they need a separate check with the shared schema.

### Option 2: busboy directly

The same multipart upload, read by our own code as a stream.

Pros:
- Fine control, and the server can stop reading as soon as a file passes the cap.
- One layer fewer than multer, which is built on busboy.

Cons:
- More code to write and explain: chunks, events for fields, the file, the limit being hit, finishing and errors.
- A missed error case can leave a request hanging.

### Option 3: the file's text inside a JSON body

The browser reads the file and sends its text in a JSON body together with the three choices.

Pros:
- One shared schema can check the whole request.
- No upload library, and the simplest tests, since a test sends a normal JSON body.

Cons:
- It does not use the usual file-upload encoding, so a reviewer may ask why, and the file's name and type are not sent as file information.
- Express limits a JSON body to about 100 KB by default, and the limit covers the whole request, so a larger logbook needs the setting raised.

## Decision

Option 1: multer with memory storage.

Two reasons decided it:

- Memory storage means files are never written to disk, so there is nothing to clean up if an error or crash happens between saving and deleting.
- It is the closest to a normal file upload, which is how the task describes sending the logbook.

The strongest alternative is Option 3, which is simpler and lets one shared schema check the whole request, but does not use the usual file-upload encoding.

The settings are:

- **Size cap: 3 MB.** A typical logbook is a few kilobytes, so the cap sits far above a normal file and only stops very large ones.
- **Accepted files: any file whose content is valid UTF-8 text with no binary bytes.** The file name is not checked. The file picker suggests `.txt` and `.log` but does not enforce them.

Two reasons decided the file types:

- Accepting text files of different types causes no problems, because the server reads them all the same way. A file in a binary format, such as an image or PDF, is rejected by the content check whatever its name.
- A logbook may not be named `.txt`, whether it is a user's file or a reviewer's test file, and a rule on the name would reject it.

The alternatives were `.txt` only by name plus the content check, and the browser's type label alone with no content check. The file name and the type label both come from the client, so only the content check protects the server.

## Consequences

- A size cap must be set on multer. Without it a very large file would be loaded into memory.
- The server checks the file's content: bytes that are not valid UTF-8 text, or that contain binary bytes, are rejected with an error message that says only plain text is accepted. A text file in another encoding, such as UTF-16, is rejected the same way.
- The file is never saved or run, and the page shows its text as plain text and never as HTML.
- A file over the cap is rejected: nothing is uploaded, the server answers with an error, and the client shows a message and keeps the user's selections. The wording and shape of that answer belong to the API error handling decision.
- The make, model and badge arrive as form fields, so they are checked with the shared schema as a separate step from the file.
- Server tests use supertest to attach a file, and one test sends a file over the cap.
- If the server later stores uploads, the storage choice is revisited, since memory storage keeps nothing after the request.
