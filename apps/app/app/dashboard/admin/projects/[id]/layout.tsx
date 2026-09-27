import React from "react";
import { StaffStudyLayout } from "@/features/projects/components/StaffStudyLayout";

export default async function AdminStudyLayout({
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
      role="ADMIN"
      base={`/dashboard/admin/projects/${id}`}
      home={{ label: "Admin", href: "/dashboard/admin" }}
      tabs={[
        { label: "Overview", path: "" },
        { label: "Agreement", path: "/sow" },
        { label: "Payment", path: "/payment" },
        { label: "Analysis", path: "/analysis" },
        { label: "Files", path: "/deliverables" },
      ]}
    >
      {children}
    </StaffStudyLayout>
  );
}
