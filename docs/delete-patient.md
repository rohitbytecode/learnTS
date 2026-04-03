# Feature: DELETE /patients/:id

## Goal in one sentence

Delete one patient record. Only allowed for ADMIN/MANAGER of the same tenant.

## Actors & Permissions

- Caller must be authenticated
- Role: ADMIN or MANAGER
- Must belong to same tenant as the patient

## Inputs

- Path: id (UUID)
- Headers: Authorization

## Success output

- 204 No Content

## Main happy path (sequential steps, no code)

1. Extract bearer token → validate & decode → get userId, role, tenantId
2. Parse :id from path → validate UUID format
3. Start transaction (if soft-delete needs cascade or audit log)
4. Find patient WHERE id = :id AND tenantId = request.tenantId
   - if not found → 404
5. Check caller role
   - if not allowed → 403
6. Soft-delete: UPDATE patients SET deletedAt = NOW(), deletedBy = userId WHERE ...
   OR hard: DELETE FROM patients WHERE ...
7. (optional) Write audit log
8. Commit transaction
9. Return 204

## Edge cases & unhappy paths (be explicit)

- id not UUID → 400
- id missing → 400 (or 404 depending on your convention)
- patient not found → 404
- patient found but different tenant → 404 (security: pretend doesn't exist)
- caller not ADMIN/MANAGER → 403
- caller ADMIN but different tenant → 403 or 404?
- DB deadlock / timeout → 503 or retry?
- Already deleted (soft-delete) → 404 or 410 Gone?

## Open questions / trade-offs I need to decide

- Soft vs hard delete? (affects audits, recovery, FK constraints)
- Do we need reason field / deletedBy?
- Should we publish domain event "PatientDeleted"?
- Rate limit this endpoint?
