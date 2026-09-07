import { z } from "zod";
import { PackageName, AddOnName, QuotationStatus, LineItemType } from "@prisma/client";
import type { ProjectDetailItem } from "@/features/projects/schemas";

export interface ClientQuoteEntry {
  project: ProjectDetailItem;
  quotation: QuotationDetailItem | null;
}

/**
 * Standard Action Response
 */
export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };
}

/**
 * Quotation Line Item DTO
 */
export interface QuotationLineItemData {
  id: string;
  quotationId: string;
  itemType: LineItemType;
  itemName: string;
  description: string | null;
  amount: number;
}

/**
 * Full Quotation Detail Item
 */
export interface QuotationDetailItem {
  id: string;
  projectId: string;
  projectIntakeId?: string;
  projectTitle?: string;
  clientName?: string;
  clientEmail?: string;
  packageName: PackageName;
  basePrice: number;
  totalAmount: number;
  downpaymentRequired: number;
  releaseBalance: number;
  downpaymentPercentage: number;
  isUpfrontEnforced: boolean;
  expiresAt: string;
  isExpired: boolean;
  status: QuotationStatus;
  notes: string | null;
  createdBy: string;
  createdByName?: string;
  respondedAt: string | null;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: QuotationLineItemData[];
}

/**
 * Add-on schema
 */
export const AddOnItemSchema = z.object({
  name: z.nativeEnum(AddOnName),
  amount: z.number().nonnegative("Add-on price cannot be negative").optional(),
  description: z.string().max(255).optional(),
});

/**
 * Schema: Create Draft Proposal (Admin / CEO)
 */
export const CreateQuotationSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  packageName: z.nativeEnum(PackageName, {
    errorMap: () => ({ message: "Please select a valid analytical package." }),
  }),
  basePrice: z.number().positive("Base package price must be greater than zero"),
  addOns: z.array(AddOnItemSchema).optional().default([]),
  customDownpayment: z.number().positive().optional(),
  notes: z.string().max(1000, "Notes cannot exceed 1,000 characters").optional(),
  expiresInDays: z.number().int().min(1).max(30).default(3),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

/**
 * Schema: Update Draft Proposal (Admin / CEO)
 */
export const UpdateQuotationSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID is required"),
  packageName: z.nativeEnum(PackageName),
  basePrice: z.number().positive("Base package price must be greater than zero"),
  addOns: z.array(AddOnItemSchema).optional().default([]),
  customDownpayment: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  expiresInDays: z.number().int().min(1).max(30).default(3),
});

export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;

/**
 * Schema: Issue Commercial Quote (Admin / CEO)
 */
export const IssueQuotationSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID is required"),
  expiresInDays: z.number().int().min(1).max(30).default(3),
  notes: z.string().max(1000).optional(),
});

export type IssueQuotationInput = z.infer<typeof IssueQuotationSchema>;

/**
 * Schema: Client Decision Response (Client)
 */
export const RespondQuotationSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID is required"),
  decision: z.enum(["ACCEPT", "DECLINE"], {
    errorMap: () => ({ message: "Decision must be ACCEPT or DECLINE." }),
  }),
  declineReason: z.string().max(1000).optional(),
  selectedAddOnCodes: z.array(z.string()).optional(),
});

export type RespondQuotationInput = z.infer<typeof RespondQuotationSchema>;
