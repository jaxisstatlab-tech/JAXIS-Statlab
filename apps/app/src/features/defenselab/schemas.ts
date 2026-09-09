import { z } from "zod";

export const DefenseLabStatusEnum = z.enum([
  "SCHEDULED",
  "COMPLETED",
  "NO_SHOW_CLIENT",
  "RESCHEDULED",
  "CANCELLED",
  "PENALTY_APPLIED",
]);

export type DefenseLabStatusType = z.infer<typeof DefenseLabStatusEnum>;

export const BookDefenseLabSessionSchema = z.object({
  projectId: z.string().min(1, "Please select a valid study project."),
  scheduledAt: z.string().min(1, "Please specify a scheduled date and time."),
  durationHours: z.coerce.number().int().min(1).max(8).default(1),
  notes: z.string().max(1000).optional(),
});

export type BookDefenseLabSessionInput = z.infer<typeof BookDefenseLabSessionSchema>;

export const RescheduleDefenseLabSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
  newScheduledAt: z.string().min(1, "Please provide the new date and time."),
  reason: z.string().min(5, "Please provide a valid reason for rescheduling.").max(500),
});

export type RescheduleDefenseLabSessionInput = z.infer<typeof RescheduleDefenseLabSessionSchema>;

export const CompleteDefenseLabSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
  recordingUrl: z.string().url("Please provide a valid URL to the session recording.").optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export type CompleteDefenseLabSessionInput = z.infer<typeof CompleteDefenseLabSessionSchema>;

export const UploadDefenseLabRecordingSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
  recordingUrl: z.string().url("Please enter a valid URL (Google Drive, Dropbox, or cloud storage)."),
});

export type UploadDefenseLabRecordingInput = z.infer<typeof UploadDefenseLabRecordingSchema>;

export const UpdateDefenseLabMeetingLinkSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
  meetingUrl: z.string().url("Please enter a valid Google Meet, Zoom, or Teams link."),
});

export type UpdateDefenseLabMeetingLinkInput = z.infer<typeof UpdateDefenseLabMeetingLinkSchema>;

export const ApplyDefenseLabPenaltySchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
  penaltyReason: z.string().min(5, "Please describe the reason for penalty determination.").max(500),
  penaltyAmount: z.coerce.number().min(0).max(50000).optional(),
});

export type ApplyDefenseLabPenaltyInput = z.infer<typeof ApplyDefenseLabPenaltySchema>;

export interface DefenseLabSessionDTO {
  id: string;
  projectId: string;
  projectIntakeId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  expertId: string;
  expertName: string;
  expertEmail: string;
  scheduledAt: string;
  durationHours: number;
  amountPaid: number;
  status: DefenseLabStatusType;
  meetingUrl: string | null;
  recordingUrl: string | null;
  completedAt: string | null;
  notes: string | null;
  rescheduledAt: string | null;
  rescheduleReason: string | null;
  rescheduleBy: string | null;
  penaltyApplied: boolean;
  penaltyReason: string | null;
  penaltyDeterminedBy: string | null;
  penaltyAmount: number | null;
  createdAt: string;
}

export interface DefenseLabProjectEntitlementDTO {
  projectId: string;
  intakeId: string;
  researchTitle: string;
  hasAddon: boolean;
  isPaid: boolean;
  totalHoursPurchased: number;
  remainingHours: number;
  expertAssignedName: string | null;
  expertAssignedId: string | null;
}
