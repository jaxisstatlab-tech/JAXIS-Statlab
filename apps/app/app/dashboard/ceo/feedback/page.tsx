import { getFeedbackOverview } from "@/features/feedback/actions";
import { FeedbackDesk } from "@/features/feedback/components/FeedbackDesk";

export const dynamic = "force-dynamic";

// Every client's feedback, loaded here so the page arrives with its data.
export default async function CeoFeedbackPage() {
  const res = await getFeedbackOverview().catch(() => null);
  const ok = res?.success ? res.data : null;
  return (
    <FeedbackDesk
      role="CEO"
      initialItems={ok?.items ?? []}
      initialSummary={ok?.summary ?? { count: 0, average: null, spread: [0, 0, 0, 0, 0], recentCount: 0, awaiting: 0, recentLow: 0 }}
      failed={ok ? undefined : res && !res.success ? res.error.message : "Please try again."}
    />
  );
}
