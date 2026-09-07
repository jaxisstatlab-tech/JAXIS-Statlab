import { getMyHrPortalData } from "@/features/attendance/actions";
import { getMyOfficialPayslip, getMyPayoutDetails } from "@/features/payroll/actions";
import { HrPortalClient } from "./HrPortalClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff HR Portal | JAXIS StatLab",
  description: "Attendance, leave requests, timesheets, and official payslips.",
};

export default async function StaffHrPortalPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [portalData, payslipRes, payoutRes] = await Promise.all([
    getMyHrPortalData(currentYear, currentMonth),
    getMyOfficialPayslip(),
    getMyPayoutDetails(),
  ]);

  return (
    <HrPortalClient
      initialPortalData={portalData}
      initialAllMyPayslips={payslipRes.allMyPayslips}
      initialSelectedPayslip={payslipRes.payslip || payslipRes.allMyPayslips[0] || null}
      initialPayoutDetails={payoutRes?.data || null}
    />
  );
}
