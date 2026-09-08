"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalFooter,
  Button,
  FormInput,
  FormSelect,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  FileDropzone,
} from "@repo/ui";
import {
  Receipt,
  Bank,
  DeviceMobile,
  Copy,
  Check,
  CircleNotch,
  WarningCircle,
  QrCode,
  Lock,
} from "@phosphor-icons/react";
import { uploadFileToR2 } from "@/lib/storage-client";
import { submitPaymentProof, getPaymentChannels } from "../actions";
import type { PaymentItem } from "../schemas";
import { OFFICIAL_PAYMENT_CHANNELS, type PaymentChannelDetails } from "@/lib/payment-rules";
import type { PaymentMethod, PaymentType } from "@prisma/client";

interface PaymentProofUploadModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectIntakeId: string;
  quotationId: string;
  totalAmount?: number;
  downpaymentRequired: number;
  remainingBalance: number;
  onSuccess: (payment: PaymentItem) => void;
}

export function PaymentProofUploadModal({
  open,
  onClose,
  projectId,
  projectIntakeId,
  quotationId,
  totalAmount,
  downpaymentRequired,
  remainingBalance,
  onSuccess,
}: PaymentProofUploadModalProps) {
  const fullAmountValue = totalAmount && totalAmount > 0 ? totalAmount : remainingBalance;
  const initialType: PaymentType = downpaymentRequired > 0 ? "DOWNPAYMENT" : "FULL";

  const [channels, setChannels] = useState<PaymentChannelDetails[]>(OFFICIAL_PAYMENT_CHANNELS);
  const [method, setMethod] = useState<PaymentMethod>("GCASH");
  const [paymentType, setPaymentType] = useState<PaymentType>(initialType);
  const [amount, setAmount] = useState<string>(
    initialType === "DOWNPAYMENT" ? String(downpaymentRequired) : String(fullAmountValue)
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Synchronize state and load payment channels when modal is opened
  useEffect(() => {
    if (open) {
      const nextType: PaymentType = downpaymentRequired > 0 ? "DOWNPAYMENT" : "FULL";
      setPaymentType(nextType);
      setAmount(nextType === "DOWNPAYMENT" ? String(downpaymentRequired) : String(fullAmountValue));
      setReferenceNumber("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMessage(null);

      getPaymentChannels()
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setChannels(res.data);
          }
        })
        .catch(() => {
          // fallback
        });
    }
  }, [open, downpaymentRequired, fullAmountValue]);

  const handlePaymentTypeChange = (newType: PaymentType) => {
    setPaymentType(newType);
    if (newType === "DOWNPAYMENT") {
      setAmount(String(downpaymentRequired > 0 ? downpaymentRequired : remainingBalance));
    } else {
      setAmount(String(fullAmountValue));
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(text);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Please specify a valid deposit amount greater than zero.");
      return;
    }

    if (!referenceNumber.trim() || referenceNumber.trim().length < 3) {
      setErrorMessage("Please enter the official transaction reference number from your receipt.");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Please upload your official receipt screenshot or deposit slip (PDF, PNG, JPG).");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload receipt to Cloudflare R2
      const uploadRes = await uploadFileToR2(selectedFile, "PAYMENT_PROOF", projectIntakeId);
      if (!uploadRes.success || !uploadRes.data) {
        throw new Error(uploadRes.error?.message || "Failed to upload payment receipt to storage.");
      }

      // 2. Submit payment proof server action
      const res = await submitPaymentProof({
        projectId,
        quotationId,
        paymentType,
        paymentMethod: method,
        amountSubmitted: numericAmount,
        referenceNumber: referenceNumber.trim(),
        receiptFilePath: uploadRes.data.publicUrl,
        receiptFileName: uploadRes.data.fileName,
        receiptFileSize: uploadRes.data.fileSize,
      });

      if (!res.success) {
        throw new Error(res.error.message || "Failed to register payment proof.");
      }

      onSuccess(res.data);
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message || "An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit Milestone Payment Deposit"
      description={`Submit your verified payment proof for study ${projectIntakeId}. Once verified by our finance desk, your research assignment activates.`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full font-sans">
        {/* ── Official Payment Channels (Tabs) ── */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs text-white/60 uppercase tracking-wider font-semibold">
            1. Select Payment Method
          </label>

          <Tabs
            defaultValue="GCASH"
            onValueChange={(val) => setMethod(val as PaymentMethod)}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="GCASH" className="gap-2">
                <DeviceMobile size={16} weight="fill" />
                <span>GCash (QR Ph)</span>
              </TabsTrigger>
              <TabsTrigger value="BANK_TRANSFER" className="gap-2">
                <Bank size={16} weight="fill" />
                <span>Bank Deposit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="GCASH" className="mt-3">
              {channels.filter((c) => c.id === "GCASH").map((channel, i) => (
                <div
                  key={i}
                  className="p-4 rounded-[2px] border border-white/10 bg-[#01142B] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-sans text-xs font-semibold text-white">
                        {channel.accountName}
                      </span>
                      <span className="px-2 py-0.5 rounded-[2px] bg-sky-500/10 border border-sky-500/30 text-sky-400 font-sans text-[0.688rem] font-semibold whitespace-nowrap">
                        {channel.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm sm:text-base font-bold text-[#FFA040]">
                        {channel.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(channel.accountNumber)}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                        title="Copy Account Number"
                      >
                        {copiedAccount === channel.accountNumber ? (
                          <Check size={14} weight="bold" className="text-emerald-400" />
                        ) : (
                          <Copy size={14} weight="bold" />
                        )}
                      </button>
                    </div>

                    <p className="font-sans text-[0.688rem] text-white/50 mt-1 max-w-sm">
                      {channel.notes}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2.5 text-[0.688rem] text-white/40 font-mono">
                      <QrCode size={14} weight="fill" className="text-[#CC6600]" />
                      <span>Scan with GCash or any QR Ph app</span>
                    </div>
                  </div>

                  {/* QR Code Placeholder / Custom Uploaded QR */}
                  <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-[2px] shadow-sm border border-white/20 shrink-0 self-center sm:self-auto">
                    {channel.qrImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={channel.qrImageUrl}
                        alt="GCash QR Code"
                        className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-[2px]"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 100 100"
                        className="w-20 h-20 sm:w-24 sm:h-24 text-slate-900"
                        fill="currentColor"
                        aria-label="GCash QR Code"
                      >
                        {/* Top-left position pattern */}
                        <rect x="8" y="8" width="28" height="28" rx="2" fill="#0f172a" />
                        <rect x="14" y="14" width="16" height="16" fill="#ffffff" />
                        <rect x="18" y="18" width="8" height="8" rx="1" fill="#0f172a" />

                        {/* Top-right position pattern */}
                        <rect x="64" y="8" width="28" height="28" rx="2" fill="#0f172a" />
                        <rect x="70" y="14" width="16" height="16" fill="#ffffff" />
                        <rect x="74" y="18" width="8" height="8" rx="1" fill="#0f172a" />

                        {/* Bottom-left position pattern */}
                        <rect x="8" y="64" width="28" height="28" rx="2" fill="#0f172a" />
                        <rect x="14" y="70" width="16" height="16" fill="#ffffff" />
                        <rect x="18" y="74" width="8" height="8" rx="1" fill="#0f172a" />

                        {/* Alignment block */}
                        <rect x="70" y="70" width="16" height="16" rx="2" fill="#0f172a" />
                        <rect x="74" y="74" width="8" height="8" fill="#ffffff" />
                        <rect x="76" y="76" width="4" height="4" fill="#0f172a" />

                        {/* Timing Patterns */}
                        <rect x="40" y="12" width="4" height="4" fill="#0f172a" />
                        <rect x="48" y="12" width="4" height="4" fill="#0f172a" />
                        <rect x="56" y="12" width="4" height="4" fill="#0f172a" />
                        <rect x="12" y="40" width="4" height="4" fill="#0f172a" />
                        <rect x="12" y="48" width="4" height="4" fill="#0f172a" />
                        <rect x="12" y="56" width="4" height="4" fill="#0f172a" />

                        {/* Matrix data cells */}
                        <rect x="40" y="20" width="4" height="4" fill="#0f172a" />
                        <rect x="48" y="24" width="4" height="4" fill="#0f172a" />
                        <rect x="56" y="20" width="4" height="4" fill="#0f172a" />
                        <rect x="44" y="28" width="4" height="4" fill="#0f172a" />
                        <rect x="52" y="32" width="4" height="4" fill="#0f172a" />

                        <rect x="20" y="40" width="4" height="4" fill="#0f172a" />
                        <rect x="28" y="44" width="4" height="4" fill="#0f172a" />
                        <rect x="24" y="52" width="4" height="4" fill="#0f172a" />
                        <rect x="32" y="56" width="4" height="4" fill="#0f172a" />

                        {/* Center branded badge node */}
                        <rect x="40" y="40" width="20" height="20" rx="3" fill="#005CEE" />
                        <text
                          x="50"
                          y="54"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          G
                        </text>

                        {/* Lower matrix data cells */}
                        <rect x="64" y="40" width="4" height="4" fill="#0f172a" />
                        <rect x="72" y="44" width="4" height="4" fill="#0f172a" />
                        <rect x="80" y="40" width="4" height="4" fill="#0f172a" />
                        <rect x="88" y="44" width="4" height="4" fill="#0f172a" />
                        <rect x="68" y="52" width="4" height="4" fill="#0f172a" />
                        <rect x="76" y="56" width="4" height="4" fill="#0f172a" />
                        <rect x="84" y="52" width="4" height="4" fill="#0f172a" />

                        <rect x="40" y="64" width="4" height="4" fill="#0f172a" />
                        <rect x="48" y="68" width="4" height="4" fill="#0f172a" />
                        <rect x="56" y="64" width="4" height="4" fill="#0f172a" />
                        <rect x="44" y="76" width="4" height="4" fill="#0f172a" />
                        <rect x="52" y="80" width="4" height="4" fill="#0f172a" />
                        <rect x="40" y="84" width="4" height="4" fill="#0f172a" />
                        <rect x="48" y="88" width="4" height="4" fill="#0f172a" />
                        <rect x="56" y="84" width="4" height="4" fill="#0f172a" />
                      </svg>
                    )}

                    <span className="font-mono text-[9px] font-bold text-slate-800 tracking-wider uppercase mt-1">
                      SCAN WITH GCASH
                    </span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="BANK_TRANSFER" className="mt-3 flex flex-col gap-2.5">
              {channels.filter((c) => c.id === "BANK_TRANSFER").map((channel, i) => (
                <div
                  key={i}
                  className="p-4 rounded-[2px] border border-white/10 bg-[#01142B] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col">
                    <span className="font-sans text-xs font-semibold text-white">
                      {channel.name} — {channel.branchOrProvider}
                    </span>
                    <span className="font-sans text-xs text-white/60 mt-0.5">
                      Account: {channel.accountName}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm font-bold text-[#FFA040]">
                        {channel.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(channel.accountNumber)}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                        title="Copy Account Number"
                      >
                        {copiedAccount === channel.accountNumber ? (
                          <Check size={14} weight="bold" className="text-emerald-400" />
                        ) : (
                          <Copy size={14} weight="bold" />
                        )}
                      </button>
                    </div>
                    <p className="font-sans text-[0.688rem] text-white/50 mt-1">
                      {channel.notes}
                    </p>
                  </div>

                  <span className="self-start sm:self-auto px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans text-[0.688rem] font-semibold whitespace-nowrap">
                    {channel.badge}
                  </span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Transaction Details ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Payment Milestone Type"
            value={paymentType}
            onChange={(e) => handlePaymentTypeChange(e.target.value as PaymentType)}
            options={[
              { value: "DOWNPAYMENT", label: "Required Downpayment" },
              { value: "FULL", label: "Full 100% Payment" },
            ]}
            helper="Choose whether to remit downpayment or full payment."
          />

          <FormInput
            label="Amount Transferred (PHP)"
            type="number"
            step="0.01"
            min="1"
            required
            readOnly
            value={amount}
            rightIcon={<Lock size={15} weight="fill" className="text-white/40" />}
            className="bg-white/[0.04] text-white/70 border-white/10 cursor-not-allowed font-mono font-bold select-none focus:border-white/10 focus:ring-0"
            helper="Locked to the exact milestone amount required by your contract."
          />
        </div>

        <FormInput
          label="Transaction / Reference Number"
          placeholder="e.g. 1002 9841 8291 or BDO-TXN-20260811"
          required
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          helper="Unique reference code from your bank or GCash SMS/email confirmation."
        />

        {/* ── File Upload Dropzone ── */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs text-white/60 uppercase tracking-wider flex items-center justify-between">
            <span>2. Upload Official Transaction Receipt</span>
            <span className="text-white/40 text-[0.688rem]">PDF, PNG, JPG up to 10MB</span>
          </label>

          <FileDropzone
            onFileSelect={handleFileSelect}
            onRemove={handleFileRemove}
            maxSizeMB={10}
            accept=".pdf,.png,.jpg,.jpeg"
            title="Drop payment receipt image or PDF here, or browse files"
            uploadedFile={
              selectedFile
                ? {
                    name: selectedFile.name,
                    size: selectedFile.size,
                    previewUrl: previewUrl,
                  }
                : null
            }
          />
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-[2px] bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-400 font-sans text-xs">
            <WarningCircle size={16} weight="fill" className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-sans"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="gap-2 rounded-[2px] active:scale-[0.97] transition-transform text-xs font-semibold bg-[#CC6600] hover:bg-[#E67300] text-white shadow-md"
          >
            {isSubmitting ? (
              <>
                <CircleNotch size={16} className="animate-spin text-white/90" />
                <span>Uploading & Submitting...</span>
              </>
            ) : (
              <>
                <Receipt size={16} weight="fill" />
                <span>Submit Deposit Proof →</span>
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
