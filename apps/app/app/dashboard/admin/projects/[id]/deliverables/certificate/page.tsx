import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@repo/ui";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getClientDeliverables } from "@/features/deliverables/actions";
import { ClientCertificateView } from "@/features/deliverables/components/ClientCertificateView";
import { Panel } from "@/components/dashboard/Panel";

export const metadata: Metadata = {
  title: "Certificate | JAXIS StatLab",
  description: "The study's certificate, exactly as the client sees it.",
};

export const dynamic = "force-dynamic";

/** The certificate as the client sees it (same view, print and download), for admins and the CEO. */
export default async function AdminCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = `/dashboard/admin/projects/${id}/deliverables`;
  const data = await getClientDeliverables(id).catch((err: unknown) => {
    console.error("[AdminCertificatePage] Failed to load:", err);
    return null;
  });

  if (data?.qaCertificate) {
    return <ClientCertificateView projectId={id} certificate={data.qaCertificate} backHref={back} />;
  }

  return (
    <Panel as="div">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <SealCheck size={28} weight="fill" className="text-white/30" />
        <p className="mt-4 text-sm font-medium text-white">No certificate yet</p>
        <p className="mt-1 max-w-md text-[13px] text-white/55">It&apos;s made when the reviewer approves the work.</p>
        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link href={back}>Back to Files</Link>
        </Button>
      </div>
    </Panel>
  );
}
