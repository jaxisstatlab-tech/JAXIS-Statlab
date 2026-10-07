import { redirect } from "next/navigation";

// Links to a study without a page (older notifications) open the study's workbench instead of "not found".
export default async function StatisticianStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/statistician/projects/${id}/workbench`);
}
