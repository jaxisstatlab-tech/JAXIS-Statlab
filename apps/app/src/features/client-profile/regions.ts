/** Philippine regions for the client profile. One list for the profile page and the quick profile form. */
export const REGION_OPTIONS = [
  { value: "NCR", label: "National Capital Region (NCR / Metro Manila)" },
  { value: "CAR", label: "Cordillera Administrative Region (CAR)" },
  { value: "REGION_1", label: "Region I – Ilocos Region" },
  { value: "REGION_2", label: "Region II – Cagayan Valley" },
  { value: "REGION_3", label: "Region III – Central Luzon" },
  { value: "REGION_4A", label: "Region IV-A – CALABARZON" },
  { value: "MIMAROPA", label: "MIMAROPA Region (Region IV-B)" },
  { value: "REGION_5", label: "Region V – Bicol Region" },
  { value: "REGION_6", label: "Region VI – Western Visayas" },
  { value: "REGION_7", label: "Region VII – Central Visayas" },
  { value: "REGION_8", label: "Region VIII – Eastern Visayas" },
  { value: "REGION_9", label: "Region IX – Zamboanga Peninsula" },
  { value: "REGION_10", label: "Region X – Northern Mindanao" },
  { value: "REGION_11", label: "Region XI – Davao Region" },
  { value: "REGION_12", label: "Region XII – SOCCSKSARGEN" },
  { value: "REGION_13", label: "Region XIII – Caraga" },
  { value: "BARMM", label: "BARMM – Bangsamoro Autonomous Region in Muslim Mindanao" },
  { value: "INTERNATIONAL", label: "Outside the Philippines" },
];

// Values the older quick profile form saved ("Region III"), and the default used when a study is sent.
const LEGACY: Record<string, string> = {
  "Region I": "REGION_1",
  "Region II": "REGION_2",
  "Region III": "REGION_3",
  "Region IV-A": "REGION_4A",
  "Region IV-B": "MIMAROPA",
  "Region V": "REGION_5",
  "Region VI": "REGION_6",
  "Region VII": "REGION_7",
  "Region VIII": "REGION_8",
  "Region IX": "REGION_9",
  "Region X": "REGION_10",
  "Region XI": "REGION_11",
  "Region XII": "REGION_12",
  "Region XIII": "REGION_13",
  International: "INTERNATIONAL",
  "National Capital Region (NCR)": "NCR",
};

/** The list value for a saved region (older saved values included); "NCR" when empty or unknown. */
export function regionValue(raw: string | null | undefined): string {
  if (!raw) return "NCR";
  const v = LEGACY[raw] ?? raw;
  return REGION_OPTIONS.some((o) => o.value === v) ? v : "NCR";
}

/** A readable name for a saved region (falls back to what was saved). */
export function regionLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  const v = LEGACY[raw] ?? raw;
  return REGION_OPTIONS.find((o) => o.value === v)?.label ?? raw;
}
