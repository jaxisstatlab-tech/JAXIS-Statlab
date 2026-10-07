import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Button } from "@repo/ui";
import { auth } from "@/lib/auth";
import { getAnalysisWorkbenchData } from "@/features/analysis/actions";
import { AnalysisWorkbenchDesk } from "@/features/analysis/components/AnalysisWorkbenchDesk";
import { Panel, PanelBody } from "@/components/dashboard/Panel";

export const metadata: Metadata = {
  title: "Workbench | JAXIS StatLab",
  description: "Upload your analysis files and send them to your reviewer.",
};

interface StatisticianWorkbenchPageProps {
  params: Promise<{ id: string }>;
}

export default async function StatisticianWorkbenchPage({ params }: StatisticianWorkbenchPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const res = await getAnalysisWorkbenchData(id);

  if (!res.success) {
    if (res.error.code === "PROJECT_NOT_FOUND") notFound();
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">You can&apos;t open this workbench</p>
              <p className="mt-0.5 text-[13px] text-white/55">
                {res.error.code === "FORBIDDEN"
                  ? "Only the study's analyst and reviewer can open it."
                  : "It didn't load. Try again in a moment."}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/statistician">Back to My Studies</Link>
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return <AnalysisWorkbenchDesk initialData={res.data} />;
}
