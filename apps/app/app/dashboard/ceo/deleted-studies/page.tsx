import React from "react";
import { getDeletedStudiesHistoryAction } from "@/features/reporting/actions";
import { DeletedStudiesClient } from "./DeletedStudiesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deleted Studies Audit Ledger | JAXIS StatLab",
  description: "Immutable historical log and forensic audit ledger for deleted research studies.",
};

export default async function DeletedStudiesPage() {
  const result = await getDeletedStudiesHistoryAction();
  const initialData =
    result.success && result.data
      ? result.data
      : {
          items: [],
          kpis: {
            totalDeleted: 0,
            adminDeletions: 0,
            ceoDeletions: 0,
            clientRequestedDeletions: 0,
            totalFilesPurgedCount: 0,
          },
        };

  return <DeletedStudiesClient initialData={initialData} />;
}
