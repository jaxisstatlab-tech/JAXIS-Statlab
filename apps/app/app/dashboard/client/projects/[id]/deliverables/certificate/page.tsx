import React from "react";
import Link from "next/link";
import { Button } from "@repo/ui";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getClientDeliverables } from "@/features/deliverables/actions";
import { ClientCertificateView } from "@/features/deliverables/components/ClientCertificateView";
import { Panel } from "@/components/dashboard/Panel";
import type { ClientDeliverablesDTO } from "@/features/deliverables/schemas";

interface CertificatePageProps {
  params: Promise<{ id: string }>;
}

/** The study's certificate on its own page, so it prints cleanly (the Files tab stays highlighted). */
export default async function ClientCertificatePage({ params }: CertificatePageProps) {
  const { id } = await params;
  let data: ClientDeliverablesDTO | null = null;
  try {
    data = await getClientDeliverables(id);
  } catch (err: unknown) {
    console.error("Failed to load certificate:", err);
  }

  // Same rule as the Files tab: the certificate is shown once the files are released.
  if (data?.isReleased && data.qaCertificate) {
    return <ClientCertificateView projectId={id} certificate={data.qaCertificate} />;
  }

  return (
    <Panel as="div">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <SealCheck size={28} weight="fill" className="text-white/30" />
        <p className="mt-4 text-sm font-medium text-white">Your certificate isn&apos;t ready yet</p>
        <p className="mt-1 max-w-md text-[13px] text-white/55">
          It appears with your files once they&apos;re checked and released.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link href={`/dashboard/client/projects/${id}/deliverables`}>Back to Files</Link>
        </Button>
      </div>
    </Panel>
  );
}
