"use client";

import React from "react";
import type { ProjectThreadSummaryDTO } from "@/features/messaging/schemas";
import type { InitialThreadData } from "@/features/messaging/components/MessageThread";
import { MessagesInbox } from "@/features/messaging/components/MessagesInbox";

interface StatisticianMessagesClientProps {
  initialThreads: ProjectThreadSummaryDTO[];
  initialSelectedProjectId?: string | null;
  initialThreadData?: InitialThreadData | null;
}

export function StatisticianMessagesClient(props: StatisticianMessagesClientProps) {
  return (
    <MessagesInbox
      {...props}
      role="STATISTICIAN"
      breadcrumbs={[
        { label: "WORKSPACE", href: "/dashboard" },
        { label: "Workbench", href: "/dashboard/statistician" },
        { label: "Messages" },
      ]}
      title="Messages"
      description="Chat with your clients and reviewers about the studies you're working on."
      studyHref={(id) => `/dashboard/statistician/projects/${id}/workbench`}
      empty={{
        title: "No chats yet",
        body: "When a study is assigned to you, its chat with the client and reviewer shows up here.",
      }}
    />
  );
}
