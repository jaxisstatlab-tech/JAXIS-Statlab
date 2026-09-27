import React from "react";
import { loadThread } from "@/features/messaging/inbox-data";
import { MessageThread } from "@/features/messaging/components/MessageThread";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** The study's chat, under the shared staff study header (see ../layout.tsx). */
export default async function StatisticianProjectMessagesPage({ params }: PageProps) {
  const { id: projectId } = await params;
  const initialThreadData = await loadThread(projectId);

  return (
    <div className="flex min-h-[28rem] flex-1 flex-col overflow-hidden">
      <MessageThread
        projectId={projectId}
        viewer="staff"
        inStudy
        initialThreadData={initialThreadData}
        className="h-full min-h-0 flex-1"
      />
    </div>
  );
}
