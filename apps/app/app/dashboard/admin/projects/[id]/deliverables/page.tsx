import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminDeliverablesDesk } from "@/features/deliverables/actions";
import { AdminDeliverablesDesk } from "@/features/deliverables/components/AdminDeliverablesDesk";

export const metadata: Metadata = {
  title: "Files | JAXIS StatLab",
  description: "The files the client gets for one study, and their change requests.",
};

export const dynamic = "force-dynamic";

export default async function AdminDeliverablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAdminDeliverablesDesk(id).catch((err: unknown) => {
    console.error("[AdminDeliverablesPage] Failed to load:", err);
    return null;
  });
  if (!data) notFound();
  return <AdminDeliverablesDesk data={data} />;
}
