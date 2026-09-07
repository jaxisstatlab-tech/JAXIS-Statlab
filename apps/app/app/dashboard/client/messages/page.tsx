import React, { Suspense } from "react";
import { getMyProjectThreads, getProjectMessages } from "@/features/messaging/actions";
import { ClientMessagesClient } from "./ClientMessagesClient";
import { LoadingState } from "@repo/ui";
import type { InitialThreadData } from "@/features/messaging/components/MessageThread";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function ClientMessagesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const requestedProjectId = resolvedParams.projectId || null;

  // Pre-load project threads on the server
  const threadsRes = await getMyProjectThreads();
  const initialThreads = threadsRes.success && threadsRes.data ? threadsRes.data : [];

  const targetProjectId =
    requestedProjectId || initialThreads[0]?.projectId || null;

  let initialThreadData: InitialThreadData | null = null;

  if (targetProjectId) {
    try {
      const messagesRes = await getProjectMessages(targetProjectId, { limit: 20 });
      if (messagesRes.success && messagesRes.data) {
        initialThreadData = {
          messages: messagesRes.data.messages,
          projectInfo: messagesRes.data.project,
          hasMore: messagesRes.data.hasMore,
          nextCursor: messagesRes.data.nextCursor,
          currentUserId: messagesRes.data.currentUserId || null,
        };
      }
    } catch (err) {
      console.error("Failed to prefetch initial project messages on server:", err);
    }
  }

  return (
    <Suspense
      fallback={
        <div className="h-full flex-1 flex items-center justify-center">
          <LoadingState variant="page" label="Loading messages..." />
        </div>
      }
    >
      <ClientMessagesClient
        initialThreads={initialThreads}
        initialSelectedProjectId={targetProjectId}
        initialThreadData={initialThreadData}
      />
    </Suspense>
  );
}
