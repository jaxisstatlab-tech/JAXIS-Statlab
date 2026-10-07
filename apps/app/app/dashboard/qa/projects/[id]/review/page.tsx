import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Button } from "@repo/ui";
import { auth } from "@/lib/auth";
import { getQaInspectionDesk } from "@/features/qa/actions";
import { getOwnProfile } from "@/features/staff/actions";
import { QAEvaluationDesk } from "@/features/qa/components/QAEvaluationDesk";
import { Panel, PanelBody } from "@/components/dashboard/Panel";

export const metadata: Metadata = {
  title: "Review | JAXIS StatLab",
  description: "Check the analyst's files, then approve them or send them back.",
};

interface QAReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function QAReviewPage({ params }: QAReviewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const [res, me] = await Promise.all([getQaInspectionDesk(id), getOwnProfile()]);

  if (!res.success) {
    if (res.error.code === "PROJECT_NOT_FOUND") notFound();
    // It used to send you back to the desk without saying why.
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">You can&apos;t open this review</p>
              <p className="mt-0.5 text-[13px] text-white/55">
                {res.error.code === "FORBIDDEN" ? "Only the study's reviewer and admins can open it." : "It didn't load. Try again in a moment."}
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

  // Approving needs the approver's signature (it goes on the client's certificate).
  return <QAEvaluationDesk data={res.data} hasSignature={me.success ? Boolean(me.data.signatureUrl) : true} />;
}
