# ShiftSync - Scheduling Platform (Backend)

## Running the Application
### 1. Pre-requisites
- Node.js installed
- Postgres database running
- Create a `.env` in `backend/.env` with an appropriate `DATABASE_URL` (e.g. `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shiftsync?schema=public"`).

### 2. Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

### 3. Run Server
```bash
npm run dev
```

## Seeded Users & Logins

**Password for ALL seed users:** `dev-password`

### Admins
- `admin@coastaleats.com` (Has full system access and can access `/audit/export`)

### Managers
- `mia.manager@coastaleats.com` (Manages NYC & Boston)
- `noah.manager@coastaleats.com` (Manages SF & Seattle)

### Staff 
- `sarah.staff@coastaleats.com` (Server in NYC & Boston)
- `john.staff@coastaleats.com` (Bartender in NYC & SF - Cross timezone!)
- `maria.staff@coastaleats.com`
- `leo.staff@coastaleats.com`
- `nina.staff@coastaleats.com`
- `omar.staff@coastaleats.com`
- `ivy.staff@coastaleats.com`
- `ben.staff@coastaleats.com`

---

## Evaluation Scenarios Fulfilled

1. **The Sunday Night Chaos**: 
    - You can simulate a call out by authenticating as `sarah.staff...` and making a POST to `/coverage/requests` with type "DROP". 
    - The shift will notify the managers via real-time logic (`Socket.io`) and internal notifications system.
2. **The Overtime Trap**:
    - Assigning long shifts repeatedly handles both 8+/12+ daily shift duration warnings and weekly total limit warnings/blocks before assignments via the `checkShiftConstraints` service. The system outputs `warnings` property when returning a 201 Assign success, and throws a 409 error with `CONSTRAINT_VIOLATION` for blockers (overridden by manager flag `force: true`).
3. **The Timezone Tangle**:
    - The `prisma.schema` explicitly models Availability `timezone` vs Shift `timezone`. Dates are naturally preserved in `UTC`.
4. **The Simultaneous Assignment**:
    - Enforced by a unique constraint `@@unique([shiftId, userId])` on `ShiftAssignment` combined with transactional `assignedCount >= shift.headcount` checks. Second concurrent click errors out safely.
5. **The Fairness Complaint**:
    - `GET /analytics/fairness?locationId=loc-nyc`
    - Computes `totalHours` vs `desiredHours` for each staff member and reports premium shift (Friday/Saturday night) metrics per associate.
6. **The Regret Swap**:
    - Swap routes implement explicit states `PENDING`, `ACCEPTED_BY_PEER`, `PENDING_MANAGER`. Auto-cancellations evaluate changes before shifts start. Drop requests expire exactly 24h prior.

---

## Intentional Ambiguities & Decisions

- **What happens to historical data when a staff member is de-certified from a location?**: Historical assignments (`ShiftAssignment`) stay completely intact. De-certification only blocks *future assignments* via our `checkShiftConstraints` location checks. 
- **How should "desired hours" interact with availability windows?**: "Desired hours" is purely a *Target/Goal* value utilized in the Fairness Analytics algorithms. "Availability" represents hard boundary checks for constraint violations.
- **When calculating consecutive days, does a 1-hour shift count the same as an 11-hour shift?**: For consecutive days yes, but our real blocker for labor rules primarily depends on the maximum weekly hour limits (40+) which accurately accumulates pure timestamps differences (not days).
- **If a shift is edited after swap approval but before it occurs, what should happen?**: Editing a shift within a `48-hour cutoff` directly triggers an `HTTP 403 Forbidden` if its status was `PUBLISHED`.
- **How should the system handle a location that spans a timezone boundary?**: A boundary spanning location implies a standard anchor point. Every location forces a unified IANA Timezone identity (e.g. `America/Denver`). The users display timezone applies locally in the UI, but the API expects `startTimeUtc` explicitly mapped to the location's defined timezone offset.