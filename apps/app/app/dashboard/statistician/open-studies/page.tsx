import type { Metadata } from "next";
import { getOpenStudies } from "@/features/volunteers/actions";
import { OpenStudiesClient } from "./OpenStudiesClient";

export const metadata: Metadata = {
  title: "Open Studies | JAXIS StatLab",
  description: "Studies that don't have an analyst yet. Read them and offer to take the ones you want.",
};

export const dynamic = "force-dynamic";

export default async function OpenStudiesPage() {
  const res = await getOpenStudies();
  return <OpenStudiesClient initial={res.success ? res.data : []} failed={res.success ? undefined : res.error.message} />;
}
