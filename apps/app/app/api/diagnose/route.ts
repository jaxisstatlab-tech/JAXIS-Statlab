import { NextResponse } from "next/server";
import { auth, getLiveAccountState, computePasswordFingerprint } from "@/lib/auth";
import { getActiveShift } from "@/features/attendance/actions";
import { getUnreadMessagesCount } from "@/features/messaging/actions";
import { projectService } from "@/features/projects/services/project.service";
import { getFinanceReceivablesSummary } from "@/features/payments/actions";
import { db } from "@/lib/db";
import DashboardLayout from "@/app/dashboard/layout";
import CEODashboardPage from "@/app/dashboard/ceo/page";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result: Record<string, unknown> = {};

  // 1. Session check
  try {
    const session = await auth();
    result.session = session;
  } catch (err: unknown) {
    result.sessionError = String(err);
  }

  // 2. Live account check
  const session = result.session as { user?: { id?: string; pwdFp?: string } } | undefined;
  const userId = session?.user?.id;

  if (userId) {
    try {
      const liveState = await getLiveAccountState(userId);
      result.liveState = liveState ? {
        id: liveState.id,
        email: liveState.email,
        status: liveState.status,
        roles: liveState.userRoles.map((r) => r.role.name),
        hasPasswordHash: !!liveState.passwordHash,
        fingerprintMatch: liveState.passwordHash && session.user?.pwdFp
          ? computePasswordFingerprint(liveState.passwordHash) === session.user.pwdFp
          : null,
      } : null;
    } catch (err: unknown) {
      result.liveStateError = String(err);
    }
  }

  // 3. getActiveShift
  try {
    const shift = await getActiveShift();
    result.activeShift = shift;
  } catch (err: unknown) {
    result.activeShiftError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  // 4. getUnreadMessagesCount
  try {
    const unread = await getUnreadMessagesCount();
    result.unreadCount = unread;
  } catch (err: unknown) {
    result.unreadError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  // 5. projectService.getProjects
  try {
    const projects = await projectService.getProjects();
    result.projectsCount = projects.length;
  } catch (err: unknown) {
    result.projectsError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  // 6. getFinanceReceivablesSummary
  try {
    const finance = await getFinanceReceivablesSummary();
    result.financeSummary = finance;
  } catch (err: unknown) {
    result.financeError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  // 7. Check if any DB query hangs
  try {
    const userCount = await db.user.count();
    result.dbUserCount = userCount;
  } catch (err: unknown) {
    result.dbError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  // 8. Test DashboardLayout async execution
  try {
    const layoutNode = await DashboardLayout({ children: "TEST_DASHBOARD_CHILDREN" });
    result.layoutExecuted = true;
    result.layoutNodeType = typeof layoutNode;
  } catch (layoutErr: unknown) {
    result.layoutExecError = layoutErr instanceof Error
      ? { message: layoutErr.message, stack: layoutErr.stack }
      : String(layoutErr);
  }

  // 9. Test CEODashboardPage async execution
  try {
    const pageNode = await CEODashboardPage();
    result.ceoPageExecuted = true;
    result.ceoPageNodeType = typeof pageNode;
  } catch (pageErr: unknown) {
    result.ceoPageExecError = pageErr instanceof Error
      ? { message: pageErr.message, stack: pageErr.stack }
      : String(pageErr);
  }

  return NextResponse.json(result, { status: 200 });
}

