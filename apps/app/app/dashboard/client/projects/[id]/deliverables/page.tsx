import React from "react";
import Link from "next/link";
import { Button } from "@repo/ui";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { getClientDeliverables } from "@/features/deliverables/actions";
import { getClientStudyFeedback } from "@/features/feedback/actions";
import { ClientFeedbackCard } from "@/features/feedback/components/ClientFeedbackCard";
import { ClientDeliverablesDesk } from "@/features/deliverables/components/ClientDeliverablesDesk";
import { Panel } from "@/components/dashboard/Panel";
import type { ClientDeliverablesDTO } from "@/features/deliverables/schemas";

interface ClientDeliverablesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDeliverablesPage({ params }: ClientDeliverablesPageProps) {
  const { id } = await params;

  let data: ClientDeliverablesDTO | null = null;
  let message = "";
  // "How did we do?" (a modal) once the study is finished: the Files tab is where clients end up.
  const feedbackLoad = getClientStudyFeedback(id).catch(() => null);
  try {
    data = await getClientDeliverables(id);
  } catch (err: unknown) {
    console.error("Failed to load client deliverables desk:", err);
    message = err instanceof Error ? err.message : "";
  }
  const feedback = await feedbackLoad;
  const showFeedback = feedback?.success && (feedback.data.eligible || feedback.data.feedback);

  if (data)
    return (
      <>
        <ClientDeliverablesDesk data={data} />
        {showFeedback ? <ClientFeedbackCard projectId={id} initial={feedback.data} /> : null}
      </>
    );

  // A plain message instead of "Page not found" when the files can't be loaded.
  return (
    <Panel as="div">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <WarningCircle size={28} weight="fill" className="text-white/30" />
        <p className="mt-4 text-sm font-medium text-white">We couldn&apos;t open your files</p>
        <p className="mt-1 max-w-md text-[13px] text-white/55">
          {message && !/prisma|database|ECONN|timeout/i.test(message) ? message : "Please refresh the page. If it keeps happening, message your team."}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link href={`/dashboard/client/projects/${id}`}>Back to Overview</Link>
        </Button>
      </div>
    </Panel>
  );
}
