import React from "react";
import { StaffStudyLayout } from "@/features/projects/components/StaffStudyLayout";

export default async function QaStudyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StaffStudyLayout
      id={id}
      role="SENIOR_QA_LEAD"
      base={`/dashboard/qa/projects/${id}`}
      home={{ label: "Review Desk", href: "/dashboard/qa" }}
      tabs={[
        { label: "Review", path: "/review" },
        { label: "Working Files", path: "/files" },
        // QA has no per-study chat page; this opens the study's chat in the inbox.
        { label: "Messages", path: `/dashboard/qa/messages?projectId=${id}` },
      ]}
    >
      {children}
    </StaffStudyLayout>
  );
}
