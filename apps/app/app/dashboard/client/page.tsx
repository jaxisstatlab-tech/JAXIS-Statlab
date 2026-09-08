import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getProjects } from "@/features/projects/actions";
import { getClientProfile } from "@/features/client-profile/actions";
import { auth } from "@/lib/auth";
import { ClientDashboardClient } from "./ClientDashboardClient";
import { LoadingState } from "@repo/ui";

export const metadata: Metadata = {
  title: "Client Portal | JAXIS StatLab",
  description:
    "Track your research progress, message your assigned statistician, and download defense-ready statistical packages.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientDashboardPage() {
  const [projRes, profile, session] = await Promise.all([
    getProjects(),
    getClientProfile(),
    auth(),
  ]);

  const initialProjects = projRes.success && projRes.data ? projRes.data : [];
  const initialIsProfileComplete = Boolean(
    profile && profile.institutionSchool && profile.contactNumber
  );
  const userName = session?.user?.name || undefined;

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading workspace..." />
        </div>
      }
    >
      <ClientDashboardClient
        initialProjects={initialProjects}
        initialIsProfileComplete={initialIsProfileComplete}
        userName={userName}
      />
    </Suspense>
  );
}
