import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Button } from "@repo/ui";
import { auth } from "@/lib/auth";
import { getAnalysisWorkbenchData } from "@/features/analysis/actions";
import { QaFilesDesk } from "@/features/qa/components/QaFilesDesk";
import { Panel, PanelBody } from "@/components/dashboard/Panel";

export const metadata: Metadata = {
  title: "Working Files | JAXIS StatLab",
  description: "Every file the analyst uploaded for this study, with older versions.",
};

interface QAProjectFilesPageProps {
  params: Promise<{ id: string }>;
}

export default async function QAProjectFilesPage({ params }: QAProjectFilesPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const res = await getAnalysisWorkbenchData(id);

  if (!res.success) {
    if (res.error.code === "PROJECT_NOT_FOUND") notFound();
    // It used to send you back to the desk without saying why.
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">You can&apos;t open these files</p>
              <p className="mt-0.5 text-[13px] text-white/55">
                {res.error.code === "FORBIDDEN" ? "Only the study's analyst and reviewer can open them." : "They didn't load. Try again in a moment."}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/qa">Back to Review Desk</Link>
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return <QaFilesDesk data={res.data} />;
}
