# Firestore Index Notes

These queries are used in the V3 Firebase integration and should be validated in the Firebase console:

- `users/{userId}/reports` ordered by `createdAt` (single-field index, auto-created).
- `users/{userId}/reports` filtered by `idempotencyKey` (single-field index, auto-created).

If future queries combine filters + ordering, add composite indexes in the Firebase console.
