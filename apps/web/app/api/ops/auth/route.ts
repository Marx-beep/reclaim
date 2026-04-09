import { z } from "zod";
import { NextResponse } from "next/server";
import { fail } from "@/lib/api/response";
import { OPS_AUTH_COOKIE, createOpsSessionToken, isOpsPasswordValid } from "@/lib/server/ops-auth";

const schema = z.object({
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    if (!isOpsPasswordValid(parsed.password)) {
      return fail("Invalid ops password", 401);
    }

    const response = NextResponse.json({ authenticated: true }, { status: 200 });
    response.cookies.set(OPS_AUTH_COOKIE, createOpsSessionToken(parsed.password), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });
    return response;
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to authenticate ops", 400);
  }
}
