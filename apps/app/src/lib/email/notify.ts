import { after } from "next/server";
import { db, withDbTimeout } from "@/lib/db";
import { sendEmail } from "./index";
import { teamInbox } from "./policy";
import type { EmailTemplateName } from "./types";

/**
 * Email helpers for actions. Both run after the response is sent (`after`), so the person never waits on email,
 * and they never throw: an email problem must not undo or fail the action that triggered it.
 */

/** Runs now if we're outside a request (scripts), otherwise after the response. */
function later(task: () => Promise<unknown>) {
  const run = () => task().catch((err) => console.warn("[email] background send failed:", err));
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Staff alerts go to one team inbox. The email log needs a user, so the first active admin/CEO is recorded. */
export function emailTeam(template: EmailTemplateName, data: Record<string, unknown>, opts: { projectId?: string; once?: boolean } = {}) {
  later(async () => {
    const [logUser, project] = await Promise.all([
      withDbTimeout(
        db.user.findFirst({
          where: { status: "ACTIVE", userRoles: { some: { role: { name: { in: ["ADMIN", "CEO"] } } } } },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        }),
        3000
      ).catch(() => null),
      // Study details the caller didn't pass (title, ID, client, needed-by date).
      opts.projectId
        ? withDbTimeout(
            db.project.findUnique({
              where: { id: opts.projectId },
              select: {
                intakeId: true,
                researchTitle: true,
                deadlineRequested: true,
                client: { select: { fullName: true, email: true } },
              },
            }),
            3000
          ).catch(() => null)
        : Promise.resolve(null),
    ]);
    const fromStudy = project
      ? {
          intakeId: project.intakeId,
          researchTitle: project.researchTitle,
          deadlineRequested: project.deadlineRequested.toISOString(),
          clientName: project.client?.fullName,
          clientEmail: project.client?.email,
        }
      : {};
    await sendEmail({
      to: teamInbox(),
      recipientId: logUser?.id ?? "",
      template,
      projectId: opts.projectId,
      once: opts.once,
      data: { ...fromStudy, ...data, projectId: opts.projectId },
    });
  });
}

/** Emails a study's client (active accounts only). */
export function emailClient(
  projectId: string,
  template: EmailTemplateName,
  data: Record<string, unknown> = {},
  opts: { once?: boolean } = {}
) {
  later(async () => {
    const project = await withDbTimeout(
      db.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          intakeId: true,
          researchTitle: true,
          client: { select: { id: true, email: true, fullName: true, status: true } },
        },
      }),
      3000
    );
    const client = project?.client;
    if (!project || !client?.email || client.status !== "ACTIVE") return;
    await sendEmail({
      to: client.email,
      recipientId: client.id,
      template,
      projectId: project.id,
      once: opts.once,
      data: {
        intakeId: project.intakeId,
        researchTitle: project.researchTitle,
        clientName: client.fullName,
        clientEmail: client.email,
        ...data,
        projectId: project.id,
      },
    });
  });
}
