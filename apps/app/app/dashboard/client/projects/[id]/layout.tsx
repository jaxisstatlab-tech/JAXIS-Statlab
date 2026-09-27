import React from "react";
import { getStudyOnce } from "@/features/projects/study-cache";
import { ClientStudyHeader } from "@/features/projects/components/ClientStudyHeader";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/** Every page of one study shares this header (title, ID, stage, tracker, tabs). */
export default async function ClientStudyLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const res = await getStudyOnce(id);
  const study = res.success ? res.data : null;

  // If the study can't be loaded, the page shows its own "couldn't load" message.
  if (!study) return <>{children}</>;

  return (
    <div data-portal="client" className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 animate-content-fade">
      <ClientStudyHeader
        initial={{
          id: study.id,
          intakeId: study.intakeId,
          title: study.researchTitle,
          status: study.masterStatus,
          createdAt: new Date(study.createdAt).toISOString(),
        }}
      />
      {children}
    </div>
  );
}
