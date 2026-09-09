# JAXIS — Module 13: DefenseLab Scheduling

**Module Code:** `13-defenselab`\
**Domain:** DefenseLab Add-on\
**Depends On:** `07-payments`, `08-assignment`\
**Blocks:** `14-finance`

---

## 1. Module Identity

- **Primary Objective:** Clients who purchased the DefenseLab add-on can schedule a mock panel defense session with a Senior Statistician. Payment must be verified before booking. The 12-hour rescheduling rule is enforced — client late rescheduling does not cancel the session. Recordings are uploaded by Admin and accessible post-completion.
- **Core Responsibilities:** `DefenseLabSession` model, booking with payment gate, 12-hour reschedule enforcement, completion and recording upload, penalty logging.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `DEF-F01` | **Session booking** — Client books session; DefenseLab add-on payment must be verified on the project |
| `DEF-F02` | **Hour-based pricing** — Multiple hours may be purchased; each creates a separate session record (₱250/hour) |
| `DEF-F03` | **12-hour reschedule rule** — Rescheduling requires ≥ 12 hours notice; violation triggers `NO_SHOW_CLIENT` or `RESCHEDULED` + penalty |
| `DEF-F04` | **Client late reschedule** — Notice < 12 hours: `NO_SHOW_CLIENT`; session proceeds as scheduled; no refund |
| `DEF-F05` | **Expert late reschedule** — Notice < 12 hours: `RESCHEDULED`; may trigger reassignment; Admin determines penalty |
| `DEF-F06` | **Session completion** — Admin marks session `COMPLETED` after it takes place |
| `DEF-F07` | **Recording upload** — Admin uploads recording (video file URL or cloud link) after session |
| `DEF-F08` | **Client recording access** — Client can access recording URL only after `status = COMPLETED` |
| `DEF-F09` | **Admin oversight** — Admin manages full session lifecycle: scheduling, rescheduling, penalty, recording |
| `DEF-F10` | **Penalty logging** — Expert penalty events logged with reason and determination |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Video conferencing integration (Zoom/Meet) | JAXIS provides scheduling only; tool is external and pre-agreed with client |
| Automatic recording upload | Admin manually uploads recording URL (link to external storage) |
| Client-to-Expert direct booking without Admin | Admin manages scheduling for all sessions |
| Multi-session group bookings | Each session is individual per project |



---

## 3. Database Schema

```prisma
enum DefenseLabStatus {
  SCHEDULED
  COMPLETED
  NO_SHOW_CLIENT
  RESCHEDULED
  CANCELLED
  PENALTY_APPLIED
}

model DefenseLabSession {
  id              String           @id @default(cuid())
  projectId       String
  clientId        String
  expertId        String           // Assigned Statistician
  scheduledAt     DateTime
  durationHours   Int              @default(1)
  amountPaid      Decimal          @db.Decimal(10, 2)  // durationHours × 250
  status          DefenseLabStatus @default(SCHEDULED)
  recordingUrl    String?
  completedAt     DateTime?

  // Reschedule tracking
  rescheduledAt   DateTime?
  rescheduleReason String?
  rescheduleBy    String?          // userId who requested reschedule
  penaltyApplied  Boolean          @default(false)
  penaltyReason   String?
  penaltyDeterminedBy String?     // Admin userId

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  project Project @relation(fields: [projectId], references: [id])
  client  User    @relation("ClientDefenseLab", fields: [clientId], references: [id])
  expert  User    @relation("ExpertDefenseLab", fields: [expertId], references: [id])

  @@index([projectId])
  @@index([expertId])
  @@index([scheduledAt])
  @@index([status])
  @@map("defense_lab_sessions")
}
```

---

## 4. Reschedule Rule Enforcement

```ts
// src/lib/defenselab-rules.ts
export function assertRescheduleEligible(session: DefenseLabSession, requestedAt: Date): {
  eligible: boolean;
  violation: 'CLIENT_LATE' | 'EXPERT_LATE' | null;
} {
  const hoursUntilSession =
    (session.scheduledAt.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);

  if (hoursUntilSession < 12) {
    return { eligible: false, violation: 'CLIENT_LATE' };
  }
  return { eligible: true, violation: null };
}

export function computeSessionAmount(hours: number): Decimal {
  return new Decimal(hours).mul(250);
}
```

---

## 5. API Routes

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/defenselab/book` | CLIENT | Book session (payment gate checked) |
| `PATCH` | `/api/v1/defenselab/:id/reschedule` | CLIENT, ADMIN | Reschedule (12-hour rule enforced) |
| `POST` | `/api/v1/defenselab/:id/complete` | ADMIN, CEO | Mark session complete |
| `POST` | `/api/v1/defenselab/:id/recording` | ADMIN, CEO | Upload recording URL |
| `PATCH` | `/api/v1/defenselab/:id/penalty` | ADMIN, CEO | Record expert penalty determination |
| `GET` | `/api/v1/defenselab/:projectId` | CLIENT, ADMIN, CEO | List sessions for project |
| `DELETE` | `/api/v1/defenselab/:id` | ADMIN, CEO | Cancel session (Admin only, with reason) |

### Booking Payment Gate

```ts
export async function assertDefenseLabPaid(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { quotations: { include: { lineItems: true } } },
  });
  const hasDefenseLabAddon = project?.quotations
    .flatMap(q => q.lineItems)
    .some(li => li.itemName === 'DEFENSELAB');

  if (!hasDefenseLabAddon) {
    throw new ApiError('DEFENSELAB_NOT_PURCHASED', 'DefenseLab add-on was not included in the project quote.', 403);
  }
  // Check payment is FULLY_PAID or has DefenseLab portion verified
}
```

### Zod Schema

```ts
export const BookSessionSchema = z.object({
  projectId:    z.string().cuid(),
  scheduledAt:  z.coerce.date().min(new Date()),
  durationHours: z.number().int().min(1).max(8),
});
```

---

## 6. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| DefenseLab Booking | `/dashboard/client/defenselab` | Client | Session list, book button, status badges, recording download link |
| Admin DefenseLab | `/dashboard/admin/defenselab` | Admin, CEO | Full session management: scheduling, status, reschedule, penalty, recording upload |

---

## 7. Seed Data Requirements

```ts
const seedDefenseLabSession = {
  projectIntakeId: 'JAXIS-202608-0001',
  clientEmail:     'client@jaxis.dev',
  expertEmail:     'stat@jaxis.dev',
  scheduledAt:     new Date('2026-08-20T10:00:00Z'),
  durationHours:   2,
  amountPaid:      500.00,
  status:          'COMPLETED',
  recordingUrl:    'https://drive.example.com/jaxis-defense-0001',
  completedAt:     new Date('2026-08-20T12:05:00Z'),
};
```

---

### 🎯 Expected Output (What you should be able to do now)

- [ ] **DefenseLab Session Booking:** Client with verified DefenseLab add-on payment can schedule a 1-on-1 mock oral defense rehearsal.
- [ ] **12-Hour Rescheduling Gate:** System enforces strict 12-hour minimum cancellation notice; late client reschedules are marked `NO_SHOW_CLIENT` without refund.
- [ ] **Session Completion Lifecycle:** Admin coordinates meeting platform details, moderates attendance, and marks session `COMPLETED`.
- [ ] **Recording & Rubric Access:** Admin uploads defense session recording and panel questions review; Client accesses recording post-session.


## 8. Acceptance Criteria (Done Checklist)

### Booking
- [ ] Client can book a session if DefenseLab add-on is paid and verified
- [ ] Client without DefenseLab add-on gets 403 `DEFENSELAB_NOT_PURCHASED`
- [ ] Session amount = `durationHours × ₱250` computed and stored

### Reschedule
- [ ] Reschedule with ≥ 12 hours notice → status → `RESCHEDULED`; new date stored
- [ ] Client reschedule with < 12 hours notice → status → `NO_SHOW_CLIENT`; session proceeds as originally scheduled; no time change
- [ ] Expert reschedule with < 12 hours notice → status → `RESCHEDULED`; Admin receives alert; penalty determination recorded

### Completion & Recording
- [ ] Admin marks session `COMPLETED`
- [ ] Admin uploads recording URL
- [ ] Client can access recording URL only after status = `COMPLETED`
- [ ] Client cannot access recording before completion → 403

### Penalty
- [ ] Expert penalty logged with reason and `penaltyDeterminedBy`
- [ ] `penaltyApplied = true` flag set on session

### Quality Gates
- [ ] `npm run check-types` → 0 errors
- [ ] `npm run lint` → 0 warnings/errors
- [ ] `npm run build` → clean
