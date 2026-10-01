import { NextResponse } from "next/server";
import { RegisterClientSchema } from "@/features/auth/schemas";
import { registerClient } from "@/features/auth/actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Zod Schema Validation
    const parsed = RegisterClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid registration payload. Please check field errors.",
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 }
      );
    }

    // 2. Delegate to Register Service Action
    const result = await registerClient(parsed.data);

    if (!result.success) {
      const status = result.error.code === "EMAIL_TAKEN" ? 409 : result.error.code === "RATE_LIMITED" ? 429 : 400;
      return NextResponse.json(result, { status });
    }

    // 3. Return 201 Created (strictly without password hash)
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        data: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API Auth Register Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred during account registration.",
        },
      },
      { status: 500 }
    );
  }
}
