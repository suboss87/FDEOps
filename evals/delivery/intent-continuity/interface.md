# Local prototype interface
Implement `createWorkflow({ send })` exported by workflow.js (CommonJS). No dependencies. `send` is an injected async fake gateway accepting `{ draftId, recipient, text }`.

Return an object with:
- `createDraft({ id, recipient, text })`: store a new draft.
- `reviseDraft(id, text)`: change its text.
- `approveDraft(id, session)`: register a review of its current content.
- `sendDraft(id, request, session)`: inspect the stored draft and send if permitted. `request` is untrusted browser/model input; the trusted server session is a separate argument.

In this exercise an authorised session is `{ operatorId: <nonempty string>, canReview: true }`, supplied by the server-side caller. Authentication, persistence, concurrency and network delivery are outside the agreed prototype. Refuse prohibited operations by throwing or returning `{ status: 'blocked' }` before calling the gateway. Successful send resolves to `{ status: 'sent' }`. This return value describes fake-gateway execution only. IDs identify independent drafts. Use Node's built-in tests via `npm test`.
