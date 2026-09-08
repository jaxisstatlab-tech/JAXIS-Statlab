"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  KpiCard,
  MoneyDisplay,
  StatusBadge,
  Button,
  ProgressBar,
  Peso,
  Modal,
  ModalFooter,
  LoadingState,
  CopyButton,
} from "@repo/ui";
import {
  Receipt,
  FileText,
  Plus,
  DownloadSimple,
  ArrowSquareOut,
  CurrencyDollar,
  ShieldCheck,
  CheckCircle,
  Clock,
} from "@phosphor-icons/react";
import type { PaymentItem } from "../schemas";
import type { ProjectPaymentSummary } from "@/lib/payment-rules";
import { triggerFileDownload, getFilePreviewUrl } from "@/lib/file-utils";

interface PaymentLedgerCardProps {
  summary: ProjectPaymentSummary;
  payments: PaymentItem[];
  onOpenUploadModal?: () => void;
  canUpload?: boolean;
}

export function PaymentLedgerCard({
  summary,
  payments,
  onOpenUploadModal,
  canUpload = true,
}: PaymentLedgerCardProps) {
  const [viewingReceiptPayment, setViewingReceiptPayment] = useState<PaymentItem | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [viewingReceiptPayment]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Financial Milestone Metric Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="TOTAL CONTRACT FEE"
          value={<MoneyDisplay amount={summary.totalAmount} />}
          description="Agreed in Statement of Work"
          variant="default"
          badge={
            <span className="flex items-center gap-1">
              <CurrencyDollar size={12} weight="fill" className="text-white/40" />
              <span>CONTRACT</span>
            </span>
          }
          badgeColor="gray"
          className="animate-card-reveal stagger-2"
        />

        <KpiCard
          label="DOWNPAYMENT REQUIRED"
          value={<MoneyDisplay amount={summary.downpaymentRequired} />}
          description={summary.isDownpaymentCleared ? "Cleared · Research active" : "Required to start research"}
          variant={summary.isDownpaymentCleared ? "emerald" : "default"}
          badge={
            <span className="flex items-center gap-1">
              {summary.isDownpaymentCleared ? (
                <ShieldCheck size={12} weight="fill" className="text-emerald-400" />
              ) : (
                <Clock size={12} weight="fill" className="text-amber-400" />
              )}
              <span>{summary.isDownpaymentCleared ? "CLEARED" : "REQUIRED"}</span>
            </span>
          }
          badgeColor={summary.isDownpaymentCleared ? "emerald" : "amber"}
          className="animate-card-reveal stagger-3"
        />

        <KpiCard
          label="VERIFIED PAID"
          value={<MoneyDisplay amount={summary.verifiedPaid} />}
          description={
            summary.pendingVerification > 0 ? (
              <span className="inline-flex items-baseline">
                + <Peso className="text-white/50" />{summary.pendingVerification.toLocaleString("en-PH", { minimumFractionDigits: 2 })} pending verification
              </span>
            ) : (
              "All submitted deposits cleared"
            )
          }
          variant="default"
          badge={
            <span className="flex items-center gap-1">
              <CheckCircle size={12} weight="fill" className="text-emerald-400" />
              <span>VERIFIED</span>
            </span>
          }
          badgeColor="emerald"
          className="animate-card-reveal stagger-4"
        />

        <KpiCard
          label="REMAINING BALANCE"
          value={<MoneyDisplay amount={summary.remainingBalance} />}
          description={
            summary.remainingBalance === 0
              ? "Fully paid · Release unlocked"
              : "Due when deliverables are ready"
          }
          variant="default"
          badge={
            <span className="flex items-center gap-1">
              <Clock size={12} weight="fill" className={summary.remainingBalance === 0 ? "text-emerald-400" : "text-[#FFA040]"} />
              <span>{summary.remainingBalance === 0 ? "SETTLED" : "BALANCE"}</span>
            </span>
          }
          badgeColor={summary.remainingBalance === 0 ? "emerald" : "orange"}
          className="animate-card-reveal stagger-5"
        />
      </div>

      {/* ── Progress Towards Milestone Activation ── */}
      <Card className="p-6 border-white/10 bg-[#01162E]/70 flex flex-col gap-4 animate-card-reveal stagger-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-sans text-sm font-semibold text-white">
              Project Milestone Activation Status
            </h3>
            <p className="font-sans text-xs text-white/50 mt-0.5">
              {summary.isFullyPaid ? (
                "100% Contract Fee Settled. All deliverable release gates are fully unlocked."
              ) : summary.isDownpaymentCleared ? (
                "Downpayment Cleared. Statistical modeling & QA reviews are currently active."
              ) : (
                <span className="inline-flex items-baseline">
                  Awaiting&nbsp;<Peso className="text-white/50" />{Math.max(0, summary.downpaymentRequired - summary.verifiedPaid).toLocaleString("en-PH", { minimumFractionDigits: 2 })}&nbsp;downpayment clearance to activate study.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-white/70">
              {summary.totalPaidPercentage}% Paid
            </span>
            {canUpload && !summary.isFullyPaid && onOpenUploadModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenUploadModal}
                className="gap-1.5"
              >
                <Plus size={14} weight="bold" />
                <span>Submit Deposit Proof</span>
              </Button>
            )}
          </div>
        </div>

        <div className="w-full">
          <ProgressBar
            value={summary.totalPaidPercentage}
            color={summary.isFullyPaid ? "emerald" : "sky"}
            className="h-2"
          />
        </div>
      </Card>

      {/* ── Itemized Payment Transactions Ledger ── */}
      <Card className="p-0 border-white/10 overflow-hidden bg-[#01142B]/90 animate-card-reveal stagger-7">
        <div className="p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-sans text-sm font-semibold text-white">
              Payment Transactions & Proof Ledger
            </h3>
            <p className="font-sans text-xs text-white/50 mt-0.5">
              Official audit history of all submitted GCash and bank receipts
            </p>
          </div>

          <span className="font-mono text-xs text-white/60 bg-white/[0.04] px-2.5 py-1 rounded-[2px] border border-white/10">
            {payments.length} {payments.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <Receipt size={22} weight="fill" className="text-white/40" />
            </div>

            <div className="flex flex-col items-center gap-2 max-w-md">
              <h4 className="font-sans text-sm sm:text-base font-semibold text-white">
                No Payment Deposits Submitted Yet
              </h4>
              <p className="font-sans text-xs text-white/50 leading-relaxed">
                To proceed with research assignment, please transfer your required downpayment and submit the official receipt screenshot.
              </p>
            </div>

            {canUpload && onOpenUploadModal && (
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={onOpenUploadModal} className="gap-2 font-sans font-medium px-4 py-2">
                  <Plus size={15} weight="bold" />
                  <span>Submit First Deposit Proof</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-mono uppercase tracking-wider">
                  <th className="py-3 px-5">Date & Time</th>
                  <th className="py-3 px-5">Method & Type</th>
                  <th className="py-3 px-5">Reference No.</th>
                  <th className="py-3 px-5">Amount Submitted</th>
                  <th className="py-3 px-5">Verification Status</th>
                  <th className="py-3 px-5 text-right">Receipt Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-white/80">
                {payments.map((payment) => {
                  const proof = payment.proofs[0];
                  return (
                    <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-sans text-white font-medium">
                          {new Date(payment.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="font-mono text-[0.688rem] text-white/40">
                          {new Date(payment.createdAt).toLocaleTimeString("en-PH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-sans text-white font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600]" />
                          {payment.paymentMethod === "GCASH" ? "GCash" : "Bank Transfer"}
                        </div>
                        <div className="font-mono text-[0.688rem] text-white/40">
                          {payment.paymentType}
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        {payment.referenceNumber ? (
                          <CopyButton
                            value={payment.referenceNumber}
                            label={payment.referenceNumber}
                            className="bg-white/[0.04] border-white/10 text-white/90 hover:bg-white/[0.08]"
                          />
                        ) : (
                          <span className="font-mono text-xs text-white/30">N/A</span>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-sans text-sm font-bold text-white">
                          <MoneyDisplay amount={payment.amountSubmitted} />
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <StatusBadge status={payment.paymentStatus} />
                        {payment.rejectionReason && (
                          <p className="font-sans text-[0.688rem] text-red-400/90 mt-1 max-w-xs">
                            Reason: {payment.rejectionReason}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        {proof ? (
                          <button
                            type="button"
                            onClick={() => {
                              setImageError(false);
                              setViewingReceiptPayment(payment);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-sans text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-2.5 py-1 rounded-[2px] transition-colors cursor-pointer"
                          >
                            <FileText size={14} weight="fill" />
                            <span>View Receipt</span>
                          </button>
                        ) : (
                          <span className="text-white/30 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Receipt View & Audit Modal ── */}
      {viewingReceiptPayment && (
        <Modal
          open={!!viewingReceiptPayment}
          onClose={() => {
            setViewingReceiptPayment(null);
            setImageError(false);
          }}
          title="Deposit Receipt & Payment Proof"
          description={`Payment receipt details for Reference #${viewingReceiptPayment.referenceNumber || viewingReceiptPayment.id}`}
          size="2xl"
        >
          <div className="flex flex-col gap-5 w-full">
            {/* Transaction Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-[2px] bg-[#01142B] border border-white/10">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-white/50 uppercase tracking-wider">
                  Amount Submitted
                </span>
                <div className="text-base sm:text-lg font-sans font-bold text-emerald-400">
                  <MoneyDisplay amount={viewingReceiptPayment.amountSubmitted} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-white/50 uppercase tracking-wider">
                  Method & Type
                </span>
                <span className="font-sans text-xs text-white font-medium">
                  {viewingReceiptPayment.paymentMethod === "GCASH" ? "GCash" : "Bank Transfer"} · {viewingReceiptPayment.paymentType}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[0.688rem] text-white/40">Ref:</span>
                  {viewingReceiptPayment.referenceNumber ? (
                    <CopyButton
                      value={viewingReceiptPayment.referenceNumber}
                      label={viewingReceiptPayment.referenceNumber}
                      className="bg-white/[0.04] border-white/10 text-white/90 text-[0.688rem] py-0 px-1.5"
                    />
                  ) : (
                    <span className="font-mono text-[0.688rem] text-white/40">N/A</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-white/50 uppercase tracking-wider">
                  Verification Status
                </span>
                <div>
                  <StatusBadge status={viewingReceiptPayment.paymentStatus} />
                </div>
                <span className="font-mono text-[0.688rem] text-white/40">
                  {new Date(viewingReceiptPayment.createdAt).toLocaleString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {viewingReceiptPayment.rejectionReason && (
              <div className="p-3.5 rounded-[2px] bg-red-500/10 border border-red-500/30 text-xs font-sans text-red-300">
                <strong className="font-semibold block mb-0.5">Rejection Reason:</strong>
                {viewingReceiptPayment.rejectionReason}
              </div>
            )}

            {/* Receipt Image / File Preview Canvas */}
            {(() => {
              const proof = viewingReceiptPayment.proofs[0];
              if (!proof) {
                return (
                  <div className="p-8 text-center text-white/40 font-sans text-xs border border-white/10 rounded-[2px] bg-white/[0.02]">
                    No receipt file attached to this payment record.
                  </div>
                );
              }

              const isImage =
                proof.filePath &&
                (proof.filePath.toLowerCase().endsWith(".png") ||
                  proof.filePath.toLowerCase().endsWith(".jpg") ||
                  proof.filePath.toLowerCase().endsWith(".jpeg") ||
                  proof.filePath.toLowerCase().endsWith(".webp") ||
                  proof.fileName.toLowerCase().endsWith(".png") ||
                  proof.fileName.toLowerCase().endsWith(".jpg") ||
                  proof.fileName.toLowerCase().endsWith(".jpeg") ||
                  proof.fileName.toLowerCase().endsWith(".webp"));

              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white/60 uppercase tracking-wider">
                      Receipt Attachment: {proof.fileName}
                    </span>
                    {proof.fileSize && (
                      <span className="font-mono text-[0.688rem] text-white/40">
                        {(proof.fileSize / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-[2px] bg-[#010915] border border-white/10 flex flex-col items-center justify-center min-h-[220px] max-h-[420px] overflow-auto">
                    {isImage && !imageError ? (
                      <div className="relative flex items-center justify-center w-full min-h-[200px]">
                        {imageLoading && (
                          <div className="w-full py-10 flex flex-col items-center justify-center animate-content-fade">
                            <LoadingState
                              variant="card"
                              size="md"
                              label="Loading receipt..."
                              description="Fetching uploaded proof of payment image"
                            />
                          </div>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getFilePreviewUrl(proof.filePath)}
                          alt={proof.fileName}
                          onLoad={() => setImageLoading(false)}
                          onError={() => {
                            setImageLoading(false);
                            setImageError(true);
                          }}
                          className={`max-h-[380px] w-auto max-w-full object-contain rounded-[2px] transition-opacity duration-300 ${
                            imageLoading ? "opacity-0 absolute pointer-events-none" : "opacity-100 relative"
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center gap-3">
                        <FileText size={42} weight="fill" className="text-sky-400" />
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-sans text-sm font-semibold text-white">
                            {proof.fileName}
                          </span>
                          <span className="font-mono text-xs text-white/40">
                            Official Receipt Attachment
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <ModalFooter className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isDownloading}
                        onClick={async () => {
                          setIsDownloading(true);
                          try {
                            await triggerFileDownload(proof.filePath, proof.fileName);
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        className="gap-1.5 font-sans text-xs font-semibold bg-[#CC6600] hover:bg-[#FFA040] text-white rounded-[2px] active:scale-[0.97] transition-all"
                      >
                        <DownloadSimple size={14} weight="bold" />
                        <span>Download Receipt</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(getFilePreviewUrl(proof.filePath), "_blank", "noopener,noreferrer");
                        }}
                        className="gap-1.5 font-sans text-xs rounded-[2px] active:scale-[0.97] transition-all"
                      >
                        <ArrowSquareOut size={14} weight="bold" />
                        <span>Open in New Tab</span>
                      </Button>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setViewingReceiptPayment(null);
                        setImageError(false);
                      }}
                      className="font-sans text-xs rounded-[2px] active:scale-[0.97] transition-all"
                    >
                      Close
                    </Button>
                  </ModalFooter>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}
