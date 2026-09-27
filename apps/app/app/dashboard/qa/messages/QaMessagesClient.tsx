"use client";

import React from "react";
import type { ProjectThreadSummaryDTO } from "@/features/messaging/schemas";
import type { InitialThreadData } from "@/features/messaging/components/MessageThread";
import { MessagesInbox } from "@/features/messaging/components/MessagesInbox";

interface QaMessagesClientProps {
  initialThreads: ProjectThreadSummaryDTO[];
  initialSelectedProjectId?: string | null;
  initialThreadData?: InitialThreadData | null;
}

export function QaMessagesClient(props: QaMessagesClientProps) {
  return (
    <MessagesInbox
      {...props}
      role="SENIOR_QA_LEAD"
      breadcrumbs={[
        { label: "WORKSPACE", href: "/dashboard" },
        { label: "Review Desk", href: "/dashboard/qa" },
        { label: "Messages" },
      ]}
      title="Messages"
      description="Chat with clients and statisticians about the studies you're reviewing."
      studyHref={(id) => `/dashboard/qa/projects/${id}/review`}
      empty={{
        title: "No chats yet",
        body: "When a study is assigned to you for review, its chat shows up here.",
      }}
    />
  );
}
