export type EmailTemplateName =
  | "PasswordReset"
  // Team inbox
  | "NewIntake"
  | "QuoteAccepted"
  | "ClaimFiled"
  // Clients
  | "QuoteReady"
  | "InfoRequested"
  | "SOWReady"
  | "PaymentRejected"
  | "ProjectDelivered"
  // Designed but not sent (kept so old log rows still render; see EMAIL_POLICY in ./policy)
  | "SOWSigned"
  | "ProofReceived"
  | "PaymentVerified"
  | "ExpertAssigned"
  | "NewMessage"
  | "RefundProcessed"
  | "DisputeOpened";

export interface EmailPayload {
  to: string;
  recipientId: string;
  template: EmailTemplateName;
  projectId?: string;
  data: Record<string, unknown>;
  /** Send this email only once per study and address (skips if one was already sent). */
  once?: boolean;
}

export interface EmailRenderResult {
  subject: string;
  html: string;
  text: string;
}

type Data = Record<string, unknown>;
const id = (d: Data) => String(d.intakeId || "your study");

export const EMAIL_SUBJECTS: Record<EmailTemplateName, (data: Data) => string> = {
  PasswordReset: () => "Reset your password",
  NewIntake: (d) => `New study request: ${id(d)}`,
  QuoteAccepted: (d) =>
    d.speedLabel && d.speedCode !== "STANDARD"
      ? `${String(d.speedLabel).toUpperCase()}: price accepted for ${id(d)}`
      : `Price accepted: ${id(d)}`,
  ClaimFiled: (d) => `Claim filed: ${id(d)}`,
  QuoteReady: (d) => `Your price is ready (${id(d)})`,
  InfoRequested: (d) => `We need a bit more information (${id(d)})`,
  SOWReady: (d) => `Your agreement is ready to sign (${id(d)})`,
  PaymentRejected: (d) => `We couldn't accept your receipt (${id(d)})`,
  ProjectDelivered: (d) => `Your files are ready (${id(d)})`,
  SOWSigned: (d) => `Agreement signed (${id(d)})`,
  ProofReceived: (d) => `We got your receipt (${id(d)})`,
  PaymentVerified: (d) => `Payment confirmed (${id(d)})`,
  ExpertAssigned: (d) => `Your statistical analyst is assigned (${id(d)})`,
  NewMessage: (d) => `New message about ${id(d)}`,
  RefundProcessed: (d) => `Refund sent (${id(d)})`,
  DisputeOpened: (d) => `We got your claim (${id(d)})`,
};
