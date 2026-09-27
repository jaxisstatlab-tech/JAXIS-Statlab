import React from "react";
import { StaffStudyLayout } from "@/features/projects/components/StaffStudyLayout";

export default async function StatisticianStudyLayout({
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
      role="STATISTICIAN"
      base={`/dashboard/statistician/projects/${id}`}
      home={{ label: "Workbench", href: "/dashboard/statistician" }}
      tabs={[
        { label: "Workbench", path: "/workbench" },
        { label: "Messages", path: "/messages" },
      ]}
    >
      {children}
    </StaffStudyLayout>
  );
}
