import React, { Suspense } from "react";
import { getClientProfile } from "@/features/client-profile/actions";
import { NewProjectIntakeClient } from "./NewProjectIntakeClient";
import { LoadingState } from "@repo/ui";

export default async function NewProjectIntakePage() {
  const profile = await getClientProfile();

  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
          <LoadingState variant="page" label="Loading intake desk..." />
        </div>
      }
    >
      <NewProjectIntakeClient initialProfile={profile} />
    </Suspense>
  );
}
