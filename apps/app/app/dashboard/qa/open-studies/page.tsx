import type { Metadata } from "next";
import { getOpenStudies } from "@/features/volunteers/actions";
import { OpenStudiesClient } from "../../statistician/open-studies/OpenStudiesClient";

export const metadata: Metadata = {
  title: "Open Studies | JAXIS StatLab",
  description: "Studies that don't have a team yet. Read them and offer to review the ones you want.",
};

export const dynamic = "force-dynamic";

// Reviewers' copy of Open Studies: same list as analysts, but their offers are to review.
export default async function QaOpenStudiesPage() {
  const res = await getOpenStudies();
  return <OpenStudiesClient kind="REVIEWER" initial={res.success ? res.data : []} failed={res.success ? undefined : res.error.message} />;
}
