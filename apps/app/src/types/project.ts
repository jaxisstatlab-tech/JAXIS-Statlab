export type ProjectStatus =
  | "DRAFT"
  | "NEW_REQUEST"
  | "UNDER_EVALUATION"
  | "AWAITING_INFORMATION"
  | "QUOTE_SENT"
  | "SOW_PENDING"
  | "AWAITING_PAYMENT"
  | "EXPERT_ASSIGNED"
  | "ANALYSIS_IN_PROGRESS"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "FOR_QA"
  | "QA_REVISION"
  | "QA_APPROVED"
  | "CLIENT_REVIEW"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED"
  | "HALTED"
  | "ETHICAL_BREACH"
  | "EXPIRED"
  | "ARCHIVED";

export type QAStatus = "QA_APPROVED" | "FOR_QA" | "IN_QA_REVIEW" | "REVISION_REQUESTED";

export type PaymentStatus = "FULLY_PAID" | "DOWNPAYMENT_PAID" | "PENDING_VERIFICATION" | "UNPAID" | "AWAITING_PAYMENT";

export interface ProjectDatasetArtifact {
  name: string;
  size: string;
  mimeType: string;
  verified: boolean;
  uploadedAt: string;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  university: string;
  field: string;
  statisticians: string;
  method: string;
  status: ProjectStatus;
  qaStatus: QAStatus;
  paymentStatus: PaymentStatus;
  updated: string;
  createdAt?: string;
  deadline?: string;
  datasetName: string;
  datasetSize: string;
  syntaxName: string;
  artifacts?: ProjectDatasetArtifact[];
  rawId?: string;
}

export interface ProjectKPIs {
  totalActiveStudies: number;
  totalActiveStudiesTrend: string;
  underEvaluationCount: number;
  qaReviewGateCount: number;
  fullyPaidReleasedCount: number;
  monthlyRevenueEscrow: string;
  escrowSecuredRatio: string;
}

export interface AuditTelemetryEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  targetId: string;
  detail: string;
  badgeText?: string;
  badgeType?: "success" | "info" | "warning" | "danger";
  rawDate?: Date | string;
}
