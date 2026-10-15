import { APP_URL } from "@/lib/config";
import { TESTIMONIALS, type Testimonial } from "@/app/content/site";

// The hand-picked messages in content/site.ts, followed by feedback clients sent from the app that they allowed on
// the website and our team approved. Refreshed at most once an hour; if the app can't be reached, the hand-picked
// list is shown on its own.

const MAX_FROM_APP = 9;

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${APP_URL}/api/v1/public/testimonials`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return TESTIMONIALS;
    const body = (await res.json()) as { testimonials?: Array<{ quote?: string; name?: string; program?: string; school?: string }> };
    const known = new Set(TESTIMONIALS.map((t) => t.quote.trim()));
    const fromApp: Testimonial[] = (body.testimonials ?? [])
      .filter((t) => typeof t.quote === "string" && t.quote.trim() && !known.has(t.quote.trim()))
      .slice(0, MAX_FROM_APP)
      .map((t) => ({ quote: t.quote!.trim(), name: t.name ?? "", program: t.program ?? "", school: t.school ?? "" }));
    return [...TESTIMONIALS, ...fromApp];
  } catch {
    return TESTIMONIALS;
  }
}
