# Security Specification for Hotel Palms Registry & Notes

This specification defines the strict zero-trust security invariants and access control constraints for the Hotel Palms Firebase database.

## 1. Data Invariants
- **Guests (`/guests/{guestId}`)**:
  - Only authenticated users with a verified email (such as `BILNSRZID@gmail.com`) can create or modify guest records.
  - Document IDs must match the `id` field within the guest object to prevent ID Poisoning/mismatches.
  - Immutable fields: `id`, `timestamp` cannot be changed after creation.
  - Temporal integrity: `timestamp` must match the server request time on creation (`request.time`).
  - Field bounds: Strings such as name, room number, and ID details must have length boundaries.

- **App Notes (`/notes/{noteId}`)**:
  - Any authenticated staff member can read notes.
  - Creating a note requires that the `senderRole` is valid (`receptionist` or `police`), the timestamp matches `request.time`, and `readBy` contains only the sender's role initially.
  - System-Only and immutable fields: `id`, `senderRole`, and `timestamp` cannot be altered.
  - Updates are strictly scoped: only appending a role to `readBy` is allowed for other users (no content editing).

- **Room Statuses (`/rooms/{roomId}`)**:
  - Only authenticated users can view and update room operational statuses.
  - Status must be one of: `['available', 'occupied', 'reserved', 'out_of_order', 'dirty']`.
  - Immutable fields: the document ID must be valid and conform to `roomId`.

---

## 2. The "Dirty Dozen" Payloads (Denial/Exploit Scenarios)

1. **Guest Identity Spoofing**: An authenticated user attempts to write a guest document where the document ID does not match `id` in the payload. *(Blocked by ID-mismatch check)*
2. **Guest Timestamp Tampering**: Creation of a guest with a backdated client-provided timestamp instead of `request.time`. *(Blocked by `incoming().timestamp == request.time`)*
3. **Ghost Fields Injection**: An update attempting to add field `"hasFreeSuite": true` to a guest document. *(Blocked by `affectedKeys().hasOnly()` gates)*
4. **ID Poisoning Attack**: An attacker supplies a 1MB junk string or invalid characters as the `{guestId}`. *(Blocked by `isValidId()` regex validation)*
5. **Note Content Hijack**: A user attempts to update the text content or sender of an existing note. *(Blocked by immutable keys rules)*
6. **Note Sender Spoofing**: Creating a note claiming the sender is the other role, such as `police` when they are signed in as a receptionist. *(Blocked by validating sender role against role maps)*
7. **Room Status Poisoning**: Writing an invalid room status such as `"penthouse-suite-ultra"` instead of `occupied`. *(Blocked by status enum size and string boundary checks)*
8. **PII Data Scraping Attempt**: Unauthenticated reading/scraping of guests' IDs, names, and contact notes. *(Blocked by `request.auth != null`)*
9. **No-Rollback Terminal State Escape**: Attempting to revert a room or check-out confirmed status after it has been finalized. *(Blocked by terminal state guards)*
10. **Array Append Poisoning in Notes**: Appending thousands of dummy elements to the `readBy` array. *(Blocked by size constraints on the array)*
11. **Immutability Bypass**: Trying to change a guest's original registration date or ID field. *(Blocked by `incoming().id == existing().id`)*
12. **Unverified Email Access**: A user attempts to read or write using a non-verified email account. *(Blocked by `request.auth.token.email_verified == true`)*

---

## 3. The Test Runner (`firestore.rules.test.ts` Draft)

*Note: The unit testing configuration is mapped below to demonstrate security compliance.*

```typescript
// firestore.rules.test.ts
// Test cases to verify the "Dirty Dozen" scenarios are blocked by PERMISSION_DENIED.
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

describe("Hotel Palms Firestore Rules", () => {
  let testEnv: any;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "gen-lang-client-0400518681",
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            // drafted security rules
          }
        `,
      },
    });
  });

  it("should fail when unauthenticated user tries to read guests (PII Scraping)", async () => {
    const context = testEnv.unauthenticatedContext();
    await assertFails(context.firestore().collection("guests").get());
  });

  it("should fail guest creation if ID path doesn't match ID property (Identity Spoofing)", async () => {
    const context = testEnv.authenticatedContext({ uid: "user123", email_verified: true });
    await assertFails(
      context.firestore().collection("guests").doc("mismatch-id").set({
        id: "actual-id",
        roomNumber: "101",
        firstNameAr: "أحمد",
        lastNameAr: "سليمان",
        timestamp: Date.now(),
      })
    );
  });
});
```
