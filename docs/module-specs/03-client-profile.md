# JAXIS — Module 03: Client Profile & Account

**Module Code:** `03-client-profile`\
**Domain:** Client Management\
**Depends On:** `01-auth`\
**Blocks:** `04-intake` (profile completion gate enforced before project submission)

---

## 1. Module Identity

- **Primary Objective:** After self-registration, clients complete their academic/research profile. Profile completion is enforced server-side before a project can be submitted. Clients can update their profile at any time.
- **Core Responsibilities:** `ClientProfile` model, profile completion gate, client dashboard home shell, profile form, Admin read-only profile access on project detail.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `CLT-F01` | **Client profile creation** — Client completes profile after registration (institution, academic program, contact number, region) |
| `CLT-F02` | **Profile update** — Client can update all profile fields at any time |
| `CLT-F03` | **Profile completion gate** — `isProfileComplete` boolean enforced server-side; incomplete profiles cannot call `POST /api/v1/projects` |
| `CLT-F04` | **Incomplete profile banner** — Persistent sidebar banner shown until profile is complete |
| `CLT-F05` | **Client dashboard home** — Landing page after login: profile status card + project list stub + CTA to complete profile or submit project |
| `CLT-F06` | **Admin read access** — Admin/CEO can view client profile on project detail (read-only) |
| `CLT-F07` | **Profile data on session** — `isProfileComplete` surfaced in auth session for gate checks |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Admin editing client profiles | Admin should only view. Modules 04/05 use the data read-only. |
| Complex multi-step onboarding | Single-page form is sufficient. |
| Project submission | Module 04 (`04-intake`) |
| Client account deletion | Module 17 (`17-reporting` archive sub-domain handles data deletion requests) |
| Multiple clients on one project | Out of MVP — only the account creator is authorized communicator (per `scope.md` §3) |
| Client role management | Clients cannot be promoted to staff roles |

### 🎯 Expected Output (What you should be able to do now)

- [x] **Client Profile Creation & Editing:** Client can enter and update their institutional details (school/institution, academic program, contact number, region) at `/dashboard/client/profile`.
- [x] **Profile Completion Gate:** Server-side gate verifies `isProfileComplete` status; incomplete profiles are blocked from creating new research projects.
- [x] **Profile Completion Banner:** Persistent visual banner on the client dashboard nudging users with incomplete profiles to finish setup.
- [x] **Client Dashboard Home Shell:** Client lands on customized workbench with profile overview, project summary, and primary call-to-actions.
- [x] **Admin Read-Only Inspection:** Admin can view client academic profile data on project detail views and intake evaluations.

#### QA Verification Guide:
1. **See the Warning Banner**: If you log in as a new Client (or `client@jaxis.dev` with an empty profile), you should see a persistent warning banner in the dashboard sidebar telling you to complete your profile.
2. **Access the Profile Form**: Navigate to `/dashboard/client/profile` and enter institutional affiliation details (School, Program, Phone, Region).
3. **Save and Remove Banner**: Filling out the form and clicking **"SAVE PROFILE SETTINGS"** updates your profile, displays a success toast, and removes the incomplete profile warning banner.
4. **See Profile Status KPI**: On the main `/dashboard/client` page, you should see a card showing your Profile Status as verified and complete.
5. **Route Protection Gate**: Attempting to create a new project at `/dashboard/client/projects/new` with an incomplete profile redirects back to the profile setup page.



---

## 3. Database Schema

```prisma
model ClientProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  institutionSchool String
  academicProgram String
  contactNumber   String
  region          String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("client_profiles")
}
```

### Computed Property (application layer)

```ts
export function isProfileComplete(profile: ClientProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.institutionSchool &&
    profile.academicProgram &&
    profile.contactNumber &&
    profile.region
  );
}
```

---

## 4. API Routes & Server Actions

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/client/profile` | CLIENT | Create profile (one per user; 409 if exists) |
| `PATCH` | `/api/v1/client/profile` | CLIENT | Update own profile fields |
| `GET` | `/api/v1/client/profile` | CLIENT | Get own profile |
| `GET` | `/api/v1/admin/clients/:userId/profile` | ADMIN, CEO | View client profile (read-only) |

### Zod Schema

```ts
export const ClientProfileSchema = z.object({
  institutionSchool: z.string().min(2).max(255),
  academicProgram:   z.string().min(2).max(255),
  contactNumber:     z.string().min(7).max(20),
  region:            z.string().min(2).max(100),
});
```

### Profile Completion Gate (Server Action)

```ts
// Used by Module 04 before allowing project creation
export async function assertProfileComplete(userId: string): Promise<void> {
  const profile = await db.clientProfile.findUnique({ where: { userId } });
  if (!isProfileComplete(profile)) {
    throw new Error('PROFILE_INCOMPLETE');
  }
}
```

---

## 5. Page Views

| Page | Route | Description |
|---|---|---|
| Client Dashboard Home | `/dashboard/client` | Profile completion card + project list stub (empty state) + CTA |
| Profile Form | `/dashboard/client/profile` | Create/edit form with all required fields |

---

## 6. Seed Data Requirements

```ts
// One ClientProfile for the seed client user
const seedClientProfile = {
  email:            'client@jaxis.dev',
  institutionSchool: 'University of the Philippines Diliman',
  academicProgram:  'Master of Science in Statistics',
  contactNumber:    '+639171234567',
  region:           'Metro Manila',
};
```

---

## 7. Acceptance Criteria (Done Checklist)

### Profile Creation & Update
- [x] Client can create profile with all required fields → `ClientProfile` row created
- [x] Client can update any profile field → `updatedAt` refreshed
- [x] Creating a second profile returns 409 (one profile per user enforced)
- [x] Missing required fields returns 422 with field-level errors

### Profile Gate
- [x] `POST /api/v1/projects` with incomplete profile returns 422 `PROFILE_INCOMPLETE` (gate enforcement — actual projects route in Module 04)
- [x] `isProfileComplete` returns `false` when any required field is blank
- [x] `isProfileComplete` returns `true` when all 4 fields are set

### UI
- [x] Incomplete profile banner renders in sidebar until profile is complete
- [x] Banner disappears after profile is completed
- [x] Client dashboard home renders correctly with profile status card
- [x] Profile form pre-fills existing values on update

### Admin Access
- [x] Admin can view client profile from project detail panel (Module 04 wires this)
- [x] Admin cannot edit client profile (read-only 403 on PATCH from admin session)

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean
