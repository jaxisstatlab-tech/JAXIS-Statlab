"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalFooter,
  Button,
  FormInput,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  FileDropzone,
} from "@repo/ui";
import {
  IconDeviceMobile,
  IconBuildingBank,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconQrcode,
  IconDeviceFloppy,
  IconAlertCircle,
} from "@tabler/icons-react";
import { formatEWalletNumber, formatBankAccountNumber } from "@/lib/formatters";
import { uploadFileToR2 } from "@/lib/storage-client";
import { getPaymentChannels, updatePaymentChannels } from "../actions";
import type { PaymentChannelDetails } from "@/lib/payment-rules";
import { resolveStoredFileUrl } from "@/lib/file-utils";

interface PaymentChannelSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentChannelSettingsModal({
  open,
  onClose,
  onSuccess,
}: PaymentChannelSettingsModalProps) {
  const [channels, setChannels] = useState<PaymentChannelDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bank Form State for adding new bank
  const [newBankName, setNewBankName] = useState("");
  const [newBankAccountName, setNewBankAccountName] = useState("JAXIS STATISTICAL CONSULTING SERVICES");
  const [newBankAccountNumber, setNewBankAccountNumber] = useState("");
  const [newBankBranch, setNewBankBranch] = useState("");
  const [newBankBadge, setNewBankBadge] = useState("CLEARING: 1-2 HOURS");
  const [newBankNotes, setNewBankNotes] = useState("");
  const [isAddingBank, setIsAddingBank] = useState(false);

  // Load existing channels
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getPaymentChannels();
        if (res.success && res.data) {
          setChannels(res.data);
        }
      } catch {
        setErrorMessage("Failed to load active payment channel configurations.");
      } finally {
        setIsLoading(false);
      }
    }
    if (open) {
      load();
    }
  }, [open]);

  // GCash Channel (there is usually one primary GCash channel)
  const gcashChannel = channels.find((c) => c.id === "GCASH") || {
    id: "GCASH" as const,
    name: "GCash Corporate Pay",
    badge: "INSTANT VERIFICATION",
    accountName: "JAXIS STATISTICAL CONSULTING SERVICES",
    accountNumber: "0917-882-5294",
    institution: "GCash / Mynt",
    branchOrProvider: "Merchant Pay & Express Send",
    notes: "Please include your Study Intake ID in the optional message box before completing transfer.",
    qrImageUrl: null,
    isEnabled: true,
  };

  const handleUpdateGcash = (field: keyof PaymentChannelDetails, value: string | boolean | null) => {
    setChannels((prev) => {
      const idx = prev.findIndex((c) => c.id === "GCASH");
      if (idx === -1) {
        return [...prev, { ...gcashChannel, [field]: value }];
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx]!, [field]: value };
      return copy;
    });
  };

  const handleQrUpload = async (file: File) => {
    try {
      setIsSaving(true);
      const res = await uploadFileToR2(file, "PAYMENT_PROOF", "SYSTEM_CONFIG");
      if (res.success && res.data) {
        handleUpdateGcash("qrImageUrl", res.data.publicUrl);
      } else {
        setErrorMessage(res.error?.message || "Failed to upload custom QR image.");
      }
    } catch {
      setErrorMessage("Error uploading QR image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBank = (
    index: number,
    field: keyof PaymentChannelDetails,
    value: string | boolean | null
  ) => {
    setChannels((prev) => {
      const bankChannels = prev.filter((c) => c.id === "BANK_TRANSFER");
      const targetBank = bankChannels[index];
      if (!targetBank) return prev;

      return prev.map((c) => (c === targetBank ? { ...c, [field]: value } : c));
    });
  };

  const handleDeleteBank = (index: number) => {
    setChannels((prev) => {
      const bankChannels = prev.filter((c) => c.id === "BANK_TRANSFER");
      const targetBank = bankChannels[index];
      if (!targetBank) return prev;

      return prev.filter((c) => c !== targetBank);
    });
  };

  const handleAddBank = () => {
    if (!newBankName.trim() || !newBankAccountNumber.trim()) {
      setErrorMessage("Bank name and account number are required.");
      return;
    }

    const newChannel: PaymentChannelDetails = {
      id: "BANK_TRANSFER",
      name: newBankName.trim(),
      badge: newBankBadge.trim() || "CLEARING: 1-2 HOURS",
      accountName: newBankAccountName.trim() || "JAXIS STATISTICAL CONSULTING SERVICES",
      accountNumber: newBankAccountNumber.trim(),
      institution: newBankName.trim(),
      branchOrProvider: newBankBranch.trim() || "Corporate Center",
      notes: newBankNotes.trim() || "Include your Study Intake ID in transfer notes.",
      isEnabled: true,
    };

    setChannels((prev) => [...prev, newChannel]);
    setNewBankName("");
    setNewBankAccountNumber("");
    setNewBankBranch("");
    setNewBankNotes("");
    setIsAddingBank(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await updatePaymentChannels({ channels });
      if (!res.success) {
        setErrorMessage(res.error.message || "Failed to save payment channel settings.");
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment Channels & QR Settings"
      description="Configure executive GCash merchant numbers, upload custom QR Ph codes, and manage institutional deposit bank accounts."
      size="xl"
    >
      <div className="flex flex-col gap-6 w-full font-sans">
        {errorMessage && (
          <div className="p-3.5 rounded-[2px] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <IconAlertCircle size={16} stroke={2} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Tabs defaultValue="GCASH" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="GCASH" className="gap-2">
              <IconDeviceMobile size={16} stroke={1.5} />
              <span>GCash Corporate & QR</span>
            </TabsTrigger>
            <TabsTrigger value="BANKS" className="gap-2">
              <IconBuildingBank size={16} stroke={1.5} />
              <span>Institutional Bank Accounts</span>
            </TabsTrigger>
          </TabsList>

          {/* ── GCash Tab ── */}
          <TabsContent value="GCASH" className="mt-4 flex flex-col gap-4">
            <div className="p-4 rounded-[2px] border border-white/10 bg-[#0A0A18] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Primary GCash Configuration
                </span>
                <span className="px-2 py-0.5 rounded-[2px] bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[0.688rem] font-mono">
                  Active Channel
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Registered Merchant / Account Name"
                  value={gcashChannel.accountName}
                  onChange={(e) => handleUpdateGcash("accountName", e.target.value)}
                  placeholder="e.g. JAXIS STATISTICAL CONSULTING SERVICES"
                  required
                />

                <FormInput
                  label="GCash Mobile Number"
                  value={gcashChannel.accountNumber}
                  maxLength={13}
                  onChange={(e) => handleUpdateGcash("accountNumber", formatEWalletNumber(e.target.value))}
                  placeholder="e.g. 0917-882-5294"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Verification Badge Text"
                  value={gcashChannel.badge}
                  onChange={(e) => handleUpdateGcash("badge", e.target.value)}
                  placeholder="e.g. INSTANT VERIFICATION"
                />

                <FormInput
                  label="Branch / Provider Description"
                  value={gcashChannel.branchOrProvider}
                  onChange={(e) => handleUpdateGcash("branchOrProvider", e.target.value)}
                  placeholder="e.g. GCash Merchant QR / Express Send"
                />
              </div>

              <FormInput
                label="Client Instructions & Memo Guidance"
                value={gcashChannel.notes}
                onChange={(e) => handleUpdateGcash("notes", e.target.value)}
                placeholder="Guidance shown to clients when paying via GCash"
              />

              {/* QR Code Upload & Preview */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <label className="font-mono text-xs text-white/70 uppercase tracking-wider flex items-center justify-between">
                  <span>Custom GCash / QR Ph Image</span>
                  {gcashChannel.qrImageUrl && (
                    <button
                      type="button"
                      onClick={() => handleUpdateGcash("qrImageUrl", null)}
                      className="text-rose-400 hover:text-rose-300 text-[0.688rem] font-sans underline cursor-pointer"
                    >
                      Remove Custom QR &amp; Use Vector
                    </button>
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="sm:col-span-2">
                    <FileDropzone
                      onFileSelect={handleQrUpload}
                      onRemove={() => handleUpdateGcash("qrImageUrl", null)}
                      maxSizeMB={5}
                      hint="Upload your official printed GCash Standee or QR Ph code (PNG, JPG)."
                      uploadedFile={
                        gcashChannel.qrImageUrl
                          ? {
                              name: "Custom-GCash-QR.png",
                              previewUrl: gcashChannel.qrImageUrl,
                            }
                          : null
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 rounded-[2px] bg-white/[0.04] border border-white/10 text-center min-h-[120px]">
                    {gcashChannel.qrImageUrl ? (
                      <div className="flex flex-col items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveStoredFileUrl(gcashChannel.qrImageUrl) ?? gcashChannel.qrImageUrl}
                          alt="Custom GCash QR"
                          className="w-20 h-20 object-contain rounded-[2px] border border-white/20 bg-white p-1"
                        />
                        <span className="text-[0.688rem] text-emerald-400 font-mono font-semibold">
                          Custom QR Active
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-white/40">
                        <IconQrcode size={28} stroke={1.5} className="text-[#CC6600]" />
                        <span className="text-[0.688rem] font-mono">Default Vector QR Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Bank Accounts Tab ── */}
          <TabsContent value="BANKS" className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/60">
                Institutional bank deposit accounts displayed to researchers during checkout.
              </p>
              {!isAddingBank && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingBank(true)}
                  className="gap-1.5 font-sans text-xs"
                >
                  <IconPlus size={14} stroke={2} />
                  <span>Add Bank Account</span>
                </Button>
              )}
            </div>

            {/* Add Bank Form */}
            {isAddingBank && (
              <div className="p-4 rounded-[2px] border border-[#CC6600]/40 bg-[#0A0A18] flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-semibold text-[#CC6600] uppercase tracking-wider font-mono">
                    New Bank Account
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingBank(false)}
                    className="text-white/40 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Bank Name / Institution"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g. Metrobank Corporate"
                    required
                  />

                  <FormInput
                    label="Account Number"
                    value={newBankAccountNumber}
                    onChange={(e) => setNewBankAccountNumber(e.target.value)}
                    placeholder="e.g. 123-456-7890"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Account Name"
                    value={newBankAccountName}
                    onChange={(e) => setNewBankAccountName(e.target.value)}
                    placeholder="e.g. JAXIS STATISTICAL CONSULTING SERVICES"
                  />

                  <FormInput
                    label="Branch Location"
                    value={newBankBranch}
                    onChange={(e) => setNewBankBranch(e.target.value)}
                    placeholder="e.g. Makati Corporate Banking Center"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Verification Badge"
                    value={newBankBadge}
                    onChange={(e) => setNewBankBadge(e.target.value)}
                    placeholder="e.g. CLEARING: 1-2 HOURS"
                  />

                  <FormInput
                    label="Instructions / Notes"
                    value={newBankNotes}
                    onChange={(e) => setNewBankNotes(e.target.value)}
                    placeholder="e.g. Upload validated teller slip or InstaPay confirmation."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAddingBank(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleAddBank}>
                    Save Bank to List
                  </Button>
                </div>
              </div>
            )}

            {/* List of Bank Accounts */}
            <div className="flex flex-col gap-3">
              {channels
                .filter((c) => c.id === "BANK_TRANSFER")
                .map((bank, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-[2px] border border-white/10 bg-[#0A0A18] flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white font-mono">
                        Bank Channel #{index + 1}: {bank.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(index)}
                        className="text-rose-400 hover:text-rose-300 transition-colors p-1 cursor-pointer"
                        title="Remove Bank"
                      >
                        <IconTrash size={15} stroke={1.5} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput
                        label="Bank Name"
                        value={bank.name}
                        onChange={(e) => handleUpdateBank(index, "name", e.target.value)}
                      />
                      <FormInput
                        label="Account Number"
                        value={bank.accountNumber}
                        maxLength={19}
                        onChange={(e) => handleUpdateBank(index, "accountNumber", formatBankAccountNumber(e.target.value))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput
                        label="Account Holder Name"
                        value={bank.accountName}
                        onChange={(e) => handleUpdateBank(index, "accountName", e.target.value)}
                      />
                      <FormInput
                        label="Branch / Provider"
                        value={bank.branchOrProvider}
                        onChange={(e) => handleUpdateBank(index, "branchOrProvider", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <IconLoader2 size={16} stroke={2.5} className="animate-spin text-white/90" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <IconDeviceFloppy size={16} stroke={2} />
                <span>Save Channel Settings →</span>
              </>
            )}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
