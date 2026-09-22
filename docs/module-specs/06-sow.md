# JAXIS — Module 06: SOW Generation & Signing

**Module Code:** `06-sow`\
**Domain:** Contract\
**Depends On:** `05-quotation`\
**Blocks:** `07-payments`

---

## 1. Module Identity

- **Primary Objective:** Admin generates a legally-binding Statement of Work after client accepts the quote. The client signs via typed full name. Once signed, the SOW and its scope are permanently locked — no modifications are possible under any circumstance.
- **Core Responsibilities:** `SOW` immutable snapshot model, PDF generation, typed-name signing, `is_locked` enforcement, supplemental SOW flow.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `SOW-F01` | **SOW generation** — Admin generates SOW from accepted quotation; content auto-populated |
| `SOW-F02` | **Content snapshot** — SOW content stored as immutable JSON snapshot at generation time (no live FK references) |
| `SOW-F03` | **SOW content fields** — Client info, research title, package, scope of work, deliverables, price, turnaround time, liability/boundary terms |
| `SOW-F04` | **Client review** — Client views full SOW before signing |
| `SOW-F05` | **Typed-name signing** — Client types full name → `is_locked = true`, `signed_at` set, project → `SOW_SIGNED` |
| `SOW-F06` | **Immutability enforcement** — Any API mutation on a locked SOW returns 403 `SOW_LOCKED` |
| `SOW-F07` | **PDF generation** — SOW PDF generated server-side via `@react-pdf/renderer`; downloadable by Client and Admin after signing |
| `SOW-F08` | **Supplemental SOW** — For scope changes or out-of-scope revisions; references a new/supplemental quotation |
| `SOW-F09` | **Admin SOW viewer** — Admin can view signed SOW content and download PDF at any time |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Digital certificate / legally-recognized e-signature | Future enhancement; typed name is the MVP approach per scope |
| SOW edit after signing | Prohibited absolutely — no bypass, no admin override |
| Auto-generation without Admin trigger | Admin must explicitly generate; no auto-fire on quote acceptance |
| Payment processing | Module 07 |



---

## 3. Database Schema

```prisma
model SOW {
  id              String   @id @default(cuid())
  projectId       String   @unique  // One SOW per project (supplemental = new record with type flag)
  sowType         SOWType  @default(PRIMARY)
  parentSowId     String?  // For supplemental SOWs: references primary SOW id

  // Immutable snapshot fields (denormalized at generation time)
  contentSnapshot Json     // Full SOW content: client info, scope, price, terms
  packageName     String
  totalAmount     Decimal  @db.Decimal(10, 2)
  downpaymentRequired Decimal @db.Decimal(10, 2)
  turnaroundDays  Int
  addOns          String[] // Add-on names included

  // Signing
  isLocked        Boolean  @default(false)
  signedByName    String?  // Client typed name
  signedAt        DateTime?
  signedByUserId  String?

  // Generation
  generatedBy     String   // Admin userId
  generatedAt     DateTime @default(now())
  pdfPath         String?  // R2/S3 path after PDF is generated

  project Project @relation(fields: [projectId], references: [id])

  @@index([projectId])
  @@index([isLocked])
  @@map("sows")
}

enum SOWType {
  PRIMARY
  SUPPLEMENTAL
}
```

### Locking Enforcement

```ts
// src/lib/sow-rules.ts
export async function assertSOWUnlocked(sowId: string): Promise<void> {
  const sow = await db.sOW.findUnique({ where: { id: sowId }, select: { isLocked: true } });
  if (sow?.isLocked) {
    throw new ApiError('SOW_LOCKED', 'This Statement of Work has been signed and cannot be modified.', 403);
  }
}
```

---

## 4. API Routes & Server Actions

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/sow/generate` | ADMIN, CEO | Generate SOW from accepted quotation |
| `POST` | `/api/v1/sow/generate-supplemental` | ADMIN, CEO | Generate supplemental SOW for scope change |
| `GET` | `/api/v1/sow/:projectId` | CLIENT, ADMIN, CEO | Get SOW for project |
| `POST` | `/api/v1/sow/:id/sign` | CLIENT | Sign SOW with typed name |
| `GET` | `/api/v1/sow/:id/pdf` | CLIENT, ADMIN, CEO | Download PDF (post-sign only) |

### Zod Schemas

```ts
export const SignSOWSchema = z.object({
  typedFullName: z.string().min(2).max(100),
  // Must match client's registered fullName (validated server-side)
});

export const GenerateSOWSchema = z.object({
  projectId:   z.string().cuid(),
  quotationId: z.string().cuid(),
  customTerms: z.string().max(2000).optional(),
});
```

### SOW Content Snapshot Structure

```ts
type SOWContentSnapshot = {
  client: {
    fullName:        string;
    email:           string;
    institution:     string;
    academicProgram: string;
    contactNumber:   string;
  };
  project: {
    intakeId:           string;
    researchTitle:      string;
    researchObjectives: string;
  };
  commercial: {
    packageName:        string;
    addOns:             string[];
    totalAmount:        number;
    downpaymentRequired: number;
    paymentMethod:      string; // "GCash or Bank Transfer"
  };
  delivery: {
    turnaroundDays:  number;
    slaStartTrigger: string; // "SLA starts after Expert assignment"
  };
  terms: {
    revisionPolicy:    string;
    refundPolicy:      string;
    communicationPolicy: string;
    liabilityBoundary: string;
  };
  generatedAt: string; // ISO timestamp
};
```

---

## 5. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| SOW Viewer + Sign | `/dashboard/client/projects/:id/sow` | Client | Full SOW content, typed-name input, sign button |
| SOW Admin View | `/dashboard/admin/projects/:id/sow` | Admin, CEO | Generate button (pre-sign) / locked SOW viewer + PDF download (post-sign) |

---

## 6. Seed Data Requirements

```ts
const seedSOW = {
  projectIntakeId: 'JAXIS-202608-0001',
  packageName:     'JX_03_CORE',
  totalAmount:     2800.00,
  turnaroundDays:  5,
  addOns:          ['RUSH'],
  isLocked:        true,
  signedByName:    'Ana Cruz',
  signedAt:        new Date('2026-08-10T09:30:00Z'),
};
```

---

### 🎯 Expected Output (What you should be able to do now)

- [ ] **SOW Contract Compilation:** Admin can generate a formal Scope of Work contract containing an immutable JSON content snapshot.
- [ ] **Client Digital Signing:** Client reviews legal terms, scope boundaries, and signs by typing their full legal name.
- [ ] **Permanent Scope Lock:** Signed SOW is locked (`isLocked = true`); all subsequent mutation attempts return 403 `SOW_LOCKED`.
- [ ] **Automated PDF Export:** Client and Admin can view and download the official signed SOW document as a branded PDF.
- [ ] **Transition to Payment Phase:** Signing transitions project to `SOW_SIGNED` / `AWAITING_PAYMENT`.


## 7. Acceptance Criteria (Done Checklist)

### Generation
- [ ] Admin can generate SOW for a project in `SOW_PENDING`
- [ ] SOW content snapshot contains all required fields (client info, project, commercial, delivery, terms)
- [ ] Content snapshot is stored as JSON — changes to related DB records do NOT affect the snapshot
- [ ] Admin cannot generate a SOW for a project not in `SOW_PENDING` → 422

### Signing
- [ ] Client can view full SOW content before signing
- [ ] Client signs by typing full name → `isLocked = true`, `signedAt` set, project → `SOW_SIGNED`
- [ ] Signed SOW: any PATCH/PUT on the SOW record → 403 `SOW_LOCKED`
- [ ] Client name validation: typed name must match registered `fullName` (case-insensitive)

### PDF
- [ ] PDF generated post-signing and stored in R2/S3
- [ ] PDF download returns 403 before signing (`isLocked = false`)
- [ ] PDF download returns signed URL after signing

### Supplemental SOW
- [ ] Admin can generate supplemental SOW referencing a new quotation
- [ ] Supplemental SOW has `sowType = SUPPLEMENTAL` and `parentSowId` set
- [ ] Supplemental SOW follows same immutability rules after client signing

### Quality Gates
- [ ] `npm run check-types` → 0 errors
- [ ] `npm run lint` → 0 warnings/errors
- [ ] `npm run build` → clean
