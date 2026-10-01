/**
 * Test accounts and studies for the local test database (`npm run dev:localdb`). Only ever writes to the
 * database on 127.0.0.1:54329; runs once (skips if the accounts are already there).
 * Every account's password: LocalTest123!
 */
import { PrismaClient, type ProjectStatus, type RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const URL = "postgresql://jaxis:localtest@127.0.0.1:54329/jaxis_local";
if (process.env.DATABASE_URL && process.env.DATABASE_URL !== URL) {
  throw new Error("Refusing to seed: DATABASE_URL isn't the local test database.");
}
const db = new PrismaClient({ datasourceUrl: URL });
const PASSWORD = "LocalTest123!";
const day = (n: number) => new Date(Date.now() + n * 864e5);

const ROLES: [RoleName, string][] = [
  ["CLIENT", "Client"],
  ["STATISTICIAN", "Statistical Analyst"],
  ["SENIOR_QA_LEAD", "Reviewer"],
  ["ADMIN", "Admin"],
  ["FINANCE_OFFICER", "Finance"],
  ["CEO", "CEO"],
];

const PEOPLE: { id: string; email: string; name: string; role: RoleName }[] = [
  { id: "local_client_a", email: "clienta@local.test", name: "Ana Reyes", role: "CLIENT" },
  { id: "local_client_b", email: "clientb@local.test", name: "Ben Cruz", role: "CLIENT" },
  { id: "local_admin", email: "admin@local.test", name: "Admin Local", role: "ADMIN" },
  { id: "local_ceo", email: "ceo@local.test", name: "CEO Local", role: "CEO" },
  { id: "local_finance", email: "finance@local.test", name: "Finance Local", role: "FINANCE_OFFICER" },
  { id: "local_stat", email: "stat@local.test", name: "Juan Santos", role: "STATISTICIAN" },
  { id: "local_qa", email: "qa@local.test", name: "Maria Lim", role: "SENIOR_QA_LEAD" },
];

async function main() {
  if (await db.user.findUnique({ where: { email: "admin@local.test" } })) {
    console.log("Local test data already there (use --reset to start again).");
    return;
  }

  for (const [name, label] of ROLES) {
    await db.role.upsert({ where: { name }, update: {}, create: { name, label } });
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const p of PEOPLE) {
    const role = await db.role.findUniqueOrThrow({ where: { name: p.role } });
    await db.user.create({
      data: { id: p.id, email: p.email, fullName: p.name, passwordHash, userRoles: { create: { roleId: role.id } } },
    });
    if (p.role === "CLIENT") {
      await db.clientProfile.create({
        data: {
          userId: p.id,
          institutionSchool: "University of the Philippines Diliman",
          academicProgram: "BS Psychology",
          contactNumber: "0917 123 4567",
          region: "NCR",
        },
      });
    } else {
      await db.staffProfile.create({ data: { userId: p.id } });
    }
  }

  let n = 0;
  const study = async (clientId: string, title: string, status: ProjectStatus, extra: Record<string, unknown> = {}) => {
    n += 1;
    const id = `local_study_${n}`;
    await db.project.create({
      data: {
        id,
        intakeId: `LOCAL-2610-${String(n).padStart(4, "0")}`,
        clientId,
        researchTitle: title,
        researchQuestions: "1. What are the respondents' sleep hours?\n2. Is sleep related to their GWA?",
        researchObjectives: "Describe sleep habits and test their relationship with academic performance.",
        analysisGoals: ["DESCRIBE", "RELATIONSHIP"],
        deadlineRequested: day(21),
        masterStatus: status,
        packageName: "JX_02_START",
        ...extra,
      },
    });
    await db.projectFile.create({
      data: {
        projectId: id,
        fileName: "chapters-1-3.pdf",
        filePath: `intake-uploads/${id}/chapters-1-3.pdf`,
        fileType: "application/pdf",
        fileCategory: "RESEARCH_DOCUMENT",
      },
    });
    return id;
  };
  const quote = (projectId: string, status: "QUOTE_SENT" | "CLIENT_APPROVED") =>
    db.quotation.create({
      data: {
        id: `${projectId}_quote`,
        projectId,
        packageName: "JX_02_START",
        basePrice: 3000,
        totalAmount: 3000,
        downpaymentRequired: 1500,
        expiresAt: day(7),
        createdBy: "local_admin",
        status,
      },
    });
  const paid = (projectId: string, amount: number, type: "DOWNPAYMENT" | "BALANCE", ref: string) =>
    db.payment.create({
      data: {
        projectId,
        quotationId: `${projectId}_quote`,
        paymentType: type,
        paymentMethod: "GCASH",
        amountSubmitted: amount,
        referenceNumber: ref,
        paymentStatus: "VERIFIED",
        verifiedBy: "local_finance",
        verifiedAt: day(-3),
      },
    });
  const assign = (projectId: string) =>
    db.assignment.create({
      data: {
        projectId,
        statisticianId: "local_stat",
        qaLeadId: "local_qa",
        assignedBy: "local_admin",
        slaStartAt: day(-4),
        slaDueAt: day(10),
      },
    });

  const A = "local_client_a";
  await study(A, "Social media use and self-esteem of Grade 11 students", "NEW_REQUEST");
  await study(A, "Online learning readiness of first-year nursing students", "AWAITING_INFORMATION", {
    missingInfoReason: "Please send your questionnaire so we can see how each item is scored.",
  });
  const quoted = await study(A, "Financial literacy and saving habits of ABM students", "QUOTE_SENT");
  await quote(quoted, "QUOTE_SENT");
  const signed = await study(A, "Parental involvement and reading comprehension", "SOW_SIGNED");
  await quote(signed, "CLIENT_APPROVED");

  const working = await study(A, "Study habits, sleep, and GWA of Grade 12 STEM students", "IN_PROGRESS");
  await quote(working, "CLIENT_APPROVED");
  await paid(working, 1500, "DOWNPAYMENT", "GC-LOCAL-1001");
  await assign(working);
  await db.message.create({
    data: { projectId: working, senderId: A, senderRole: "CLIENT", content: "Hi! Will you also include the reliability test?" },
  });
  await db.message.create({
    data: {
      projectId: working,
      senderId: "local_stat",
      senderRole: "STATISTICIAN",
      content: "Yes, Cronbach's alpha for each scale. First tables are coming this week.",
    },
  });

  const delivered = await study(A, "Stress and coping of working students", "DELIVERED", {
    qaApproved: true,
    deliveredAt: day(-1),
    revisionWindowExpiresAt: day(2),
    filesPurgeAt: day(89),
  });
  await quote(delivered, "CLIENT_APPROVED");
  await paid(delivered, 1500, "DOWNPAYMENT", "GC-LOCAL-1002");
  await assign(delivered);
  await db.deliverable.create({
    data: {
      projectId: delivered,
      category: "PDF_REPORT",
      fileName: "chapter-4-results.pdf",
      filePath: `deliverables/${delivered}/chapter-4-results.pdf`,
      fileSize: 240000,
      fileType: "application/pdf",
      uploadedBy: "local_stat",
      isFinalReleased: true,
      releasedAt: day(-1),
      releasedBy: "local_admin",
    },
  });

  await study("local_client_b", "Ben's study: job satisfaction of public school teachers", "NEW_REQUEST");

  await db.inAppAlert.createMany({
    data: [
      { recipientId: A, recipientRole: "CLIENT", alertType: "QUOTE_SENT", message: "Your price is ready. Have a look.", linkUrl: `/dashboard/client/projects/${quoted}/quote` },
      { recipientId: A, recipientRole: "CLIENT", alertType: "DELIVERED", message: "Your files are ready. Pay the rest to download them.", linkUrl: `/dashboard/client/projects/${delivered}/deliverables` },
      { recipientId: "local_admin", recipientRole: "ADMIN", alertType: "NEW_INTAKE", message: "New study request from Ana Reyes." },
    ],
  });

  console.log(`Added ${PEOPLE.length} test accounts and ${n} studies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
