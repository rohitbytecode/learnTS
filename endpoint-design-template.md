# Feature: [HTTP_METHOD] [PATH]
(example: POST /patients    or   GET /appointments/:id/records)

## Goal in one sentence
One clear sentence what this endpoint is supposed to achieve.

## Actors & Permissions
- Must be authenticated? (yes/no)
- Allowed roles: … (ADMIN, MANAGER, DOCTOR, PATIENT, …)
- Any other restrictions? (same tenant, same organization, owner of resource, rate-limited, …)
- impersonation / switch-tenant allowed? (yes/no/rarely)

## Inputs
- Path params: …
- Query params: … (with whether required or optional)
- Request body: … (main shape or DTO name)
- Headers: … (Authorization, If-Match, etc.)
- Files / multipart? (yes/no)

## Success output
- Status code: …
- Response body shape: … (or "204 No Content", "stream", etc.)
- Important headers returned: …

## Main happy path (sequential steps – write before any code)
1. 
2. 
3. 
4. 
5. 
…

## Edge cases & unhappy paths (list them explicitly – this section prevents most production surprises)
- 
- 
- 
- 
- 
- Authorization related:
- Validation / format related:
- Not found cases:
- Concurrency / race condition cases:
- Database / infrastructure failure cases:
- Already done / invalid state cases:
- Soft-delete leakage / visibility cases:

## Security & tenant isolation checklist
- [ ] Every database query/filter includes tenantId (or equivalent isolation key)
- [ ] No tenantId = global access possible
- [ ] Cannot see/modify/delete records from other tenants even with UUID guess
- [ ] Role/permission check happens after tenant isolation (defense in depth)

## Open questions / important decisions / trade-offs
- Soft-delete vs hard-delete vs archived status?
- Do we need audit trail / who-deleted / deletion-reason field?
- Should this action emit a domain event? (PatientDeleted, AppointmentCancelled, …)
- Idempotency support needed? (idempotency-key header)
- Rate limiting / throttling needed? (especially destructive actions)
- Transaction required? (multiple writes, FK constraints, audit + main table…)
- Optimistic locking? (ETag / version field check)
- Should we return the updated/deleted entity (204 vs 200 + body)?
- Any cascading deletes/updates triggered?
- Any background jobs triggered? (cleanup, notifications, …)
- Any PII / sensitive data being permanently removed → compliance impact?

## Notes / references
- Related endpoints: …
- Link to ADR / decision record: …
- Link to DB schema / entity diagram: …

## All needs to be saved inside /docs