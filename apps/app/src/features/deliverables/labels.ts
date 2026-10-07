// Plain names for the kinds of final files (the stored metadata labels are older, formal wording).

export const DELIVERABLE_KIND: Record<string, { label: string; hint: string }> = {
  STATISTICAL_OUTPUT: { label: "Results and output", hint: "Tables, output files, code" },
  PDF_REPORT: { label: "Report", hint: "The written results (Chapter 4 or a report)" },
  RAW_DATA_CLEANED: { label: "Cleaned data", hint: "The data file used for the analysis" },
  APPENDIX: { label: "Appendix", hint: "Extra tables or figures" },
  OTHER: { label: "Other", hint: "Anything else for the study" },
};
