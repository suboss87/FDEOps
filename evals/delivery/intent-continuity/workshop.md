# Fictional workshop: support reply assistance
Approved for this local AI exercise. No real customer data, external services or production actions.

Source WORKSHOP-12, September 19. Sponsor Mira authorizes a local prototype to help support operators prepare replies. The aim is reducing drafting effort, but no baseline or measured saving exists. Operators remain responsible for outgoing replies. The approved capability is suggest → edit → approve → send; not autonomous messaging.

Operator owner Jo confirms that the support portal supplies authenticated operator identity server-side. For this prototype, a trusted session argument will represent that boundary; it must not come from the request body. Any authorised support operator may approve/send a draft. They approve the exact current content. Editing after approval requires another review before sending. An approval belongs to one draft, not every draft for that customer. A model confidence score cannot replace review. Customer recipient is fixed on the draft at creation and cannot be overridden at send. A trusted gateway sends the stored reply to that recipient.

Marketing participant Leon asks whether very confident drafts could be sent automatically to save a click. Mira explicitly defers that suggestion; WORKSHOP-12 is the current scope.

Prototype limits agreed: local, in-memory records and fake gateway only. No auth integration, persistence, model calls, concurrency, retries, deployment or claimed business result. The normal model/authoring process can supply draft text; this exercise implements the control path rather than a model. Do not add those deferred components. Missing production evidence stays missing.
