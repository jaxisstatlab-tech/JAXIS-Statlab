import React from "react";
import { getStudyOnce } from "../study-cache";
import { StaffStudyHeader, type StaffStudyTab } from "./StaffStudyHeader";

/**
 * Server layout body shared by the statistician, QA and admin study folders: loads the study once
 * and puts the staff study header above every page. If the study can't be loaded, the page shows
 * its own error.
 */
export async function StaffStudyLayout({
  id,
  base,
  home,
  tabs,
  role,
  children,
}: {
  id: string;
  base: string;
  home: { label: string; href: string };
  tabs: StaffStudyTab[];
  role: string;
  children: React.ReactNode;
}) {
  const res = await getStudyOnce(id);
  const study = res.success ? res.data : null;
  if (!study) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 animate-content-fade">
      <StaffStudyHeader
        initial={{
          id: study.id,
          intakeId: study.intakeId,
          title: study.researchTitle,
          status: study.masterStatus,
          clientName: study.client?.fullName ?? "Client",
          due: study.deadlineRequested ? new Date(study.deadlineRequested).toISOString() : null,
        }}
        base={base}
        home={home}
        tabs={tabs}
        role={role}
      />
      {children}
    </div>
  );
}
