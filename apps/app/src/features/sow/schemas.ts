import { z } from "zod";
import type { SOWContentSnapshot } from "@/lib/sow-rules";

export const GenerateSOWSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  quotationId: z.string().optional(),
  customTerms: z.string().max(2000, "Custom terms cannot exceed 2000 characters").optional(),
});

export type GenerateSOWInput = z.infer<typeof GenerateSOWSchema>;

export const SignSOWSchema = z.object({
  sowId: z.string().min(1, "SOW ID is required"),
  typedFullName: z.string().min(2, "Please type your full legal name").max(100),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({
      message: "You must accept and agree to the Statement of Work terms and liability boundaries.",
    }),
  }),
});

export type SignSOWInput = z.infer<typeof SignSOWSchema>;

export const GenerateSupplementalSOWSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  parentSowId: z.string().min(1, "Parent SOW ID is required"),
  quotationId: z.string().min(1, "Quotation ID is required"),
  scopeChangeReason: z.string().min(5, "Scope change reason must be at least 5 characters").max(1000),
  customTerms: z.string().max(2000, "Custom terms cannot exceed 2000 characters").optional(),
});

export type GenerateSupplementalSOWInput = z.infer<typeof GenerateSupplementalSOWSchema>;

export interface SOWDetailItem {
  id: string;
  projectId: string;
  projectIntakeId?: string;
  sowType: "PRIMARY" | "SUPPLEMENTAL";
  parentSowId?: string | null;
  contentSnapshot: SOWContentSnapshot;
  packageName: string;
  totalAmount: number;
  downpaymentRequired: number;
  turnaroundDays: number;
  addOns: string[];
  isLocked: boolean;
  signedByName?: string | null;
  signedAt?: string | null;
  signedByUserId?: string | null;
  generatedBy: string;
  /** Name of the admin or CEO who prepared the agreement (signs for JAXIS). */
  generatedByName?: string | null;
  generatedAt: string;
  pdfPath?: string | null;
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
