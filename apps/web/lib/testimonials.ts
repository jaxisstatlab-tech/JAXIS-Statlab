import { APP_URL } from "@/lib/config";
import { TESTIMONIALS, type Testimonial } from "@/app/content/site";

// Every testimonial, in the order the site shows them: the featured hand-picked message first, then feedback clients
// sent from the app (allowed on the website and approved by our team, newest first), then the other hand-picked
// ones. The home page shows the first HOME_LIMIT; /testimonials shows all. Refreshed at most once an hour; if the app
// can't be reached, the hand-picked list is shown on its own.

export const HOME_LIMIT = 6;
/** The average rating is shown only once this many clients have answered. */
export const MIN_RATINGS_SHOWN = 5;

export type Rating = { average: number; count: number };

export async function getTestimonials(): Promise<{ items: Testimonial[]; rating: Rating | null }> {
  const [featured, ...handPicked] = TESTIMONIALS;
  const ordered = (fromApp: Testimonial[]) => [...(featured ? [featured] : []), ...fromApp, ...handPicked];
  try {
    const res = await fetch(`${APP_URL}/api/v1/public/testimonials`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { items: TESTIMONIALS, rating: null };
    const body = (await res.json()) as {
      testimonials?: Array<{ quote?: string; name?: string; program?: string; school?: string }>;
      rating?: { average?: number | null; count?: number } | null;
    };
    const known = new Set(TESTIMONIALS.map((t) => t.quote.trim()));
    const fromApp: Testimonial[] = (body.testimonials ?? [])
      .filter((t) => typeof t.quote === "string" && t.quote.trim() && !known.has(t.quote.trim()))
      .map((t) => ({ quote: t.quote!.trim(), name: t.name ?? "", program: t.program ?? "", school: t.school ?? "" }));
    const r = body.rating;
    const rating = r && typeof r.average === "number" && typeof r.count === "number" && r.count >= MIN_RATINGS_SHOWN ? { average: r.average, count: r.count } : null;
    return { items: ordered(fromApp), rating };
  } catch {
    return { items: TESTIMONIALS, rating: null };
  }
}
