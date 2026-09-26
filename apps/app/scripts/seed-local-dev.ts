/**
 * LOCAL DEV DATA ONLY. Writes sample studies for a test client into the offline JSON stores
 * (.dev-projects.json, .dev-quotations.json, .dev-sows.json, dev_data/payments.json, .dev-alerts.json).
 *
 * It never connects to the database or file storage. The app only reads these files when the
 * database is unreachable, so view them with `npm run dev:offline`.
 *
 * Usage (from apps/app):  npm run seed:local-dev [-- client-email]   (default: client@jaxis.dev, Ana Cruz)
 * Re-running replaces the previous seed records (ids start with "seed_") and keeps everything else.
 */
import fs from "node:fs";
import path from "node:path";
import { buildSOWSnapshot } from "../src/lib/sow-rules";
import { PACKAGES_CATALOG, calculateQuotationTotals } from "../src/lib/pricing-rules";
import { DEV_USERS, type MockUser } from "../src/lib/mock-data/users.data";

const root = path.resolve(__dirname, "..");
const file = (name: string) => path.join(root, name);

type Json = Record<string, unknown>;
const read = (p: string): Json[] => {
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};
const write = (p: string, rows: Json[]) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + "\n", "utf-8");
};
const keepUnseeded = (rows: Json[]) => rows.filter((r) => !String(r.id ?? "").startsWith("seed_"));

// ── Pick the test client: built-in dev accounts plus locally registered ones (.dev-users.json) ──
const registered = (() => {
  try {
    return JSON.parse(fs.readFileSync(file(".dev-users.json"), "utf-8")) as Record<string, MockUser>;
  } catch {
    return {};
  }
})();
const allUsers = { ...DEV_USERS, ...registered };
const wanted = (process.argv[2] ?? "client@jaxis.dev").toLowerCase().trim();
const client = allUsers[wanted];
if (!client || client.role !== "CLIENT") {
  console.error(`No CLIENT dev account with email ${wanted}.`);
  process.exit(1);
}
const clientId = String(client.id);
const clientName = String(client.fullName ?? "Test Client");
const clientEmail = client.email;
const profile = {
  institutionSchool: "Central Mindanao University",
  academicProgram: "BS Psychology",
  contactNumber: "09171234567",
  region: "Northern Mindanao (Region X)",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString();

type Pkg = "JX_02_START" | "JX_03_CORE" | "JX_04_ADVANCED";

interface Seed {
  key: string;
  intakeId: string;
  title: string;
  status: string;
  pkg: Pkg;
  createdDaysAgo: number;
  dueInDays: number;
  addDefenseLab?: boolean;
  missingInfoReason?: string;
  quote?: "sent" | "approved";
  sow?: "pending" | "signed";
  paid?: "deposit" | "full";
  deliveredDaysAgo?: number;
}

const SEEDS: Seed[] = [
  {
    key: "review",
    intakeId: "JAXIS-202609-0061",
    title: "Social media use and academic procrastination among first-year college students",
    status: "NEW_REQUEST",
    pkg: "JX_03_CORE",
    createdDaysAgo: 0,
    dueInDays: 30,
  },
  {
    key: "info",
    intakeId: "JAXIS-202609-0055",
    title: "Teachers' digital readiness in public high schools of Valencia City",
    status: "AWAITING_INFORMATION",
    pkg: "JX_03_CORE",
    createdDaysAgo: 2,
    dueInDays: 25,
    missingInfoReason:
      "Please upload the final questionnaire (the version respondents answered) so we can match each item to your data.",
  },
  {
    key: "quote",
    intakeId: "JAXIS-202609-0051",
    title: "Customer satisfaction and loyalty in Maramag coffee shops",
    status: "QUOTE_SENT",
    pkg: "JX_03_CORE",
    createdDaysAgo: 3,
    dueInDays: 21,
    addDefenseLab: true,
    quote: "sent",
  },
  {
    key: "sign",
    intakeId: "JAXIS-202609-0048",
    title: "Nurses' work stress and job satisfaction in a provincial hospital",
    status: "SOW_PENDING",
    pkg: "JX_04_ADVANCED",
    createdDaysAgo: 5,
    dueInDays: 28,
    quote: "approved",
    sow: "pending",
  },
  {
    key: "pay",
    intakeId: "JAXIS-202609-0046",
    title: "Farmers' adoption of organic fertilizer in Bukidnon",
    status: "AWAITING_PAYMENT",
    pkg: "JX_03_CORE",
    createdDaysAgo: 6,
    dueInDays: 20,
    quote: "approved",
    sow: "signed",
  },
  {
    key: "analysis",
    intakeId: "JAXIS-202609-0042",
    title: "Study habits, sleep, and GWA among Grade 12 STEM students in Bukidnon",
    status: "IN_PROGRESS",
    pkg: "JX_03_CORE",
    createdDaysAgo: 12,
    dueInDays: 6,
    addDefenseLab: true,
    quote: "approved",
    sow: "signed",
    paid: "deposit",
  },
  {
    key: "delivered",
    intakeId: "JAXIS-202608-0017",
    title: "Financial literacy and saving habits of ABM students",
    status: "DELIVERED",
    pkg: "JX_02_START",
    createdDaysAgo: 20,
    dueInDays: -3,
    quote: "approved",
    sow: "signed",
    paid: "full",
    deliveredDaysAgo: 1,
  },
  {
    key: "closed",
    intakeId: "JAXIS-202607-0009",
    title: "Parental involvement and reading comprehension of Grade 4 pupils",
    status: "CLOSED",
    pkg: "JX_02_START",
    createdDaysAgo: 60,
    dueInDays: -40,
    quote: "approved",
    sow: "signed",
    paid: "full",
    deliveredDaysAgo: 42,
  },
];

// ── Build records ──────────────────────────────────────────────────────────────
const projects: Json[] = [];
const quotations: Json[] = [];
const sows: Json[] = [];
const payments: Json[] = [];

for (const s of SEEDS) {
  const id = `seed_proj_${s.key}`;
  const def = PACKAGES_CATALOG[s.pkg];
  const calc = calculateQuotationTotals({
    packageName: s.pkg,
    basePrice: def.defaultPrice,
    addOns: s.addDefenseLab ? [{ name: "DEFENSELAB" }] : [],
  });
  const pkg = { label: def.name, base: calc.basePrice, upfront: calc.isUpfrontEnforced };
  const addOnAmount = calc.addOnsTotal;
  const total = calc.totalAmount;
  const downpayment = calc.downpaymentRequired;
  const verifiedPaid = s.paid === "full" ? total : s.paid === "deposit" ? downpayment : 0;
  const questions =
    "1. What is the profile of the respondents?\n2. Is there a significant relationship between the main variables?\n3. Which factors significantly predict the outcome?";
  const objectives = "To describe the respondents and test how the main variables relate to the outcome.";

  projects.push({
    id,
    intakeId: s.intakeId,
    clientId,
    researchTitle: s.title,
    researchQuestions: questions,
    researchObjectives: objectives,
    hypotheses: "There is no significant relationship between the main variables and the outcome.",
    chapters13: null,
    questionnaire: null,
    deadlineRequested: iso(s.dueInDays),
    masterStatus: s.status,
    packageName: s.quote ? s.pkg : null,
    missingInfoReason: s.missingInfoReason ?? null,
    deliveredAt: s.deliveredDaysAgo !== undefined ? iso(-s.deliveredDaysAgo) : null,
    filesPurgeAt: s.deliveredDaysAgo !== undefined ? iso(90 - s.deliveredDaysAgo) : null,
    filesPurged: false,
    hasActiveDispute: false,
    hasPendingRefund: false,
    createdAt: iso(-s.createdDaysAgo),
    updatedAt: iso(-Math.max(0, s.createdDaysAgo - 1)),
    client: { id: clientId, fullName: clientName, email: clientEmail, clientProfile: profile },
    financialSummary: s.quote
      ? {
          totalAmount: total,
          downpaymentRequired: downpayment,
          verifiedPaid,
          remainingBalance: total - verifiedPaid,
          isDownpaymentCleared: verifiedPaid >= downpayment,
          isFullyPaid: verifiedPaid >= total,
        }
      : null,
    files: [
      {
        id: `${id}_file_data`,
        projectId: id,
        fileName: "survey-responses.xlsx",
        filePath: `seed/${id}/survey-responses.xlsx`,
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileCategory: "DATASET",
        uploadedAt: iso(-s.createdDaysAgo),
      },
      {
        id: `${id}_file_ch3`,
        projectId: id,
        fileName: "chapter-1-to-3.pdf",
        filePath: `seed/${id}/chapter-1-to-3.pdf`,
        fileType: "application/pdf",
        fileCategory: "RESEARCH_DOCUMENT",
        uploadedAt: iso(-s.createdDaysAgo),
      },
    ],
  });

  if (!s.quote) continue;

  const quoteId = `seed_quote_${s.key}`;
  quotations.push({
    id: quoteId,
    projectId: id,
    packageName: s.pkg,
    basePrice: pkg.base,
    totalAmount: total,
    downpaymentRequired: downpayment,
    releaseBalance: total - downpayment,
    downpaymentPercentage: calc.downpaymentPercentage,
    isUpfrontEnforced: pkg.upfront,
    expiresAt: iso(s.quote === "sent" ? 7 - s.createdDaysAgo + 1 : 7),
    isExpired: false,
    status: s.quote === "sent" ? "QUOTE_SENT" : "CLIENT_APPROVED",
    notes: "Includes assumption checks, effect sizes, and a plain-English write-up for every table.",
    createdBy: "usr_dev_admin_001",
    createdByName: "Operations Manager",
    respondedAt: s.quote === "approved" ? iso(-s.createdDaysAgo + 1) : null,
    declineReason: null,
    createdAt: iso(-s.createdDaysAgo + 0.5),
    updatedAt: iso(-s.createdDaysAgo + 1),
    lineItems: [
      {
        id: `${quoteId}_pkg`,
        quotationId: quoteId,
        itemType: "PACKAGE",
        itemName: s.pkg,
        description: `${pkg.label} base scope`,
        amount: pkg.base,
      },
      ...(s.addDefenseLab
        ? [
            {
              id: `${quoteId}_defenselab`,
              quotationId: quoteId,
              itemType: "ADDON",
              itemName: "DEFENSELAB",
              description: "DefenseLab 1-on-1 mock panel (1 hour)",
              amount: addOnAmount,
            },
          ]
        : []),
    ],
    projectIntakeId: s.intakeId,
    projectTitle: s.title,
    clientName,
    clientEmail,
  });

  if (!s.sow) continue;

  const signed = s.sow === "signed";
  sows.push({
    id: `seed_sow_${s.key}`,
    projectId: id,
    projectIntakeId: s.intakeId,
    sowType: "PRIMARY",
    parentSowId: null,
    contentSnapshot: buildSOWSnapshot({
      client: {
        fullName: clientName,
        email: clientEmail,
        institution: profile.institutionSchool,
        academicProgram: profile.academicProgram,
        phone: profile.contactNumber,
      },
      project: {
        intakeId: s.intakeId,
        researchTitle: s.title,
        researchObjectives: objectives,
        researchQuestions: questions,
      },
      commercial: {
        packageName: s.pkg,
        packageLabel: pkg.label,
        addOns: s.addDefenseLab ? ["DEFENSELAB"] : [],
        basePrice: pkg.base,
        totalAmount: total,
        downpaymentRequired: downpayment,
        balanceDue: total - downpayment,
      },
      delivery: { turnaroundDays: 7 },
    }),
    packageName: s.pkg,
    totalAmount: total,
    downpaymentRequired: downpayment,
    turnaroundDays: 7,
    addOns: s.addDefenseLab ? ["DEFENSELAB"] : [],
    isLocked: signed,
    signedByName: signed ? clientName : null,
    signedAt: signed ? iso(-s.createdDaysAgo + 2) : null,
    signedByUserId: signed ? clientId : null,
    generatedBy: "usr_dev_admin_001",
    generatedAt: iso(-s.createdDaysAgo + 1.5),
    pdfPath: null,
  });

  if (!s.paid) continue;

  const pay = (kind: "deposit" | "balance", amount: number, daysAfter: number, balancePaidTotal: number) => ({
    id: `seed_pay_${s.key}_${kind}`,
    projectId: id,
    quotationId: quoteId,
    paymentType: kind === "deposit" ? (pkg.upfront ? "FULL" : "DOWNPAYMENT") : "BALANCE",
    paymentMethod: kind === "deposit" ? "GCASH" : "BANK_TRANSFER",
    amountSubmitted: amount,
    balancePaidTotal,
    referenceNumber: kind === "deposit" ? `GC-${s.intakeId.slice(-4)}-7731` : `BT-${s.intakeId.slice(-4)}-2204`,
    paymentStatus: "VERIFIED",
    rejectionReason: null,
    verifiedBy: "usr_dev_finance_001",
    verifiedAt: iso(-s.createdDaysAgo + daysAfter + 0.2),
    createdAt: iso(-s.createdDaysAgo + daysAfter),
    updatedAt: iso(-s.createdDaysAgo + daysAfter + 0.2),
    proofs: [],
  });
  payments.push(pay("deposit", downpayment, 3, downpayment));
  if (s.paid === "full" && total > downpayment) payments.push(pay("balance", total - downpayment, 10, total));
}

// ── Notifications (in-app alerts), newest first ────────────────────────────────
const intake = (key: string) => SEEDS.find((s) => s.key === key)!.intakeId;
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
const alert = (key: string, alertType: string, projectKey: string | null, message: string, linkPath: string | null, ageHours: number, isRead = false) => ({
  id: `seed_alert_${key}`,
  recipientId: clientId,
  recipientRole: "CLIENT",
  alertType,
  projectId: projectKey ? `seed_proj_${projectKey}` : null,
  projectIntakeId: projectKey ? intake(projectKey) : null,
  message,
  linkUrl: linkPath !== null && projectKey ? `/dashboard/client/projects/seed_proj_${projectKey}${linkPath}` : linkPath,
  isRead,
  readAt: isRead ? hoursAgo(ageHours - 1) : null,
  createdAt: hoursAgo(ageHours),
});
const alerts = [
  alert("quote", "COMMERCIAL_UPDATE", "quote", `Your price for ${intake("quote")} is ready. Review what's included and accept it to continue.`, "/quote", 0.2),
  alert("info", "STATUS_UPDATE", "info", "We need your final questionnaire before we can price your study.", "", 3),
  alert("sign", "COMMERCIAL_UPDATE", "sign", `Your agreement for ${intake("sign")} is ready to sign.`, "/sow", 5),
  alert("message", "MESSAGE_ALERT", "analysis", "Your statistician sent you a message about your sleep-quality scale.", "/messages", 26),
  alert("deposit", "PAYMENT_UPDATE", "analysis", "We confirmed your deposit of ₱1,375. Your analysis has started.", "/payment", 30, true),
  alert("files", "DELIVERABLE_UPDATE", "delivered", "Your tables, write-up and code are ready to download.", "/deliverables", 28, true),
  alert("welcome", "SYSTEM_ALERT", null, "Welcome to JAXIS StatLab. Send your first study and we'll reply with a fixed price within 24 hours.", "/dashboard/client", 24 * 20, true),
];

// ── Write (keep any non-seed records already in each file) ─────────────────────
write(file(".dev-projects.json"), [...projects, ...keepUnseeded(read(file(".dev-projects.json")))]);
write(file(".dev-quotations.json"), [...quotations, ...keepUnseeded(read(file(".dev-quotations.json")))]);
write(file(".dev-sows.json"), [...sows, ...keepUnseeded(read(file(".dev-sows.json")))]);
write(file("dev_data/payments.json"), [...payments, ...keepUnseeded(read(file("dev_data/payments.json")))]);
write(file(".dev-alerts.json"), [...alerts, ...keepUnseeded(read(file(".dev-alerts.json")))]);

console.log(
  `Seeded ${projects.length} studies, ${quotations.length} quotes, ${sows.length} agreements, ${payments.length} payments, ${alerts.length} notifications for ${clientEmail}.`
);
console.log("Local files only. Start the app with `npm run dev:offline` to see them.");
