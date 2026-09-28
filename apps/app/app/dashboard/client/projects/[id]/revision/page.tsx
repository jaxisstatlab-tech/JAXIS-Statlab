import React from "react";
import Link from "next/link";
import { Button } from "@repo/ui";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { getClientDeliverables } from "@/features/deliverables/actions";
import { ClientRevisionForm } from "@/features/deliverables/components/ClientRevisionForm";
import { Panel } from "@/components/dashboard/Panel";
import type { ClientDeliverablesDTO } from "@/features/deliverables/schemas";

interface ClientRevisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientRevisionPage({ params }: ClientRevisionPageProps) {
  const { id } = await params;

  let data: ClientDeliverablesDTO | null = null;
  try {
    data = await getClientDeliverables(id);
  } catch (err: unknown) {
    console.error("Failed to load client revision desk:", err);
  }

  if (data) return <ClientRevisionForm data={data} />;

  // A plain message instead of "Page not found" when the study can't be loaded.
  return (
    <Panel as="div">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <WarningCircle size={28} weight="fill" className="text-white/30" />
        <p className="mt-4 text-sm font-medium text-white">We couldn&apos;t open this page</p>
        <p className="mt-1 max-w-md text-[13px] text-white/55">Please refresh the page. If it keeps happening, message your team.</p>
        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link href={`/dashboard/client/projects/${id}/deliverables`}>Back to Files</Link>
        </Button>
      </div>
    </Panel>
  );
}
