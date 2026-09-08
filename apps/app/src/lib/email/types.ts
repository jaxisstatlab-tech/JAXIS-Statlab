export type EmailTemplateName =
  | "PasswordReset"
  | "NewIntake"
  | "SOWReady"
  | "SOWSigned"
  | "ProofReceived"
  | "PaymentVerified"
  | "PaymentRejected"
  | "ExpertAssigned"
  | "NewMessage"
  | "InfoRequested"
  | "ProjectDelivered"
  | "RefundProcessed"
  | "DisputeOpened";

export interface EmailPayload {
  to: string;
  recipientId: string;
  template: EmailTemplateName;
  projectId?: string;
  data: Record<string, any>;
}

export interface EmailRenderResult {
  subject: string;
  html: string;
  text: string;
}

export const EMAIL_SUBJECTS: Record<EmailTemplateName, (data: any) => string> = {
  PasswordReset: () => "Reset Your JAXIS StatLab Password",
  NewIntake: (d) => `New Study Intake Received: ${d.intakeId || "Study"} — ${d.researchTitle || "Review Required"}`,
  SOWReady: (d) => `Scope of Work Ready for Review: ${d.intakeId || "Study"}`,
  SOWSigned: (d) => `Scope of Work Signed & Study Confirmed: ${d.intakeId || "Study"}`,
  ProofReceived: (d) => `Payment Proof Upload Received: ${d.intakeId || "Study"}`,
  PaymentVerified: (d) => `Payment Verified — Study Activated: ${d.intakeId || "Study"}`,
  PaymentRejected: (d) => `Action Required: Payment Proof Update Needed for ${d.intakeId || "Study"}`,
  ExpertAssigned: (d) => `Research Team Assigned: ${d.intakeId || "Study"}`,
  NewMessage: (d) => `New Message in Your Study Thread: ${d.intakeId || "Study"}`,
  InfoRequested: (d) => `Information Requested for Study Intake: ${d.intakeId || "Study"}`,
  ProjectDelivered: (d) => `Deliverables Ready — 7-Day Review Window: ${d.intakeId || "Study"}`,
  RefundProcessed: (d) => `Refund Processed: ${d.intakeId || "Study"}`,
  DisputeOpened: (d) => `Dispute Claim Received: ${d.intakeId || "Study"}`,
};
