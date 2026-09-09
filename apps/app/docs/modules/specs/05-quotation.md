# JAXIS — Module 05: Quotation & Pricing

**Module Code:** `05-quotation`\
**Domain:** Quotation\
**Depends On:** `04-intake`\
**Blocks:** `06-sow`

---

## 1. Module Identity

- **Primary Objective:** Admin evaluates a project under evaluation and builds a commercial proposal. Client reviews and accepts or declines. RULE_QUO_01 strictly enforced: only Admin/CEO may create or modify quotes.
- **Core Responsibilities:** `Quotation` + `QuotationLineItem` models, quote builder UI, client quote response, package and add-on pricing enforcement, quote expiration.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `QUO-F01` | **Quote draft creation** — Admin builds quote: package selection, add-ons, final price, downpayment amount, expiration date |
| `QUO-F02` | **Price range guardrails** — System enforces min/max for each package; Admin cannot set price below package minimum |
| `QUO-F03` | **Quote issuance** — Admin sends quote to client → `QUOTE_SENT` |
| `QUO-F04` | **Client quote review** — Client views quote details and may accept or decline |
| `QUO-F05` | **Client acceptance** — Client accepts → `CLIENT_APPROVED`; project → `SOW_PENDING` |
| `QUO-F06` | **Client decline** — Client declines → `QUOTE_DECLINED`; Admin may revise and reissue |
| `QUO-F07` | **Quote revision** — Admin can modify draft quote before sending; cannot modify after issuing |
| `QUO-F08` | **Quote expiration** — Unresponded quotes expire after 3 days; status → `QUOTE_EXPIRED` |
| `QUO-F09` | **RULE_QUO_01** — Only Admin/CEO can create/modify quotes; Statisticians → 403 |
| `QUO-F10` | **RULE_QUO_02** — JX-01 and JX-02 require 100% upfront: `downpaymentRequired = totalAmount` (enforced server-side) |
| `QUO-F11` | **Package change recommendation** — Admin can recommend different package; must communicate change and obtain client approval before issuing |
| `QUO-F12` | **Multiple packages** — Multiple packages may be added to one project as line items |
| `QUO-F13` | **Add-on restriction** — Add-ons cannot be purchased after project execution has started (`status >= ACTIVE`) |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| SOW generation | Module 06 |
| Payment processing | Module 07 |
| RULE_QUO_03 (scope creep requote) | Handled in Module 10 (Analysis Workbench) when Statistician flags scope creep |
| Premium / Validate packages | Future/out-of-MVP per `scope.md` §5 |



---

## 3. Database Schema

```prisma
enum PackageName {
  JX_01_DATACHECK
  JX_02_START
  JX_03_CORE
  JX_04_ADVANCED
}

enum AddOnName {
  DEFENSELAB
  RUSH
  EXPRESS
  EMERGENCY
}

enum QuotationStatus {
  DRAFT
  QUOTE_SENT
  CLIENT_APPROVED
  QUOTE_DECLINED
  QUOTE_EXPIRED
  SUPERSEDED   // When Admin creates revised quote
}

model Quotation {
  id                  String          @id @default(cuid())
  projectId           String
  packageName         PackageName
  basePrice           Decimal         @db.Decimal(10, 2)
  totalAmount         Decimal         @db.Decimal(10, 2)
  downpaymentRequired Decimal         @db.Decimal(10, 2)
  expiresAt           DateTime
  status              QuotationStatus @default(DRAFT)
  notes               String?
  createdBy           String          // Admin userId
  respondedAt         DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  project   Project          @relation(fields: [projectId], references: [id])
  lineItems QuotationLineItem[]

  @@index([projectId])
  @@index([status])
  @@map("quotations")
}

model QuotationLineItem {
  id          String   @id @default(cuid())
  quotationId String
  itemType    LineItemType
  itemName    String   // PackageName or AddOnName as string
  description String?
  amount      Decimal  @db.Decimal(10, 2)

  quotation Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)

  @@index([quotationId])
  @@map("quotation_line_items")
}

enum LineItemType {
  PACKAGE
  ADDON
}

// Package price guardrails (seeded in PayoutRateConfig or separate table)
model PackagePriceConfig {
  id          Int         @id @default(autoincrement())
  packageName PackageName @unique
  minPrice    Decimal     @db.Decimal(10, 2)
  maxPrice    Decimal?    @db.Decimal(10, 2) // null = no upper limit
  isUpfront   Boolean     @default(false) // true for JX-01, JX-02

  @@map("package_price_configs")
}
```

---

## 4. API Routes & Server Actions

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/quotations` | ADMIN, CEO | Create draft quote (RULE_QUO_01) |
| `PATCH` | `/api/v1/quotations/:id` | ADMIN, CEO | Modify draft quote (pre-send only) |
| `POST` | `/api/v1/quotations/:id/send` | ADMIN, CEO | Issue quote to client → `QUOTE_SENT` |
| `POST` | `/api/v1/quotations/:id/respond` | CLIENT | Accept or decline |
| `GET` | `/api/v1/quotations/:projectId` | ADMIN, CEO, CLIENT | Get quote for project |

### Zod Schemas

```ts
export const CreateQuotationSchema = z.object({
  projectId:          z.string().cuid(),
  packageName:        z.nativeEnum(PackageName),
  basePrice:          z.number().positive(),
  addOns:             z.array(z.object({
                        name: z.nativeEnum(AddOnName),
                        amount: z.number().positive(),
                      })).optional(),
  notes:              z.string().max(500).optional(),
  expiresInDays:      z.number().int().min(1).max(30).default(3),
});

export const RespondQuoteSchema = z.object({
  decision: z.enum(['ACCEPT', 'DECLINE']),
});
```

### Business Rule Validation

```ts
// RULE_QUO_02: JX-01 and JX-02 → 100% upfront enforced
const UPFRONT_PACKAGES: PackageName[] = ['JX_01_DATACHECK', 'JX_02_START'];
if (UPFRONT_PACKAGES.includes(data.packageName)) {
  quotation.downpaymentRequired = quotation.totalAmount; // always 100%
}
```

---

## 5. Package Price Reference

| Package | Price Range | Upfront Rule |
|---|---|---|
| JX-01 DataCheck | ₱1,000 fixed | 100% upfront |
| JX-02 Start | ₱1,500–₱1,800 | 100% upfront |
| JX-03 Core | ₱1,800–₱3,000 | Downpayment allowed |
| JX-04 Advanced | ₱3,000+ | Downpayment allowed |

| Add-on | Price |
|---|---|
| DefenseLab | ₱250/hour |
| Rush | ₱300 |
| Express | ₱600 |
| Emergency | ₱1,000 |

---

## 6. Page Views

| Page | Route | Role | Description |
|---|---|---|---|
| Quote Builder | `/dashboard/admin/quotations` | Admin, CEO | Package selector, add-on checkboxes, price inputs, notes, send button |
| Quote Review | `/dashboard/client/projects/:id/quote` | Client | Quote details: package, add-ons, total, downpayment, expiry, accept/decline buttons |

---

## 7. Seed Data Requirements

```ts
const seedQuotation = {
  projectIntakeId:    'JAXIS-202608-0001',
  packageName:        'JX_03_CORE',
  basePrice:          2500.00,
  totalAmount:        2800.00, // base + Rush add-on
  downpaymentRequired: 1400.00, // 50% downpayment for Core
  addOns:             [{ name: 'RUSH', amount: 300.00 }],
  status:             'QUOTE_SENT',
};

// PackagePriceConfig seed
const packageConfigs = [
  { packageName: 'JX_01_DATACHECK', minPrice: 1000, maxPrice: 1000, isUpfront: true },
  { packageName: 'JX_02_START',     minPrice: 1500, maxPrice: 1800, isUpfront: true },
  { packageName: 'JX_03_CORE',      minPrice: 1800, maxPrice: 3000, isUpfront: false },
  { packageName: 'JX_04_ADVANCED',  minPrice: 3000, maxPrice: null, isUpfront: false },
];
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Admin Quotation Builder:** Admin can build itemized commercial quotes with statistical service packages (`JX-01`, `JX-02`, `JX-03`, `JX-04`) and add-ons (`DEFENSELAB`, `RUSH`).
- [x] **Pricing Guardrails:** Server enforces package minimum price floors and calculates required downpayment (100% upfront for `JX-01`/`JX-02`).
- [x] **Quote Issuance:** Admin issues quote transitioning project to `QUOTE_SENT` with 3-day validity window.
- [x] **Client Proposal Review:** Client views transparent price breakdown, terms, deliverables, and payment schedule.
- [x] **Quote Acceptance / Decline:** Client can accept (advances to `SOW_PENDING`) or decline with feedback for re-estimation.


## 8. Acceptance Criteria (Done Checklist)

### Quote Creation
- [x] Admin can create a draft quote for a project in `UNDER_EVALUATION`
- [x] Statistician attempting to create quote → 403 (RULE_QUO_01)
- [x] Price below package minimum → 422 validation error
- [x] JX-01 and JX-02 → `downpaymentRequired` auto-set to `totalAmount` regardless of Admin input (RULE_QUO_02)
- [x] Add-ons cannot be added to a project that is already `ACTIVE` or later

### Quote Lifecycle
- [x] Admin can issue quote → status `QUOTE_SENT`, project status → `QUOTE_SENT`
- [x] Admin cannot modify a quote after it has been sent (returns 403)
- [x] Client can accept → `CLIENT_APPROVED`, project → `SOW_PENDING`
- [x] Client can decline → `QUOTE_DECLINED`
- [x] Quote older than `expiresAt` auto-transitions to `QUOTE_EXPIRED` on read

### UI
- [x] Quote builder renders package selector with price range hints
- [x] Quote review page shows all line items, total, downpayment, expiry date
- [x] Accept/Decline buttons only visible when quote status is `QUOTE_SENT`

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean
