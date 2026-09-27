import React, { Suspense } from "react";
import { LoadingState } from "@repo/ui";
import { loadInbox } from "@/features/messaging/inbox-data";
import { StatisticianMessagesClient } from "./StatisticianMessagesClient";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function StatisticianMessagesPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;
  const data = await loadInbox(projectId || null);

  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 items-center justify-center">
          <LoadingState variant="page" label="Loading messages..." />
        </div>
      }
    >
      <StatisticianMessagesClient {...data} />
    </Suspense>
  );
}
