import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAnalysisWorkbenchData } from "@/features/analysis/actions";
import { getQaReviewHistory } from "@/features/qa/actions";
import { AdminAnalysisDesk } from "./AdminAnalysisDesk";

export const metadata: Metadata = {
  title: "Analysis | JAXIS StatLab",
  description: "The analyst's files, the reviewer's decisions, and extra-work holds for one study.",
};

export const dynamic = "force-dynamic";

export default async function AdminAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "CEO") redirect("/dashboard");

  const { id } = await params;
  const [res, reviews] = await Promise.all([getAnalysisWorkbenchData(id), getQaReviewHistory(id).catch(() => null)]);
  if (!res.success) {
    if (res.error.code === "PROJECT_NOT_FOUND" || res.error.code === "NOT_FOUND") notFound();
    return <AdminAnalysisDesk loadError={res.error.message} />;
  }
  return <AdminAnalysisDesk data={res.data} reviews={reviews && reviews.success ? reviews.data : []} />;
}
