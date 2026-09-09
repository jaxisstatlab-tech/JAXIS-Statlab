"use client";

import React, { use } from "react";
import Link from "next/link";
import { PageHeader, Button } from "@repo/ui";
import { MessageThread } from "@/features/messaging/components/MessageThread";
import { ArrowLeft } from "@phosphor-icons/react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientProjectMessagesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 gap-3 w-full animate-content-fade font-sans overflow-hidden">
      {/* Standardized PageHeader */}
      <div className="flex-shrink-0">
        <PageHeader
          breadcrumbs={[
            { label: "WORKSPACE", href: "/dashboard" },
            { label: "ACTIVE STUDIES", href: "/dashboard/client/projects" },
            { label: "STUDY DETAILS", href: `/dashboard/client/projects/${projectId}` },
            { label: "MESSAGES" },
          ]}
          title="Study Consultation Thread"
          description="Direct encrypted communication with your Lead Statistician and Senior QA Lead."
          actions={
            <Link href={`/dashboard/client/projects/${projectId}`}>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs font-semibold rounded-[2px] active:scale-[0.97] transition-transform"
              >
                <ArrowLeft size={16} weight="fill" className="mr-1.5" />
                <span>Back to Study Details</span>
              </Button>
            </Link>
          }
        />
      </div>

      {/* Message Thread Component — FULL AVAILABLE HEIGHT */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageThread projectId={projectId} className="h-full min-h-0" />
      </div>
    </div>
  );
}
