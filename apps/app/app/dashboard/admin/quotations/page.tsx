import React from "react";
import type { Metadata } from "next";
import { getQuotationsRoster, getCommercialCatalog } from "@/features/quotations/actions";
import { AdminQuotationsClient } from "./AdminQuotationsClient";

export const metadata: Metadata = {
  title: "Quotes | JAXIS StatLab",
  description: "Every quote: drafts to finish, quotes waiting for the client, accepted, declined and expired.",
};

export const dynamic = "force-dynamic";

export default async function AdminQuotationsPage() {
  const [quotes, catalog] = await Promise.all([
    getQuotationsRoster().then(
      (q) => ({ ok: true as const, q }),
      () => ({ ok: false as const, q: [] })
    ),
    getCommercialCatalog().catch(() => undefined),
  ]);
  return <AdminQuotationsClient quotes={quotes.q} failed={!quotes.ok} catalog={catalog} />;
}
