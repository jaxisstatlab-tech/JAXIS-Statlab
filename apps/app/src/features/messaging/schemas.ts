import { z } from "zod";
import type { RoleName } from "@prisma/client";

export const SendMessageSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(5000, "Message cannot exceed 5,000 characters"),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const ReviewBlockedMessageSchema = z.object({
  logId: z.string().min(1, "Log ID is required"),
  reviewNotes: z.string().max(1000).optional(),
});

export type ReviewBlockedMessageInput = z.infer<typeof ReviewBlockedMessageSchema>;

export const FilterBlockedMessagesSchema = z.object({
  search: z.string().optional(),
  category: z.enum(["ALL", "EMAIL", "PHONE", "PAYMENT", "MESSENGER", "SOCIAL", "URL"]).optional().default("ALL"),
  reviewedStatus: z.enum(["ALL", "PENDING_REVIEW", "REVIEWED"]).optional().default("ALL"),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(20),
});

export type FilterBlockedMessagesInput = z.infer<typeof FilterBlockedMessagesSchema>;

export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "seen";

export interface MessageDTO {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: RoleName;
  content: string;
  isBlocked: boolean;
  blockedReason: string | null;
  sentAt: string;
  isMine: boolean;
  isRead: boolean;
  readByCount: number;
  status: MessageDeliveryStatus;
  seenByNames?: string[];
  seenAt?: string | null;
}

export interface BlockedMessageLogDTO {
  id: string;
  messageId: string;
  projectId: string;
  projectTitle: string;
  intakeId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: RoleName;
  content: string;
  detectedPattern: string;
  matchedText: string;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface ProjectThreadSummaryDTO {
  projectId: string;
  intakeId: string;
  researchTitle: string;
  masterStatus: string;
  packageName: string | null;
  clientName: string;
  statisticianName: string | null;
  qaLeadName: string | null;
  lastMessage: {
    content: string;
    sentAt: string;
    senderName: string;
    senderRole: RoleName;
  } | null;
  unreadCount: number;
  totalMessagesCount: number;
}

export interface MessagingActionResult<T = unknown> {
  success: boolean;
  data?: T;
  blocked?: boolean;
  warning?: string;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
