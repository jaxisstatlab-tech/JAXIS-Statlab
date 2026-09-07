import React from "react";
import { getClientDefenseLabData } from "@/features/defenselab/actions";
import { ClientDefenseLabClient } from "./ClientDefenseLabClient";

export default async function ClientDefenseLabPage() {
  const res = await getClientDefenseLabData();
  const initialData = res.success ? res.data : null;

  return <ClientDefenseLabClient initialData={initialData} />;
}
