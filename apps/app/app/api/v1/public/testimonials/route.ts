import { NextResponse } from "next/server";
import { db, withDbTimeout } from "@/lib/db";
import type { PublicTestimonial } from "@/features/feedback/schemas";
import { devStudyDataEnabled } from "@/features/projects/dev-study-store";
import { devListFeedback } from "@/features/feedback/dev-feedback";

/**
 * Testimonials for the website (apps/web): only client feedback the client allowed on the website AND an admin
 * approved, named the way the client chose (their typed names, or program and school only). Public, read-only,
 * cached for an hour. `rating` is the average over every answer (not only the ones on the website), so the
 * website's "out of 5" is honest; the website shows it only once there are enough answers.
 */
export const dynamic = "force-dynamic";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

const average = (sum: number, count: number) => (count ? Math.round((sum / count) * 10) / 10 : null);

export async function GET() {
  try {
    const [rows, all] = await Promise.all([
      withDbTimeout(
        db.studyFeedback.findMany({
          where: { showOnWebsite: true, approvedAt: { not: null }, wentWell: { not: null } },
          orderBy: { approvedAt: "desc" },
          take: 100,
          select: {
            rating: true,
            wentWell: true,
            nameStyle: true,
            displayNames: true,
            project: { select: { client: { select: { clientProfile: { select: { institutionSchool: true, academicProgram: true } } } } } },
          },
        }),
        5000,
      ),
      withDbTimeout(db.studyFeedback.aggregate({ _sum: { rating: true }, _count: { _all: true } }), 5000),
    ]);
    const testimonials: PublicTestimonial[] = rows
      .filter((r) => r.wentWell?.trim())
      .map((r) => ({
        quote: r.wentWell!.trim(),
        name: r.nameStyle === "NAMES" ? (r.displayNames?.trim() ?? "") : "",
        program: r.project.client.clientProfile?.academicProgram ?? "",
        school: r.project.client.clientProfile?.institutionSchool ?? "",
        rating: r.rating,
      }));
    const rating = { count: all._count._all, average: average(all._sum.rating ?? 0, all._count._all) };
    return NextResponse.json({ testimonials, rating }, { headers: HEADERS });
  } catch (err) {
    if (devStudyDataEnabled()) {
      const items = devListFeedback();
      const rating = { count: items.length, average: average(items.reduce((n, f) => n + f.rating, 0), items.length) };
      const testimonials: PublicTestimonial[] = items
        .filter((f) => f.showOnWebsite && f.approvedAt && f.wentWell?.trim())
        .map((f) => ({
          quote: f.wentWell!.trim(),
          name: f.nameStyle === "NAMES" ? (f.displayNames?.trim() ?? "") : "",
          program: f.program ?? "",
          school: f.school ?? "",
          rating: f.rating,
        }));
      return NextResponse.json({ testimonials, rating }, { headers: HEADERS });
    }
    console.error("[api/public/testimonials]", err);
    // The website falls back to its own list when this is empty.
    return NextResponse.json({ testimonials: [], rating: null }, { headers: HEADERS, status: 200 });
  }
}
