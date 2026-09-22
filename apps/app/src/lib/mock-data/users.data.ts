import type { RoleName, UserStatus } from "@prisma/client";

export interface MockStaffProfile {
  bio?: string;
  specializations: string[];
  signatureUrl?: string | null;
  joinedAt?: string;
  updatedAt?: string;
}

export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  password: string; // Dev plain password for dev validation
  status: UserStatus;
  staffProfile?: MockStaffProfile;
}

export const DEV_USERS: Record<string, MockUser> = {
  "admin@jaxis.dev": {
    id: "cmt5plrh90000lrrkrk76bb0b",
    email: "admin@jaxis.dev",
    fullName: "Operations Manager",
    role: "ADMIN",
    password: "JaxisAdmin2026!",
    status: "ACTIVE",
  },
  "ceo@jaxis.dev": {
    id: "cmt5plsb20001lrrk0w684oz0",
    email: "ceo@jaxis.dev",
    fullName: "CEO Owner",
    role: "CEO",
    password: "JaxisCeo2026!",
    status: "ACTIVE",
  },
  "finance@jaxis.dev": {
    id: "cmt5plt6q0002lrrkr5jnsghs",
    email: "finance@jaxis.dev",
    fullName: "Finance Officer",
    role: "FINANCE_OFFICER",
    password: "JaxisFin2026!",
    status: "ACTIVE",
    staffProfile: {
      bio: "Finance Officer overseeing institutional escrow vault release gates, dispute resolutions, and milestone disbursements.",
      specializations: ["Escrow Management", "Ledger Auditing", "Disbursement Protocol"],
      joinedAt: "2026-01-15T08:00:00.000Z",
    },
  },
  "stat@jaxis.dev": {
    id: "cmt5plu1k0003lrrkl1kribvh",
    email: "stat@jaxis.dev",
    fullName: "Dr. Juan Reyes",
    role: "STATISTICIAN",
    password: "JaxisStat2026!",
    status: "ACTIVE",
    staffProfile: {
      bio: "Senior PhD statistician specializing in multivariate quantitative models, structural equation modeling, and APA-compliant statistical reporting.",
      specializations: ["Regression", "ANOVA", "SEM", "Factor Analysis", "Time Series"],
      joinedAt: "2026-01-10T08:00:00.000Z",
    },
  },
  "qa@jaxis.dev": {
    id: "cmt5pluuu0004lrrk5qu5ul2t",
    email: "qa@jaxis.dev",
    fullName: "QA Lead Maria",
    role: "SENIOR_QA_LEAD",
    password: "JaxisQA2026!",
    status: "ACTIVE",
    staffProfile: {
      bio: "Senior QA Peer Review Lead ensuring data integrity, calculation verifiability, and methodological rigor across all statistical deliverables.",
      specializations: ["Instrument Validation", "Descriptive Statistics", "Mixed Methods", "Reliability Analysis"],
      joinedAt: "2026-01-12T08:00:00.000Z",
    },
  },
  "client@jaxis.dev": {
    id: "cmt5plvqe0005lrrkcoiysc7j",
    email: "client@jaxis.dev",
    fullName: "Client Ana Cruz",
    role: "CLIENT",
    password: "JaxisClient2026!",
    status: "ACTIVE",
  },
  "suspended@jaxis.dev": {
    id: "cmt5plwpt0006lrrk1vi05x2g",
    email: "suspended@jaxis.dev",
    fullName: "Suspended Test User",
    role: "CLIENT",
    password: "JaxisSuspended2026!",
    status: "SUSPENDED",
  },
};

import fs from "fs";
import path from "path";

const DEV_USERS_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), ".dev-users.json");

function readPersistedDevUsers(): Record<string, MockUser> {
  try {
    if (fs.existsSync(DEV_USERS_FILE)) {
      const data = fs.readFileSync(DEV_USERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

function writePersistedDevUsers(users: Record<string, MockUser>): void {
  try {
    fs.writeFileSync(DEV_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

export function getDevUsers(): Record<string, MockUser> {
  const persisted = readPersistedDevUsers();
  return {
    ...DEV_USERS,
    ...persisted,
  };
}

export function getDevUserByEmail(email: string): MockUser | undefined {
  const users = getDevUsers();
  return users[email.toLowerCase().trim()];
}

export function registerDevUser(user: MockUser): void {
  const persisted = readPersistedDevUsers();
  persisted[user.email.toLowerCase().trim()] = user;
  writePersistedDevUsers(persisted);
}
