import { NextResponse } from "next/server";
import { projectService } from "@/features/projects/services/project.service";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const statistician = searchParams.get("statistician") || undefined;
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : undefined;
    const pageSize = pageSizeParam
      ? Math.max(1, Math.min(100, parseInt(pageSizeParam, 10)))
      : undefined;

    const projects = await projectService.getProjects({ status, search, statistician, page, pageSize });
    // When unfiltered, compute KPIs directly from fetched projects to eliminate duplicate database query
    const kpis = (!status || status === "ALL") && !search && !statistician
      ? await projectService.getKPIs(projects)
      : await projectService.getKPIs();
    const auditStream = await projectService.getAuditStream();

    return NextResponse.json(
      {
        success: true,
        data: {
          projects,
          kpis,
          auditStream,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch projects data",
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const created = await projectService.createProject(body);

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "CREATION_FAILED",
          message: error instanceof Error ? error.message : "Failed to create project",
          status: 400,
        },
      },
      { status: 400 }
    );
  }
}
