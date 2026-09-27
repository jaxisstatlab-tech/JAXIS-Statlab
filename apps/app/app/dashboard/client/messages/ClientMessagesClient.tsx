"use client";

import React from "react";
import type { ProjectThreadSummaryDTO } from "@/features/messaging/schemas";
import type { InitialThreadData } from "@/features/messaging/components/MessageThread";
import { MessagesInbox } from "@/features/messaging/components/MessagesInbox";

interface ClientMessagesClientProps {
  initialThreads: ProjectThreadSummaryDTO[];
  initialSelectedProjectId?: string | null;
  initialThreadData?: InitialThreadData | null;
}

export function ClientMessagesClient(props: ClientMessagesClientProps) {
  return (
    <MessagesInbox
      {...props}
      role="CLIENT"
      breadcrumbs={[
        { label: "WORKSPACE", href: "/dashboard" },
        { label: "My Studies", href: "/dashboard/client" },
        { label: "Messages" },
      ]}
      title="Messages"
      description="Chat with the team working on your study."
      studyHref={(id) => `/dashboard/client/projects/${id}`}
      empty={{
        title: "No chats yet",
        body: "Once you send a study and we assign your statistician, you can chat with them here.",
        action: { label: "Send a Study", href: "/dashboard/client/projects/new" },
      }}
    />
  );
}
