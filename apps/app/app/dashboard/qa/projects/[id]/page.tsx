import { redirect } from "next/navigation";

// Links to a study without a page (older notifications) open the study's review page instead of "not found".
export default async function QaStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/qa/projects/${id}/review`);
}
