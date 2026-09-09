# JAXIS — Module 08: Expert Assignment & Workload

**Module Code:** `08-assignment`\
**Domain:** Assignment\
**Depends On:** `07-payments`, `02-staff`\
**Blocks:** `09-messaging`, `10-analysis`, `13-defenselab`

---

## 1. Module Identity

- **Primary Objective:** Admin assigns a Statistician and Senior QA Lead to an active, paid project. The SLA timer starts at the moment of assignment. Admin can reassign in extreme cases (original Expert payout voided on reassignment).
- **Core Responsibilities:** `Assignment` model, SLA timer (start, pause, resume), workload capacity view, reassignment logic, 24-hour pre-deadline alert.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `ASN-F01` | **Expert assignment** — Admin assigns one Statistician + one QA Lead to an active project |
| `ASN-F02` | **SLA timer start** — `sla_start_at` = assignment timestamp; `sla_due_at` computed from turnaround days |
| `ASN-F03` | **Specialization suggestion** — System ranks available statisticians by specialization match + open workload count (read-only suggestion; Admin decides) |
| `ASN-F04` | **Workload capacity view** — Admin sees each Statistician's active project count and current assignments |
| `ASN-F05` | **Reassignment** — Admin can reassign; original Expert payout record → `VOIDED`; SLA continues from current point |
| `ASN-F06` | **SLA pause** — Statistician requests pause (client delay); Admin approves; `sla_paused_at` set |
| `ASN-F07` | **SLA resume** — Admin resumes; elapsed pause time excluded from SLA calculation |
| `ASN-F08` | **24-hour pre-deadline alert** — In-app badge on Admin desk when `sla_due_at - now() <= 24 hours` |
| `ASN-F09` | **Statistician workload view** — Statistician sees own assigned projects with SLA countdown |
| `ASN-F10` | **Holiday exclusion** — SLA calculator excludes `PhilippineHoliday` records from turnaround count |
| `ASN-F11` | **Leave-aware capacity pool & visual dimming** — Specialists on leave (`ON_LEAVE`) are displayed in the assignment selector as greyed-out (`opacity-40 cursor-not-allowed`) with expected return dates and unavailable status |
| `ASN-F12` | **Assignment & reassignment safety guards** — Auto-selection skips on-leave staff; `assignExperts` and `reassignExperts` enforce backend conflict validation rejecting assignment attempts if the chosen specialist is `ON_LEAVE` |
| `ASN-F13` | **Burnout risk assessment & workload balancing** — Workload telemetry evaluates open runs, overdue states, and active turnaround stress to surface burnout warning badges |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Statistician declining an assignment | Not in scope — Experts submit interest before selection; they cannot decline once assigned |
| Automatic Expert selection | System suggests but Admin always makes the final decision |
| SLA breach auto-action | Admin is alerted; no automated project cancellation or penalty |
| Email for 24-hour alert | Module 16 (Notifications) |



---

## 3. Database Schema

```prisma
model Assignment {
  id             String    @id @default(cuid())
  projectId      String    @unique // One active assignment per project
  statisticianId String
  qaLeadId       String
  assignedBy     String    // Admin userId
  assignedAt     DateTime  @default(now())

  // SLA fields
  slaStartAt     DateTime
  slaDueAt       DateTime
  slaPausedAt    DateTime?
  slaResumedAt   DateTime?
  slaPauseReason String?
  slaPausedBy    String?   // Statistician userId who requested pause
  slaApprovedBy  String?   // Admin userId who approved pause

  // Reassignment tracking
  isActive       Boolean   @default(true)
  reassignedAt   DateTime?
  reassignedBy   String?
  reassignReason String?

  project      Project @relation(fields: [projectId], references: [id])
  statistician User    @relation("StatAssignments", fields: [statisticianId], references: [id])
  qaLead       User    @relation("QAAssignments", fields: [qaLeadId], references: [id])

  @@index([projectId])
  @@index([statisticianId])
  @@index([qaLeadId])
  @@index([slaDueAt])
  @@map("assignments")
}

// Assignment history — new row on each reassignment
model AssignmentHistory {
  id             String   @id @default(cuid())
  projectId      String
  statisticianId String
  qaLeadId       String
  assignedAt     DateTime
  reassignedAt   DateTime
  reason         String
  payoutVoided   Boolean  @default(true)

  @@index([projectId])
  @@map("assignment_histories")
}

model PhilippineHoliday {
  id        Int      @id @default(autoincrement())
  date      DateTime @unique
  name      String
  type      HolidayType

  @@index([date])
  @@map("philippine_holidays")
}

enum HolidayType {
  REGULAR
  SPECIAL_NON_WORKING
}
```

### SLA Calculation

```ts
// src/lib/sla-calculator.ts
export async function computeSlaDueDate(startAt: Date, turnaroundDays: number): Promise<Date> {
  const holidays = await db.philippineHoliday.findMany({
    where: { date: { gte: startAt } },
    select: { date: true },
  });
  const holidayDates = new Set(holidays.map(h => h.date.toDateString()));

  let daysAdded = 0;
  let current = new Date(startAt);

  while (daysAdded < turnaroundDays) {
    current.setDate(current.getDate() + 1);
    if (!holidayDates.has(current.toDateString())) {
      daysAdded++;
    }
  }
  return current;
}
```

---

## 4. API Routes & Server Actions

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/assignments` | ADMIN, CEO | Assign Statistician + QA Lead; start SLA |
| `PATCH` | `/api/v1/assignments/:id/reassign` | ADMIN, CEO | Reassign; void original payout |
| `POST` | `/api/v1/projects/:id/pause-sla` | STATISTICIAN | Request SLA pause (requires Admin approval) |
| `POST` | `/api/v1/projects/:id/approve-sla-pause` | ADMIN, CEO | Approve SLA pause |
| `POST` | `/api/v1/projects/:id/resume-sla` | ADMIN, CEO | Resume SLA timer |
| `GET` | `/api/v1/assignments/my-workload` | STATISTICIAN | Own assigned projects with SLA countdowns |
| `GET` | `/api/v1/assignments/capacity` | ADMIN, CEO | All Statisticians with assignment counts |

---

## 5. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Assignment Panel | `/dashboard/admin/assignments` | Admin, CEO | Project list (active, unassigned) + Statistician roster with capacity bars + assign form |
| Workload | `/dashboard/statistician` | Statistician | Assigned projects table with SLA countdown timer |
| Pre-deadline Alert Badge | Admin topbar / admin home | Admin | In-app badge for projects within 24 hrs of SLA |

---

## 6. Seed Data Requirements

```ts
const seedAssignment = {
  projectIntakeId: 'JAXIS-202608-0001',
  statisticianEmail: 'stat@jaxis.dev',
  qaLeadEmail:       'qa@jaxis.dev',
  assignedAt:        new Date('2026-08-12T08:00:00Z'),
  slaDueAt:          new Date('2026-08-17T08:00:00Z'), // 5-day turnaround
};

const seedHolidays = [
  { date: new Date('2026-08-21'), name: "Ninoy Aquino Day", type: 'REGULAR' },
  { date: new Date('2026-08-31'), name: "National Heroes Day", type: 'REGULAR' },
  { date: new Date('2026-12-25'), name: "Christmas Day", type: 'REGULAR' },
];
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Expert Assignment:** Admin can assign a primary Statistician and Senior QA Lead to an active paid project.
- [x] **SLA Countdown Timer:** System automatically calculates and initiates `slaDueAt` based on agreed turnaround days, excluding Philippine holidays.
- [x] **Specialization & Workload Matching:** System surfaces recommendations matching the project's statistical tests against staff specialization and current load.
- [x] **Leave-Aware Capacity Pool:** Specialists on leave are clearly displayed as greyed-out with return dates and are excluded from assignment selection.
- [x] **Burnout Risk Assessment:** Workload capacity displays active studies count and burnout warnings for specialists nearing capacity limits.
- [x] **Statistician Workbench Population:** Assigned project automatically appears on the Statistician and QA Lead's active workbenches.
- [x] **SLA Pause & Resume Lifecycle:** Statistician can request an SLA freeze for client document delays; Admin can approve pause and resume timers.
- [x] **Reassignment Protocol:** Admin can reassign project in emergency scenarios; original expert payout is voided and SLA timeline persists.


## 7. Acceptance Criteria (Done Checklist)

### Assignment & Capacity
- [x] Admin can assign Statistician + QA Lead to an `ACTIVE` project
- [x] `slaStartAt` = `assignedAt`; `slaDueAt` computed correctly excluding holidays
- [x] Project status → `EXPERT_ASSIGNED` after assignment
- [x] Capacity pool returns Statisticians and QA Leads sorted by burnout risk, open workload, and match score
- [x] Specialists on leave (`ON_LEAVE`) are rendered disabled/greyed-out with `IconCalendarOff` and unavailable badge
- [x] Pre-selection logic automatically bypasses on-leave specialists
- [x] `assignExperts` and `reassignExperts` throw error if chosen expert is `ON_LEAVE`

### Reassignment
- [x] Admin can reassign → new Assignment record created; old marked `isActive = false`
- [x] `AssignmentHistory` record created with `payoutVoided = true`
- [x] Reassignment modal provides quick reason templates and records justification

### SLA & Telemetry
- [x] SLA pause requested by Statistician → pending Admin approval
- [x] Admin approves pause → `slaPausedAt` set; timer suspended
- [x] Admin resumes → `slaResumedAt` set; `slaDueAt` recalculated to exclude pause duration
- [x] Projects within 24 hours of `slaDueAt` show pre-deadline badge on Admin desk

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean
