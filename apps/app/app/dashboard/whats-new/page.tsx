import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { releasesFor } from "@/features/whats-new/changelog";
import { WhatsNewClient } from "./WhatsNewClient";

// What's new: the update log for the signed-in person's role (the CEO sees every item, with who it's for).
export default async function WhatsNewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role as string | undefined;
  return <WhatsNewClient releases={releasesFor(role)} email={session.user.email ?? undefined} showAudience={role === "CEO"} />;
}
